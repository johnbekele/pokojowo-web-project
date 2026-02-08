import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, X, Handshake, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/shared/UserAvatar';
import useLikesStore from '@/stores/likesStore';
import useAuthStore from '@/stores/authStore';
import api from '@/lib/api';

export default function MutualMatchModal() {
  const { showMutualMatchModal, mutualMatchUser, closeMutualMatchModal } = useLikesStore();
  const { user: currentUser } = useAuthStore();

  const matchedUser = mutualMatchUser?.user || mutualMatchUser;
  const matchedUserId = mutualMatchUser?.matched_user_id || matchedUser?.id;

  // Fetch detailed match data for common traits
  const { data: matchData } = useQuery({
    queryKey: ['match-detail', matchedUserId],
    queryFn: async () => {
      const response = await api.get(`/matching/user/${matchedUserId}`);
      return response.data;
    },
    enabled: showMutualMatchModal && !!matchedUserId,
  });

  if (!showMutualMatchModal || !mutualMatchUser) return null;

  const compatibilityScore = matchData?.compatibility_score || 0;
  const sharedInterests = matchData?.shared_interests || [];
  const sharedLanguages = matchData?.shared_languages || [];
  const explanations = matchData?.explanations || [];

  // Get common traits (positive impacts)
  const commonTraits = explanations
    .filter(e => e.impact === 'positive')
    .slice(0, 4);

  // Get differences (negative/neutral impacts)
  const differences = explanations
    .filter(e => e.impact === 'negative' || e.impact === 'neutral')
    .slice(0, 3);

  return (
    <Dialog open={showMutualMatchModal} onOpenChange={closeMutualMatchModal}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0 gap-0 [&>button]:hidden" aria-describedby={undefined}>
        <DialogTitle className="sr-only">You're Connected!</DialogTitle>
        {/* Close button */}
        <button
          onClick={closeMutualMatchModal}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-black/20 hover:bg-black/30 transition-colors text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with photos and match percent */}
        <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 p-8 text-white">
          {/* Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm mb-3">
              <Handshake className="h-4 w-4" />
              <span>You're Connected!</span>
            </div>
            <p className="text-white/80 text-sm">You both showed interest</p>
          </div>

          {/* Photos side by side with match percent in center */}
          <div className="flex items-center justify-center gap-3">
            {/* Current user photo */}
            <div className="text-center">
              <UserAvatar
                user={currentUser}
                size="xl"
                className="h-24 w-24 ring-4 ring-white/30 shadow-xl"
              />
              <p className="mt-2 text-sm font-medium truncate max-w-[100px]">
                {currentUser?.firstname || 'You'}
              </p>
            </div>

            {/* Match percent circle in center */}
            <div className="flex flex-col items-center mx-2">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-teal-600">
                  {Math.round(compatibilityScore)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-white/70">Match</p>
            </div>

            {/* Matched user photo */}
            <div className="text-center">
              <UserAvatar
                user={matchedUser}
                size="xl"
                className="h-24 w-24 ring-4 ring-white/30 shadow-xl"
              />
              <p className="mt-2 text-sm font-medium truncate max-w-[100px]">
                {matchedUser?.firstname || 'User'}
              </p>
            </div>
          </div>
        </div>

        {/* Content - Common interests and differences */}
        <div className="p-5 space-y-4 max-h-[300px] overflow-y-auto">
          {/* Common Interests */}
          {(sharedInterests.length > 0 || sharedLanguages.length > 0 || commonTraits.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-semibold text-foreground">What You Have in Common</span>
              </div>

              {/* Shared interests badges */}
              {(sharedInterests.length > 0 || sharedLanguages.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {sharedInterests.slice(0, 4).map((interest) => (
                    <Badge
                      key={interest}
                      className="bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-0 text-xs"
                    >
                      {interest}
                    </Badge>
                  ))}
                  {sharedLanguages.slice(0, 2).map((lang) => (
                    <Badge
                      key={lang}
                      variant="outline"
                      className="border-teal-300 dark:border-teal-700 text-xs"
                    >
                      {lang}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Common traits from explanations */}
              {commonTraits.length > 0 && (
                <ul className="space-y-1">
                  {commonTraits.map((trait, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-teal-500 mt-0.5">•</span>
                      <span>{trait.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Differences */}
          {differences.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">Things to Discuss</span>
              </div>
              <ul className="space-y-1">
                {differences.map((diff, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{diff.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Empty state if no data */}
          {sharedInterests.length === 0 && sharedLanguages.length === 0 && commonTraits.length === 0 && differences.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Start chatting to learn more about each other!
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-muted/30 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={closeMutualMatchModal}
          >
            Keep Browsing
          </Button>
          <Link to={matchedUserId ? `/chat/with/${matchedUserId}` : '/chat'} className="flex-1">
            <Button
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
              onClick={closeMutualMatchModal}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Chat
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
