// src/pages/ForgotPasswordPage.tsx
import React, { useState } from "react";
import { Alert, Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import * as passwordResetApi from "../api/passwordReset.api";

function getForgotErrorMessage(err: any, t: (k: string) => string): string {
  const status: number | undefined = err?.response?.status;

  if (status === 429) return t("pages.forgotPassword.errors.tooManyRequests");

  const backendMsg =
    err?.response?.data?.message ??
    err?.response?.data?.statusMessage;

  if (typeof backendMsg === "string" && backendMsg.trim().length > 0) return backendMsg;

  return t("pages.forgotPassword.errors.requestFailed");
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    setLoading(true);
    try {
      await passwordResetApi.requestPasswordReset(email.trim());
      // бек каже "If account exists..." — так і показуємо завжди
      setSuccess(t("pages.forgotPassword.success.checkEmail"));
    } catch (err: any) {
      setError(getForgotErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {t("pages.forgotPassword.title")}
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("pages.forgotPassword.subtitle")}
        </Typography>

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <TextField
              label={t("pages.forgotPassword.fields.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              autoComplete="email"
            />

            <Button variant="contained" type="submit" disabled={loading}>
              {t("pages.forgotPassword.buttons.sendLink")}
            </Button>

            <Button component={RouterLink} to="/login" variant="text" type="button">
              {t("pages.forgotPassword.buttons.backToLogin")}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}
