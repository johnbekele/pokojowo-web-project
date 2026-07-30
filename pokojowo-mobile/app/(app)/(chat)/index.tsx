import { View, Text, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react-native';

import { ChatListItem } from '@/components/feature/chat';
import { LoadingSpinner, EmptyState } from '@/components/ui';
import { useChats } from '@/hooks/chat/useChat';
import type { ChatListItem as ChatListItemType } from '@/types/chat.types';
import useTheme from '@/hooks/useTheme';

export default function ChatListScreen() {
  const { t } = useTranslation('chat');
  const router = useRouter();
  const { colors } = useTheme();

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
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <LoadingSpinner fullScreen text={t('loading', 'Loading conversations...')} />
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
