import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { getDashboardSummary } from "../../api/catalogApi";

export default function DashboardHome() {
  const { user } = useAuth();
  const { data: summary } = useQuery({ queryKey: ["dashboard-summary"], queryFn: getDashboardSummary });

  const metricCards = [
    { label: "Total Products", value: summary?.totalProducts ?? 0 },
    { label: "Active Products", value: summary?.activeProducts ?? 0 },
    { label: "Inactive Products", value: summary?.inactiveProducts ?? 0 },
    { label: "Total Categories", value: summary?.totalCategories ?? 0 },
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
        {metricCards.map((metric) => (
          <Grid key={metric.label} size={{ xs: 12, md: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {metric.label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {metric.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
