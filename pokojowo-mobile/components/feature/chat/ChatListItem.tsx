import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import type { ChatListItem as ChatListItemType } from '@/types/chat.types';

interface ChatListItemProps {
  chat: ChatListItemType;
  onPress: () => void;
}

export default function ChatListItem({ chat, onPress }: ChatListItemProps) {
  const { t } = useTranslation('chat');
  const { otherUser, lastMessage, unreadCount } = chat;

  const displayName = otherUser?.firstname
    ? `${otherUser.firstname} ${otherUser.lastname || ''}`.trim()
    : t('unknownUser', 'Unknown user');

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-bg active:bg-surface"
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
          <Text className="text-base font-semibold text-text" numberOfLines={1}>
            {displayName}
          </Text>
          {lastMessage?.createdAt && (
            <Text className="text-xs text-muted">
              {formatRelativeTime(lastMessage.createdAt)}
            </Text>
          )}
        </View>

        <View className="flex-row items-center">
          <Text
            className="flex-1 text-muted text-sm"
            numberOfLines={1}
          >
            {lastMessage?.content || t('noMessages', 'No messages yet')}
          </Text>

          {unreadCount && unreadCount > 0 && (
            <View className="bg-brand rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 ml-2">
              <Text className="text-brand-fg text-xs font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
