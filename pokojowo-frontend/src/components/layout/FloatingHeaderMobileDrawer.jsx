import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import UserAvatar from '@/components/shared/UserAvatar';
import NotificationDropdown from '@/components/shared/NotificationDropdown';
import FloatingHeaderBrand from './FloatingHeaderBrand';
import FloatingHeaderMobileFooter from './FloatingHeaderMobileFooter';
import FloatingHeaderMobileLinks from './FloatingHeaderMobileLinks';

export function FloatingHeaderMobileActions({ isAuthenticated, onOpen }) {
  return (
    <div className="flex items-center gap-1 lg:hidden">
      {isAuthenticated && <NotificationDropdown />}
      <Motion.button
        onClick={onOpen}
        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-parchment hover:text-foreground"
        whileTap={{ scale: 0.94 }}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Motion.button>
    </div>
  );
}

export default function FloatingHeaderMobileDrawer({
  open,
  isAuthenticated,
  user,
  navLinks,
  isActiveLink,
  i18n,
  t,
  onClose,
  onLogout,
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-surface-onyx/60 backdrop-blur-sm lg:hidden"
          />
          <Motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="fixed bottom-0 right-0 top-0 z-[60] flex w-full max-w-[340px] flex-col border-l border-border bg-surface-paper shadow-premium-lg lg:hidden"
          >
            <div className="h-[env(safe-area-inset-top)]" />
            <div className="flex items-center justify-between px-5 py-4">
              <FloatingHeaderBrand compact />
              <Motion.button
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-surface-parchment hover:text-foreground"
                whileTap={{ scale: 0.94 }}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Motion.button>
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

            <FloatingHeaderMobileLinks
              navLinks={navLinks}
              isAuthenticated={isAuthenticated}
              isActiveLink={isActiveLink}
              onNavigate={onClose}
              t={t}
            />
            <FloatingHeaderMobileFooter
              isAuthenticated={isAuthenticated}
              i18n={i18n}
              t={t}
              onLogout={onLogout}
              onNavigate={onClose}
            />
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
