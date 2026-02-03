import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";

function isActive(pathname: string, target: string) {
  return pathname === target || pathname.startsWith(target + "/");
}

export default function AdminLayout() {
  const { pathname } = useLocation();

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Admin Panel
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              component={RouterLink}
              to="/admin/users"
              variant={isActive(pathname, "/admin/users") ? "contained" : "outlined"}
            >
              Users
            </Button>

            <Button
              component={RouterLink}
              to="/admin/orders"
              variant={isActive(pathname, "/admin/orders") ? "contained" : "outlined"}
            >
              Orders
            </Button>

            <Button
              component={RouterLink}
              to="/admin/payments"
              variant={isActive(pathname, "/admin/payments") ? "contained" : "outlined"}
            >
              Payments
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Outlet />
    </Box>
  );
}
