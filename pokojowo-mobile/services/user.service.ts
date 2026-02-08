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

  getUserById: (userId: string) =>
    api.get<User>(`/users/${userId}`),

  getUsers: (params?: { skip?: number; limit?: number; role?: string }) =>
    api.get<User[]>('/users/', { params }),
};

export default userService;
