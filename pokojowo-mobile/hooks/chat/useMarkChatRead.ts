import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services';
import { CHAT_KEYS } from './useChat';

/**
 * Clear a chat's unread count for the current user.
 *
 * Idempotent, so it is safe to call on every open and on each message that
 * arrives while the conversation is on screen. Invalidating the chat list is
 * what clears both the per-row badge and the tab badge, which is summed from
 * the same data.
 */
export function useMarkChatRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatService.markChatRead(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.list });
    },
  });
}

export default useMarkChatRead;
