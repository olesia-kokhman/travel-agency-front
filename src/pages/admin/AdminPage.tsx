import React, { useMemo } from "react";
import { Box, Card, CardContent, Tab, Tabs, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type TabKey = "users" | "orders" | "payments";

const tabToPath: Record<TabKey, string> = {
  users: "/admin/users",
  orders: "/admin/orders",
  payments: "/admin/payments",
};

function pathToTab(pathname: string): TabKey {
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/payments")) return "payments";
  return "users";
}

export default function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = useMemo(() => pathToTab(location.pathname), [location.pathname]);

  const handleChange = (_: React.SyntheticEvent, next: TabKey) => {
    navigate(tabToPath[next]);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t("pages.adminPage.title")}
      </Typography>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Tabs value={currentTab} onChange={handleChange}>
            <Tab value="users" label={t("pages.adminPage.tabs.users")} />
            <Tab value="orders" label={t("pages.adminPage.tabs.orders")} />
            <Tab value="payments" label={t("pages.adminPage.tabs.payments")} />
          </Tabs>

          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("pages.adminPage.hint")}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
