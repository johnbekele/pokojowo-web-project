import type { User } from './user.types';

export interface Chat {
  _id: string;
  id: string;
  participants: string[];
  otherUser?: ChatUser;
  lastMessage?: Message | null;
  unreadCount?: number;
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
  /** Client-generated ID, echoed by the server so a send can be correlated. */
  tempId?: string;
  /**
   * Set only on messages this device has not had confirmed. Their _id is a
   * tempId rather than a server ID, so they cannot be replied to or deleted.
   */
  pendingStatus?: 'sending' | 'failed';
}

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
  /** Message ID to pass as `before` to fetch the next older page. */
  nextBefore: string | null;
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
  /** Echoed back in the response, so the sender can match up its own bubble. */
  tempId?: string;
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
