from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.dependencies.auth import get_current_user
from src.dependencies.database import get_db
from src.models.user import User
from src.schemas.dashboard import DashboardSummaryRead
from src.services.dashboard_service import get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryRead)
def dashboard_summary_route(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_dashboard_summary(db, current_user.company_id)