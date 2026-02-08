import type { User } from './user.types';

export interface Chat {
  _id: string;
  id: string;
  participants: string[];
  otherUser?: ChatUser;
  messages: string[];
  lastMessage?: Message | null;
  updatedAt?: string;
}

export interface ChatUser {
  _id: string;
  id: string;
  firstname?: string;
  lastname?: string;
  photo?: string;
  isOnline?: boolean;
}

export interface Message {
  _id: string;
  id: string;
  content: string;
  sender: string;
  senderId: string;
  roomId: string;
  createdAt: string;
  replyTo?: string | null;
  replyToData?: ReplyData;
  isDeleted?: boolean;
}

export interface ReplyData {
  _id: string;
  content: string;
  sender: string;
}

export interface CreateChatData {
  participants: string[];
}

export interface CreateMessageData {
  room_id: string;
  content: string;
  reply_to?: string;
}

export interface ChatListItem {
  _id: string;
  id: string;
  participants: string[];
  otherUser?: ChatUser;
  lastMessage?: {
    _id: string;
    content: string;
    sender: string;
    createdAt: string;
  };
  updatedAt?: string;
  unreadCount?: number;
}

export interface TypingEvent {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

export interface OnlineStatusEvent {
  userId: string;
  isOnline: boolean;
}

export interface MessageEvent {
  message: Message;
  roomId: string;
}
