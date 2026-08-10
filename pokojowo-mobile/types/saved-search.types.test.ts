import type { ListingFilters } from './listing.types';
import { savedSearchFilters, savedSearchPayload, savedSearchSummary } from './saved-search.types';

describe('saved-search filter mapping', () => {
  it('builds the camelCase API body without empty filters', () => {
    const filters: ListingFilters = {
      search: 'Mokotów',
      city: 'Warsaw',
      min_price: 1800,
      room_types: ['Single'],
      districts: [],
    };

    expect(savedSearchPayload('  Near work  ', filters)).toEqual({
      name: 'Near work',
      search: 'Mokotów',
      city: 'Warsaw',
      minPrice: 1800,
      roomTypes: ['Single'],
    });
  });

  it('maps API responses back to the mobile filter shape', () => {
    expect(savedSearchFilters({
      id: 'search-1',
      userId: 'user-1',
      name: 'Warsaw',
      city: 'Warsaw',
      districts: ['Mokotów'],
      minPrice: 1800,
      maxPrice: 2500,
      minSize: undefined,
      maxSize: undefined,
      roomTypes: ['Single'],
      buildingTypes: [],
      rentFor: [],
      maxTenants: undefined,
      offeredBy: 'owner',
      notifyEnabled: true,
      createdAt: '2026-08-10T10:00:00Z',
    })).toEqual({
      city: 'Warsaw',
      districts: ['Mokotów'],
      min_price: 1800,
      max_price: 2500,
      room_types: ['Single'],
      offered_by: 'owner',
    });
  });

  it('creates a readable summary for saved-search rows', () => {
    expect(savedSearchSummary({
      id: 'search-1',
      userId: 'user-1',
      name: 'Warsaw',
      city: 'Warsaw',
      districts: ['Mokotów'],
      minPrice: 1800,
      maxPrice: 2500,
      roomTypes: ['Single'],
      buildingTypes: [],
      rentFor: [],
      notifyEnabled: true,
      createdAt: '2026-08-10T10:00:00Z',
    })).toBe('Warsaw · Mokotów · 1800–2500 PLN · Single');
  });
});
