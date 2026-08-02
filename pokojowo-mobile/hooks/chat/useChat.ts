import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services';
import type { Message, MessagePage } from '@/types/chat.types';

export const CHAT_KEYS = {
  all: ['chats'] as const,
  list: ['chats', 'list'] as const,
  detail: (chatId: string) => ['chats', 'detail', chatId] as const,
  withUser: (userId: string) => ['chats', 'with', userId] as const,
  messages: (roomId: string) => ['messages', roomId] as const,
};

export function useChats(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: [...CHAT_KEYS.list, params],
    queryFn: async () => {
      const response = await chatService.getChats(params);
      return response.data;
    },
  });
}

export function useChat(chatId: string) {
  return useQuery({
    queryKey: CHAT_KEYS.detail(chatId),
    queryFn: async () => {
      const response = await chatService.getChatById(chatId);
      return response.data;
    },
    enabled: !!chatId,
  });
}

export function useChatWithUser(userId: string) {
  return useQuery({
    queryKey: CHAT_KEYS.withUser(userId),
    queryFn: async () => {
      const response = await chatService.getChatWithUser(userId);
      return response.data;
    },
    enabled: !!userId,
  });
}

/** The API returned a bare array before it returned a page; accept both so the
 * app keeps working against either version. */
function toMessages(data: MessagePage | Message[] | undefined): Message[] {
  if (Array.isArray(data)) return data;
  return data?.messages ?? [];
}

export function useMessages(
  roomId: string,
  params?: { limit?: number; before?: string }
) {
  return useQuery({
    queryKey: [...CHAT_KEYS.messages(roomId), params],
    queryFn: async () => {
      const response = await chatService.getMessages(roomId, params);
      return toMessages(response.data);
    },
    enabled: !!roomId,
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (participants: string[]) => chatService.createChat({ participants }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.list });
    },
  });
}

// Sending is no longer a plain mutation: lib/chatOutbox owns it, because a
// message has to survive the screen being closed and be retryable after a
// failure, which a mutation's lifecycle cannot carry.

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, roomId }: { messageId: string; roomId: string }) =>
      chatService.deleteMessage(messageId),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.messages(roomId) });
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => chatService.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.list });
    },
  });
}
