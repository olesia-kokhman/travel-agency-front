import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Collapse,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import { useNavigate } from "react-router-dom";

import * as usersApi from "../../api/users.api";
import type { UserResponseDto } from "../../api/users.api";
import { http } from "../../api/http";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";

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
const USER_ROLES = ["USER", "MANAGER", "ADMIN"] as const;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function normalizeRole(r: string) {
  return (r ?? "").trim().toUpperCase();
}

function hasRole(userRoles: string[], role: string) {
  const target = normalizeRole(role);
  return (userRoles ?? []).some((x) => {
    const rr = normalizeRole(x);
    return rr === target || rr === `ROLE_${target}` || rr.replace(/^ROLE_/, "") === target;
  });
}

function displayName(u: UserResponseDto) {
  const full = `${u.name ?? ""} ${u.surname ?? ""}`.trim();
  return full || u.email;
}

function pickRoles(u: UserResponseDto): string[] {
  const roles: string[] = [];
  if (u.role) roles.push(String(u.role));
  // @ts-ignore - in case backend returns roles array too
  if (Array.isArray((u as any).roles)) roles.push(...((u as any).roles as any[]).filter(Boolean));
  return Array.from(new Set(roles));
}

function getActive(u: UserResponseDto): boolean | null {
  // support multiple backends
  // @ts-ignore
  if (typeof (u as any).active === "boolean") return (u as any).active;
  // @ts-ignore
  if (typeof (u as any).enabled === "boolean") return (u as any).enabled;
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

type SortOption =
  | "CREATED_DESC"
  | "CREATED_ASC"
  | "EMAIL_ASC"
  | "EMAIL_DESC"
  | "BALANCE_ASC"
  | "BALANCE_DESC";

function sortToPageable(sort: SortOption): { property: string; direction: "asc" | "desc" } | null {
  switch (sort) {
    case "CREATED_DESC":
      return { property: "createdAt", direction: "desc" };
    case "CREATED_ASC":
      return { property: "createdAt", direction: "asc" };
    case "EMAIL_ASC":
      return { property: "email", direction: "asc" };
    case "EMAIL_DESC":
      return { property: "email", direction: "desc" };
    case "BALANCE_ASC":
      return { property: "balance", direction: "asc" };
    case "BALANCE_DESC":
      return { property: "balance", direction: "desc" };
    default:
      return null;
  }
}

function isNonEmpty(v?: string | null) {
  return !!v && v.trim().length > 0;
}

export default function AdminUsersPage() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const auth = useAuth();

  // if current user is MANAGER -> hide dangerous actions
  const isManager = useMemo(() => hasRole(auth.roles ?? [], "MANAGER"), [auth.roles]);

  // ===== server-side query state =====
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 450);

  const [showFilters, setShowFilters] = useState(false);

  const [roles, setRoles] = useState<string[]>([]);
  const [active, setActive] = useState<boolean | null>(null);

  const [minBalance, setMinBalance] = useState("");
  const [maxBalance, setMaxBalance] = useState("");

  // ISO strings expected by backend (simple text inputs)
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const [sort, setSort] = useState<SortOption>("CREATED_DESC");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // ===== data state =====
  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<UserResponseDto | null>(null);
  const [roleValue, setRoleValue] = useState<string>("USER");

  // avoid stale responses
  const requestSeq = useRef(0);

  const filter = useMemo<usersApi.UserFilter>(() => {
    const f: usersApi.UserFilter = {};

    if (isNonEmpty(qDebounced)) f.q = qDebounced.trim();
    if (roles.length) f.roles = roles;
    if (typeof active === "boolean") f.active = active;

    if (isNonEmpty(minBalance)) f.minBalance = minBalance.trim();
    if (isNonEmpty(maxBalance)) f.maxBalance = maxBalance.trim();

    if (isNonEmpty(createdFrom)) f.createdFrom = createdFrom.trim();
    if (isNonEmpty(createdTo)) f.createdTo = createdTo.trim();

    return f;
  }, [qDebounced, roles, active, minBalance, maxBalance, createdFrom, createdTo]);

  const load = async () => {
    const seq = ++requestSeq.current;

    setError(null);
    setLoading(true);
    try {
      const res = await usersApi.getUsersPage({
        filter,
        page,
        size,
        sort: sortToPageable(sort),
      });

      if (seq !== requestSeq.current) return;

      setUsers(res.results ?? []);
      setTotalPages(Math.max(1, res.totalPages ?? 1));
      setTotalElements(res.totalElements ?? 0);
    } catch (err: any) {
      if (seq !== requestSeq.current) return;

      const msg =
        err?.response?.data?.statusMessage ??
        err?.response?.data?.message ??
        t("pages.adminUsers.errors.loadFailed");

      setError(msg);
      setUsers([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  // reset page on filter/sort/size changes
  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, size]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, page, size]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];

    if (isNonEmpty(qDebounced))
      chips.push({
        key: "q",
        label: `${t("pages.adminUsers.chips.q")}: ${qDebounced.trim()}`,
        onDelete: () => setQ(""),
      });

    if (roles.length)
      chips.push({
        key: "roles",
        label: `${t("pages.adminUsers.chips.roles")}: ${roles.join(", ")}`,
        onDelete: () => setRoles([]),
      });

    if (typeof active === "boolean")
      chips.push({
        key: "active",
        label: `${t("pages.adminUsers.chips.active")}: ${String(active)}`,
        onDelete: () => setActive(null),
      });

    if (isNonEmpty(minBalance))
      chips.push({
        key: "minBalance",
        label: `${t("pages.adminUsers.chips.minBalance")}: ${minBalance}`,
        onDelete: () => setMinBalance(""),
      });

    if (isNonEmpty(maxBalance))
      chips.push({
        key: "maxBalance",
        label: `${t("pages.adminUsers.chips.maxBalance")}: ${maxBalance}`,
        onDelete: () => setMaxBalance(""),
      });

    if (isNonEmpty(createdFrom))
      chips.push({
        key: "createdFrom",
        label: `${t("pages.adminUsers.chips.createdFrom")}: ${createdFrom}`,
        onDelete: () => setCreatedFrom(""),
      });

    if (isNonEmpty(createdTo))
      chips.push({
        key: "createdTo",
        label: `${t("pages.adminUsers.chips.createdTo")}: ${createdTo}`,
        onDelete: () => setCreatedTo(""),
      });

    return chips;
  }, [qDebounced, roles, active, minBalance, maxBalance, createdFrom, createdTo, t]);

  const clearAllFilters = () => {
    setQ("");
    setRoles([]);
    setActive(null);
    setMinBalance("");
    setMaxBalance("");
    setCreatedFrom("");
    setCreatedTo("");
  };

  // ===== Actions =====
  const openRoleDialog = (e: React.MouseEvent, u: UserResponseDto) => {
    e.stopPropagation();
    setRoleTarget(u);

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
      await patchUserAdmin(roleTarget.id, { role: roleValue });
      await load();
      closeRoleDialog();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminUsers.errors.updateRoleFailed");
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, u: UserResponseDto) => {
    e.stopPropagation();

    const ok = confirm(
      t("pages.adminUsers.confirms.delete", { email: u.email })
    );
    if (!ok) return;

    setBusyId(u.id);
    setError(null);
    try {
      await deleteUserAdmin(u.id);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminUsers.errors.deleteFailed");
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleBlock = async (e: React.MouseEvent, u: UserResponseDto) => {
    e.stopPropagation();

    const cur = getActive(u);
    const nextActive = cur === false ? true : false;

    const actionKey = nextActive ? "unblock" : "block";
    const ok = confirm(
      t(`pages.adminUsers.confirms.${actionKey}`, { email: u.email })
    );
    if (!ok) return;

    setBusyId(u.id);
    setError(null);
    try {
      await patchUserAdmin(u.id, { active: nextActive });
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminUsers.errors.updateStatusFailed");
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
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Header */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
            {t("pages.adminUsers.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("pages.adminUsers.meta.found", { total: totalElements })} •{" "}
            {t("pages.adminUsers.meta.page", { page: page + 1, totalPages })}
          </Typography>
        </Box>

        <TextField
          fullWidth
          size="small"
          label={t("pages.adminUsers.search.label")}
          placeholder={t("pages.adminUsers.search.placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Stack>

      {/* Toolbar */}
      <Card sx={{ borderRadius: 3, p: 2 }}>
        <Stack spacing={1.6}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="sort-label">{t("pages.adminUsers.sort.label")}</InputLabel>
              <Select
                labelId="sort-label"
                label={t("pages.adminUsers.sort.label")}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
              >
                <MenuItem value="CREATED_DESC">{t("pages.adminUsers.sort.createdDesc")}</MenuItem>
                <MenuItem value="CREATED_ASC">{t("pages.adminUsers.sort.createdAsc")}</MenuItem>
                <MenuItem value="EMAIL_ASC">{t("pages.adminUsers.sort.emailAsc")}</MenuItem>
                <MenuItem value="EMAIL_DESC">{t("pages.adminUsers.sort.emailDesc")}</MenuItem>
                <MenuItem value="BALANCE_ASC">{t("pages.adminUsers.sort.balanceAsc")}</MenuItem>
                <MenuItem value="BALANCE_DESC">{t("pages.adminUsers.sort.balanceDesc")}</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="size-label">{t("pages.adminUsers.size.label")}</InputLabel>
              <Select
                labelId="size-label"
                label={t("pages.adminUsers.size.label")}
                value={String(size)}
                onChange={(e) => setSize(Number(e.target.value))}
              >
                <MenuItem value="5">5</MenuItem>
                <MenuItem value="10">10</MenuItem>
                <MenuItem value="20">20</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ flexGrow: 1 }} />

            <Stack direction="row" spacing={1}>
              <Button
                variant={showFilters ? "contained" : "outlined"}
                startIcon={<FilterAltOutlinedIcon />}
                onClick={() => setShowFilters((v) => !v)}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                {t("pages.adminUsers.actions.filters")}
              </Button>

              <Button
                variant="text"
                startIcon={<ClearOutlinedIcon />}
                onClick={clearAllFilters}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                {t("pages.adminUsers.actions.reset")}
              </Button>
            </Stack>
          </Stack>

          <Collapse in={showFilters}>
            <Divider sx={{ my: 1 }} />

            <Stack spacing={1.4}>
              <FormControl size="small" fullWidth>
                <InputLabel id="roles-label">{t("pages.adminUsers.filters.roles")}</InputLabel>
                <Select
                  labelId="roles-label"
                  label={t("pages.adminUsers.filters.roles")}
                  multiple
                  value={roles}
                  onChange={(e) => setRoles(e.target.value as string[])}
                >
                  {USER_ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={minBalance}
                  onChange={(e) => setMinBalance(e.target.value)}
                  label={t("pages.adminUsers.filters.minBalance")}
                  size="small"
                  fullWidth
                />
                <TextField
                  value={maxBalance}
                  onChange={(e) => setMaxBalance(e.target.value)}
                  label={t("pages.adminUsers.filters.maxBalance")}
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  label={t("pages.adminUsers.filters.createdFrom")}
                  placeholder={t("pages.adminUsers.filters.createdIsoPlaceholder")}
                  size="small"
                  fullWidth
                />
                <TextField
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  label={t("pages.adminUsers.filters.createdTo")}
                  placeholder={t("pages.adminUsers.filters.createdIsoPlaceholder")}
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch checked={active === true} onChange={(e) => setActive(e.target.checked ? true : null)} />
                  }
                  label={t("pages.adminUsers.filters.activeOnly")}
                />
                <FormControlLabel
                  control={
                    <Switch checked={active === false} onChange={(e) => setActive(e.target.checked ? false : null)} />
                  }
                  label={t("pages.adminUsers.filters.inactiveOnly")}
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: "auto" } }}>
                  {t("pages.adminUsers.filters.tip")}
                </Typography>
              </Stack>
            </Stack>
          </Collapse>

          {activeFilterChips.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {activeFilterChips.map((c) => (
                  <Chip key={c.key} label={c.label} onDelete={c.onDelete} size="small" />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </Card>

      {/* List */}
      {users.length === 0 ? (
        <Alert severity="info">{t("pages.adminUsers.empty")}</Alert>
      ) : (
        <Stack spacing={2}>
          {users.map((u) => {
            const rs = pickRoles(u);
            const st = statusLabel(u);
            const activeValue = getActive(u);
            const busy = busyId === u.id;

            return (
              <Card
                key={u.id}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  transition: "transform 120ms ease, box-shadow 120ms ease",
                  "&:hover": { transform: "translateY(-1px)", boxShadow: "0 10px 26px rgba(0,0,0,0.08)" },
                }}
              >
                <CardActionArea onClick={() => navigate(`/admin/users/${u.id}`)}>
                  <CardContent sx={{ p: 2.5 }}>
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
                            <Chip
                              label={`${t("pages.adminUsers.labels.balance")}: ${formatMoney(u.balance)}`}
                              variant="outlined"
                              size="small"
                            />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {t("pages.adminUsers.labels.id")}: {u.id}
                          </Typography>
                        </Stack>
                      </Box>

                      {!isManager && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flexShrink: 0 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              openRoleDialog(e, u);
                            }}
                            sx={{ borderRadius: 2 }}
                          >
                            {t("pages.adminUsers.actions.changeRole")}
                          </Button>

                          <Button
                            variant="outlined"
                            size="small"
                            disabled={busy}
                            onClick={(e) => handleToggleBlock(e, u)}
                            sx={{ borderRadius: 2 }}
                          >
                            {activeValue === false
                              ? t("pages.adminUsers.actions.unblock")
                              : t("pages.adminUsers.actions.block")}
                          </Button>

                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={busy}
                            onClick={(e) => handleDelete(e, u)}
                            sx={{ borderRadius: 2 }}
                          >
                            {t("pages.adminUsers.actions.delete")}
                          </Button>
                        </Stack>
                      )}
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                        {rs.length > 0 ? (
                          rs.map((r) => <Chip key={r} size="small" label={r} />)
                        ) : (
                          <Chip size="small" label="ROLE: —" variant="outlined" />
                        )}
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {t("pages.adminUsers.hint.openDetails")}
                      </Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ py: 1 }}>
          <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} shape="rounded" />
        </Stack>
      )}

      {/* Role dialog */}
      {!isManager && (
        <Dialog open={roleDialogOpen} onClose={closeRoleDialog} fullWidth maxWidth="xs">
          <DialogTitle>{t("pages.adminUsers.roleDialog.title")}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t("pages.adminUsers.roleDialog.user")}: {roleTarget?.email ?? "—"}
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
            <Button onClick={closeRoleDialog}>{t("pages.adminUsers.roleDialog.cancel")}</Button>
            <Button variant="contained" onClick={saveRole} disabled={!roleTarget || busyId === roleTarget?.id}>
              {t("pages.adminUsers.roleDialog.save")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
}
