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
        setError("orderId відсутній у URL");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await http.get<ApiSuccessResponse<OrderResponseDto>>(
          `/api/orders/me/order/${orderId}`
        );

        const o = res.data.results;
        setOrder(o);

        // amount в діалозі
        setAmount(o.totalAmount == null ? "" : String(o.totalAmount));

        // payment (з order або окремо)
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
        setError(e?.response?.data?.message ?? e?.message ?? "Помилка завантаження ордера");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [orderId]);

  const goToPayment = () => {
    if (!order) return;
    navigate(`/payments/orders/${order.id}`);
  };

  const goToTour = () => {
    if (!order) return;
    if (!order.tourId) {
      setError("tourId відсутній у замовленні (не можу перейти на сторінку туру).");
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
      setPayError("Вкажи коректну суму (більше 0).");
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
        "Не вдалося створити payment";
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
      setReviewError("Rating має бути від 1 до 5.");
      return;
    }

    if (reviewComment.length > 2000) {
      setReviewError("Comment має бути максимум 2000 символів.");
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
        "Не вдалося зберегти review";
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
            Замовлення зареєстровано і ще не оплачено.
          </Alert>
          <Button variant="contained" color="success" onClick={openPayDialog}>
            Оплатити
          </Button>
        </Box>
      );
    }

    if (s === "PAID") {
      if (paymentLoading) return <CircularProgress size={22} />;
      if (!payment) {
        return (
          <Alert severity="warning">
            Статус PAID, але payment не знайдено. Перевір бек/дані.
          </Alert>
        );
      }

      return (
        <Card variant="outlined">
          <CardActionArea onClick={goToPayment}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Payment (натисни, щоб відкрити)
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={0.5}>
                <Row label="Status" value={payment.status} />
                <Row label="Method" value={payment.paymentMethod} />
                <Row label="Amount" value={payment.amount} />
                <Row label="Paid at" value={payment.paidAt ?? "—"} />
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      );
    }

    if (s === "CANCELED" || s === "CANCELLED") {
      if (paymentLoading) return <CircularProgress size={22} />;

      if (!payment) {
        return <Alert severity="info">Замовлення скасовано. Оплати не було.</Alert>;
      }

      return (
        <Card variant="outlined">
          <CardActionArea onClick={goToPayment}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Payment info (натисни, щоб відкрити)
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={0.5}>
                <Row label="Status" value={payment.status} />
                <Row label="Method" value={payment.paymentMethod} />
                <Row label="Amount" value={payment.amount} />
                <Row label="Paid at" value={payment.paidAt ?? "—"} />
                <Row label="Failure reason" value={payment.failureReason ?? "—"} />
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      );
    }

    return <Alert severity="info">Невідомий статус: {order.status}</Alert>;
  };

  const renderReviewBlock = () => {
    if (!order) return null;

    if (!order.review) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 1 }}>
            Review ще не додано.
          </Alert>
          <Button variant="contained" color="secondary" onClick={openCreateReview}>
            Додати review
          </Button>
        </Box>
      );
    }

    return (
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Review
            </Typography>
            <Button variant="outlined" color="secondary" onClick={openEditReview}>
              Редагувати
            </Button>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Rating:
              </Typography>
              <Rating value={order.review.rating} readOnly />
              <Typography variant="body2">({order.review.rating})</Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Comment:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {order.review.comment || "—"}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Updated: {order.review.updatedAt}
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
          Order details
        </Typography>
        <Button variant="outlined" color="inherit" onClick={() => navigate("/orders")}>
          Back
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
          Ордер не знайдений.
        </Alert>
      )}

      {!loading && !error && order && (
        <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" }, gap: 2 }}>
          {/* LEFT */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Order #{order.orderNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.id}
                  </Typography>
                </Box>

                <Chip label={order.status} color={statusColor(order.status)} variant="outlined" />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.25}>
                <Row label="Total amount" value={String(order.totalAmount ?? "—")} />

                <Card variant="outlined">
                  <CardActionArea onClick={goToTour}>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Tour
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Натисни, щоб відкрити сторінку туру
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
                          Open tour
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
                  Payment
                </Typography>
                {renderPaymentBlock()}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Review
                </Typography>
                {renderReviewBlock()}
              </CardContent>
            </Card>
          </Stack>
        </Box>
      )}

      {/* Pay dialog */}
      <Dialog open={payOpen} onClose={() => closePayDialog()} fullWidth maxWidth="sm">
        <DialogTitle>Оплата замовлення</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {payError && <Alert severity="error">{payError}</Alert>}

            <TextField
              select
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              fullWidth
            >
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              helperText="Формат: 0.01 .. 1000000000.00"
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closePayDialog} disabled={paySubmitting} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" color="success" onClick={submitPayment} disabled={paySubmitting}>
            {paySubmitting ? "Processing..." : "Pay"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review dialog (create/update) */}
      <Dialog open={reviewOpen} onClose={() => closeReviewDialog()} fullWidth maxWidth="sm">
        <DialogTitle>{order?.review ? "Редагувати review" : "Додати review"}</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {reviewError && <Alert severity="error">{reviewError}</Alert>}

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Rating (1..5)
              </Typography>
              <Rating
                value={reviewRating}
                onChange={(_, v) => setReviewRating(v ?? 0)}
              />
            </Box>

            <TextField
              label="Comment"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              inputProps={{ maxLength: 2000 }}
              helperText={`${reviewComment.length}/2000`}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeReviewDialog} disabled={reviewSubmitting} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={submitReview}
            disabled={reviewSubmitting}
          >
            {reviewSubmitting ? "Saving..." : "Save"}
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
