import { useState, useEffect, useCallback } from 'react';
import {
  Box, Stack, Typography, TextField, Button, Avatar, IconButton,
  Alert, Skeleton, Chip, Tooltip, Divider,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import { useAuth } from '../store/hooks/useAuth';
import { PERMISSIONS } from '../auth/permissions';
import {
  fetchComments, postComment, deleteComment, setCommentStatus,
} from '../api/comments';

function CommentRow({ comment, currentUserId, canModerate, canDeleteAny, busyId, onReply, onDelete, onHide, onRestore, isReply = false }) {
  const author = comment.author;                       // { id, displayName, avatarUrl, isDeleted } | null
  const mine = !!currentUserId && author?.id === currentUserId;
  const busy = busyId === comment.id;

  // Three levels deep, flattened: root -> reply -> reply-to-a-reply, all
  // rendered at the same indent under the root. `comment.replyingTo` only
  // ever shows up on a reply-to-a-reply (the backend omits it for a plain
  // reply-to-root, since that's the default and needs no annotation) — so
  // its presence IS the signal that this row is already at the depth cap.
  // A top-level comment can always be replied to; a reply can be replied to
  // only if it's NOT already a reply-to-a-reply.
  const canReply = !isReply || !comment.replyingTo;

  return (
    <Box sx={{ pl: isReply ? { xs: 4, sm: 6 } : 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Avatar src={author?.avatarUrl || undefined} sx={{ width: 32, height: 32, mt: 0.5 }}>
          {(author?.displayName || '?')[0]}
        </Avatar>

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {author?.displayName || 'Deleted user'}
            </Typography>
            {comment.createdAt && (
              <Typography variant="caption" color="text.secondary">
                {new Date(comment.createdAt).toLocaleDateString()}
              </Typography>
            )}
            {comment.isHidden && (
              <Chip size="extra-small" color="warning" variant="outlined" label="Hidden" />
            )}
          </Stack>

          {/* Flattened rendering means this reply sits at the same indent as
              a plain reply — this line is the only thing that says it was
              actually answering a REPLY, not the root comment. */}
          {comment.replyingTo && (
            <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600 }}>
              Replying to @{comment.replyingTo.author?.displayName || 'a deleted comment'}
            </Typography>
          )}

          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              mt: 0.5,
              color: comment.isDeleted ? 'text.disabled' : 'text.primary',
              fontStyle: comment.isDeleted ? 'italic' : 'normal',
            }}
          >
            {comment.body}
          </Typography>

          {/* Action row. Nothing to act on for a deleted tombstone. */}
          {!comment.isDeleted && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, ml: -0.5 }}>
              {canReply && (
                <Button
                  size="small"
                  startIcon={<ReplyRoundedIcon fontSize="small" />}
                  onClick={() => onReply(comment)}
                  sx={{ textTransform: 'none', color: 'text.secondary' }}
                >
                  Reply
                </Button>
              )}

              {(mine || canDeleteAny) && (
                <Tooltip title={mine ? 'Delete your comment' : 'Delete this comment'}>
                  <span>
                    <IconButton
                      size="small"
                      // Deleting someone else's words is a heavier act than
                      // withdrawing your own, so it reads in the error colour.
                      color={mine ? 'default' : 'error'}
                      disabled={busy}
                      onClick={() => onDelete(comment.id, !mine)}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              {canModerate && (
                comment.isHidden ? (
                  <Tooltip title="Restore to public view">
                    <span>
                      <IconButton size="small" color="primary" disabled={busy} onClick={() => onRestore(comment.id)}>
                        <VisibilityRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Hide from public view">
                    <span>
                      <IconButton size="small" color="warning" disabled={busy} onClick={() => onHide(comment.id)}>
                        <VisibilityOffRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

export default function CommentSection({ songId, isSongOwner = false }) {
  const { user, can } = useAuth();
  const canModerate = can(PERMISSIONS.MODERATE_COMMENTS);

  // Who may delete someone ELSE's comment. This mirrors the backend's three
  // tiers in commentService.deleteComment — the UI must not offer a button the
  // server will reject, nor hide one it would allow:
  //
  //   moderator          — global, any comment anywhere
  //   delete_comments +
  //     manage_users     — admin-tier, global
  //   delete_comments    — artist-tier, ONLY on songs they own
  //
  // The artist tier needs song ownership, which this component can't know on
  // its own (it only receives a songId), so the page passes `isSongOwner` down.
  // Getting this wrong is safe in one direction only: the server is still the
  // authority and will 403 anything it disagrees with.
  const canDeleteAny =
    canModerate ||
    (can(PERMISSIONS.DELETE_COMMENTS) &&
      (can(PERMISSIONS.MANAGE_USERS) || isSongOwner));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Composer state. `replyTo` holds the parent comment when replying, null for a
  // top-level post — one composer drives both, like AlbumPage's one-dialog idiom.
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [posting, setPosting] = useState(false);

  // silent skips the skeleton so a hide/restore/delete doesn't flash the thread
  // white — same pattern as ModeratePage and the catalog status writes.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErr('');
    try {
      const data = await fetchComments(songId, { page: 1, limit: 50 });
      setItems(data.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [songId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    setErr('');
    try {
      await postComment(songId, body, replyTo?.id);
      setDraft('');
      setReplyTo(null);
      await load({ silent: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setPosting(false);
    }
  };

  // `isOthers` is passed by the row so this can confirm only when the act is
  // destructive to someone else. Withdrawing your own comment needs no gate;
  // removing a stranger's does — and the delete is a tombstone the UI can't undo.
  const remove = async (id, isOthers = false) => {
    if (isOthers && !window.confirm(
      'Delete this comment? The author will not be able to recover it.\n\n'
      + 'If you only want it off the public thread, hide it instead — hiding is reversible.'
    )) return;

    setBusyId(id);
    setErr('');
    try {
      await deleteComment(id);
      await load({ silent: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const moderate = async (id, status) => {
    setBusyId(id);
    setErr('');
    try {
      await setCommentStatus(id, status);
      await load({ silent: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const rowProps = {
    currentUserId: user?.id,
    canModerate,
    canDeleteAny,
    busyId,
    onReply: (c) => setReplyTo(c),
    onDelete: remove,
    onHide: (id) => moderate(id, 'hidden'),
    onRestore: (id) => moderate(id, 'visible'),
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <ChatBubbleOutlineRoundedIcon color="action" />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Comments</Typography>
      </Stack>

      {/* Composer. When replyTo is set, a chip shows who you're answering and
          lets you cancel back to a top-level post. */}
      <Box sx={{ mb: 3 }}>
        {replyTo && (
          <Chip
            size="small"
            label={`Replying to ${replyTo.author?.displayName || 'comment'}`}
            onDelete={() => setReplyTo(null)}
            sx={{ mb: 1 }}
          />
        )}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            multiline
            maxRows={5}
            size="small"
            placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={posting}
          />
          <Button
            variant="contained"
            startIcon={<SendRoundedIcon />}
            disabled={posting || !draft.trim()}
            onClick={submit}
            sx={{ flexShrink: 0 }}
          >
            {replyTo ? 'Reply' : 'Post'}
          </Button>
        </Stack>
      </Box>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {loading ? (
        <Stack spacing={2}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={72} />)}
        </Stack>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No comments yet. Be the first to say something.
        </Typography>
      ) : (
        <Stack spacing={2.5} divider={<Divider flexItem />}>
          {items.map((c) => (
            <Box key={c.id}>
              <CommentRow comment={c} {...rowProps} />
              {c.replies?.length > 0 && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  {c.replies.map((r) => (
                    <CommentRow key={r.id} comment={r} isReply {...rowProps} />
                  ))}
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}