import { describe, expect, it } from 'vitest';

import { listingParams } from './listingQuery';

describe('listingParams pagination', () => {
  it('adds an offset page and metadata flag without changing filters', () => {
    const params = listingParams({
      search: 'Warsaw',
      sort: 'newest',
      filters: { city: 'Warsaw', roomTypes: ['Private Room'] },
      skip: 20,
      limit: 20,
      withMeta: true,
    });

    expect(params.get('search')).toBe('Warsaw');
    expect(params.get('sort')).toBe('newest');
    expect(params.get('city')).toBe('Warsaw');
    expect(params.getAll('room_type')).toEqual(['Private Room']);
    expect(params.get('skip')).toBe('20');
    expect(params.get('limit')).toBe('20');
    expect(params.get('with_meta')).toBe('true');
  });

  it('does not send pagination parameters to existing callers by default', () => {
    const params = listingParams({ search: 'Krakow' });

    expect(params.has('skip')).toBe(false);
    expect(params.has('limit')).toBe(false);
    expect(params.has('with_meta')).toBe(false);
  });
});
