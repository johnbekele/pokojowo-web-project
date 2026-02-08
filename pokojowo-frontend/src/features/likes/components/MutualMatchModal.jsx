import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, MessageSquare, X, Users, Check, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  const scoreBreakdown = matchData?.score_breakdown || {};

  // Get top compatibility factors
  const topFactors = Object.entries(scoreBreakdown)
    .filter(([key]) => key !== 'totalScore')
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, value]) => ({
      label: key.replace('Score', '').replace(/([A-Z])/g, ' $1').trim(),
      value: Math.round(value),
    }));

  return (
    <Dialog open={showMutualMatchModal} onOpenChange={closeMutualMatchModal}>
      <DialogContent className="sm:max-w-lg overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-6 text-white">
          <button
            onClick={closeMutualMatchModal}
            className="absolute right-4 top-4 rounded-full p-1 bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wider">Flatmate Connection</span>
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold text-white">
              You're Both Interested!
            </DialogTitle>
            <DialogDescription className="text-white/90 text-base">
              Start a conversation to see if you'd be good flatmates
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {/* Profile pictures side by side */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Current user */}
            <div className="flex flex-col items-center">
              <UserAvatar
                user={currentUser}
                size="lg"
                className="h-20 w-20 ring-4 ring-teal-100 dark:ring-teal-900"
              />
              <p className="mt-2 text-sm font-medium text-center">
                {currentUser?.firstname || 'You'}
              </p>
            </div>

            {/* Connection indicator */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                <Check className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Connected</p>
            </div>

            {/* Matched user */}
            <div className="flex flex-col items-center">
              <UserAvatar
                user={matchedUser}
                size="lg"
                className="h-20 w-20 ring-4 ring-teal-100 dark:ring-teal-900"
              />
              <p className="mt-2 text-sm font-medium text-center">
                {matchedUser?.firstname || 'User'}
              </p>
            </div>
          </div>

          {/* Compatibility Score */}
          {compatibilityScore > 0 && (
            <div className="bg-muted/50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Home className="h-4 w-4 text-teal-600" />
                  Flatmate Compatibility
                </span>
                <span className="text-2xl font-bold text-teal-600">
                  {Math.round(compatibilityScore)}%
                </span>
              </div>
              <Progress value={compatibilityScore} className="h-2" />
            </div>
          )}

          {/* Top compatibility factors */}
          {topFactors.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Top Compatibility Factors
              </p>
              <div className="grid grid-cols-3 gap-2">
                {topFactors.map((factor) => (
                  <div
                    key={factor.label}
                    className="bg-muted/50 rounded-lg p-2 text-center"
                  >
                    <p className="text-lg font-bold text-teal-600">{factor.value}%</p>
                    <p className="text-xs text-muted-foreground capitalize">{factor.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared traits */}
          {(sharedInterests.length > 0 || sharedLanguages.length > 0) && (
            <div className="mb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                What You Have in Common
              </p>
              <div className="flex flex-wrap gap-2">
                {sharedInterests.slice(0, 4).map((interest) => (
                  <Badge key={interest} variant="secondary" className="bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-0">
                    {interest}
                  </Badge>
                ))}
                {sharedLanguages.slice(0, 2).map((lang) => (
                  <Badge key={lang} variant="outline" className="border-teal-200 dark:border-teal-800">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Location if available */}
          {matchedUser?.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <MapPin className="h-4 w-4" />
              <span>{matchedUser.location}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeMutualMatchModal}
            >
              Keep Browsing
            </Button>
            <Link to={matchedUserId ? `/chat/with/${matchedUserId}` : '/chat'} className="flex-1">
              <Button
                className="w-full bg-teal-500 hover:bg-teal-600"
                onClick={closeMutualMatchModal}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Start Chat
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
