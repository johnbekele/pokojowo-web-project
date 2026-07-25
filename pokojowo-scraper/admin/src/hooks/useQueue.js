import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getQueue,
  getQueueStats,
  updateListing,
  decideListing,
  annotateListing,
} from '../services/api';

export function useQueue({ status, limit = 24, skip = 0 } = {}) {
  return useQuery({
    queryKey: ['queue', { status, limit, skip }],
    queryFn: () => getQueue({ status, limit, skip }),
    placeholderData: (prev) => prev,
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: ['queue-stats'],
    queryFn: getQueueStats,
    refetchInterval: 30000,
  });
}

function useInvalidateQueue() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['queue'] });
    queryClient.invalidateQueries({ queryKey: ['queue-stats'] });
  };
}

export function useUpdateListing() {
  const invalidate = useInvalidateQueue();
  return useMutation({
    mutationFn: ({ id, edits }) => updateListing(id, edits),
    onSuccess: invalidate,
  });
}

export function useDecideListing() {
  const invalidate = useInvalidateQueue();
  return useMutation({
    mutationFn: ({ id, action, reason }) => decideListing(id, { action, reason }),
    onSuccess: invalidate,
  });
}

export function useAnnotateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, field, issue, comment, corrected_value }) =>
      annotateListing(id, { field, issue, comment, corrected_value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations'] });
    },
  });
}
