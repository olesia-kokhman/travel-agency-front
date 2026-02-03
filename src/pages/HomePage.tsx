import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthContext";

export default function HomePage() {
  const auth = useAuth();

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="h4">Welcome!</Typography>
        <Typography variant="body1">
          Hello{auth.email ? `, ${auth.email}` : ""}! 👋
        </Typography>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              About our travel agency
            </Typography>
            <Typography variant="body2">
              We help you find tours for отдых, экскурсии, шопинг и любые путешествия.
              Browse tours, create orders, pay online and leave reviews — all in one place.
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Quick tips
            </Typography>
            <Typography variant="body2">
              • Open <b>Tours</b> to browse available tours. <br />
              • Open <b>Orders</b> to see your orders. <br />
              • Open <b>Profile</b> to view/edit your personal data.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
