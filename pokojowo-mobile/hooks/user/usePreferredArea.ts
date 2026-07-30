import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/services';
import type { PreferredArea } from '@/services/profile.service';

export const PREFERRED_AREA_KEY = ['profile', 'preferred-area'] as const;

/**
 * Where the tenant wants to live. Read from the full profile because
 * GET /users/me omits tenantProfile.
 */
export function usePreferredArea() {
  return useQuery({
    queryKey: PREFERRED_AREA_KEY,
    queryFn: async (): Promise<PreferredArea> => {
      const { data } = await profileService.getProfile();
      const prefs = data.tenantProfile?.preferences;
      return {
        location: prefs?.location ?? null,
        districts: prefs?.districts ?? [],
      };
    },
  });
}

export function useUpdatePreferredArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (area: PreferredArea) => profileService.setPreferredArea(area),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PREFERRED_AREA_KEY });
      // The flatmate map places pins from this area, so its pins are now stale.
      queryClient.invalidateQueries({ queryKey: ['matching'] });
    },
  });
}
