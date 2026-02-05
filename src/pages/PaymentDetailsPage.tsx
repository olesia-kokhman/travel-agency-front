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
  Stack,
  Divider,
} from "@mui/material";

import { getPaymentByOrderId, type PaymentResponseDto } from "../api/payments.api";
import { useTranslation } from "react-i18next";

export default function PaymentDetailsPage() {
  const { t } = useTranslation();

  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [payment, setPayment] = React.useState<PaymentResponseDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const run = async () => {
      if (!orderId) {
        setError(t("pages.paymentDetails.errors.missingOrderId"));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const p = await getPaymentByOrderId(orderId);
        setPayment(p);
      } catch (e: any) {
        // якщо payment не знайдено — бек може дати 404
        const msg =
          e?.response?.data?.message ??
          e?.message ??
          t("pages.paymentDetails.errors.loadFailed");
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [orderId, t]);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Typography variant="h4">{t("pages.paymentDetails.title")}</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          {t("pages.paymentDetails.actions.back")}
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && payment && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6">{t("pages.paymentDetails.card.title")}</Typography>
            <Divider sx={{ my: 2 }} />

            <Stack spacing={1}>
              <Row label={t("pages.paymentDetails.fields.paymentId")} value={String(payment.id)} mono />
              <Row label={t("pages.paymentDetails.fields.orderId")} value={String(payment.orderId)} mono />
              <Row label={t("pages.paymentDetails.fields.status")} value={String(payment.status)} />
              <Row label={t("pages.paymentDetails.fields.method")} value={String(payment.paymentMethod)} />
              <Row label={t("pages.paymentDetails.fields.amount")} value={String(payment.amount)} />
              <Row label={t("pages.paymentDetails.fields.paidAt")} value={String(payment.paidAt ?? "—")} />
              <Row label={t("pages.paymentDetails.fields.failureReason")} value={String(payment.failureReason ?? "—")} />
              <Row label={t("pages.paymentDetails.fields.createdAt")} value={String(payment.createdAt)} />
              <Row label={t("pages.paymentDetails.fields.updatedAt")} value={String(payment.updatedAt)} />
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={mono ? { fontFamily: "monospace" } : undefined}>
        {value}
      </Typography>
    </Box>
  );
}
