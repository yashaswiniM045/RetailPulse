from fastapi import HTTPException, Request, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from src.models.category import Category
from src.models.product import Product, ProductStatus
from src.models.user import User
from src.schemas.product import ProductStatusUpdate, ProductUpsert
from src.services.audit_service import AuditAction, create_audit_log


def _product_payload(product: Product) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "category": {
            "id": product.category.id,
            "name": product.category.name,
            "status": product.category.status.value if hasattr(product.category.status, "value") else product.category.status,
        },
        "brand": product.brand,
        "description": product.description,
        "unitPrice": float(product.unit_price),
        "costPrice": float(product.cost_price),
        "stockQuantity": product.stock_quantity,
        "unitOfMeasure": product.unit_of_measure,
        "status": product.status.value if hasattr(product.status, "value") else product.status,
        "createdAt": product.created_at,
        "updatedAt": product.updated_at,
    }


def _get_product_for_company(db: Session, company_id: int, product_id: int) -> Product:
    statement = (
        select(Product)
        .options(joinedload(Product.category))
        .where(and_(Product.id == product_id, Product.company_id == company_id))
    )
    product = db.scalar(statement)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _get_category_for_company(db: Session, company_id: int, category_id: int) -> Category:
    category = db.scalar(select(Category).where(and_(Category.id == category_id, Category.company_id == company_id)))
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


def _sku_exists(db: Session, company_id: int, sku: str, exclude_id: int | None = None) -> bool:
    statement = select(Product.id).where(and_(Product.company_id == company_id, func.lower(Product.sku) == sku.lower()))
    if exclude_id is not None:
        statement = statement.where(Product.id != exclude_id)
    return db.scalar(statement) is not None


def _duplicate_name_exists(db: Session, company_id: int, category_id: int, name: str, exclude_id: int | None = None) -> bool:
    statement = select(Product.id).where(
        and_(
            Product.company_id == company_id,
            Product.category_id == category_id,
            func.lower(Product.name) == name.lower(),
        )
    )
    if exclude_id is not None:
        statement = statement.where(Product.id != exclude_id)
    return db.scalar(statement) is not None


def list_products(
    db: Session,
    company_id: int,
    search: str | None = None,
    category_id: int | None = None,
    status_filter: ProductStatus | None = None,
    sort_by: str = "recentlyAdded",
    sort_direction: str = "desc",
) -> list[dict]:
    statement = (
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.company_id == company_id)
    )
    if search:
        search_term = f"%{search.strip()}%"
        statement = statement.where(
            or_(Product.name.ilike(search_term), Product.sku.ilike(search_term), Product.brand.ilike(search_term))
        )
    if category_id:
        statement = statement.where(Product.category_id == category_id)
    if status_filter:
        statement = statement.where(Product.status == status_filter)

    sort_desc = sort_direction.lower() != "asc"
    if sort_by == "name":
        statement = statement.order_by(Product.name.desc() if sort_desc else Product.name.asc())
    elif sort_by == "price":
        statement = statement.order_by(Product.unit_price.desc() if sort_desc else Product.unit_price.asc())
    else:
        statement = statement.order_by(Product.created_at.desc() if sort_desc else Product.created_at.asc())

    products = db.scalars(statement).all()
    return [_product_payload(product) for product in products]


def get_product(db: Session, company_id: int, product_id: int) -> dict:
    product = _get_product_for_company(db, company_id, product_id)
    return _product_payload(product)


def create_product(db: Session, current_user: User, payload: ProductUpsert, request: Request) -> dict:
    category = _get_category_for_company(db, current_user.company_id, payload.category_id)
    name = payload.product_name.strip()
    sku = payload.sku.strip()

    if _sku_exists(db, current_user.company_id, sku):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
    if _duplicate_name_exists(db, current_user.company_id, category.id, name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product name already exists in this category")

    product = Product(
        company_id=current_user.company_id,
        category_id=category.id,
        name=name,
        sku=sku,
        brand=payload.brand.strip() or None,
        description=payload.description.strip() or None,
        unit_price=payload.unit_price,
        cost_price=payload.cost_price,
        stock_quantity=payload.stock_quantity,
        unit_of_measure=payload.unit_of_measure.strip(),
        status=ProductStatus(payload.status),
    )
    db.add(product)
    db.commit()
    product = _get_product_for_company(db, current_user.company_id, product.id)
    create_audit_log(
        db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        performed_by=current_user.name,
        entity_type="Product",
        entity_name=product.name,
        action=AuditAction.PRODUCT_CREATED,
        request=request,
    )
    db.commit()
    return _product_payload(product)


def update_product(db: Session, current_user: User, product_id: int, payload: ProductUpsert, request: Request) -> dict:
    product = _get_product_for_company(db, current_user.company_id, product_id)
    category = _get_category_for_company(db, current_user.company_id, payload.category_id)
    name = payload.product_name.strip()
    sku = payload.sku.strip()

    if _sku_exists(db, current_user.company_id, sku, exclude_id=product.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
    if _duplicate_name_exists(db, current_user.company_id, category.id, name, exclude_id=product.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product name already exists in this category")

    previous_status = product.status
    product.category_id = category.id
    product.name = name
    product.sku = sku
    product.brand = payload.brand.strip() or None
    product.description = payload.description.strip() or None
    product.unit_price = payload.unit_price
    product.cost_price = payload.cost_price
    product.stock_quantity = payload.stock_quantity
    product.unit_of_measure = payload.unit_of_measure.strip()
    product.status = ProductStatus(payload.status)

    create_audit_log(
        db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        performed_by=current_user.name,
        entity_type="Product",
        entity_name=product.name,
        action=AuditAction.PRODUCT_UPDATED,
        request=request,
    )
    if previous_status != product.status:
        create_audit_log(
            db,
            company_id=current_user.company_id,
            user_id=current_user.id,
            performed_by=current_user.name,
            entity_type="Product",
            entity_name=product.name,
            action=AuditAction.PRODUCT_ACTIVATED if product.status == ProductStatus.ACTIVE else AuditAction.PRODUCT_DEACTIVATED,
            request=request,
        )

    db.commit()
    product = _get_product_for_company(db, current_user.company_id, product.id)
    return _product_payload(product)


def set_product_status(db: Session, current_user: User, product_id: int, payload: ProductStatusUpdate, request: Request) -> dict:
    product = _get_product_for_company(db, current_user.company_id, product_id)
    next_status = ProductStatus(payload.status)
    if product.status == next_status:
        return _product_payload(product)

    product.status = next_status
    create_audit_log(
        db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        performed_by=current_user.name,
        entity_type="Product",
        entity_name=product.name,
        action=AuditAction.PRODUCT_ACTIVATED if next_status == ProductStatus.ACTIVE else AuditAction.PRODUCT_DEACTIVATED,
        request=request,
    )
    db.commit()
    product = _get_product_for_company(db, current_user.company_id, product.id)
    return _product_payload(product)


def delete_product(db: Session, current_user: User, product_id: int, request: Request) -> None:
    product = _get_product_for_company(db, current_user.company_id, product_id)
    create_audit_log(
        db,
        company_id=current_user.company_id,
        user_id=current_user.id,
        performed_by=current_user.name,
        entity_type="Product",
        entity_name=product.name,
        action=AuditAction.PRODUCT_DELETED,
        request=request,
    )
    db.delete(product)
    db.commit()