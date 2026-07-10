import { Box, Card, CardContent, Typography, IconButton } from "@mui/material";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";

// Turn a stable number (the song id) into a pleasant, repeatable gradient, so
// coverless tracks each get their own colour instead of an identical grey box.
// Same id -> same gradient every render, so the grid doesn't shimmer on reload.
const gradientFor = (seed = 0) => {
  // 137.508° is the golden angle — stepping the hue by it means consecutive ids
  // land far apart on the colour wheel instead of clustering (ids 1,2,3 were all
  // mapping into the green band before). +50 keeps the two stops distinct.
  const h1 = Math.round((seed * 137.508)) % 360;
  const h2 = (h1 + 50) % 360;
  return `linear-gradient(135deg, hsl(${h1} 55% 45%), hsl(${h2} 60% 35%))`;
};

export default function MediaCard({
  title,
  subtitle,
  imageUrl,          // real cover URL; if absent we fall back to a gradient
  seed,              // stable number (song id) -> deterministic gradient
  playable = false,
  isPlaying = false,
  onTogglePlay,
  onClick,
  hideText = false,   // suppress built-in title/subtitle so the caller can render its own
  disableHoverLift = false,  // suppress the translateY lift (for cards flush against a meta panel)
  flushBottom = false,  // square the bottom corners so a panel can butt flush beneath it
  bare = false,         // strip card chrome (border/shadow/radius) for use inside a wrapper
}) {
  const hasImage = Boolean(imageUrl);

  return (
    <Card
      elevation={bare ? 0 : 1}
      square={bare}
      sx={{
        width: 180,
        flexShrink: 0,
        ...(bare
          ? { borderRadius: 0, boxShadow: 'none', bgcolor: 'transparent', backgroundImage: 'none' }
          : {
              borderRadius: 3,
              ...(flushBottom && {
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }),
            }),
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": disableHoverLift
          ? (bare ? {} : { boxShadow: 6 })
          : { transform: "translateY(-4px)", boxShadow: 6 },
        "&:hover .play-fab": { opacity: 1 },
      }}
    >
      <Box
        onClick={onClick}
        sx={{
          position: "relative",
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          ...(hasImage
            ? {}
            : { background: gradientFor(seed) }),
        }}
      >
        {hasImage ? (
          <Box component="img" src={imageUrl} alt={title}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <MusicNoteRoundedIcon sx={{ fontSize: 44, color: "rgba(255,255,255,0.85)" }} />
        )}

        {playable && (
          <IconButton
            className="play-fab"
            onClick={(e) => { e.stopPropagation(); onTogglePlay?.(); }}
            aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
            sx={{
              position: "absolute", right: 8, bottom: 8,
              bgcolor: "primary.main", color: "primary.contrastText",
              opacity: isPlaying ? 1 : 0,
              transition: "opacity 0.2s ease, transform 0.2s ease",
              "&:hover": { bgcolor: "primary.dark", transform: "scale(1.06)" },
            }}
          >
            {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
          </IconButton>
        )}
      </Box>

      {/* When a caller wants to render its own text block below the cover (for
          a custom layout/hierarchy), it passes hideText and omits title/subtitle
          here. Existing callers pass neither and keep the built-in labels. */}
      {!hideText && (
        <CardContent sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>
        </CardContent>
      )}
    </Card>
  );
}