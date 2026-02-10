// src/main.tsx
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, CircularProgress, Box } from "@mui/material";

import "./i18n"; // ✅ MUST be before render

import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireRole } from "./auth/RequireRole";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// ✅ NEW: password reset pages
import ForgotPasswordPage from "./pages/ForgoPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import ToursPage from "./pages/ToursPage";
import TourDetailsPage from "./pages/TourDetailsPage";
import TourEditPage from "./pages/TourEditPage";
import TourCreatePage from "./pages/TourCreatePage";

import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import PaymentDetailsPage from "./pages/PaymentDetailsPage";

// ✅ admin layout + pages
import AdminLayout from "./components/AdminLayout";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminUserDetailsPage from "./pages/admin/AdminUserDetailsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminOrderDetailsPage from "./pages/admin/AdminOrderDetailsPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";

function AppBootstrap() {
  return (
    <React.StrictMode>
      <CssBaseline />

      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* PUBLIC */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ✅ PUBLIC: password reset */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* PROTECTED */}
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/home" element={<HomePage />} />

                {/* TOURS */}
                <Route path="/tours" element={<ToursPage />} />
                <Route path="/tours/:tourId" element={<TourDetailsPage />} />

                {/* Admin-only create/update tour */}
                <Route element={<RequireRole anyOf={["ADMIN"]} redirectTo="/tours" />}>
                  <Route path="/tours/new" element={<TourCreatePage />} />
                  <Route path="/tours/:tourId/edit" element={<TourEditPage />} />
                </Route>

                {/* ORDERS */}
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:orderId" element={<OrderDetailsPage />} />

                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/payments/orders/:orderId" element={<PaymentDetailsPage />} />

                {/* ✅ ADMIN (ADMIN + MANAGER only) */}
                <Route element={<RequireRole anyOf={["ADMIN", "MANAGER"]} redirectTo="/home" />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/users" replace />} />

                    {/* users */}
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="users/:userId" element={<AdminUserDetailsPage />} />

                    {/* orders */}
                    <Route path="orders" element={<AdminOrdersPage />} />
                    <Route path="orders/:orderId" element={<AdminOrderDetailsPage />} />

                    {/* payments */}
                    <Route path="payments" element={<AdminPaymentsPage />} />
                  </Route>
                </Route>

                {/* default */}
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Route>
            </Route>

            {/* fallback for anything else */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Suspense
    fallback={
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    }
  >
    <AppBootstrap />
  </Suspense>
);
