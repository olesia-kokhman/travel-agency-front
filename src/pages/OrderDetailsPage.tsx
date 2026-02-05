import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Divider,
  CardActionArea,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Rating,
} from "@mui/material";

import { http } from "../api/http";
import { createPayment, getPaymentByOrderId, type PaymentResponseDto } from "../api/payments.api";
import { createReview, updateReview, type ReviewResponseDto } from "../api/reviews.api";
import { useTranslation } from "react-i18next";

type ApiSuccessResponse<T> = {
  status: string;
  message: string;
  results: T;
};

type OrderResponseDto = {
  id: string;
  orderNumber: string;
  totalAmount: any;
  status: string;
  tourId: string;

  review: ReviewResponseDto | null;
  payment: PaymentResponseDto | null;
};

function normalizeStatus(status: string) {
  return (status || "").toUpperCase();
}

function statusColor(status: string): "default" | "success" | "warning" | "error" | "info" {
  const s = normalizeStatus(status);
  if (s === "PAID") return "success";
  if (s === "REGISTERED") return "info";
  if (s === "CANCELED" || s === "CANCELLED") return "error";
  return "default";
}

export default function OrderDetailsPage() {
  const { t } = useTranslation();

  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = React.useState<OrderResponseDto | null>(null);
  const [payment, setPayment] = React.useState<PaymentResponseDto | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [paymentLoading, setPaymentLoading] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  // Pay dialog state
  const [payOpen, setPayOpen] = React.useState(false);
  const [paySubmitting, setPaySubmitting] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);

  const PAYMENT_METHODS = ["CARD", "CASH", "TRANSFER"] as const;
  const [paymentMethod, setPaymentMethod] = React.useState<string>(PAYMENT_METHODS[0]);
  const [amount, setAmount] = React.useState<string>("");

  // Review dialog state
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewSubmitting, setReviewSubmitting] = React.useState(false);
  const [reviewError, setReviewError] = React.useState<string | null>(null);
  const [reviewRating, setReviewRating] = React.useState<number>(5);
  const [reviewComment, setReviewComment] = React.useState<string>("");

  React.useEffect(() => {
    const run = async () => {
      if (!orderId) {
        setError(t("pages.orderDetails.errors.missingOrderId"));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await http.get<ApiSuccessResponse<OrderResponseDto>>(`/api/orders/me/order/${orderId}`);
        const o = res.data.results;

        setOrder(o);

        // amount in dialog
        setAmount(o.totalAmount == null ? "" : String(o.totalAmount));

        // payment (from order or separately)
        if (o?.payment) {
          setPayment(o.payment);
        } else {
          const s = normalizeStatus(o.status);
          if (s === "PAID" || s === "CANCELED" || s === "CANCELLED") {
            try {
              setPaymentLoading(true);
              const p = await getPaymentByOrderId(o.id);
              setPayment(p);
            } catch {
              setPayment(null);
            } finally {
              setPaymentLoading(false);
            }
          }
        }
      } catch (e: any) {
        setError(e?.response?.data?.message ?? e?.message ?? t("pages.orderDetails.errors.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [orderId, t]);

  const goToPayment = () => {
    if (!order) return;
    navigate(`/payments/orders/${order.id}`);
  };

  const goToTour = () => {
    if (!order) return;
    if (!order.tourId) {
      setError(t("pages.orderDetails.errors.missingTourId"));
      return;
    }
    navigate(`/tours/${order.tourId}`);
  };

  // ---------------- PAY ----------------
  const openPayDialog = () => {
    setPayError(null);
    setPayOpen(true);
  };

  const closePayDialog = () => {
    if (paySubmitting) return;
    setPayOpen(false);
  };

  const submitPayment = async () => {
    if (!order) return;

    setPayError(null);

    const normalized = String(amount ?? "").trim();
    const num = Number(normalized.replace(",", "."));

    if (!normalized || Number.isNaN(num) || num <= 0) {
      setPayError(t("pages.orderDetails.pay.errors.amountInvalid"));
      return;
    }

    try {
      setPaySubmitting(true);

      const created = await createPayment(order.id, {
        paymentMethod,
        amount: normalized,
      });

      setPayment(created);
      setOrder((prev) => (prev ? { ...prev, status: "PAID", payment: created } : prev));
      setPayOpen(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.response?.data?.error ??
        e?.message ??
        t("pages.orderDetails.pay.errors.createFailed");
      setPayError(msg);
    } finally {
      setPaySubmitting(false);
    }
  };

  // ---------------- REVIEW ----------------
  const openCreateReview = () => {
    setReviewError(null);
    setReviewRating(5);
    setReviewComment("");
    setReviewOpen(true);
  };

  const openEditReview = () => {
    if (!order?.review) return;
    setReviewError(null);
    setReviewRating(order.review.rating ?? 5);
    setReviewComment(order.review.comment ?? "");
    setReviewOpen(true);
  };

  const closeReviewDialog = () => {
    if (reviewSubmitting) return;
    setReviewOpen(false);
  };

  const submitReview = async () => {
    if (!order) return;

    setReviewError(null);

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError(t("pages.orderDetails.review.errors.ratingRange"));
      return;
    }

    if (reviewComment.length > 2000) {
      setReviewError(t("pages.orderDetails.review.errors.commentMax"));
      return;
    }

    try {
      setReviewSubmitting(true);

      const isEdit = !!order.review?.id;

      const saved = isEdit
        ? await updateReview(order.review!.id, { rating: reviewRating, comment: reviewComment })
        : await createReview(order.id, { rating: reviewRating, comment: reviewComment });

      setOrder((prev) => (prev ? { ...prev, review: saved } : prev));
      setReviewOpen(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.response?.data?.error ??
        e?.message ??
        t("pages.orderDetails.review.errors.saveFailed");
      setReviewError(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ---------------- UI blocks ----------------
  const renderPaymentBlock = () => {
    if (!order) return null;
    const s = normalizeStatus(order.status);

    if (s === "REGISTERED") {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 1 }}>
            {t("pages.orderDetails.payment.registeredInfo")}
          </Alert>
          <Button variant="contained" color="success" onClick={openPayDialog}>
            {t("pages.orderDetails.payment.payBtn")}
          </Button>
        </Box>
      );
    }

    if (s === "PAID") {
      if (paymentLoading) return <CircularProgress size={22} />;
      if (!payment) {
        return <Alert severity="warning">{t("pages.orderDetails.payment.paidButMissing")}</Alert>;
      }

      return (
        <Card variant="outlined">
          <CardActionArea onClick={goToPayment}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t("pages.orderDetails.payment.cardTitlePaid")}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={0.5}>
                <Row label={t("pages.orderDetails.payment.fields.status")} value={String(payment.status)} />
                <Row label={t("pages.orderDetails.payment.fields.method")} value={String(payment.paymentMethod)} />
                <Row label={t("pages.orderDetails.payment.fields.amount")} value={String(payment.amount)} />
                <Row label={t("pages.orderDetails.payment.fields.paidAt")} value={String(payment.paidAt ?? "—")} />
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      );
    }

    if (s === "CANCELED" || s === "CANCELLED") {
      if (paymentLoading) return <CircularProgress size={22} />;

      if (!payment) {
        return <Alert severity="info">{t("pages.orderDetails.payment.cancelledNoPayment")}</Alert>;
      }

      return (
        <Card variant="outlined">
          <CardActionArea onClick={goToPayment}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t("pages.orderDetails.payment.cardTitleInfo")}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={0.5}>
                <Row label={t("pages.orderDetails.payment.fields.status")} value={String(payment.status)} />
                <Row label={t("pages.orderDetails.payment.fields.method")} value={String(payment.paymentMethod)} />
                <Row label={t("pages.orderDetails.payment.fields.amount")} value={String(payment.amount)} />
                <Row label={t("pages.orderDetails.payment.fields.paidAt")} value={String(payment.paidAt ?? "—")} />
                <Row label={t("pages.orderDetails.payment.fields.failureReason")} value={String(payment.failureReason ?? "—")} />
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      );
    }

    return <Alert severity="info">{t("pages.orderDetails.payment.unknownStatus", { status: order.status })}</Alert>;
  };

  const renderReviewBlock = () => {
    if (!order) return null;

    if (!order.review) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 1 }}>
            {t("pages.orderDetails.review.noneInfo")}
          </Alert>
          <Button variant="contained" color="secondary" onClick={openCreateReview}>
            {t("pages.orderDetails.review.addBtn")}
          </Button>
        </Box>
      );
    }

    return (
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("pages.orderDetails.review.title")}
            </Typography>
            <Button variant="outlined" color="secondary" onClick={openEditReview}>
              {t("pages.orderDetails.review.editBtn")}
            </Button>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t("pages.orderDetails.review.fields.rating")}:
              </Typography>
              <Rating value={order.review.rating} readOnly />
              <Typography variant="body2">({order.review.rating})</Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                {t("pages.orderDetails.review.fields.comment")}:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {order.review.comment || "—"}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              {t("pages.orderDetails.review.fields.updated")}: {String(order.review.updatedAt ?? "—")}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t("pages.orderDetails.title")}
        </Typography>
        <Button variant="outlined" color="inherit" onClick={() => navigate("/orders")}>
          {t("pages.orderDetails.actions.back")}
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && !order && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t("pages.orderDetails.errors.notFound")}
        </Alert>
      )}

      {!loading && !error && order && (
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
            gap: 2,
          }}
        >
          {/* LEFT */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t("pages.orderDetails.header.orderNumber", { orderNumber: order.orderNumber })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.id}
                  </Typography>
                </Box>

                <Chip label={order.status} color={statusColor(order.status)} variant="outlined" />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.25}>
                <Row label={t("pages.orderDetails.fields.totalAmount")} value={String(order.totalAmount ?? "—")} />

                <Card variant="outlined">
                  <CardActionArea onClick={goToTour}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t("pages.orderDetails.tour.title")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t("pages.orderDetails.tour.hint")}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", mt: 0.5 }}>
                        {order.tourId || "—"}
                      </Typography>

                      <Box sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToTour();
                          }}
                        >
                          {t("pages.orderDetails.tour.openBtn")}
                        </Button>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Stack>
            </CardContent>
          </Card>

          {/* RIGHT */}
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {t("pages.orderDetails.payment.title")}
                </Typography>
                {renderPaymentBlock()}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {t("pages.orderDetails.review.title")}
                </Typography>
                {renderReviewBlock()}
              </CardContent>
            </Card>
          </Stack>
        </Box>
      )}

      {/* Pay dialog */}
      <Dialog open={payOpen} onClose={closePayDialog} fullWidth maxWidth="sm">
        <DialogTitle>{t("pages.orderDetails.pay.dialog.title")}</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {payError && <Alert severity="error">{payError}</Alert>}

            <TextField
              select
              label={t("pages.orderDetails.pay.dialog.fields.method")}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(String(e.target.value))}
              fullWidth
            >
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {/* якщо не хочеш enum перекладати — заміни на {m} */}
                  {t(`enums.paymentMethod.${m}`)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={t("pages.orderDetails.pay.dialog.fields.amount")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              helperText={t("pages.orderDetails.pay.dialog.hints.amountFormat")}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closePayDialog} disabled={paySubmitting} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="success" onClick={submitPayment} disabled={paySubmitting}>
            {paySubmitting ? t("pages.orderDetails.pay.dialog.actions.processing") : t("pages.orderDetails.pay.dialog.actions.pay")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review dialog (create/update) */}
      <Dialog open={reviewOpen} onClose={closeReviewDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {order?.review ? t("pages.orderDetails.review.dialog.editTitle") : t("pages.orderDetails.review.dialog.createTitle")}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {reviewError && <Alert severity="error">{reviewError}</Alert>}

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {t("pages.orderDetails.review.dialog.fields.ratingHint")}
              </Typography>
              <Rating value={reviewRating} onChange={(_, v) => setReviewRating(v ?? 0)} />
            </Box>

            <TextField
              label={t("pages.orderDetails.review.dialog.fields.comment")}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              inputProps={{ maxLength: 2000 }}
              helperText={t("pages.orderDetails.review.dialog.hints.commentCounter", { count: reviewComment.length })}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeReviewDialog} disabled={reviewSubmitting} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="secondary" onClick={submitReview} disabled={reviewSubmitting}>
            {reviewSubmitting ? t("pages.orderDetails.review.dialog.actions.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
