import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Home, Search, MessageSquare, User, Building2, Users } from 'lucide-react';
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
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pb-safe"
    >
      <div className="mx-4 mb-4">
        <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-premium-lg">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveLink(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="relative flex flex-col items-center justify-center flex-1 h-full py-2 touch-target"
                >
                  <motion.div
                    className="relative flex flex-col items-center"
                    whileTap={{ scale: 0.9 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="bottom-nav-indicator"
                        className="absolute -inset-2 bg-primary/10 rounded-xl"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={cn(
                        "h-5 w-5 relative z-10 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span
                      className={cn(
                        "text-[10px] mt-1 font-medium relative z-10 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
