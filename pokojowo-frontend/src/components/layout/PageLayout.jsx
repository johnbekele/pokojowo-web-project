import { Outlet, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingHeader from './FloatingHeader';
import BottomNavigation from './BottomNavigation';
import MutualMatchModal from '@/features/likes/components/MutualMatchModal';

/**
 * Global app shell with the editorial luxury frame.
 *
 * - Persistent floating header
 * - Generous content gutter (still capped at max-w-7xl)
 * - Slow editorial fade/slide route transitions
 * - Magazine-style desktop footer with eyebrow, paths and quiet trust line
 * - Mobile bottom nav for authenticated users
 */
export default function PageLayout() {
  const location = useLocation();
  const { t } = useTranslation('common');
  const year = new Date().getFullYear();

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Subtle editorial paper texture under the whole app */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-grain opacity-[0.35]"
      />

      <FloatingHeader />

      <main className="flex-1 pt-20 pb-28 lg:pt-28 lg:pb-12">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <MutualMatchModal />

      <footer className="hidden lg:block border-t border-border/70 bg-surface-paper mt-auto">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12 py-14">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] items-start">
            <div className="space-y-5">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground">
                    <span className="font-display text-xl font-semibold text-background">P</span>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface-paper" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-display text-2xl font-medium tracking-tight text-foreground">
                    Pokojowo
                  </span>
                  <span className="mt-1 text-eyebrow">Editorial Rentals</span>
                </div>
              </Link>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {t(
                  'footer.tagline',
                  'A curated way to find rooms, flatmates, and homes that actually fit how you live.',
                )}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-eyebrow">Est. 2024</span>
                <span className="h-px w-8 bg-border" />
                <span className="text-eyebrow">Warsaw · Krakow · Wroclaw</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-eyebrow">{t('footer.discover', 'Discover')}</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-foreground/80 hover:text-foreground">{t('nav.home', 'Home')}</Link></li>
                <li><Link to="/discover" className="text-foreground/80 hover:text-foreground">{t('nav.discover', 'Browse rooms')}</Link></li>
                <li><Link to="/matches" className="text-foreground/80 hover:text-foreground">{t('nav.matches', 'Find a flatmate')}</Link></li>
                <li><Link to="/favorites" className="text-foreground/80 hover:text-foreground">{t('nav.favorites', 'Shortlist')}</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-eyebrow">{t('footer.studio', 'Studio')}</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/landlord/dashboard" className="text-foreground/80 hover:text-foreground">{t('nav.dashboard', 'Hosts')}</Link></li>
                <li><Link to="/profile" className="text-foreground/80 hover:text-foreground">{t('nav.profile', 'Account')}</Link></li>
                <li><Link to="/chat" className="text-foreground/80 hover:text-foreground">{t('nav.chat', 'Messages')}</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 md:flex-row md:items-center">
            <p className="text-xs tracking-wide text-muted-foreground">
              © {year} Pokojowo. {t('footer.rights', 'Crafted with care for considered renting.')}
            </p>
            <p className="text-eyebrow">Vol. {year} · No. 01</p>
          </div>
        </div>
      </footer>

      <BottomNavigation />
    </div>
  );
}
