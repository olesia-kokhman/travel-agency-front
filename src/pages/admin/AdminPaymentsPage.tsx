// src/pages/admin/AdminPaymentsPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import { useNavigate } from "react-router-dom";

import * as paymentsApi from "../../api/payments.api";
import type { PaymentResponseDto } from "../../api/payments.api";

const PAYMENT_STATUSES = ["NEW", "SUCCESS", "FAILED", "PENDING", "CANCELED", "REFUNDED"] as const;
const PAYMENT_METHODS = ["CARD", "CASH", "TRANSFER"] as const;

type SortOption =
  | "PAID_DESC"
  | "PAID_ASC"
  | "AMOUNT_DESC"
  | "AMOUNT_ASC"
  | "STATUS_ASC"
  | "STATUS_DESC"
  | "METHOD_ASC"
  | "METHOD_DESC";

function sortToPageable(sort: SortOption): { property: string; direction: "asc" | "desc" } | null {
  switch (sort) {
    case "PAID_DESC":
      return { property: "paidAt", direction: "desc" };
    case "PAID_ASC":
      return { property: "paidAt", direction: "asc" };
    case "AMOUNT_DESC":
      return { property: "amount", direction: "desc" };
    case "AMOUNT_ASC":
      return { property: "amount", direction: "asc" };
    case "STATUS_ASC":
      return { property: "status", direction: "asc" };
    case "STATUS_DESC":
      return { property: "status", direction: "desc" };
    case "METHOD_ASC":
      return { property: "paymentMethod", direction: "asc" };
    case "METHOD_DESC":
      return { property: "paymentMethod", direction: "desc" };
    default:
      return null;
  }
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function normalize(v?: string | null) {
  return (v ?? "").toString().trim().toLowerCase();
}

function isNonEmpty(v?: string | null) {
  return !!v && v.trim().length > 0;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatMoney(v: any) {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

function statusColor(status?: string | null): "success" | "warning" | "default" {
  const s = (status ?? "").toUpperCase();
  if (!s) return "default";
  if (s === "SUCCESS") return "success";
  return "warning";
}

export default function AdminPaymentsPage() {
  const navigate = useNavigate();

  // optional "search in current page" (backend doesn't have q in PaymentFilter)
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 250);

  // filters
  const [showFilters, setShowFilters] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [hasFailureReason, setHasFailureReason] = useState<boolean | null>(null);

  // pageable
  const [sort, setSort] = useState<SortOption>("PAID_DESC");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // data
  const [items, setItems] = useState<PaymentResponseDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filter = useMemo<paymentsApi.PaymentFilter>(() => {
    const f: paymentsApi.PaymentFilter = {};
    if (statuses.length) f.statuses = statuses;
    if (methods.length) f.methods = methods;

    if (isNonEmpty(minAmount)) f.minAmount = minAmount.trim();
    if (isNonEmpty(maxAmount)) f.maxAmount = maxAmount.trim();

    if (isNonEmpty(paidFrom)) f.paidFrom = paidFrom.trim();
    if (isNonEmpty(paidTo)) f.paidTo = paidTo.trim();

    if (typeof hasFailureReason === "boolean") f.hasFailureReason = hasFailureReason;

    return f;
  }, [statuses, methods, minAmount, maxAmount, paidFrom, paidTo, hasFailureReason]);

  // reset page when filters/sort/size change
  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, size]);

  const requestSeq = useRef(0);

  const load = async () => {
    const seq = ++requestSeq.current;
    setError(null);
    setLoading(true);
    try {
      const res = await paymentsApi.getPaymentsPageAdmin({
        filter,
        page,
        size,
        sort: sortToPageable(sort),
      });

      if (seq !== requestSeq.current) return;

      setItems(res.results ?? []);
      setTotalPages(Math.max(1, res.totalPages ?? 1));
      setTotalElements(res.totalElements ?? 0);
    } catch (err: any) {
      if (seq !== requestSeq.current) return;

      const msg =
        err?.response?.data?.statusMessage ??
        err?.response?.data?.message ??
        "Failed to load payments";
      setError(msg);
      setItems([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, page, size]);

  // client-side "search in page"
  const visibleItems = useMemo(() => {
    const query = normalize(qDebounced);
    if (!query) return items;

    return items.filter((p) => {
      const hay = [
        p.id,
        p.status,
        p.paymentMethod,
        p.failureReason ?? "",
        p.orderId,
        p.amount != null ? String(p.amount) : "",
        p.paidAt ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(query);
    });
  }, [items, qDebounced]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];

    if (statuses.length) chips.push({ key: "st", label: `statuses: ${statuses.join(", ")}`, onDelete: () => setStatuses([]) });
    if (methods.length) chips.push({ key: "m", label: `methods: ${methods.join(", ")}`, onDelete: () => setMethods([]) });
    if (minAmount.trim()) chips.push({ key: "min", label: `min: ${minAmount}`, onDelete: () => setMinAmount("") });
    if (maxAmount.trim()) chips.push({ key: "max", label: `max: ${maxAmount}`, onDelete: () => setMaxAmount("") });
    if (paidFrom.trim()) chips.push({ key: "from", label: `paidFrom: ${paidFrom}`, onDelete: () => setPaidFrom("") });
    if (paidTo.trim()) chips.push({ key: "to", label: `paidTo: ${paidTo}`, onDelete: () => setPaidTo("") });
    if (typeof hasFailureReason === "boolean") {
      chips.push({ key: "fail", label: `hasFailureReason: ${hasFailureReason}`, onDelete: () => setHasFailureReason(null) });
    }

    return chips;
  }, [statuses, methods, minAmount, maxAmount, paidFrom, paidTo, hasFailureReason]);

  const clearAllFilters = () => {
    setStatuses([]);
    setMethods([]);
    setMinAmount("");
    setMaxAmount("");
    setPaidFrom("");
    setPaidTo("");
    setHasFailureReason(null);
    setQ("");
  };

  const openOrder = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
            Payments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? "Loading…" : `Found: ${totalElements}`} • Page {page + 1} / {totalPages}
          </Typography>
        </Box>

        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          label="Search in page"
          placeholder="status/method/orderId/failure…"
          fullWidth
        />
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Toolbar */}
      <Card sx={{ borderRadius: 3, p: 2 }}>
        <Stack spacing={1.6}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="sort-label">Sort</InputLabel>
              <Select
                labelId="sort-label"
                label="Sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
              >
                <MenuItem value="PAID_DESC">PaidAt: newest</MenuItem>
                <MenuItem value="PAID_ASC">PaidAt: oldest</MenuItem>
                <MenuItem value="AMOUNT_DESC">Amount: high → low</MenuItem>
                <MenuItem value="AMOUNT_ASC">Amount: low → high</MenuItem>
                <MenuItem value="STATUS_ASC">Status: A → Z</MenuItem>
                <MenuItem value="STATUS_DESC">Status: Z → A</MenuItem>
                <MenuItem value="METHOD_ASC">Method: A → Z</MenuItem>
                <MenuItem value="METHOD_DESC">Method: Z → A</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="size-label">Per page</InputLabel>
              <Select
                labelId="size-label"
                label="Per page"
                value={String(size)}
                onChange={(e) => setSize(Number(e.target.value))}
              >
                <MenuItem value="6">6</MenuItem>
                <MenuItem value="10">10</MenuItem>
                <MenuItem value="20">20</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ flexGrow: 1 }} />

            <Stack direction="row" spacing={1}>
              <Button
                variant={showFilters ? "contained" : "outlined"}
                startIcon={<FilterAltOutlinedIcon />}
                onClick={() => setShowFilters((v) => !v)}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Filters
              </Button>

              <Button
                variant="text"
                startIcon={<ClearOutlinedIcon />}
                onClick={clearAllFilters}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Reset
              </Button>
            </Stack>
          </Stack>

          <Collapse in={showFilters}>
            <Divider sx={{ my: 1 }} />

            <Stack spacing={1.4}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="statuses-label">Statuses</InputLabel>
                  <Select
                    labelId="statuses-label"
                    label="Statuses"
                    multiple
                    value={statuses}
                    onChange={(e) => setStatuses(e.target.value as string[])}
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="methods-label">Methods</InputLabel>
                  <Select
                    labelId="methods-label"
                    label="Methods"
                    multiple
                    value={methods}
                    onChange={(e) => setMethods(e.target.value as string[])}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <MenuItem key={m} value={m}>
                        {m}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField value={minAmount} onChange={(e) => setMinAmount(e.target.value)} label="Min amount" size="small" fullWidth />
                <TextField value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} label="Max amount" size="small" fullWidth />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={paidFrom}
                  onChange={(e) => setPaidFrom(e.target.value)}
                  label="Paid from (ISO)"
                  placeholder="2026-02-01T00:00:00"
                  size="small"
                  fullWidth
                />
                <TextField
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  label="Paid to (ISO)"
                  placeholder="2026-02-10T23:59:59"
                  size="small"
                  fullWidth
                />
              </Stack>

              <FormControlLabel
                control={<Switch checked={hasFailureReason === true} onChange={(e) => setHasFailureReason(e.target.checked ? true : null)} />}
                label="Has failure reason"
              />
            </Stack>
          </Collapse>

          {activeFilterChips.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {activeFilterChips.map((c) => (
                  <Chip key={c.key} label={c.label} onDelete={c.onDelete} size="small" />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </Card>

      {/* List */}
      {!error && visibleItems.length === 0 ? (
        <Alert severity="info">No payments found.</Alert>
      ) : (
        <Stack spacing={2}>
          {visibleItems.map((p) => (
            <Card key={p.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2.25 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={1.25}
                >
                  <Box sx={{ minWidth: 320 }}>
                    <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                      Payment {p.id}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Order ID: {p.orderId}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Failure reason: {p.failureReason || "—"}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip label={`Status: ${p.status ?? "—"}`} color={statusColor(p.status)} variant="outlined" />
                    <Chip label={`Method: ${p.paymentMethod ?? "—"}`} variant="outlined" />
                    <Chip label={`Amount: ${formatMoney(p.amount)}`} variant="outlined" />
                    <Chip label={`Paid at: ${p.paidAt ? formatDate(p.paidAt) : "—"}`} variant="outlined" />
                  </Stack>
                </Stack>

                <Divider sx={{ my: 1.75 }} />

                <Stack direction="row" justifyContent="flex-end">
                  <Button variant="contained" size="small" onClick={() => openOrder(p.orderId)} sx={{ borderRadius: 2 }}>
                    Open order
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ py: 1 }}>
          <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} shape="rounded" />
        </Stack>
      )}
    </Stack>
  );
}
