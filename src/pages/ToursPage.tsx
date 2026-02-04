// src/pages/ToursPage.tsx
import React, { useEffect, useMemo, useState } from "react";
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
  Tooltip,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import { useNavigate } from "react-router-dom";

import * as toursApi from "../api/tours.api";
import type { TourResponseDto } from "../types/response";
import { useAuth } from "../auth/AuthContext";

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

export default function ToursPage() {
  const [tours, setTours] = useState<TourResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const navigate = useNavigate();
  const auth = useAuth();

  const isAdmin = useMemo(() => hasRole(auth.roles ?? [], "ADMIN"), [auth.roles]);
  const canHot = useMemo(
    () => hasRole(auth.roles ?? [], "ADMIN") || hasRole(auth.roles ?? [], "MANAGER"),
    [auth.roles]
  );

  const load = async () => {
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

  useEffect(() => {
    load();
  }, []);

  const sortedTours = useMemo(() => {
    return [...tours].sort((a, b) => Number(Boolean(b.hot)) - Number(Boolean(a.hot)));
  }, [tours]);

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
      setTours((prev) => prev.filter((t) => t.id !== tourId));
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
      const updated = await toursApi.updateTourHot(tour.id, { hot: next });
      setTours((prev) => prev.map((x) => (x.id === tour.id ? updated : x)));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to update HOT";
      alert(msg);
    } finally {
      setBusyId(null);
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

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr" } }}>
        {sortedTours.map((tour) => {
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
                        <Stack direction="row" spacing={0.5}>
                          {canHot && (
                            <Tooltip title={tour.hot ? "Remove HOT" : "Make HOT"}>
                              <span>
                                <IconButton
                                  onClick={(e) => handleToggleHot(e, tour)}
                                  size="small"
                                  disabled={busy}
                                  sx={{ borderRadius: 2 }}
                                >
                                  <LocalFireDepartmentOutlinedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}

                          {isAdmin && (
                            <>
                              <IconButton
                                onClick={(e) => handleEdit(e, tour.id)}
                                size="small"
                                disabled={busy}
                                sx={{ borderRadius: 2 }}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                onClick={(e) => handleDelete(e, tour.id)}
                                size="small"
                                disabled={busy}
                                sx={{ borderRadius: 2 }}
                              >
                                <DeleteOutlineOutlinedIcon fontSize="small" />
                              </IconButton>
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

      {!error && sortedTours.length === 0 && <Typography variant="body2">No tours available.</Typography>}
    </Stack>
  );
}
