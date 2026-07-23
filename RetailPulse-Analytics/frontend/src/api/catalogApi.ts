import { apiClient } from "./axios";
import {
	CategoryFormValues,
	CategoryItem,
	CatalogStatus,
	DashboardSummary,
	InventoryAdjustmentPayload,
	InventoryDashboardSummary,
	InventoryItem,
	InventoryMovementItem,
	InventoryMovementType,
	InventoryNotificationItem,
	InventoryReorderLevelPayload,
	InventoryStockStatus,
	PaymentMethod,
	PaginatedResult,
	ProductFormValues,
	ProductItem,
	SaleFormValues,
	SaleListItem,
	SaleNotification,
	SaleRecord,
	SalesChannel,
} from "../types/catalog";

function toNumber(value: unknown): number {
	return typeof value === "number" ? value : Number(value ?? 0);
}

function normalizeCategory(data: Record<string, unknown>): CategoryItem {
	return {
		id: toNumber(data.id),
		name: (data.name as string) ?? "",
		description: (data.description as string | null | undefined) ?? null,
		status: ((data.status as CatalogStatus | undefined) ?? "active") as CatalogStatus,
		productCount: toNumber(data.productCount ?? data.product_count),
		createdAt: (data.createdAt as string | undefined) ?? (data.created_at as string),
		updatedAt: (data.updatedAt as string | undefined) ?? (data.updated_at as string),
	};
}

function normalizeProduct(data: Record<string, unknown>): ProductItem {
	const category = (data.category as Record<string, unknown>) ?? {};
	return {
		id: toNumber(data.id),
		name: (data.name as string) ?? "",
		sku: (data.sku as string) ?? "",
		category: {
			id: toNumber(category.id),
			name: (category.name as string) ?? "",
			status: ((category.status as CatalogStatus | undefined) ?? "active") as CatalogStatus,
		},
		brand: (data.brand as string | null | undefined) ?? null,
		description: (data.description as string | null | undefined) ?? null,
		unitPrice: toNumber(data.unitPrice ?? data.unit_price),
		costPrice: toNumber(data.costPrice ?? data.cost_price),
		stockQuantity: toNumber(data.stockQuantity ?? data.stock_quantity),
		isOutOfStock: Boolean(data.isOutOfStock ?? data.is_out_of_stock),
		unitOfMeasure: (data.unitOfMeasure as string | undefined) ?? (data.unit_of_measure as string),
		status: ((data.status as CatalogStatus | undefined) ?? "active") as CatalogStatus,
		createdAt: (data.createdAt as string | undefined) ?? (data.created_at as string),
		updatedAt: (data.updatedAt as string | undefined) ?? (data.updated_at as string),
	};
}

function normalizeSaleNotification(data: Record<string, unknown>): SaleNotification {
	return {
		type: ((data.type as SaleNotification["type"] | undefined) ?? "low-stock") as SaleNotification["type"],
		message: (data.message as string | undefined) ?? "",
	};
}

function normalizeSaleListItem(data: Record<string, unknown>): SaleListItem {
	return {
		id: toNumber(data.id),
		invoiceNumber: (data.invoiceNumber as string | undefined) ?? (data.invoice_number as string) ?? "",
		customerName: (data.customerName as string | undefined) ?? (data.customer_name as string) ?? "",
		saleDate: (data.saleDate as string | undefined) ?? (data.sale_date as string) ?? "",
		salesChannel: ((data.salesChannel as SalesChannel | undefined) ?? (data.sales_channel as SalesChannel) ?? "other") as SalesChannel,
		paymentMethod: ((data.paymentMethod as PaymentMethod | undefined) ?? (data.payment_method as PaymentMethod) ?? "other") as PaymentMethod,
		totalAmount: toNumber(data.totalAmount ?? data.total_amount),
		createdByName: (data.createdByName as string | undefined) ?? (data.created_by_name as string) ?? "",
		itemCount: toNumber(data.itemCount ?? data.item_count),
	};
}

