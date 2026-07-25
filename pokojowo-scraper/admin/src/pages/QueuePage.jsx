import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useQueue, useQueueStats } from '../hooks/useQueue';
import ListingCard from '../components/queue/ListingCard';
import ListingDetailModal from '../components/queue/ListingDetailModal';

const STATUSES = ['pending', 'held', 'published', 'rejected', 'duplicate'];
const PAGE_SIZE = 24;

export default function QueuePage() {
  const [status, setStatus] = useState('pending');
  const [skip, setSkip] = useState(0);
  const [selected, setSelected] = useState(null);

  const { data: stats } = useQueueStats();
  const { data, isLoading, isFetching } = useQueue({ status, limit: PAGE_SIZE, skip });

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const page = Math.floor(skip / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectStatus = (s) => {
    setStatus(s);
    setSkip(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => selectStatus(s)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg border capitalize',
              status === s
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            )}
          >
            {s}
            <span
              className={cn(
                'ml-1.5 text-xs rounded-full px-1.5 py-0.5',
                status === s ? 'bg-blue-500 text-blue-50' : 'bg-gray-100 text-gray-500'
              )}
            >
              {stats?.counts?.[s] ?? 0}
            </span>
          </button>
        ))}
        {isFetching && !isLoading && (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400 self-center" />
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading queue...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 py-20 text-center text-sm text-gray-500">
          No {status} listings.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <ListingCard key={item._id} item={item} onClick={() => setSelected(item)} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {total > 0 ? `${skip + 1}–${Math.min(skip + PAGE_SIZE, total)} of ${total}` : '0 results'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
            disabled={skip === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-sm text-gray-600">
            {page} / {pages}
          </span>
          <button
            onClick={() => setSkip((s) => s + PAGE_SIZE)}
            disabled={skip + PAGE_SIZE >= total}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {selected && <ListingDetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
