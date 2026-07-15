// Shared display formatters for the admin tables.
//
// These four pages all render the same KINDS of value — a duration, a play count,
// a timestamp, a "never happened" null. Before this, each page invented its own
// fmtDate and its own null fallback, so "—" on one page was "N/A" on another and
// a blank cell on a third. One module, one answer.

// A duration in seconds -> "3:07". Null-safe: a song whose duration was never
// probed shows an em dash, not "NaN:aN".
export const fmtDuration = (secs) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = String(Math.floor(secs % 60)).padStart(2, '0');
  return `${m}:${s}`;
};

const nf = new Intl.NumberFormat();

// Counts get thousands separators. 12847 plays is much easier to read as 12,847.
export const fmtCount = (n) => (n == null ? '—' : nf.format(n));

// Absolute date, no time. Used where WHEN it happened matters more than how long
// ago — a join date, a release date.
export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// Date + time. For an audit trail, the hour matters.
export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// "3 days ago". The right format for recency questions — "is this user active?"
// is answered instantly by "2 days ago" and not at all by "11 Jul 2026".
export const fmtRelative = (iso) => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';

  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'Just now';

  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
};