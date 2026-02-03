import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getRolesFromToken, parseJwt, isExpired } from "../auth/jwt";

// ✅ ВАЖЛИВО: постав тут ТОЙ САМИЙ ключ, який використовує твій RequireAuth/AuthContext
function getAccessToken(): string | null {
  // найчастіші варіанти: "accessToken" або "access_token"
  return localStorage.getItem("accessToken") ?? localStorage.getItem("access_token");
}

function normalizeRole(r: string): string {
  return (r || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

type Props = {
  allowed: string[]; // ["ADMIN","MANAGER"]
};

export function RequireRoles({ allowed }: Props) {
  const location = useLocation();
  const token = getAccessToken();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  const payload = parseJwt(token);
  if (!payload || isExpired(payload)) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  const roles = getRolesFromToken(token).map(normalizeRole);
  const allowedNorm = allowed.map(normalizeRole);

  const ok = roles.some(r => allowedNorm.includes(r));
  if (!ok) return <Navigate to="/home" replace />;

  return <Outlet />;
}
