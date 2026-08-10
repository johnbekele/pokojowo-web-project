import queryClient from './queryClient';
import useLikesStore from '@/stores/likesStore';
import useSavedSearchStore from '@/stores/savedSearchStore';

/**
 * Drop everything belonging to the user who just signed out.
 *
 * Clearing the auth store is not enough on its own: the React Query cache
 * holds server-backed likes and listing interactions, while these stores hold
 * client-only modal and saved-search state. None is emptied by a logout that
 * does not reload the page, so a shared browser must clear both layers.
 *
 * Lives outside the auth store so that store does not have to import these
 * dependencies, and so the list is in one obvious place when a new store is
 * added.
 */
export function clearSessionData() {
  queryClient.clear();

  [useLikesStore, useSavedSearchStore].forEach((store) => store.getState().clear?.());
}
