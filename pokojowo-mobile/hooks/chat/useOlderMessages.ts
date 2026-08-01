import { useCallback, useEffect, useRef, useState } from 'react';
import { chatService } from '@/services';
import type { Message } from '@/types/chat.types';

/** Page size requested for message history. Also tells the client when the
 * first page is already the whole conversation. */
export const MESSAGE_PAGE_SIZE = 50;

/**
 * Pages backwards through a conversation's history.
 *
 * The newest page stays in React Query so live socket updates keep working on
 * it; older pages are held here instead. That separation is what stops an
 * incoming message from refetching every page the user has scrolled back
 * through, and keeps the optimistic-send cache handling untouched.
 */
export function useOlderMessages(roomId: string, newestPage: Message[] | undefined) {
  const [older, setOlder] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    setOlder([]);
    setHasMore(true);
  }, [roomId]);

  // Both lists are chronological, so the oldest message loaded is the first of
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
    try {
      const { data } = await chatService.getMessages(roomId, {
        before: cursor,
        limit: MESSAGE_PAGE_SIZE,
      });
      if (Array.isArray(data)) {
        // An API that predates cursors ignores `before` and would return the
        // same page forever, so stop rather than loop.
        setHasMore(false);
        return;
      }
      setOlder((prev) => [...(data.messages ?? []), ...prev]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      // Stop paging rather than retry on every scroll; reopening retries.
      setHasMore(false);
    } finally {
      inFlight.current = false;
      setIsLoadingOlder(false);
    }
  }, [canLoadMore, cursor, roomId]);

  return { older, hasMore: canLoadMore, isLoadingOlder, loadOlder };
}

export default useOlderMessages;
