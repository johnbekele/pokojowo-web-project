jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import api from '@/lib/api';
import { listingService } from './listing.service';

describe('listingService pagination and response mapping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests metadata pages with repeated array filters and normalizes API fields', async () => {
    const get = api.get as jest.Mock;
    get.mockResolvedValueOnce({
      data: {
        listings: [
          {
            _id: 'listing-1',
            ownerId: 'owner-1',
            address: 'ul. Testowa 1',
            price: 2200,
            images: [],
            description: {},
            roomType: 'Single',
            maxTenants: 2,
            createdAt: '2026-08-10T00:00:00Z',
          },
        ],
        total: 21,
        skip: 20,
        limit: 20,
        hasMore: true,
      },
    });

    const response = await listingService.getListingsPage(
      { city: 'Warszawa', room_types: ['Single', 'Double'] },
      20,
      20
    );
    const request = get.mock.calls[0][1].params as URLSearchParams;

    expect(request.get('city')).toBe('Warszawa');
    expect(request.getAll('room_type')).toEqual(['Single', 'Double']);
    expect(request.get('skip')).toBe('20');
    expect(request.get('limit')).toBe('20');
    expect(request.get('with_meta')).toBe('true');
    expect(response.data.listings[0]).toMatchObject({
      id: 'listing-1',
      owner_id: 'owner-1',
      room_type: 'Single',
      max_tenants: 2,
      created_at: '2026-08-10T00:00:00Z',
    });
  });
});
