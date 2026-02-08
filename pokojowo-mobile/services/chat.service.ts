import api from '@/lib/api';
import type {
  Chat,
  ChatListItem,
  Message,
  CreateChatData,
  CreateMessageData,
} from '@/types/chat.types';

export const chatService = {
  // Get all chats for current user
  getChats: (params?: { skip?: number; limit?: number }) =>
    api.get<ChatListItem[]>('/chat/', { params }),

  // Get chat by ID
  getChatById: (chatId: string) =>
    api.get<Chat>(`/chat/${chatId}`),

  // Create a new chat
  createChat: (data: CreateChatData) =>
    api.post<Chat & { message: string; chat_id: string }>('/chat/', data),

  // Get or create chat with specific user
  getChatWithUser: (userId: string) =>
    api.get<Chat>(`/chat/with/${userId}`),

  // Delete a chat
  deleteChat: (chatId: string) =>
    api.delete(`/chat/${chatId}`),

  // Get messages for a chat room
  getMessages: (roomId: string, params?: { skip?: number; limit?: number }) =>
    api.get<Message[]>(`/messages/room/${roomId}`, { params }),

  // Send a message
  sendMessage: (data: CreateMessageData) =>
    api.post<Message & { message: string; message_id: string }>('/messages/', data),

  // Get message by ID
  getMessageById: (messageId: string) =>
    api.get<Message>(`/messages/${messageId}`),

  // Delete a message (soft delete)
  deleteMessage: (messageId: string) =>
    api.delete<{ message: string; messageId: string }>(`/messages/${messageId}`),
};

export default chatService;
