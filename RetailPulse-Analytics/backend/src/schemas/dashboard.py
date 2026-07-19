from pydantic import BaseModel, Field


class DashboardSummaryRead(BaseModel):
    total_products: int = Field(alias="totalProducts")
    active_products: int = Field(alias="activeProducts")
    inactive_products: int = Field(alias="inactiveProducts")
    total_categories: int = Field(alias="totalCategories")