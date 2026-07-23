from datetime import datetime, time
from typing import Literal

from fastapi import HTTPException, Request, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from src.models.company import Company
from src.models.product import Product, ProductStatus
from src.models.sale import PaymentMethod, Sale, SaleItem, SalesChannel
from src.models.user import User
from src.schemas.sale import SaleUpsert
from src.services.audit_service import AuditAction, create_audit_log
from src.services.inventory_service import apply_sale_stock_change


def _sale_base_query(company_id: int):
    return (
        select(Sale)
        .options(
            joinedload(Sale.creator),
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.items).joinedload(SaleItem.category),
        )
        .where(Sale.company_id == company_id)
    )


def _sale_item_payload(item: SaleItem, remaining_stock: int) -> dict:
    return {
        "id": item.id,
        "productId": item.product_id,
        "productName": item.product.name,
        "categoryId": item.category_id,
        "categoryName": item.category.name,
        "quantity": item.quantity,
        "unitPrice": float(item.unit_price),
        "discount": float(item.discount),
        "tax": float(item.tax),
        "total": float(item.total),
        "remainingStock": remaining_stock,
    }


def _sale_payload(sale: Sale, notifications: list[dict] | None = None) -> dict:
    notifications = notifications or []
    return {
        "id": sale.id,
        "invoiceNumber": sale.invoice_number,
        "customerName": sale.customer_name,
        "saleDate": sale.sale_date,
        "salesChannel": sale.sales_channel.value if hasattr(sale.sales_channel, "value") else sale.sales_channel,
        "paymentMethod": sale.payment_method.value if hasattr(sale.payment_method, "value") else sale.payment_method,
        "totalAmount": float(sale.total_amount),
        "createdBy": sale.created_by,
        "createdByName": sale.creator.name,
        "createdAt": sale.created_at,
        "updatedAt": sale.updated_at,
        "items": [_sale_item_payload(item, item.product.stock_quantity) for item in sale.items],
        "notifications": notifications,
    }


def _sale_list_payload(sale: Sale) -> dict:
    return {
        "id": sale.id,
        "invoiceNumber": sale.invoice_number,
        "customerName": sale.customer_name,
        "saleDate": sale.sale_date,
        "salesChannel": sale.sales_channel.value if hasattr(sale.sales_channel, "value") else sale.sales_channel,
        "paymentMethod": sale.payment_method.value if hasattr(sale.payment_method, "value") else sale.payment_method,
        "totalAmount": float(sale.total_amount),
        "createdByName": sale.creator.name,
        "itemCount": len(sale.items),
    }


def _get_sale_for_company(db: Session, company_id: int, sale_id: int) -> Sale:
    sale = db.scalar(_sale_base_query(company_id).where(Sale.id == sale_id))
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale record not found")
    return sale


def _get_product_for_company(db: Session, company_id: int, product_id: int) -> Product:
    product = db.scalar(
        select(Product)
        .options(joinedload(Product.category))
        .where(and_(Product.id == product_id, Product.company_id == company_id))
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _generate_invoice_number(db: Session, company_id: int, sale_date: datetime) -> str:
    year = sale_date.year
    prefix = f"INV-{year}-"
    latest_invoice = db.scalar(
        select(Sale.invoice_number)
        .where(and_(Sale.company_id == company_id, Sale.invoice_number.like(f"{prefix}%")))
        .order_by(Sale.invoice_number.desc())
        .limit(1)
    )
    next_number = 1
    if latest_invoice:
        try:
            next_number = int(latest_invoice.rsplit("-", 1)[1]) + 1
        except (TypeError, ValueError):
            next_number = 1
    return f"{prefix}{next_number:06d}"


def _lock_company_for_invoice_generation(db: Session, company_id: int) -> None:
    db.scalar(select(Company.id).where(Company.id == company_id).with_for_update())


def _apply_sale_item_changes(
    *,
    db: Session,
    company_id: int,
    user: User,
    request: Request,
    sale: Sale,
    items: list,
) -> tuple[float, list[dict]]:
    total_amount = 0.0
    notifications: list[dict] = []

    for item_payload in items:
        product = _get_product_for_company(db, company_id, item_payload.product_id)
        if product.status != ProductStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.name}' is inactive and cannot be sold",
            )
        line_subtotal = item_payload.quantity * item_payload.unit_price
        if item_payload.discount > line_subtotal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Discount cannot exceed total product value for '{product.name}'",
            )

        line_total = line_subtotal - item_payload.discount + item_payload.tax
        total_amount += line_total

        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            category_id=product.category_id,
            quantity=item_payload.quantity,
            unit_price=item_payload.unit_price,
            discount=item_payload.discount,
            tax=item_payload.tax,
            total=line_total,
        )
        db.add(sale_item)

        movement_notifications = apply_sale_stock_change(
            db,
            company_id=company_id,
            user=user,
            request=request,
            product=product,
            quantity_delta=-item_payload.quantity,
            reason=f"Sale {sale.invoice_number}",
        )
        notifications.extend(movement_notifications)

    return total_amount, notifications


