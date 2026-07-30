import { useQuery } from '@tanstack/react-query';
import { mapService } from '@/services';
import type { FlatmateMapResponse } from '@/types/map.types';
import { MATCHING_KEYS } from './useMatching';

const EMPTY: FlatmateMapResponse = {
  pins: [],
  total: 0,
  totalWithArea: 0,
  totalMatches: 0,
};

/**
 * Flatmates whose preferred area falls inside the visible map region.
 *
 * The backend rejects users without a complete tenant profile, so callers
 * gate this with `enabled` rather than letting it retry a guaranteed 400.
 */
export function useFlatmateMapPins({
  bbox,
  minScore = 0,
  enabled = true,
}: {
  bbox: string | null;
  minScore?: number;
  enabled?: boolean;
}) {
  const query = useQuery({
    queryKey: [...MATCHING_KEYS.all, 'map', bbox, minScore] as const,
    queryFn: () =>
      mapService.getFlatmatePins({ bbox: bbox!, minScore }).then((res) => res.data),
    enabled: enabled && !!bbox,
    retry: false,
    placeholderData: (previous) => previous,
  });

  return { ...query, data: query.data ?? EMPTY };
}
