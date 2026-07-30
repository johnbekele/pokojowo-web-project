import type { User } from './user.types';

export interface MatchResult {
  user_id: string;
  user: Partial<User>;
  compatibility_score: number;
  score_breakdown: ScoreBreakdown;
  /** @deprecated The API sends `shared_interests`; kept so older payloads still type-check. */
  matched_preferences?: string[];
  /** @deprecated The API sends `explanations`; kept so older payloads still type-check. */
  potential_issues?: string[];
  // Additive fields from the matching/verification work — optional so
  // an older backend can't crash the app
  trust_level?: 'unverified' | 'verified' | 'id_verified';
  phone_verified?: boolean;
  data_completeness?: number;
  explanations?: MatchExplanation[];
  is_new_user?: boolean;
  match_tier?: string;
  shared_interests?: string[];
  shared_languages?: string[];
  living_profile?: LivingProfile;
}

/** What a candidate is like to live with, as returned by the matching API. */
export interface LivingProfile {
  interests?: string[];
  personality?: string[];
  flatmate_traits?: FlatmateTraits;
  lifestyle?: LifestylePreferences;
  budget?: { min?: number; max?: number; currency?: string } | null;
  daily_routine?: {
    wakeUp?: string | null;
    sleepTime?: string | null;
    workHours?: { from?: string | null; to?: string | null } | null;
  } | null;
  lease_duration_months?: number | null;
  preferred_location?: string | null;
  has_partner?: boolean;
  has_children?: boolean;
}

export interface FlatmateTraits {
  cleanliness?: string | null;
  socialLevel?: string | null;
  guestsFrequency?: string | null;
  noiseTolerance?: string | null;
  cookingFrequency?: string | null;
  sharedSpaces?: string[];
}

export interface LifestylePreferences {
  smokes?: boolean | null;
  hasPets?: boolean | null;
  okWithSmoking?: boolean | null;
  okWithPets?: boolean | null;
}

export interface MatchExplanation {
  category: string;
  reason: string;
  impact: 'positive' | 'neutral' | 'negative';
  score: number;
  reason_key?: string;
  params?: Record<string, string>;
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
  /** `/likes/mutual` returns `id` and `matched_user_id`; the snake aliases are
   *  kept for older payloads that used `_id` / `user_id`. */
  id?: string;
  _id?: string;
  matched_user_id?: string;
  user_id?: string;
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
