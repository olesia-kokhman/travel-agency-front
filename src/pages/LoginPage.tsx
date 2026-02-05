import React, { useState } from "react";
import { Alert, Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await auth.login(email, password);
      navigate("/tours");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.statusMessage ??
        t("pages.login.errors.loginFailed");
      setError(msg);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {t("pages.login.title")}
        </Typography>

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label={t("pages.login.fields.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />

            <TextField
              label={t("pages.login.fields.password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />

            <Button variant="contained" type="submit">
              {t("pages.login.buttons.signIn")}
            </Button>

            <Button component={RouterLink} to="/register" variant="text" type="button">
              {t("pages.login.buttons.createAccount")}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}
