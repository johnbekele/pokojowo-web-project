import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHealth, getRuns, startRun } from '../services/api';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30000,
    retry: false,
  });
}

export function useRuns({ limit = 20, skip = 0, runActive = false } = {}) {
  return useQuery({
    queryKey: ['runs', { limit, skip }],
    queryFn: () => getRuns({ limit, skip }),
    // Auto-refresh every 10s while a run is active
    refetchInterval: runActive ? 10000 : false,
  });
}

export function useStartRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ site, city } = {}) => startRun({ site, city }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });
}
