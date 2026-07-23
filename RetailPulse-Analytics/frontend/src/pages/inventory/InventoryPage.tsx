import EditIcon from "@mui/icons-material/Edit";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import {
	Alert,
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	IconButton,
	MenuItem,
	Paper,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
	adjustInventoryStock,
	getInventoryDashboard,
	listCategories,
	listInventory,
	listInventoryMovements,
	listInventoryNotifications,
	updateInventoryReorderLevel,
} from "../../api/catalogApi";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import {
	CategoryItem,
	InventoryAdjustmentPayload,
	InventoryAdjustmentType,
	InventoryItem,
	InventoryMovementItem,
	InventoryMovementType,
	InventoryStockStatus,
} from "../../types/catalog";

const stockStatusColor: Record<InventoryStockStatus, "success" | "warning" | "error"> = {
	"in-stock": "success",
	"low-stock": "warning",
	"out-of-stock": "error",
};

const stockStatusLabel: Record<InventoryStockStatus, string> = {
	"in-stock": "In Stock",
	"low-stock": "Low Stock",
	"out-of-stock": "Out of Stock",
};

const movementTypeLabel: Record<InventoryMovementType, string> = {
	sale: "Sale",
	"manual-adjustment": "Manual Adjustment",
	"stock-addition": "Stock Addition",
	"stock-removal": "Stock Removal",
};

