import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageSquare,
  MapPin,
  Check,
  Minus,
  Heart,
  Languages,
  Sparkles,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/shared/UserAvatar';
import LikeButton from '@/features/likes/components/LikeButton';
import SaveButton from '@/features/favorites/components/SaveButton';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function MatchDetailModal({ match, isOpen, onClose, onLike, onSkip }) {
  const { t } = useTranslation('matching');

  // Fetch detailed match data
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['match', match?.user_id],
    queryFn: async () => {
      const response = await api.get(`/matching/user/${match.user_id}`);
      return response.data;
    },
    enabled: isOpen && !!match?.user_id,
  });

  if (!isOpen || !match) return null;

  // Use detailed data if available, fallback to basic match data
  const userData = detailData || match;
  const {
    user_id,
    firstname,
    lastname,
    photo,
    age,
    bio,
    location,
    languages,
    compatibility_score,
    score_breakdown,
    explanations: rawExplanations,
    shared_interests,
    shared_languages,
  } = userData;

  const score = Math.round(compatibility_score || 0);
  const user = { firstname, lastname, photo };

  // Group explanations by impact
  const explanations = {
    positive: rawExplanations?.filter(e => e.impact === 'positive') || [],
    neutral: rawExplanations?.filter(e => e.impact === 'neutral') || [],
    negative: rawExplanations?.filter(e => e.impact === 'negative') || [],
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 55) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const getScoreBg = (score) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 55) return 'bg-yellow-500';
    return 'bg-muted-foreground';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-background rounded-t-3xl shadow-2xl overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <ScrollArea className="max-h-[calc(90vh-60px)]">
              <div className="px-6 pb-32">
                {/* Header with photo and score */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                  {/* Photo */}
                  <div className="relative">
                    {photo ? (
                      <img
                        src={photo}
                        alt={firstname}
                        className="w-32 h-32 rounded-2xl object-cover shadow-lg"
                      />
                    ) : (
                      <UserAvatar user={user} size="xl" className="w-32 h-32" />
                    )}
                    {/* Score badge */}
                    <div className={cn(
                      "absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg",
                      getScoreBg(score)
                    )}>
                      {score}%
                    </div>
                  </div>

                  {/* Info */}
                  <div className="text-center sm:text-left flex-1">
                    <h2 className="text-2xl font-bold">{firstname} {lastname}</h2>
                    {age && (
                      <p className="text-muted-foreground">{age} years old</p>
                    )}
                    {location && (
                      <div className="flex items-center gap-1 text-muted-foreground mt-1 justify-center sm:justify-start">
                        <MapPin className="h-4 w-4" />
                        <span>{location}</span>
                      </div>
                    )}

                    {/* Languages */}
                    {languages?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 justify-center sm:justify-start">
                        {languages.map((lang) => (
                          <Badge key={lang} variant="secondary" className="text-xs">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {bio && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      About
                    </h3>
                    <p className="text-foreground">{bio}</p>
                  </div>
                )}

                <Separator className="my-6" />

                {/* Compatibility breakdown */}
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <>
                    {/* Score breakdown */}
                    {score_breakdown && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Compatibility Breakdown
                        </h3>
                        <div className="grid gap-3">
                          {Object.entries(score_breakdown).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize text-muted-foreground">
                                  {key.replace(/_/g, ' ')}
                                </span>
                                <span className={cn("font-semibold", getScoreColor(value))}>
                                  {Math.round(value)}%
                                </span>
                              </div>
                              <Progress value={value} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Why you match */}
                    {(explanations.positive.length > 0 || explanations.neutral.length > 0 || explanations.negative.length > 0) && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                          {t('detail.whyMatch', 'Why You Match')}
                        </h3>
                        <div className="space-y-2">
                          {explanations.positive.map((exp, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <span className="text-green-700 dark:text-green-300">{exp.reason}</span>
                            </div>
                          ))}
                          {explanations.neutral.map((exp, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm bg-muted rounded-lg p-3">
                              <Minus className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{exp.reason}</span>
                            </div>
                          ))}
                          {explanations.negative.map((exp, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3">
                              <X className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                              <span className="text-yellow-700 dark:text-yellow-300">{exp.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shared interests */}
                    {shared_interests?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          {t('detail.sharedInterests', 'Shared Interests')}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {shared_interests.map((interest) => (
                            <Badge key={interest} variant="secondary">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shared languages */}
                    {shared_languages?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Languages className="h-4 w-4" />
                          Shared Languages
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {shared_languages.map((lang) => (
                            <Badge key={lang} className="bg-primary/10 text-primary border-0">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* View full profile link */}
                <Link
                  to={`/matches/${user_id}`}
                  className="flex items-center justify-center gap-2 text-sm text-primary hover:underline mb-6"
                >
                  View full profile
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </ScrollArea>

            {/* Fixed action buttons */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pt-12">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-14 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white"
                  onClick={() => {
                    onSkip?.(user_id);
                    onClose();
                  }}
                >
                  <X className="h-5 w-5 mr-2" />
                  Skip
                </Button>
                <Button
                  size="lg"
                  className="flex-1 h-14 bg-green-500 hover:bg-green-600"
                  onClick={() => {
                    onLike?.(user_id);
                    onClose();
                  }}
                >
                  <Heart className="h-5 w-5 mr-2" />
                  Like
                </Button>
                <Link to={`/chat/with/${user_id}`} className="flex-1">
                  <Button variant="outline" size="lg" className="w-full h-14">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Message
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
