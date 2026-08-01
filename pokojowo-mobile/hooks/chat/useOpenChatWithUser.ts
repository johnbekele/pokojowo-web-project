import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { chatService } from '@/services';
import useUIStore from '@/stores/uiStore';

/**
 * Open the conversation with a user.
 *
 * The chat route takes a chat ID, so a user ID has to be exchanged for one
 * first: GET /chat/with/{userId} returns the existing chat or creates it. Every
 * entry point into a conversation goes through here, so no caller has to
 * remember that the two IDs are not interchangeable.
 */
export function useOpenChatWithUser() {
  const router = useRouter();
  const { t } = useTranslation('chat');
  const showToast = useUIStore((s) => s.showToast);

  const { mutate, isPending } = useMutation({
    mutationFn: async (userId: string) => {
      const response = await chatService.getChatWithUser(userId);
      const chatId = response.data?._id || response.data?.id;
      if (!chatId) {
        throw new Error('Chat resolved without an id');
      }
      return chatId;
    },
    onSuccess: (chatId) => {
      router.push(`/(app)/(chat)/${chatId}`);
    },
    onError: () => {
      showToast({
        type: 'error',
        message: t('error.openFailed', 'Could not open the conversation. Please try again.'),
      });
    },
  });

  return { openChat: mutate, isOpeningChat: isPending };
}

export default useOpenChatWithUser;
