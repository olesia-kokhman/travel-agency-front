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
} from "@mui/material";
import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";

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
            Travel Agency
          </Typography>

          <Button color="inherit" component={RouterLink} to="/tours">
            Tours
          </Button>

          <Button color="inherit" component={RouterLink} to="/orders">
            Orders
          </Button>

          {/* ✅ Admin visible only for ADMIN/MANAGER */}
          {canSeeAdmin && (
            <Button color="inherit" component={RouterLink} to="/admin/users">
              Admin
            </Button>
          )}

          {/* Email dropdown */}
          <Button
            color="inherit"
            onClick={handleOpenMenu}
            sx={{ textTransform: "none", ml: 1 }}
            aria-controls={menuOpen ? "profile-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : undefined}
          >
            {auth.email ?? "Account"}
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
              Profile
            </MenuItem>

            <Divider />

            <MenuItem onClick={doLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
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
