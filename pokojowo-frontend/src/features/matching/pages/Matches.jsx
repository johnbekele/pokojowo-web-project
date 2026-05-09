import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageSquare,
  MapPin,
  Languages,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserAvatar from '@/components/shared/UserAvatar';
import LikeButton from '@/features/likes/components/LikeButton';
import SaveButton from '@/features/favorites/components/SaveButton';
import MutualMatchModal from '@/features/likes/components/MutualMatchModal';
import SwipeStack from '../components/SwipeStack';
import MatchDetailModal from '../components/MatchDetailModal';
import {
  Eyebrow,
  DisplayTitle,
  EditorialRule,
  LuxuryPanel,
  ScoreRing,
  TrustBadge,
} from '@/components/shared/editorial';
import useLikesStore from '@/stores/likesStore';
import useFavoritesStore from '@/stores/favoritesStore';
import api from '@/lib/api';

export default function Matches() {
  const { t } = useTranslation('matching');
  const { fetchLikesSent, likeUser } = useLikesStore();
  const { fetchSavedMatches } = useFavoritesStore();
  const [viewMode, setViewMode] = useState('swipe');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-2/3 max-w-lg" />
          <Skeleton className="h-4 w-2/3 max-w-md" />
        </div>
        <div className="flex justify-center py-10">
          <Skeleton className="aspect-[3/4] w-[380px] rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <LuxuryPanel className="text-center py-16" tone="parchment">
        <Eyebrow>{t('error.eyebrow', 'A pause in matching')}</Eyebrow>
        <h2 className="mt-3 font-display text-2xl font-medium text-foreground">
          {t('error.title')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('error.subtitle')}</p>
      </LuxuryPanel>
    );
  }

  const matches = data?.matches || [];

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Eyebrow>{t('eyebrow', 'The Matchmaker')}</Eyebrow>
          <DisplayTitle size="md" italicWord={t('italic', 'fit.')}>
            {t('title', 'Flatmates who actually')}
          </DisplayTitle>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            {t(
              'subtitle',
              'A short, considered shortlist — not an endless feed. Tap a card to read deeper, or swipe to keep things moving.',
            )}
          </p>
          {data?.total_candidates != null && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <TrustBadge tone="ink">
                {t('stats.matchesFound', { count: matches.length, total: data.total_candidates })}
              </TrustBadge>
              {data.filtered_by_deal_breakers > 0 && (
                <TrustBadge tone="rose">
                  {t('stats.filtered', { count: data.filtered_by_deal_breakers })}
                </TrustBadge>
              )}
            </div>
          )}
        </div>

        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="rounded-full border border-border/70 bg-surface-paper p-1">
            <TabsTrigger value="swipe" className="gap-2 rounded-full px-4 data-[state=active]:bg-foreground data-[state=active]:text-background">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">{t('viewMode.swipe', 'Swipe')}</span>
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-2 rounded-full px-4 data-[state=active]:bg-foreground data-[state=active]:text-background">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">{t('viewMode.grid', 'Index')}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <EditorialRule label={viewMode === 'swipe' ? t('rule.swipe', 'Featured profile') : t('rule.grid', 'Curated index')} />

      {matches.length === 0 ? (
        <LuxuryPanel className="py-16 text-center" tone="parchment">
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-surface-paper">
            <Users className="h-6 w-6 text-muted-foreground" />
          </span>
          <Eyebrow>{t('empty.eyebrow', 'No matches yet')}</Eyebrow>
          <h3 className="mt-3 font-display text-2xl font-medium text-foreground">
            {t('empty.title')}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t('empty.subtitle')}
          </p>
          <Link to="/profile-completion/tenant" className="mt-6 inline-block">
            <Button>{t('empty.completeProfile')}</Button>
          </Link>
        </LuxuryPanel>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'swipe' ? (
            <motion.div
              key="swipe"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {matches.map((match, index) => (
                <MatchCard
                  key={match.user_id}
                  match={match}
                  index={index}
                  onClick={() => handleCardClick(match)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <MatchDetailModal
        match={selectedMatch}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onLike={handleLike}
        onSkip={() => {}}
      />
      <MutualMatchModal />
    </div>
  );
}

function MatchCard({ match, onClick, index = 0 }) {
  const { t } = useTranslation('matching');

  const {
    user_id,
    firstname,
    lastname,
    photo,
    age,
    bio,
    location,
    compatibility_score,
    explanations,
    shared_languages,
    is_new_user,
  } = match;

  const score = compatibility_score || 0;
  const positivePoints = explanations?.filter((e) => e.impact === 'positive').slice(0, 2) || [];
  const user = { firstname, lastname, photo };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="group/card relative cursor-pointer overflow-hidden rounded-3xl border border-border/70 bg-card shadow-editorial transition-all duration-500 hover:-translate-y-1 hover:shadow-premium-lg"
    >
      {/* Top portrait band */}
      <div className="relative h-44 overflow-hidden bg-surface-parchment">
        {photo ? (
          <img
            src={photo}
            alt={`${firstname}`}
            className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover/card:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-parchment">
            <UserAvatar user={user} size="xl" className="h-20 w-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-onyx/40 via-transparent to-transparent" />

        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full bg-surface-paper/85 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground backdrop-blur">
            № {String(index + 1).padStart(2, '0')}
          </span>
          {is_new_user && (
            <TrustBadge tone="accent">{t('card.newUser', 'New')}</TrustBadge>
          )}
        </div>

        <div className="absolute right-4 top-4 rounded-full bg-surface-paper/85 p-1 backdrop-blur">
          <ScoreRing value={score} size={56} />
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-medium tracking-editorial text-foreground">
              {firstname} {lastname}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {age ? <span>{t('card.yearsOld', { age })}</span> : null}
              {location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {location}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {bio ? (
          <p className="font-display text-base font-light italic leading-relaxed text-muted-foreground line-clamp-2">
            "{bio}"
          </p>
        ) : null}

        {positivePoints.length > 0 && (
          <ul className="space-y-1.5">
            {positivePoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-olive" />
                <span>{point.reason}</span>
              </li>
            ))}
          </ul>
        )}

        {shared_languages?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-muted-foreground" />
            {shared_languages.slice(0, 3).map((lang) => (
              <Badge key={lang} variant="secondary">
                {lang}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-2 border-t border-border/60 bg-surface-canvas px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <LikeButton userId={user_id} />
        <SaveButton userId={user_id} />
        <Link to={`/matches/${user_id}`} className="ml-auto flex-1 max-w-[160px]">
          <Button variant="outline" size="sm" className="w-full">
            {t('card.viewProfile', 'View profile')}
          </Button>
        </Link>
        <Link to={`/chat/with/${user_id}`}>
          <Button variant="default" size="icon" aria-label="Message">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.article>
  );
}
