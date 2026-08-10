import queryClient from './queryClient';
import useLikesStore from '@/stores/likesStore';
import useListingInteractionStore from '@/stores/listingInteractionStore';
import useSavedSearchStore from '@/stores/savedSearchStore';

/**
 * Drop everything belonging to the user who just signed out.
 *
 * Clearing the auth store is not enough on its own: the React Query cache and
 * these stores hold shortlists, likes and viewed listings, and none of them are
 * emptied by a logout that does not reload the page. On a shared browser the
 * next person to sign in sees the previous user's data until each query
 * refetches.
 *
 * Lives outside the auth store so that store does not have to import four
 * others, and so the list is in one obvious place when a new store is added.
 */
export function clearSessionData() {
  queryClient.clear();

  [useLikesStore, useListingInteractionStore, useSavedSearchStore].forEach(
    (store) => store.getState().clear?.()
  );
}
