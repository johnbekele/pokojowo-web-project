import { View, Text, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react-native';

import { ChatListItem } from '@/components/feature/chat';
import { EmptyState, Skeleton } from '@/components/ui';
import { useChats } from '@/hooks/chat/useChat';
import type { ChatListItem as ChatListItemType } from '@/types/chat.types';
import useTheme from '@/hooks/useTheme';

function ChatListSkeleton() {
  return (
    <View className="gap-px bg-border">
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} className="flex-row items-center bg-bg px-4 py-4">
          <Skeleton width={56} circle />
          <View className="ml-3 flex-1 gap-2">
            <View className="flex-row justify-between">
              <Skeleton width="42%" height={15} />
              <Skeleton width="18%" height={12} />
            </View>
            <Skeleton width="68%" height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ChatListScreen() {
  const { t } = useTranslation('chat');
  const router = useRouter();
  const { colors } = useTheme();

  const { data: chats, isLoading, isRefetching, error, refetch } = useChats();

  const handleChatPress = (chatId: string) => {
    router.push(`/(app)/(chat)/${chatId}`);
  };

  const renderItem = ({ item }: { item: ChatListItemType }) => (
    <ChatListItem
      chat={item}
      onPress={() => handleChatPress(item._id)}
    />
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="border-b border-border px-4 py-4">
          <Skeleton width="38%" height={28} />
        </View>
        <ChatListSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="border-b border-border px-4 py-4">
          <Text className="text-2xl font-bold text-text">{t('title')}</Text>
        </View>
        <EmptyState
          icon={<MessageSquare size={48} color={colors.muted} />}
          title={t('error.title')}
          description={t('error.loadFailed')}
          action={{ label: t('error.retry'), onPress: () => void refetch() }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-2xl font-bold text-text">
          {t('title', 'Messages')}
        </Text>
      </View>

      {/* Chat list */}
      {chats && chats.length > 0 ? (
        <FlatList
          data={chats}
          renderItem={renderItem}
          keyExtractor={(item, index) => item._id || `chat-${index}`}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-border ml-20" />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.brand}
            />
          }
        />
      ) : (
        <EmptyState
          icon={<MessageSquare size={48} color={colors.muted} />}
          title={t('empty.title', 'No conversations yet')}
          description={t('empty.description', 'Start chatting by matching with flatmates')}
          action={{
            label: t('empty.action', 'Find Flatmates'),
            onPress: () => router.push('/(app)/(matches)'),
          }}
        />
      )}
    </SafeAreaView>
  );
}
