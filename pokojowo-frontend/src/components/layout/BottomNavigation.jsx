import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Home, MessageSquare, User, Building2, Users, Heart } from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/lib/utils';

/**
 * Editorial bottom navigation for mobile.
 * Floating, glass surface that sits inside the safe area, with a subtle ink
 * indicator under the active item rather than the usual primary color block.
 */
export default function BottomNavigation() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return null;

  const isLandlord = user?.role?.some((r) => r.toLowerCase() === 'landlord');

  const isActiveLink = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = isLandlord
    ? [
        { to: '/', label: t('nav.home', 'Home'), icon: Home },
        { to: '/landlord/dashboard', label: t('nav.studio', 'Studio'), icon: Building2 },
        { to: '/chat', label: t('nav.chat', 'Messages'), icon: MessageSquare },
        { to: '/profile', label: t('nav.profile', 'Profile'), icon: User },
      ]
    : [
        { to: '/', label: t('nav.home', 'Home'), icon: Home },
        { to: '/matches', label: t('nav.matches', 'Flatmates'), icon: Users },
        { to: '/likes', label: t('nav.likes', 'Likes'), icon: Heart },
        { to: '/chat', label: t('nav.chat', 'Messages'), icon: MessageSquare },
        { to: '/profile', label: t('nav.profile', 'Profile'), icon: User },
      ];

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 lg:hidden"
    >
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-border/70 bg-surface-paper/85 backdrop-blur-xl shadow-premium-lg">
        <div className="flex items-stretch justify-around px-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveLink(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'group/nav relative flex flex-1 flex-col items-center justify-center py-2.5 min-h-[60px] touch-manipulation select-none',
                )}
              >
                <motion.div
                  className="relative flex flex-col items-center gap-1"
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 24 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-pill"
                      className="absolute -inset-x-3 -inset-y-1 rounded-2xl bg-foreground"
                      transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                    />
                  )}

                  <Icon
                    className={cn(
                      'relative z-10 h-[18px] w-[18px] transition-colors duration-300',
                      isActive ? 'text-background' : 'text-muted-foreground group-hover/nav:text-foreground',
                    )}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span
                    className={cn(
                      'relative z-10 text-[10px] font-medium tracking-[0.12em] uppercase transition-colors duration-300',
                      isActive ? 'text-background' : 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </motion.nav>
  );
}
