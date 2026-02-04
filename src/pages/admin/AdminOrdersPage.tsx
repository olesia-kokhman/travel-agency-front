// src/pages/admin/AdminOrdersPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import * as ordersApi from "../../api/orders.api";
import type { AdminOrderResponseDto } from "../../api/orders.api";
import { useAuth } from "../../auth/AuthContext";

function normalize(v?: string | null) {
  return (v ?? "").toString().trim().toLowerCase();
}

function formatMoney(v: any) {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  // LocalDateTime with micros may fail parsing -> show raw string
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function userLabel(o: AdminOrderResponseDto) {
  const u = o.user;
  const full = `${u?.name ?? ""} ${u?.surname ?? ""}`.trim();
  return u?.email || full || "—";
}

function paymentChipColor(status?: string | null): "success" | "warning" | "default" {
  const s = (status ?? "").toUpperCase();
  if (!s) return "default";
  if (s === "SUCCESS") return "success";
  return "warning";
}

function orderChipColor(status?: string | null): "success" | "warning" | "default" {
  const s = (status ?? "").toUpperCase();
  if (!s) return "default";
  if (s === "PAID") return "success";
  if (s === "CANCELED" || s === "CANCELLED") return "warning";
  return "default";
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

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const isManager = useMemo(() => hasRole(auth.roles ?? [], "MANAGER"), [auth.roles]);

  const [orders, setOrders] = useState<AdminOrderResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await ordersApi.getAllOrdersAdmin();
      setOrders(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to load admin orders";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = normalize(q);
    if (!query) return orders;

    return orders.filter((o) => {
      const orderNumber = normalize(o.orderNumber);
      const status = normalize(o.status);
      const tourId = normalize(o.tourId);

      const u = o.user;
      const email = normalize(u?.email ?? "");
      const name = normalize(`${u?.name ?? ""} ${u?.surname ?? ""}`.trim());

      const paymentStatus = normalize(o.payment?.status ?? "");
      const paymentMethod = normalize(o.payment?.paymentMethod ?? "");

      const reviewComment = normalize(o.review?.comment ?? "");
      const reviewRating = o.review?.rating != null ? String(o.review.rating) : "";

      return (
        orderNumber.includes(query) ||
        status.includes(query) ||
        tourId.includes(query) ||
        email.includes(query) ||
        name.includes(query) ||
        paymentStatus.includes(query) ||
        paymentMethod.includes(query) ||
        reviewComment.includes(query) ||
        reviewRating.includes(query)
      );
    });
  }, [orders, q]);

  const handleOpen = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

  const handleCancel = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (!confirm("Cancel this order?")) return;

    setBusyId(orderId);
    setError(null);
    try {
      await ordersApi.updateOrderStatusAdmin(orderId, { status: "CANCELED" });
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to cancel order";
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this order permanently?")) return;

    setBusyId(orderId);
    setError(null);
    try {
      await ordersApi.deleteOrderAdmin(orderId);
      // без повного reload — одразу прибираємо зі списку
      setOrders((prev) => prev.filter((x) => x.id !== orderId));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to delete order";
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

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

      {/* Header controls */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2 }}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <TextField
          fullWidth
          label="Search (order, user, status, tour, payment, review...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Chip label={`Total: ${orders.length}`} variant="outlined" />
          <Chip label={`Shown: ${filtered.length}`} variant="outlined" />
        </Stack>
      </Stack>

      {filtered.length === 0 ? (
        <Alert severity="info">No orders found</Alert>
      ) : (
        <Stack spacing={2}>
          {filtered.map((o) => {
            const payment = o.payment;
            const review = o.review;
            const busy = busyId === o.id;

            return (
              <Card
                key={o.id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <CardActionArea onClick={() => handleOpen(o.id)}>
                  <CardContent sx={{ p: 2.25 }}>
                    {/* Header */}
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                      spacing={1.25}
                    >
                      <Box sx={{ minWidth: 280 }}>
                        <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                          {o.orderNumber}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          User: {userLabel(o)}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          Created: {formatDate(o.createdAt)} • Updated: {formatDate(o.updatedAt)}
                        </Typography>
                      </Box>

                      {/* Status chips */}
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip label={`Order: ${o.status ?? "—"}`} color={orderChipColor(o.status)} variant="outlined" />
                        <Chip label={`Total: ${formatMoney(o.totalAmount)}`} variant="outlined" />
                        <Chip
                          label={
                            payment
                              ? `Payment: ${payment.status}${payment.paymentMethod ? ` (${payment.paymentMethod})` : ""}`
                              : "Payment: —"
                          }
                          color={payment ? paymentChipColor(payment.status) : "default"}
                          variant="outlined"
                        />
                        <Chip
                          label={review?.rating != null ? `Review: ${review.rating}/5` : "Review: —"}
                          color={review?.rating != null ? "info" : "default"}
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>

                    <Divider sx={{ my: 1.75 }} />

                    {/* Body + actions */}
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      justifyContent="space-between"
                    >
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          Tour ID: {o.tourId}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Paid at: {payment?.paidAt ? formatDate(payment.paidAt) : "—"}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 850 }}>
                          Review: {review?.comment ? review.comment : "—"}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flexShrink: 0 }}>
                        <Button
                          component={RouterLink}
                          to={`/tours/${o.tourId}`}
                          variant="contained"
                          size="small"
                          onClick={(e) => e.stopPropagation()}
                          sx={{ borderRadius: 2 }}
                        >
                          Open tour
                        </Button>

                        {/* ✅ MANAGER can cancel */}
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={busy || isCanceled(o.status)}
                          onClick={(e) => handleCancel(e, o.id)}
                          sx={{ borderRadius: 2 }}
                        >
                          Cancel
                        </Button>

                        {/* ✅ MANAGER cannot delete */}
                        {!isManager && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={busy}
                            onClick={(e) => handleDelete(e, o.id)}
                            sx={{ borderRadius: 2 }}
                          >
                            Delete
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
