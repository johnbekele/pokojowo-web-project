import { useEffect } from 'react';
import { getChatSocket } from '@/lib/chatSocket';
import { settleSend } from '@/lib/chatOutbox';
import useChatOutboxStore from '@/stores/chatOutboxStore';

/**
 * Listens for the server's send acknowledgement for the whole session.
 *
 * This deliberately does not live on the chat screen: someone who sends a
 * message and immediately backs out of the conversation would take the listener
 * with them, leaving a message that was delivered still showing as unsent, and
 * a duplicate bubble beside the real one when they came back.
 *
 * Mount once inside the authenticated area.
 */
export function useChatOutboxSync() {
  useEffect(() => {
    let attached = false;

    const handleMessageSent = ({ chatId, tempId }: { chatId?: string; tempId?: string }) => {
      if (!chatId) return;

      if (tempId) {
        settleSend(chatId, tempId);
        return;
      }

      // The app and the chat API deploy independently, and an API that predates
      // tempId echoing acknowledges without one. Sends in a conversation are
      // acknowledged in the order they were made, so the oldest unconfirmed
      // message is the one this belongs to. Without this, every message against
      // an older API would sit until it timed out and then report as failed.
      const oldest = useChatOutboxStore.getState().messages.find((m) => m.chatId === chatId);
      if (oldest) settleSend(chatId, oldest.tempId);
    };

    const attach = () => {
      const socket = getChatSocket();
      if (socket && !attached) {
        socket.on('message_sent', handleMessageSent);
        attached = true;
      }
      return attached;
    };

    // The chat socket connects shortly after auth, which can be after this
    // mounts; the notification socket hook deals with the same race this way.
    if (!attach()) {
      const interval = setInterval(() => {
        if (attach()) clearInterval(interval);
      }, 1000);
      return () => {
        clearInterval(interval);
        getChatSocket()?.off('message_sent', handleMessageSent);
      };
    }

    return () => {
      getChatSocket()?.off('message_sent', handleMessageSent);
    };
  }, []);
}

export default useChatOutboxSync;
