import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import * as usersApi from "../../api/users.api";
import type { UserResponseDto } from "../../api/users.api";
import { http } from "../../api/http";
import { useAuth } from "../../auth/AuthContext";

type ApiSuccessResponse<T> = {
  status: string;
  message: string;
  results: T;
};

type UserAccessUpdateDto = {
  active?: boolean | null;
  role?: string | null;
};

const ROLE_OPTIONS = ["USER", "MANAGER", "ADMIN"] as const;

function normalize(v?: string | null) {
  return (v ?? "").toString().trim().toLowerCase();
}

function displayName(u: UserResponseDto) {
  const full = `${u.name ?? ""} ${u.surname ?? ""}`.trim();
  return full || u.email;
}

function pickRoles(u: UserResponseDto): string[] {
  const roles: string[] = [];
  if (u.role) roles.push(String(u.role));
  if (Array.isArray(u.roles)) roles.push(...u.roles.filter(Boolean));
  return Array.from(new Set(roles));
}

function getActive(u: UserResponseDto): boolean | null {
  if (typeof u.active === "boolean") return u.active;
  if (typeof u.enabled === "boolean") return u.enabled;
  return null;
}

function statusLabel(u: UserResponseDto) {
  const a = getActive(u);
  if (a === null) return "—";
  return a ? "ACTIVE" : "INACTIVE";
}

function statusColor(label: string): "success" | "warning" | "default" {
  if (label === "ACTIVE") return "success";
  if (label === "INACTIVE") return "warning";
  return "default";
}

