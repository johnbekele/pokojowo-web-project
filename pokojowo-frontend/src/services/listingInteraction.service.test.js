import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import api from '@/lib/api';
import listingInteractionService from './listingInteraction.service';

describe('listing interaction service', () => {
  let apiMock;

  beforeEach(() => {
    apiMock = new MockAdapter(api);
  });

  afterEach(() => {
    apiMock.restore();
  });

  it('tracks views and maps interaction reads', async () => {
    apiMock.onPost('/listing-interactions/listing-1/view').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ durationSeconds: 12 });
      return [200, { success: true }];
    });
    apiMock
      .onGet('/listing-interactions/listing-1/my-interactions')
      .reply(200, { hasViewed: true, hasLiked: false, hasInquired: false });

    await expect(
      listingInteractionService.trackView('listing-1', 12),
    ).resolves.toEqual({ success: true });
    await expect(
      listingInteractionService.getMyInteractions('listing-1'),
    ).resolves.toEqual({ hasViewed: true, hasLiked: false, hasInquired: false });
  });

  it('sends like and unlike mutations through the service', async () => {
    apiMock
      .onPost('/listing-interactions/listing-1/like')
      .reply(200, { success: true });
    apiMock
      .onDelete('/listing-interactions/listing-1/like')
      .reply(200, { success: true });

    await expect(
      listingInteractionService.likeListing('listing-1'),
    ).resolves.toEqual({ success: true });
    await expect(
      listingInteractionService.unlikeListing('listing-1'),
    ).resolves.toEqual({ success: true });
  });

  it('loads liked IDs and batches interested users with API aliases', async () => {
    apiMock
      .onGet('/listing-interactions/my-liked')
      .reply(200, { likedListingIds: ['listing-1'], count: 1 });
    apiMock
      .onPost('/listing-interactions/batch-interested-users')
      .reply((config) => {
        expect(JSON.parse(config.data)).toEqual({
          listingIds: ['listing-1', 'listing-2'],
          minCompatibility: 80,
          limitPerListing: 2,
        });
        return [200, { results: { 'listing-1': [] } }];
      });

    await expect(listingInteractionService.getMyLikedListings()).resolves.toEqual({
      likedListingIds: ['listing-1'],
      count: 1,
    });
    await expect(
      listingInteractionService.getBatchInterestedUsers(
        ['listing-1', 'listing-2'],
        { minCompatibility: 80, limitPerListing: 2 },
      ),
    ).resolves.toEqual({ results: { 'listing-1': [] } });
  });
});
