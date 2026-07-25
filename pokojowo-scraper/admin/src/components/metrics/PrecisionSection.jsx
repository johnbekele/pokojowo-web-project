import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function PrecisionSection({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading precision metrics...
      </div>
    );
  }

  const reviewedBySite = data?.reviewed_by_site || {};
  const issuesBySite = data?.issues_by_site || {};
  const sites = [...new Set([...Object.keys(reviewedBySite), ...Object.keys(issuesBySite)])];

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-5">
      <h3 className="text-base font-semibold text-gray-900">Precision (annotated issues)</h3>
      {sites.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No reviews recorded for this period.</p>
      ) : (
        sites.map((site) => {
          const reviewed = reviewedBySite[site] || 0;
          const issues = issuesBySite[site] || [];
          const totalIssues = issues.reduce((sum, i) => sum + (i.count || 0), 0);
          const precision = reviewed > 0 ? Math.max(0, 1 - totalIssues / reviewed) : null;
          return (
            <div key={site} className="space-y-2">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-semibold text-gray-700 uppercase">{site}</h4>
                <span className="text-xs text-gray-500">{reviewed} reviewed</span>
                <span className="text-xs text-gray-500">{totalIssues} issues</span>
                {precision != null && (
                  <span
                    className={cn(
                      'ml-auto text-xs font-semibold rounded-full px-2 py-0.5',
                      precision >= 0.9
                        ? 'bg-green-100 text-green-700'
                        : precision >= 0.7
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    )}
                  >
                    precision {(precision * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              {issues.length === 0 ? (
                <p className="text-xs text-gray-400">No issues annotated.</p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <th className="py-1.5 pr-4 font-medium">Field</th>
                      <th className="py-1.5 pr-4 font-medium">Issue</th>
                      <th className="py-1.5 font-medium text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {issues.map((row, i) => (
                      <tr key={`${row.field}-${row.issue}-${i}`} className="border-b border-gray-100 last:border-0">
                        <td className="py-1.5 pr-4 text-gray-700">{row.field}</td>
                        <td className="py-1.5 pr-4 text-gray-700">{row.issue}</td>
                        <td className="py-1.5 text-right text-gray-800">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}
