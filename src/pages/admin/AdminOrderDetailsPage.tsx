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
import { useTranslation } from "react-i18next";

import * as ordersApi from "../../api/orders.api";
import type { AdminOrderResponseDto } from "../../api/orders.api";
import { useAuth } from "../../auth/AuthContext";

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
  const { t } = useTranslation();
  const NA = t("common.na");

  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const auth = useAuth();
  const isManager = useMemo(() => hasRole(auth.roles ?? [], "MANAGER"), [auth.roles]);

  const [order, setOrder] = useState<AdminOrderResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatMoney = (v: any) => {
    if (v === null || v === undefined) return NA;
    const n = typeof v === "string" ? Number(v) : v;
    if (Number.isFinite(n)) return n.toFixed(2);
    return String(v);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return NA;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const Row = ({ label, value }: { label: string; value: any }) => {
    const text = value === null || value === undefined || value === "" ? NA : String(value);
    return (
      <Stack direction="row" spacing={1} sx={{ py: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
          {label}
        </Typography>
        <Typography variant="body2">{text}</Typography>
      </Stack>
    );
  };

  const load = async () => {
    if (!orderId) return;
    setError(null);
    setLoading(true);
    try {
      const one = await ordersApi.getOrderByIdAdmin(orderId);
      setOrder(one);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminOrderDetails.errors.load");
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
    if (!order) return t("pages.adminOrderDetails.titleFallback");
    const number = order.orderNumber || order.id;
    return t("pages.adminOrderDetails.title", { number });
  }, [order, t]);

  const handleCancel = async () => {
    if (!orderId) return;
    if (!confirm(t("pages.adminOrderDetails.confirm.cancel"))) return;

    setBusy(true);
    setError(null);
    try {
      await ordersApi.updateOrderStatusAdmin(orderId, { status: "CANCELED" });
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminOrderDetails.errors.cancel");
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!orderId) return;
    if (!confirm(t("pages.adminOrderDetails.confirm.delete"))) return;

    setBusy(true);
    setError(null);
    try {
      await ordersApi.deleteOrderAdmin(orderId);
      navigate("/admin/orders");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminOrderDetails.errors.delete");
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 2, display: "flex", justifyContent: "center", py: 6 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress />
          <Typography variant="body2">{t("pages.adminOrderDetails.states.loading")}</Typography>
        </Stack>
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
          {t("pages.adminOrderDetails.actions.backToOrders")}
        </Button>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("pages.adminOrderDetails.states.notFound")}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/admin/orders")}>
          {t("pages.adminOrderDetails.actions.backToOrders")}
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
            {t("pages.adminOrderDetails.actions.back")}
          </Button>

          <Button
            variant="outlined"
            disabled={busy || isCanceled(order.status)}
            onClick={handleCancel}
            sx={{ borderRadius: 2 }}
          >
            {t("pages.adminOrderDetails.actions.cancel")}
          </Button>

          {/* ✅ MANAGER cannot delete */}
          {!isManager && (
            <Button variant="outlined" color="error" disabled={busy} onClick={handleDelete} sx={{ borderRadius: 2 }}>
              {t("pages.adminOrderDetails.actions.delete")}
            </Button>
          )}
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {/* ORDER */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography variant="h6">{t("pages.adminOrderDetails.sections.order")}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={t("pages.adminOrderDetails.chips.status", { value: order.status ?? NA })} />
                <Chip
                  label={t("pages.adminOrderDetails.chips.total", { value: formatMoney(order.totalAmount) })}
                  variant="outlined"
                />
              </Stack>
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Row label={t("pages.adminOrderDetails.fields.orderId")} value={order.id} />
            <Row label={t("pages.adminOrderDetails.fields.orderNumber")} value={order.orderNumber} />
            <Row label={t("pages.adminOrderDetails.fields.created")} value={formatDate(order.createdAt)} />
            <Row label={t("pages.adminOrderDetails.fields.updated")} value={formatDate(order.updatedAt)} />
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
              <Typography variant="h6">{t("pages.adminOrderDetails.sections.user")}</Typography>

              {user?.id ? (
                <Button component={RouterLink} to={`/admin/users/${user.id}`} variant="contained" size="small">
                  {t("pages.adminOrderDetails.actions.openUser")}
                </Button>
              ) : null}
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Row label={t("pages.adminOrderDetails.fields.userId")} value={user?.id} />

            {/* Email clickable */}
            <Stack direction="row" spacing={1} sx={{ py: 0.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                {t("pages.adminOrderDetails.fields.email")}
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
                  {user?.email ?? NA}
                </Button>
              ) : (
                <Typography variant="body2">{user?.email ?? NA}</Typography>
              )}
            </Stack>

            <Row
              label={t("pages.adminOrderDetails.fields.name")}
              value={`${user?.name ?? ""} ${user?.surname ?? ""}`.trim() || NA}
            />
            <Row label={t("pages.adminOrderDetails.fields.phone")} value={user?.phoneNumber ?? NA} />
            <Row label={t("pages.adminOrderDetails.fields.balance")} value={user?.balance ?? NA} />
            <Row
              label={t("pages.adminOrderDetails.fields.role")}
              value={user?.role ?? (Array.isArray(user?.roles) ? user?.roles.join(", ") : NA)}
            />
            <Row label={t("pages.adminOrderDetails.fields.active")} value={user?.active ?? user?.enabled ?? NA} />
          </CardContent>
        </Card>

        {/* TOUR */}
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Typography variant="h6">{t("pages.adminOrderDetails.sections.tour")}</Typography>

              <Button component={RouterLink} to={`/tours/${order.tourId}`} variant="contained" size="small">
                {t("pages.adminOrderDetails.actions.openTour")}
              </Button>
            </Stack>

            <Divider sx={{ my: 1.5 }} />
            <Row label={t("pages.adminOrderDetails.fields.tourId")} value={order.tourId} />
            <Typography variant="body2" color="text.secondary">
              {t("pages.adminOrderDetails.fields.tourHint")}
            </Typography>
          </CardContent>
        </Card>

        {/* PAYMENT */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography variant="h6">{t("pages.adminOrderDetails.sections.payment")}</Typography>
              <Chip label={t("pages.adminOrderDetails.chips.status", { value: payment?.status ?? NA })} variant="outlined" />
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            {payment ? (
              <>
                <Row label={t("pages.adminOrderDetails.fields.paymentId")} value={payment.id} />
                <Row label={t("pages.adminOrderDetails.fields.method")} value={payment.paymentMethod} />
                <Row label={t("pages.adminOrderDetails.fields.amount")} value={formatMoney(payment.amount)} />
                <Row label={t("pages.adminOrderDetails.fields.paidAt")} value={formatDate(payment.paidAt)} />
                <Row label={t("pages.adminOrderDetails.fields.failureReason")} value={payment.failureReason} />
                <Row label={t("pages.adminOrderDetails.fields.created")} value={formatDate(payment.createdAt)} />
                <Row label={t("pages.adminOrderDetails.fields.updated")} value={formatDate(payment.updatedAt)} />
              </>
            ) : (
              <Alert severity="info">{t("pages.adminOrderDetails.info.noPayment")}</Alert>
            )}
          </CardContent>
        </Card>

        {/* REVIEW */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">{t("pages.adminOrderDetails.sections.review")}</Typography>
            <Divider sx={{ my: 1.5 }} />

            {review ? (
              <>
                <Row label={t("pages.adminOrderDetails.fields.reviewId")} value={review.id} />
                <Row
                  label={t("pages.adminOrderDetails.fields.rating")}
                  value={typeof review.rating === "number" ? `${review.rating}/5` : NA}
                />
                <Row label={t("pages.adminOrderDetails.fields.comment")} value={review.comment} />
                <Row label={t("pages.adminOrderDetails.fields.created")} value={formatDate(review.createdAt)} />
                <Row label={t("pages.adminOrderDetails.fields.updated")} value={formatDate(review.updatedAt)} />
              </>
            ) : (
              <Alert severity="info">{t("pages.adminOrderDetails.info.noReview")}</Alert>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
