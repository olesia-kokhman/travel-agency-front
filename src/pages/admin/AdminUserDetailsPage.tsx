// src/pages/admin/AdminUserDetailsPage.tsx
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

import * as usersApi from "../../api/users.api";
import * as ordersApi from "../../api/orders.api";
import * as reviewsApi from "../../api/reviews.api";
import * as paymentsApi from "../../api/payments.api";

import type { UserResponseDto } from "../../api/users.api";
import type { OrderResponseDto } from "../../api/orders.api";
import type { ReviewResponseDto } from "../../api/reviews.api";
import type { PaymentResponseDto } from "../../api/payments.api";

function formatMoney(v: any, na: string) {
  if (v === null || v === undefined || v === "") return na;
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

function formatDate(value: string | null | undefined, na: string) {
  if (!value) return na;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function Row({ label, value, na }: { label: string; value: any; na: string }) {
  const text = value === null || value === undefined || value === "" ? na : String(value);
  return (
    <Stack direction="row" spacing={1} sx={{ py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
        {label}
      </Typography>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

export default function AdminUserDetailsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const na = t("common.na");

  const [user, setUser] = useState<UserResponseDto | null>(null);

  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewResponseDto[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [payments, setPayments] = useState<PaymentResponseDto[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!userId) return;

    // ---- USER (blocking)
    setError(null);
    setLoading(true);

    try {
      const u = await usersApi.getUserById(userId);
      setUser(u);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminUserDetails.errors.loadUser");
      setError(msg);
      setUser(null);
    } finally {
      setLoading(false);
    }

    // ---- ORDERS
    setOrdersError(null);
    setOrdersLoading(true);
    try {
      const list = await ordersApi.getOrdersByUser(userId);
      setOrders(list ?? []);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminUserDetails.errors.loadOrders");
      setOrdersError(msg);
    } finally {
      setOrdersLoading(false);
    }

    // ---- REVIEWS
    setReviewsError(null);
    setReviewsLoading(true);
    try {
      const list = await reviewsApi.getReviewsByUser(userId);
      setReviews(list ?? []);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminUserDetails.errors.loadReviews");
      setReviewsError(msg);
    } finally {
      setReviewsLoading(false);
    }

    // ---- PAYMENTS
    setPaymentsError(null);
    setPaymentsLoading(true);
    try {
      const list = await paymentsApi.getPaymentsByUser(userId);
      setPayments(list ?? []);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminUserDetails.errors.loadPayments");
      setPaymentsError(msg);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const title = useMemo(() => {
    if (!user) return t("pages.adminUserDetails.titleFallback");
    const name = `${user.name ?? ""} ${user.surname ?? ""}`.trim();
    if (name) return t("pages.adminUserDetails.titleWithName", { name });
    return t("pages.adminUserDetails.titleWithId", { id: user.id });
  }, [user, t]);

  const roleText = useMemo(() => {
    if (!user) return na;
    if (user.role) return String(user.role);
    if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles.join(", ");
    return na;
  }, [user, na]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 2, display: "flex", justifyContent: "center", py: 6 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress />
          <Typography variant="body2">{t("pages.adminUserDetails.loading.page")}</Typography>
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
        <Button variant="outlined" onClick={() => navigate("/admin/users")}>
          {t("common.back")}
        </Button>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("pages.adminUserDetails.states.notFound")}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/admin/users")}>
          {t("common.back")}
        </Button>
      </Box>
    );
  }

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
          <Button variant="outlined" onClick={() => navigate("/admin/users")} sx={{ borderRadius: 2 }}>
            {t("common.back")}
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {/* USER */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography variant="h6">{t("pages.adminUserDetails.sections.user")}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={t("pages.adminUserDetails.chips.role", { role: roleText })} />
                <Chip
                  label={t("pages.adminUserDetails.chips.active", {
                    value: String(user.active ?? user.enabled ?? na),
                  })}
                  variant="outlined"
                />
              </Stack>
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Row label={t("pages.adminUserDetails.fields.userId")} value={user.id} na={na} />
            <Row label={t("pages.adminUserDetails.fields.email")} value={user.email ?? na} na={na} />
            <Row
              label={t("pages.adminUserDetails.fields.name")}
              value={`${user.name ?? ""} ${user.surname ?? ""}`.trim() || na}
              na={na}
            />
            <Row label={t("pages.adminUserDetails.fields.phone")} value={user.phoneNumber ?? na} na={na} />
            <Row label={t("pages.adminUserDetails.fields.balance")} value={formatMoney(user.balance, na)} na={na} />
            <Row label={t("pages.adminUserDetails.fields.created")} value={formatDate(user.createdAt, na)} na={na} />
            <Row label={t("pages.adminUserDetails.fields.updated")} value={formatDate(user.updatedAt, na)} na={na} />
          </CardContent>
        </Card>

        {/* ORDERS */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography variant="h6">{t("pages.adminUserDetails.sections.orders")}</Typography>
              <Chip label={t("pages.adminUserDetails.chips.count", { count: orders.length })} variant="outlined" />
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            {ordersLoading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2">{t("pages.adminUserDetails.loading.orders")}</Typography>
              </Stack>
            )}

            {ordersError && <Alert severity="error">{ordersError}</Alert>}

            {!ordersLoading && !ordersError && orders.length === 0 && (
              <Alert severity="info">{t("pages.adminUserDetails.orders.empty")}</Alert>
            )}

            {!ordersLoading && !ordersError && orders.length > 0 && (
              <Stack spacing={1}>
                {orders.map((o) => (
                  <Box
                    key={o.id}
                    sx={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 2,
                      p: 1.2,
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Stack spacing={0.3}>
                        <Typography variant="body2">
                          <b>{o.orderNumber ?? o.id}</b>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t("pages.adminUserDetails.orders.meta", {
                            status: o.status ?? na,
                            total: formatMoney(o.totalAmount, na),
                            created: formatDate(o.createdAt, na),
                          })}
                        </Typography>
                      </Stack>

                      <Button
                        component={RouterLink}
                        to={`/admin/orders/${o.id}`}
                        variant="contained"
                        size="small"
                        sx={{ borderRadius: 2 }}
                      >
                        {t("pages.adminUserDetails.orders.openOrder")}
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* PAYMENTS */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography variant="h6">{t("pages.adminUserDetails.sections.payments")}</Typography>
              <Chip label={t("pages.adminUserDetails.chips.count", { count: payments.length })} variant="outlined" />
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            {paymentsLoading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2">{t("pages.adminUserDetails.loading.payments")}</Typography>
              </Stack>
            )}

            {paymentsError && <Alert severity="error">{paymentsError}</Alert>}

            {!paymentsLoading && !paymentsError && payments.length === 0 && (
              <Alert severity="info">{t("pages.adminUserDetails.payments.empty")}</Alert>
            )}

            {!paymentsLoading && !paymentsError && payments.length > 0 && (
              <Stack spacing={1}>
                {payments.map((p) => (
                  <Box
                    key={p.id}
                    sx={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 2,
                      p: 1.2,
                    }}
                  >
                    <Stack spacing={0.4}>
                      <Typography variant="body2">
                        <b>{t("pages.adminUserDetails.payments.paymentTitle", { id: p.id })}</b>
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        {t("pages.adminUserDetails.payments.meta", {
                          status: p.status ?? na,
                          method: p.paymentMethod ?? na,
                          amount: formatMoney(p.amount, na),
                          paid: formatDate(p.paidAt, na),
                        })}
                      </Typography>

                      {p.failureReason && (
                        <Typography variant="caption" color="error">
                          {t("pages.adminUserDetails.payments.failure", { reason: p.failureReason })}
                        </Typography>
                      )}

                      {p.orderId && (
                        <Button
                          component={RouterLink}
                          to={`/admin/orders/${p.orderId}`}
                          variant="text"
                          size="small"
                          sx={{ width: "fit-content", p: 0, textTransform: "none" }}
                        >
                          {t("pages.adminUserDetails.payments.openRelatedOrder")}
                        </Button>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* REVIEWS */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Typography variant="h6">{t("pages.adminUserDetails.sections.reviews")}</Typography>
              <Chip label={t("pages.adminUserDetails.chips.count", { count: reviews.length })} variant="outlined" />
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            {reviewsLoading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2">{t("pages.adminUserDetails.loading.reviews")}</Typography>
              </Stack>
            )}

            {reviewsError && <Alert severity="error">{reviewsError}</Alert>}

            {!reviewsLoading && !reviewsError && reviews.length === 0 && (
              <Alert severity="info">{t("pages.adminUserDetails.reviews.empty")}</Alert>
            )}

            {!reviewsLoading && !reviewsError && reviews.length > 0 && (
              <Stack spacing={1}>
                {reviews.map((r) => (
                  <Box
                    key={r.id}
                    sx={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 2,
                      p: 1.2,
                    }}
                  >
                    <Stack spacing={0.4}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                        <Typography variant="body2">
                          <b>{t("pages.adminUserDetails.reviews.reviewTitle", { id: r.id })}</b>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(r.createdAt, na)}
                        </Typography>
                      </Stack>

                      <Typography variant="body2">
                        {typeof r.rating === "number"
                          ? t("pages.adminUserDetails.reviews.rating", { value: r.rating })
                          : na}
                      </Typography>

                      <Typography variant="body2">{r.comment ?? t("pages.adminUserDetails.reviews.noText")}</Typography>

                      {r.orderId && (
                        <Button
                          component={RouterLink}
                          to={`/admin/orders/${r.orderId}`}
                          variant="text"
                          size="small"
                          sx={{ width: "fit-content", p: 0, textTransform: "none" }}
                        >
                          {t("pages.adminUserDetails.reviews.openRelatedOrder")}
                        </Button>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
