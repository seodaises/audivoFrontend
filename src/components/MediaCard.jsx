import { Box, Card, CardContent, Typography } from "@mui/material";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";

export default function MediaCard({ title, subtitle }) {
  return (
    <Card
      sx={{
        width: 180,
        flexShrink: 0,          // stops cards squishing in the scroll row
        borderRadius: 3,
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 6,
        },
      }}
    >
      {/* Placeholder art: color block + icon, swaps for <img> later */}
      <Box
        sx={{
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "action.hover",   // theme-aware, works in both modes
        }}
      >
        <MusicNoteRoundedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
      </Box>

      <CardContent sx={{ p: 1.5 }}>
        <Typography
          variant="subtitle2"
          noWrap                      // truncates long titles cleanly
          sx={{ fontWeight: 700 }}
        >
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
}