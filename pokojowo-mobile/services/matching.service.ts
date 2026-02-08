import api from '@/lib/api';
import type {
  MatchingResponse,
  MatchingStats,
  DashboardResponse,
  MatchingFilters,
} from '@/types/matching.types';

export const matchingService = {
  // Get matches for current user
  getMatches: (filters?: MatchingFilters) =>
    api.get<MatchingResponse>('/matching/', { params: filters }),

  // Get detailed compatibility with specific user
  getMatchWithUser: (userId: string) =>
    api.get<{ compatible: boolean; reason?: string } & Record<string, unknown>>(
      `/matching/user/${userId}`
    ),

  // Refresh matches after profile update
  refreshMatches: () =>
    api.post<MatchingResponse & { message: string }>('/matching/refresh'),

  // Get matching statistics
  getStats: () =>
    api.get<MatchingStats>('/matching/stats/summary'),

  // Get tenant dashboard with stats and previews
  getDashboard: () =>
    api.get<DashboardResponse>('/matching/dashboard'),

  // Trigger notifications for high-quality matches
  sendNotifications: () =>
    api.post<{ message: string; status: string }>('/matching/notify'),
};

export default matchingService;
