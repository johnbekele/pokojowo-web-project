import { useState, useRef, useEffect, useCallback } from 'react';
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

import { MessageBubble } from '@/components/feature/chat';
import { Avatar, LoadingSpinner } from '@/components/ui';
import { useChat, useMessages, useSendMessage, useDeleteMessage } from '@/hooks/chat/useChat';
import useAuthStore from '@/stores/authStore';
import { getSocket, connectSocket } from '@/lib/socket';
import type { Message } from '@/types/chat.types';
import { COLORS } from '@/lib/constants';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation('chat');
  const { user } = useAuthStore();

  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: chat, isLoading: isChatLoading } = useChat(id);
  const { data: messages, isLoading: isMessagesLoading, refetch } = useMessages(id);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: deleteMessage } = useDeleteMessage();

  const otherUser = chat?.otherUser;
  const currentUserId = user?.id;

  // Socket connection for real-time
  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected) {
      connectSocket(useAuthStore.getState().token || '');
    }

    if (socket && id) {
      socket.emit('join_room', id);

      socket.on('new_message', (message: Message) => {
        if (message.roomId === id) {
          refetch();
        }
      });

      socket.on('typing', ({ roomId, userId }: { roomId: string; userId: string }) => {
        if (roomId === id && userId !== currentUserId) {
          setOtherUserTyping(true);
          setTimeout(() => setOtherUserTyping(false), 3000);
        }
      });

      socket.on('message_deleted', ({ roomId }: { roomId: string }) => {
        if (roomId === id) {
          refetch();
        }
      });

      return () => {
        socket.emit('leave_room', id);
        socket.off('new_message');
        socket.off('typing');
        socket.off('message_deleted');
      };
    }
  }, [id, currentUserId, refetch]);

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || isSending) return;

    sendMessage(
      {
        room_id: id,
        content: messageText.trim(),
        reply_to: replyingTo?._id,
      },
      {
        onSuccess: () => {
          setMessageText('');
          setReplyingTo(null);
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        },
      }
    );
  }, [messageText, id, replyingTo, isSending, sendMessage]);

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      deleteMessage({ messageId, roomId: id });
    },
    [deleteMessage, id]
  );

  const handleTyping = useCallback(
    (text: string) => {
      setMessageText(text);

      const socket = getSocket();
      if (socket && !isTyping) {
        setIsTyping(true);
        socket.emit('typing', { roomId: id, userId: currentUserId });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    },
    [id, currentUserId, isTyping]
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
      <SafeAreaView className="flex-1 bg-white">
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  const displayName = otherUser?.firstname
    ? `${otherUser.firstname} ${otherUser.lastname || ''}`.trim()
    : 'Chat';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>

          <Avatar
            source={otherUser?.photo}
            name={displayName}
            size="md"
            showOnlineStatus
            isOnline={otherUser?.isOnline}
          />

          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-gray-900">
              {displayName}
            </Text>
            {otherUserTyping ? (
              <Text className="text-sm text-primary-600">Typing...</Text>
            ) : otherUser?.isOnline ? (
              <Text className="text-sm text-green-600">Online</Text>
            ) : null}
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages || []}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item._id || `msg-${index}`}
          inverted
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-400">
                {t('room.empty', 'No messages yet. Say hello!')}
              </Text>
            </View>
          }
        />

        {/* Reply preview */}
        {replyingTo && (
          <View className="flex-row items-center px-4 py-2 bg-gray-50 border-t border-gray-100">
            <View className="flex-1 border-l-2 border-primary-500 pl-3">
              <Text className="text-xs text-gray-500">Replying to</Text>
              <Text className="text-sm text-gray-700" numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} className="ml-2 p-1">
              <X size={20} color={COLORS.gray[500]} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View className="flex-row items-end px-4 py-3 border-t border-gray-100 bg-white">
          <TextInput
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base max-h-24"
            placeholder={t('room.placeholder', 'Type a message...')}
            value={messageText}
            onChangeText={handleTyping}
            multiline
            textAlignVertical="center"
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            className={`ml-2 w-12 h-12 rounded-full items-center justify-center ${
              messageText.trim() ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <Send
              size={20}
              color={messageText.trim() ? 'white' : COLORS.gray[400]}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
