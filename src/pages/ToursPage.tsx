// src/pages/ToursPage.tsx
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
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import { useNavigate } from "react-router-dom";

import * as toursApi from "../api/tours.api";
import type { TourResponseDto } from "../types/response";
import { useAuth } from "../auth/AuthContext";
import { useTranslation } from "react-i18next";

// ✅ правильні enum values
const TOUR_TYPES = ["REST", "EXCURSION", "SHOPPING"] as const;
const TRANSFER_TYPES = ["CAR", "PLANE", "SHIP"] as const;
const HOTEL_TYPES = ["THREE", "FOUR", "FIVE"] as const;

function normalizeRole(r: string) {
  return (r ?? "").trim().toUpperCase();
}
function hasRole(userRoles: string[], role: string) {
  const target = normalizeRole(role);
  return (userRoles ?? []).some((x) => {
    const rr = normalizeRole(x);
    return rr === target || rr === `ROLE_${target}` || rr.replace(/^ROLE_/, "") === target;
  });
}

function getTourPlaceholderImage(tourId?: string) {
  const seed = tourId?.slice(0, 6) ?? "tour";
  return `https://picsum.photos/seed/${seed}/640/360`;
}

function formatMoney(v: any) {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

function isNonEmpty(v?: string | null) {
  return !!v && v.trim().length > 0;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

type SortOption =
  | "HOT_DESC"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "CHECKIN_ASC"
  | "CHECKIN_DESC"
  | "TITLE_ASC"
  | "TITLE_DESC";

function sortToPageable(sort: SortOption): { property: string; direction: "asc" | "desc" } | null {
  switch (sort) {
    case "PRICE_ASC":
      return { property: "price", direction: "asc" };
    case "PRICE_DESC":
      return { property: "price", direction: "desc" };
    case "CHECKIN_ASC":
      return { property: "checkIn", direction: "asc" };
    case "CHECKIN_DESC":
      return { property: "checkIn", direction: "desc" };
    case "TITLE_ASC":
      return { property: "title", direction: "asc" };
    case "TITLE_DESC":
      return { property: "title", direction: "desc" };
    case "HOT_DESC":
      return { property: "hot", direction: "desc" };
    default:
      return null;
  }
}

export default function ToursPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();

  const isAdmin = useMemo(() => hasRole(auth.roles ?? [], "ADMIN"), [auth.roles]);
  const canHot = useMemo(
    () => hasRole(auth.roles ?? [], "ADMIN") || hasRole(auth.roles ?? [], "MANAGER"),
    [auth.roles]
  );

  // ===== Query state (server-side) =====
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 450);

  const [showFilters, setShowFilters] = useState(false);

  const [types, setTypes] = useState<string[]>([]);
  const [transferTypes, setTransferTypes] = useState<string[]>([]);
  const [hotelTypes, setHotelTypes] = useState<string[]>([]);

  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const [hot, setHot] = useState<boolean | null>(null);
  const [active, setActive] = useState<boolean | null>(true);

  const [minCapacity, setMinCapacity] = useState<string>("");
  const [maxCapacity, setMaxCapacity] = useState<string>("");

  const [sort, setSort] = useState<SortOption>("HOT_DESC");
  const [page, setPage] = useState(0); // 0-based
  const [size, setSize] = useState(6);

  // ===== Data state =====
  const [items, setItems] = useState<TourResponseDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // to ignore stale responses
  const requestSeq = useRef(0);

  const filter = useMemo<toursApi.TourFilter>(() => {
    // важливо: не шлемо пусті строки
    const out: toursApi.TourFilter = {};

    if (isNonEmpty(qDebounced)) out.q = qDebounced.trim();

    if (types.length) out.types = types;
    if (transferTypes.length) out.transferTypes = transferTypes;
    if (hotelTypes.length) out.hotelTypes = hotelTypes;

    if (isNonEmpty(minPrice)) out.minPrice = minPrice.trim();
    if (isNonEmpty(maxPrice)) out.maxPrice = maxPrice.trim();

    if (isNonEmpty(country)) out.country = country.trim();
    if (isNonEmpty(city)) out.city = city.trim();

    if (typeof hot === "boolean") out.hot = hot;
    if (typeof active === "boolean") out.active = active;

    if (isNonEmpty(minCapacity)) out.minCapacity = Number(minCapacity);
    if (isNonEmpty(maxCapacity)) out.maxCapacity = Number(maxCapacity);

    return out;
  }, [
    qDebounced,
    types,
    transferTypes,
    hotelTypes,
    minPrice,
    maxPrice,
    country,
    city,
    hot,
    active,
    minCapacity,
    maxCapacity,
  ]);

  const load = async () => {
    const seq = ++requestSeq.current;

    setError(null);
    setLoading(true);

    try {
      const res = await toursApi.getToursPage({
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
        t("pages.tours.errors.loadFailed");

      setError(msg);
      setItems([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
  
  }, [filter, sort, size]);

  useEffect(() => {
    load();

  }, [filter, sort, page, size]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];

    if (isNonEmpty(qDebounced))
      chips.push({
        key: "q",
        label: t("pages.tours.filters.chips.q", { value: qDebounced.trim() }),
        onDelete: () => setQ(""),
      });

    if (types.length)
      chips.push({
        key: "types",
        label: t("pages.tours.filters.chips.types", { value: types.join(", ") }),
        onDelete: () => setTypes([]),
      });

    if (transferTypes.length)
      chips.push({
        key: "transferTypes",
        label: t("pages.tours.filters.chips.transferTypes", { value: transferTypes.join(", ") }),
        onDelete: () => setTransferTypes([]),
      });

    if (hotelTypes.length)
      chips.push({
        key: "hotelTypes",
        label: t("pages.tours.filters.chips.hotelTypes", { value: hotelTypes.join(", ") }),
        onDelete: () => setHotelTypes([]),
      });

    if (isNonEmpty(minPrice))
      chips.push({
        key: "minPrice",
        label: t("pages.tours.filters.chips.minPrice", { value: minPrice }),
        onDelete: () => setMinPrice(""),
      });

    if (isNonEmpty(maxPrice))
      chips.push({
        key: "maxPrice",
        label: t("pages.tours.filters.chips.maxPrice", { value: maxPrice }),
        onDelete: () => setMaxPrice(""),
      });

    if (isNonEmpty(country))
      chips.push({
        key: "country",
        label: t("pages.tours.filters.chips.country", { value: country }),
        onDelete: () => setCountry(""),
      });

    if (isNonEmpty(city))
      chips.push({
        key: "city",
        label: t("pages.tours.filters.chips.city", { value: city }),
        onDelete: () => setCity(""),
      });

    if (typeof hot === "boolean")
      chips.push({
        key: "hot",
        label: t("pages.tours.filters.chips.hot", { value: String(hot) }),
        onDelete: () => setHot(null),
      });

    if (typeof active === "boolean")
      chips.push({
        key: "active",
        label: t("pages.tours.filters.chips.active", { value: String(active) }),
        onDelete: () => setActive(null),
      });

    if (isNonEmpty(minCapacity))
      chips.push({
        key: "minCapacity",
        label: t("pages.tours.filters.chips.minCapacity", { value: minCapacity }),
        onDelete: () => setMinCapacity(""),
      });

    if (isNonEmpty(maxCapacity))
      chips.push({
        key: "maxCapacity",
        label: t("pages.tours.filters.chips.maxCapacity", { value: maxCapacity }),
        onDelete: () => setMaxCapacity(""),
      });

    return chips;
  }, [
    t,
    qDebounced,
    types,
    transferTypes,
    hotelTypes,
    minPrice,
    maxPrice,
    country,
    city,
    hot,
    active,
    minCapacity,
    maxCapacity,
  ]);

  const clearAllFilters = () => {
    setQ("");
    setTypes([]);
    setTransferTypes([]);
    setHotelTypes([]);
    setMinPrice("");
    setMaxPrice("");
    setCountry("");
    setCity("");
    setHot(null);
    setActive(true);
    setMinCapacity("");
    setMaxCapacity("");
  };

  const handleFavoriteStub = (e: React.MouseEvent, tour: TourResponseDto) => {
    e.stopPropagation();
    e.preventDefault();
    alert(t("pages.tours.alerts.favoriteStub", { title: tour.title }));
  };

  const handleEdit = (e: React.MouseEvent, tourId: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/tours/${tourId}/edit`);
  };

  const handleDelete = async (e: React.MouseEvent, tourId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm(t("pages.tours.confirm.delete"))) return;

    setBusyId(tourId);
    try {
      await toursApi.deleteTour(tourId);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.tours.errors.deleteFailed");
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleHot = async (e: React.MouseEvent, tour: TourResponseDto) => {
    e.stopPropagation();
    e.preventDefault();

    const next = !Boolean(tour.hot);
    const label = next ? t("pages.tours.actions.makeHot") : t("pages.tours.actions.unmakeHot");
    if (!confirm(t("pages.tours.confirm.toggleHot", { action: label, title: tour.title }))) return;

    setBusyId(tour.id);
    try {
      await toursApi.updateTourHot(tour.id, { hot: next });
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.tours.errors.updateHotFailed");
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  const trTourType = (v: any) => t(`enums.tourType.${String(v)}`);
  const trTransferType = (v: any) => t(`enums.transferType.${String(v)}`);
  const trHotelType = (v: any) => t(`enums.hotelType.${String(v)}`);

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">{t("pages.tours.title")}</Typography>

        {isAdmin && (
          <Button
            variant="contained"
            onClick={() => navigate("/tours/new")}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            {t("pages.tours.actions.addTour")}
          </Button>
        )}
      </Stack>

      {/* Toolbar */}
      <Card sx={{ borderRadius: 3, p: 2 }}>
        <Stack spacing={1.6}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ md: "center" }}>
            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              label={t("pages.tours.search.label")}
              placeholder={t("pages.tours.search.placeholder")}
              fullWidth
              size="small"
            />

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="sort-label">{t("pages.tours.sort.label")}</InputLabel>
              <Select
                labelId="sort-label"
                label={t("pages.tours.sort.label")}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
              >
                <MenuItem value="HOT_DESC">{t("pages.tours.sort.hotFirst")}</MenuItem>
                <MenuItem value="PRICE_ASC">{t("pages.tours.sort.priceAsc")}</MenuItem>
                <MenuItem value="PRICE_DESC">{t("pages.tours.sort.priceDesc")}</MenuItem>
                <MenuItem value="CHECKIN_ASC">{t("pages.tours.sort.checkInAsc")}</MenuItem>
                <MenuItem value="CHECKIN_DESC">{t("pages.tours.sort.checkInDesc")}</MenuItem>
                <MenuItem value="TITLE_ASC">{t("pages.tours.sort.titleAsc")}</MenuItem>
                <MenuItem value="TITLE_DESC">{t("pages.tours.sort.titleDesc")}</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="size-label">{t("pages.tours.pagination.perPage")}</InputLabel>
              <Select
                labelId="size-label"
                label={t("pages.tours.pagination.perPage")}
                value={String(size)}
                onChange={(e) => setSize(Number(e.target.value))}
              >
                <MenuItem value="6">6</MenuItem>
                <MenuItem value="9">9</MenuItem>
                <MenuItem value="12">12</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant={showFilters ? "contained" : "outlined"}
                startIcon={<FilterAltOutlinedIcon />}
                onClick={() => setShowFilters((v) => !v)}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                {t("pages.tours.filters.toggle")}
              </Button>

              <Button
                variant="text"
                startIcon={<ClearOutlinedIcon />}
                onClick={clearAllFilters}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                {t("pages.tours.filters.reset")}
              </Button>
            </Stack>
          </Stack>

          <Collapse in={showFilters}>
            <Divider sx={{ my: 1 }} />

            <Stack spacing={1.4}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  label={t("pages.tours.filters.country")}
                  size="small"
                  fullWidth
                />
                <TextField
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  label={t("pages.tours.filters.city")}
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  label={t("pages.tours.filters.minPrice")}
                  size="small"
                  fullWidth
                />
                <TextField
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  label={t("pages.tours.filters.maxPrice")}
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                  label={t("pages.tours.filters.minCapacity")}
                  size="small"
                  fullWidth
                />
                <TextField
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  label={t("pages.tours.filters.maxCapacity")}
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="types-label">{t("pages.tours.filters.tourTypes")}</InputLabel>
                  <Select
                    labelId="types-label"
                    label={t("pages.tours.filters.tourTypes")}
                    multiple
                    value={types}
                    onChange={(e) => setTypes(e.target.value as string[])}
                  >
                    {TOUR_TYPES.map((x) => (
                      <MenuItem key={x} value={x}>
                        {trTourType(x)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="transfer-label">{t("pages.tours.filters.transferTypes")}</InputLabel>
                  <Select
                    labelId="transfer-label"
                    label={t("pages.tours.filters.transferTypes")}
                    multiple
                    value={transferTypes}
                    onChange={(e) => setTransferTypes(e.target.value as string[])}
                  >
                    {TRANSFER_TYPES.map((x) => (
                      <MenuItem key={x} value={x}>
                        {trTransferType(x)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="hotel-label">{t("pages.tours.filters.hotelTypes")}</InputLabel>
                  <Select
                    labelId="hotel-label"
                    label={t("pages.tours.filters.hotelTypes")}
                    multiple
                    value={hotelTypes}
                    onChange={(e) => setHotelTypes(e.target.value as string[])}
                  >
                    {HOTEL_TYPES.map((x) => (
                      <MenuItem key={x} value={x}>
                        {trHotelType(x)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch checked={hot === true} onChange={(e) => setHot(e.target.checked ? true : null)} />
                  }
                  label={t("pages.tours.filters.hotOnly")}
                />

                <FormControlLabel
                  control={
                    <Switch checked={active === true} onChange={(e) => setActive(e.target.checked ? true : null)} />
                  }
                  label={t("pages.tours.filters.activeOnly")}
                />

                <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: "auto" } }}>
                  {t("pages.tours.filters.tip")}
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

      {error && <Alert severity="error">{error}</Alert>}

      {/* Results meta */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {loading ? t("common.loading") : t("pages.tours.results.found", { count: totalElements })}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {!loading && totalPages > 1 && (
          <Typography variant="body2" color="text.secondary">
            {t("pages.tours.pagination.pageOf", { page: page + 1, total: totalPages })}
          </Typography>
        )}
      </Stack>

      {/* Grid */}
      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("pages.tours.loadingList")}
          </Typography>
        </Stack>
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr" } }}>
          {items.map((tour) => {
            const busy = busyId === tour.id;

            return (
              <Card
                key={tour.id}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  transition: "transform .15s ease, box-shadow .15s ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: "0 16px 40px rgba(0,0,0,0.12)" },
                }}
              >
                <CardActionArea onClick={() => navigate(`/tours/${tour.id}`)} sx={{ p: 0 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "260px 1fr" } }}>
                    {/* Image */}
                    <Box
                      sx={{
                        position: "relative",
                        minHeight: { xs: 180, sm: "100%" },
                        backgroundImage: `url(${getTourPlaceholderImage(tour.id)})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.35) 100%)",
                        }}
                      />

                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ position: "absolute", top: 12, left: 12, right: 12 }}
                        alignItems="center"
                      >
                        {tour.hot && <Chip label={t("pages.tours.badges.hot")} color="error" size="small" />}
                        {!tour.active && <Chip label={t("pages.tours.badges.inactive")} size="small" />}

                        <Box sx={{ flexGrow: 1 }} />

                        <IconButton
                          onClick={(e) => handleFavoriteStub(e, tour)}
                          sx={{ bgcolor: "rgba(255,255,255,0.9)", "&:hover": { bgcolor: "rgba(255,255,255,1)" } }}
                          size="small"
                        >
                          <FavoriteBorderIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>

                    {/* Content */}
                    <CardContent sx={{ p: 2.2 }}>
                      <Stack spacing={1.2}>
                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                          <Typography
                            variant="h6"
                            sx={{
                              flexGrow: 1,
                              lineHeight: 1.2,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {tour.title}
                          </Typography>

                          {/* Actions */}
                          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                            {canHot && (
                              <Button
                                onClick={(e) => handleToggleHot(e, tour)}
                                disabled={busy}
                                size="small"
                                variant={tour.hot ? "outlined" : "contained"}
                                color={tour.hot ? "inherit" : "error"}
                                sx={{ borderRadius: 2, textTransform: "none", px: 1.2 }}
                              >
                                {tour.hot ? t("pages.tours.actions.unmakeHot") : t("pages.tours.actions.makeHot")}
                              </Button>
                            )}

                            {isAdmin && (
                              <>
                                <Button
                                  onClick={(e) => handleEdit(e, tour.id)}
                                  disabled={busy}
                                  size="small"
                                  variant="outlined"
                                  sx={{ borderRadius: 2, textTransform: "none", px: 1.2 }}
                                >
                                  {t("common.edit")}
                                </Button>

                                <Button
                                  onClick={(e) => handleDelete(e, tour.id)}
                                  disabled={busy}
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  sx={{ borderRadius: 2, textTransform: "none", px: 1.2 }}
                                >
                                  {t("common.delete")}
                                </Button>
                              </>
                            )}
                          </Stack>
                        </Stack>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: { xs: 2, sm: 3 },
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {tour.shortDescription}
                        </Typography>

                        <Divider />

                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1.4}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            <PaidOutlinedIcon fontSize="small" />
                            <Typography variant="body2">
                              <b>{formatMoney(tour.price)}</b>
                            </Typography>
                          </Stack>

                          <Stack direction="row" spacing={0.6} alignItems="center">
                            <LocationOnOutlinedIcon fontSize="small" />
                            <Typography variant="body2">
                              {tour.country}, {tour.city}
                            </Typography>
                          </Stack>
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip label={trTourType(tour.tourType)} size="small" />
                          <Chip label={trTransferType(tour.transferType)} size="small" />
                          <Chip label={trHotelType(tour.hotelType)} size="small" />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}

      {!loading && !error && items.length === 0 && (
        <Typography variant="body2">{t("pages.tours.empty")}</Typography>
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
