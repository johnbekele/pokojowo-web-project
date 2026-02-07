import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import MutualMatchModal from '@/features/likes/components/MutualMatchModal';

export default function PageLayout() {
  return (
    <div className="min-h-screen-safe bg-background transition-colors duration-200 flex flex-col">
      <Header />
      {/* Main content with bottom padding for mobile nav */}
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl flex-1 pb-20 md:pb-8">
        <Outlet />
      </main>
      {/* Global mutual match modal for real-time notifications */}
      <MutualMatchModal />
      {/* Footer - hidden on mobile for app-like feel */}
      <footer className="hidden md:block border-t border-border bg-card mt-auto transition-colors duration-200">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                P
              </div>
              <span className="text-lg font-semibold text-foreground">Pokojowo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Pokojowo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      {/* Bottom Navigation for mobile */}
      <BottomNavigation />
    </div>
  );
}
