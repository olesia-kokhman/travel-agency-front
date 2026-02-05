// src/pages/TourEditPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import * as toursApi from "../api/tours.api";
import type { TourResponseDto } from "../types/response";
import { useTranslation } from "react-i18next";

// enums (adjust if your backend uses different names)
const TOUR_TYPES = ["REST", "EXCURSION", "SHOPPING"] as const;
const TRANSFER_TYPES = ["CAR", "PLANE", "SHIP"] as const;
// ⚠️ replace with your real HotelType enum values if needed
const HOTEL_TYPES = ["THREE", "FOUR", "FIVE"] as const;

function toIsoLocalDateTimeInput(value?: string | null) {
  // input type="datetime-local" expects: YYYY-MM-DDTHH:mm
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function fromDateTimeLocalToIso(value: string) {
  // user picks local time; we store ISO string
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function TourEditPage() {
  const { t } = useTranslation();
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();

  const [tour, setTour] = useState<TourResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");

  const [price, setPrice] = useState<string>(""); // keep as string for TextField
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const [active, setActive] = useState(true);
  const [hot, setHot] = useState(false);
  const [capacity, setCapacity] = useState<string>("");

  const [tourType, setTourType] = useState<string>(TOUR_TYPES[0]);
  const [transferType, setTransferType] = useState<string>(TRANSFER_TYPES[0]);
  const [hotelType, setHotelType] = useState<string>(HOTEL_TYPES[0]);

  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");

  const isEdit = useMemo(() => Boolean(tourId), [tourId]);

  const trTourType = (v: any) => t(`enums.tourType.${String(v)}`);
  const trTransferType = (v: any) => t(`enums.transferType.${String(v)}`);
  const trHotelType = (v: any) => t(`enums.hotelType.${String(v)}`);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      if (tourId) {
        const tt = await toursApi.getTourById(tourId);
        setTour(tt);

        // hydrate form
        setTitle(tt.title ?? "");
        setShortDescription(tt.shortDescription ?? "");
        setLongDescription(tt.longDescription ?? "");

        setPrice(tt.price != null ? String(tt.price) : "");
        setCountry(tt.country ?? "");
        setCity(tt.city ?? "");

        setActive(Boolean(tt.active));
        setHot(Boolean(tt.hot));
        setCapacity(tt.capacity != null ? String(tt.capacity) : "");

        setTourType(String(tt.tourType ?? TOUR_TYPES[0]));
        setTransferType(String(tt.transferType ?? TRANSFER_TYPES[0]));
        setHotelType(String(tt.hotelType ?? HOTEL_TYPES[0]));

        setCheckIn(toIsoLocalDateTimeInput(tt.checkIn ? String(tt.checkIn) : null));
        setCheckOut(toIsoLocalDateTimeInput(tt.checkOut ? String(tt.checkOut) : null));
      } else {
        // create defaults
        setTour(null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.tourEdit.errors.loadFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  const validate = () => {
    if (!title.trim()) return t("pages.tourEdit.validation.titleRequired");
    if (!shortDescription.trim()) return t("pages.tourEdit.validation.shortRequired");
    if (!longDescription.trim()) return t("pages.tourEdit.validation.longRequired");
    if (!country.trim()) return t("pages.tourEdit.validation.countryRequired");
    if (!city.trim()) return t("pages.tourEdit.validation.cityRequired");
    if (!price || Number(price) <= 0) return t("pages.tourEdit.validation.pricePositive");
    if (!capacity || Number(capacity) <= 0) return t("pages.tourEdit.validation.capacityPositive");
    if (!checkIn) return t("pages.tourEdit.validation.checkInRequired");
    if (!checkOut) return t("pages.tourEdit.validation.checkOutRequired");
    if (new Date(checkOut).getTime() <= new Date(checkIn).getTime()) return t("pages.tourEdit.validation.checkOutAfter");
    return null;
  };

  const handleSave = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const dto = {
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        longDescription: longDescription.trim(),
        price: price, // backend BigDecimal ok with string
        country: country.trim(),
        city: city.trim(),
        active,
        hot,
        capacity: Number(capacity),
        tourType,
        transferType,
        hotelType,
        checkIn: fromDateTimeLocalToIso(checkIn),
        checkOut: fromDateTimeLocalToIso(checkOut),
      };

      if (tourId) {
        const updated = await toursApi.updateTour(tourId, dto);
        setTour(updated);
        navigate(`/tours/${tourId}`);
      } else {
        const created = await toursApi.createTour(dto as any);
        navigate(`/tours/${created.id}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t("pages.tourEdit.errors.saveFailed");
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={() => navigate(isEdit ? `/tours/${tourId}` : "/tours")}>
          {t("pages.tourEdit.actions.back")}
        </Button>

        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {isEdit ? t("pages.tourEdit.title.edit") : t("pages.tourEdit.title.create")}
        </Typography>

        <Button variant="contained" onClick={handleSave} disabled={busy}>
          {t("common.save")}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6">{t("pages.tourEdit.sections.mainInfo")}</Typography>
          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <TextField label={t("pages.tourEdit.fields.title")} value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />

            <TextField
              label={t("pages.tourEdit.fields.shortDescription")}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />

            <TextField
              label={t("pages.tourEdit.fields.longDescription")}
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              fullWidth
              multiline
              minRows={5}
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label={t("pages.tourEdit.fields.price")}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                fullWidth
              />
              <TextField
                label={t("pages.tourEdit.fields.capacity")}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label={t("pages.tourEdit.fields.country")}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                fullWidth
              />
              <TextField
                label={t("pages.tourEdit.fields.city")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                label={t("pages.tourEdit.fields.tourType")}
                value={tourType}
                onChange={(e) => setTourType(e.target.value)}
                fullWidth
              >
                {TOUR_TYPES.map((x) => (
                  <MenuItem key={x} value={x}>
                    {trTourType(x)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label={t("pages.tourEdit.fields.transferType")}
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                fullWidth
              >
                {TRANSFER_TYPES.map((x) => (
                  <MenuItem key={x} value={x}>
                    {trTransferType(x)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label={t("pages.tourEdit.fields.hotelType")}
                value={hotelType}
                onChange={(e) => setHotelType(e.target.value)}
                fullWidth
              >
                {HOTEL_TYPES.map((x) => (
                  <MenuItem key={x} value={x}>
                    {trHotelType(x)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label={t("pages.tourEdit.fields.checkIn")}
                type="datetime-local"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label={t("pages.tourEdit.fields.checkOut")}
                type="datetime-local"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Stack direction="row" spacing={3}>
              <FormControlLabel
                control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
                label={t("pages.tourEdit.fields.active")}
              />
              <FormControlLabel
                control={<Switch checked={hot} onChange={(e) => setHot(e.target.checked)} />}
                label={t("pages.tourEdit.fields.hot")}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
