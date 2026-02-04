import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";

import * as usersApi from "../../api/users.api";
import type { UserResponseDto } from "../../api/users.api";

import * as ordersApi from "../../api/orders.api";
import type { OrderResponseDto } from "../../api/orders.api";

import * as paymentsApi from "../../api/payments.api";
import type { PaymentResponseDto } from "../../api/payments.api";

import * as reviewsApi from "../../api/reviews.api";
import type { ReviewResponseDto } from "../../api/reviews.api";

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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatMoney(v: any) {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
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

function pickRole(u: UserResponseDto): string {
  const direct = u.role != null ? String(u.role) : "";
  if (direct) return direct;
  if (Array.isArray(u.roles) && u.roles.length > 0) return String(u.roles[0]);
  return "—";
}

function FieldRow({ label, value }: { label: string; value: any }) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <Stack direction="row" spacing={1} sx={{ py: 0.4 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 120, flexShrink: 0 }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {text}
      </Typography>
    </Stack>
  );
}

async function patchUserAdmin(userId: string, dto: UserAccessUpdateDto): Promise<UserResponseDto> {
  const { data } = await http.patch<ApiSuccessResponse<UserResponseDto>>(`/api/users/${userId}`, dto);
  return data.results;
}

async function deleteUserAdmin(userId: string): Promise<void> {
  await http.delete<ApiSuccessResponse<void>>(`/api/users/${userId}`);
}

// ---- UI helpers for orders/payments/reviews ----

function orderChipColor(status?: string | null): "success" | "warning" | "default" {
  const s = (status ?? "").toUpperCase();
  if (!s) return "default";
  if (s === "PAID") return "success";
  if (s === "CANCELED" || s === "CANCELLED") return "warning";
  return "default";
}

function paymentChipColor(status?: string | null): "success" | "warning" | "default" {
  const s = (status ?? "").toUpperCase();
  if (!s) return "default";
  if (s === "SUCCESS") return "success";
  return "warning";
}

// ---- auth helpers (MANAGER should not see admin actions) ----
function normalizeRole(r: string) {
  return (r ?? "").trim().toUpperCase();
}
function hasRole(userRoles: string[], role: string) {
  const target = normalizeRole(role);
  return (userRoles ?? []).some((r) => {
    const rr = normalizeRole(r);
    return rr === target || rr === `ROLE_${target}` || rr.replace(/^ROLE_/, "") === target;
  });
}

