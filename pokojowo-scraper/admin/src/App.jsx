import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Play, Inbox, Tag, BarChart3 } from 'lucide-react';
import { cn } from './lib/utils';
import Header from './components/Header';
import ConnectionStatus from './components/ConnectionStatus';
import { ToastProvider } from './components/Toast';
import { useHealth } from './hooks/useRuns';
import RunsPage from './pages/RunsPage';
import QueuePage from './pages/QueuePage';
import AnnotationsPage from './pages/AnnotationsPage';
import MetricsPage from './pages/MetricsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5000, refetchOnWindowFocus: false },
  },
});

const TABS = [
  { to: '/runs', label: 'Runs', icon: Play },
  { to: '/queue', label: 'Queue', icon: Inbox },
  { to: '/annotations', label: 'Annotations', icon: Tag },
  { to: '/metrics', label: 'Metrics', icon: BarChart3 },
];

function NavTabs() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 flex gap-1">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Shell() {
  const { data: health, isLoading, isError } = useHealth();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ConnectionStatus health={health} isLoading={isLoading} isError={isError} />
      <NavTabs />
      <main className="container mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/runs" replace />} />
          <Route path="/runs" element={<RunsPage runActive={!!health?.run_active} />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/annotations" element={<AnnotationsPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="*" element={<Navigate to="/runs" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
