import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import {
  Building2,
  Heart,
  Home,
  MessageSquare,
  Search,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useAuthStore from '@/stores/authStore';
import FloatingHeaderActions from './FloatingHeaderActions';
import FloatingHeaderBrand from './FloatingHeaderBrand';
import FloatingHeaderMobileDrawer, {
  FloatingHeaderMobileActions,
} from './FloatingHeaderMobileDrawer';
import FloatingHeaderNav from './FloatingHeaderNav';

/**
 * Editorial concierge header.
 *
 * The responsive navigation, account actions, and mobile drawer live in
 * focused components so this shell only owns shared route/auth state.
 */
export default function FloatingHeader() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActiveLink = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isLandlord = user?.role?.some((role) => role.toLowerCase() === 'landlord');
  const navLinks = [
    { to: '/', label: t('nav.home', 'Home'), icon: Home },
    ...(isAuthenticated
      ? isLandlord
        ? [{ to: '/landlord/dashboard', label: t('nav.studio', 'Studio'), icon: Building2 }]
        : [
            { to: '/discover', label: t('nav.discover', 'Discover'), icon: Search },
            { to: '/matches', label: t('nav.matches', 'Flatmates'), icon: Users },
            { to: '/likes', label: t('nav.likes', 'Likes'), icon: Heart },
          ]
      : [{ to: '/discover', label: t('nav.discover', 'Discover'), icon: Search }]),
    ...(isAuthenticated
      ? [{ to: '/chat', label: t('nav.chat', 'Messages'), icon: MessageSquare }]
      : []),
  ];

  return (
    <>
      <Motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-500')}
      >
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-3 sm:px-6 lg:px-10">
          <div
            className={cn(
              'mx-auto w-full max-w-7xl rounded-full border border-transparent transition-all duration-500',
              isScrolled
                ? 'mt-2 lg:mt-3 glass-strong border-border/60 shadow-premium'
                : 'mt-3 lg:mt-5 bg-transparent',
            )}
          >
            <div className="flex h-14 items-center justify-between gap-4 px-4 lg:h-16 lg:px-6">
              <FloatingHeaderBrand />
              <FloatingHeaderNav navLinks={navLinks} isActiveLink={isActiveLink} />
              <FloatingHeaderActions
                isAuthenticated={isAuthenticated}
                user={user}
                i18n={i18n}
                t={t}
                onLogout={handleLogout}
              />
              <FloatingHeaderMobileActions
                isAuthenticated={isAuthenticated}
                onOpen={() => setMobileNavOpen(true)}
              />
            </div>
          </div>
        </div>
      </Motion.header>

      <FloatingHeaderMobileDrawer
        open={mobileNavOpen}
        isAuthenticated={isAuthenticated}
        user={user}
        navLinks={navLinks}
        isActiveLink={isActiveLink}
        i18n={i18n}
        t={t}
        onClose={() => setMobileNavOpen(false)}
        onLogout={handleLogout}
      />
    </>
  );
}
