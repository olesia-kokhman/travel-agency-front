import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";

import { http } from "../api/http";
import { getAccessToken } from "../auth/tokenStorage";
import { getUserIdFromToken, parseJwt } from "../auth/jwt";

type ApiSuccessResponse<T> = {
  status: string;
  message: string;
  results: T;
};

type OrderResponseDto = {
  id: string;
  orderNumber: string;
  totalAmount: string;
  status: string;

  userId: string;
  tourId: string;

  review: any | null;
  payment: any | null;
};

function statusColor(status: string): "default" | "success" | "warning" | "error" | "info" {
  const s = (status || "").toUpperCase();
  if (s === "PAID") return "success";
  if (s === "REGISTERED") return "info";
  if (s === "CANCELED" || s === "CANCELLED") return "error";
  return "default";
}

export default function OrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = React.useState<OrderResponseDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getAccessToken(); // ✅ беремо через storage
        if (!token) {
          setError("Немає access token. Перелогінься.");
          return;
        }

        // Debug (тимчасово): подивись payload у консолі
        console.log("[JWT payload]", parseJwt(token));

        const userId = getUserIdFromToken(token);
        if (!userId) {
          setError("Не можу витягнути userId з access token. Перевір claim userId/id у JWT.");
          return;
        }

        const res = await http.get<ApiSuccessResponse<OrderResponseDto[]>>(
          `/api/orders/me/${userId}`
        );

        setOrders(res.data.results ?? []);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? e?.message ?? "Помилка завантаження ордерів");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: 2 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Orders
      </Typography>

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

      {!loading && !error && orders.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Ордерів поки немає.
        </Alert>
      )}

      {!loading && !error && orders.length > 0 && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {orders.map((o) => (
            <Card key={o.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/orders/${o.id}`)}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                    <Box>
                      <Typography variant="h6">Order #{o.orderNumber}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Order ID: {o.id}
                      </Typography>
                    </Box>

                    <Chip label={o.status} color={statusColor(o.status)} variant="outlined" />
                  </Box>

                  <Box sx={{ mt: 2, display: "flex", gap: 3, flexWrap: "wrap" }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total amount
                      </Typography>
                      <Typography variant="body1">{o.totalAmount}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Tour ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {o.tourId}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
