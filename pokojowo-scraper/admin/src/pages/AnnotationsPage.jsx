import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn, formatDate, truncate } from '../lib/utils';
import { useAnnotations } from '../hooks/useAnnotations';

const PAGE_SIZE = 50;

const ISSUE_COLORS = {
  'wrong-district': 'bg-purple-100 text-purple-700',
  'bad-translation': 'bg-amber-100 text-amber-700',
  'wrong-price': 'bg-red-100 text-red-700',
  'wrong-size': 'bg-orange-100 text-orange-700',
  'wrong-location': 'bg-cyan-100 text-cyan-700',
  spam: 'bg-rose-100 text-rose-700',
  duplicate: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function AnnotationsPage() {
  const [skip, setSkip] = useState(0);
  const { data: annotations, isLoading } = useAnnotations({ limit: PAGE_SIZE, skip });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Annotations</h2>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading annotations...
          </div>
        ) : !annotations?.length ? (
          <p className="text-center text-gray-500 py-16 text-sm">No annotations yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Field</th>
                <th className="px-4 py-3 font-medium">Issue</th>
                <th className="px-4 py-3 font-medium">Comment</th>
                <th className="px-4 py-3 font-medium">Listing</th>
              </tr>
            </thead>
            <tbody>
              {annotations.map((a) => (
                <tr key={a._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {formatDate(a.created_at)}
                  </td>
                  <td className="px-4 py-2.5 uppercase text-xs font-medium text-gray-600">
                    {a.source_site}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">{a.field}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'inline-flex text-xs font-medium rounded-full px-2 py-0.5',
                        ISSUE_COLORS[a.issue] || ISSUE_COLORS.other
                      )}
                    >
                      {a.issue}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-xs">
                    <span title={a.comment}>{truncate(a.comment, 80) || '—'}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <code
                      className="text-xs text-blue-700 bg-blue-50 rounded px-1.5 py-0.5"
                      title={a.listing_id}
                    >
                      {truncate(a.listing_id, 12)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
          disabled={skip === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <button
          onClick={() => setSkip((s) => s + PAGE_SIZE)}
          disabled={(annotations?.length || 0) < PAGE_SIZE}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
