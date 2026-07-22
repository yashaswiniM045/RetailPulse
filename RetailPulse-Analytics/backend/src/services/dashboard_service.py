from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.category import Category, CategoryStatus
from src.models.product import Product, ProductStatus
from src.models.sale import Sale, SaleItem


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
    total_sales = (
        db.scalar(
            select(func.coalesce(func.sum(SaleItem.quantity), 0))
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(Sale.company_id == company_id)
        )
        or 0
    )
    total_revenue = db.scalar(select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.company_id == company_id)) or 0
    total_orders = db.scalar(select(func.count(Sale.id)).where(Sale.company_id == company_id)) or 0
    average_order_value = float(total_revenue) / int(total_orders) if int(total_orders) > 0 else 0

    return {
        "totalProducts": int(total_products),
        "activeProducts": int(active_products),
        "inactiveProducts": int(inactive_products),
        "totalCategories": int(total_categories),
        "totalSales": int(total_sales),
        "totalRevenue": float(total_revenue),
        "totalOrders": int(total_orders),
        "averageOrderValue": float(average_order_value),
    }