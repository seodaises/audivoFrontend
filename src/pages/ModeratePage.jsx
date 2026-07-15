import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, Paper, Button, Chip, Alert, Skeleton,
  Pagination, Avatar, Tooltip,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import { fetchHiddenComments, setCommentStatus } from '../api/comments';

// The moderation queue: every comment a moderator has hidden, newest decision first.
//
// This page is the review surface. Hiding without a way to see what you hid — and
// undo it — is just deletion with extra steps. The backend keeps the row and records
// hidden_by_user_id precisely so this page can exist.
export default function ModeratePage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  // `silent` skips the skeleton so restoring a comment doesn't flash the whole
  // page white — the same idiom used for status writes on the catalog pages.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErr('');
    try {
      const data = await fetchHiddenComments({ page, limit: 20 });
      setItems(data.items || []);
      setPagination(data.pagination || null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const restore = async (id) => {
    setBusyId(id);
    setErr('');
    try {
      await setCommentStatus(id, 'visible');
      await load({ silent: true });   // row leaves the queue: it is no longer hidden
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        Moderate comments
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Comments removed from public view. Restoring one makes it visible again.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {loading ? (
        <Stack spacing={2}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={120} />
          ))}
        </Stack>
      ) : items.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 6, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}
        >
          <ForumRoundedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Nothing in the queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No comments are currently hidden.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {items.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
              >
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                    <Avatar
                      src={c.author?.avatarUrl || undefined}
                      sx={{ width: 32, height: 32 }}
                    >
                      {(c.author?.displayName || '?')[0]}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                        {c.author?.displayName || 'Deleted user'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        on {c.song?.title || 'unknown track'}
                        {c.createdAt && ` · ${new Date(c.createdAt).toLocaleDateString()}`}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Moderators see the real body. They have to — you cannot review a
                      decision against a tombstone that hides the thing you're reviewing. */}
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      bgcolor: 'action.hover',
                      p: 1.5,
                      borderRadius: 2,
                    }}
                  >
                    {c.body}
                  </Typography>

                  {c.hiddenBy && (
                    <Chip
                      size="small"
                      label={`Hidden by ${c.hiddenBy.displayName || 'a moderator'}`}
                      sx={{ mt: 1.5 }}
                    />
                  )}
                </Box>

                <Tooltip title="Make this comment public again">
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityRoundedIcon />}
                      disabled={busyId === c.id}
                      onClick={() => restore(c.id)}
                      sx={{ flexShrink: 0 }}
                    >
                      Restore
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Stack direction="row" sx={{ justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Stack>
      )}
    </Box>
  );
}