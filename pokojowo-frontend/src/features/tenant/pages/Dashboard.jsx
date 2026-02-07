import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Heart,
  Bookmark,
  MessageSquare,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Bell,
  Calendar,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import UserAvatar from '@/components/shared/UserAvatar';
import useAuthStore from '@/stores/authStore';
import useLikesStore from '@/stores/likesStore';
import useFavoritesStore from '@/stores/favoritesStore';
import MutualMatchModal from '@/features/likes/components/MutualMatchModal';
import api from '@/lib/api';

export default function TenantDashboard() {
  const { t } = useTranslation('matching');
  const { user } = useAuthStore();
  const { fetchStats } = useLikesStore();
  const { fetchSavedCount } = useFavoritesStore();

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['tenant-dashboard'],
    queryFn: async () => {
      const response = await api.get('/matching/dashboard');
      return response.data;
    },
    enabled: !!user?.isProfileComplete,
  });

  // Load stores on mount
  useEffect(() => {
    if (user?.isProfileComplete) {
      fetchStats();
      fetchSavedCount();
    }
  }, [user?.isProfileComplete, fetchStats, fetchSavedCount]);

  if (!user) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{t('dashboard.pleaseLogin')}</CardTitle>
          <CardDescription>{t('dashboard.loginRequired')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!user.isProfileComplete) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              {t('dashboard.completeProfile')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.profileIncomplete')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/profile-completion/tenant">
              <Button className="w-full sm:w-auto">
                {t('dashboard.continueSetup')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const previews = dashboardData?.previews || {};

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {t('dashboard.welcome', { name: user.firstname || user.username })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.overview')}
          </p>
        </div>
        <Link to="/matches">
          <Button>
            <Users className="mr-2 h-4 w-4" />
            {t('dashboard.quickActions.browseMatches')}
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title={t('dashboard.stats.compatibleMatches')}
            value={stats.compatible_matches || 0}
            icon={<Users className="h-4 w-4" />}
            description={t('dashboard.stats.highCompatibility', { count: stats.high_compatibility || 0 })}
            color="blue"
            link="/matches"
          />
          <StatsCard
            title={t('dashboard.stats.mutualMatches')}
            value={stats.mutual_matches || 0}
            icon={<Sparkles className="h-4 w-4" />}
            description={t('dashboard.stats.bothLiked')}
            color="pink"
            link="/likes"
          />
          <StatsCard
            title={t('dashboard.stats.likesReceived')}
            value={stats.likes_received || 0}
            icon={<Heart className="h-4 w-4" />}
            description={stats.pending_likes ? t('dashboard.stats.pending', { count: stats.pending_likes }) : t('dashboard.stats.peopleWhoLiked')}
            color="rose"
            link="/likes"
            badge={stats.pending_likes > 0 ? stats.pending_likes : null}
          />
          <StatsCard
            title={t('dashboard.stats.savedProfiles')}
            value={stats.saved_matches || 0}
            icon={<Bookmark className="h-4 w-4" />}
            description={t('dashboard.stats.bookmarkedForLater')}
            color="amber"
            link="/favorites"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Matches */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                {t('dashboard.topMatches.title')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.topMatches.subtitle')}
              </CardDescription>
            </div>
            <Link to="/matches">
              <Button variant="ghost" size="sm">
                {t('dashboard.topMatches.viewAll')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : previews.top_matches?.length > 0 ? (
              <div className="space-y-4">
                {previews.top_matches.map((match) => (
                  <MatchPreviewCard key={match.user_id} match={match} t={t} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('dashboard.topMatches.empty')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Sidebar */}
        <div className="space-y-6">
          {/* Pending Likes */}
          {previews.pending_likes?.length > 0 && (
            <Card className="border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Bell className="h-4 w-4 text-pink-500 dark:text-pink-400" />
                  {t('dashboard.pendingLikes.title')}
                  <Badge className="ml-auto bg-pink-500 dark:bg-pink-600">
                    {stats.pending_likes || previews.pending_likes.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {previews.pending_likes.map((like) => (
                  <div key={like.liker_id} className="flex items-center gap-3">
                    <UserAvatar
                      user={like.user}
                      size="sm"
                      className="h-10 w-10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {like.user?.firstname} {like.user?.lastname}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {like.user?.location || t('dashboard.unknownLocation')}
                      </p>
                    </div>
                  </div>
                ))}
                <Link to="/likes">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    {t('dashboard.pendingLikes.viewAll')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Mutual Matches */}
          {previews.recent_mutual_matches?.length > 0 && (
            <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                  {t('dashboard.mutualMatches.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {previews.recent_mutual_matches.map((match) => (
                  <div key={match.matched_user_id} className="flex items-center gap-3">
                    <div className="relative">
                      <UserAvatar
                        user={match.user}
                        size="sm"
                        className="h-10 w-10"
                      />
                      <Heart className="absolute -bottom-1 -right-1 h-4 w-4 text-pink-500 fill-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">
                        {match.user?.firstname} {match.user?.lastname}
                      </p>
                      {match.compatibility_score && (
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {t('card.compatible', { score: Math.round(match.compatibility_score) })}
                        </p>
                      )}
                    </div>
                    <Link to={`/chat/with/${match.matched_user_id}`}>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('dashboard.quickActions.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/matches" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  {t('dashboard.quickActions.browseMatches')}
                </Button>
              </Link>
              <Link to="/likes" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Heart className="mr-2 h-4 w-4" />
                  {t('dashboard.quickActions.viewLikes')}
                </Button>
              </Link>
              <Link to="/favorites" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Bookmark className="mr-2 h-4 w-4" />
                  {t('dashboard.quickActions.savedProfiles')}
                </Button>
              </Link>
              <Link to="/chat" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('dashboard.quickActions.messages')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mutual Match Modal */}
      <MutualMatchModal />
    </div>
  );
}

function StatsCard({ title, value, icon, description, color, link, badge }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
    pink: 'bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-800',
    rose: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800',
    amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
    green: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800',
  };

  const content = (
    <Card className={`${colors[color]} border hover:shadow-md transition-shadow cursor-pointer`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="relative">
          {icon}
          {badge && (
            <span className="absolute -top-2 -right-2 h-4 w-4 bg-pink-500 dark:bg-pink-600 text-white text-xs rounded-full flex items-center justify-center">
              {badge}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

function MatchPreviewCard({ match, t }) {
  const score = match.compatibility_score || 0;

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <UserAvatar
        user={{ firstname: match.firstname, lastname: match.lastname, photo: match.photo }}
        size="md"
        className="h-12 w-12"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-foreground">
          {match.firstname} {match.lastname}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {match.location || t('dashboard.unknownLocation')}
        </p>
      </div>
      <div className="text-right">
        <div className="font-semibold text-blue-600 dark:text-blue-400">{Math.round(score)}%</div>
        <Progress value={score} className="w-16 h-1.5" />
      </div>
      <Link to={`/matches/${match.user_id}`}>
        <Button variant="ghost" size="icon">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
