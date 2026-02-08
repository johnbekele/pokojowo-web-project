import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services';
import type { CreateMessageData } from '@/types/chat.types';

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

export function useMessages(roomId: string, params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: [...CHAT_KEYS.messages(roomId), params],
    queryFn: async () => {
      const response = await chatService.getMessages(roomId, params);
      return response.data;
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

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMessageData) => chatService.sendMessage(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.messages(variables.room_id) });
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.list });
    },
  });
}

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
