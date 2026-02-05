import { Alert, Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { Link as RouterLink, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTranslation } from "react-i18next";

function isActive(pathname: string, target: string) {
  return pathname === target || pathname.startsWith(target + "/");
}

function normalizeRole(r: string) {
  return (r ?? "").trim().toUpperCase();
}

function hasAnyRole(userRoles: string[], allowed: string[]) {
  const allowedSet = new Set(allowed.map(normalizeRole));

  return (userRoles ?? []).some((r) => {
    const rr = normalizeRole(r);
    return (
      allowedSet.has(rr) ||
      allowedSet.has(rr.replace(/^ROLE_/, "")) ||
      allowedSet.has(`ROLE_${rr}`)
    );
  });
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const auth = useAuth();
  const { t } = useTranslation();

  const canSeeAdmin = hasAnyRole(auth.roles ?? [], ["ADMIN", "MANAGER"]);

  if (!canSeeAdmin) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {t("admin.accessDenied")}
        </Alert>
        <Navigate to="/home" replace />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t("admin.title")}
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              component={RouterLink}
              to="/admin/users"
              variant={isActive(pathname, "/admin/users") ? "contained" : "outlined"}
            >
              {t("admin.users")}
            </Button>

            <Button
              component={RouterLink}
              to="/admin/orders"
              variant={isActive(pathname, "/admin/orders") ? "contained" : "outlined"}
            >
              {t("admin.orders")}
            </Button>

            <Button
              component={RouterLink}
              to="/admin/payments"
              variant={isActive(pathname, "/admin/payments") ? "contained" : "outlined"}
            >
              {t("admin.payments")}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Outlet />
    </Box>
  );
}
