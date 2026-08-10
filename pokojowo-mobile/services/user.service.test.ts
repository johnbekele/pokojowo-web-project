jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    delete: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

import api from '@/lib/api';
import { userService } from './user.service';

describe('userService onboarding endpoints', () => {
  it('submits landlord completion to the backend route', async () => {
    const put = api.put as jest.Mock;
    put.mockResolvedValueOnce({ data: { isProfileComplete: true, profileCompletionStep: 100 } });

    await userService.completeLandlordProfile({ firstname: 'Jan', lastname: 'Kowalski' });

    expect(put).toHaveBeenCalledWith('/profile/landlord', {
      firstname: 'Jan',
      lastname: 'Kowalski',
    });
  });

  it('submits aliased notification preferences instead of a legacy flat payload', async () => {
    const put = api.put as jest.Mock;
    put.mockResolvedValueOnce({ data: { message: 'User updated successfully' } });

    await userService.updateMe({
      notificationPreferences: {
        push: {
          newMessages: false,
          propertyUpdates: false,
          matchNotifications: false,
        },
      },
    });

    expect(put).toHaveBeenCalledWith('/users/me', {
      notificationPreferences: {
        push: {
          newMessages: false,
          propertyUpdates: false,
          matchNotifications: false,
        },
      },
    });
  });

  it('calls report, block and unblock endpoints with the expected contracts', async () => {
    const post = api.post as jest.Mock;
    const del = api.delete as jest.Mock;
    post.mockResolvedValueOnce({ data: { message: 'Report submitted' } });
    post.mockResolvedValueOnce({ data: { message: 'User blocked', blocked_users: ['user-2'] } });
    del.mockResolvedValueOnce({ data: { message: 'User unblocked' } });

    await userService.reportUser('user-2', 'spam', 'Repeated links');
    await userService.blockUser('user-2');
    await userService.unblockUser('user-2');

    expect(post).toHaveBeenNthCalledWith(1, '/users/user-2/report', {
      reason: 'spam',
      details: 'Repeated links',
    });
    expect(post).toHaveBeenNthCalledWith(2, '/users/user-2/block');
    expect(del).toHaveBeenCalledWith('/users/user-2/block');
  });
});
