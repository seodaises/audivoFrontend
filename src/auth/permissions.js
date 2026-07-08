export const PERMISSIONS = {
  UPLOAD_SONGS: 'upload_songs',
  DELETE_SONGS: 'delete_songs',
  MANAGE_USERS: 'manage_users',
  VIEW_ANALYTICS: 'view_analytics',
  FEATURE_SONGS: 'feature_songs',
  MODERATE_COMMENTS: 'moderate_comments',
  MANAGE_ROLES: 'manage_roles',
};
const P = PERMISSIONS;

// Mirrors the backend `roles` seed (name, level, granted permissions).
export const ROLES = {
  super_admin: { key: 'super_admin', label: 'Super Admin', level: 5,
    permissions: [P.UPLOAD_SONGS, P.DELETE_SONGS, P.MANAGE_USERS, P.VIEW_ANALYTICS, P.FEATURE_SONGS, P.MODERATE_COMMENTS, P.MANAGE_ROLES] },
  admin: { key: 'admin', label: 'Admin', level: 4,
    permissions: [P.UPLOAD_SONGS, P.DELETE_SONGS, P.MANAGE_USERS, P.VIEW_ANALYTICS, P.FEATURE_SONGS, P.MODERATE_COMMENTS] },
  moderator: { key: 'moderator', label: 'Moderator', level: 3,
    permissions: [P.MODERATE_COMMENTS] },
  artist: { key: 'artist', label: 'Artist', level: 2, 
    permissions: [P.UPLOAD_SONGS, P.DELETE_SONGS, P.VIEW_ANALYTICS, P.FEATURE_SONGS] }, 
  listener: { key: 'listener', label: 'Listener', level: 1, permissions: [] },
};