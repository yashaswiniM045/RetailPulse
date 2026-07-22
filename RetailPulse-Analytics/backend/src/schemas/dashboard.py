from pydantic import BaseModel, Field


class DashboardSummaryRead(BaseModel):
    total_products: int = Field(alias="totalProducts")
    active_products: int = Field(alias="activeProducts")
    inactive_products: int = Field(alias="inactiveProducts")
    total_categories: int = Field(alias="totalCategories")
    total_sales: int = Field(alias="totalSales")
    total_revenue: float = Field(alias="totalRevenue")
    total_orders: int = Field(alias="totalOrders")
    average_order_value: float = Field(alias="averageOrderValue")