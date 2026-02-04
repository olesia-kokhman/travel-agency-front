// src/pages/admin/AdminOrderDetailsPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import * as ordersApi from "../../api/orders.api";
import type { AdminOrderResponseDto } from "../../api/orders.api";
import { useAuth } from "../../auth/AuthContext";

function formatMoney(v: any) {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function Row({ label, value }: { label: string; value: any }) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <Stack direction="row" spacing={1} sx={{ py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
        {label}
      </Typography>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

function isCanceled(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  return s === "CANCELED" || s === "CANCELLED";
}

// ---- auth helpers ----
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

export default function AdminOrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const auth = useAuth();
  const isManager = useMemo(() => hasRole(auth.roles ?? [], "MANAGER"), [auth.roles]);

  const [order, setOrder] = useState<AdminOrderResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!orderId) return;
    setError(null);
    setLoading(true);
    try {
      const one = await ordersApi.getOrderByIdAdmin(orderId);
      setOrder(one);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to load order details";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const title = useMemo(() => {
    if (!order) return "Order";
    return `Order ${order.orderNumber || order.id}`;
  }, [order]);

  const handleCancel = async () => {
    if (!orderId) return;
    if (!confirm("Cancel this order?")) return;

    setBusy(true);
    setError(null);
    try {
      await ordersApi.updateOrderStatusAdmin(orderId, { status: "CANCELED" });
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to cancel order";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!orderId) return;
    if (!confirm("Delete this order permanently?")) return;

    setBusy(true);
    setError(null);
    try {
      await ordersApi.deleteOrderAdmin(orderId);
      navigate("/admin/orders");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to delete order";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 2, display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/admin/orders")}>
          Back to orders
        </Button>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Order not found
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/admin/orders")}>
          Back to orders
        </Button>
      </Box>
    );
  }

  const user = order.user;
  const payment = order.payment;
  const review = order.review;

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">{title}</Typography>

        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
          <Button variant="outlined" onClick={() => navigate("/admin/orders")} sx={{ borderRadius: 2 }}>
            Back
          </Button>

          <Button
            variant="outlined"
            disabled={busy || isCanceled(order.status)}
            onClick={handleCancel}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>

          {/* ✅ MANAGER cannot delete */}
          {!isManager && (
            <Button
              variant="outlined"
              color="error"
              disabled={busy}
              onClick={handleDelete}
              sx={{ borderRadius: 2 }}
            >
              Delete
            </Button>
          )}
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {/* ORDER */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography variant="h6">Order</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`Status: ${order.status ?? "—"}`} />
                <Chip label={`Total: ${formatMoney(order.totalAmount)}`} variant="outlined" />
              </Stack>
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Row label="Order ID" value={order.id} />
            <Row label="Order number" value={order.orderNumber} />
            <Row label="Created" value={formatDate(order.createdAt)} />
            <Row label="Updated" value={formatDate(order.updatedAt)} />
          </CardContent>
        </Card>

        {/* USER */}
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Typography variant="h6">User</Typography>

              {user?.id ? (
                <Button component={RouterLink} to={`/admin/users/${user.id}`} variant="contained" size="small">
                  Open user
                </Button>
              ) : null}
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Row label="User ID" value={user?.id} />

            {/* Email як клікабельне посилання на user details */}
            <Stack direction="row" spacing={1} sx={{ py: 0.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                Email
              </Typography>
              {user?.id ? (
                <Button
                  component={RouterLink}
                  to={`/admin/users/${user.id}`}
                  variant="text"
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ p: 0, minWidth: 0, textTransform: "none" }}
                >
                  {user?.email ?? "—"}
                </Button>
              ) : (
                <Typography variant="body2">{user?.email ?? "—"}</Typography>
              )}
            </Stack>

            <Row label="Name" value={`${user?.name ?? ""} ${user?.surname ?? ""}`.trim()} />
            <Row label="Phone" value={user?.phoneNumber} />
            <Row label="Balance" value={user?.balance ?? "—"} />
            <Row label="Role" value={user?.role ?? (Array.isArray(user?.roles) ? user?.roles.join(", ") : "—")} />
            <Row label="Active" value={user?.active ?? user?.enabled ?? "—"} />
          </CardContent>
        </Card>

        {/* TOUR (link only) */}
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Typography variant="h6">Tour</Typography>

              <Button component={RouterLink} to={`/tours/${order.tourId}`} variant="contained" size="small">
                Open tour
              </Button>
            </Stack>

            <Divider sx={{ my: 1.5 }} />
            <Row label="Tour ID" value={order.tourId} />
            <Typography variant="body2" color="text.secondary">
              (Tour details are shown on the tour page)
            </Typography>
          </CardContent>
        </Card>

        {/* PAYMENT */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography variant="h6">Payment</Typography>
              <Chip label={`Status: ${payment?.status ?? "—"}`} variant="outlined" />
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            {payment ? (
              <>
                <Row label="Payment ID" value={payment.id} />
                <Row label="Method" value={payment.paymentMethod} />
                <Row label="Amount" value={formatMoney(payment.amount)} />
                <Row label="Paid at" value={formatDate(payment.paidAt)} />
                <Row label="Failure reason" value={payment.failureReason} />
                <Row label="Created" value={formatDate(payment.createdAt)} />
                <Row label="Updated" value={formatDate(payment.updatedAt)} />
              </>
            ) : (
              <Alert severity="info">No payment for this order</Alert>
            )}
          </CardContent>
        </Card>

        {/* REVIEW */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Review</Typography>
            <Divider sx={{ my: 1.5 }} />

            {review ? (
              <>
                <Row label="Review ID" value={review.id} />
                <Row label="Rating" value={typeof review.rating === "number" ? `${review.rating}/5` : "—"} />
                <Row label="Comment" value={review.comment} />
                <Row label="Created" value={formatDate(review.createdAt)} />
                <Row label="Updated" value={formatDate(review.updatedAt)} />
              </>
            ) : (
              <Alert severity="info">No review for this order</Alert>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
