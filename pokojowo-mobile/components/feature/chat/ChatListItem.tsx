import { View, Text, TouchableOpacity } from 'react-native';
import { Avatar } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import type { ChatListItem as ChatListItemType } from '@/types/chat.types';

interface ChatListItemProps {
  chat: ChatListItemType;
  onPress: () => void;
}

export default function ChatListItem({ chat, onPress }: ChatListItemProps) {
  const { otherUser, lastMessage, unreadCount } = chat;

  const displayName = otherUser?.firstname
    ? `${otherUser.firstname} ${otherUser.lastname || ''}`.trim()
    : 'Unknown User';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-white active:bg-gray-50"
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <Avatar
        source={otherUser?.photo}
        name={displayName}
        size="lg"
        showOnlineStatus
        isOnline={otherUser?.isOnline}
      />

      {/* Content */}
      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {displayName}
          </Text>
          {lastMessage?.createdAt && (
            <Text className="text-xs text-gray-400">
              {formatRelativeTime(lastMessage.createdAt)}
            </Text>
          )}
        </View>

        <View className="flex-row items-center">
          <Text
            className="flex-1 text-gray-500 text-sm"
            numberOfLines={1}
          >
            {lastMessage?.content || 'No messages yet'}
          </Text>

          {unreadCount && unreadCount > 0 && (
            <View className="bg-primary-600 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 ml-2">
              <Text className="text-white text-xs font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
