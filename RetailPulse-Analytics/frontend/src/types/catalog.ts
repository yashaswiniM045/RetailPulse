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

export interface PaginatedResult<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
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

export type InventoryStockStatus = "in-stock" | "low-stock" | "out-of-stock";
export type InventoryMovementType = "sale" | "manual-adjustment" | "stock-addition" | "stock-removal";
export type InventoryAdjustmentType = "stock-addition" | "stock-removal" | "manual-adjustment";

export interface InventoryItem {
	id: number;
	productId: number;
	productName: string;
	sku: string;
	category: string;
	brand: string | null;
	currentStock: number;
	reservedStock: number;
	availableStock: number;
	reorderLevel: number;
	stockStatus: InventoryStockStatus;
	updatedAt: string;
}

export interface InventoryMovementItem {
	id: number;
	inventoryId: number;
	productId: number;
	productName: string;
	sku: string;
	movementType: InventoryMovementType;
	previousQuantity: number;
	updatedQuantity: number;
	quantityChanged: number;
	reason: string;
	remarks: string | null;
	performedBy: string | null;
	createdAt: string;
}

export interface InventoryAdjustmentPayload {
	productId: number;
	adjustmentType: InventoryAdjustmentType;
	quantity?: number;
	targetQuantity?: number;
	reason: string;
	remarks?: string;
}

export interface InventoryReorderLevelPayload {
	reorderLevel: number;
	reason: string;
}

export interface InventoryCategoryBreakdown {
	category: string;
	totalQuantity: number;
	productCount: number;
}

export interface InventoryStatusBreakdown {
	status: InventoryStockStatus;
	count: number;
}

export interface InventoryDashboardSummary {
	totalProducts: number;
	totalInventoryQuantity: number;
	lowStockProducts: number;
	outOfStockProducts: number;
	inventoryByCategory: InventoryCategoryBreakdown[];
	stockStatusDistribution: InventoryStatusBreakdown[];
}

export interface InventoryNotificationItem {
	id: number;
	productId: number | null;
	productName: string | null;
	notificationType: "low-stock" | "out-of-stock" | "stock-adjusted";
	message: string;
	createdAt: string;
}