export default function AdminUserDetailsPage() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const auth = useAuth();
  const isManager = useMemo(() => hasRole(auth.roles ?? [], "MANAGER"), [auth.roles]);

  const [user, setUser] = useState<UserResponseDto | null>(null);

  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [reviews, setReviews] = useState<ReviewResponseDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  // role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleValue, setRoleValue] = useState<string>("USER");

  const userTitle = useMemo(() => {
    if (!user) return "User details";
    const full = `${user.name ?? ""} ${user.surname ?? ""}`.trim();
    return full || user.email;
  }, [user]);

  const loadAll = async () => {
    if (!userId) return;

    setError(null);
    setLoading(true);
    try {
      const u = await usersApi.getUserById(userId);
      setUser(u);

      const [o, p, r] = await Promise.all([
        ordersApi.getOrdersByUser(userId),
        paymentsApi.getPaymentsByUserAdmin(userId),
        reviewsApi.getReviewsByUser(userId),
      ]);

      setOrders(o);
      setPayments(p);
      setReviews(r);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to load user details";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const openRoleDialog = () => {
    if (!user) return;
    setRoleValue(pickRole(user) === "—" ? "USER" : pickRole(user));
    setRoleDialogOpen(true);
  };

  const closeRoleDialog = () => setRoleDialogOpen(false);

  const handleSaveRole = async () => {
    if (!user || !userId) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await patchUserAdmin(userId, { role: roleValue });
      setUser(updated);
      closeRoleDialog();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to update role";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!user || !userId) return;

    const currentActive = getActive(user);
    const nextActive = currentActive === false ? true : false;

    const label = nextActive ? "Unblock" : "Block";
    if (!confirm(`${label} this user?`)) return;

    setBusy(true);
    setError(null);
    try {
      const updated = await patchUserAdmin(userId, { active: nextActive });
      setUser(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to update user status";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !user) return;
    if (!confirm(`Delete user ${user.email}? This action is irreversible.`)) return;

    setBusy(true);
    setError(null);
    try {
      await deleteUserAdmin(userId);
      navigate("/admin/users");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to delete user";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) return <Alert severity="warning">User not found.</Alert>;

  const st = statusLabel(user);
  const active = getActive(user);
  const role = pickRole(user);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, pb: 3 }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ mb: 2, pt: 2 }}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1 }}>
          <Button variant="outlined" onClick={() => navigate("/admin/users")} sx={{ borderRadius: 2 }}>
            Back
          </Button>
          <Box>
            <Typography variant="h5" sx={{ lineHeight: 1.15 }}>
              {userTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Admin user details • Related data below (orders/payments/reviews)
            </Typography>
          </Box>
        </Stack>

        {/* ✅ hide actions for MANAGER */}
        {!isManager && (
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
            <Button variant="outlined" disabled={busy} onClick={openRoleDialog} sx={{ borderRadius: 2 }}>
              Change role
            </Button>

            <Button variant="outlined" disabled={busy} onClick={handleToggleBlock} sx={{ borderRadius: 2 }}>
              {active === false ? "Unblock" : "Block"}
            </Button>

            <Button variant="outlined" color="error" disabled={busy} onClick={handleDelete} sx={{ borderRadius: 2 }}>
              Delete
            </Button>
          </Stack>
        )}
      </Stack>

      {/* USER INFO - bigger, clean rows */}
      <Card variant="outlined" sx={{ mb: 2.5, borderRadius: 3, overflow: "hidden" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box sx={{ minWidth: 320 }}>
              <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                User info
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Main profile + access info
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <Chip label={st} color={statusColor(st)} variant="outlined" />
              <Chip label={`Role: ${role}`} variant="outlined" />
              <Chip label={`Balance: ${formatMoney(user.balance)}`} variant="outlined" />
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <FieldRow label="Name" value={user.name ?? "—"} />
              <FieldRow label="Surname" value={user.surname ?? "—"} />
              <FieldRow label="Email" value={user.email} />
              <FieldRow label="Phone" value={user.phoneNumber ?? "—"} />
              <FieldRow label="Role" value={role} />
              <FieldRow label="Active" value={st} />
            </Box>

            <Box sx={{ flex: 1 }}>
              <FieldRow label="Balance" value={formatMoney(user.balance)} />
              <FieldRow label="User ID" value={user.id} />
              <FieldRow label="Created" value={formatDate(user.createdAt ?? null)} />
              <FieldRow label="Updated" value={formatDate(user.updatedAt ?? null)} />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* ORDERS */}
      <Card variant="outlined" sx={{ mb: 2.5, borderRadius: 3, overflow: "hidden" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={1}>
            <Typography variant="h6">Orders</Typography>
            <Chip label={`Total: ${orders.length}`} variant="outlined" />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {orders.length === 0 ? (
            <Alert severity="info">No orders for this user.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {orders.map((o) => (
                <Card key={o.id} variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
                  <CardActionArea onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    <CardContent sx={{ p: 2.25 }}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                      >
                        <Box sx={{ minWidth: 260 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                            {o.orderNumber}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Tour ID: {o.tourId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created: {formatDate(o.createdAt)} • Updated: {formatDate(o.updatedAt)}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                          <Chip label={`Order: ${o.status ?? "—"}`} color={orderChipColor(o.status)} variant="outlined" />
                          <Chip label={`Total: ${formatMoney(o.totalAmount)}`} variant="outlined" />
                          <Chip
                            label={
                              o.payment
                                ? `Payment: ${o.payment.status}${o.payment.paymentMethod ? ` (${o.payment.paymentMethod})` : ""}`
                                : "Payment: —"
                            }
                            color={o.payment ? paymentChipColor(o.payment.status) : "default"}
                            variant="outlined"
                          />
                          <Chip
                            label={o.review?.rating != null ? `Review: ${o.review.rating}/5` : "Review: —"}
                            color={o.review?.rating != null ? "info" : "default"}
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* PAYMENTS */}
      <Card variant="outlined" sx={{ mb: 2.5, borderRadius: 3, overflow: "hidden" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={1}>
            <Typography variant="h6">Payments</Typography>
            <Chip label={`Total: ${payments.length}`} variant="outlined" />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {payments.length === 0 ? (
            <Alert severity="info">No payments for this user.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {payments.map((p) => (
                <Card key={p.id} variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                    >
                      <Box sx={{ minWidth: 260 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                          Payment #{p.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Order ID: {p.orderId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Paid at: {p.paidAt ? formatDate(p.paidAt) : "—"}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                        <Chip label={`Status: ${p.status ?? "—"}`} color={paymentChipColor(p.status)} variant="outlined" />
                        <Chip label={`Method: ${p.paymentMethod ?? "—"}`} variant="outlined" />
                        <Chip label={`Amount: ${formatMoney(p.amount)}`} variant="outlined" />

                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(`/admin/orders/${p.orderId}`)}
                          sx={{ borderRadius: 2 }}
                        >
                          Open order
                        </Button>
                      </Stack>
                    </Stack>

                    {p.failureReason ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Failure: {p.failureReason}
                      </Typography>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* REVIEWS */}
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={1}>
            <Typography variant="h6">Reviews</Typography>
            <Chip label={`Total: ${reviews.length}`} variant="outlined" />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {reviews.length === 0 ? (
            <Alert severity="info">No reviews for this user.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {reviews.map((r) => (
                <Card key={r.id} variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                    >
                      <Box sx={{ minWidth: 260 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                          Review #{r.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Order ID: {r.orderId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {formatDate(r.createdAt)} • Updated: {formatDate(r.updatedAt)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                        <Chip label={`Rating: ${r.rating}/5`} color="info" variant="outlined" />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(`/admin/orders/${r.orderId}`)}
                          sx={{ borderRadius: 2 }}
                        >
                          Open order
                        </Button>
                      </Stack>
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Comment: {r.comment ? r.comment : "—"}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* ✅ Role dialog hidden for MANAGER */}
      {!isManager && (
        <Dialog open={roleDialogOpen} onClose={closeRoleDialog} fullWidth maxWidth="xs">
          <DialogTitle>Change role</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              User: {user.email}
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
            <Button variant="contained" onClick={handleSaveRole} disabled={busy}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
