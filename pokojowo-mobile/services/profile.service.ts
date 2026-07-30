import api from '@/lib/api';
import { fileFromUri } from '@/lib/upload';

interface UploadPhotoResponse {
  message: string;
  url: string;
  filename?: string;
}

interface UpdatePhotoResponse {
  message: string;
  photo: { url?: string };
}

/** Where a tenant wants to live, used to place them on the flatmate map. */
export interface PreferredArea {
  location: string | null;
  districts: string[];
}

interface ProfileResponse {
  tenantProfile?: {
    preferences?: {
      location?: string | null;
      districts?: string[];
    } | null;
  } | null;
}

export const profileService = {
  /** Upload a local image to the server; returns the hosted (relative) URL. */
  uploadPhoto: (uri: string) => {
    const form = new FormData();
    // React Native FormData accepts a { uri, name, type } object for files.
    form.append('file', fileFromUri(uri) as unknown as Blob);
    return api.post<UploadPhotoResponse>('/upload/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Persist an already-hosted photo URL on the current user's profile. */
  setPhoto: (url: string) =>
    api.put<UpdatePhotoResponse>('/profile/photo', { url }),

  /** Full profile — the only endpoint that returns tenantProfile. */
  getProfile: () => api.get<ProfileResponse>('/profile/'),

  /**
   * Narrow update for the preferred area. Deliberately not PUT /profile/,
   * which replaces the whole tenantProfile and would drop other sections.
   */
  setPreferredArea: (area: PreferredArea) =>
    api.put<{ message: string } & PreferredArea>('/profile/preferred-area', area),
};

export default profileService;
