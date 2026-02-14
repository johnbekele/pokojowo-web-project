import api from '@/lib/api';
import type { User } from '@/types/user.types';

export interface UserUpdateData {
  firstname?: string;
  lastname?: string;
  phone?: string;
  address?: string;
  location?: string;
  age?: number;
  gender?: string;
  bio?: string;
}

export interface TenantProfileData {
  firstname: string;
  lastname: string;
  age?: number | null;
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
    };
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

  updateRole: (role: 'tenant' | 'landlord') =>
    api.put<RoleUpdateResponse>('/users/me/role', { role }),

  deleteAccount: () =>
    api.delete('/users/me'),

  completeTenantProfile: (data: TenantProfileData) =>
    api.put<{ message: string; user: User }>('/profile/complete-tenant', data),

  completeLandlordProfile: (data: LandlordProfileData) =>
    api.put<{ message: string; user: User }>('/profile/complete-landlord', data),

  getUserById: (userId: string) =>
    api.get<User>(`/users/${userId}`),

  getUsers: (params?: { skip?: number; limit?: number; role?: string }) =>
    api.get<User[]>('/users/', { params }),
};

export default userService;
