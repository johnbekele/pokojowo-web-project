import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageSquare,
  MapPin,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserAvatar from '@/components/shared/UserAvatar';
import useLikesStore from '@/stores/likesStore';
import LikeButton from '../components/LikeButton';
import SaveButton from '@/features/favorites/components/SaveButton';
import { formatDistanceToNow } from 'date-fns';

export default function LikesPage() {
  const { t } = useTranslation('matching');
  const {
    likesSent,
    likesReceived,
    mutualMatches,
    stats,
    isLoading,
    fetchLikesSent,
    fetchLikesReceived,
    fetchMutualMatches,
    fetchStats,
  } = useLikesStore();

  const [activeTab, setActiveTab] = useState('received');

  useEffect(() => {
    fetchStats();
    fetchLikesReceived();
    fetchLikesSent();
    fetchMutualMatches();
  }, [fetchStats, fetchLikesReceived, fetchLikesSent, fetchMutualMatches]);

  const pendingLikesReceived = likesReceived.filter(l => l.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-4">
          <Heart className="h-8 w-8 fill-white" />
          {t('likes.title')}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{stats.likes_received}</div>
            <div className="text-sm opacity-90">{t('likes.stats.likesReceived')}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{stats.likes_sent}</div>
            <div className="text-sm opacity-90">{t('likes.stats.likesSent')}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{stats.mutual_matches}</div>
            <div className="text-sm opacity-90">{t('likes.stats.mutualMatches')}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4 text-center relative">
            <div className="text-3xl font-bold">{stats.pending_likes}</div>
            <div className="text-sm opacity-90">{t('likes.stats.pending')}</div>
            {stats.pending_likes > 0 && (
              <span className="absolute top-2 right-2 h-3 w-3 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="received" className="relative">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('likes.tabs.received')}
            {stats.pending_likes > 0 && (
              <Badge className="ml-2 bg-pink-500">{stats.pending_likes}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            <ArrowRight className="h-4 w-4 mr-2" />
            {t('likes.tabs.sent')}
          </TabsTrigger>
          <TabsTrigger value="mutual">
            <Sparkles className="h-4 w-4 mr-2" />
            {t('likes.tabs.mutual')}
            {stats.mutual_matches > 0 && (
              <Badge className="ml-2 bg-gradient-to-r from-pink-500 to-rose-500">
                {stats.mutual_matches}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Likes Received */}
        <TabsContent value="received" className="mt-6">
          {isLoading && likesReceived.length === 0 ? (
            <LoadingSkeleton />
          ) : likesReceived.length === 0 ? (
            <EmptyState
              icon={<ArrowLeft className="h-8 w-8" />}
              title={t('likes.received.empty.title')}
              description={t('likes.received.empty.subtitle')}
            />
          ) : (
            <div className="space-y-4">
              {pendingLikesReceived.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                    {t('likes.received.waitingForResponse')}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pendingLikesReceived.map((like) => (
                      <LikeReceivedCard key={like.id} like={like} isPending t={t} />
                    ))}
                  </div>
                </div>
              )}

              {likesReceived.filter(l => l.status !== 'pending').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t('likes.received.allLikes')}</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {likesReceived
                      .filter(l => l.status !== 'pending')
                      .map((like) => (
                        <LikeReceivedCard key={like.id} like={like} t={t} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Likes Sent */}
        <TabsContent value="sent" className="mt-6">
          {isLoading && likesSent.length === 0 ? (
            <LoadingSkeleton />
          ) : likesSent.length === 0 ? (
            <EmptyState
              icon={<ArrowRight className="h-8 w-8" />}
              title={t('likes.sent.empty.title')}
              description={t('likes.sent.empty.subtitle')}
              action={
                <Link to="/matches">
                  <Button>{t('likes.sent.browseMatches')}</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {likesSent.map((like) => (
                <LikeSentCard key={like.id} like={like} t={t} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Mutual Matches */}
        <TabsContent value="mutual" className="mt-6">
          {isLoading && mutualMatches.length === 0 ? (
            <LoadingSkeleton />
          ) : mutualMatches.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8 text-pink-500" />}
              title={t('likes.mutual.empty.title')}
              description={t('likes.mutual.empty.subtitle')}
              action={
                <Link to="/matches">
                  <Button className="bg-gradient-to-r from-pink-500 to-rose-500">
                    {t('likes.mutual.findMatches')}
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mutualMatches.map((match) => (
                <MutualMatchCard key={match.id} match={match} t={t} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LikeReceivedCard({ like, isPending, t }) {
  const { user, liked_at, compatibility_score } = like;

  if (!user) return null;

  return (
    <Card className={`overflow-hidden transition-all ${isPending ? 'ring-2 ring-yellow-400 dark:ring-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} size="lg" className="h-14 w-14" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {user.firstname} {user.lastname}
            </CardTitle>
            {user.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{user.location}</span>
              </div>
            )}
          </div>
          {compatibility_score && (
            <Badge className="bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300">
              {Math.round(compatibility_score)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {t('likes.received.likedYou', { time: formatDistanceToNow(new Date(liked_at), { addSuffix: true }) })}
        </p>
      </CardContent>

      <CardFooter className="gap-2 pt-2 border-t">
        <LikeButton
          userId={like.liker_id}
          showLabel
          className="flex-1"
        />
        <SaveButton userId={like.liker_id} />
        <Link to={`/chat/with/${like.liker_id}`}>
          <Button size="icon" variant="outline">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function LikeSentCard({ like, t }) {
  const { user, liked_at, status, compatibility_score } = like;

  if (!user) return null;

  const isMutual = status === 'mutual';

  return (
    <Card className={`overflow-hidden ${isMutual ? 'ring-2 ring-pink-400' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} size="lg" className="h-14 w-14" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {user.firstname} {user.lastname}
            </CardTitle>
            {user.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{user.location}</span>
              </div>
            )}
          </div>
          {isMutual && (
            <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
              <Sparkles className="h-3 w-3 mr-1" />
              {t('likes.mutual.matchBadge')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {t('likes.sent.liked', { time: formatDistanceToNow(new Date(liked_at), { addSuffix: true }) })}
        </p>
      </CardContent>

      <CardFooter className="gap-2 pt-2 border-t">
        <Link to={`/matches/${like.liked_user_id}`} className="flex-1">
          <Button variant="outline" className="w-full">{t('card.viewProfile')}</Button>
        </Link>
        <SaveButton userId={like.liked_user_id} />
        {isMutual && (
          <Link to={`/chat/with/${like.liked_user_id}`}>
            <Button className="bg-gradient-to-r from-pink-500 to-rose-500">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

function MutualMatchCard({ match, t }) {
  const { user, matched_at, compatibility_score } = match;

  if (!user) return null;

  return (
    <Card className="overflow-hidden ring-2 ring-pink-400 dark:ring-pink-600 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <UserAvatar user={user} size="lg" className="h-14 w-14" />
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full p-1">
              <Heart className="h-3 w-3 text-white fill-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {user.firstname} {user.lastname}
            </CardTitle>
            {user.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{user.location}</span>
              </div>
            )}
          </div>
          {compatibility_score && (
            <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
              {Math.round(compatibility_score)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {t('likes.mutual.matched', { time: formatDistanceToNow(new Date(matched_at), { addSuffix: true }) })}
        </p>
      </CardContent>

      <CardFooter className="gap-2 pt-2 border-t">
        <Link to={`/matches/${match.matched_user_id}`} className="flex-1">
          <Button variant="outline" className="w-full">{t('card.viewProfile')}</Button>
        </Link>
        <SaveButton userId={match.matched_user_id} />
        <Link to={`/chat/with/${match.matched_user_id}`}>
          <Button className="bg-gradient-to-r from-pink-500 to-rose-500">
            <MessageSquare className="h-4 w-4 mr-2" />
            {t('card.chat')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <Card>
      <CardHeader className="text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action && (
        <CardContent className="text-center pb-8">{action}</CardContent>
      )}
    </Card>
  );
}
