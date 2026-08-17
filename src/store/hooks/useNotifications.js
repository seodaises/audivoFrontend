import { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  loadNotifications,
  loadUnreadCount,
  markRead as markReadThunk,
  markAllRead as markAllReadThunk,
} from '../slices/notificationsSlice';

const POLL_MS = 60_000;

export function useNotifications({ poll = false } = {}) {
  const dispatch = useDispatch();
  const { items, unread, page, totalPages, loading, loadingMore, error } =
    useSelector((s) => s.notifications);
  const user = useSelector((s) => s.auth.user);

  const refreshCount = useCallback(() => {
    if (!user) return;
    dispatch(loadUnreadCount());
  }, [dispatch, user]);

  const loadFeed = useCallback(
    (opts = {}) => dispatch(loadNotifications({ page: 1, limit: 20, ...opts })),
    [dispatch]
  );

  const loadMore = useCallback(() => {
    if (loadingMore || page >= totalPages) return;
    dispatch(loadNotifications({ page: page + 1, limit: 20 }));
  }, [dispatch, loadingMore, page, totalPages]);

  const markOneRead = useCallback((id) => dispatch(markReadThunk(id)), [dispatch]);
  const markEveryRead = useCallback(() => dispatch(markAllReadThunk()), [dispatch]);

  useEffect(() => {
    if (!poll || !user) return;

    refreshCount(); // don't wait a full interval for the first number
    const id = setInterval(refreshCount, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [poll, user, refreshCount]);

  return {
    items, unread, page, totalPages, loading, loadingMore, error,
    loadFeed, loadMore, refreshCount, markOneRead, markEveryRead,
  };
}

export default useNotifications;