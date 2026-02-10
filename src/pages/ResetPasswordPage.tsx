// src/pages/ResetPasswordPage.tsx
import React, { useMemo, useState } from "react";
import { Alert, Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import * as passwordResetApi from "../api/passwordReset.api";

function getResetErrorMessage(err: any, t: (k: string) => string): string {
  const status: number | undefined = err?.response?.status;

  if (status === 429) return t("pages.resetPassword.errors.tooManyRequests");

  // токен може бути невалідний/протух — у бекенда часто 400/404
  if (status === 400 || status === 404) return t("pages.resetPassword.errors.invalidOrExpiredToken");

  const backendMsg =
    err?.response?.data?.message ??
    err?.response?.data?.statusMessage;

  if (typeof backendMsg === "string" && backendMsg.trim().length > 0) return backendMsg;

  return t("pages.resetPassword.errors.resetFailed");
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => (params.get("token") ?? "").trim(), [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tokenMissing = token.length === 0;

  const passwordsMismatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (tokenMissing) {
      setError(t("pages.resetPassword.errors.missingToken"));
      return;
    }

    if (!newPassword.trim()) {
      setError(t("pages.resetPassword.errors.passwordRequired"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("pages.resetPassword.errors.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      await passwordResetApi.confirmPasswordReset(token, newPassword);
      setSuccess(t("pages.resetPassword.success.passwordChanged"));

      // маленька пауза не потрібна — просто редірект
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(getResetErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {t("pages.resetPassword.title")}
        </Typography>

        {tokenMissing && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t("pages.resetPassword.warnings.noToken")}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <TextField
              label={t("pages.resetPassword.fields.newPassword")}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              autoComplete="new-password"
              disabled={tokenMissing}
            />

            <TextField
              label={t("pages.resetPassword.fields.confirmPassword")}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              autoComplete="new-password"
              error={passwordsMismatch}
              helperText={passwordsMismatch ? t("pages.resetPassword.errors.passwordsDoNotMatch") : " "}
              disabled={tokenMissing}
            />

            <Button variant="contained" type="submit" disabled={loading || tokenMissing}>
              {t("pages.resetPassword.buttons.reset")}
            </Button>

            <Button component={RouterLink} to="/login" variant="text" type="button">
              {t("pages.resetPassword.buttons.backToLogin")}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}
