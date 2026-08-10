export interface User {
  id: string;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  address?: string;
  location?: string;
  photo?: string | { url?: string };
  age?: number; // computed server-side from dateOfBirth when set
  dateOfBirth?: string;
  phoneVerified?: boolean;
  trustScore?: number;
  trustLevel?: 'unverified' | 'verified' | 'id_verified';
  isVerified?: boolean;
  /** Server-computed from the tenant profile; gates matching features. */
  isProfileComplete?: boolean;
  /** Completion percentage returned by the onboarding/profile endpoints. */
  profileCompletionStep?: number;
  /** Legacy snake_case payloads from older mobile/backend builds. */
  is_profile_complete?: boolean;
  profile_completion_step?: number;
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  job?: UserJob;
  languages?: string[];
  preferred_language?: string;
  role?: string[];
  tenant_profile?: TenantProfile;
  landlord_profile?: LandlordProfile;
  chat_settings?: ChatSettings;
  notification_preferences?: NotificationPreferences;
  profile_completion?: ProfileCompletion;
  last_login?: string;
  last_active?: string;
  is_online?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserJob {
  industry?: string | null;
  title?: string | null;
}

export interface TenantProfile {
  interests?: string[];
  personality?: string[];
  preferences?: Record<string, unknown>;
  flatmate_traits?: string[];
  deal_breakers?: DealBreakers;
  budget_min?: number;
  budget_max?: number;
  move_in_date?: string;
  move_out_date?: string;
  smoking?: boolean;
  pets?: boolean;
  cleanliness?: string;
  social_level?: string;
  guests_frequency?: string;
  noise_tolerance?: string;
  cooking_frequency?: string;
  work_schedule?: string;
  sleep_schedule?: string;
  hasPartner?: boolean;
  hasChildren?: boolean;
  childrenCount?: number | null;
}

export interface DealBreakers {
  no_smokers?: boolean;
  no_pets?: boolean;
  no_parties?: boolean;
  same_gender_only?: boolean;
  quiet_hours_required?: boolean;
  noChildren?: boolean;
  noCouples?: boolean;
  min_age?: number;
  max_age?: number;
  min_cleanliness?: string;
  max_budget?: number;
}

export interface LandlordProfile {
  company_name?: string;
  business_registration?: string;
  total_properties?: number;
  verified_properties?: number;
  average_rating?: number;
  policies?: string[];
  verification_docs?: string[];
}

export interface ChatSettings {
  allow_messages?: boolean;
  auto_reply?: string;
  blocked_users?: string[];
}

export interface NotificationPreferences {
  email?: {
    new_messages?: boolean;
    property_updates?: boolean;
    match_notifications?: boolean;
    marketing_emails?: boolean;
  };
  push?: {
    new_messages?: boolean;
    property_updates?: boolean;
    match_notifications?: boolean;
  };
  email_new_match?: boolean;
  email_new_message?: boolean;
  email_listing_interest?: boolean;
  push_new_match?: boolean;
  push_new_message?: boolean;
  push_listing_interest?: boolean;
}

export interface ProfileCompletion {
  step?: number;
  completed?: boolean;
  steps_completed?: string[];
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstname?: string;
  lastname?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}
