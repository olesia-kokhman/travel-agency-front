import { Alert, Typography } from "@mui/material";

export default function AdminPaymentsTab() {
  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>Payments</Typography>
      <Alert severity="info">Тут буде payments management.</Alert>
    </>
  );
}
