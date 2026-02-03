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

export default function PaymentDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [payment, setPayment] = React.useState<PaymentResponseDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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

        const p = await getPaymentByOrderId(orderId);
        setPayment(p);
      } catch (e: any) {
        // якщо payment не знайдено — бек може дати 404
        const msg = e?.response?.data?.message ?? e?.message ?? "Не вдалося завантажити payment";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [orderId]);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Typography variant="h4">Payment</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Back
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
            <Typography variant="h6">Payment info</Typography>
            <Divider sx={{ my: 2 }} />

            <Stack spacing={1}>
              <Row label="Payment ID" value={payment.id} mono />
              <Row label="Order ID" value={payment.orderId} mono />
              <Row label="Status" value={payment.status} />
              <Row label="Method" value={payment.paymentMethod} />
              <Row label="Amount" value={payment.amount} />
              <Row label="Paid at" value={payment.paidAt ?? "—"} />
              <Row label="Failure reason" value={payment.failureReason ?? "—"} />
              <Row label="Created at" value={payment.createdAt} />
              <Row label="Updated at" value={payment.updatedAt} />
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
