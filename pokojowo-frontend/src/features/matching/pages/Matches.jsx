import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, MapPin, Heart, Languages, LayoutGrid, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserAvatar from '@/components/shared/UserAvatar';
import LikeButton from '@/features/likes/components/LikeButton';
import SaveButton from '@/features/favorites/components/SaveButton';
import MutualMatchModal from '@/features/likes/components/MutualMatchModal';
import SwipeStack from '../components/SwipeStack';
import MatchDetailModal from '../components/MatchDetailModal';
import useLikesStore from '@/stores/likesStore';
import useFavoritesStore from '@/stores/favoritesStore';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Matches() {
  const { t } = useTranslation('matching');
  const { fetchLikesSent, likeUser } = useLikesStore();
  const { fetchSavedMatches } = useFavoritesStore();
  const [viewMode, setViewMode] = useState('swipe'); // 'swipe' or 'grid'
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load likes and favorites on mount
  useEffect(() => {
    fetchLikesSent();
    fetchSavedMatches();
  }, [fetchLikesSent, fetchSavedMatches]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const response = await api.get('/matching/');
      return response.data;
    },
  });

  const handleCardClick = (match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMatch(null);
  };

  const handleLike = async (userId) => {
    await likeUser(userId);
  };

  const handleSkip = (userId) => {
    // Just close modal, skip is handled by swipe
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex justify-center py-12">
          <Skeleton className="w-[380px] h-[500px] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">Error loading matches</CardTitle>
          <CardDescription>
            Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const matches = data?.matches || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
          {data?.total_candidates != null && (
            <p className="text-sm text-muted-foreground mt-1">
              {matches.length} matches found from {data.total_candidates} candidates
              {data.filtered_by_deal_breakers > 0 && (
                <span className="text-yellow-600"> ({data.filtered_by_deal_breakers} filtered)</span>
              )}
            </p>
          )}
        </div>

        {/* View mode toggle */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="swipe" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Swipe</span>
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {matches.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>{t('empty.title')}</CardTitle>
            <CardDescription>{t('empty.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/profile-completion/tenant">
              <Button>{t('empty.completeProfile')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'swipe' ? (
            <motion.div
              key="swipe"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <SwipeStack
                matches={matches}
                onCardClick={handleCardClick}
                onEmpty={() => setViewMode('grid')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {matches.map((match) => (
                <MatchCard
                  key={match.user_id}
                  match={match}
                  onClick={() => handleCardClick(match)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Match Detail Modal */}
      <MatchDetailModal
        match={selectedMatch}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onLike={handleLike}
        onSkip={handleSkip}
      />

      {/* Mutual Match Modal */}
      <MutualMatchModal />
    </div>
  );
}

function MatchCard({ match, onClick }) {
  const { t } = useTranslation('matching');

  // API returns flat structure
  const {
    user_id,
    username,
    firstname,
    lastname,
    photo,
    age,
    bio,
    location,
    languages,
    compatibility_score,
    match_tier,
    explanations,
    shared_languages,
    shared_interests,
  } = match;

  const score = compatibility_score;

  // Get friendly match message based on score
  const getMatchMessage = (score) => {
    if (score >= 85) return t('card.matchMessages.perfect');
    if (score >= 70) return t('card.matchMessages.great');
    if (score >= 55) return t('card.matchMessages.good');
    return t('card.matchMessages.fair');
  };

  const getMatchColor = (score) => {
    if (score >= 85) return 'bg-green-500 dark:bg-green-600';
    if (score >= 70) return 'bg-blue-500 dark:bg-blue-600';
    if (score >= 55) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-muted-foreground';
  };

  // Get positive highlights from explanations
  const positivePoints = explanations?.filter(e => e.impact === 'positive').slice(0, 2) || [];

  // Build user object for UserAvatar
  const user = { firstname, lastname, photo };

  return (
    <Card
      className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group cursor-pointer"
      onClick={onClick}
    >
      {/* Header with score */}
      <div className={cn('p-4 text-white', getMatchColor(score))}>
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          <span className="text-sm font-medium">{t('card.compatible', { score: Math.round(score) })}</span>
        </div>
      </div>

      <CardContent className="pt-6 pb-4">
        {/* Profile section */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="relative mb-3">
            <UserAvatar user={user} size="xl" className="h-20 w-20 ring-4 ring-background shadow-lg" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            {firstname} {lastname}
          </h3>
          {age && (
            <p className="text-sm text-muted-foreground">{t('card.yearsOld', { age })}</p>
          )}
          {location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* Match message */}
        <div className="text-center mb-4">
          <p className="text-sm font-medium text-primary">{getMatchMessage(score, match_tier)}</p>
        </div>

        {/* Bio snippet */}
        {bio && (
          <p className="text-sm text-muted-foreground text-center line-clamp-2 mb-4 italic">
            "{bio}"
          </p>
        )}

        {/* Why you match */}
        {positivePoints.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('card.whyYouMatch')}</p>
            {positivePoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                <span className="text-green-500 dark:text-green-400 mt-0.5">✓</span>
                <span>{point.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Shared languages */}
        {shared_languages?.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Languages className="h-4 w-4 text-muted-foreground" />
            {shared_languages.map((lang) => (
              <Badge key={lang} variant="secondary" className="text-xs">
                {lang}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/50 gap-2 pt-4" onClick={(e) => e.stopPropagation()}>
        <LikeButton userId={user_id} />
        <SaveButton userId={user_id} />
        <Link to={`/matches/${user_id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {t('card.viewProfile')}
          </Button>
        </Link>
        <Link to={`/chat/with/${user_id}`} onClick={(e) => e.stopPropagation()}>
          <Button className="bg-primary">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
