from fastapi import Request
from sqlalchemy.orm import Session

from src.models.audit_log import AuditLog


class AuditAction:
    COMPANY_REGISTERED = "Company Registered"
    USER_LOGIN = "User Login"
    USER_LOGOUT = "User Logout"
    PASSWORD_CHANGED = "Password Changed"


def create_audit_log(
    db: Session,
    *,
    company_id: int,
    user_id: int | None,
    action: str,
    request: Request | None,
) -> None:
    browser = request.headers.get("user-agent") if request else None
    ip_address = request.client.host if request and request.client else None
    db.add(
        AuditLog(
            company_id=company_id,
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            browser=browser,
        )
    )
