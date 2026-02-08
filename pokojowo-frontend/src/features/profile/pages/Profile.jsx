import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Edit, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import UserAvatar from '@/components/shared/UserAvatar';
import useAuthStore from '@/stores/authStore';
import { formatDate } from '@/lib/utils';

export default function Profile() {
  const { t } = useTranslation('profile');
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  const isTenant = user.role?.some(r => r.toLowerCase() === 'tenant');
  const completionPercentage = user.profileCompletionStep || user.profile_completion_step || 0;
  const isComplete = user.isProfileComplete || user.is_profile_complete;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
            <UserAvatar user={user} size="xl" />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold">
                {user.firstname} {user.lastname}
              </h1>
              <p className="text-muted-foreground">@{user.username}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
                {user.role?.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
                {user.isVerified && (
                  <Badge variant="outline" className="text-success border-success">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            <Link to={isTenant ? '/profile-completion/tenant' : '/profile-completion/landlord'}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion */}
      {!isComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complete Your Profile</CardTitle>
            <CardDescription>
              Complete your profile to get better matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} />
            </div>
            <Link to={isTenant ? '/profile-completion/tenant' : '/profile-completion/landlord'}>
              <Button className="mt-4 w-full">Continue Setup</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('contact.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{user.location}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('basicInfo.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.age && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('basicInfo.age')}</span>
                <span>{user.age} years</span>
              </div>
            )}
            {user.gender && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('basicInfo.gender')}</span>
                <span className="capitalize">{user.gender}</span>
              </div>
            )}
            {user.languages?.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('languages.title')}</span>
                <span>{user.languages.join(', ')}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Joined {formatDate(user.createdAt || user.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bio */}
      {user.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('basicInfo.bio')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{user.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Tenant Profile */}
      {isTenant && user.tenantProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tenant Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.tenantProfile.preferences && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  {user.tenantProfile.preferences.budget && (
                    <div>
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="font-medium">
                        {user.tenantProfile.preferences.budget.min} - {user.tenantProfile.preferences.budget.max} PLN
                      </p>
                    </div>
                  )}
                  {user.tenantProfile.preferences.location && (
                    <div>
                      <p className="text-sm text-muted-foreground">Preferred Location</p>
                      <p className="font-medium">{user.tenantProfile.preferences.location}</p>
                    </div>
                  )}
                </div>
              </>
            )}
            {user.tenantProfile.flatmateTraits && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-3">
                  {user.tenantProfile.flatmateTraits.cleanliness && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cleanliness</p>
                      <p className="font-medium capitalize">
                        {user.tenantProfile.flatmateTraits.cleanliness.replace('_', ' ')}
                      </p>
                    </div>
                  )}
                  {user.tenantProfile.flatmateTraits.socialLevel && (
                    <div>
                      <p className="text-sm text-muted-foreground">Social Level</p>
                      <p className="font-medium capitalize">
                        {user.tenantProfile.flatmateTraits.socialLevel.replace('_', ' ')}
                      </p>
                    </div>
                  )}
                  {user.tenantProfile.flatmateTraits.guestsFrequency && (
                    <div>
                      <p className="text-sm text-muted-foreground">Guests</p>
                      <p className="font-medium capitalize">
                        {user.tenantProfile.flatmateTraits.guestsFrequency}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