function normalizeSaleRecord(data: Record<string, unknown>): SaleRecord {
	const items = ((data.items as Record<string, unknown>[] | undefined) ?? []).map((item) => ({
		id: toNumber(item.id),
		productId: toNumber(item.productId ?? item.product_id),
		productName: (item.productName as string | undefined) ?? (item.product_name as string) ?? "",
		categoryId: toNumber(item.categoryId ?? item.category_id),
		categoryName: (item.categoryName as string | undefined) ?? (item.category_name as string) ?? "",
		quantity: toNumber(item.quantity),
		unitPrice: toNumber(item.unitPrice ?? item.unit_price),
		discount: toNumber(item.discount),
		tax: toNumber(item.tax),
		total: toNumber(item.total),
		remainingStock: toNumber(item.remainingStock ?? item.remaining_stock),
	}));

	return {
		id: toNumber(data.id),
		invoiceNumber: (data.invoiceNumber as string | undefined) ?? (data.invoice_number as string) ?? "",
		customerName: (data.customerName as string | undefined) ?? (data.customer_name as string) ?? "",
		saleDate: (data.saleDate as string | undefined) ?? (data.sale_date as string) ?? "",
		salesChannel: ((data.salesChannel as SalesChannel | undefined) ?? (data.sales_channel as SalesChannel) ?? "other") as SalesChannel,
		paymentMethod: ((data.paymentMethod as PaymentMethod | undefined) ?? (data.payment_method as PaymentMethod) ?? "other") as PaymentMethod,
		totalAmount: toNumber(data.totalAmount ?? data.total_amount),
		createdBy: toNumber(data.createdBy ?? data.created_by),
		createdByName: (data.createdByName as string | undefined) ?? (data.created_by_name as string) ?? "",
		createdAt: (data.createdAt as string | undefined) ?? (data.created_at as string) ?? "",
		updatedAt: (data.updatedAt as string | undefined) ?? (data.updated_at as string) ?? "",
		items,
		notifications: ((data.notifications as Record<string, unknown>[] | undefined) ?? []).map(normalizeSaleNotification),
	};
}

function normalizeDashboard(data: Record<string, unknown>): DashboardSummary {
	return {
		totalProducts: toNumber(data.totalProducts ?? data.total_products),
		activeProducts: toNumber(data.activeProducts ?? data.active_products),
		inactiveProducts: toNumber(data.inactiveProducts ?? data.inactive_products),
		totalCategories: toNumber(data.totalCategories ?? data.total_categories),
		totalSales: toNumber(data.totalSales ?? data.total_sales),
		totalRevenue: toNumber(data.totalRevenue ?? data.total_revenue),
		totalOrders: toNumber(data.totalOrders ?? data.total_orders),
		averageOrderValue: toNumber(data.averageOrderValue ?? data.average_order_value),
	};
}

function normalizeInventoryItem(data: Record<string, unknown>): InventoryItem {
	return {
		id: toNumber(data.id),
		productId: toNumber(data.productId ?? data.product_id),
		productName: (data.productName as string | undefined) ?? (data.product_name as string) ?? "",
		sku: (data.sku as string | undefined) ?? "",
		category: (data.category as string | undefined) ?? "",
		brand: (data.brand as string | null | undefined) ?? null,
		currentStock: toNumber(data.currentStock ?? data.current_stock),
		reservedStock: toNumber(data.reservedStock ?? data.reserved_stock),
		availableStock: toNumber(data.availableStock ?? data.available_stock),
		reorderLevel: toNumber(data.reorderLevel ?? data.reorder_level),
		stockStatus: ((data.stockStatus as InventoryStockStatus | undefined) ?? (data.stock_status as InventoryStockStatus) ?? "in-stock") as InventoryStockStatus,
		updatedAt: (data.updatedAt as string | undefined) ?? (data.updated_at as string) ?? "",
	};
}

