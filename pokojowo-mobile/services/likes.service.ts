import api from '@/lib/api';
import type { Like, MutualMatch, LikeStatus, LikesStats } from '@/types/matching.types';

export interface LikeResponse {
  status: string;
  message: string;
  like_id?: string;
  is_mutual?: boolean;
  mutual_match_id?: string;
}

export interface LikesListResponse {
  likes: Like[];
  total: number;
  has_more: boolean;
}

export interface MutualMatchesResponse {
  mutual_matches: MutualMatch[];
  total: number;
  has_more: boolean;
}

export const likesService = {
  // Like a user
  likeUser: (userId: string) =>
    api.post<LikeResponse>(`/likes/${userId}`),

  // Unlike a user
  unlikeUser: (userId: string) =>
    api.delete<LikeResponse>(`/likes/${userId}`),

  // Get likes sent by current user
  getLikesSent: (params?: { limit?: number; offset?: number }) =>
    api.get<LikesListResponse>('/likes/sent', { params }),

  // Get likes received by current user
  getLikesReceived: (params?: { limit?: number; offset?: number }) =>
    api.get<LikesListResponse>('/likes/received', { params }),

  // Get mutual matches
  getMutualMatches: (params?: { limit?: number; offset?: number }) =>
    api.get<MutualMatchesResponse>('/likes/mutual', { params }),

  // Check like status with a specific user
  checkLikeStatus: (userId: string) =>
    api.get<LikeStatus>(`/likes/check/${userId}`),

  // Unmatch with a user
  unmatchUser: (userId: string) =>
    api.post<LikeResponse>(`/likes/${userId}/unmatch`),

  // Get likes statistics
  getStats: () =>
    api.get<LikesStats>('/likes/stats'),
};

export default likesService;
