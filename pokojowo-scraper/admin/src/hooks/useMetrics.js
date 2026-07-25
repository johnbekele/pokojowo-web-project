import { useQuery } from '@tanstack/react-query';
import { getPrecisionMetrics, getQualityMetrics } from '../services/api';

export function usePrecisionMetrics(days = 30) {
  return useQuery({
    queryKey: ['metrics', 'precision', days],
    queryFn: () => getPrecisionMetrics(days),
  });
}

export function useQualityMetrics(days = 30) {
  return useQuery({
    queryKey: ['metrics', 'quality', days],
    queryFn: () => getQualityMetrics(days),
  });
}
