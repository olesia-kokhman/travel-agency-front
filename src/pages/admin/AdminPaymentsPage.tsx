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
import { useTranslation } from "react-i18next";

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

function statusColor(status?: string | null): "success" | "warning" | "default" {
  const s = (status ?? "").toUpperCase();
  if (!s) return "default";
  if (s === "SUCCESS") return "success";
  return "warning";
}

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const NA = t("common.na");

  const navigate = useNavigate();

  // optional "search in current page"
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

  const formatDate = (value?: string | null) => {
    if (!value) return NA;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const formatMoney = (v: any) => {
    if (v === null || v === undefined) return NA;
    const n = typeof v === "string" ? Number(v) : v;
    if (Number.isFinite(n)) return n.toFixed(2);
    return String(v);
  };

  const labelPaymentStatus = (status?: string | null) => {
    const s = (status ?? "").toUpperCase();
    return s ? t(`enums.paymentStatus.${s}`, s) : NA;
  };

  const labelPaymentMethod = (method?: string | null) => {
    const m = (method ?? "").toUpperCase();
    return m ? t(`enums.paymentMethod.${m}`, m) : NA;
  };

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
        t("pages.adminPayments.errors.load");

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

    if (statuses.length)
      chips.push({
        key: "st",
        label: t("pages.adminPayments.chips.statuses", { value: statuses.join(", ") }),
        onDelete: () => setStatuses([]),
      });

    if (methods.length)
      chips.push({
        key: "m",
        label: t("pages.adminPayments.chips.methods", { value: methods.join(", ") }),
        onDelete: () => setMethods([]),
      });

    if (minAmount.trim())
      chips.push({
        key: "min",
        label: t("pages.adminPayments.chips.min", { value: minAmount }),
        onDelete: () => setMinAmount(""),
      });

    if (maxAmount.trim())
      chips.push({
        key: "max",
        label: t("pages.adminPayments.chips.max", { value: maxAmount }),
        onDelete: () => setMaxAmount(""),
      });

    if (paidFrom.trim())
      chips.push({
        key: "from",
        label: t("pages.adminPayments.chips.paidFrom", { value: paidFrom }),
        onDelete: () => setPaidFrom(""),
      });

    if (paidTo.trim())
      chips.push({
        key: "to",
        label: t("pages.adminPayments.chips.paidTo", { value: paidTo }),
        onDelete: () => setPaidTo(""),
      });

    if (typeof hasFailureReason === "boolean")
      chips.push({
        key: "fail",
        label: t("pages.adminPayments.chips.hasFailureReason", { value: String(hasFailureReason) }),
        onDelete: () => setHasFailureReason(null),
      });

    return chips;
  }, [statuses, methods, minAmount, maxAmount, paidFrom, paidTo, hasFailureReason, t]);

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
            {t("pages.adminPayments.title")}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {(loading ? t("pages.adminPayments.meta.loading") : t("pages.adminPayments.meta.found", { count: totalElements }))}{" "}
            • {t("pages.adminPayments.meta.pageOf", { page: page + 1, total: totalPages })}
          </Typography>
        </Box>

        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          label={t("pages.adminPayments.search.label")}
          placeholder={t("pages.adminPayments.search.placeholder")}
          fullWidth
        />
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Toolbar */}
      <Card sx={{ borderRadius: 3, p: 2 }}>
        <Stack spacing={1.6}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="sort-label">{t("pages.adminPayments.toolbar.sort")}</InputLabel>
              <Select
                labelId="sort-label"
                label={t("pages.adminPayments.toolbar.sort")}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
              >
                <MenuItem value="PAID_DESC">{t("pages.adminPayments.sort.paidDesc")}</MenuItem>
                <MenuItem value="PAID_ASC">{t("pages.adminPayments.sort.paidAsc")}</MenuItem>
                <MenuItem value="AMOUNT_DESC">{t("pages.adminPayments.sort.amountDesc")}</MenuItem>
                <MenuItem value="AMOUNT_ASC">{t("pages.adminPayments.sort.amountAsc")}</MenuItem>
                <MenuItem value="STATUS_ASC">{t("pages.adminPayments.sort.statusAsc")}</MenuItem>
                <MenuItem value="STATUS_DESC">{t("pages.adminPayments.sort.statusDesc")}</MenuItem>
                <MenuItem value="METHOD_ASC">{t("pages.adminPayments.sort.methodAsc")}</MenuItem>
                <MenuItem value="METHOD_DESC">{t("pages.adminPayments.sort.methodDesc")}</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="size-label">{t("pages.adminPayments.toolbar.perPage")}</InputLabel>
              <Select
                labelId="size-label"
                label={t("pages.adminPayments.toolbar.perPage")}
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
                {t("pages.adminPayments.toolbar.filters")}
              </Button>

              <Button
                variant="text"
                startIcon={<ClearOutlinedIcon />}
                onClick={clearAllFilters}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                {t("pages.adminPayments.toolbar.reset")}
              </Button>
            </Stack>
          </Stack>

          <Collapse in={showFilters}>
            <Divider sx={{ my: 1 }} />

            <Stack spacing={1.4}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="statuses-label">{t("pages.adminPayments.filters.statuses")}</InputLabel>
                  <Select
                    labelId="statuses-label"
                    label={t("pages.adminPayments.filters.statuses")}
                    multiple
                    value={statuses}
                    onChange={(e) => setStatuses(e.target.value as string[])}
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {labelPaymentStatus(s)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="methods-label">{t("pages.adminPayments.filters.methods")}</InputLabel>
                  <Select
                    labelId="methods-label"
                    label={t("pages.adminPayments.filters.methods")}
                    multiple
                    value={methods}
                    onChange={(e) => setMethods(e.target.value as string[])}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <MenuItem key={m} value={m}>
                        {labelPaymentMethod(m)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  label={t("pages.adminPayments.filters.minAmount")}
                  size="small"
                  fullWidth
                />
                <TextField
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  label={t("pages.adminPayments.filters.maxAmount")}
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={paidFrom}
                  onChange={(e) => setPaidFrom(e.target.value)}
                  label={t("pages.adminPayments.filters.paidFrom")}
                  placeholder={t("pages.adminPayments.filters.paidFromPlaceholder")}
                  size="small"
                  fullWidth
                />
                <TextField
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  label={t("pages.adminPayments.filters.paidTo")}
                  placeholder={t("pages.adminPayments.filters.paidToPlaceholder")}
                  size="small"
                  fullWidth
                />
              </Stack>

              <FormControlLabel
                control={
                  <Switch
                    checked={hasFailureReason === true}
                    onChange={(e) => setHasFailureReason(e.target.checked ? true : null)}
                  />
                }
                label={t("pages.adminPayments.filters.hasFailureReason")}
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
        <Alert severity="info">{t("pages.adminPayments.list.empty")}</Alert>
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
                      {t("pages.adminPayments.list.paymentTitle", { id: p.id })}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {t("pages.adminPayments.list.orderId", { id: p.orderId })}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t("pages.adminPayments.list.failureReason", { value: p.failureReason || NA })}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip
                      label={t("pages.adminPayments.badges.status", { value: labelPaymentStatus(p.status) })}
                      color={statusColor(p.status)}
                      variant="outlined"
                    />
                    <Chip
                      label={t("pages.adminPayments.badges.method", { value: labelPaymentMethod(p.paymentMethod) })}
                      variant="outlined"
                    />
                    <Chip
                      label={t("pages.adminPayments.badges.amount", { value: formatMoney(p.amount) })}
                      variant="outlined"
                    />
                    <Chip
                      label={t("pages.adminPayments.badges.paidAt", { value: p.paidAt ? formatDate(p.paidAt) : NA })}
                      variant="outlined"
                    />
                  </Stack>
                </Stack>

                <Divider sx={{ my: 1.75 }} />

                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => openOrder(p.orderId)}
                    sx={{ borderRadius: 2 }}
                  >
                    {t("pages.adminPayments.list.openOrder")}
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
