import { useState, useCallback } from 'react';
import {
  IconButton, Badge, Popover, Box, Stack, Typography, Button, Divider,
  List, ListItemButton, ListItemAvatar, Avatar, Alert, Skeleton, Tooltip,
} from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import AlbumRoundedIcon from '@mui/icons-material/AlbumRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded';
import SubtitlesRoundedIcon from '@mui/icons-material/SubtitlesRounded';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../store/hooks/useNotifications';

function timeAgo(iso) {
  if (!iso) return '';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
const PRESENTATION = {
  release: {
    icon: <AlbumRoundedIcon fontSize="small" />,
    text: (n) => `${n.album?.title ?? 'A new album'} is out now`,
    secondary: () => 'New release from an artist you follow',
  },
  upcoming_release: {
    icon: <ScheduleRoundedIcon fontSize="small" />,
    text: (n) => `${n.album?.title ?? 'A new album'} is coming soon`,
    secondary: () => 'Releasing within the next week',
    navigable: false,
  },
  comment: {
    icon: <ChatBubbleRoundedIcon fontSize="small" />,
    text: (n) => `${n.actor?.displayName ?? 'Someone'} commented on ${n.song?.title ?? 'your song'}`,
    secondary: (n) => (n.album?.title ? `On ${n.album.title}` : 'On your song'),
  },
  comment_reply: {
    icon: <ReplyRoundedIcon fontSize="small" />,
    text: (n) => `${n.actor?.displayName ?? 'Someone'} replied to your comment`,
    secondary: (n) => (n.song?.title ? `On ${n.song.title}` : 'On a comment you wrote'),
  },
  lyrics_ready: {
    icon: <SubtitlesRoundedIcon fontSize="small" />,
    text: (n) => `Lyrics ready for ${n.song?.title ?? 'your track'}`,
    secondary: () => 'AI transcription complete',
  },
};

function notificationTarget(n) {
  const p = PRESENTATION[n.type];
  if (p && p.navigable === false) return null;

  const albumRef = n.album?.publicId ?? n.album?.id;
  if (!albumRef) return null;
  const to = `/album/${albumRef}`;

  if ((n.type === 'comment' || n.type === 'comment_reply') && n.song?.id) {
    return {
      to,
      state: { openCommentsForSongId: n.song.id, highlightCommentId: n.commentId ?? null },
    };
  }
  return { to, state: null };
}

function NotificationRow({ n, onSelect }) {
  const p = PRESENTATION[n.type];
  if (!p) return null; // unknown/newer type from the server — skip, don't crash

  const clickable = Boolean(notificationTarget(n));

  return (
    <ListItemButton
      onClick={() => onSelect(n)}
      sx={{
        alignItems: 'flex-start',
        py: 1.25,
        // The unread cue is a tinted background plus weight, not a coloured dot
        // in the corner — it reads at a glance down a list of twenty.
        bgcolor: (t) =>
          n.isRead
            ? 'transparent'
            : t.palette.mode === 'dark'
              ? 'rgba(224,152,63,0.10)'
              : 'rgba(181,101,29,0.07)',
      }}
    >
      <ListItemAvatar sx={{ minWidth: 44 }}>
        {n.type === 'release' || n.type === 'upcoming_release' || !n.actor?.avatarUrl ? (
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {p.icon}
          </Avatar>
        ) : (
          <Avatar src={n.actor.avatarUrl} sx={{ width: 32, height: 32 }}>
            {(n.actor.displayName || '?')[0]}
          </Avatar>
        )}
      </ListItemAvatar>

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: n.isRead ? 500 : 700, lineHeight: 1.35 }}
        >
          {p.text(n)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {p.secondary(n)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {timeAgo(n.createdAt)}
          {!clickable && p.navigable !== false && ' · no longer available'}
        </Typography>
      </Box>
    </ListItemButton>
  );
}

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const {
    items, unread, page, totalPages, loading, loadingMore, error,
    loadFeed, loadMore, markOneRead, markEveryRead,
  } = useNotifications({ poll: true }); // the one polling consumer

  const open = Boolean(anchorEl);

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
    // Fetch on open rather than on mount: the feed is only ever looked at when
    // the panel is showing, so there's no reason to pay for it on every page.
    loadFeed();
  };

  const handleClose = () => setAnchorEl(null);

  const handleSelect = useCallback(
    (n) => {
      if (!n.isRead) markOneRead(n.id);
      const target = notificationTarget(n);
      handleClose();
      if (target) navigate(target.to, target.state ? { state: target.state } : undefined);
    },
    [markOneRead, navigate]
  );

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleOpen}
          color="inherit"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Badge badgeContent={unread} max={99} color="primary">
            <NotificationsRoundedIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 320, sm: 400 },
              maxHeight: 480,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
            },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Notifications
          </Typography>
          {unread > 0 && (
            <Button size="small" onClick={() => markEveryRead()}>
              Mark all read
            </Button>
          )}
        </Stack>
        <Divider />

        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ p: 2 }}>
              {[0, 1, 2].map((i) => (
                <Stack key={i} direction="row" spacing={1.5} sx={{ mb: 2 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton width="80%" />
                    <Skeleton width="40%" />
                  </Box>
                </Stack>
              ))}
            </Box>
          )}

          {/* An empty screen is an invitation, not an apology. */}
          {!loading && !error && items.length === 0 && (
            <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
              <NotificationsRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Nothing here yet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Follow an artist to hear about new releases, or comment on a song
                to get replies.
              </Typography>
            </Box>
          )}

          {!loading && items.length > 0 && (
            <List disablePadding>
              {items.map((n) => (
                <NotificationRow key={n.id} n={n} onSelect={handleSelect} />
              ))}
            </List>
          )}

          {!loading && page < totalPages && (
            <Box sx={{ p: 1.5, textAlign: 'center' }}>
              <Button size="small" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}