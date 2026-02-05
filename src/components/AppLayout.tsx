import { useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  FormControl,
  Select,
} from "@mui/material";
import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import { useTranslation } from "react-i18next";

function normalizeRole(r: string) {
  return (r ?? "").trim().toUpperCase();
}

function hasAnyRole(userRoles: string[], allowed: string[]) {
  const allowedSet = new Set(allowed.map(normalizeRole));

  return (userRoles ?? []).some((r) => {
    const rr = normalizeRole(r);
    // support both ADMIN and ROLE_ADMIN styles
    return (
      allowedSet.has(rr) ||
      allowedSet.has(rr.replace(/^ROLE_/, "")) ||
      allowedSet.has(`ROLE_${rr}`)
    );
  });
}

export default function AppLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const canSeeAdmin = useMemo(
    () => hasAnyRole(auth.roles ?? [], ["ADMIN", "MANAGER"]),
    [auth.roles]
  );

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleCloseMenu = () => setAnchorEl(null);

  const goProfile = () => {
    handleCloseMenu();
    navigate("/profile");
  };

  const doLogout = () => {
    handleCloseMenu();
    auth.logout();
    navigate("/login");
  };

  const currentLang = i18n.language?.startsWith("uk") ? "uk" : "en";

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          {/* Brand */}
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, cursor: "pointer" }}
            onClick={() => navigate("/home")}
          >
            {t("app.brand")}
          </Typography>

          <Button color="inherit" component={RouterLink} to="/tours">
            {t("nav.tours")}
          </Button>

          <Button color="inherit" component={RouterLink} to="/orders">
            {t("nav.orders")}
          </Button>

          {/* ✅ Admin visible only for ADMIN/MANAGER */}
          {canSeeAdmin && (
            <Button color="inherit" component={RouterLink} to="/admin/users">
              {t("nav.admin")}
            </Button>
          )}

          {/* ✅ Language switcher */}
          <FormControl size="small" sx={{ ml: 1, minWidth: 72 }}>
            <Select
              value={currentLang}
              onChange={(e) => i18n.changeLanguage(String(e.target.value))}
              sx={{
                color: "inherit",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.5)" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.8)" },
                ".MuiSvgIcon-root": { color: "inherit" },
              }}
            >
              <MenuItem value="uk">UA</MenuItem>
              <MenuItem value="en">EN</MenuItem>
            </Select>
          </FormControl>

          {/* Email dropdown */}
          <Button
            color="inherit"
            onClick={handleOpenMenu}
            sx={{ textTransform: "none", ml: 1 }}
            aria-controls={menuOpen ? "profile-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : undefined}
          >
            {auth.email ?? t("menu.account")}
          </Button>

          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={goProfile}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              {t("menu.profile")}
            </MenuItem>

            <Divider />

            <MenuItem onClick={doLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {t("menu.logout")}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
