import chatApi from '@/lib/chatApi';
import type {
  Chat,
  ChatListItem,
  Message,
  MessagePage,
  CreateChatData,
  CreateMessageData,
} from '@/types/chat.types';

export const chatService = {
  // Get all chats for current user
  getChats: (params?: { skip?: number; limit?: number }) =>
    chatApi.get<ChatListItem[]>('/chat/', { params }),

  // Get chat by ID
  getChatById: (chatId: string) =>
    chatApi.get<Chat>(`/chat/${chatId}`),

  // Create a new chat
  createChat: (data: CreateChatData) =>
    chatApi.post<Chat & { message: string; chat_id: string }>('/chat/', data),

  // Get or create chat with specific user
  getChatWithUser: (userId: string) =>
    chatApi.get<Chat>(`/chat/with/${userId}`),

  // Delete a chat
  deleteChat: (chatId: string) =>
    chatApi.delete(`/chat/${chatId}`),

  // Clear this chat's unread count for the current user
  markChatRead: (chatId: string) =>
    chatApi.post<{ chatId: string; readAt: string; unreadCount: number }>(
      `/chat/${chatId}/read`
    ),

  // Newest page of a room's messages. Pass `before` (a message ID) to page
  // back through older ones. The array shape is the pre-envelope API, still
  // accepted here because the app and the API deploy independently.
  getMessages: (
    roomId: string,
    params?: { limit?: number; before?: string; skip?: number }
  ) => chatApi.get<MessagePage | Message[]>(`/messages/room/${roomId}`, { params }),

  // Send a message
  sendMessage: (data: CreateMessageData) =>
    chatApi.post<Message & { message: string; message_id: string }>('/messages/', data),

  // Get message by ID
  getMessageById: (messageId: string) =>
    chatApi.get<Message>(`/messages/${messageId}`),

  // Delete a message (soft delete)
  deleteMessage: (messageId: string) =>
    chatApi.delete<{ message: string; messageId: string }>(`/messages/${messageId}`),
};

export default chatService;
