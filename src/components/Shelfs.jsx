import { Box, Typography } from "@mui/material";
import MediaCard from "./MediaCard";

export default function Shelf({ title, items }) {
  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {title}
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          pb: 1,                        // room so hover-lift isn't clipped
          scrollbarWidth: "thin",       // slim scrollbar (Firefox)
          "&::-webkit-scrollbar": { height: 8 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "action.disabled",
            borderRadius: 4,
          },
        }}
      >
        {items.map((item) => (
          <MediaCard
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
          />
        ))}
      </Box>
    </Box>
  );
}