// src/auth/jwt.ts

export type TokenType = "ACCESS" | "REFRESH";

/**
 * JWT payload exactly as your backend generates it.
 * - sub: email
 * - userId: UUID string (only for ACCESS token)
 * - roles: string[] (only for ACCESS token)
 * - tokenType: ACCESS | REFRESH
 * - iat/exp: numeric timestamps (seconds since epoch) - standard JWT
 */
export type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;

  tokenType: TokenType;

  // present in ACCESS token
  userId?: string;
  roles?: string[];
};

function base64UrlToString(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

export function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payloadPart = parts[1];
    const raw = base64UrlToString(payloadPart);

    // handle unicode safely
    const decoded = decodeURIComponent(
      Array.from(raw)
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * UUID check (loose): accept any 8-4-4-4-12 hex UUID.
 * (No RFC4122 version/variant restriction.)
 */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function isExpired(payload: JwtPayload, nowMs: number = Date.now()): boolean {
  // exp in seconds -> convert to ms
  return payload.exp * 1000 <= nowMs;
}

export function getTokenType(token: string): TokenType | null {
  const p = parseJwt(token);
  return p?.tokenType ?? null;
}

export function getEmailFromToken(token: string): string | null {
  const p = parseJwt(token);
  return p?.sub ?? null;
}

/**
 * Your backend puts userId only in ACCESS token.
 * For REFRESH token -> returns null.
 */
export function getUserIdFromToken(token: string): string | null {
  const p = parseJwt(token);
  if (!p) return null;

  if (p.tokenType !== "ACCESS") return null;

  const userId = p.userId;
  if (!userId) return null;

  return isUuid(userId) ? userId : null;
}

/**
 * roles are only in ACCESS token in your backend.
 */
export function getRolesFromToken(token: string): string[] {
  const p = parseJwt(token);
  if (!p) return [];

  if (p.tokenType !== "ACCESS") return [];

  return Array.isArray(p.roles) ? p.roles.filter((r) => typeof r === "string") : [];
}

/**
 * Optional helper for UI guards.
 */
export function hasRole(token: string, role: string): boolean {
  return getRolesFromToken(token).includes(role);
}
