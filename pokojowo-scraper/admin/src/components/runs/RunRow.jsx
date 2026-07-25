import { AlertTriangle, FlaskConical, Loader2 } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';

const CHIP_FIELDS = [
  { key: 'new', label: 'new', className: 'bg-blue-100 text-blue-700' },
  { key: 'published', label: 'published', className: 'bg-green-100 text-green-700' },
  { key: 'queued', label: 'queued', className: 'bg-yellow-100 text-yellow-700' },
  { key: 'errors', label: 'errors', className: 'bg-red-100 text-red-700' },
];

function SiteChips({ site, stats }) {
  if (!stats) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-gray-600 uppercase w-14">{site}</span>
      {CHIP_FIELDS.map(({ key, label, className }) => (
        <span
          key={key}
          className={cn(
            'inline-flex text-xs rounded-full px-2 py-0.5 font-medium',
            (stats[key] || 0) > 0 ? className : 'bg-gray-100 text-gray-400'
          )}
        >
          {stats[key] || 0} {label}
        </span>
      ))}
      {(stats.blocked || 0) > 0 && (
        <span
          className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-medium bg-orange-100 text-orange-700"
          title={`${stats.blocked} blocked responses`}
        >
          <AlertTriangle className="w-3 h-3" />
          blocked
        </span>
      )}
    </div>
  );
}

export default function RunRow({ run }) {
  const active = !run.finished_at;
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap align-top">
        <div className="flex items-center gap-2">
          {active && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
          {formatDate(run.started_at)}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
          {run.trigger}
          {run.dry_run && <FlaskConical className="w-3 h-3 text-purple-600" title="dry run" />}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-1.5">
          {Object.entries(run.per_site || {}).map(([site, stats]) => (
            <SiteChips key={site} site={site} stats={stats} />
          ))}
        </div>
      </td>
    </tr>
  );
}
