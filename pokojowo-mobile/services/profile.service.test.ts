jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('@/lib/upload', () => ({
  fileFromUri: jest.fn((uri: string) => ({ uri, name: 'avatar.jpg', type: 'image/jpeg' })),
}));

import api from '@/lib/api';
import { profileService } from './profile.service';

describe('profile photo service', () => {
  it('uploads the selected file and persists the hosted URL', async () => {
    const post = api.post as jest.Mock;
    const put = api.put as jest.Mock;
    post.mockResolvedValueOnce({ data: { message: 'Uploaded', url: '/uploads/avatar.jpg' } });
    put.mockResolvedValueOnce({ data: { message: 'Updated', photo: { url: '/uploads/avatar.jpg' } } });

    const uploadResponse = await profileService.uploadPhoto('file:///avatar.jpg');
    await profileService.setPhoto(uploadResponse.data.url);

    expect(post).toHaveBeenCalledWith(
      '/upload/photo',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    expect(put).toHaveBeenCalledWith('/profile/photo', { url: '/uploads/avatar.jpg' });
  });
});
