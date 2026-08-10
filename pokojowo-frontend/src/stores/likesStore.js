import { create } from 'zustand';

/**
 * Client-only state for the mutual-match celebration modal.
 * Likes, matches, stats and like status are server state and live in
 * React Query (`hooks/useLikes.js`).
 */
const useLikesStore = create((set) => ({
  showMutualMatchModal: false,
  mutualMatchUser: null,

  closeMutualMatchModal: () => {
    set({ showMutualMatchModal: false, mutualMatchUser: null });
  },

  setMutualMatchData: (matchData) => {
    set({
      showMutualMatchModal: true,
      mutualMatchUser: {
        matched_user_id: matchData.matchedUserId,
        user: {
          id: matchData.matchedUserId,
          firstname: matchData.matchedUserName?.split(' ')[0] || matchData.matchedUserName,
          lastname: matchData.matchedUserName?.split(' ').slice(1).join(' ') || '',
          photo: matchData.matchedUserPhoto,
        },
      },
    });
  },

  clear: () => {
    set({ showMutualMatchModal: false, mutualMatchUser: null });
  },
}));

export default useLikesStore;
