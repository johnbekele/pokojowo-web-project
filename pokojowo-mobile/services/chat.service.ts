import chatApi from '@/lib/chatApi';
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

  // Get messages for a chat room
  getMessages: (roomId: string, params?: { skip?: number; limit?: number }) =>
    chatApi.get<Message[]>(`/messages/room/${roomId}`, { params }),

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
