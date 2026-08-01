import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import chatApi from '@/lib/chatApi';

const SCROLL_TRIGGER_PX = 120;

/** Page size requested for message history. Also tells the client when the
 * first page is already the whole conversation. */
export const MESSAGE_PAGE_SIZE = 50;

/**
 * Pages backwards through a conversation's history as the user scrolls up.
 *
 * The newest page stays in React Query so the socket handlers and optimistic
 * sends keep operating on it untouched; older pages are held here. That split is
 * what stops an incoming message from refetching every page already scrolled
 * through.
 *
 * @param roomId chat being viewed
 * @param newestPage chronological messages from the React Query cache
 * @param containerRef the scrolling element holding the thread
 */
export function useOlderMessages(roomId, newestPage, containerRef) {
  const [older, setOlder] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const inFlight = useRef(false);
  const distanceFromBottom = useRef(null);

  useEffect(() => {
    setOlder([]);
    setHasMore(true);
  }, [roomId]);

  // Both lists are chronological, so the oldest loaded message is the first of
  // the older pages, or of the newest page before any have been fetched.
  const cursor = (older[0] ?? newestPage?.[0])?._id;

  // A first page shorter than the limit is the entire conversation, so opening
  // a short chat should not cost a request that can only come back empty.
  const canLoadMore =
    hasMore &&
    !(older.length === 0 && newestPage != null && newestPage.length < MESSAGE_PAGE_SIZE);

  const loadOlder = useCallback(async () => {
    if (inFlight.current || !canLoadMore || !roomId || !cursor) return;

    inFlight.current = true;
    setIsLoadingOlder(true);

    // Measured from the bottom, because prepending changes scrollHeight but
    // leaves the distance to the bottom the same.
    const container = containerRef.current;
    distanceFromBottom.current = container
      ? container.scrollHeight - container.scrollTop
      : null;

    try {
      const res = await chatApi.get(`/messages/room/${roomId}`, {
        params: { before: cursor, limit: MESSAGE_PAGE_SIZE },
      });
      if (Array.isArray(res.data)) {
        // An API that predates cursors ignores `before` and would return the
        // same page forever, so stop rather than loop.
        setHasMore(false);
        return;
      }
      setOlder((prev) => [...(res.data.messages ?? []), ...prev]);
      setHasMore(Boolean(res.data.hasMore));
    } catch {
      // Stop paging rather than retry on every scroll event; reopening retries.
      setHasMore(false);
    } finally {
      inFlight.current = false;
      setIsLoadingOlder(false);
    }
  }, [canLoadMore, containerRef, cursor, roomId]);

  // Restore the reading position before the browser paints the taller list.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container && distanceFromBottom.current != null) {
      container.scrollTop = container.scrollHeight - distanceFromBottom.current;
      distanceFromBottom.current = null;
    }
  }, [containerRef, older]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    // Nothing to scroll back through if the thread already fits on screen.
    if (container.scrollHeight <= container.clientHeight) return;
    if (container.scrollTop < SCROLL_TRIGGER_PX) {
      loadOlder();
    }
  }, [containerRef, loadOlder]);

  return { older, hasMore: canLoadMore, isLoadingOlder, loadOlder, handleScroll };
}

export default useOlderMessages;
