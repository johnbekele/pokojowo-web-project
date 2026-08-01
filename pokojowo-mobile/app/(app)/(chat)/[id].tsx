import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, X } from 'lucide-react-native';

import { useQueryClient } from '@tanstack/react-query';

import { MessageBubble } from '@/components/feature/chat';
import { Avatar, LoadingSpinner } from '@/components/ui';
import {
  useChat,
  useMessages,
  useSendMessage,
  useDeleteMessage,
  CHAT_KEYS,
} from '@/hooks/chat/useChat';
import { useMarkChatRead } from '@/hooks/chat/useMarkChatRead';
import { useOlderMessages, MESSAGE_PAGE_SIZE } from '@/hooks/chat/useOlderMessages';
import useAuthStore from '@/stores/authStore';
import {
  getChatSocket,
  connectChatSocket,
  joinChatRoom,
  leaveChatRoom,
} from '@/lib/chatSocket';
import type { Message } from '@/types/chat.types';
import useTheme from '@/hooks/useTheme';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation('chat');
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: chat, isLoading: isChatLoading } = useChat(id);
  const {
    data: messages,
    isLoading: isMessagesLoading,
    refetch,
  } = useMessages(id, { limit: MESSAGE_PAGE_SIZE });
  const { older, isLoadingOlder, loadOlder } = useOlderMessages(id, messages);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: deleteMessage } = useDeleteMessage();
  const { mutate: markRead } = useMarkChatRead();

  const otherUser = chat?.otherUser;
  const currentUserId = user?.id;

  // The list is `inverted`, which renders index 0 at the bottom, so it needs
  // newest-first. Both message sources are chronological.
  const thread = useMemo(
    () => [...older, ...(messages ?? [])].reverse(),
    [older, messages]
  );

  // Real-time: join the chat room and subscribe to socket events. Event names
  // and payload shapes are aligned with the backend (see app/core/socket.py):
  // new_message/typing/message_deleted all key off `chatId`.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const handleNewMessage = ({ chatId }: { chatId: string; message: Message }) => {
      if (chatId === id) {
        refetch();
        // Arriving while the conversation is on screen counts as read.
        markRead(id);
        queryClient.invalidateQueries({ queryKey: CHAT_KEYS.list });
      }
    };
    const handleTyping = ({
      chatId,
      userId,
      isTyping: peerIsTyping = true,
    }: {
      chatId: string;
      userId: string;
      isTyping?: boolean;
    }) => {
      if (chatId !== id || userId === currentUserId) return;

      if (peerTypingTimeoutRef.current) {
        clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = null;
      }
      setOtherUserTyping(peerIsTyping);

      // The server sends isTyping:false when they stop, so this is only a
      // safety net for a dropped event, not the mechanism that clears it.
      if (peerIsTyping) {
        peerTypingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 6000);
      }
    };
    const handleDeleted = ({ chatId }: { chatId: string }) => {
      if (chatId === id) refetch();
    };

    const setup = async () => {
      let socket = getChatSocket();
      if (!socket?.connected) {
        socket = await connectChatSocket(useAuthStore.getState().token || '');
      }
      if (cancelled || !socket) return;

      joinChatRoom(id);
      socket.on('new_message', handleNewMessage);
      socket.on('typing', handleTyping);
      socket.on('message_deleted', handleDeleted);
    };
    setup();

    return () => {
      cancelled = true;
      const socket = getChatSocket();
      leaveChatRoom(id);
      socket?.off('new_message', handleNewMessage);
      socket?.off('typing', handleTyping);
      socket?.off('message_deleted', handleDeleted);
      if (peerTypingTimeoutRef.current) {
        clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = null;
      }
    };
  }, [id, currentUserId, refetch, queryClient, markRead]);

  useEffect(() => {
    if (id) markRead(id);
  }, [id, markRead]);

  const handleSendMessage = useCallback(() => {
    const content = messageText.trim();
    if (!content || isSending) return;

    const socket = getChatSocket();
    const resetInput = () => {
      setMessageText('');
      setReplyingTo(null);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    if (socket?.connected) {
      socket.emit('send_message', {
        chatId: id,
        content,
        replyTo: replyingTo?._id,
      });
      resetInput();
    } else {
      // Offline fallback: persist via REST, then refresh.
      sendMessage(
        { room_id: id, content, reply_to: replyingTo?._id },
        {
          onSuccess: () => {
            resetInput();
            refetch();
          },
        }
      );
    }
  }, [messageText, id, replyingTo, isSending, sendMessage, refetch]);

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      deleteMessage({ messageId, roomId: id });
    },
    [deleteMessage, id]
  );

  const handleTyping = useCallback(
    (text: string) => {
      setMessageText(text);

      const socket = getChatSocket();
      if (socket?.connected && !isTyping) {
        setIsTyping(true);
        socket.emit('typing', { chatId: id, isTyping: true });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        getChatSocket()?.emit('typing', { chatId: id, isTyping: false });
      }, 2000);
    },
    [id, isTyping]
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      isOwn={item.sender === currentUserId || item.senderId === currentUserId}
      onReply={() => setReplyingTo(item)}
      onDelete={() => handleDeleteMessage(item._id)}
    />
  );

  if (isChatLoading || isMessagesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  const displayName = otherUser?.firstname
    ? `${otherUser.firstname} ${otherUser.lastname || ''}`.trim()
    : 'Chat';

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <Avatar
            source={otherUser?.photo}
            name={displayName}
            size="md"
            showOnlineStatus
            isOnline={otherUser?.isOnline}
          />

          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-text">
              {displayName}
            </Text>
            {otherUserTyping ? (
              <Text className="text-sm text-brand">Typing...</Text>
            ) : otherUser?.isOnline ? (
              <Text className="text-sm text-green-600">Online</Text>
            ) : null}
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={thread}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item._id || `msg-${index}`}
          inverted
          // The end of an inverted list is the top of the thread, so this is
          // "scrolled back far enough, fetch older messages".
          onEndReached={loadOlder}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoadingOlder ? (
              <View className="py-3">
                <LoadingSpinner />
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center">
              <Text className="text-muted">
                {t('room.empty', 'No messages yet. Say hello!')}
              </Text>
            </View>
          }
        />

        {/* Reply preview */}
        {replyingTo && (
          <View className="flex-row items-center px-4 py-2 bg-surface border-t border-border">
            <View className="flex-1 border-l-2 border-primary-500 pl-3">
              <Text className="text-xs text-muted">Replying to</Text>
              <Text className="text-sm text-text" numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} className="ml-2 p-1">
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View className="flex-row items-end px-4 py-3 border-t border-border bg-bg">
          <TextInput
            className="flex-1 bg-surface rounded-2xl text-text px-4 py-3 text-base max-h-24"
            placeholder={t('room.placeholder', 'Type a message...')}
            placeholderTextColor={colors.muted}
            value={messageText}
            onChangeText={handleTyping}
            multiline
            textAlignVertical="center"
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            className={`ml-2 w-12 h-12 rounded-full items-center justify-center ${
              messageText.trim() ? 'bg-brand' : 'bg-surface'
            }`}
          >
            <Send
              size={20}
              color={messageText.trim() ? colors.brandFg : colors.muted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
