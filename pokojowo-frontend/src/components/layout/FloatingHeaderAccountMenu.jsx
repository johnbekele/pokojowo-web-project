import {
  ChevronDown,
  Heart,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserAvatar from '@/components/shared/UserAvatar';

export default function FloatingHeaderAccountMenu({ user, t, onLogout }) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Motion.button
          className="flex items-center gap-2 rounded-full border border-border/60 bg-surface-paper/60 p-1 pl-1.5 pr-3 backdrop-blur transition-colors hover:bg-surface-paper"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <UserAvatar user={user} size="sm" />
          <div className="hidden flex-col items-start xl:flex">
            <span className="text-sm font-medium leading-none text-foreground">
              {user?.firstname || user?.username}
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {user?.role?.[0] || 'Member'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-2" align="end" sideOffset={8}>
        <div className="rounded-xl bg-surface-parchment p-3">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-medium text-foreground">
                {user?.firstname} {user?.lastname}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
        <div className="my-2 h-px bg-border/60" />
        <DropdownMenuItem
          onClick={() => navigate('/profile')}
          className="cursor-pointer gap-3 rounded-lg"
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{t('nav.profile', 'Profile')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/favorites')}
          className="cursor-pointer gap-3 rounded-lg"
        >
          <Heart className="h-4 w-4 text-muted-foreground" />
          <span>{t('nav.favorites', 'Shortlist')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings')}
          className="cursor-pointer gap-3 rounded-lg"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span>{t('nav.settings', 'Settings')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer gap-3 rounded-lg text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('nav.logout', 'Sign out')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
