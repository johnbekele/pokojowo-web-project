import { View, Text, TouchableOpacity } from 'react-native';
import { Reply, Trash2 } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { Message } from '@/types/chat.types';
import useTheme from '@/hooks/useTheme';

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
  const { colors } = useTheme();

  return (
    <View className={cn('mb-2 max-w-[80%]', isOwn ? 'self-end' : 'self-start')}>
      {/* Reply preview */}
      {replyToData && (
        <View
          className={cn(
            'px-3 py-1.5 rounded-t-lg border-l-2 mb-0.5',
            isOwn
              ? 'bg-primary-50 border-primary-400'
              : 'bg-surface border-border'
          )}
        >
          <Text className="text-xs text-muted" numberOfLines={1}>
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
          isOwn ? 'bg-brand rounded-br-md' : 'bg-surface rounded-bl-md',
          replyToData && 'rounded-t-none'
        )}
      >
        {isDeleted ? (
          <Text
            className={cn(
              'italic',
              isOwn ? 'text-white/70' : 'text-muted'
            )}
          >
            Message deleted
          </Text>
        ) : (
          <Text className={cn(isOwn ? 'text-brand-fg' : 'text-text')}>
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
          <Text className="text-xs text-muted">
            {formatRelativeTime(createdAt)}
          </Text>
        )}

        {!isDeleted && (
          <View className="flex-row items-center gap-2">
            {onReply && (
              <TouchableOpacity onPress={onReply} hitSlop={8}>
                <Reply size={14} color={colors.muted} />
              </TouchableOpacity>
            )}
            {isOwn && onDelete && (
              <TouchableOpacity onPress={onDelete} hitSlop={8}>
                <Trash2 size={14} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
