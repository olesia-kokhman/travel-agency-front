import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import * as meApi from "../api/users.api";
import type { UserResponseDto, UserUpdateProfileDto } from "../api/users.api";
import { useTranslation } from "react-i18next";

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

// Frontend validation aligned with backend DTO (+balance)
function validate(values: UserUpdateProfileDto, t: (k: string) => string) {
  const errors: Record<string, string> = {};

  const name = values.name ?? "";
  const surname = values.surname ?? "";
  const email = values.email ?? "";
  const phone = values.phoneNumber ?? "";
  const password = values.password ?? "";

  if (name && name.length > 100) errors.name = t("pages.profile.validation.nameMax");
  if (surname && surname.length > 100) errors.surname = t("pages.profile.validation.surnameMax");

  if (email) {
    if (email.length > 255) errors.email = t("pages.profile.validation.emailMax");
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) errors.email = t("pages.profile.validation.emailInvalid");
  }

  if (phone) {
    if (phone.length > 25) errors.phoneNumber = t("pages.profile.validation.phoneMax");
    const phoneOk = /^\+?[0-9]{10,15}$/.test(phone);
    if (!phoneOk) {
      errors.phoneNumber = t("pages.profile.validation.phoneInvalid");
    }
  }

  if (password) {
    if (password.length < 8 || password.length > 72) {
      errors.password = t("pages.profile.validation.passwordLength");
    } else {
      const passOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password);
      if (!passOk) {
        errors.password = t("pages.profile.validation.passwordComplexity");
      }
    }
  }

  // ✅ balance validation (optional, but if set must be >= 0 and finite)
  if (values.balance !== undefined && values.balance !== null) {
    if (typeof values.balance !== "number" || Number.isNaN(values.balance) || !Number.isFinite(values.balance)) {
      errors.balance = t("pages.profile.validation.balanceInvalid");
    } else if (values.balance < 0) {
      errors.balance = t("pages.profile.validation.balanceNegative");
    } else if (values.balance > 1_000_000_000) {
      errors.balance = t("pages.profile.validation.balanceTooLarge");
    }
  }

  return errors;
}

