import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import StarIcon from "@mui/icons-material/Star";
import { useNavigate, useParams } from "react-router-dom";
import * as toursApi from "../api/tours.api";
import * as ordersApi from "../api/orders.api";
import * as reviewsApi from "../api/reviews.api";
import type { TourResponseDto } from "../types/response";
import type { ReviewResponseDto } from "../api/reviews.api";

/**
 * TODO: заміни на свою реальну роль із AuthContext / JWT payload.
 */
function useIsAdmin(): boolean {
  return false;
}

function getTourPlaceholderImage(tourId?: string) {
  const seed = tourId?.slice(0, 6) ?? "tour";
  return `https://picsum.photos/seed/${seed}/1200/600`;
}

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function TourDetailsPage() {
  const { tourId } = useParams();
  const navigate = useNavigate();

  const [tour, setTour] = useState<TourResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- reviews state
  const [reviews, setReviews] = useState<ReviewResponseDto[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // ---- order dialog state
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  const isAdmin = useIsAdmin();

  useEffect(() => {
    const run = async () => {
      if (!tourId) {
        setError("Tour id is missing");
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const t = await toursApi.getTourById(tourId);
        setTour(t);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? "Failed to load tour";
        setError(msg);
      } finally {
        setLoading(false);
      }

      // завантажуємо reviews окремо (не блокуємо сторінку)
      setReviewsError(null);
      setReviewsLoading(true);
      try {
        const list = await reviewsApi.getReviewsByTour(tourId);
        setReviews(list ?? []);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? "Failed to load reviews";
        setReviewsError(msg);
      } finally {
        setReviewsLoading(false);
      }
    };

    run();
  }, [tourId]);

  const canOrder = useMemo(() => {
    return !!tour && tour.active;
  }, [tour]);

  const handleFavoriteStub = () => {
    if (!tour) return;
    alert(`(Stub) Added to favorites: ${tour.title}`);
  };

  const handleEdit = () => {
    if (!tourId) return;
    navigate(`/tours/${tourId}/edit`);
  };

  const handleDelete = async () => {
    if (!tourId) return;
    const ok = confirm("Delete this tour?");
    if (!ok) return;

    try {
      // await toursApi.deleteTour(tourId);
      navigate("/tours");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to delete tour";
      alert(msg);
    }
  };

  const handleOpenOrderDialog = () => {
    if (!tour) return;
    setOrderError(null);
    setAgree(false);
    setOrderOpen(true);
  };

  const handleSubmitOrder = async () => {
    if (!tour) return;

    setOrderError(null);
    setOrderSubmitting(true);
    try {
      const created = await ordersApi.createMyOrder({ tourId: tour.id });
      navigate(`/orders/${created.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to create order";
      setOrderError(msg);
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (loading) return <Typography variant="h6">Loading tour...</Typography>;

  return (
    <Stack spacing={2}>
      <Button variant="text" onClick={() => navigate("/tours")} sx={{ width: "fit-content" }}>
        ← Back to tours
      </Button>

      {error && <Alert severity="error">{error}</Alert>}

      {tour && (
        <>
          <Card sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
            {/* Hero image */}
            <Box
              sx={{
                position: "relative",
                height: { xs: 220, sm: 320 },
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
                    "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.65) 100%)",
                }}
              />

              <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "absolute", top: 14, left: 14, right: 14 }}>
                {tour.hot && <Chip label="HOT" color="error" size="small" />}
                {!tour.active && <Chip label="Inactive" size="small" />}
                <Box sx={{ flexGrow: 1 }} />
                <IconButton
                  onClick={handleFavoriteStub}
                  sx={{ bgcolor: "rgba(255,255,255,0.92)", "&:hover": { bgcolor: "rgba(255,255,255,1)" } }}
                >
                  <FavoriteBorderIcon />
                </IconButton>

                {isAdmin && (
                  <>
                    <IconButton
                      onClick={handleEdit}
                      sx={{ bgcolor: "rgba(255,255,255,0.92)", "&:hover": { bgcolor: "rgba(255,255,255,1)" } }}
                    >
                      <EditOutlinedIcon />
                    </IconButton>
                    <IconButton
                      onClick={handleDelete}
                      sx={{ bgcolor: "rgba(255,255,255,0.92)", "&:hover": { bgcolor: "rgba(255,255,255,1)" } }}
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </>
                )}
              </Stack>

              <Box sx={{ position: "absolute", left: 18, bottom: 18, right: 18 }}>
                <Typography variant="h4" sx={{ color: "white", lineHeight: 1.1, mb: 1 }}>
                  {tour.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
                  {tour.country}, {tour.city} • {tour.tourType} • {tour.transferType} • {tour.hotelType}
                </Typography>
              </Box>
            </Box>

            <CardContent sx={{ p: 2.4 }}>
              <Stack spacing={1.2}>
                <Typography variant="body1">{tour.longDescription}</Typography>

                <Divider sx={{ my: 1 }} />

                <Stack spacing={0.7}>
                  <Typography variant="body2">
                    <b>Price:</b> {tour.price}
                  </Typography>
                  <Typography variant="body2">
                    <b>Country/City:</b> {tour.country}, {tour.city}
                  </Typography>
                  <Typography variant="body2">
                    <b>Capacity:</b> {tour.capacity}
                  </Typography>
                  <Typography variant="body2">
                    <b>Hot:</b> {tour.hot ? "Yes" : "No"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Active:</b> {tour.active ? "Yes" : "No"}
                  </Typography>
                  <Typography variant="body2">
                    <b>Check-in:</b> {String(tour.checkIn)}
                  </Typography>
                  <Typography variant="body2">
                    <b>Check-out:</b> {String(tour.checkOut)}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ pt: 1 }}>
                  <Chip label={tour.tourType} size="small" />
                  <Chip label={tour.transferType} size="small" />
                  <Chip label={tour.hotelType} size="small" />
                </Stack>

                {/* ---- Order button */}
                <Divider sx={{ my: 1 }} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="stretch">
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCartOutlinedIcon />}
                    onClick={handleOpenOrderDialog}
                    disabled={!canOrder}
                  >
                    Оформити замовлення
                  </Button>

                  {!tour.active && (
                    <Alert severity="warning" sx={{ m: 0, flexGrow: 1 }}>
                      Цей тур неактивний, замовлення недоступне.
                    </Alert>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* ---- Reviews block */}
          <Card sx={{ borderRadius: 3, boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">Відгуки</Typography>

                {reviewsLoading && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography variant="body2">Loading reviews...</Typography>
                  </Stack>
                )}

                {reviewsError && <Alert severity="error">{reviewsError}</Alert>}

                {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Поки що немає відгуків для цього туру.
                  </Typography>
                )}

                {!reviewsLoading && !reviewsError && reviews.length > 0 && (
                  <Stack spacing={1.2}>
                    {reviews.map((r) => (
                      <Box key={r.id} sx={{ p: 1.2, borderRadius: 2, border: "1px solid rgba(0,0,0,0.08)" }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={0.6} alignItems="center">
                              {typeof r.rating === "number" && (
                                <Chip
                                  icon={<StarIcon />}
                                  label={r.rating}
                                  size="small"
                                  sx={{ width: "fit-content" }}
                                />
                              )}
                              {/* {r.userName && (
                                <Typography variant="body2">
                                  <b>{r.userName}</b>
                                </Typography>
                              )}
                              {!r.userName && r.userId && (
                                <Typography variant="body2">
                                  <b>{r.userId}</b>
                                </Typography>
                              )} */}
                            </Stack>

                            {r.createdAt && (
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(r.createdAt)}
                              </Typography>
                            )}
                          </Stack>

                          <Typography variant="body2">
                            {r.comment ?? "(no text)"}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* ---- Order dialog */}
          <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Оформлення замовлення</DialogTitle>

            <DialogContent dividers>
              <Stack spacing={1.2}>
                <Typography variant="body2">
                  Ви оформлюєте замовлення на тур: <b>{tour.title}</b>
                </Typography>
                <Typography variant="body2">
                  Сума: <b>{tour.price}</b>
                </Typography>

                {orderError && <Alert severity="error">{orderError}</Alert>}

                <FormControlLabel
                  control={<Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} />}
                  label="Погоджуюсь з умовами та підтверджую оформлення."
                />
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setOrderOpen(false)} disabled={orderSubmitting}>
                Скасувати
              </Button>
              <Button variant="contained" onClick={handleSubmitOrder} disabled={!agree || orderSubmitting}>
                Підтвердити
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Stack>
  );
}
