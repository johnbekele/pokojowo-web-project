jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
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

  it('normalizes a single camelCase listing before it reaches the detail screen', async () => {
    const get = api.get as jest.Mock;
    get.mockResolvedValueOnce({
      data: {
        _id: 'listing-2',
        ownerId: 'owner-2',
        address: 'ul. Testowa 2',
        price: 2800,
        images: ['/uploads/room.jpg'],
        description: { en: 'A bright room', pl: 'Jasny pokój' },
        canBeContacted: ['Phone'],
        isScraped: true,
        sourceUrl: 'https://example.com/listing-2',
        sourceSite: 'example',
        createdAt: '2026-08-10T00:00:00Z',
      },
    });

    const response = await listingService.getListing('listing-2');

    expect(response.data).toMatchObject({
      id: 'listing-2',
      owner_id: 'owner-2',
      can_be_contacted: ['Phone'],
      isScraped: true,
      sourceUrl: 'https://example.com/listing-2',
      sourceSite: 'example',
    });
  });

  it('normalizes landlord listings returned from the camelCase endpoint', async () => {
    const get = api.get as jest.Mock;
    get.mockResolvedValueOnce({
      data: [
        {
          _id: 'listing-3',
          ownerId: 'owner-3',
          address: 'ul. Testowa 3',
          price: 1900,
          images: [],
          description: {},
          maxTenants: 2,
          isActive: false,
          createdAt: '2026-08-10T00:00:00Z',
        },
      ],
    });

    const response = await listingService.getMyListings();

    expect(response.data[0]).toMatchObject({
      id: 'listing-3',
      owner_id: 'owner-3',
      max_tenants: 2,
      is_active: false,
    });
  });

  it('uploads local listing images before they are submitted with a listing', async () => {
    const post = api.post as jest.Mock;
    post.mockResolvedValueOnce({
      data: { message: 'Uploaded', files: [{ url: '/uploads/room.jpg' }] },
    });

    const response = await listingService.uploadImages(['file:///room.jpg']);

    expect(response.data.files[0].url).toBe('/uploads/room.jpg');
    expect(post).toHaveBeenCalledWith(
      '/upload/listing/multiple',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  });
});