def list_sales(
    db: Session,
    company_id: int,
    *,
    search: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category_id: int | None = None,
    sales_channel: SalesChannel | None = None,
    payment_method: PaymentMethod | None = None,
    sort_by: Literal["date", "invoiceNumber", "totalAmount"] = "date",
    sort_direction: Literal["asc", "desc"] = "desc",
    page: int = 1,
    page_size: int = 25,
) -> dict:
    statement = _sale_base_query(company_id)
    count_statement = select(func.count(Sale.id)).where(Sale.company_id == company_id)

    requires_item_join = bool(search or category_id)
    if requires_item_join:
        statement = statement.join(Sale.items).join(SaleItem.product)
        count_statement = (
            select(func.count(func.distinct(Sale.id)))
            .select_from(Sale)
            .join(Sale.items)
            .join(SaleItem.product)
            .where(Sale.company_id == company_id)
        )

    if search:
        term = f"%{search.strip()}%"
        search_clause = or_(Sale.invoice_number.ilike(term), Sale.customer_name.ilike(term), Product.name.ilike(term))
        statement = statement.where(search_clause)
        count_statement = count_statement.where(search_clause)
    if start_date:
        start_clause = Sale.sale_date >= datetime.combine(start_date.date(), time.min)
        statement = statement.where(start_clause)
        count_statement = count_statement.where(start_clause)
    if end_date:
        end_clause = Sale.sale_date <= datetime.combine(end_date.date(), time.max)
        statement = statement.where(end_clause)
        count_statement = count_statement.where(end_clause)
    if category_id:
        category_clause = SaleItem.category_id == category_id
        statement = statement.where(category_clause)
        count_statement = count_statement.where(category_clause)
    if sales_channel:
        channel_clause = Sale.sales_channel == sales_channel
        statement = statement.where(channel_clause)
        count_statement = count_statement.where(channel_clause)
    if payment_method:
        payment_clause = Sale.payment_method == payment_method
        statement = statement.where(payment_clause)
        count_statement = count_statement.where(payment_clause)

    if requires_item_join:
        statement = statement.distinct()

    sort_desc = sort_direction == "desc"
    if sort_by == "invoiceNumber":
        statement = statement.order_by(Sale.invoice_number.desc() if sort_desc else Sale.invoice_number.asc())
    elif sort_by == "totalAmount":
        statement = statement.order_by(Sale.total_amount.desc() if sort_desc else Sale.total_amount.asc())
    else:
        statement = statement.order_by(Sale.sale_date.desc() if sort_desc else Sale.sale_date.asc())

    total = int(db.scalar(count_statement) or 0)
    total_pages = (total + page_size - 1) // page_size if total else 0
    offset = (page - 1) * page_size

    sales = db.scalars(statement.offset(offset).limit(page_size)).unique().all()
    return {
        "items": [_sale_list_payload(sale) for sale in sales],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }


def get_sale(db: Session, company_id: int, sale_id: int) -> dict:
    sale = _get_sale_for_company(db, company_id, sale_id)
    return _sale_payload(sale)


def create_sale(db: Session, current_user: User, payload: SaleUpsert, request: Request) -> dict:
    _lock_company_for_invoice_generation(db, current_user.company_id)

    sale = Sale(
        company_id=current_user.company_id,
        invoice_number=_generate_invoice_number(db, current_user.company_id, payload.sale_date),
        customer_name=payload.customer_name.strip(),
        sale_date=payload.sale_date,
        sales_channel=payload.sales_channel,
        payment_method=payload.payment_method,
        total_amount=0,
        created_by=current_user.id,
    )
    db.add(sale)
    try:
        db.flush()
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not generate a unique invoice number. Please retry.",
        ) from exc

    total_amount, notifications = _apply_sale_item_changes(
        db=db,
        company_id=current_user.company_id,
        user=current_user,
        request=request,
        sale=sale,
        items=payload.items,
    )
    sale.total_amount = total_amount

    create_audit_log(
        db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        performed_by=current_user.name,
        entity_type="Sale",
        entity_name=sale.invoice_number,
        action=AuditAction.SALE_CREATED,
        request=request,
    )

    db.commit()
    saved_sale = _get_sale_for_company(db, current_user.company_id, sale.id)
    return _sale_payload(saved_sale, notifications)


def update_sale(db: Session, current_user: User, sale_id: int, payload: SaleUpsert, request: Request) -> dict:
    sale = _get_sale_for_company(db, current_user.company_id, sale_id)

    # Restore stock for old items before applying new item set.
    for old_item in sale.items:
        product = _get_product_for_company(db, current_user.company_id, old_item.product_id)
        apply_sale_stock_change(
            db,
            company_id=current_user.company_id,
            user=current_user,
            request=request,
            product=product,
            quantity_delta=old_item.quantity,
            reason=f"Sale {sale.invoice_number} update rollback",
        )

    for old_item in list(sale.items):
        db.delete(old_item)
    db.flush()

    sale.customer_name = payload.customer_name.strip()
    sale.sale_date = payload.sale_date
    sale.sales_channel = payload.sales_channel
    sale.payment_method = payload.payment_method

    total_amount, notifications = _apply_sale_item_changes(
        db=db,
        company_id=current_user.company_id,
        user=current_user,
        request=request,
        sale=sale,
        items=payload.items,
    )
    sale.total_amount = total_amount

    create_audit_log(
        db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        performed_by=current_user.name,
        entity_type="Sale",
        entity_name=sale.invoice_number,
        action=AuditAction.SALE_UPDATED,
        request=request,
    )

    db.commit()
    saved_sale = _get_sale_for_company(db, current_user.company_id, sale.id)
    return _sale_payload(saved_sale, notifications)


def delete_sale(db: Session, current_user: User, sale_id: int, request: Request) -> None:
    sale = _get_sale_for_company(db, current_user.company_id, sale_id)

    for item in sale.items:
        product = _get_product_for_company(db, current_user.company_id, item.product_id)
        apply_sale_stock_change(
            db,
            company_id=current_user.company_id,
            user=current_user,
            request=request,
            product=product,
            quantity_delta=item.quantity,
            reason=f"Sale {sale.invoice_number} deleted",
        )

    create_audit_log(
        db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        performed_by=current_user.name,
        entity_type="Sale",
        entity_name=sale.invoice_number,
        action=AuditAction.SALE_DELETED,
        request=request,
    )

    db.delete(sale)
    db.commit()
