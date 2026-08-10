import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import likesService from '@/services/likes.service';
import useLikesStore from '@/stores/likesStore';

const DEFAULT_PAGE = { limit: 50, offset: 0 };

export const likesKeys = {
  all: ['likes'],
  sent: ({ limit = DEFAULT_PAGE.limit, offset = DEFAULT_PAGE.offset } = {}) => [
    'likes',
    'sent',
    { limit, offset },
  ],
  received: ({ limit = DEFAULT_PAGE.limit, offset = DEFAULT_PAGE.offset } = {}) => [
    'likes',
    'received',
    { limit, offset },
  ],
  mutual: ({ limit = DEFAULT_PAGE.limit, offset = DEFAULT_PAGE.offset } = {}) => [
    'likes',
    'mutual',
    { limit, offset },
  ],
  stats: () => ['likes', 'stats'],
  status: (userId) => ['likes', 'status', userId],
};

export function useLikesSent({ limit = DEFAULT_PAGE.limit, offset = DEFAULT_PAGE.offset, enabled = true } = {}) {
  return useQuery({
    queryKey: likesKeys.sent({ limit, offset }),
    queryFn: () => likesService.getLikesSent({ limit, offset }),
    enabled,
  });
}

export function useLikesReceived({ limit = DEFAULT_PAGE.limit, offset = DEFAULT_PAGE.offset, enabled = true } = {}) {
  return useQuery({
    queryKey: likesKeys.received({ limit, offset }),
    queryFn: () => likesService.getLikesReceived({ limit, offset }),
    enabled,
  });
}

export function useMutualMatches({ limit = DEFAULT_PAGE.limit, offset = DEFAULT_PAGE.offset, enabled = true } = {}) {
  return useQuery({
    queryKey: likesKeys.mutual({ limit, offset }),
    queryFn: () => likesService.getMutualMatches({ limit, offset }),
    enabled,
  });
}

export function useLikesStats({ enabled = true } = {}) {
  return useQuery({
    queryKey: likesKeys.stats(),
    queryFn: likesService.getStats,
    enabled,
  });
}

export function useLikeStatus(userId, { enabled = true } = {}) {
  return useQuery({
    queryKey: likesKeys.status(userId),
    queryFn: () => likesService.getLikeStatus(userId),
    enabled: enabled && !!userId,
    retry: false,
  });
}

function invalidateLikes(queryClient) {
  queryClient.invalidateQueries({ queryKey: likesKeys.all });
}

export function useLikeUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: likesService.likeUser,
    onSuccess: (data, userId) => {
      queryClient.setQueryData(likesKeys.status(userId), (previous = {}) => ({
        ...previous,
        i_liked: true,
        is_mutual: Boolean(data?.is_mutual || previous.is_mutual),
        they_liked: Boolean(data?.is_mutual || previous.they_liked),
      }));
      invalidateLikes(queryClient);
      if (data?.is_mutual) {
        useLikesStore.getState().setMutualMatchData({
          matchedUserId: data.mutual_match?.matched_user_id || userId,
          matchedUserName: data.mutual_match?.user?.firstname
            ? `${data.mutual_match.user.firstname} ${data.mutual_match.user.lastname || ''}`.trim()
            : undefined,
          matchedUserPhoto: data.mutual_match?.user?.photo,
        });
      }
    },
  });
}

export function useUnlikeUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: likesService.unlikeUser,
    onSuccess: (_, userId) => {
      queryClient.setQueryData(likesKeys.status(userId), (previous = {}) => ({
        ...previous,
        i_liked: false,
        is_mutual: false,
      }));
      invalidateLikes(queryClient);
    },
  });
}

export function usePassUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: likesService.passUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matches'] }),
  });
}

export function useUndoPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: likesService.undoPass,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matches'] }),
  });
}

export function useUnmatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: likesService.unmatch,
    onSuccess: (_, userId) => {
      queryClient.setQueryData(likesKeys.status(userId), (previous = {}) => ({
        ...previous,
        is_mutual: false,
      }));
      invalidateLikes(queryClient);
    },
  });
}
