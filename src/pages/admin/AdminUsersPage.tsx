import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import * as usersApi from "../../api/users.api";
import type { UserResponseDto } from "../../api/users.api";

function displayName(u: UserResponseDto) {
  const full = `${u.name ?? ""} ${u.surname ?? ""}`.trim();
  return full || u.email;
}

export default function AdminUsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");

  useEffect(() => {
    const run = async () => {
      setError(null);
      setLoading(true);
      try {
        const list = await usersApi.getAllUsers();
        setUsers(list);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? "Failed to load users";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const hay = [u.email, u.name ?? "", u.surname ?? "", ...(u.roles ?? [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [users, q]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Users ({filtered.length})
        </Typography>

        <TextField
          size="small"
          label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Stack>

      {filtered.length === 0 ? (
        <Alert severity="info">No users found.</Alert>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {filtered.map((u) => (
            <Card
              key={u.id}
              sx={{
                width: { xs: "100%", sm: "calc(50% - 16px)", md: "calc(33.333% - 16px)" },
              }}
            >
              <CardActionArea onClick={() => navigate(`/admin/users/${u.id}`)}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {displayName(u)}
                  </Typography>

                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {u.email}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                    {(u.roles ?? []).map((r) => (
                      <Chip key={r} size="small" label={r} />
                    ))}
                    {typeof u.enabled === "boolean" && (
                      <Chip
                        size="small"
                        label={u.enabled ? "ENABLED" : "DISABLED"}
                        color={u.enabled ? "success" : "default"}
                      />
                    )}
                  </Stack>

                  {u.balance != null && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Balance: {u.balance}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
