import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Home, MessageSquare, User, Building2, Users } from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function BottomNavigation() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return null;

  const isLandlord = user?.role?.some(r => r.toLowerCase() === 'landlord');

  const isActiveLink = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = isLandlord
    ? [
        { to: '/', label: t('nav.home'), icon: Home },
        { to: '/landlord/dashboard', label: 'Dashboard', icon: Building2 },
        { to: '/chat', label: t('nav.chat'), icon: MessageSquare },
        { to: '/profile', label: t('nav.profile'), icon: User },
      ]
    : [
        { to: '/', label: t('nav.home'), icon: Home },
        { to: '/matches', label: 'Flatmates', icon: Users },
        { to: '/chat', label: t('nav.chat'), icon: MessageSquare },
        { to: '/profile', label: t('nav.profile'), icon: User },
      ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
    >
      {/* Glass effect background */}
      <div className="bg-background/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        {/* Navigation items */}
        <div className="flex items-stretch justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveLink(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 py-2 min-h-[60px]",
                  "active:bg-muted/50 transition-colors",
                  "touch-manipulation select-none"
                )}
              >
                <motion.div
                  className="relative flex flex-col items-center gap-0.5"
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}

                  {/* Icon with background for active state */}
                  <div className={cn(
                    "relative p-1.5 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/10"
                  )}>
                    <Icon
                      className={cn(
                        "h-6 w-6 transition-all duration-200",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                      strokeWidth={isActive ? 2.5 : 1.75}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-all duration-200",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Safe area spacer for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </motion.nav>
  );
}
