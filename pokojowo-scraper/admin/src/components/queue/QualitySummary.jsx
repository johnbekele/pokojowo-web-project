import { AlertTriangle, Copy, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { confidenceClasses } from './badges';

function Meter({ label, value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="flex-1 min-w-[10rem]">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={cn('text-xs font-semibold rounded-full px-1.5', confidenceClasses(value))}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function QualitySummary({ item }) {
  const quality = item.quality || {};
  const gates = quality.gates_failed || [];

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-4">
        <Meter label="Confidence" value={quality.confidence} />
        <Meter label="Completeness" value={quality.completeness} />
        <div className="flex items-center gap-1.5 flex-wrap">
          {gates.length === 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              all gates passed
            </span>
          ) : (
            gates.map((gate) => (
              <span
                key={gate}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {gate}
              </span>
            ))
          )}
          {item.duplicate_of && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-full px-2 py-0.5"
              title={`Duplicate of ${item.duplicate_of}`}
            >
              <Copy className="w-3.5 h-3.5" />
              duplicate
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
