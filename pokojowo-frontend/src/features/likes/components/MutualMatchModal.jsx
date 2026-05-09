import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, X, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/shared/UserAvatar';
import { Eyebrow, ScoreRing } from '@/components/shared/editorial';
import useLikesStore from '@/stores/likesStore';
import useAuthStore from '@/stores/authStore';
import api from '@/lib/api';

/**
 * Mutual match celebration — kept calm and editorial.
 * Two portraits face each other with a quiet score halo between them.
 */
export default function MutualMatchModal() {
  const { showMutualMatchModal, mutualMatchUser, closeMutualMatchModal } = useLikesStore();
  const { user: currentUser } = useAuthStore();

  const matchedUser = mutualMatchUser?.user || mutualMatchUser;
  const matchedUserId = mutualMatchUser?.matched_user_id || matchedUser?.id;

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

  const commonTraits = explanations.filter((e) => e.impact === 'positive').slice(0, 4);
  const differences = explanations
    .filter((e) => e.impact === 'negative' || e.impact === 'neutral')
    .slice(0, 3);

  return (
    <Dialog open={showMutualMatchModal} onOpenChange={closeMutualMatchModal}>
      <DialogContent
        className="overflow-hidden gap-0 p-0 sm:max-w-md border-border/70 [&>button]:hidden"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">It's mutual</DialogTitle>

        <button
          onClick={closeMutualMatchModal}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-surface-paper/80 text-foreground hover:bg-surface-paper transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Editorial header */}
        <div className="relative overflow-hidden bg-surface-ink p-8 text-[hsl(var(--surface-paper))]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50 bg-mesh"
          />
          <div className="relative space-y-5 text-center">
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Eyebrow className="text-[hsl(var(--surface-paper)/0.6)]">
                Vol. {new Date().getFullYear()} · Mutual interest
              </Eyebrow>
            </motion.div>

            <motion.h2
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="font-display text-4xl font-medium leading-tight tracking-editorial"
            >
              It’s
              <span className="font-display italic text-accent"> mutual.</span>
            </motion.h2>

            <p className="text-sm text-[hsl(var(--surface-paper)/0.7)]">
              You both said yes. The next move is up to you.
            </p>

            <div className="mt-4 flex items-center justify-center gap-4">
              <PortraitTile user={currentUser} label="You" />
              <div className="relative flex flex-col items-center">
                <div className="rounded-full bg-surface-paper p-1.5 shadow-premium">
                  <ScoreRing value={compatibilityScore} size={64} />
                </div>
                <span className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--surface-paper)/0.6)]">
                  Compatibility
                </span>
              </div>
              <PortraitTile user={matchedUser} label={matchedUser?.firstname || 'Match'} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[300px] space-y-5 overflow-y-auto p-6">
          {(sharedInterests.length > 0 || sharedLanguages.length > 0 || commonTraits.length > 0) && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-olive/15 text-olive">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <Eyebrow>What you share</Eyebrow>
              </div>

              {(sharedInterests.length > 0 || sharedLanguages.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {sharedInterests.slice(0, 4).map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                  {sharedLanguages.slice(0, 2).map((lang) => (
                    <Badge key={lang} variant="outline">
                      {lang}
                    </Badge>
                  ))}
                </div>
              )}

              {commonTraits.length > 0 && (
                <ul className="space-y-1.5">
                  {commonTraits.map((trait, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm leading-snug text-foreground/80"
                    >
                      <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-olive" />
                      <span>{trait.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {differences.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/15 text-warning">
                  <AlertCircle className="h-3.5 w-3.5" />
                </span>
                <Eyebrow>Worth a chat</Eyebrow>
              </div>
              <ul className="space-y-1.5">
                {differences.map((diff, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm leading-snug text-muted-foreground"
                  >
                    <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-warning" />
                    <span>{diff.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sharedInterests.length === 0 &&
            sharedLanguages.length === 0 &&
            commonTraits.length === 0 &&
            differences.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Start the conversation — there’s plenty to talk about.
              </p>
            )}
        </div>

        <div className="flex gap-3 border-t border-border/60 bg-surface-canvas p-4">
          <Button variant="outline" className="flex-1" onClick={closeMutualMatchModal}>
            Keep browsing
          </Button>
          <Link
            to={matchedUserId ? `/chat/with/${matchedUserId}` : '/chat'}
            className="flex-1"
          >
            <Button className="w-full" onClick={closeMutualMatchModal}>
              <MessageSquare className="h-4 w-4" />
              Start chat
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PortraitTile({ user, label }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="rounded-full bg-surface-paper/15 p-1 ring-1 ring-[hsl(var(--surface-paper)/0.25)]">
        <UserAvatar
          user={user}
          size="xl"
          className="h-20 w-20 ring-2 ring-[hsl(var(--surface-paper)/0.3)]"
        />
      </div>
      <span className="mt-2 max-w-[110px] truncate font-display text-sm font-medium tracking-tight">
        {user?.firstname || label}
      </span>
    </div>
  );
}