function normalizeInventoryMovement(data: Record<string, unknown>): InventoryMovementItem {
	return {
		id: toNumber(data.id),
		inventoryId: toNumber(data.inventoryId ?? data.inventory_id),
		productId: toNumber(data.productId ?? data.product_id),
		productName: (data.productName as string | undefined) ?? (data.product_name as string) ?? "",
		sku: (data.sku as string | undefined) ?? "",
		movementType: ((data.movementType as InventoryMovementType | undefined) ?? (data.movement_type as InventoryMovementType) ?? "manual-adjustment") as InventoryMovementType,
		previousQuantity: toNumber(data.previousQuantity ?? data.previous_quantity),
		updatedQuantity: toNumber(data.updatedQuantity ?? data.updated_quantity),
		quantityChanged: toNumber(data.quantityChanged ?? data.quantity_changed),
		reason: (data.reason as string | undefined) ?? "",
		remarks: (data.remarks as string | null | undefined) ?? null,
		performedBy: (data.performedBy as string | null | undefined) ?? (data.performed_by as string | null | undefined) ?? null,
		createdAt: (data.createdAt as string | undefined) ?? (data.created_at as string) ?? "",
	};
}

function normalizeInventoryDashboard(data: Record<string, unknown>): InventoryDashboardSummary {
	return {
		totalProducts: toNumber(data.totalProducts ?? data.total_products),
		totalInventoryQuantity: toNumber(data.totalInventoryQuantity ?? data.total_inventory_quantity),
		lowStockProducts: toNumber(data.lowStockProducts ?? data.low_stock_products),
		outOfStockProducts: toNumber(data.outOfStockProducts ?? data.out_of_stock_products),
		inventoryByCategory: ((data.inventoryByCategory as Record<string, unknown>[] | undefined) ?? []).map((item) => ({
			category: (item.category as string | undefined) ?? "",
			totalQuantity: toNumber(item.totalQuantity ?? item.total_quantity),
			productCount: toNumber(item.productCount ?? item.product_count),
		})),
		stockStatusDistribution: ((data.stockStatusDistribution as Record<string, unknown>[] | undefined) ?? []).map((item) => ({
			status: ((item.status as InventoryStockStatus | undefined) ?? "in-stock") as InventoryStockStatus,
			count: toNumber(item.count),
		})),
	};
}

function normalizeInventoryNotification(data: Record<string, unknown>): InventoryNotificationItem {
	return {
		id: toNumber(data.id),
		productId: (data.productId as number | null | undefined) ?? (data.product_id as number | null | undefined) ?? null,
		productName: (data.productName as string | null | undefined) ?? (data.product_name as string | null | undefined) ?? null,
		notificationType: ((data.notificationType as InventoryNotificationItem["notificationType"] | undefined) ?? "stock-adjusted") as InventoryNotificationItem["notificationType"],
		message: (data.message as string | undefined) ?? "",
		createdAt: (data.createdAt as string | undefined) ?? (data.created_at as string) ?? "",
	};
}

function normalizePaginatedResponse<T>(
	data: Record<string, unknown>,
	normalizer: (item: Record<string, unknown>) => T,
): PaginatedResult<T> {
	const items = ((data.items as Record<string, unknown>[] | undefined) ?? []).map(normalizer);
	return {
		items,
		total: toNumber(data.total),
		page: toNumber(data.page),
		pageSize: toNumber(data.pageSize ?? data.page_size),
		totalPages: toNumber(data.totalPages ?? data.total_pages),
	};
}

export async function getDashboardSummary() {
	const response = await apiClient.get<Record<string, unknown>>("/dashboard/summary");
	return normalizeDashboard(response.data);
}

export async function listCategories(params: { search?: string; status?: CatalogStatus }) {
	const response = await apiClient.get<Record<string, unknown>[]>("/categories", { params });
	return response.data.map(normalizeCategory);
}

export async function getCategory(categoryId: number) {
	const response = await apiClient.get<Record<string, unknown>>(`/categories/${categoryId}`);
	return normalizeCategory(response.data);
}

export async function createCategory(payload: CategoryFormValues) {
	const response = await apiClient.post<Record<string, unknown>>("/categories", payload);
	return normalizeCategory(response.data);
}

export async function updateCategory(categoryId: number, payload: CategoryFormValues) {
	const response = await apiClient.put<Record<string, unknown>>(`/categories/${categoryId}`, payload);
	return normalizeCategory(response.data);
}

export async function deleteCategory(categoryId: number) {
	await apiClient.delete(`/categories/${categoryId}`);
}

