import { useQuery } from '@tanstack/react-query';
import { getAnnotations } from '../services/api';

export function useAnnotations({ limit = 50, skip = 0 } = {}) {
  return useQuery({
    queryKey: ['annotations', { limit, skip }],
    queryFn: () => getAnnotations({ limit, skip }),
    placeholderData: (prev) => prev,
  });
}
