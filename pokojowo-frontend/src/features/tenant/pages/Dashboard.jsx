import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Heart,
  MessageSquare,
  Check,
  ArrowRight,
  Target,
  ThumbsUp,
  Handshake,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserAvatar from '@/components/shared/UserAvatar';
import {
  Eyebrow,
  DisplayTitle,
  EditorialRule,
  LuxuryPanel,
  ScoreRing,
  TrustBadge,
} from '@/components/shared/editorial';
import useAuthStore from '@/stores/authStore';
import useLikesStore from '@/stores/likesStore';
import MutualMatchModal from '@/features/likes/components/MutualMatchModal';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function TenantDashboard() {
  const { t } = useTranslation('matching');
  const { user } = useAuthStore();
  const { fetchStats } = useLikesStore();
  const [activeTab, setActiveTab] = useState('matches');

  const { data: likesSent, isLoading: loadingSent } = useQuery({
    queryKey: ['likes-sent'],
    queryFn: async () => {
      const response = await api.get('/likes/sent');
      return response.data;
    },
    enabled: !!user?.isProfileComplete,
  });

  const { data: mutualMatches, isLoading: loadingMatches } = useQuery({
    queryKey: ['mutual-matches'],
    queryFn: async () => {
      const response = await api.get('/likes/mutual');
      return response.data;
    },
    enabled: !!user?.isProfileComplete,
  });

  const { data: likesReceived, isLoading: loadingReceived } = useQuery({
    queryKey: ['likes-received'],
    queryFn: async () => {
      const response = await api.get('/likes/received');
      return response.data;
    },
    enabled: !!user?.isProfileComplete,
  });

  useEffect(() => {
    if (user?.isProfileComplete) fetchStats();
  }, [user?.isProfileComplete, fetchStats]);

  if (!user) {
    return (
      <LuxuryPanel className="text-center py-16" tone="parchment">
        <Eyebrow>{t('dashboard.signedOut', 'Signed out')}</Eyebrow>
        <h2 className="mt-3 font-display text-2xl font-medium text-foreground">
          {t('dashboard.pleaseLogin', 'Sign in to see your matches')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('dashboard.loginRequired', 'A few quick details and you’re back in.')}
        </p>
      </LuxuryPanel>
    );
  }

  if (!user.isProfileComplete) {
    return (
      <div className="space-y-8">
        <header className="space-y-3">
          <Eyebrow>{t('dashboard.eyebrow', 'Your salon')}</Eyebrow>
          <DisplayTitle size="md" italicWord={t('dashboard.italic', 'started.')}>
            {t('dashboard.welcomeName', 'Hello,')} {user.firstname || user.username},
          </DisplayTitle>
        </header>
        <LuxuryPanel className="space-y-4 text-center" tone="parchment">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-warning/40 bg-warning/10 text-warning">
            <Target className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-medium text-foreground">
              {t('dashboard.completeProfile', 'Finish your story first')}
            </h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {t(
                'dashboard.profileIncomplete',
                'Adding a few personal details lets us match you with people who fit how you actually live.',
              )}
            </p>
          </div>
          <Link to="/profile-completion/tenant">
            <Button>
              {t('dashboard.continueSetup', 'Continue setup')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </LuxuryPanel>
      </div>
    );
  }

  const sentList = likesSent?.likes || [];
  const matchesList = mutualMatches?.matches || [];
  const receivedList = likesReceived?.likes || [];

  return (
    <div className="space-y-12">
      <header className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-10">
        <div className="space-y-3">
          <Eyebrow>{t('dashboard.eyebrow', 'Your salon')}</Eyebrow>
          <DisplayTitle size="md" italicWord={t('dashboard.italic', `${user.firstname || user.username}.`)}>
            {t('dashboard.welcomeName', 'Hello,')}
          </DisplayTitle>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            {t(
              'dashboard.subtitle',
              'A quiet ledger of every connection you’ve sent, received, and confirmed. Pick up exactly where you left off.',
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatTile
            icon={<Handshake className="h-3.5 w-3.5" />}
            value={matchesList.length}
            label={t('dashboard.stats.mutual', 'Mutual')}
            tone="ink"
          />
          <StatTile
            icon={<ThumbsUp className="h-3.5 w-3.5" />}
            value={sentList.length}
            label={t('dashboard.stats.sent', 'Liked')}
          />
          <StatTile
            icon={<Heart className="h-3.5 w-3.5" />}
            value={receivedList.length}
            label={t('dashboard.stats.received', 'Liked you')}
            tone="rose"
          />
        </div>
      </header>

      <EditorialRule label={t('dashboard.indexLabel', 'The ledger')} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 rounded-full border border-border/70 bg-surface-paper p-1">
          <TabsTrigger
            value="matches"
            className="gap-2 rounded-full px-4 data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            <Handshake className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard.tabs.matches', 'Mutual')}</span>
            {matchesList.length > 0 && (
              <span className="ml-1 rounded-full bg-current/20 px-1.5 py-0.5 text-[10px] font-medium">
                {matchesList.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="sent"
            className="gap-2 rounded-full px-4 data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard.tabs.sent', 'I liked')}</span>
            {sentList.length > 0 && (
              <span className="ml-1 rounded-full bg-current/20 px-1.5 py-0.5 text-[10px] font-medium">
                {sentList.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="received"
            className="gap-2 rounded-full px-4 data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard.tabs.received', 'Liked me')}</span>
            {receivedList.length > 0 && (
              <span className="ml-1 rounded-full bg-current/20 px-1.5 py-0.5 text-[10px] font-medium">
                {receivedList.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-8">
          {loadingMatches ? (
            <LoadingState />
          ) : matchesList.length === 0 ? (
            <EmptyState
              icon={<Handshake className="h-6 w-6" />}
              title={t('dashboard.emptyMatches.title', 'No mutual matches yet')}
              description={t(
                'dashboard.emptyMatches.subtitle',
                'When someone you like also says yes, you’ll meet them here.',
              )}
              action={
                <Link to="/matches">
                  <Button>
                    {t('dashboard.browseMatches', 'Browse matches')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {matchesList.map((match, idx) => (
                <PersonCard
                  key={match.matched_user_id}
                  index={idx}
                  user={match.user}
                  userId={match.matched_user_id}
                  score={match.compatibility_score}
                  showChat
                  status="mutual"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-8">
          {loadingSent ? (
            <LoadingState />
          ) : sentList.length === 0 ? (
            <EmptyState
              icon={<ThumbsUp className="h-6 w-6" />}
              title={t('dashboard.emptySent.title', 'You haven’t liked anyone yet')}
              description={t(
                'dashboard.emptySent.subtitle',
                'Browse our shortlist of compatible flatmates whenever you’re ready.',
              )}
              action={
                <Link to="/matches">
                  <Button>{t('dashboard.findMatches', 'Find matches')}</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sentList.map((like, idx) => (
                <PersonCard
                  key={like.liked_user_id}
                  index={idx}
                  user={like.user}
                  userId={like.liked_user_id}
                  score={like.compatibility_score}
                  status={like.is_mutual ? 'mutual' : 'pending'}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-8">
          {loadingReceived ? (
            <LoadingState />
          ) : receivedList.length === 0 ? (
            <EmptyState
              icon={<Heart className="h-6 w-6" />}
              title={t('dashboard.emptyReceived.title', 'No likes yet')}
              description={t(
                'dashboard.emptyReceived.subtitle',
                'Keep your profile fresh — a few small details make a real difference.',
              )}
              action={
                <Link to="/profile">
                  <Button variant="outline">
                    {t('dashboard.updateProfile', 'Refine your profile')}
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {receivedList.map((like, idx) => (
                <PersonCard
                  key={like.liker_id}
                  index={idx}
                  user={like.user}
                  userId={like.liker_id}
                  score={like.compatibility_score}
                  status={like.is_mutual ? 'mutual' : 'new'}
                  isNew={!like.is_mutual}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MutualMatchModal />
    </div>
  );
}

function StatTile({ icon, value, label, tone = 'paper' }) {
  const tones = {
    paper: 'bg-card border-border/70 text-foreground',
    ink: 'bg-surface-ink border-transparent text-[hsl(var(--surface-paper))]',
    rose: 'bg-rose/10 border-rose/40 text-foreground',
  };
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-2xl border px-4 py-4 transition-colors duration-500',
        tones[tone] || tones.paper,
      )}
    >
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] opacity-80">
        {icon}
        {label}
      </span>
      <span className="font-display text-3xl font-medium leading-none tracking-editorial">
        {value}
      </span>
    </div>
  );
}

function PersonCard({ user, userId, score, showChat, status, isNew, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.04 }}
      className={cn(
        'group/person relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-editorial transition-all duration-500',
        'hover:-translate-y-0.5 hover:shadow-premium-lg',
        isNew && 'ring-1 ring-rose/40',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <UserAvatar user={user} size="lg" className="h-16 w-16" />
          {status === 'mutual' && (
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-card">
              <Check className="h-3 w-3" strokeWidth={2.5} />
            </span>
          )}
          {isNew && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose text-rose-foreground ring-2 ring-card">
              <Heart className="h-3 w-3 fill-current" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-display text-lg font-medium tracking-editorial text-foreground">
            {user?.firstname} {user?.lastname}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.location || 'Location not set'}
          </p>
          {status && (
            <div className="pt-1">
              <TrustBadge tone={status === 'mutual' ? 'olive' : status === 'new' ? 'rose' : 'ink'}>
                {status === 'mutual' ? 'Mutual' : status === 'new' ? 'New' : 'Pending'}
              </TrustBadge>
            </div>
          )}
        </div>

        {score ? (
          <div className="flex-shrink-0">
            <ScoreRing value={score} size={48} />
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2">
        <Link to={`/matches/${userId}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View profile
          </Button>
        </Link>
        {showChat && (
          <Link to={`/chat/with/${userId}`}>
            <Button size="icon" aria-label="Message">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <LuxuryPanel className="space-y-4 py-14 text-center" tone="parchment">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-surface-paper text-muted-foreground">
        {icon}
      </span>
      <Eyebrow>{title}</Eyebrow>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </LuxuryPanel>
  );
}
