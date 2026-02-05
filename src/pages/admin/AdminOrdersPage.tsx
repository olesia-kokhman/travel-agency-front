// src/pages/admin/AdminOrdersPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
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
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import * as ordersApi from "../../api/orders.api";
import type { AdminOrderResponseDto } from "../../api/orders.api";
import { useAuth } from "../../auth/AuthContext";

const ORDER_STATUSES = ["CREATED", "PAID", "CANCELED"] as const;

type SortOption =
  | "CREATED_DESC"
  | "CREATED_ASC"
  | "TOTAL_ASC"
  | "TOTAL_DESC"
  | "STATUS_ASC"
  | "STATUS_DESC"
  | "ORDERNO_ASC"
  | "ORDERNO_DESC";

function sortToPageable(sort: SortOption): { property: string; direction: "asc" | "desc" } | null {
  switch (sort) {
    case "CREATED_DESC":
      return { property: "createdAt", direction: "desc" };
    case "CREATED_ASC":
      return { property: "createdAt", direction: "asc" };
    case "TOTAL_ASC":
      return { property: "totalAmount", direction: "asc" };
    case "TOTAL_DESC":
      return { property: "totalAmount", direction: "desc" };
    case "STATUS_ASC":
      return { property: "status", direction: "asc" };
    case "STATUS_DESC":
      return { property: "status", direction: "desc" };
    case "ORDERNO_ASC":
      return { property: "orderNumber", direction: "asc" };
    case "ORDERNO_DESC":
      return { property: "orderNumber", direction: "desc" };
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

function formatMoney(v: any, na: string) {
  if (v === null || v === undefined) return na;
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

function formatDate(value: string | null | undefined, na: string) {
  if (!value) return na;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function userLabel(o: AdminOrderResponseDto, na: string) {
  const u = o.user;
  const full = `${u?.name ?? ""} ${u?.surname ?? ""}`.trim();
  return u?.email || full || na;
}

function paymentChipColor(status?: string | null): "success" | "warning" | "default" {
  const s = (status ?? "").toUpperCase();
  if (!s) return "default";
  if (s === "SUCCESS") return "success";
  return "warning";
}

function orderChipColor(status?: string | null): "success" | "warning" | "default" {
  const s = (status ?? "").toUpperCase();
  if (!s) return "default";
  if (s === "PAID") return "success";
  if (s === "CANCELED" || s === "CANCELLED") return "warning";
  return "default";
}

function isCanceled(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  return s === "CANCELED" || s === "CANCELLED";
}

function normalizeRole(r: string) {
  return (r ?? "").trim().toUpperCase();
}
function hasRole(userRoles: string[], role: string) {
  const target = normalizeRole(role);
  return (userRoles ?? []).some((r) => {
    const rr = normalizeRole(r);
    return rr === target || rr === `ROLE_${target}` || rr.replace(/^ROLE_/, "") === target;
  });
}

function isNonEmpty(v?: string | null) {
  return !!v && v.trim().length > 0;
}

export default function AdminOrdersPage() {
  const { t } = useTranslation();
  const na = t("common.na");

  const navigate = useNavigate();
  const auth = useAuth();
  const isManager = useMemo(() => hasRole(auth.roles ?? [], "MANAGER"), [auth.roles]);

  // search (client-side) on current server page
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 300);

  // server-side filters
  const [showFilters, setShowFilters] = useState(false);

  const [statuses, setStatuses] = useState<string[]>([]);
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const [hasPayment, setHasPayment] = useState<boolean | null>(null);
  const [hasReview, setHasReview] = useState<boolean | null>(null);

  const [sort, setSort] = useState<SortOption>("CREATED_DESC");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // data
  const [orders, setOrders] = useState<AdminOrderResponseDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const requestSeq = useRef(0);

  const filter = useMemo<ordersApi.OrderFilter>(() => {
    const f: ordersApi.OrderFilter = {};

    if (statuses.length) f.statuses = statuses;

    if (isNonEmpty(minTotal)) f.minTotalAmount = minTotal.trim();
    if (isNonEmpty(maxTotal)) f.maxTotalAmount = maxTotal.trim();

    if (isNonEmpty(createdFrom)) f.createdFrom = createdFrom.trim();
    if (isNonEmpty(createdTo)) f.createdTo = createdTo.trim();

    if (typeof hasPayment === "boolean") f.hasPayment = hasPayment;
    if (typeof hasReview === "boolean") f.hasReview = hasReview;

    return f;
  }, [statuses, minTotal, maxTotal, createdFrom, createdTo, hasPayment, hasReview]);

  const load = async () => {
    const seq = ++requestSeq.current;

    setError(null);
    setLoading(true);
    try {
      const res = await ordersApi.getOrdersPageAdmin({
        filter,
        page,
        size,
        sort: sortToPageable(sort),
      });

      if (seq !== requestSeq.current) return;

      setOrders(res.results ?? []);
      setTotalPages(Math.max(1, res.totalPages ?? 1));
      setTotalElements(res.totalElements ?? 0);
    } catch (err: any) {
      if (seq !== requestSeq.current) return;

      const msg =
        err?.response?.data?.statusMessage ??
        err?.response?.data?.message ??
        t("pages.adminOrders.errors.load");

      setError(msg);
      setOrders([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  // reset page when filters/sort/size change
  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, size]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, page, size]);

  const filteredPage = useMemo(() => {
    const query = normalize(qDebounced);
    if (!query) return orders;

    return orders.filter((o) => {
      const orderNumber = normalize(o.orderNumber);
      const status = normalize(o.status);
      const tourId = normalize(o.tourId);

      const u = o.user;
      const email = normalize(u?.email ?? "");
      const name = normalize(`${u?.name ?? ""} ${u?.surname ?? ""}`.trim());

      const paymentStatus = normalize(o.payment?.status ?? "");
      const paymentMethod = normalize(o.payment?.paymentMethod ?? "");

      const reviewComment = normalize(o.review?.comment ?? "");
      const reviewRating = o.review?.rating != null ? String(o.review.rating) : "";

      return (
        orderNumber.includes(query) ||
        status.includes(query) ||
        tourId.includes(query) ||
        email.includes(query) ||
        name.includes(query) ||
        paymentStatus.includes(query) ||
        paymentMethod.includes(query) ||
        reviewComment.includes(query) ||
        reviewRating.includes(query)
      );
    });
  }, [orders, qDebounced]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];

    if (statuses.length)
      chips.push({
        key: "statuses",
        label: t("pages.adminOrders.chips.statuses", { value: statuses.join(", ") }),
        onDelete: () => setStatuses([]),
      });

    if (isNonEmpty(minTotal))
      chips.push({
        key: "minTotal",
        label: t("pages.adminOrders.chips.minTotal", { value: minTotal }),
        onDelete: () => setMinTotal(""),
      });

    if (isNonEmpty(maxTotal))
      chips.push({
        key: "maxTotal",
        label: t("pages.adminOrders.chips.maxTotal", { value: maxTotal }),
        onDelete: () => setMaxTotal(""),
      });

    if (isNonEmpty(createdFrom))
      chips.push({
        key: "createdFrom",
        label: t("pages.adminOrders.chips.createdFrom", { value: createdFrom }),
        onDelete: () => setCreatedFrom(""),
      });

    if (isNonEmpty(createdTo))
      chips.push({
        key: "createdTo",
        label: t("pages.adminOrders.chips.createdTo", { value: createdTo }),
        onDelete: () => setCreatedTo(""),
      });

    if (typeof hasPayment === "boolean")
      chips.push({
        key: "hasPayment",
        label: t("pages.adminOrders.chips.hasPayment", { value: String(hasPayment) }),
        onDelete: () => setHasPayment(null),
      });

    if (typeof hasReview === "boolean")
      chips.push({
        key: "hasReview",
        label: t("pages.adminOrders.chips.hasReview", { value: String(hasReview) }),
        onDelete: () => setHasReview(null),
      });

    return chips;
  }, [statuses, minTotal, maxTotal, createdFrom, createdTo, hasPayment, hasReview, t]);

  const clearAllFilters = () => {
    setStatuses([]);
    setMinTotal("");
    setMaxTotal("");
    setCreatedFrom("");
    setCreatedTo("");
    setHasPayment(null);
    setHasReview(null);
  };

  const handleOpen = (orderId: string) => {
    navigate(`/admin/orders/${orderId}`);
  };

  const handleCancel = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (!confirm(t("pages.adminOrders.confirm.cancel"))) return;

    setBusyId(orderId);
    setError(null);
    try {
      await ordersApi.updateOrderStatusAdmin(orderId, { status: "CANCELED" });
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminOrders.errors.cancel");
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (!confirm(t("pages.adminOrders.confirm.delete"))) return;

    setBusyId(orderId);
    setError(null);
    try {
      await ordersApi.deleteOrderAdmin(orderId);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.adminOrders.errors.delete");
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress />
          <Typography variant="body2">{t("pages.adminOrders.states.loading")}</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Header */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
            {t("pages.adminOrders.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("pages.adminOrders.subtitle", { total: totalElements, page: page + 1, pages: totalPages })}
          </Typography>
        </Box>

        {/* client-side search only on current page */}
        <TextField
          fullWidth
          size="small"
          label={t("pages.adminOrders.search.label")}
          placeholder={t("pages.adminOrders.search.placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Stack>

      {/* Toolbar */}
      <Card sx={{ borderRadius: 3, p: 2 }}>
        <Stack spacing={1.6}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="sort-label">{t("pages.adminOrders.toolbar.sort")}</InputLabel>
              <Select
                labelId="sort-label"
                label={t("pages.adminOrders.toolbar.sort")}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
              >
                <MenuItem value="CREATED_DESC">{t("pages.adminOrders.sortOptions.CREATED_DESC")}</MenuItem>
                <MenuItem value="CREATED_ASC">{t("pages.adminOrders.sortOptions.CREATED_ASC")}</MenuItem>
                <MenuItem value="TOTAL_ASC">{t("pages.adminOrders.sortOptions.TOTAL_ASC")}</MenuItem>
                <MenuItem value="TOTAL_DESC">{t("pages.adminOrders.sortOptions.TOTAL_DESC")}</MenuItem>
                <MenuItem value="STATUS_ASC">{t("pages.adminOrders.sortOptions.STATUS_ASC")}</MenuItem>
                <MenuItem value="STATUS_DESC">{t("pages.adminOrders.sortOptions.STATUS_DESC")}</MenuItem>
                <MenuItem value="ORDERNO_ASC">{t("pages.adminOrders.sortOptions.ORDERNO_ASC")}</MenuItem>
                <MenuItem value="ORDERNO_DESC">{t("pages.adminOrders.sortOptions.ORDERNO_DESC")}</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="size-label">{t("pages.adminOrders.toolbar.perPage")}</InputLabel>
              <Select
                labelId="size-label"
                label={t("pages.adminOrders.toolbar.perPage")}
                value={String(size)}
                onChange={(e) => setSize(Number(e.target.value))}
              >
                <MenuItem value="5">5</MenuItem>
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
                {t("pages.adminOrders.toolbar.filters")}
              </Button>

              <Button
                variant="text"
                startIcon={<ClearOutlinedIcon />}
                onClick={clearAllFilters}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                {t("pages.adminOrders.toolbar.reset")}
              </Button>
            </Stack>
          </Stack>

          <Collapse in={showFilters}>
            <Divider sx={{ my: 1 }} />

            <Stack spacing={1.4}>
              <FormControl size="small" fullWidth>
                <InputLabel id="statuses-label">{t("pages.adminOrders.filters.statuses")}</InputLabel>
                <Select
                  labelId="statuses-label"
                  label={t("pages.adminOrders.filters.statuses")}
                  multiple
                  value={statuses}
                  onChange={(e) => setStatuses(e.target.value as string[])}
                >
                  {ORDER_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={minTotal}
                  onChange={(e) => setMinTotal(e.target.value)}
                  label={t("pages.adminOrders.filters.minTotal")}
                  size="small"
                  fullWidth
                />
                <TextField
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  label={t("pages.adminOrders.filters.maxTotal")}
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  label={t("pages.adminOrders.filters.createdFrom")}
                  placeholder={t("pages.adminOrders.filters.createdFromPh")}
                  size="small"
                  fullWidth
                />
                <TextField
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  label={t("pages.adminOrders.filters.createdTo")}
                  placeholder={t("pages.adminOrders.filters.createdToPh")}
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={hasPayment === true}
                      onChange={(e) => setHasPayment(e.target.checked ? true : null)}
                    />
                  }
                  label={t("pages.adminOrders.filters.hasPayment")}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={hasReview === true}
                      onChange={(e) => setHasReview(e.target.checked ? true : null)}
                    />
                  }
                  label={t("pages.adminOrders.filters.hasReview")}
                />

                <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: "auto" } }}>
                  {t("pages.adminOrders.filters.tip")}
                </Typography>
              </Stack>
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

      {/* Results meta */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {t("pages.adminOrders.meta.showingOnPage", { count: filteredPage.length })}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {totalPages > 1 && (
          <Typography variant="body2" color="text.secondary">
            {t("pages.adminOrders.meta.pageOf", { page: page + 1, pages: totalPages })}
          </Typography>
        )}
      </Stack>

      {/* List */}
      {filteredPage.length === 0 ? (
        <Alert severity="info">{t("pages.adminOrders.states.empty")}</Alert>
      ) : (
        <Stack spacing={2}>
          {filteredPage.map((o) => {
            const payment = o.payment;
            const review = o.review;
            const busy = busyId === o.id;

            const paymentMethodSuffix = payment?.paymentMethod ? ` (${payment.paymentMethod})` : "";

            return (
              <Card key={o.id} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <CardActionArea onClick={() => handleOpen(o.id)}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                      spacing={1.25}
                    >
                      <Box sx={{ minWidth: 280 }}>
                        <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                          {o.orderNumber}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          {t("pages.adminOrders.card.user", { value: userLabel(o, na) })}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          {t("pages.adminOrders.card.createdUpdated", {
                            created: formatDate(o.createdAt, na),
                            updated: formatDate(o.updatedAt, na),
                          })}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                          label={t("pages.adminOrders.card.orderChip", { value: o.status ?? na })}
                          color={orderChipColor(o.status)}
                          variant="outlined"
                        />
                        <Chip
                          label={t("pages.adminOrders.card.totalChip", { value: formatMoney(o.totalAmount, na) })}
                          variant="outlined"
                        />
                        <Chip
                          label={
                            payment
                              ? t("pages.adminOrders.card.paymentChip", {
                                  status: payment.status ?? na,
                                  method: paymentMethodSuffix,
                                })
                              : t("pages.adminOrders.card.paymentChipNone")
                          }
                          color={payment ? paymentChipColor(payment.status) : "default"}
                          variant="outlined"
                        />
                        <Chip
                          label={
                            review?.rating != null
                              ? t("pages.adminOrders.card.reviewChip", { rating: review.rating })
                              : t("pages.adminOrders.card.reviewChipNone")
                          }
                          color={review?.rating != null ? "info" : "default"}
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>

                    <Divider sx={{ my: 1.75 }} />

                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      justifyContent="space-between"
                    >
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          {t("pages.adminOrders.card.tourId", { value: o.tourId })}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          {t("pages.adminOrders.card.paidAt", {
                            value: payment?.paidAt ? formatDate(payment.paidAt, na) : na,
                          })}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 850 }}>
                          {t("pages.adminOrders.card.review", {
                            value: review?.comment ? review.comment : na,
                          })}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flexShrink: 0 }}>
                        <Button
                          component={RouterLink}
                          to={`/tours/${o.tourId}`}
                          variant="contained"
                          size="small"
                          onClick={(e) => e.stopPropagation()}
                          sx={{ borderRadius: 2 }}
                        >
                          {t("pages.adminOrders.actions.openTour")}
                        </Button>

                        <Button
                          variant="outlined"
                          size="small"
                          disabled={busy || isCanceled(o.status)}
                          onClick={(e) => handleCancel(e, o.id)}
                          sx={{ borderRadius: 2 }}
                        >
                          {t("pages.adminOrders.actions.cancel")}
                        </Button>

                        {!isManager && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={busy}
                            onClick={(e) => handleDelete(e, o.id)}
                            sx={{ borderRadius: 2 }}
                          >
                            {t("pages.adminOrders.actions.delete")}
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ py: 1 }}>
          <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} shape="rounded" />
        </Stack>
      )}
    </Stack>
  );
}
