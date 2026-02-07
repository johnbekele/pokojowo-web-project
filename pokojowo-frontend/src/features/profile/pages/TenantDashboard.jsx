import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, MapPin, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import UserAvatar from '@/components/shared/UserAvatar';
import api from '@/lib/api';

export default function TenantDashboard() {
  const { username } = useParams();
  const { t } = useTranslation('profile');

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['tenant', username],
    queryFn: async () => {
      const response = await api.get(`/users/username/${username}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>User Not Found</CardTitle>
          <CardDescription>
            The user you're looking for doesn't exist or their profile is private.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            <UserAvatar user={user} size="xl" />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold">
                {user.firstname} {user.lastname}
              </h1>
              <p className="text-muted-foreground">@{user.username}</p>

              <div className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
                {user.isVerified && (
                  <Badge variant="outline" className="text-success border-success">
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
                <div className="mt-3 flex flex-wrap justify-center gap-1 md:justify-start">
                  {user.languages.map((lang) => (
                    <Badge key={lang} variant="outline">
                      {lang}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button>
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      {user.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About Me</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{user.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Tenant Profile Details */}
      {user.tenantProfile && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Preferences */}
          {user.tenantProfile.preferences && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.tenantProfile.preferences.budget && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium">
                      {user.tenantProfile.preferences.budget.min} - {user.tenantProfile.preferences.budget.max} PLN
                    </span>
                  </div>
                )}
                {user.tenantProfile.preferences.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preferred Area</span>
                    <span className="font-medium">{user.tenantProfile.preferences.location}</span>
                  </div>
                )}
                {user.tenantProfile.preferences.leaseDurationMonths && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lease Duration</span>
                    <span className="font-medium">
                      {user.tenantProfile.preferences.leaseDurationMonths} months
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lifestyle */}
          {user.tenantProfile.flatmateTraits && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lifestyle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.tenantProfile.flatmateTraits.cleanliness && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cleanliness</span>
                    <Badge variant="secondary" className="capitalize">
                      {user.tenantProfile.flatmateTraits.cleanliness.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
                {user.tenantProfile.flatmateTraits.socialLevel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Social Level</span>
                    <Badge variant="secondary" className="capitalize">
                      {user.tenantProfile.flatmateTraits.socialLevel.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
                {user.tenantProfile.flatmateTraits.guestsFrequency && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guests</span>
                    <Badge variant="secondary" className="capitalize">
                      {user.tenantProfile.flatmateTraits.guestsFrequency}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Interests */}
      {user.tenantProfile?.interests?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.tenantProfile.interests.map((interest) => (
                <Badge key={interest} variant="outline">
                  {interest}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
