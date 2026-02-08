import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Target,
  ThumbsUp,
  Handshake,
  Users,
  Loader2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserAvatar from '@/components/shared/UserAvatar';
import useAuthStore from '@/stores/authStore';
import useLikesStore from '@/stores/likesStore';
import MutualMatchModal from '@/features/likes/components/MutualMatchModal';
import api from '@/lib/api';

export default function TenantDashboard() {
  const { t } = useTranslation('matching');
  const { user } = useAuthStore();
  const { fetchStats, stats } = useLikesStore();
  const [activeTab, setActiveTab] = useState('matches');

  // Fetch likes sent by user
  const { data: likesSent, isLoading: loadingSent } = useQuery({
    queryKey: ['likes-sent'],
    queryFn: async () => {
      const response = await api.get('/likes/sent');
      return response.data;
    },
    enabled: !!user?.isProfileComplete,
  });

  // Fetch mutual matches
  const { data: mutualMatches, isLoading: loadingMatches } = useQuery({
    queryKey: ['mutual-matches'],
    queryFn: async () => {
      const response = await api.get('/likes/mutual');
      return response.data;
    },
    enabled: !!user?.isProfileComplete,
  });

  // Fetch likes received
  const { data: likesReceived, isLoading: loadingReceived } = useQuery({
    queryKey: ['likes-received'],
    queryFn: async () => {
      const response = await api.get('/likes/received');
      return response.data;
    },
    enabled: !!user?.isProfileComplete,
  });

  // Load stats on mount
  useEffect(() => {
    if (user?.isProfileComplete) {
      fetchStats();
    }
  }, [user?.isProfileComplete, fetchStats]);

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

  const sentList = likesSent?.likes || [];
  const matchesList = mutualMatches?.matches || [];
  const receivedList = likesReceived?.likes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {t('dashboard.welcome', { name: user.firstname || user.username })}
            </h1>
            <p className="text-white/80 mt-1">
              Your connections and matches
            </p>
          </div>
          <Link to="/matches">
            <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Users className="mr-2 h-4 w-4" />
              Find More Matches
            </Button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-white/10 rounded-lg">
            <div className="text-2xl font-bold">{matchesList.length}</div>
            <div className="text-sm text-white/70">Mutual Matches</div>
          </div>
          <div className="text-center p-3 bg-white/10 rounded-lg">
            <div className="text-2xl font-bold">{sentList.length}</div>
            <div className="text-sm text-white/70">People You Liked</div>
          </div>
          <div className="text-center p-3 bg-white/10 rounded-lg">
            <div className="text-2xl font-bold">{receivedList.length}</div>
            <div className="text-sm text-white/70">Likes Received</div>
          </div>
        </div>
      </div>

      {/* Tabs for Matches, Sent, Received */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            <span className="hidden sm:inline">Matches</span>
            {matchesList.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {matchesList.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4" />
            <span className="hidden sm:inline">I Liked</span>
            {sentList.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {sentList.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Liked Me</span>
            {receivedList.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-pink-100 text-pink-600">
                {receivedList.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Mutual Matches Tab */}
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-500" />
                Your Mutual Matches
              </CardTitle>
              <CardDescription>
                People you both showed interest in each other
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMatches ? (
                <LoadingState />
              ) : matchesList.length === 0 ? (
                <EmptyState
                  icon={<Handshake className="h-12 w-12" />}
                  title="No mutual matches yet"
                  description="When someone you like also likes you back, they'll appear here"
                  action={
                    <Link to="/matches">
                      <Button>Browse Matches</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {matchesList.map((match) => (
                    <MatchCard
                      key={match.matched_user_id}
                      user={match.user}
                      userId={match.matched_user_id}
                      score={match.compatibility_score}
                      showChat
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Likes Tab */}
        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-teal-500" />
                People You Liked
              </CardTitle>
              <CardDescription>
                Users you've shown interest in
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSent ? (
                <LoadingState />
              ) : sentList.length === 0 ? (
                <EmptyState
                  icon={<ThumbsUp className="h-12 w-12" />}
                  title="You haven't liked anyone yet"
                  description="Start exploring and like people you'd like to connect with"
                  action={
                    <Link to="/matches">
                      <Button>Find Matches</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sentList.map((like) => (
                    <MatchCard
                      key={like.liked_user_id}
                      user={like.user}
                      userId={like.liked_user_id}
                      score={like.compatibility_score}
                      status={like.is_mutual ? 'mutual' : 'pending'}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Received Likes Tab */}
        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                People Who Liked You
              </CardTitle>
              <CardDescription>
                Users interested in connecting with you
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReceived ? (
                <LoadingState />
              ) : receivedList.length === 0 ? (
                <EmptyState
                  icon={<Heart className="h-12 w-12" />}
                  title="No likes received yet"
                  description="Keep your profile updated to attract more interest"
                  action={
                    <Link to="/profile">
                      <Button variant="outline">Update Profile</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {receivedList.map((like) => (
                    <MatchCard
                      key={like.liker_id}
                      user={like.user}
                      userId={like.liker_id}
                      score={like.compatibility_score}
                      status={like.is_mutual ? 'mutual' : 'new'}
                      isNew={!like.is_mutual}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mutual Match Modal */}
      <MutualMatchModal />
    </div>
  );
}

function MatchCard({ user, userId, score, showChat, status, isNew }) {
  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${isNew ? 'ring-2 ring-pink-300 dark:ring-pink-700' : ''}`}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <UserAvatar
              user={user}
              size="lg"
              className="h-14 w-14"
            />
            {status === 'mutual' && (
              <div className="absolute -bottom-1 -right-1 bg-teal-500 rounded-full p-1">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            )}
            {isNew && (
              <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-1">
                <Heart className="h-3 w-3 text-white fill-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-foreground">
              {user?.firstname} {user?.lastname}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.location || 'Location not set'}
            </p>
            {score && (
              <Badge variant="outline" className="mt-1 text-xs border-teal-300 text-teal-600 dark:border-teal-700 dark:text-teal-400">
                {Math.round(score)}% compatible
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Link to={`/matches/${userId}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Profile
            </Button>
          </Link>
          {showChat && (
            <Link to={`/chat/with/${userId}`}>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
    </div>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      <div className="text-muted-foreground/50 mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