function formatMoney(v: any) {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

async function patchUserAdmin(userId: string, dto: UserAccessUpdateDto): Promise<UserResponseDto> {
  const { data } = await http.patch<ApiSuccessResponse<UserResponseDto>>(`/api/users/${userId}`, dto);
  return data.results;
}

async function deleteUserAdmin(userId: string): Promise<void> {
  await http.delete<ApiSuccessResponse<void>>(`/api/users/${userId}`);
}

// ---- auth helpers ----
function normalizeRole(r: string) {
  return (r ?? "").trim().toUpperCase();
}

function hasRole(userRoles: string[], role: string) {
  const target = normalizeRole(role);
  return (userRoles ?? []).some((r) => {
    const rr = normalizeRole(r);
    // support ADMIN and ROLE_ADMIN formats
    return rr === target || rr === `ROLE_${target}` || rr.replace(/^ROLE_/, "") === target;
  });
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  // ✅ if current user is MANAGER -> hide dangerous actions
  const isManager = useMemo(() => hasRole(auth.roles ?? [], "MANAGER"), [auth.roles]);

  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");

  // busy по конкретному userId
  const [busyId, setBusyId] = useState<string | null>(null);

  // role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<UserResponseDto | null>(null);
  const [roleValue, setRoleValue] = useState<string>("USER");

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await usersApi.getAllUsers();
      setUsers(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to load users";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = normalize(q);
    if (!s) return users;

    return users.filter((u) => {
      const roles = pickRoles(u).join(" ");
      const hay = [
        u.id,
        u.email,
        u.name ?? "",
        u.surname ?? "",
        u.phoneNumber ?? "",
        roles,
        u.balance != null ? String(u.balance) : "",
        typeof u.active === "boolean" ? (u.active ? "active" : "inactive") : "",
        typeof u.enabled === "boolean" ? (u.enabled ? "enabled" : "disabled") : "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });
  }, [users, q]);

  // ===== Actions =====

  const openRoleDialog = (e: React.MouseEvent, u: UserResponseDto) => {
    e.stopPropagation();
    setRoleTarget(u);

    // current role: role -> first roles -> USER
    const currentRole = (u.role ?? pickRoles(u)[0] ?? "USER").toString();
    setRoleValue(currentRole);
    setRoleDialogOpen(true);
  };

  const closeRoleDialog = () => {
    setRoleDialogOpen(false);
    setRoleTarget(null);
  };

  const saveRole = async () => {
    if (!roleTarget) return;

    setBusyId(roleTarget.id);
    setError(null);
    try {
      const updated = await patchUserAdmin(roleTarget.id, { role: roleValue });

      // оновлюємо локально
      setUsers((prev) => prev.map((x) => (x.id === roleTarget.id ? { ...x, ...updated } : x)));
      closeRoleDialog();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to update role";
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, u: UserResponseDto) => {
    e.stopPropagation();
    if (!confirm(`Delete user ${u.email}? This action is irreversible.`)) return;

    setBusyId(u.id);
    setError(null);
    try {
      await deleteUserAdmin(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to delete user";
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleBlock = async (e: React.MouseEvent, u: UserResponseDto) => {
    e.stopPropagation();

    const active = getActive(u);
    const nextActive = active === false ? true : false;

    const actionLabel = nextActive ? "Unblock" : "Block";
    if (!confirm(`${actionLabel} user ${u.email}?`)) return;

    setBusyId(u.id);
    setError(null);
    try {
      const updated = await patchUserAdmin(u.id, { active: nextActive });

      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id
            ? {
                ...x,
                ...updated,
                active: typeof x.active === "boolean" ? nextActive : updated.active ?? x.active,
                enabled: typeof x.enabled === "boolean" ? nextActive : updated.enabled ?? x.enabled,
              }
            : x
        )
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to update user status";
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  // ===== Render =====

  if (loading) {
    return (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2 }}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total: {users.length} • Shown: {filtered.length}
          </Typography>
        </Box>

        <TextField
          fullWidth
          size="small"
          label="Search (email, name, role, phone, balance...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Stack>

      {filtered.length === 0 ? (
        <Alert severity="info">No users found.</Alert>
      ) : (
        <Stack spacing={2}>
          {filtered.map((u) => {
            const roles = pickRoles(u);
            const st = statusLabel(u);
            const active = getActive(u);
            const busy = busyId === u.id;

            return (
              <Card
                key={u.id}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  transition: "transform 120ms ease, box-shadow 120ms ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 10px 26px rgba(0,0,0,0.08)",
                  },
                }}
              >
                <CardActionArea onClick={() => navigate(`/admin/users/${u.id}`)}>
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Top row */}
                    <Stack
                      direction={{ xs: "column", lg: "row" }}
                      spacing={2}
                      alignItems={{ xs: "flex-start", lg: "center" }}
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 320, flex: 1 }}>
                        <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                          {displayName(u)}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          {u.email}
                          {u.phoneNumber ? ` • ${u.phoneNumber}` : ""}
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" alignItems="center">
                          <Chip label={st} color={statusColor(st)} variant="outlined" size="small" />

                          {u.balance != null && (
                            <Chip label={`Balance: ${formatMoney(u.balance)}`} variant="outlined" size="small" />
                          )}

                          <Typography variant="caption" color="text.secondary">
                            ID: {u.id}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* ✅ Actions (ADMIN only). If MANAGER -> hide. */}
                      {!isManager && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flexShrink: 0 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={busy}
                            onClick={(e) => openRoleDialog(e, u)}
                            sx={{ borderRadius: 2 }}
                          >
                            Change role
                          </Button>

                          <Button
                            variant="outlined"
                            size="small"
                            disabled={busy}
                            onClick={(e) => handleToggleBlock(e, u)}
                            sx={{ borderRadius: 2 }}
                          >
                            {active === false ? "Unblock" : "Block"}
                          </Button>

                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={busy}
                            onClick={(e) => handleDelete(e, u)}
                            sx={{ borderRadius: 2 }}
                          >
                            Delete
                          </Button>
                        </Stack>
                      )}
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    {/* Roles row */}
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                        {roles.length > 0 ? (
                          roles.map((r) => <Chip key={r} size="small" label={r} />)
                        ) : (
                          <Chip size="small" label="ROLE: —" variant="outlined" />
                        )}
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        Click card to open user details
                      </Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* ✅ Role dialog: also hide if MANAGER (extra safety) */}
      {!isManager && (
        <Dialog open={roleDialogOpen} onClose={closeRoleDialog} fullWidth maxWidth="xs">
          <DialogTitle>Change role</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              User: {roleTarget?.email ?? "—"}
            </Typography>

            <Select fullWidth value={roleValue} onChange={(e) => setRoleValue(String(e.target.value))}>
              {ROLE_OPTIONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </DialogContent>

          <DialogActions>
            <Button onClick={closeRoleDialog}>Cancel</Button>
            <Button
              variant="contained"
              onClick={saveRole}
              disabled={!roleTarget || busyId === roleTarget?.id}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
