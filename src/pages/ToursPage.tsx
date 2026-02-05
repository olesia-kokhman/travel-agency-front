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
  const [active, setActive] = useState<boolean | null>(true); // дефолт: показуємо активні

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
        "Failed to load tours";

      setError(msg);
      setItems([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  // при зміні filter/sort/size — повертаємось на першу сторінку
  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, size]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, page, size]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];

    if (isNonEmpty(qDebounced)) chips.push({ key: "q", label: `q: ${qDebounced.trim()}`, onDelete: () => setQ("") });

    if (types.length) chips.push({ key: "types", label: `types: ${types.join(", ")}`, onDelete: () => setTypes([]) });
    if (transferTypes.length)
      chips.push({
        key: "transferTypes",
        label: `transfer: ${transferTypes.join(", ")}`,
        onDelete: () => setTransferTypes([]),
      });
    if (hotelTypes.length)
      chips.push({ key: "hotelTypes", label: `hotel: ${hotelTypes.join(", ")}`, onDelete: () => setHotelTypes([]) });

    if (isNonEmpty(minPrice)) chips.push({ key: "minPrice", label: `minPrice: ${minPrice}`, onDelete: () => setMinPrice("") });
    if (isNonEmpty(maxPrice)) chips.push({ key: "maxPrice", label: `maxPrice: ${maxPrice}`, onDelete: () => setMaxPrice("") });

    if (isNonEmpty(country)) chips.push({ key: "country", label: `country: ${country}`, onDelete: () => setCountry("") });
    if (isNonEmpty(city)) chips.push({ key: "city", label: `city: ${city}`, onDelete: () => setCity("") });

    if (typeof hot === "boolean") chips.push({ key: "hot", label: `hot: ${hot}`, onDelete: () => setHot(null) });
    if (typeof active === "boolean") chips.push({ key: "active", label: `active: ${active}`, onDelete: () => setActive(null) });

    if (isNonEmpty(minCapacity))
      chips.push({ key: "minCapacity", label: `minCap: ${minCapacity}`, onDelete: () => setMinCapacity("") });
    if (isNonEmpty(maxCapacity))
      chips.push({ key: "maxCapacity", label: `maxCap: ${maxCapacity}`, onDelete: () => setMaxCapacity("") });

    return chips;
  }, [qDebounced, types, transferTypes, hotelTypes, minPrice, maxPrice, country, city, hot, active, minCapacity, maxCapacity]);

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
    alert(`(Stub) Added to favorites: ${tour.title}`);
  };

  const handleEdit = (e: React.MouseEvent, tourId: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/tours/${tourId}/edit`);
  };

  const handleDelete = async (e: React.MouseEvent, tourId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm("Delete this tour?")) return;

    setBusyId(tourId);
    try {
      await toursApi.deleteTour(tourId);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to delete tour";
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleHot = async (e: React.MouseEvent, tour: TourResponseDto) => {
    e.stopPropagation();
    e.preventDefault();

    const next = !Boolean(tour.hot);
    const label = next ? "Make HOT" : "Remove HOT";
    if (!confirm(`${label} for "${tour.title}"?`)) return;

    setBusyId(tour.id);
    try {
      await toursApi.updateTourHot(tour.id, { hot: next });
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to update HOT";
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Tours</Typography>

        {isAdmin && (
          <Button
            variant="contained"
            onClick={() => navigate("/tours/new")}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            + Add tour
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
              label="Search"
              placeholder="title/description…"
              fullWidth
              size="small"
            />

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="sort-label">Sort</InputLabel>
              <Select
                labelId="sort-label"
                label="Sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
              >
                <MenuItem value="HOT_DESC">Hot first</MenuItem>
                <MenuItem value="PRICE_ASC">Price: low → high</MenuItem>
                <MenuItem value="PRICE_DESC">Price: high → low</MenuItem>
                <MenuItem value="CHECKIN_ASC">Check-in: early → late</MenuItem>
                <MenuItem value="CHECKIN_DESC">Check-in: late → early</MenuItem>
                <MenuItem value="TITLE_ASC">Title: A → Z</MenuItem>
                <MenuItem value="TITLE_DESC">Title: Z → A</MenuItem>
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
                <TextField
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  label="Country"
                  size="small"
                  fullWidth
                />
                <TextField
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  label="City"
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  label="Min price"
                  size="small"
                  fullWidth
                />
                <TextField
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  label="Max price"
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <TextField
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                  label="Min capacity"
                  size="small"
                  fullWidth
                />
                <TextField
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  label="Max capacity"
                  size="small"
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="types-label">Tour types</InputLabel>
                  <Select
                    labelId="types-label"
                    label="Tour types"
                    multiple
                    value={types}
                    onChange={(e) => setTypes(e.target.value as string[])}
                  >
                    {TOUR_TYPES.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="transfer-label">Transfer types</InputLabel>
                  <Select
                    labelId="transfer-label"
                    label="Transfer types"
                    multiple
                    value={transferTypes}
                    onChange={(e) => setTransferTypes(e.target.value as string[])}
                  >
                    {TRANSFER_TYPES.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="hotel-label">Hotel types</InputLabel>
                  <Select
                    labelId="hotel-label"
                    label="Hotel types"
                    multiple
                    value={hotelTypes}
                    onChange={(e) => setHotelTypes(e.target.value as string[])}
                  >
                    {HOTEL_TYPES.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={hot === true}
                      onChange={(e) => setHot(e.target.checked ? true : null)}
                    />
                  }
                  label="Hot only"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={active === true}
                      onChange={(e) => setActive(e.target.checked ? true : null)}
                    />
                  }
                  label="Active only"
                />

                <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: "auto" } }}>
                  Tip: leave a switch off to not filter by that field.
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
          {loading ? "Loading…" : `Found: ${totalElements}`}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {!loading && totalPages > 1 && (
          <Typography variant="body2" color="text.secondary">
            Page {page + 1} / {totalPages}
          </Typography>
        )}
      </Stack>

      {/* Grid */}
      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Loading tours…
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
                        {tour.hot && <Chip label="HOT" color="error" size="small" />}
                        {!tour.active && <Chip label="Inactive" size="small" />}

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
                                {tour.hot ? "Unmake HOT" : "Make HOT"}
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
                                  Edit
                                </Button>

                                <Button
                                  onClick={(e) => handleDelete(e, tour.id)}
                                  disabled={busy}
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  sx={{ borderRadius: 2, textTransform: "none", px: 1.2 }}
                                >
                                  Delete
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
                          <Chip label={String(tour.tourType)} size="small" />
                          <Chip label={String(tour.transferType)} size="small" />
                          <Chip label={String(tour.hotelType)} size="small" />
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

      {!loading && !error && items.length === 0 && <Typography variant="body2">No tours found.</Typography>}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ py: 1 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, p) => setPage(p - 1)}
            shape="rounded"
          />
        </Stack>
      )}
    </Stack>
  );
}
