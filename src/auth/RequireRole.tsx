// src/auth/RequireRole.tsx
import { Navigate, Outlet } from "react-router-dom";
import { Alert, Box } from "@mui/material";
import { useAuth } from "./AuthContext";

type Props = {
  anyOf: string[];
  redirectTo?: string;
  showMessage?: boolean;
};

function normalizeRole(r: string) {
  return (r ?? "").trim().toUpperCase();
}

/**
 * Guard for role-based routes.
 * Allows access if user has at least one role from anyOf.
 * Supports both ADMIN and ROLE_ADMIN formats.
 */
export function RequireRole({ anyOf, redirectTo = "/home", showMessage = false }: Props) {
  const { isAuthenticated, roles } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const allowed = new Set(anyOf.map(normalizeRole));

  const has = (roles ?? []).some((r) => {
    const rr = normalizeRole(r);
    return allowed.has(rr) || allowed.has(rr.replace(/^ROLE_/, "")) || allowed.has(`ROLE_${rr}`);
  });

  if (!has) {
    if (!showMessage) return <Navigate to={redirectTo} replace />;

    return (
      <Box sx={{ maxWidth: 900, mx: "auto", p: 2 }}>
        <Alert severity="error">Access denied. Allowed roles: {anyOf.join(", ")}.</Alert>
      </Box>
    );
  }

  return <Outlet />;
}
