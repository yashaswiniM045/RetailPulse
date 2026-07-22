export type CatalogStatus = "active" | "inactive";
export type SalesChannel = "in-store" | "online" | "wholesale" | "marketplace" | "other";
export type PaymentMethod = "cash" | "card" | "bank-transfer" | "upi" | "wallet" | "other";

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
	isOutOfStock: boolean;
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
	totalSales: number;
	totalRevenue: number;
	totalOrders: number;
	averageOrderValue: number;
}

export interface SaleItem {
	id: number;
	productId: number;
	productName: string;
	categoryId: number;
	categoryName: string;
	quantity: number;
	unitPrice: number;
	discount: number;
	tax: number;
	total: number;
	remainingStock: number;
}

export interface SaleNotification {
	type: "low-stock" | "out-of-stock";
	message: string;
}

export interface SaleItemFormValues {
	productId: number;
	quantity: number;
	unitPrice: number;
	discount: number;
	tax: number;
}

export interface SaleFormValues {
	saleDate: string;
	customerName: string;
	salesChannel: SalesChannel;
	paymentMethod: PaymentMethod;
	items: SaleItemFormValues[];
}

export interface SaleItemDetails extends SaleItem {
	categoryName: string;
	productName: string;
}

export interface SaleRecord {
	id: number;
	invoiceNumber: string;
	customerName: string;
	saleDate: string;
	salesChannel: SalesChannel;
	paymentMethod: PaymentMethod;
	totalAmount: number;
	createdBy: number;
	createdByName: string;
	createdAt: string;
	updatedAt: string;
	items: SaleItemDetails[];
	notifications: SaleNotification[];
}

export interface SaleListItem {
	id: number;
	invoiceNumber: string;
	customerName: string;
	saleDate: string;
	salesChannel: SalesChannel;
	paymentMethod: PaymentMethod;
	totalAmount: number;
	createdByName: string;
	itemCount: number;
}