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
import { ArrowLeft, MessageSquare, Send, X } from 'lucide-react-native';

import { useQueryClient } from '@tanstack/react-query';

import { MessageBubble } from '@/components/feature/chat';
import { Avatar, EmptyState, LoadingSpinner, Skeleton } from '@/components/ui';
import {
  useChat,
  useMessages,
  useDeleteMessage,
  CHAT_KEYS,
} from '@/hooks/chat/useChat';
import { useMarkChatRead } from '@/hooks/chat/useMarkChatRead';
import { useMessageOutbox } from '@/hooks/chat/useMessageOutbox';
import { useOlderMessages, MESSAGE_PAGE_SIZE } from '@/hooks/chat/useOlderMessages';
import useAuthStore from '@/stores/authStore';
import {
  getChatSocket,
  connectChatSocket,
  joinChatRoom,
  leaveChatRoom,
  sendChatTyping,
} from '@/lib/chatSocket';
import type { Message } from '@/types/chat.types';
import useTheme from '@/hooks/useTheme';

function ChatRoomSkeleton() {
  return (
    <View className="flex-1 gap-4 px-4 py-6">
      <View className="self-start gap-2">
        <Skeleton width={190} height={42} radius={18} />
        <Skeleton width={70} height={11} />
      </View>
      <View className="self-end gap-2">
        <Skeleton width={230} height={52} radius={18} />
        <Skeleton width={70} height={11} />
      </View>
      <View className="self-start gap-2">
        <Skeleton width={150} height={42} radius={18} />
        <Skeleton width={70} height={11} />
      </View>
    </View>
  );
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation('chat');
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

  const {
    data: chat,
    isLoading: isChatLoading,
    error: chatError,
    refetch: refetchChat,
  } = useChat(id);
  const {
    data: messages,
    isLoading: isMessagesLoading,
    error: messagesError,
    refetch,
  } = useMessages(id, { limit: MESSAGE_PAGE_SIZE });
  const { older, isLoadingOlder, loadOlder } = useOlderMessages(id, messages);
  const { mutate: deleteMessage } = useDeleteMessage();
  const { mutate: markRead } = useMarkChatRead();

  const otherUser = chat?.otherUser;
  const currentUserId = user?.id;

  const { pending, send, retry } = useMessageOutbox(id, currentUserId);

  // The list is `inverted`, which renders index 0 at the bottom, so it needs
  // newest-first. Both message sources are chronological, and anything still
  // unconfirmed is newer than all of them.
  const thread = useMemo(
    () => [...older, ...(messages ?? []), ...pending].reverse(),
    [older, messages, pending]
  );

  // Real-time: join the chat room and subscribe to socket events. Event names
  // and payload shapes are aligned with the backend (see app/core/socket.py):
  // new_message/typing/message_deleted all key off `chatId`.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const handleNewMessage = ({ chatId }: { chatId: string; message: Message }) => {
      if (chatId !== id) return;

      refetch();
      // Arriving while the conversation is on screen counts as read.
      markRead(id);
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.list });
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
    if (!content) return;

    // The outbox owns delivery from here: it shows the message immediately,
    // picks the socket or REST, and marks it failed if nothing comes back.
    send(content, replyingTo?._id, replyingTo?.content);
    setMessageText('');
    setReplyingTo(null);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [messageText, replyingTo, send]);

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
        sendChatTyping(id, true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendChatTyping(id, false);
      }, 2000);
    },
    [id, isTyping]
  );

  const formatDay = useCallback(
    (value: string) => {
      const date = new Date(value);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (date.toDateString() === today.toDateString()) return t('day.today');
      if (date.toDateString() === yesterday.toDateString()) return t('day.yesterday');
      return date.toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    },
    [i18n.language, t]
  );

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const olderMessage = thread[index + 1];
    const showDay =
      !olderMessage ||
      new Date(item.createdAt).toDateString() !== new Date(olderMessage.createdAt).toDateString();
    return (
      <View>
        <MessageBubble
          message={item}
          isOwn={item.sender === currentUserId || item.senderId === currentUserId}
          onReply={() => setReplyingTo(item)}
          onDelete={() => handleDeleteMessage(item._id)}
          onRetry={item.tempId ? () => retry(item.tempId as string) : undefined}
        />
        {showDay && (
          <View className="my-3 flex-row items-center justify-center">
            <View className="h-px flex-1 bg-border" />
            <Text className="px-3 text-xs font-medium text-muted">{formatDay(item.createdAt)}</Text>
            <View className="h-px flex-1 bg-border" />
          </View>
        )}
      </View>
    );
  };

  if (isChatLoading || isMessagesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-row items-center border-b border-border px-4 py-4">
          <Skeleton width={42} circle />
          <Skeleton width="35%" height={18} className="ml-3" />
        </View>
        <ChatRoomSkeleton />
      </SafeAreaView>
    );
  }

  if (chatError || messagesError || !chat) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <EmptyState
          icon={<MessageSquare size={48} color={colors.muted} />}
          title={t('error.title')}
          description={chatError ? t('error.chatNotFound') : t('error.loadMessages')}
          action={{
            label: t('error.retry'),
            onPress: () => {
              void refetchChat();
              void refetch();
            },
          }}
        />
      </SafeAreaView>
    );
  }

  const displayName = otherUser?.firstname
    ? `${otherUser.firstname} ${otherUser.lastname || ''}`.trim()
    : t('title', 'Chat');

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3"
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.backToChats')}
          >
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
              <Text className="text-sm text-brand">{t('typing', 'typing...')}</Text>
            ) : otherUser?.isOnline ? (
              <Text className="text-sm text-success">{t('online', 'Online')}</Text>
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
              <Text className="text-xs text-muted">{t('replyingTo', 'Replying to')}</Text>
              <Text className="text-sm text-text" numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyingTo(null)}
              className="ml-2 p-1"
              accessibilityRole="button"
              accessibilityLabel={t('accessibility.cancelReply')}
            >
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
            accessibilityLabel={t('accessibility.input')}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
            className={`ml-2 w-12 h-12 rounded-full items-center justify-center ${
              messageText.trim() ? 'bg-brand' : 'bg-surface'
            }`}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.sendMessage')}
            accessibilityState={{ disabled: !messageText.trim() }}
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
