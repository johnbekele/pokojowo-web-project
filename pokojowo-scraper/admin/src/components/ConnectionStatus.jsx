import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ConnectionStatus({ isConnected, isLoading }) {
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

  return (
    <div
      className={cn(
        'border-b',
        isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      )}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Connected to scraper backend (localhost:8001)</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">Disconnected from scraper backend</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
