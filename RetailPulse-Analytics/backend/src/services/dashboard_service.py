from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.category import Category, CategoryStatus
from src.models.product import Product, ProductStatus


def get_dashboard_summary(db: Session, company_id: int) -> dict:
    total_products = db.scalar(select(func.count(Product.id)).where(Product.company_id == company_id)) or 0
    active_products = (
        db.scalar(
            select(func.count(Product.id)).where(
                Product.company_id == company_id,
                Product.status == ProductStatus.ACTIVE,
            )
        )
        or 0
    )
    inactive_products = (
        db.scalar(
            select(func.count(Product.id)).where(
                Product.company_id == company_id,
                Product.status == ProductStatus.INACTIVE,
            )
        )
        or 0
    )
    total_categories = db.scalar(select(func.count(Category.id)).where(Category.company_id == company_id)) or 0
    return {
        "totalProducts": int(total_products),
        "activeProducts": int(active_products),
        "inactiveProducts": int(inactive_products),
        "totalCategories": int(total_categories),
    }