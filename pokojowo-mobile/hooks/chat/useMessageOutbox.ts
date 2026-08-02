import { useCallback, useMemo } from 'react';
import { dispatchSend, newTempId } from '@/lib/chatOutbox';
import useChatOutboxStore from '@/stores/chatOutboxStore';
import type { Message } from '@/types/chat.types';

/**
 * The messages this device has typed into one conversation and not had
 * confirmed, shaped so they can be rendered as ordinary bubbles.
 *
 * Emitting over a socket is fire-and-forget: if the connection has dropped in a
 * way the client has not noticed yet, the message is gone and the thread looks
 * exactly as it would have if it had been delivered. Every send is recorded
 * before it leaves, and only dropped once the server hands it back.
 */
export function useMessageOutbox(chatId: string, senderId: string | undefined) {
  const all = useChatOutboxStore((s) => s.messages);
  const enqueue = useChatOutboxStore((s) => s.enqueue);

  const pending = useMemo<Message[]>(
    () =>
      all
        .filter((m) => m.chatId === chatId)
        .map((m) => ({
          _id: m.tempId,
          id: m.tempId,
          tempId: m.tempId,
          content: m.content,
          sender: senderId ?? '',
          senderId: senderId ?? '',
          roomId: m.chatId,
          createdAt: m.createdAt,
          replyTo: m.replyTo ?? null,
          replyToData: m.replyToContent
            ? { _id: m.replyTo ?? '', content: m.replyToContent, sender: '' }
            : undefined,
          pendingStatus: m.status,
        })),
    [all, chatId, senderId]
  );

  const send = useCallback(
    (content: string, replyTo?: string, replyToContent?: string) => {
      const tempId = newTempId();
      enqueue({ tempId, chatId, content, replyTo, replyToContent });
      dispatchSend({ tempId, chatId, content, replyTo });
    },
    [chatId, enqueue]
  );

  const retry = useCallback(
    (tempId: string) => {
      const message = useChatOutboxStore.getState().messages.find((m) => m.tempId === tempId);
      if (message) {
        dispatchSend({
          tempId,
          chatId: message.chatId,
          content: message.content,
          replyTo: message.replyTo,
        });
      }
    },
    []
  );

  return { pending, send, retry };
}

export default useMessageOutbox;
