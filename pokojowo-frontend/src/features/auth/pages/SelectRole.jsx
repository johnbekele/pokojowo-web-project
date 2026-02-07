import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Users, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function SelectRole() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { updateRole, isLoading, user } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    const result = await updateRole(role);
    if (result.success) {
      navigate(`/profile-completion/${role}`, { replace: true });
    }
  };

  const handleSkip = () => {
    setShowSkipDialog(true);
  };

  const confirmSkip = () => {
    navigate('/', { replace: true });
  };

  const roles = [
    {
      id: 'tenant',
      title: t('selectRole.tenant.title'),
      description: t('selectRole.tenant.description'),
      icon: Users,
      color: 'bg-primary/5 border-primary/20 hover:border-primary/40 dark:bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      id: 'landlord',
      title: t('selectRole.landlord.title'),
      description: t('selectRole.landlord.description'),
      icon: Home,
      color: 'bg-success/5 border-success/20 hover:border-success/40 dark:bg-success/10',
      iconColor: 'text-success',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 transition-colors duration-200">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">{t('selectRole.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('selectRole.subtitle')}</p>
          {user?.firstname && (
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome, {user.firstname}!
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <Card
                key={role.id}
                className={cn(
                  'cursor-pointer border-2 transition-all',
                  role.color,
                  isSelected && 'ring-2 ring-primary ring-offset-2'
                )}
                onClick={() => !isLoading && handleSelectRole(role.id)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-card shadow-sm">
                    <Icon className={cn('h-8 w-8', role.iconColor)} />
                  </div>
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    className="w-full"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole(role.id);
                    }}
                  >
                    {isLoading && isSelected ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Selecting...
                      </>
                    ) : (
                      'Select'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
            Skip for now
          </Button>
        </div>
      </div>

      {/* Skip Warning Dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <DialogTitle className="text-center">
              {t('selectRole.skipWarning.title')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('selectRole.skipWarning.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
              {t('selectRole.skipWarning.goBack')}
            </Button>
            <Button variant="destructive" onClick={confirmSkip}>
              {t('selectRole.skipWarning.continueSkip')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