export default function ProfilePage() {
  const { t } = useTranslation();

  const [me, setMe] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Для балансу зручно тримати окремий "input string", щоб нормально вводити "12.50"
  const [balanceInput, setBalanceInput] = useState<string>("");

  const [form, setForm] = useState<UserUpdateProfileDto>({
    name: "",
    surname: "",
    email: "",
    phoneNumber: "",
    password: "",
    balance: null,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setError(null);
      setLoading(true);
      try {
        const u = await meApi.getMe();
        setMe(u);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? t("pages.profile.errors.loadFailed");
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [t]);

  const openEdit = () => {
    if (!me) return;

    const currentBalance =
      me.balance == null ? "" : typeof me.balance === "number" ? String(me.balance) : String(me.balance);

    setForm({
      name: me.name ?? "",
      surname: me.surname ?? "",
      email: me.email ?? "",
      phoneNumber: me.phoneNumber ?? "",
      password: "",
      balance:
        me.balance == null
          ? null
          : typeof me.balance === "number"
          ? me.balance
          : Number(String(me.balance)),
    });

    setBalanceInput(currentBalance);
    setFormErrors({});
    setSaveError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditOpen(false);
  };

  const errors = useMemo(() => validate(form, t), [form, t]);

  const onSubmit = async () => {
    const e = validate(form, t);
    setFormErrors(e);
    setSaveError(null);

    if (Object.keys(e).length > 0) return;

    // PATCH: не відправляємо пусті поля, щоб не “затерти” дані
    const payload: UserUpdateProfileDto = {};

    if ((form.name ?? "").trim() !== "") payload.name = form.name!.trim();
    if ((form.surname ?? "").trim() !== "") payload.surname = form.surname!.trim();
    if ((form.email ?? "").trim() !== "") payload.email = form.email!.trim();
    if ((form.phoneNumber ?? "").trim() !== "") payload.phoneNumber = form.phoneNumber!.trim();
    if ((form.password ?? "").trim() !== "") payload.password = form.password!.trim();

    // ✅ balance: якщо поле заповнене (не пусте) — шлемо
    if (balanceInput.trim() !== "") {
      payload.balance = form.balance ?? 0;
    }

    setSaving(true);
    try {
      const updated = await meApi.updateMe(payload);
      setMe(updated);
      setEditOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.profile.errors.updateFailed");
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!me) return <Alert severity="warning">{t("pages.profile.errors.notFound")}</Alert>;

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {t("pages.profile.title")}
        </Typography>
        <Button variant="contained" onClick={openEdit}>
          {t("pages.profile.actions.edit")}
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {`${me.name ?? ""} ${me.surname ?? ""}`.trim() || me.email}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1}>
            <Typography variant="body2">
              <b>{t("pages.profile.fields.id")}:</b> {me.id}
            </Typography>
            <Typography variant="body2">
              <b>{t("pages.profile.fields.name")}:</b> {me.name ?? "-"}
            </Typography>
            <Typography variant="body2">
              <b>{t("pages.profile.fields.surname")}:</b> {me.surname ?? "-"}
            </Typography>
            <Typography variant="body2">
              <b>{t("pages.profile.fields.email")}:</b> {me.email}
            </Typography>
            <Typography variant="body2">
              <b>{t("pages.profile.fields.phone")}:</b> {me.phoneNumber ?? "-"}
            </Typography>

            <Typography variant="body2">
              <b>{t("pages.profile.fields.password")}:</b> {"********"}
            </Typography>

            <Typography variant="body2">
              <b>{t("pages.profile.fields.active")}:</b> {String(me.active)}
            </Typography>
            <Typography variant="body2">
              <b>{t("pages.profile.fields.balance")}:</b> {String(me.balance)}
            </Typography>
            <Typography variant="body2">
              <b>{t("pages.profile.fields.role")}:</b> {String(me.role)}
            </Typography>
            <Typography variant="body2">
              <b>{t("pages.profile.fields.createdAt")}:</b> {formatDate(me.createdAt)}
            </Typography>
            <Typography variant="body2">
              <b>{t("pages.profile.fields.updatedAt")}:</b> {formatDate(me.updatedAt)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>{t("pages.profile.dialog.title")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}

            <TextField
              label={t("pages.profile.dialog.fields.name")}
              value={form.name ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              error={Boolean(formErrors.name)}
              helperText={formErrors.name ?? " "}
              inputProps={{ maxLength: 100 }}
              fullWidth
            />

            <TextField
              label={t("pages.profile.dialog.fields.surname")}
              value={form.surname ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, surname: e.target.value }))}
              error={Boolean(formErrors.surname)}
              helperText={formErrors.surname ?? " "}
              inputProps={{ maxLength: 100 }}
              fullWidth
            />

            <TextField
              label={t("pages.profile.dialog.fields.email")}
              value={form.email ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              error={Boolean(formErrors.email)}
              helperText={formErrors.email ?? " "}
              inputProps={{ maxLength: 255 }}
              fullWidth
            />

            <TextField
              label={t("pages.profile.dialog.fields.phone")}
              value={form.phoneNumber ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
              error={Boolean(formErrors.phoneNumber)}
              helperText={formErrors.phoneNumber ?? t("pages.profile.dialog.hints.phoneFormat")}
              inputProps={{ maxLength: 25 }}
              fullWidth
            />

            {/* ✅ Balance */}
            <TextField
              label={t("pages.profile.dialog.fields.balance")}
              value={balanceInput}
              onChange={(e) => {
                const v = e.target.value;
                setBalanceInput(v);

                // дозволяємо пусте значення (означає "не змінювати")
                if (v.trim() === "") {
                  setForm((p) => ({ ...p, balance: null }));
                  return;
                }

                const normalized = v.replace(",", ".");
                const num = Number(normalized);

                setForm((p) => ({ ...p, balance: Number.isNaN(num) ? (p.balance ?? null) : num }));
              }}
              error={Boolean(formErrors.balance)}
              helperText={formErrors.balance ?? t("pages.profile.dialog.hints.balanceKeep")}
              fullWidth
            />

            <TextField
              label={t("pages.profile.dialog.fields.password")}
              type="password"
              value={form.password ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              error={Boolean(formErrors.password)}
              helperText={formErrors.password ?? t("pages.profile.dialog.hints.passwordKeep")}
              inputProps={{ maxLength: 72 }}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeEdit} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={onSubmit} disabled={saving || Object.keys(errors).length > 0}>
            {saving ? t("pages.profile.dialog.actions.saving") : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
