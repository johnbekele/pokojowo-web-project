import type { Router } from 'expo-router';
import type { AppNotification } from '@/types/notification.types';

/**
 * Maps a notification to an in-app route. Unknown/newer types are ignored
 * gracefully so older builds don't crash on new server notification types.
 */
export function routeForNotification(router: Router, n: AppNotification): void {
  switch (n.type) {
    case 'new_message': {
      if (n.data?.chatId) router.push(`/(app)/(chat)/${n.data.chatId}` as never);
      break;
    }
    case 'new_like':
    case 'mutual_match': {
      const userId = n.data?.likerId || n.data?.matchedUserId;
      if (userId) router.push(`/(app)/(matches)/profile/${userId}` as never);
      else router.push('/(app)/(matches)');
      break;
    }
    case 'saved_search_match': {
      const savedSearchId = n.data?.savedSearchId;
      if (savedSearchId) {
        router.push({
          pathname: '/(app)/(home)',
          params: { savedSearch: savedSearchId },
        } as never);
      } else {
        router.push('/(app)/(home)');
      }
      break;
    }
    default:
      // system / unknown: no navigation
      break;
  }
}
