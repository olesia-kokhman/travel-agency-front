import React, { useMemo } from "react";
import { Box, Card, CardContent, Tab, Tabs, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

import AdminUsersTab from "./AdminUsersPage";
import AdminOrdersTab from "./AdminOrdersPage";
import AdminPaymentsTab from "./AdminPaymentsPage";

const tabs = [
  { key: "users", label: "Users" },
  { key: "orders", label: "Orders" },
  { key: "payments", label: "Payments" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function parseTab(search: string): TabKey {
  const sp = new URLSearchParams(search);
  const t = (sp.get("tab") || "users").toLowerCase();
  if (t === "users" || t === "orders" || t === "payments") return t;
  return "users";
}

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = useMemo(() => parseTab(location.search), [location.search]);

  const handleChange = (_: React.SyntheticEvent, next: TabKey) => {
    const sp = new URLSearchParams(location.search);
    sp.set("tab", next);
    navigate({ pathname: "/admin", search: sp.toString() }, { replace: true });
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Admin Panel
      </Typography>

      <Card>
        <CardContent>
          <Tabs value={currentTab} onChange={handleChange}>
            {tabs.map(t => (
              <Tab key={t.key} value={t.key} label={t.label} />
            ))}
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {currentTab === "users" && <AdminUsersTab />}
            {currentTab === "orders" && <AdminOrdersTab />}
            {currentTab === "payments" && <AdminPaymentsTab />}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
