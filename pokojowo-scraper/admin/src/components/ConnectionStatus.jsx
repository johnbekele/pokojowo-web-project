import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ConnectionStatus({ health, isLoading, isError }) {
  if (isLoading) {
    return (
      <div className="bg-gray-100 border-b border-gray-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Connecting to scraper backend...</span>
          </div>
        </div>
      </div>
    );
  }

  const connected = !isError && !!health;

  return (
    <div
      className={cn(
        'border-b',
        connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      )}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                Connected to scraper backend
                {health.version ? ` (v${health.version})` : ''}
              </span>
              {health.run_active && (
                <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Run in progress
                </span>
              )}
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">
                Disconnected from scraper backend (localhost:8001)
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
