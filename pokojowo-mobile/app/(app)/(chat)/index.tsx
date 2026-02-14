import { View, Text, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react-native';

import { ChatListItem } from '@/components/feature/chat';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { useChats } from '@/hooks/chat/useChat';
import type { ChatListItem as ChatListItemType } from '@/types/chat.types';
import { COLORS } from '@/lib/constants';

export default function ChatListScreen() {
  const { t } = useTranslation('chat');
  const router = useRouter();

  const { data: chats, isLoading, isRefetching, refetch } = useChats();

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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <LoadingSpinner fullScreen text={t('loading', 'Loading conversations...')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">
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
            <View className="h-px bg-gray-100 ml-20" />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary[600]}
            />
          }
        />
      ) : (
        <EmptyState
          icon={<MessageSquare size={48} color={COLORS.gray[400]} />}
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
