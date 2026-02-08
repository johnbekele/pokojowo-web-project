import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useAuthStore from '@/stores/authStore';

export default function Welcome() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const isTenant = user?.role?.some(r => r.toLowerCase() === 'tenant');
  const profilePath = isTenant ? '/profile-completion/tenant' : '/profile-completion/landlord';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 transition-colors duration-200">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-2xl">
            Welcome to Pokojowo, {user?.firstname || user?.username}!
          </CardTitle>
          <CardDescription>
            Your account has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            {isTenant
              ? "Let's complete your profile to help you find the perfect flatmate and room."
              : "Let's complete your profile to start listing your properties."}
          </p>

          <div className="flex flex-col gap-3">
            <Link to={profilePath}>
              <Button className="w-full">
                Complete Your Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" className="w-full">
                Skip for now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
