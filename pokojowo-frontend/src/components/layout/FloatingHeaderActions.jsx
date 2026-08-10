import { Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import FloatingHeaderAccountMenu from './FloatingHeaderAccountMenu';
import { cn } from '@/lib/utils';

export default function FloatingHeaderActions({
  isAuthenticated,
  user,
  i18n,
  t,
  onLogout,
}) {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3 text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              {i18n.language?.split('-')[0] || 'en'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={() => i18n.changeLanguage('en')}
            className={cn(i18n.language === 'en' && 'bg-muted')}
          >
            English
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => i18n.changeLanguage('pl')}
            className={cn(i18n.language === 'pl' && 'bg-muted')}
          >
            Polski
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />
      <span className="mx-1 h-5 w-px bg-border" />

      {isAuthenticated ? (
        <>
          <NotificationDropdown />
          <FloatingHeaderAccountMenu user={user} t={t} onLogout={onLogout} />
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="rounded-full text-muted-foreground">
            <Link to="/login">{t('nav.signIn', 'Sign in')}</Link>
          </Button>
          <Button variant="default" asChild className="rounded-full">
            <Link to="/signup">{t('nav.signUp', 'Join Pokojowo')}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
