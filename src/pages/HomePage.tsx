import { Box, Card, CardContent, Stack, Typography, Button, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const greetingName = auth.email ?? "";

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
      <Stack spacing={2.2}>
        {/* Hero */}
        <Card
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 12px 35px rgba(0,0,0,0.10)",
          }}
        >
          <CardContent sx={{ p: { xs: 2.2, sm: 3 } }}>
            <Stack spacing={1.2}>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                {t("pages.home.title")}
              </Typography>

              <Typography variant="body1" color="text.secondary">
                {t("pages.home.greeting", { email: greetingName })}
              </Typography>

              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {t("pages.home.subtitle")}
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ pt: 1 }}
                alignItems={{ sm: "center" }}
              >
                <Button
                  variant="contained"
                  onClick={() => navigate("/tours")}
                  sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  {t("pages.home.actions.browseTours")}
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => navigate("/orders")}
                  sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  {t("pages.home.actions.myOrders")}
                </Button>

                <Button
                  variant="text"
                  onClick={() => navigate("/profile")}
                  sx={{ borderRadius: 2, textTransform: "none" }}
                >
                  {t("pages.home.actions.profile")}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Info blocks */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          {/* About */}
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                {t("pages.home.about.title")}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {t("pages.home.about.text")}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={0.7}>
                <Typography variant="body2">
                  • {t("pages.home.about.points.search")}
                </Typography>
                <Typography variant="body2">
                  • {t("pages.home.about.points.order")}
                </Typography>
                <Typography variant="body2">
                  • {t("pages.home.about.points.pay")}
                </Typography>
                <Typography variant="body2">
                  • {t("pages.home.about.points.review")}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {/* Quick tips */}
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                {t("pages.home.tips.title")}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t("pages.home.tips.subtitle")}
              </Typography>

              <Stack spacing={1}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                    <Typography variant="body2">
                      <b>{t("pages.home.tips.items.tours.title")}</b> — {t("pages.home.tips.items.tours.text")}
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                    <Typography variant="body2">
                      <b>{t("pages.home.tips.items.orders.title")}</b> — {t("pages.home.tips.items.orders.text")}
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                    <Typography variant="body2">
                      <b>{t("pages.home.tips.items.profile.title")}</b> — {t("pages.home.tips.items.profile.text")}
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}
