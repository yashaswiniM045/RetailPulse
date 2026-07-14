import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";

const metricCards = [
  { label: "Active Analysts", value: "12" },
  { label: "Open Reports", value: "28" },
  { label: "Data Refresh", value: "2 min" },
];

export default function DashboardHome() {
  const { user } = useAuth();

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
          <Grid key={metric.label} size={{ xs: 12, md: 4 }}>
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
