import { View, Text, TouchableOpacity } from 'react-native';
import { Reply, Trash2 } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { Message } from '@/types/chat.types';
import { COLORS } from '@/lib/constants';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReply?: () => void;
  onDelete?: () => void;
  showTimestamp?: boolean;
}

export default function MessageBubble({
  message,
  isOwn,
  onReply,
  onDelete,
  showTimestamp = true,
}: MessageBubbleProps) {
  const { content, createdAt, replyToData, isDeleted } = message;

  return (
    <View className={cn('mb-2 max-w-[80%]', isOwn ? 'self-end' : 'self-start')}>
      {/* Reply preview */}
      {replyToData && (
        <View
          className={cn(
            'px-3 py-1.5 rounded-t-lg border-l-2 mb-0.5',
            isOwn
              ? 'bg-primary-50 border-primary-400'
              : 'bg-gray-100 border-gray-400'
          )}
        >
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {replyToData.content}
          </Text>
        </View>
      )}

      {/* Message bubble */}
      <TouchableOpacity
        onLongPress={() => {}}
        activeOpacity={0.8}
        className={cn(
          'px-4 py-2.5 rounded-2xl',
          isOwn ? 'bg-primary-600 rounded-br-md' : 'bg-gray-100 rounded-bl-md',
          replyToData && 'rounded-t-none'
        )}
      >
        {isDeleted ? (
          <Text
            className={cn(
              'italic',
              isOwn ? 'text-primary-200' : 'text-gray-400'
            )}
          >
            Message deleted
          </Text>
        ) : (
          <Text className={cn(isOwn ? 'text-white' : 'text-gray-900')}>
            {content}
          </Text>
        )}
      </TouchableOpacity>

      {/* Timestamp and actions */}
      <View
        className={cn(
          'flex-row items-center mt-1 gap-3',
          isOwn ? 'justify-end' : 'justify-start'
        )}
      >
        {showTimestamp && (
          <Text className="text-xs text-gray-400">
            {formatRelativeTime(createdAt)}
          </Text>
        )}

        {!isDeleted && (
          <View className="flex-row items-center gap-2">
            {onReply && (
              <TouchableOpacity onPress={onReply} hitSlop={8}>
                <Reply size={14} color={COLORS.gray[400]} />
              </TouchableOpacity>
            )}
            {isOwn && onDelete && (
              <TouchableOpacity onPress={onDelete} hitSlop={8}>
                <Trash2 size={14} color={COLORS.gray[400]} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
