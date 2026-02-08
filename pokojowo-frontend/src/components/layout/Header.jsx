import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Bell,
  Building2,
  Heart,
  Bookmark,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import UserAvatar from '@/components/shared/UserAvatar';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import useAuthStore from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function Header() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'pl' : 'en';
    i18n.changeLanguage(newLang);
  };

  const isActiveLink = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isLandlord = user?.role?.some(r => r.toLowerCase() === 'landlord');
  const isTenant = user?.role?.some(r => ['tenant', 'user'].includes(r.toLowerCase()));

  const navLinks = [
    { to: '/', label: t('nav.home'), icon: Home },
    ...(isAuthenticated
      ? [
          ...(isLandlord
            ? [{ to: '/landlord/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: Building2 }]
            : [
                { to: '/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
                { to: '/matches', label: t('nav.matches'), icon: Users },
                { to: '/likes', label: t('nav.likes', 'Likes'), icon: Heart },
                { to: '/favorites', label: t('nav.favorites', 'Saved'), icon: Bookmark },
              ]),
          { to: '/chat', label: t('nav.chat'), icon: MessageSquare },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border shadow-sm transition-colors duration-200">
      <div className="container mx-auto px-4">
        <div className="flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground font-bold text-lg shadow-sm group-hover:shadow-md transition-shadow">
              P
            </div>
            <span className="text-xl font-bold text-primary">
              Pokojowo
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isActiveLink(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{i18n.language}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem
                  onClick={() => i18n.changeLanguage('en')}
                  className={cn(i18n.language === 'en' && "bg-primary/10 text-primary")}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => i18n.changeLanguage('pl')}
                  className={cn(i18n.language === 'pl' && "bg-primary/10 text-primary")}
                >
                  Polski
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <NotificationDropdown />

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-accent"
                    >
                      <UserAvatar user={user} size="sm" />
                      <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                        {user?.firstname || user?.username}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end" sideOffset={8}>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-t-lg">
                      <UserAvatar user={user} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {user?.firstname} {user?.lastname}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="p-1">
                      <DropdownMenuItem
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-2 py-2.5 cursor-pointer"
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{t('nav.profile')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="flex items-center gap-2 py-2.5 text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t('nav.logout')}</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  asChild
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link to="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">{t('nav.signup')}</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold">
                    P
                  </div>
                  <span className="font-bold text-foreground">Pokojowo</span>
                </SheetTitle>
              </SheetHeader>

              {/* User Info (if authenticated) */}
              {isAuthenticated && user && (
                <div className="p-4 bg-muted border-b border-border">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {user.firstname} {user.lastname}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Links - Secondary items only (primary nav is in bottom bar) */}
              <nav className="p-4 space-y-1">
                {isAuthenticated ? (
                  <>
                    {/* Quick links to less frequent pages */}
                    {isTenant && (
                      <>
                        <Link
                          to="/likes"
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[48px]",
                            isActiveLink('/likes')
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-accent"
                          )}
                        >
                          <Heart className="h-5 w-5" />
                          {t('nav.likes', 'Likes')}
                        </Link>
                        <Link
                          to="/favorites"
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[48px]",
                            isActiveLink('/favorites')
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-accent"
                          )}
                        >
                          <Bookmark className="h-5 w-5" />
                          {t('nav.favorites', 'Saved')}
                        </Link>
                      </>
                    )}
                    <div className="h-px bg-border my-3" />
                    <Link
                      to="/profile"
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[48px]",
                        isActiveLink('/profile')
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      <User className="h-5 w-5" />
                      {t('nav.profile')}
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/"
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[48px]",
                      isActiveLink('/')
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <Home className="h-5 w-5" />
                    {t('nav.home')}
                  </Link>
                )}
              </nav>

              {/* Bottom Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background space-y-3">
                {/* Theme & Language Toggle */}
                <div className="flex items-center justify-between px-2">
                  <ThemeToggle />
                  <div className="flex gap-1">
                    <Button
                      variant={i18n.language === 'en' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => i18n.changeLanguage('en')}
                      className="text-xs px-3"
                    >
                      EN
                    </Button>
                    <Button
                      variant={i18n.language === 'pl' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => i18n.changeLanguage('pl')}
                      className="text-xs px-3"
                    >
                      PL
                    </Button>
                  </div>
                </div>

                {isAuthenticated ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleLogout();
                      setMobileNavOpen(false);
                    }}
                    className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('nav.logout')}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      asChild
                      className="flex-1"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Link to="/login">{t('nav.login')}</Link>
                    </Button>
                    <Button
                      asChild
                      className="flex-1"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Link to="/signup">{t('nav.signup')}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
