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

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

/**
 * Normalize nested user settings returned by the API.  The FastAPI service
 * serializes model aliases (chatSettings/blockedUsers and
 * notificationPreferences/newMessages), while older mobile builds used the
 * snake_case names.  Keeping one canonical shape prevents settings and
 * moderation controls from silently appearing disabled or stale.
 */
export function normalizeNotificationPreferences(value: unknown): NotificationPreferences | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const source = asRecord(value);
  const email = asRecord(source.email);
  const push = asRecord(source.push);

  const normalized: NotificationPreferences = {
    ...source,
    email: source.email
      ? {
          new_messages: (email.new_messages ?? email.newMessages) as boolean | undefined,
          property_updates: (email.property_updates ?? email.propertyUpdates) as boolean | undefined,
          match_notifications: (email.match_notifications ?? email.matchNotifications) as boolean | undefined,
          marketing_emails: (email.marketing_emails ?? email.marketingEmails) as boolean | undefined,
        }
      : undefined,
    push: source.push
      ? {
          new_messages: (push.new_messages ?? push.newMessages) as boolean | undefined,
          property_updates: (push.property_updates ?? push.propertyUpdates) as boolean | undefined,
          match_notifications: (push.match_notifications ?? push.matchNotifications) as boolean | undefined,
        }
      : undefined,
  };

  return normalized;
}

export function normalizeChatSettings(value: unknown): ChatSettings | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const source = asRecord(value);
  const autoReply = asRecord(source.auto_reply ?? source.autoReply);
  return {
    ...source,
    allow_messages: (source.allow_messages ?? source.allowMessages) as boolean | undefined,
    auto_reply: source.auto_reply || source.autoReply ? autoReply : undefined,
    blocked_users: (source.blocked_users ?? source.blockedUsers ?? []) as string[],
  };
}

/** Convert an API user response to the canonical shape consumed by mobile. */
export function normalizeUser(value: unknown): User {
  const source = asRecord(value);
  const normalized: UnknownRecord = { ...source };

  const id = source.id ?? source._id;
  if (id !== undefined && id !== null) normalized.id = String(id);

  const aliases: Array<[string, string]> = [
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
    ['lastLogin', 'last_login'],
    ['lastActive', 'last_active'],
    ['isOnline', 'is_online'],
    ['preferredLanguage', 'preferred_language'],
    ['tenantProfile', 'tenant_profile'],
    ['landlordProfile', 'landlord_profile'],
  ];
  for (const [apiName, canonicalName] of aliases) {
    if (normalized[canonicalName] === undefined && source[apiName] !== undefined) {
      normalized[canonicalName] = source[apiName];
    }
  }

  const notificationPreferences = source.notification_preferences ?? source.notificationPreferences;
  if (notificationPreferences !== undefined) {
    normalized.notification_preferences = normalizeNotificationPreferences(notificationPreferences);
  }

  const chatSettings = source.chat_settings ?? source.chatSettings;
  if (chatSettings !== undefined) {
    normalized.chat_settings = normalizeChatSettings(chatSettings);
  }

  return normalized as unknown as User;
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
  auto_reply?: string | { enabled?: boolean; message?: string | null };
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

/** Wire shape accepted by the FastAPI notification preference models. */
export interface NotificationPreferencesPayload {
  email?: {
    newMessages?: boolean;
    propertyUpdates?: boolean;
    matchNotifications?: boolean;
    marketingEmails?: boolean;
  };
  push?: {
    newMessages?: boolean;
    propertyUpdates?: boolean;
    matchNotifications?: boolean;
  };
}

/** Convert canonical mobile preferences to the API's aliased nested shape. */
export function toNotificationPreferencesPayload(
  preferences?: NotificationPreferences | null
): NotificationPreferencesPayload {
  if (!preferences) return {};

  const email = preferences.email;
  const push = preferences.push;
  return {
    ...(email
      ? {
          email: {
            ...(email.new_messages !== undefined ? { newMessages: email.new_messages } : {}),
            ...(email.property_updates !== undefined ? { propertyUpdates: email.property_updates } : {}),
            ...(email.match_notifications !== undefined ? { matchNotifications: email.match_notifications } : {}),
            ...(email.marketing_emails !== undefined ? { marketingEmails: email.marketing_emails } : {}),
          },
        }
      : {}),
    ...(push
      ? {
          push: {
            ...(push.new_messages !== undefined ? { newMessages: push.new_messages } : {}),
            ...(push.property_updates !== undefined ? { propertyUpdates: push.property_updates } : {}),
            ...(push.match_notifications !== undefined ? { matchNotifications: push.match_notifications } : {}),
          },
        }
      : {}),
  };
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
