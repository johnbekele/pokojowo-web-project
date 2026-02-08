import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageSquare, MapPin, Check, X, Minus, UserPlus, UserCheck, Loader2, Handshake, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import UserAvatar from '@/components/shared/UserAvatar';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import useLikesStore from '@/stores/likesStore';

export default function MatchDetail() {
  const { userId } = useParams();
  const { t } = useTranslation('matching');
  const navigate = useNavigate();
  const { hasLiked, isMutualMatch, likeUser, unlikeUser } = useLikesStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['match', userId],
    queryFn: async () => {
      const response = await api.get(`/matching/user/${userId}`);
      return response.data;
    },
  });

  // Check like status
  const { data: likeStatus } = useQuery({
    queryKey: ['like-status', userId],
    queryFn: async () => {
      const response = await api.get(`/likes/check/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });

  const isLiked = likeStatus?.i_liked || hasLiked(userId);
  const isMutual = likeStatus?.is_mutual || isMutualMatch(userId);
  const theyLikedMe = likeStatus?.they_liked;

  const [isLiking, setIsLiking] = React.useState(false);

  const handleLike = async () => {
    setIsLiking(true);
    try {
      if (isLiked) {
        await unlikeUser(userId);
      } else {
        await likeUser(userId);
      }
    } finally {
      setIsLiking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">Match Not Found</CardTitle>
          <CardDescription>
            This user may not be available for matching.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/matches">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Matches
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // API returns flat structure - extract fields
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
    score_breakdown,
    explanations: rawExplanations,
    shared_interests,
    shared_languages,
    compatible,
  } = data;

  // Build user object for components that expect it
  const user = {
    _id: user_id,
    username,
    firstname,
    lastname,
    photo,
    age,
    bio,
    location,
    languages,
  };

  const score = Math.round(compatibility_score || 0);
  const breakdown = score_breakdown;

  // Group explanations by impact
  const explanations = {
    positive: rawExplanations?.filter(e => e.impact === 'positive').map(e => e.reason) || [],
    neutral: rawExplanations?.filter(e => e.impact === 'neutral').map(e => e.reason) || [],
    negative: rawExplanations?.filter(e => e.impact === 'negative').map(e => e.reason) || [],
  };

  const sharedInterests = shared_interests || [];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    return 'text-yellow-600';
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/matches" className="inline-flex items-center text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to matches
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <UserAvatar user={user} size="xl" />
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold">
                    {user.firstname} {user.lastname}
                  </h1>
                  <p className="text-muted-foreground">@{user.username}</p>

                  <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {user.isVerified && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Verified
                      </Badge>
                    )}
                    {user.age && (
                      <Badge variant="secondary">{user.age} years old</Badge>
                    )}
                    {user.location && (
                      <Badge variant="secondary">
                        <MapPin className="mr-1 h-3 w-3" />
                        {user.location}
                      </Badge>
                    )}
                  </div>

                  {user.languages?.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1 sm:justify-start">
                      {user.languages.map((lang) => (
                        <Badge key={lang} variant="outline">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {/* Match Status Badge */}
                  {isMutual && (
                    <Badge className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0 justify-center">
                      <Handshake className="mr-1 h-3 w-3" />
                      Connected!
                    </Badge>
                  )}
                  {theyLikedMe && !isMutual && (
                    <Badge variant="secondary" className="justify-center bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800">
                      <ThumbsUp className="mr-1 h-3 w-3" />
                      Interested in you!
                    </Badge>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={isLiked ? "default" : "outline"}
                      onClick={handleLike}
                      disabled={isLiking}
                      className={cn(
                        isLiked && "bg-teal-500 hover:bg-teal-600 text-white"
                      )}
                    >
                      {isLiking ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isLiked ? (
                        <UserCheck className="mr-2 h-4 w-4" />
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      {isLiked ? 'Interested' : 'Show Interest'}
                    </Button>
                    <Link to={`/chat/with/${user_id}`}>
                      <Button>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          {user.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{user.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Why This Match */}
          {explanations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('detail.whyMatch')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {explanations.positive?.length > 0 && (
                  <div className="space-y-2">
                    {explanations.positive.map((exp, i) => (
                      <div key={i} className="flex items-start gap-2 text-green-600">
                        <Check className="h-5 w-5 mt-0.5 shrink-0" />
                        <span>{exp}</span>
                      </div>
                    ))}
                  </div>
                )}
                {explanations.neutral?.length > 0 && (
                  <div className="space-y-2">
                    {explanations.neutral.map((exp, i) => (
                      <div key={i} className="flex items-start gap-2 text-muted-foreground">
                        <Minus className="h-5 w-5 mt-0.5 shrink-0" />
                        <span>{exp}</span>
                      </div>
                    ))}
                  </div>
                )}
                {explanations.negative?.length > 0 && (
                  <div className="space-y-2">
                    {explanations.negative.map((exp, i) => (
                      <div key={i} className="flex items-start gap-2 text-yellow-600">
                        <X className="h-5 w-5 mt-0.5 shrink-0" />
                        <span>{exp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shared Interests */}
          {sharedInterests?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('detail.sharedInterests')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {sharedInterests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Compatibility Score */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">{t('detail.compatibility')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className={cn('text-5xl font-bold', getScoreColor(score))}>
                  {score}%
                </div>
                <p className="text-muted-foreground mt-1">Overall Match</p>
              </div>

              <Separator />

              {/* Breakdown */}
              {breakdown && (
                <div className="space-y-4">
                  {Object.entries(breakdown).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{Math.round(value)}%</span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
