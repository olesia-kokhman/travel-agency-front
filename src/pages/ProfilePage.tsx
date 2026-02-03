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

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

// Frontend validation aligned with backend DTO (+balance)
function validate(values: UserUpdateProfileDto) {
  const errors: Record<string, string> = {};

  const name = values.name ?? "";
  const surname = values.surname ?? "";
  const email = values.email ?? "";
  const phone = values.phoneNumber ?? "";
  const password = values.password ?? "";

  if (name && name.length > 100) errors.name = "Name must be at most 100 characters long";
  if (surname && surname.length > 100) errors.surname = "Surname must be at most 100 characters long";

  if (email) {
    if (email.length > 255) errors.email = "Email must be at most 255 characters long";
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) errors.email = "Email format is invalid";
  }

  if (phone) {
    if (phone.length > 25) errors.phoneNumber = "Phone number must be at most 25 characters long";
    const phoneOk = /^\+?[0-9]{10,15}$/.test(phone);
    if (!phoneOk) {
      errors.phoneNumber = "Phone number must contain 10-15 digits and may start with +";
    }
  }

  if (password) {
    if (password.length < 8 || password.length > 72) {
      errors.password = "Password must be 8-72 characters long";
    } else {
      const passOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password);
      if (!passOk) {
        errors.password =
          "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 digit";
      }
    }
  }

  // ✅ balance validation (optional, but if set must be >= 0 and finite)
  if (values.balance !== undefined && values.balance !== null) {
    if (typeof values.balance !== "number" || Number.isNaN(values.balance) || !Number.isFinite(values.balance)) {
      errors.balance = "Balance must be a valid number";
    } else if (values.balance < 0) {
      errors.balance = "Balance cannot be negative";
    } else if (values.balance > 1_000_000_000) {
      errors.balance = "Balance is too large";
    }
  }

  return errors;
}

export default function ProfilePage() {
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
        const msg = err?.response?.data?.message ?? "Failed to load profile";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const openEdit = () => {
    if (!me) return;

    const currentBalance =
      me.balance == null
        ? ""
        : typeof me.balance === "number"
        ? String(me.balance)
        : String(me.balance);

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

  const errors = useMemo(() => validate(form), [form]);

  const onSubmit = async () => {
    const e = validate(form);
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
      const msg = err?.response?.data?.message ?? "Failed to update profile";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!me) return <Alert severity="warning">Profile not found</Alert>;

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Profile
        </Typography>
        <Button variant="contained" onClick={openEdit}>
          Edit profile
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
              <b>ID:</b> {me.id}
            </Typography>
            <Typography variant="body2">
              <b>Name:</b> {me.name ?? "-"}
            </Typography>
            <Typography variant="body2">
              <b>Surname:</b> {me.surname ?? "-"}
            </Typography>
            <Typography variant="body2">
              <b>Email:</b> {me.email}
            </Typography>
            <Typography variant="body2">
              <b>Phone:</b> {me.phoneNumber ?? "-"}
            </Typography>

            <Typography variant="body2">
              <b>Password:</b> {"********"}
            </Typography>

            <Typography variant="body2">
              <b>Active:</b> {String(me.active)}
            </Typography>
            <Typography variant="body2">
              <b>Balance:</b> {String(me.balance)}
            </Typography>
            <Typography variant="body2">
              <b>Role:</b> {String(me.role)}
            </Typography>
            <Typography variant="body2">
              <b>Created at:</b> {formatDate(me.createdAt)}
            </Typography>
            <Typography variant="body2">
              <b>Updated at:</b> {formatDate(me.updatedAt)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit profile</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}

            <TextField
              label="Name"
              value={form.name ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              error={Boolean(formErrors.name)}
              helperText={formErrors.name ?? " "}
              inputProps={{ maxLength: 100 }}
              fullWidth
            />

            <TextField
              label="Surname"
              value={form.surname ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, surname: e.target.value }))}
              error={Boolean(formErrors.surname)}
              helperText={formErrors.surname ?? " "}
              inputProps={{ maxLength: 100 }}
              fullWidth
            />

            <TextField
              label="Email"
              value={form.email ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              error={Boolean(formErrors.email)}
              helperText={formErrors.email ?? " "}
              inputProps={{ maxLength: 255 }}
              fullWidth
            />

            <TextField
              label="Phone number"
              value={form.phoneNumber ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
              error={Boolean(formErrors.phoneNumber)}
              helperText={formErrors.phoneNumber ?? "Format: +380XXXXXXXXX (10-15 digits) "}
              inputProps={{ maxLength: 25 }}
              fullWidth
            />

            {/* ✅ Balance */}
            <TextField
              label="Balance"
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
              helperText={formErrors.balance ?? "Leave empty to keep current balance"}
              fullWidth
            />

            <TextField
              label="Password"
              type="password"
              value={form.password ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              error={Boolean(formErrors.password)}
              helperText={formErrors.password ?? "Leave empty to keep current password"}
              inputProps={{ maxLength: 72 }}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeEdit} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={saving || Object.keys(errors).length > 0}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
