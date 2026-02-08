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
  LayoutDashboard,
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
import { ThemeToggle } from '@/components/ui/theme-toggle';
import UserAvatar from '@/components/shared/UserAvatar';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function FloatingHeader() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
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

  const isLandlord = user?.role?.some(r => r.toLowerCase() === 'landlord');

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    ...(isAuthenticated
      ? [
          ...(isLandlord
            ? [{ to: '/landlord/dashboard', label: 'Dashboard', icon: Building2 }]
            : [
                { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { to: '/discover', label: 'Discover', icon: Search },
                { to: '/matches', label: 'Find Flatmate', icon: Users },
              ]),
          { to: '/chat', label: 'Messages', icon: MessageSquare },
        ]
      : []),
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled
            ? "bg-background/80 backdrop-blur-2xl border-b border-border/40 shadow-sm"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex h-16 lg:h-18 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center overflow-hidden">
                  <span className="text-lg font-black text-background">P</span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
              </motion.div>
              <div className="hidden sm:flex flex-col">
                <span className="text-lg font-bold tracking-tight text-foreground leading-none">
                  Pokojowo
                </span>
                <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                  Room Rental
                </span>
              </div>
            </Link>

            {/* Desktop Navigation - Center */}
            <nav className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 backdrop-blur-sm">
                {navLinks.map((link) => {
                  const isActive = isActiveLink(link.to);
                  const Icon = link.icon;
                  return (
                    <Link key={link.to} to={link.to}>
                      <motion.div
                        className={cn(
                          "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="nav-active-bg"
                            className="absolute inset-0 bg-background rounded-full shadow-sm"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          />
                        )}
                        <Icon className={cn(
                          "h-4 w-4 relative z-10 transition-colors",
                          isActive ? "text-primary" : ""
                        )} />
                        <span className="relative z-10">{link.label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Desktop Actions - Right */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase">{i18n.language}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => i18n.changeLanguage('en')}
                    className={cn(i18n.language === 'en' && "bg-muted")}
                  >
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => i18n.changeLanguage('pl')}
                    className={cn(i18n.language === 'pl' && "bg-muted")}
                  >
                    Polski
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ThemeToggle />

              <div className="w-px h-6 bg-border mx-1" />

              {isAuthenticated ? (
                <>
                  <NotificationDropdown />

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <motion.button
                        className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-muted/60 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <UserAvatar user={user} size="sm" />
                        <div className="hidden xl:flex flex-col items-start">
                          <span className="text-sm font-medium leading-none">
                            {user?.firstname || user?.username}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {user?.role?.[0] || 'User'}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
                      <div className="p-3 bg-muted/50 -m-1 mb-1 rounded-t-lg">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{user?.firstname} {user?.lastname}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-3 cursor-pointer">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-3 cursor-pointer">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="gap-3 text-destructive cursor-pointer focus:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" asChild className="text-muted-foreground">
                    <Link to="/login">Sign in</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 lg:hidden">
              {isAuthenticated && <NotificationDropdown />}
              <motion.button
                onClick={() => setMobileNavOpen(true)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/60 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="h-6 w-6" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed right-0 top-0 bottom-0 z-[60] w-full max-w-[320px] bg-background border-l border-border shadow-2xl lg:hidden"
            >
              <div className="flex flex-col h-full">
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
                      <span className="text-base font-black text-background">P</span>
                    </div>
                    <span className="font-bold text-lg">Pokojowo</span>
                  </div>
                  <motion.button
                    onClick={() => setMobileNavOpen(false)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>

                {/* User Card */}
                {isAuthenticated && user && (
                  <div className="p-4 m-4 rounded-2xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user.firstname} {user.lastname}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-2">
                  <div className="space-y-1">
                    {navLinks.map((link, index) => {
                      const Icon = link.icon;
                      const isActive = isActiveLink(link.to);
                      return (
                        <motion.div
                          key={link.to}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link
                            to={link.to}
                            onClick={() => setMobileNavOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all",
                              isActive
                                ? "bg-foreground text-background"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                            {link.label}
                          </Link>
                        </motion.div>
                      );
                    })}

                    {isAuthenticated && (
                      <>
                        <div className="h-px bg-border my-4" />
                        <Link
                          to="/profile"
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all",
                            isActiveLink('/profile')
                              ? "bg-foreground text-background"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <User className="h-5 w-5" />
                          Profile
                        </Link>
                      </>
                    )}
                  </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-border space-y-4">
                  {/* Theme & Language */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                      <span className="text-sm text-muted-foreground">Theme</span>
                    </div>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button
                        onClick={() => i18n.changeLanguage('en')}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold transition-colors",
                          i18n.language === 'en'
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => i18n.changeLanguage('pl')}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold transition-colors",
                          i18n.language === 'pl'
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        PL
                      </button>
                    </div>
                  </div>

                  {/* Auth Actions */}
                  {isAuthenticated ? (
                    <Button
                      variant="outline"
                      onClick={() => { handleLogout(); setMobileNavOpen(false); }}
                      className="w-full justify-center gap-2 h-12 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        asChild
                        className="h-12"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <Link to="/login">Sign in</Link>
                      </Button>
                      <Button
                        asChild
                        className="h-12"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <Link to="/signup">Get Started</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
