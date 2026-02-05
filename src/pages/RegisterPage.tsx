import React, { useMemo, useState } from "react";
import { Alert, Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import * as authApi from "../api/auth.api";
import type { RegisterRequestDto } from "../types/request";

type ValidationKey =
  | "pages.register.validation.nameMin"
  | "pages.register.validation.surnameMin"
  | "pages.register.validation.emailInvalid"
  | "pages.register.validation.phoneInvalid"
  | "pages.register.validation.passwordMin"
  | "pages.register.validation.passwordUpper"
  | "pages.register.validation.passwordLower"
  | "pages.register.validation.passwordDigit";

function validate(dto: RegisterRequestDto): ValidationKey | null {
  if (dto.name.trim().length < 2) return "pages.register.validation.nameMin";
  if (dto.surname.trim().length < 2) return "pages.register.validation.surnameMin";
  if (!dto.email.includes("@")) return "pages.register.validation.emailInvalid";

  const phoneOk = /^\+?[0-9]{10,15}$/.test(dto.phoneNumber);
  if (!phoneOk) return "pages.register.validation.phoneInvalid";

  if (dto.password.length < 8) return "pages.register.validation.passwordMin";
  if (!/[A-Z]/.test(dto.password)) return "pages.register.validation.passwordUpper";
  if (!/[a-z]/.test(dto.password)) return "pages.register.validation.passwordLower";
  if (!/[0-9]/.test(dto.password)) return "pages.register.validation.passwordDigit";

  return null;
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterRequestDto>({
    name: "",
    surname: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  // 2 типи помилок:
  // - validation -> ключ перекладу
  // - backend -> готовий текст (може приходити від бекенда будь-якою мовою)
  const [validationErrorKey, setValidationErrorKey] = useState<ValidationKey | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const setField = (key: keyof RegisterRequestDto) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const errorMessage = useMemo(() => {
    if (validationErrorKey) return t(validationErrorKey);
    if (backendError) return backendError;
    return null;
  }, [validationErrorKey, backendError, t]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrorKey(null);
    setBackendError(null);
    setSuccess(false);

    const v = validate(form);
    if (v) {
      setValidationErrorKey(v);
      return;
    }

    setLoading(true);
    try {
      await authApi.register(form);
      setSuccess(true);

      // Якщо хочеш показати success — прибери navigate або зроби delayed navigate.
      navigate("/login", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.statusMessage ??
        t("pages.register.errors.registrationFailed");
      setBackendError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {t("pages.register.title")}
        </Typography>

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            {success && <Alert severity="success">{t("pages.register.success.registered")}</Alert>}

            <TextField
              label={t("pages.register.fields.name")}
              value={form.name}
              onChange={setField("name")}
              fullWidth
            />
            <TextField
              label={t("pages.register.fields.surname")}
              value={form.surname}
              onChange={setField("surname")}
              fullWidth
            />
            <TextField
              label={t("pages.register.fields.email")}
              value={form.email}
              onChange={setField("email")}
              fullWidth
            />
            <TextField
              label={t("pages.register.fields.phoneNumber")}
              value={form.phoneNumber}
              onChange={setField("phoneNumber")}
              placeholder={t("pages.register.placeholders.phone")}
              fullWidth
            />
            <TextField
              label={t("pages.register.fields.password")}
              type="password"
              value={form.password}
              onChange={setField("password")}
              fullWidth
            />

            <Button variant="contained" type="submit" disabled={loading}>
              {loading ? t("pages.register.buttons.creating") : t("pages.register.buttons.create")}
            </Button>

            <Button component={RouterLink} to="/login">
              {t("pages.register.buttons.toLogin")}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}