export default function InventoryPage() {
	const queryClient = useQueryClient();
	const { notify } = useNotification();
	const { user } = useAuth();
	const isAdmin = user?.role === "Company Admin" || user?.role === "Super Admin";

	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
	const [brandFilter, setBrandFilter] = useState("");
	const [stockStatusFilter, setStockStatusFilter] = useState<InventoryStockStatus | "all">("all");
	const [sortBy, setSortBy] = useState<"name" | "currentStock" | "recentlyUpdated">("recentlyUpdated");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	const [movementFilterType, setMovementFilterType] = useState<InventoryMovementType | "all">("all");
	const [movementPage, setMovementPage] = useState(1);
	const [movementPageSize, setMovementPageSize] = useState(10);

	const [adjustingInventory, setAdjustingInventory] = useState<InventoryItem | null>(null);
	const [adjustmentType, setAdjustmentType] = useState<InventoryAdjustmentType>("stock-addition");
	const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
	const [targetQuantity, setTargetQuantity] = useState(0);
	const [adjustmentReason, setAdjustmentReason] = useState("");
	const [adjustmentRemarks, setAdjustmentRemarks] = useState("");

	const [reorderEditing, setReorderEditing] = useState<InventoryItem | null>(null);
	const [reorderLevelValue, setReorderLevelValue] = useState(0);
	const [reorderReason, setReorderReason] = useState("");

	const { data: categories = [] } = useQuery({
		queryKey: ["inventory-categories"],
		queryFn: () => listCategories({}),
	});

	const { data: inventoryPageData, isLoading: inventoryLoading, isError: inventoryError } = useQuery({
		queryKey: [
			"inventory-overview",
			search,
			categoryFilter,
			brandFilter,
			stockStatusFilter,
			sortBy,
			sortDirection,
			page,
			pageSize,
		],
		queryFn: () =>
			listInventory({
				search: search || undefined,
				categoryId: categoryFilter === "all" ? undefined : categoryFilter,
				brand: brandFilter || undefined,
				stockStatus: stockStatusFilter === "all" ? undefined : stockStatusFilter,
				sortBy,
				sortDirection,
				page,
				pageSize,
			}),
	});

	const { data: inventoryDashboard } = useQuery({
		queryKey: ["inventory-dashboard"],
		queryFn: getInventoryDashboard,
	});

	const { data: movementData } = useQuery({
		queryKey: ["inventory-movements", movementFilterType, movementPage, movementPageSize],
		queryFn: () =>
			listInventoryMovements({
				movementType: movementFilterType === "all" ? undefined : movementFilterType,
				page: movementPage,
				pageSize: movementPageSize,
			}),
	});

	const { data: notifications = [] } = useQuery({
		queryKey: ["inventory-notifications"],
		queryFn: () => listInventoryNotifications(20),
		enabled: isAdmin,
	});

	useEffect(() => {
		setPage(1);
	}, [search, categoryFilter, brandFilter, stockStatusFilter, sortBy, sortDirection]);

	useEffect(() => {
		setMovementPage(1);
	}, [movementFilterType]);

	const inventoryItems = inventoryPageData?.items ?? [];
	const inventoryTotal = inventoryPageData?.total ?? 0;
	const inventoryTotalPages = inventoryPageData?.totalPages ?? 0;

	const movementItems = movementData?.items ?? [];
	const movementTotal = movementData?.total ?? 0;
	const movementTotalPages = movementData?.totalPages ?? 0;

	const uniqueBrands = useMemo(() => {
		const set = new Set<string>();
		inventoryItems.forEach((item) => {
			if (item.brand) {
				set.add(item.brand);
			}
		});
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [inventoryItems]);

	const maxCategoryQuantity = useMemo(() => {
		const values = inventoryDashboard?.inventoryByCategory.map((item) => item.totalQuantity) ?? [];
		return values.length ? Math.max(...values, 1) : 1;
	}, [inventoryDashboard]);

	const adjustMutation = useMutation({
		mutationFn: (payload: InventoryAdjustmentPayload) => adjustInventoryStock(payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
			await queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
			await queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
			await queryClient.invalidateQueries({ queryKey: ["inventory-notifications"] });
			notify("Stock updated successfully", "success");
			closeAdjustDialog();
		},
		onError: (error: any) => notify(error?.response?.data?.detail ?? "Unable to adjust stock", "error"),
	});

	const reorderMutation = useMutation({
		mutationFn: ({ productId, reorderLevel, reason }: { productId: number; reorderLevel: number; reason: string }) =>
			updateInventoryReorderLevel(productId, { reorderLevel, reason }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
			await queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
			notify("Reorder level updated", "success");
			closeReorderDialog();
		},
		onError: (error: any) => notify(error?.response?.data?.detail ?? "Unable to update reorder level", "error"),
	});

	const openAdjustDialog = (item: InventoryItem) => {
		setAdjustingInventory(item);
		setAdjustmentType("stock-addition");
		setAdjustmentQuantity(1);
		setTargetQuantity(item.currentStock);
		setAdjustmentReason("");
		setAdjustmentRemarks("");
	};

	const closeAdjustDialog = () => {
		setAdjustingInventory(null);
		setAdjustmentReason("");
		setAdjustmentRemarks("");
	};

	const submitAdjustment = () => {
		if (!adjustingInventory) {
			return;
		}
		if (!adjustmentReason.trim()) {
			notify("Reason is required for stock adjustments", "warning");
			return;
		}

		const payload: InventoryAdjustmentPayload = {
			productId: adjustingInventory.productId,
			adjustmentType,
			reason: adjustmentReason.trim(),
			remarks: adjustmentRemarks.trim() || undefined,
		};

		if (adjustmentType === "manual-adjustment") {
			payload.targetQuantity = Math.max(Number(targetQuantity) || 0, 0);
		} else {
			const quantity = Number(adjustmentQuantity);
			if (!Number.isFinite(quantity) || quantity <= 0) {
				notify("Quantity must be greater than zero", "warning");
				return;
			}
			payload.quantity = quantity;
		}

		adjustMutation.mutate(payload);
	};

	const openReorderDialog = (item: InventoryItem) => {
		setReorderEditing(item);
		setReorderLevelValue(item.reorderLevel);
		setReorderReason("");
	};

	const closeReorderDialog = () => {
		setReorderEditing(null);
		setReorderReason("");
	};

	const submitReorderLevel = () => {
		if (!reorderEditing) {
			return;
		}
		if (!reorderReason.trim()) {
			notify("Reason is required for reorder level updates", "warning");
			return;
		}
		reorderMutation.mutate({
			productId: reorderEditing.productId,
			reorderLevel: Math.max(Number(reorderLevelValue) || 0, 0),
			reason: reorderReason.trim(),
		});
	};

	const categoryOptions = categories as CategoryItem[];

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="h4" fontWeight={700}>Inventory</Typography>
				<Typography color="text.secondary">Monitor stock levels, track stock movements, and manage adjustments with full history.</Typography>
			</Box>

			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 3 }}>
					<Paper sx={{ p: 2 }}>
						<Typography color="text.secondary">Total Products</Typography>
						<Typography variant="h4" fontWeight={700}>{inventoryDashboard?.totalProducts ?? 0}</Typography>
					</Paper>
				</Grid>
				<Grid size={{ xs: 12, md: 3 }}>
					<Paper sx={{ p: 2 }}>
						<Typography color="text.secondary">Total Inventory Qty</Typography>
						<Typography variant="h4" fontWeight={700}>{inventoryDashboard?.totalInventoryQuantity ?? 0}</Typography>
					</Paper>
				</Grid>
				<Grid size={{ xs: 12, md: 3 }}>
					<Paper sx={{ p: 2 }}>
						<Typography color="text.secondary">Low Stock Products</Typography>
						<Typography variant="h4" fontWeight={700}>{inventoryDashboard?.lowStockProducts ?? 0}</Typography>
					</Paper>
				</Grid>
				<Grid size={{ xs: 12, md: 3 }}>
					<Paper sx={{ p: 2 }}>
						<Typography color="text.secondary">Out of Stock Products</Typography>
						<Typography variant="h4" fontWeight={700}>{inventoryDashboard?.outOfStockProducts ?? 0}</Typography>
					</Paper>
				</Grid>
			</Grid>

			<Grid container spacing={2}>
				<Grid size={{ xs: 12, lg: 7 }}>
					<Paper sx={{ p: 2 }}>
						<Typography variant="h6" fontWeight={700}>Inventory By Category</Typography>
						<Stack spacing={1.5} sx={{ mt: 2 }}>
							{(inventoryDashboard?.inventoryByCategory ?? []).map((item) => (
								<Box key={item.category}>
									<Stack direction="row" justifyContent="space-between">
										<Typography>{item.category}</Typography>
										<Typography color="text.secondary">{item.totalQuantity}</Typography>
									</Stack>
									<Box sx={{ mt: 0.6, height: 8, borderRadius: 999, bgcolor: "#efe8dd" }}>
										<Box
											sx={{
												height: "100%",
												borderRadius: 999,
												bgcolor: "primary.main",
												width: `${Math.max((item.totalQuantity / maxCategoryQuantity) * 100, 4)}%`,
											}}
										/>
									</Box>
								</Box>
							))}
						</Stack>
					</Paper>
				</Grid>
				<Grid size={{ xs: 12, lg: 5 }}>
					<Paper sx={{ p: 2 }}>
						<Typography variant="h6" fontWeight={700}>Stock Status Distribution</Typography>
						<Stack direction="row" spacing={1} sx={{ mt: 2 }}>
							{(inventoryDashboard?.stockStatusDistribution ?? []).map((item) => (
								<Paper key={item.status} variant="outlined" sx={{ px: 1.5, py: 1, flex: 1 }}>
									<Typography color="text.secondary" fontSize={12}>{stockStatusLabel[item.status]}</Typography>
									<Typography variant="h6" fontWeight={700}>{item.count}</Typography>
								</Paper>
							))}
						</Stack>
					</Paper>
				</Grid>
			</Grid>

			<Paper sx={{ p: 2 }}>
				<Stack spacing={2}>
					<Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ lg: "center" }} justifyContent="space-between">
						<TextField fullWidth label="Search by product name or SKU" value={search} onChange={(event) => setSearch(event.target.value)} />
						<TextField select label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value === "all" ? "all" : Number(event.target.value))} sx={{ minWidth: 170 }}>
							<MenuItem value="all">All Categories</MenuItem>
							{categoryOptions.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
						</TextField>
						<TextField select label="Brand" value={brandFilter || "all"} onChange={(event) => setBrandFilter(event.target.value === "all" ? "" : event.target.value)} sx={{ minWidth: 170 }}>
							<MenuItem value="all">All Brands</MenuItem>
							{uniqueBrands.map((brand) => <MenuItem key={brand} value={brand}>{brand}</MenuItem>)}
						</TextField>
						<TextField select label="Status" value={stockStatusFilter} onChange={(event) => setStockStatusFilter(event.target.value as InventoryStockStatus | "all")} sx={{ minWidth: 150 }}>
							<MenuItem value="all">All Status</MenuItem>
							<MenuItem value="in-stock">In Stock</MenuItem>
							<MenuItem value="low-stock">Low Stock</MenuItem>
							<MenuItem value="out-of-stock">Out of Stock</MenuItem>
						</TextField>
						<TextField select label="Sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "currentStock" | "recentlyUpdated")} sx={{ minWidth: 150 }}>
							<MenuItem value="recentlyUpdated">Recently Updated</MenuItem>
							<MenuItem value="name">Product Name</MenuItem>
							<MenuItem value="currentStock">Current Stock</MenuItem>
						</TextField>
						<TextField select label="Direction" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as "asc" | "desc")} sx={{ minWidth: 130 }}>
							<MenuItem value="desc">Desc</MenuItem>
							<MenuItem value="asc">Asc</MenuItem>
						</TextField>
					</Stack>

					{inventoryError ? <Alert severity="error">Unable to load inventory overview. Try refreshing.</Alert> : null}
					{!inventoryLoading && inventoryItems.length === 0 ? <Alert severity="info">No inventory records match your filters.</Alert> : null}

					<Box sx={{ overflowX: "auto" }}>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>
								<tr>
									{["Product", "SKU", "Category", "Brand", "Current", "Reserved", "Available", "Reorder", "Status", "Actions"].map((heading) => (
										<th key={heading} style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #e5ddd0" }}>{heading}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{inventoryItems.map((item) => (
									<tr key={item.id}>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de", fontWeight: 600 }}>{item.productName}</td>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de" }}>{item.sku}</td>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de" }}>{item.category}</td>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de" }}>{item.brand ?? "-"}</td>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de" }}>{item.currentStock}</td>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de" }}>{item.reservedStock}</td>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de" }}>{item.availableStock}</td>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de" }}>{item.reorderLevel}</td>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de" }}>
											<Chip size="small" color={stockStatusColor[item.stockStatus]} label={stockStatusLabel[item.stockStatus]} />
										</td>
										<td style={{ padding: "14px 8px", borderBottom: "1px solid #f0e9de" }}>
											{isAdmin ? (
												<Stack direction="row" spacing={1}>
													<Button size="small" variant="outlined" onClick={() => openAdjustDialog(item)}>Adjust</Button>
													<IconButton size="small" onClick={() => openReorderDialog(item)}><EditIcon fontSize="small" /></IconButton>
												</Stack>
											) : (
												<Typography color="text.secondary" fontSize={12}>Read only</Typography>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</Box>

					<Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
						<Typography color="text.secondary">Showing {inventoryTotal === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, inventoryTotal)} of {inventoryTotal}</Typography>
						<Stack direction="row" spacing={1} alignItems="center">
							<TextField select size="small" label="Rows" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} sx={{ minWidth: 110 }}>
								{[10, 25, 50].map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
							</TextField>
							<Button variant="outlined" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Previous</Button>
							<Button variant="outlined" disabled={inventoryTotalPages === 0 || page >= inventoryTotalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
						</Stack>
					</Stack>
				</Stack>
			</Paper>

			<Paper sx={{ p: 2 }}>
				<Stack spacing={2}>
					<Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
						<Typography variant="h6" fontWeight={700}>Stock Movement History</Typography>
						<TextField select label="Movement Type" value={movementFilterType} onChange={(event) => setMovementFilterType(event.target.value as InventoryMovementType | "all")} sx={{ minWidth: 200 }}>
							<MenuItem value="all">All</MenuItem>
							<MenuItem value="sale">Sale</MenuItem>
							<MenuItem value="manual-adjustment">Manual Adjustment</MenuItem>
							<MenuItem value="stock-addition">Stock Addition</MenuItem>
							<MenuItem value="stock-removal">Stock Removal</MenuItem>
						</TextField>
					</Stack>

					<Box sx={{ overflowX: "auto" }}>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>
								<tr>
									{["Product", "Movement", "Previous", "Updated", "Changed", "Reason", "By", "Date"].map((heading) => (
										<th key={heading} style={{ textAlign: "left", padding: "12px 8px", borderBottom: "1px solid #e5ddd0" }}>{heading}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{movementItems.map((movement: InventoryMovementItem) => (
									<tr key={movement.id}>
										<td style={{ padding: "12px 8px", borderBottom: "1px solid #f0e9de" }}>{movement.productName}</td>
										<td style={{ padding: "12px 8px", borderBottom: "1px solid #f0e9de" }}>{movementTypeLabel[movement.movementType]}</td>
										<td style={{ padding: "12px 8px", borderBottom: "1px solid #f0e9de" }}>{movement.previousQuantity}</td>
										<td style={{ padding: "12px 8px", borderBottom: "1px solid #f0e9de" }}>{movement.updatedQuantity}</td>
										<td style={{ padding: "12px 8px", borderBottom: "1px solid #f0e9de", fontWeight: 700 }}>{movement.quantityChanged > 0 ? `+${movement.quantityChanged}` : movement.quantityChanged}</td>
										<td style={{ padding: "12px 8px", borderBottom: "1px solid #f0e9de" }}>{movement.reason}</td>
										<td style={{ padding: "12px 8px", borderBottom: "1px solid #f0e9de" }}>{movement.performedBy ?? "System"}</td>
										<td style={{ padding: "12px 8px", borderBottom: "1px solid #f0e9de" }}>{new Date(movement.createdAt).toLocaleString()}</td>
									</tr>
								))}
							</tbody>
						</table>
					</Box>

					<Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
						<Typography color="text.secondary">Showing {movementTotal === 0 ? 0 : (movementPage - 1) * movementPageSize + 1}-{Math.min(movementPage * movementPageSize, movementTotal)} of {movementTotal}</Typography>
						<Stack direction="row" spacing={1} alignItems="center">
							<TextField select size="small" label="Rows" value={movementPageSize} onChange={(event) => { setMovementPageSize(Number(event.target.value)); setMovementPage(1); }} sx={{ minWidth: 110 }}>
								{[10, 25, 50].map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
							</TextField>
							<Button variant="outlined" disabled={movementPage <= 1} onClick={() => setMovementPage((current) => Math.max(current - 1, 1))}>Previous</Button>
							<Button variant="outlined" disabled={movementTotalPages === 0 || movementPage >= movementTotalPages} onClick={() => setMovementPage((current) => current + 1)}>Next</Button>
						</Stack>
					</Stack>
				</Stack>
			</Paper>

			{isAdmin ? (
				<Paper sx={{ p: 2 }}>
					<Stack spacing={1.5}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Inventory2Icon />
							<Typography variant="h6" fontWeight={700}>Inventory Notifications</Typography>
						</Stack>
						{notifications.length === 0 ? (
							<Typography color="text.secondary">No recent inventory notifications.</Typography>
						) : (
							notifications.map((item) => (
								<Alert key={item.id} severity={item.notificationType === "out-of-stock" ? "error" : item.notificationType === "low-stock" ? "warning" : "info"}>
									{item.message} ({new Date(item.createdAt).toLocaleString()})
								</Alert>
							))
						)}
					</Stack>
				</Paper>
			) : null}

			<Dialog open={Boolean(adjustingInventory)} onClose={closeAdjustDialog} fullWidth maxWidth="sm">
				<DialogTitle>Adjust Stock</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ pt: 1 }}>
						<Typography color="text.secondary">{adjustingInventory?.productName} ({adjustingInventory?.sku})</Typography>
						<TextField select label="Adjustment Type" value={adjustmentType} onChange={(event) => setAdjustmentType(event.target.value as InventoryAdjustmentType)}>
							<MenuItem value="stock-addition">Stock Addition</MenuItem>
							<MenuItem value="stock-removal">Stock Removal</MenuItem>
							<MenuItem value="manual-adjustment">Manual Adjustment</MenuItem>
						</TextField>
						{adjustmentType === "manual-adjustment" ? (
							<TextField type="number" label="Target Quantity" value={targetQuantity} onChange={(event) => setTargetQuantity(Number(event.target.value))} inputProps={{ min: 0 }} />
						) : (
							<TextField type="number" label="Quantity" value={adjustmentQuantity} onChange={(event) => setAdjustmentQuantity(Number(event.target.value))} inputProps={{ min: 1 }} />
						)}
						<TextField label="Reason" value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} required />
						<TextField label="Remarks" value={adjustmentRemarks} onChange={(event) => setAdjustmentRemarks(event.target.value)} multiline minRows={2} />
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={closeAdjustDialog} color="inherit">Cancel</Button>
					<Button variant="contained" onClick={submitAdjustment} disabled={adjustMutation.isPending}>Save</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={Boolean(reorderEditing)} onClose={closeReorderDialog} fullWidth maxWidth="sm">
				<DialogTitle>Update Reorder Level</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ pt: 1 }}>
						<Typography color="text.secondary">{reorderEditing?.productName} ({reorderEditing?.sku})</Typography>
						<TextField type="number" label="Reorder Level" value={reorderLevelValue} onChange={(event) => setReorderLevelValue(Number(event.target.value))} inputProps={{ min: 0 }} />
						<TextField label="Reason" value={reorderReason} onChange={(event) => setReorderReason(event.target.value)} required />
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={closeReorderDialog} color="inherit">Cancel</Button>
					<Button variant="contained" onClick={submitReorderLevel} disabled={reorderMutation.isPending}>Update</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
}
