jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
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
});
