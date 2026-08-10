import { getChatSocket, sendChatMessage } from '@/lib/chatSocket';
import queryClient from '@/lib/queryClient';
import { CHAT_KEYS } from '@/hooks/chat/useChat';
import { chatService } from '@/services';
import useChatOutboxStore from '@/stores/chatOutboxStore';

/**
 * A send is given this long to come back before it is called failed. Generous,
 * because a slow connection is not the same as a lost message, but short enough
 * that nobody walks away believing something arrived.
 */
const ACK_TIMEOUT_MS = 12000;

// Module scope on purpose. A timer held in component state dies when the user
// leaves the conversation, which is exactly when an in-flight message would be
// left saying "Sending…" with nothing left to resolve it.
const ackTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function newTempId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clearAckTimer(tempId: string) {
  const timer = ackTimers.get(tempId);
  if (timer) {
    clearTimeout(timer);
    ackTimers.delete(tempId);
  }
}

/**
 * Pull the confirmed message into the thread before dropping the local copy, so
 * the bubble is replaced rather than disappearing and coming back.
 */
export async function settleSend(chatId: string, tempId: string) {
  clearAckTimer(tempId);
  // The list carries each conversation's last message and its position, so it
  // goes stale on a send just as the thread does.
  queryClient.invalidateQueries({ queryKey: CHAT_KEYS.list });
  try {
    await queryClient.invalidateQueries({ queryKey: CHAT_KEYS.messages(chatId) });
  } finally {
    useChatOutboxStore.getState().remove(tempId);
  }
}

export function dispatchSend(params: {
  tempId: string;
  chatId: string;
  content: string;
  replyTo?: string;
}) {
  const { tempId, chatId, content, replyTo } = params;

  clearAckTimer(tempId);
  useChatOutboxStore.getState().markSending(tempId);

  const socket = getChatSocket();
  if (socket?.connected) {
    sendChatMessage(chatId, content, replyTo, tempId);

    // Nothing else notices a socket emit that never lands — no error, no
    // rejection — so this timeout is all that stands between a lost message and
    // a thread that claims it was sent.
    ackTimers.set(
      tempId,
      setTimeout(() => {
        ackTimers.delete(tempId);
        useChatOutboxStore.getState().markFailed(tempId);
      }, ACK_TIMEOUT_MS)
    );
    return;
  }

  // No live socket. REST still persists it and reports its own failure, and
  // there will be no broadcast back to a client that is not connected, so the
  // thread has to be refreshed here.
  chatService
    .sendMessage({ room_id: chatId, content, reply_to: replyTo, tempId })
    .then(() => settleSend(chatId, tempId))
    .catch(() => useChatOutboxStore.getState().markFailed(tempId));
}
