import { Heart, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function FloatingHeaderMobileLinks({
  navLinks,
  isAuthenticated,
  isActiveLink,
  onNavigate,
  t,
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-5 py-4">
      <p className="mb-3 text-eyebrow">{t('nav.contents', 'Contents')}</p>
      <div className="space-y-1">
        {navLinks.map((link, index) => {
          const Icon = link.icon;
          const isActive = isActiveLink(link.to);
          return (
            <Motion.div
              key={link.to}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={link.to}
                onClick={onNavigate}
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
            </Motion.div>
          );
        })}

        {isAuthenticated && (
          <>
            <div className="my-4 h-px bg-border/60" />
            <Link
              to="/profile"
              onClick={onNavigate}
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
              onClick={onNavigate}
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
  );
}
