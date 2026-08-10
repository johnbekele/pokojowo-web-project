jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import api from '@/lib/api';
import { matchingService } from './matching.service';

describe('matchingService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the matching dashboard from the dedicated endpoint', async () => {
    const get = api.get as jest.Mock;
    get.mockResolvedValueOnce({
      data: {
        profile_complete: true,
        stats: {
          likes_received: 3,
          mutual_matches: 1,
          saved_matches: 2,
        },
        previews: { top_matches: [] },
      },
    });

    const response = await matchingService.getDashboard();

    expect(get).toHaveBeenCalledWith('/matching/dashboard');
    expect(response.data.stats).toMatchObject({ likes_received: 3, mutual_matches: 1 });
  });

  it('refreshes the match deck through the backend refresh endpoint', async () => {
    const post = api.post as jest.Mock;
    post.mockResolvedValueOnce({ data: { matches: [], message: 'refreshed' } });

    await matchingService.refreshMatches();

    expect(post).toHaveBeenCalledWith('/matching/refresh');
  });
});