export async function listProducts(params: {
	search?: string;
	categoryId?: number;
	status?: CatalogStatus;
	sortBy?: "name" | "price" | "recentlyAdded";
	sortDirection?: "asc" | "desc";
	page?: number;
	pageSize?: number;
}) {
	const response = await apiClient.get<Record<string, unknown>>("/products", { params });
	return normalizePaginatedResponse(response.data, normalizeProduct);
}

export async function getProduct(productId: number) {
	const response = await apiClient.get<Record<string, unknown>>(`/products/${productId}`);
	return normalizeProduct(response.data);
}

export async function createProduct(payload: ProductFormValues) {
	const response = await apiClient.post<Record<string, unknown>>("/products", payload);
	return normalizeProduct(response.data);
}

export async function updateProduct(productId: number, payload: ProductFormValues) {
	const response = await apiClient.put<Record<string, unknown>>(`/products/${productId}`, payload);
	return normalizeProduct(response.data);
}

export async function setProductStatus(productId: number, status: CatalogStatus) {
	const response = await apiClient.patch<Record<string, unknown>>(`/products/${productId}/status`, { status });
	return normalizeProduct(response.data);
}

export async function deleteProduct(productId: number) {
	await apiClient.delete(`/products/${productId}`);
}

export async function listSales(params: {
	search?: string;
	startDate?: string;
	endDate?: string;
	categoryId?: number;
	salesChannel?: SalesChannel;
	paymentMethod?: PaymentMethod;
	sortBy?: "date" | "invoiceNumber" | "totalAmount";
	sortDirection?: "asc" | "desc";
	page?: number;
	pageSize?: number;
}) {
	const response = await apiClient.get<Record<string, unknown>>("/sales", { params });
	return normalizePaginatedResponse(response.data, normalizeSaleListItem);
}

export async function getSale(saleId: number) {
	const response = await apiClient.get<Record<string, unknown>>(`/sales/${saleId}`);
	return normalizeSaleRecord(response.data);
}

export async function createSale(payload: SaleFormValues) {
	const response = await apiClient.post<Record<string, unknown>>("/sales", payload);
	return normalizeSaleRecord(response.data);
}

export async function updateSale(saleId: number, payload: SaleFormValues) {
	const response = await apiClient.put<Record<string, unknown>>(`/sales/${saleId}`, payload);
	return normalizeSaleRecord(response.data);
}

export async function deleteSale(saleId: number) {
	await apiClient.delete(`/sales/${saleId}`);
}

export async function listInventory(params: {
	search?: string;
	categoryId?: number;
	brand?: string;
	stockStatus?: InventoryStockStatus;
	sortBy?: "name" | "currentStock" | "recentlyUpdated";
	sortDirection?: "asc" | "desc";
	page?: number;
	pageSize?: number;
}) {
	const response = await apiClient.get<Record<string, unknown>>("/inventory", { params });
	return normalizePaginatedResponse(response.data, normalizeInventoryItem);
}

export async function getInventoryDashboard() {
	const response = await apiClient.get<Record<string, unknown>>("/inventory/dashboard");
	return normalizeInventoryDashboard(response.data);
}

export async function listInventoryMovements(params: {
	productId?: number;
	movementType?: InventoryMovementType;
	page?: number;
	pageSize?: number;
}) {
	const response = await apiClient.get<Record<string, unknown>>("/inventory/movements", { params });
	return normalizePaginatedResponse(response.data, normalizeInventoryMovement);
}

export async function adjustInventoryStock(payload: InventoryAdjustmentPayload) {
	const response = await apiClient.post<Record<string, unknown>>("/inventory/adjustments", payload);
	return normalizeInventoryItem(response.data);
}

export async function updateInventoryReorderLevel(productId: number, payload: InventoryReorderLevelPayload) {
	const response = await apiClient.patch<Record<string, unknown>>(`/inventory/${productId}/reorder-level`, payload);
	return normalizeInventoryItem(response.data);
}

export async function listInventoryNotifications(limit = 20) {
	const response = await apiClient.get<Record<string, unknown>[]>("/inventory/notifications", { params: { limit } });
	return response.data.map(normalizeInventoryNotification);
}