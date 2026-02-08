import type { User } from './user.types';

export interface MatchResult {
  user_id: string;
  user: Partial<User>;
  compatibility_score: number;
  score_breakdown: ScoreBreakdown;
  matched_preferences: string[];
  potential_issues: string[];
}

export interface ScoreBreakdown {
  lifestyle: number;
  preferences: number;
  budget: number;
  location: number;
  personality: number;
}

export interface MatchingStats {
  profile_complete: boolean;
  total_potential_matches?: number;
  filtered_by_deal_breakers?: number;
  compatible_matches?: number;
  score_distribution?: {
    high: number;
    medium: number;
    low: number;
  };
  top_match_score?: number | null;
}

export interface MatchingResponse {
  matches: MatchResult[];
  total_candidates: number;
  filtered_by_deal_breakers: number;
}

export interface DashboardStats {
  total_potential_matches: number;
  compatible_matches: number;
  high_compatibility: number;
  medium_compatibility: number;
  likes_sent: number;
  likes_received: number;
  mutual_matches: number;
  pending_likes: number;
  saved_matches: number;
  top_match_score: number | null;
}

export interface DashboardPreviews {
  top_matches: MatchResult[];
  recent_mutual_matches: MutualMatch[];
  pending_likes: Like[];
}

export interface DashboardResponse {
  profile_complete: boolean;
  message?: string;
  stats?: DashboardStats;
  previews?: DashboardPreviews;
}

export interface Like {
  _id: string;
  liker_id: string;
  liked_user_id: string;
  status: 'pending' | 'mutual' | 'rejected';
  compatibility_score?: number;
  created_at: string;
  user?: Partial<User>;
}

export interface MutualMatch {
  _id: string;
  user_id: string;
  user: Partial<User>;
  matched_at: string;
  compatibility_score?: number;
}

export interface LikeStatus {
  i_liked: boolean;
  they_liked: boolean;
  is_mutual: boolean;
  my_like_id?: string;
  their_like_id?: string;
}

export interface LikesStats {
  likes_sent: number;
  likes_received: number;
  mutual_matches: number;
  pending_likes: number;
}

export interface MatchingFilters {
  limit?: number;
  location?: string;
  minScore?: number;
}
