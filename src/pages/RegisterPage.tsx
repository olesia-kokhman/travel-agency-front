import { useState } from "react";
import { Alert, Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import * as authApi from "../api/auth.api";
import type { RegisterRequestDto } from "../types/request";

function validate(dto: RegisterRequestDto): string | null {
  if (dto.name.trim().length < 2) return "Name must be at least 2 characters";
  if (dto.surname.trim().length < 2) return "Surname must be at least 2 characters";
  if (!dto.email.includes("@")) return "Email is invalid";

  // phone: ^\+?[0-9]{10,15}$
  const phoneOk = /^\+?[0-9]{10,15}$/.test(dto.phoneNumber);
  if (!phoneOk) return "Phone number must contain 10-15 digits and may start with +";

  // password: min 8 + 1 upper + 1 lower + 1 digit
  if (dto.password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(dto.password)) return "Password must contain at least 1 uppercase letter";
  if (!/[a-z]/.test(dto.password)) return "Password must contain at least 1 lowercase letter";
  if (!/[0-9]/.test(dto.password)) return "Password must contain at least 1 digit";

  return null;
}

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterRequestDto>({
    name: "",
    surname: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const setField = (key: keyof RegisterRequestDto) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await authApi.register(form);
      setSuccess("Registered successfully. You can login now.");
      // маленька пауза не потрібна — просто перекидаємо
      navigate("/login", { replace: true });
    } catch (err: any) {
      // якщо твій бек повертає ApiErrorResponse з message
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.statusMessage ??
        "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Register</Typography>

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <TextField label="Name" value={form.name} onChange={setField("name")} fullWidth />
            <TextField label="Surname" value={form.surname} onChange={setField("surname")} fullWidth />
            <TextField label="Email" value={form.email} onChange={setField("email")} fullWidth />
            <TextField
              label="Phone number"
              value={form.phoneNumber}
              onChange={setField("phoneNumber")}
              placeholder="+380xxxxxxxxx"
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={setField("password")}
              fullWidth
            />

            <Button variant="contained" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>

            <Button component={RouterLink} to="/login">
              Already have an account? Login
            </Button>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}
