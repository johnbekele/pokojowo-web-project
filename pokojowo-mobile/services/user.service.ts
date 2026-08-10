import api from '@/lib/api';
import type {
  User,
  NotificationPreferencesPayload,
} from '@/types/user.types';

export interface UserUpdateData {
  firstname?: string;
  lastname?: string;
  phone?: string;
  address?: string;
  location?: string;
  age?: number; // transitional; prefer dateOfBirth
  dateOfBirth?: string; // ISO date, e.g. 1995-04-23
  gender?: string;
  bio?: string;
  /** Uses the API's nested camelCase aliases (notificationPreferences). */
  notificationPreferences?: NotificationPreferencesPayload;
}

export type ReportReason =
  | 'spam'
  | 'scam'
  | 'harassment'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'other';

export interface TenantProfileData {
  firstname: string;
  lastname: string;
  age?: number | null; // transitional; prefer dateOfBirth
  dateOfBirth?: string | null; // ISO date, e.g. 1995-04-23
  gender?: string | null;
  bio?: string;
  phone?: string;
  location?: string;
  languages?: string[];
  preferredLanguage?: string | null;
  tenantProfile: {
    preferences: {
      budget: {
        min: number | null;
        max: number | null;
      };
      location: string | null;
      /** Preferred districts within `location`; drives the flatmate map pin. */
      districts?: string[];
      leaseDuration: number;
    };
    flatmateTraits: {
      cleanliness: string | null;
      socialLevel: string | null;
      guestsFrequency: string | null;
    };
    dealBreakers: {
      noSmokers: boolean;
      noPets: boolean;
      noParties: boolean;
      sameGenderOnly: boolean;
      quietHoursRequired: boolean;
      noChildren?: boolean;
      noCouples?: boolean;
    };
    hasPartner?: boolean;
    hasChildren?: boolean;
    childrenCount?: number | null;
  };
}

export interface LandlordProfileData {
  firstname: string;
  lastname: string;
  phone?: string;
  location?: string;
  companyName?: string;
  bio?: string;
}

export interface RoleUpdateResponse {
  message: string;
  data: {
    token: string;
    refresh_token: string;
    role: string[];
    user: User;
  };
}

export const userService = {
  getMe: () =>
    api.get<User>('/users/me'),

  updateMe: (data: UserUpdateData) =>
    api.put<{ message: string }>('/users/me', data),

  updatePushToken: (expoPushToken: string) =>
    api.put<{ message: string }>('/users/me/push-token', { expoPushToken }),

  removePushToken: () => api.delete<{ message: string }>('/users/me/push-token'),

  updateRole: (role: 'tenant' | 'landlord') =>
    api.put<RoleUpdateResponse>('/users/me/role', { role }),

  deleteAccount: () =>
    api.delete('/users/me'),

  completeTenantProfile: (data: TenantProfileData) =>
    api.put<{ message: string; user: User }>('/profile/complete-tenant', data),

  completeLandlordProfile: (data: LandlordProfileData) =>
    api.put<{
      message: string;
      isProfileComplete: boolean;
      profileCompletionStep: number;
    }>('/profile/landlord', data),

  getUserById: (userId: string) =>
    api.get<User>(`/users/${userId}`),

  getUsers: (params?: { skip?: number; limit?: number; role?: string }) =>
    api.get<User[]>('/users/', { params }),

  // Moderation actions on other users
  reportUser: (userId: string, reason: ReportReason, details?: string) =>
    api.post<{ message: string }>(`/users/${userId}/report`, { reason, details }),

  blockUser: (userId: string) =>
    api.post<{ message: string; blocked_users?: string[]; blockedUsers?: string[] }>(
      `/users/${userId}/block`
    ),

  unblockUser: (userId: string) =>
    api.delete<{ message: string }>(`/users/${userId}/block`),
};

export default userService;
