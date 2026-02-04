// src/pages/admin/AdminPaymentsPage.tsx
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
import { useNavigate } from "react-router-dom";

import * as ordersApi from "../../api/orders.api";
import type { AdminOrderResponseDto, PaymentResponseDto } from "../../api/orders.api";

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

function paymentChipColor(status?: string | null): "success" | "warning" | "default" {
  const s = (status ?? "").toUpperCase();
  if (!s) return "default";
  if (s === "SUCCESS") return "success";
  return "warning";
}

function userLabel(order: AdminOrderResponseDto) {
  const u = order.user;
  const full = `${u?.name ?? ""} ${u?.surname ?? ""}`.trim();
  return u?.email || full || "—";
}

type PaymentRow = {
  orderId: string;
  orderNumber: string;
  userLabel: string;
  payment: PaymentResponseDto;
};

export default function AdminPaymentsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setError(null);
      setLoading(true);
      try {
        const orders = await ordersApi.getAllOrdersAdmin();

        const list: PaymentRow[] = orders
          .filter(o => !!o.payment)
          .map(o => ({
            orderId: o.id,
            orderNumber: o.orderNumber,
            userLabel: userLabel(o),
            payment: o.payment!,
          }));

        setRows(list);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? "Failed to load payments";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const total = useMemo(() => rows.length, [rows]);

  const handleOpenOrder = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (rows.length === 0) {
    return <Alert severity="info">No payments found</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Payments</Typography>
        <Chip label={`Total: ${total}`} variant="outlined" />
      </Stack>

      <Stack spacing={2}>
        {rows.map(r => {
          const p = r.payment;

          return (
            <Card key={p.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2.25 }}>
                {/* TOP */}
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={1.25}
                >
                  <Box sx={{ minWidth: 320 }}>
                    <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                      Payment {p.id}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Order: {r.orderNumber}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      User: {r.userLabel}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Failure reason: {p.failureReason || "—"}
                    </Typography>
                  </Box>

                  {/* CHIPS */}
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip
                      label={`Status: ${p.status ?? "—"}`}
                      color={paymentChipColor(p.status)}
                      variant="outlined"
                    />
                    <Chip label={`Method: ${p.paymentMethod ?? "—"}`} variant="outlined" />
                    <Chip label={`Amount: ${formatMoney(p.amount)}`} variant="outlined" />
                  </Stack>
                </Stack>

                <Divider sx={{ my: 1.75 }} />

                {/* BOTTOM */}
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems={{ xs: "flex-start", md: "center" }}
                  justifyContent="space-between"
                >
                  <Chip
                    label={`Paid at: ${p.paidAt ? formatDate(p.paidAt) : "—"}`}
                    variant="outlined"
                  />

                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleOpenOrder(r.orderId)}
                    sx={{ borderRadius: 2 }}
                  >
                    Open order
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
