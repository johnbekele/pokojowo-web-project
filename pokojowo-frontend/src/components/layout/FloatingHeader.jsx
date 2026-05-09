import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  MessageSquare,
  Users,
  Home,
  User,
  LogOut,
  ChevronDown,
  Globe,
  Search,
  Building2,
  Heart,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle, ThemeToggleMobile } from '@/components/ui/theme-toggle';
import UserAvatar from '@/components/shared/UserAvatar';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/lib/utils';

/**
 * Editorial concierge header.
 *
 * Floating glass bar with serif word-mark, restrained centered nav and a tidy
 * actions cluster (language, theme, notifications, account). On mobile it
 * collapses into a side drawer that reads like a contents page.
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

  const isLandlord = user?.role?.some((r) => r.toLowerCase() === 'landlord');

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
    ...(isAuthenticated ? [{ to: '/chat', label: t('nav.chat', 'Messages'), icon: MessageSquare }] : []),
  ];

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        )}
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
              {/* Logo / wordmark */}
              <Link to="/" className="group/brand flex items-center gap-3">
                <motion.div
                  className="relative"
                  whileHover={{ rotate: -2, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground shadow-[0_4px_18px_hsl(var(--surface-onyx)/0.18)]">
                    <span className="font-display text-lg font-semibold text-background">P</span>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />
                </motion.div>
                <div className="hidden sm:flex flex-col leading-none">
                  <span className="font-display text-xl font-medium tracking-editorial text-foreground">
                    Pokojowo
                  </span>
                  <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Editorial Rentals
                  </span>
                </div>
              </Link>

              {/* Center nav */}
              <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center">
                <div className="flex items-center gap-1 rounded-full border border-border/50 bg-surface-paper/70 p-1 backdrop-blur">
                  {navLinks.map((link) => {
                    const isActive = isActiveLink(link.to);
                    const Icon = link.icon;
                    return (
                      <Link key={link.to} to={link.to} className="relative">
                        <motion.div
                          className={cn(
                            'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300',
                            isActive ? 'text-background' : 'text-muted-foreground hover:text-foreground',
                          )}
                          whileTap={{ scale: 0.97 }}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="nav-active-pill"
                              className="absolute inset-0 rounded-full bg-foreground shadow-[0_4px_14px_hsl(var(--surface-onyx)/0.22)]"
                              transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                            />
                          )}
                          <Icon className="relative z-10 h-3.5 w-3.5" />
                          <span className="relative z-10 tracking-tight">{link.label}</span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Right cluster */}
              <div className="hidden lg:flex items-center gap-2">
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.button
                          className="flex items-center gap-2 rounded-full border border-border/60 bg-surface-paper/60 p-1 pl-1.5 pr-3 backdrop-blur transition-colors hover:bg-surface-paper"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <UserAvatar user={user} size="sm" />
                          <div className="hidden xl:flex flex-col items-start">
                            <span className="text-sm font-medium leading-none text-foreground">
                              {user?.firstname || user?.username}
                            </span>
                            <span className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                              {user?.role?.[0] || 'Member'}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </motion.button>
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
                          className="gap-3 cursor-pointer rounded-lg"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{t('nav.profile', 'Profile')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/favorites')}
                          className="gap-3 cursor-pointer rounded-lg"
                        >
                          <Heart className="h-4 w-4 text-muted-foreground" />
                          <span>{t('nav.favorites', 'Shortlist')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/settings')}
                          className="gap-3 cursor-pointer rounded-lg"
                        >
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span>{t('nav.settings', 'Settings')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="gap-3 cursor-pointer rounded-lg text-destructive focus:text-destructive"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>{t('nav.logout', 'Sign out')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" asChild className="rounded-full text-muted-foreground">
                      <Link to="/login">{t('nav.signIn', 'Sign in')}</Link>
                    </Button>
                    <Button variant="default" asChild className="rounded-full">
                      <Link to="/signup">
                        {t('nav.signUp', 'Join Pokojowo')}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* Mobile actions */}
              <div className="flex items-center gap-1 lg:hidden">
                {isAuthenticated && <NotificationDropdown />}
                <motion.button
                  onClick={() => setMobileNavOpen(true)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-parchment hover:text-foreground"
                  whileTap={{ scale: 0.94 }}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-[60] bg-surface-onyx/60 backdrop-blur-sm lg:hidden"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              className="fixed right-0 top-0 bottom-0 z-[60] flex w-full max-w-[340px] flex-col border-l border-border bg-surface-paper shadow-premium-lg lg:hidden"
            >
              <div className="h-[env(safe-area-inset-top)]" />

              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground">
                    <span className="font-display text-lg font-semibold text-background">P</span>
                  </div>
                  <div className="leading-none">
                    <span className="font-display text-lg font-medium text-foreground">Pokojowo</span>
                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.24em] text-muted-foreground">Editorial Rentals</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-surface-parchment"
                  whileTap={{ scale: 0.94 }}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              {isAuthenticated && user && (
                <div className="mx-5 mb-2 rounded-2xl bg-surface-parchment p-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-medium text-foreground">
                        {user.firstname} {user.lastname}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <nav className="flex-1 overflow-y-auto px-5 py-4">
                <p className="mb-3 text-eyebrow">{t('nav.contents', 'Contents')}</p>
                <div className="space-y-1">
                  {navLinks.map((link, index) => {
                    const Icon = link.icon;
                    const isActive = isActiveLink(link.to);
                    return (
                      <motion.div
                        key={link.to}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          to={link.to}
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            'flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-medium transition-colors',
                            isActive
                              ? 'bg-foreground text-background'
                              : 'text-foreground hover:bg-surface-parchment',
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            {link.label}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.24em] opacity-60">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </Link>
                      </motion.div>
                    );
                  })}

                  {isAuthenticated && (
                    <>
                      <div className="my-4 h-px bg-border/60" />
                      <Link
                        to="/profile"
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-medium transition-colors',
                          isActiveLink('/profile')
                            ? 'bg-foreground text-background'
                            : 'text-foreground hover:bg-surface-parchment',
                        )}
                      >
                        <User className="h-4 w-4" />
                        {t('nav.profile', 'Profile')}
                      </Link>
                      <Link
                        to="/favorites"
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-medium transition-colors',
                          isActiveLink('/favorites')
                            ? 'bg-foreground text-background'
                            : 'text-foreground hover:bg-surface-parchment',
                        )}
                      >
                        <Heart className="h-4 w-4" />
                        {t('nav.favorites', 'Shortlist')}
                      </Link>
                    </>
                  )}
                </div>
              </nav>

              <div className="space-y-4 border-t border-border/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-eyebrow">{t('nav.theme', 'Theme')}</span>
                  <ThemeToggleMobile />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-eyebrow">{t('nav.language', 'Language')}</span>
                  <div className="flex overflow-hidden rounded-full border border-border">
                    <button
                      onClick={() => i18n.changeLanguage('en')}
                      className={cn(
                        'px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors',
                        i18n.language === 'en'
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => i18n.changeLanguage('pl')}
                      className={cn(
                        'px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors',
                        i18n.language === 'pl'
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      PL
                    </button>
                  </div>
                </div>

                {isAuthenticated ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleLogout();
                      setMobileNavOpen(false);
                    }}
                    className="w-full justify-center gap-2 h-12 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout', 'Sign out')}
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      asChild
                      className="h-12"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Link to="/login">{t('nav.signIn', 'Sign in')}</Link>
                    </Button>
                    <Button
                      asChild
                      className="h-12"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Link to="/signup">{t('nav.signUp', 'Join')}</Link>
                    </Button>
                  </div>
                )}

                <div className="h-[env(safe-area-inset-bottom)]" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
