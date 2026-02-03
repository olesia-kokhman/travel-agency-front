import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
  Button,
  Divider,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import { useNavigate } from "react-router-dom";
import * as toursApi from "../api/tours.api";
import type { TourResponseDto } from "../types/response";

/**
 * TODO: заміни на свою реальну роль із AuthContext / JWT payload.
 * Наприклад: const { user } = useAuth(); return user?.roles?.includes("ADMIN");
 */
function useIsAdmin(): boolean {
  // Заглушка. Постав true щоб перевірити вигляд кнопок.
  return false;
}

function getTourPlaceholderImage(tourId?: string) {
  // Без зовнішніх залежностей: простий стабільний плейсхолдер по id
  // Можеш замінити на /assets/tours/default.jpg або на backend imageUrl.
  const seed = tourId?.slice(0, 6) ?? "tour";
  return `https://picsum.photos/seed/${seed}/640/360`;
}

export default function ToursPage() {
  const [tours, setTours] = useState<TourResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    const run = async () => {
      setError(null);
      setLoading(true);
      try {
        const list = await toursApi.getAllTours();
        setTours(list);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? "Failed to load tours";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const sortedTours = useMemo(() => {
    // hot тури зверху, далі звичайні
    return [...tours].sort((a, b) => Number(Boolean(b.hot)) - Number(Boolean(a.hot)));
  }, [tours]);

  const handleFavoriteStub = (e: React.MouseEvent, tour: TourResponseDto) => {
    e.stopPropagation();
    e.preventDefault();
    // Заглушка
    alert(`(Stub) Added to favorites: ${tour.title}`);
  };

  const handleEdit = (e: React.MouseEvent, tourId: string) => {
    e.stopPropagation();
    e.preventDefault();
    // Підстав свій маршрут редагування
    navigate(`/tours/${tourId}/edit`);
  };

  const handleDelete = async (e: React.MouseEvent, tourId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const ok = confirm("Delete this tour?");
    if (!ok) return;

    try {
      // Підстав реальний endpoint, коли буде:
      // await toursApi.deleteTour(tourId);
      // Заглушка, щоб UI не ламався:
      setTours((prev) => prev.filter((t) => t.id !== tourId));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to delete tour";
      alert(msg);
    }
  };

  if (loading) return <Typography variant="h6">Loading tours...</Typography>;

  return (
    <Stack spacing={2}>
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

      {error && <Alert severity="error">{error}</Alert>}

      {/* Wide cards layout */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr" },
        }}
      >
        {sortedTours.map((tour) => (
          <Card
            key={tour.id}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              transition: "transform .15s ease, box-shadow .15s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
              },
            }}
          >
            <CardActionArea onClick={() => navigate(`/tours/${tour.id}`)} sx={{ p: 0 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "260px 1fr" },
                  alignItems: "stretch",
                }}
              >
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
                      sx={{
                        bgcolor: "rgba(255,255,255,0.9)",
                        "&:hover": { bgcolor: "rgba(255,255,255,1)" },
                      }}
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

                      {isAdmin && (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            onClick={(e) => handleEdit(e, tour.id)}
                            size="small"
                            sx={{ borderRadius: 2 }}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={(e) => handleDelete(e, tour.id)}
                            size="small"
                            sx={{ borderRadius: 2 }}
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      )}
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
                          <b>{tour.price}</b>
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
                      <Chip label={tour.tourType} size="small" />
                      <Chip label={tour.transferType} size="small" />
                      <Chip label={tour.hotelType} size="small" />
                    </Stack>
                  </Stack>
                </CardContent>
              </Box>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {!error && sortedTours.length === 0 && (
        <Typography variant="body2">No tours available.</Typography>
      )}
    </Stack>
  );
}
