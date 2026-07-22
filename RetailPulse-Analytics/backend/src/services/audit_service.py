from fastapi import Request
from sqlalchemy.orm import Session

from src.models.audit_log import AuditLog


class AuditAction:
    COMPANY_REGISTERED = "Company Registered"
    USER_LOGIN = "User Login"
    USER_LOGOUT = "User Logout"
    PASSWORD_CHANGED = "Password Changed"
    CATEGORY_CREATED = "Category Created"
    CATEGORY_UPDATED = "Category Updated"
    CATEGORY_DELETED = "Category Deleted"
    PRODUCT_CREATED = "Product Created"
    PRODUCT_UPDATED = "Product Updated"
    PRODUCT_DELETED = "Product Deleted"
    PRODUCT_ACTIVATED = "Product Activated"
    PRODUCT_DEACTIVATED = "Product Deactivated"
    SALE_CREATED = "Sale Created"
    SALE_UPDATED = "Sale Updated"
    SALE_DELETED = "Sale Deleted"
    INVENTORY_UPDATED = "Inventory Updated"
    PRODUCT_MARKED_OUT_OF_STOCK = "Product Marked Out of Stock"


def create_audit_log(
    db: Session,
    *,
    company_id: int,
    user_id: int | None,
    action: str,
    request: Request | None,
    performed_by: str | None = None,
    entity_type: str | None = None,
    entity_name: str | None = None,
) -> None:
    browser = request.headers.get("user-agent") if request else None
    ip_address = request.client.host if request and request.client else None
    db.add(
        AuditLog(
            company_id=company_id,
            user_id=user_id,
            performed_by=performed_by,
            entity_type=entity_type,
            entity_name=entity_name,
            action=action,
            ip_address=ip_address,
            browser=browser,
        )
    )
