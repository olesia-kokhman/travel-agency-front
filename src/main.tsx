// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline } from "@mui/material";

import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireRole } from "./auth/RequireRole";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import ToursPage from "./pages/ToursPage";
import TourDetailsPage from "./pages/TourDetailsPage";
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CssBaseline />

    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* PROTECTED */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/home" element={<HomePage />} />

              <Route path="/tours" element={<ToursPage />} />
              <Route path="/tours/:tourId" element={<TourDetailsPage />} />

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
