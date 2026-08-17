import { api } from './client';

// GET /notifications?page=&limit=&unreadOnly=

export function fetchNotifications({ page = 1, limit = 20, unreadOnly = false } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (unreadOnly) params.set('unreadOnly', 'true');
  return api(`/notifications?${params.toString()}`).then((res) => res.data);
}

// GET /notifications/unread-count -> { unread: number }
// Cheap, indexed count. This is what the header badge polls; the full feed is
// only fetched when the panel actually opens.
export function fetchUnreadCount() {
  return api('/notifications/unread-count').then((res) => res.data);
}

// PATCH /notifications/:id/read -> { id, isRead: true }
// Idempotent: marking an already-read notification read again is a no-op that
// still returns 200, so a double-click can't produce an error.
export function markNotificationRead(notificationId) {
  return api(`/notifications/${notificationId}/read`, { method: 'PATCH' }).then((res) => res.data);
}

// PATCH /notifications/read-all -> { updated: number }
// One write for the whole unread set, rather than N requests from the client.
export function markAllNotificationsRead() {
  return api('/notifications/read-all', { method: 'PATCH' }).then((res) => res.data);
}