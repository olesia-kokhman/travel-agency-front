import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import * as usersApi from "../../api/users.api";
import type { UserResponseDto } from "../../api/users.api";

export default function AdminUserDetailsPage() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!userId) return;

      setError(null);
      setLoading(true);
      try {
        const u = await usersApi.getUserById(userId);
        setUser(u);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? "Failed to load user";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [userId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) return <Alert severity="warning">User not found.</Alert>;

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Button variant="outlined" onClick={() => navigate("/admin/users")}>
          Back
        </Button>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          User details
        </Typography>
      </Stack>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {user.name || user.surname ? `${user.name ?? ""} ${user.surname ?? ""}`.trim() : user.email}
          </Typography>

          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {user.email}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={0.8}>
            <Typography variant="body2">ID: {user.id}</Typography>
            {"balance" in user && user.balance != null && (
              <Typography variant="body2">Balance: {user.balance}</Typography>
            )}
            {"enabled" in user && typeof user.enabled === "boolean" && (
              <Typography variant="body2">Enabled: {String(user.enabled)}</Typography>
            )}
            {Array.isArray(user.roles) && user.roles.length > 0 && (
              <Typography variant="body2">Roles: {user.roles.join(", ")}</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Next: orders / payments / reviews */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Related data
          </Typography>
          <Alert severity="info">
            Тут додамо: orders / payments / reviews для цього юзера, як тільки підтягнемо ендпоінти.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
