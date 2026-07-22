from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from src.dependencies.auth import require_roles
from src.dependencies.database import get_db
from src.models.sale import PaymentMethod, SalesChannel
from src.models.user import User, UserRole
from src.schemas.sale import SaleListRead, SaleRead, SaleUpsert
from src.services.sale_service import create_sale, delete_sale, get_sale, list_sales, update_sale

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=list[SaleListRead])
def list_sales_route(
    search: str | None = None,
    start_date: datetime | None = Query(default=None, alias="startDate"),
    end_date: datetime | None = Query(default=None, alias="endDate"),
    category_id: int | None = Query(default=None, alias="categoryId"),
    sales_channel: SalesChannel | None = Query(default=None, alias="salesChannel"),
    payment_method: PaymentMethod | None = Query(default=None, alias="paymentMethod"),
    sort_by: Literal["date", "invoiceNumber", "totalAmount"] = Query(default="date", alias="sortBy"),
    sort_direction: Literal["asc", "desc"] = Query(default="desc", alias="sortDirection"),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    return list_sales(
        db,
        current_user.company_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        sales_channel=sales_channel,
        payment_method=payment_method,
        sort_by=sort_by,
        sort_direction=sort_direction,
    )


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale_route(
    sale_id: int,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    return get_sale(db, current_user.company_id, sale_id)


@router.post("", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale_route(
    payload: SaleUpsert,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    return create_sale(db, current_user, payload, request)


@router.put("/{sale_id}", response_model=SaleRead)
def update_sale_route(
    sale_id: int,
    payload: SaleUpsert,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    return update_sale(db, current_user, sale_id, payload, request)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale_route(
    sale_id: int,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.ANALYST)),
    db: Session = Depends(get_db),
):
    delete_sale(db, current_user, sale_id, request)
