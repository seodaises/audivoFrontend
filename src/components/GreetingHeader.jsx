import { Box, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";

// Returns a greeting string based on the current hour of the day.
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function GreetingHeader() {
  const { user } = useAuth();   

  // Fall back gracefully if the name isn't loaded yet.
  const name = user?.name || user?.email?.split("@")[0] || "there";
  const greeting = getGreeting();

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h4"
        sx={{ fontWeight: 700, letterSpacing: "-0.5px" }}
      >
        {greeting}, {name}
      </Typography>
      <Typography
        variant="body1"
        sx={{ color: "text.secondary", mt: 0.5 }}
      >
        Here's what's waiting for you today.
      </Typography>
    </Box>
  );
}