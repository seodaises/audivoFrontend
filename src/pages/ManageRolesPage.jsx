import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, Stack, Button, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Select, MenuItem, Alert, Skeleton, Snackbar,
  Chip, Divider, Checkbox, Tooltip,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PERMISSION_LABELS = {
  upload_songs: 'Upload songs',
  delete_songs: 'Delete songs',
  manage_users: 'Manage users',
  view_analytics: 'View analytics',
  feature_songs: 'Feature songs',
  moderate_comments: 'Moderate comments',
  manage_roles: 'Manage roles',
};
const prettyPermission = (key) =>
  PERMISSION_LABELS[key] || key.replace(/_/g, ' ');

const ROLE_LEVEL = {
  'Super Admin': 5, 'Admin': 4, 'Moderator': 3, 'Artist': 2, 'Listener': 1,
};

const ASSIGNABLE_ROLES = ['Admin', 'Moderator', 'Artist', 'Listener'];

export default function ManageRolesPage() {
  const { user: me } = useAuth();
  const myLevel = ROLE_LEVEL[me?.role] ?? 0;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const { data } = await api('/admin/users?page=1&limit=100');
      setRows(data.users);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (targetUser, newRole) => {
    setSavingId(targetUser.id); setErr(null);
    try {
      await api(`/admin/users/${targetUser.id}/role`, { method: 'PATCH', body: { role: newRole } });
      setToast(`@${targetUser.username} is now ${newRole}`);
      await load(); // re-pull so the table reflects the new state
    } catch (e) {
      setErr(e.message); // e.g. "You cannot change your own role"
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Manage roles</Typography>
      </Box>

      <PermissionMatrix />

      <Divider sx={{ my: 4 }} />

      {err && <Alert severity="error" sx={{ mb: 2, mt: 2 }}>{err}</Alert>}

      <Paper variant="outlined" sx={{ mt: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Display name</TableCell>
                <TableCell sx={{ width: 200 }}>Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={120} /></TableCell>
                    <TableCell><Skeleton width={160} /></TableCell>
                    <TableCell><Skeleton width={140} /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} sx={{ borderBottom: 'none' }}>
                    <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        No users to manage yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Users will appear here once accounts exist.
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => {
                  const isSelf = u.id === me?.id;
                  const outranked = myLevel > (ROLE_LEVEL[u.role] ?? 0);
                  const editable = !isSelf && outranked;
                  return (
                    <TableRow key={u.id} hover>
                      <TableCell>@{u.username}</TableCell>
                      <TableCell>{u.displayName || '—'}</TableCell>
                      <TableCell>
                        {editable ? (
                          <Select
                            size="small" fullWidth value={u.role}
                            disabled={savingId === u.id}
                            onChange={(e) => changeRole(u, e.target.value)}
                          >
                            {/* Current role always shown, even Super Admin, so the
                                dropdown reflects reality; only assignable roles are options. */}
                            {[...new Set([u.role, ...ASSIGNABLE_ROLES])].map((r) => (
                              <MenuItem key={r} value={r} disabled={r === 'Super Admin'}>
                                {r}
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          <Chip label={u.role} size="small" variant="outlined"
                            color={isSelf ? 'default' : 'default'} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={!!toast} autoHideDuration={4000} onClose={() => setToast('')}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

function PermissionMatrix() {
  const [permissions, setPermissions] = useState([]); // [{ id, key, description }]
  const [roles, setRoles] = useState([]);             // editable roles only
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [grants, setGrants] = useState({});     // staged (what the UI shows)
  const [baseline, setBaseline] = useState({}); // last-loaded server truth

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [permsRes, rolesRes] = await Promise.all([
        api('/admin/permissions'),
        api('/admin/roles'),
      ]);
      const perms = permsRes.data;
      const editableRoles = rolesRes.data.filter((r) => r.editable);

      // Build the grants map from the server's per-role permission lists.
      const built = {};
      for (const role of editableRoles) built[role.id] = new Set(role.permissions);

      setPermissions(perms);
      setRoles(editableRoles);
      setGrants(built);
      setBaseline(built);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Toggle a single (role, permission) cell in the STAGED map only.
  const toggle = (roleId, permKey) => {
    setGrants((prev) => {
      const next = { ...prev };
      const set = new Set(next[roleId]); // clone so React sees a new reference
      if (set.has(permKey)) set.delete(permKey);
      else set.add(permKey);
      next[roleId] = set;
      return next;
    });
  };
  const pendingChanges = useMemo(() => {
    const changes = [];
    for (const role of roles) {
      const now = grants[role.id] || new Set();
      const was = baseline[role.id] || new Set();
      // Granted now but not before → grant.
      for (const key of now) if (!was.has(key)) changes.push({ roleId: role.id, permKey: key, action: 'grant' });
      // Present before but not now → revoke.
      for (const key of was) if (!now.has(key)) changes.push({ roleId: role.id, permKey: key, action: 'revoke' });
    }
    return changes;
  }, [grants, baseline, roles]);

  const hasChanges = pendingChanges.length > 0;

  // Show the unsaved-changes toast whenever pending edits exist.
  useEffect(() => {
    if (hasChanges) setToast(`${pendingChanges.length} unsaved change${pendingChanges.length > 1 ? 's' : ''}`);
    else setToast('');
  }, [hasChanges, pendingChanges.length]);

  const discard = () => {
    setGrants(baseline); // revert staged back to server truth
  };

  const save = async () => {
    if (!hasChanges) return;
    setSaving(true); setErr(null);
    try {
      // Fire each change against the granular toggle endpoints. Sequential
      // keeps error attribution clear and avoids hammering the API at once.
      for (const change of pendingChanges) {
        const path = `/admin/roles/${change.roleId}/permissions/${change.permKey}`;
        await api(path, { method: change.action === 'grant' ? 'POST' : 'DELETE' });
      }
      // Re-pull from the server so baseline + staged reflect the saved truth.
      await load();
    } catch (e) {
      setErr(e.message); // e.g. a lock/permission error from the backend
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <ShieldRoundedIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Role permissions</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Grant or revoke what each role can do. Changes are staged until you save.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                {loading
                  ? <TableCell><Skeleton width={80} /></TableCell>
                  : permissions.map((p) => (
                      <TableCell key={p.key} align="center" sx={{ fontWeight: 600 }}>
                        <Tooltip title={p.description || ''} arrow>
                          <span>{prettyPermission(p.key)}</span>
                        </Tooltip>
                      </TableCell>
                    ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={60} /></TableCell>
                  </TableRow>
                ))
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{role.name}</TableCell>
                    {permissions.map((p) => {
                      const checked = (grants[role.id] || new Set()).has(p.key);
                      const changed =
                        checked !== (baseline[role.id] || new Set()).has(p.key);
                      return (
                        <TableCell key={p.key} align="center" sx={{ py: 0.25 }}>
                          <Checkbox
                            size="small"
                            checked={checked}
                            disabled={saving}
                            onChange={() => toggle(role.id, p.key)}
                            // Subtle amber ring on cells with a pending change.
                            sx={changed ? {
                              outline: '2px solid',
                              outlineColor: 'primary.main',
                              borderRadius: 1,
                            } : undefined}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Save row appears only when there are pending changes. */}
      {hasChanges && (
        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 2 }}>
          <Button color="inherit" onClick={discard} disabled={saving}>
            Discard
          </Button>
          <Button
            variant="contained" disableElevation startIcon={<SaveRoundedIcon />}
            onClick={save} disabled={saving}
          >
            {saving ? 'Saving...' : `Save changes (${pendingChanges.length})`}
          </Button>
        </Stack>
      )}

      <Snackbar
        open={!!toast}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Box>
  );
}