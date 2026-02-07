import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Users, MessageSquare, User, Building2 } from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function BottomNavigation() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  // Don't show bottom nav if not authenticated
  if (!isAuthenticated) return null;

  const isLandlord = user?.role?.includes('landlord');

  const isActiveLink = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Define navigation items based on user role
  const navItems = isLandlord
    ? [
        { to: '/', label: t('nav.home'), icon: Home },
        { to: '/landlord/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: Building2 },
        { to: '/chat', label: t('nav.chat'), icon: MessageSquare },
        { to: '/profile', label: t('nav.profile'), icon: User },
      ]
    : [
        { to: '/', label: t('nav.home'), icon: Home },
        { to: '/matches', label: t('nav.matches'), icon: Users },
        { to: '/chat', label: t('nav.chat'), icon: MessageSquare },
        { to: '/profile', label: t('nav.profile'), icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveLink(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors touch-target",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-6 w-6 transition-transform",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium truncate max-w-[64px]",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
