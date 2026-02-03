import { Alert, Typography } from "@mui/material";

export default function AdminOrdersTab() {
  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>Orders</Typography>
      <Alert severity="info">Тут буде orders management.</Alert>
    </>
  );
}
