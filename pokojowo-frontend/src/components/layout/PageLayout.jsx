import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingHeader from './FloatingHeader';
import BottomNavigation from './BottomNavigation';
import MutualMatchModal from '@/features/likes/components/MutualMatchModal';

export default function PageLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FloatingHeader />

      {/* Main content with responsive padding */}
      {/* Mobile: pt-16 (header) + pb-24 (bottom nav ~60px + safe area + buffer) */}
      {/* Desktop: pt-20 (larger header) + pb-8 (footer only) */}
      <main className="flex-1 pt-16 pb-24 lg:pt-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <MutualMatchModal />

      {/* Desktop footer only */}
      <footer className="hidden lg:block border-t border-border bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                <span className="text-xs font-bold text-background">P</span>
              </div>
              <span className="font-semibold">Pokojowo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Pokojowo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      <BottomNavigation />
    </div>
  );
}
