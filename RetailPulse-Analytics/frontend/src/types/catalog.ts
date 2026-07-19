export type CatalogStatus = "active" | "inactive";

export interface CategorySummary {
	id: number;
	name: string;
	status: CatalogStatus;
}

export interface CategoryItem extends CategorySummary {
	description: string | null;
	productCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CategoryFormValues {
	categoryName: string;
	description: string;
	status: CatalogStatus;
}

export interface ProductItem {
	id: number;
	name: string;
	sku: string;
	category: CategorySummary;
	brand: string | null;
	description: string | null;
	unitPrice: number;
	costPrice: number;
	stockQuantity: number;
	unitOfMeasure: string;
	status: CatalogStatus;
	createdAt: string;
	updatedAt: string;
}

export interface ProductFormValues {
	productName: string;
	sku: string;
	categoryId: number;
	brand: string;
	description: string;
	unitPrice: number;
	costPrice: number;
	stockQuantity: number;
	unitOfMeasure: string;
	status: CatalogStatus;
}

export interface DashboardSummary {
	totalProducts: number;
	activeProducts: number;
	inactiveProducts: number;
	totalCategories: number;
}