import { Alert, Button, Card, CardContent, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { getDashboardSummary } from "../../api/catalogApi";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function DashboardHome() {
  const { user } = useAuth();
  const { data: summary, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const safeSummary = isError ? undefined : summary;

  const errorMessage =
    (error as any)?.response?.data?.detail ??
    (error as Error | undefined)?.message ??
    "Unable to load dashboard metrics right now.";

  const metricCards = [
    { label: "Total Products", value: safeSummary?.totalProducts ?? "--" },
    { label: "Active Products", value: safeSummary?.activeProducts ?? "--" },
    { label: "Inactive Products", value: safeSummary?.inactiveProducts ?? "--" },
    { label: "Total Categories", value: safeSummary?.totalCategories ?? "--" },
    { label: "Total Sales", value: safeSummary?.totalSales ?? "--" },
    { label: "Total Revenue", value: safeSummary ? currencyFormatter.format(safeSummary.totalRevenue) : "--" },
    { label: "Total Orders", value: safeSummary?.totalOrders ?? "--" },
    { label: "Average Order Value", value: safeSummary ? currencyFormatter.format(safeSummary.averageOrderValue) : "--" },
  ];

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">
          Welcome back, {user?.name}. Your workspace is scoped to {user?.company.name}.
        </Typography>
      </div>
      <Grid container spacing={2}>
        {isError ? (
          <Grid size={{ xs: 12 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void refetch()} disabled={isFetching}>
                  Retry
                </Button>
              }
            >
              {errorMessage}
            </Alert>
          </Grid>
        ) : null}

        {metricCards.map((metric) => (
          <Grid key={metric.label} size={{ xs: 12, md: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {metric.label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {isLoading ? <Skeleton width={90} /> : metric.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
