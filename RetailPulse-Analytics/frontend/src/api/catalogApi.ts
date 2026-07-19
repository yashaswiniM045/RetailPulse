import { apiClient } from "./axios";
import {
	CategoryFormValues,
	CategoryItem,
	CatalogStatus,
	DashboardSummary,
	ProductFormValues,
	ProductItem,
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
		unitOfMeasure: (data.unitOfMeasure as string | undefined) ?? (data.unit_of_measure as string),
		status: ((data.status as CatalogStatus | undefined) ?? "active") as CatalogStatus,
		createdAt: (data.createdAt as string | undefined) ?? (data.created_at as string),
		updatedAt: (data.updatedAt as string | undefined) ?? (data.updated_at as string),
	};
}

function normalizeDashboard(data: Record<string, unknown>): DashboardSummary {
	return {
		totalProducts: toNumber(data.totalProducts ?? data.total_products),
		activeProducts: toNumber(data.activeProducts ?? data.active_products),
		inactiveProducts: toNumber(data.inactiveProducts ?? data.inactive_products),
		totalCategories: toNumber(data.totalCategories ?? data.total_categories),
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
}) {
	const response = await apiClient.get<Record<string, unknown>[]>("/products", { params });
	return response.data.map(normalizeProduct);
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