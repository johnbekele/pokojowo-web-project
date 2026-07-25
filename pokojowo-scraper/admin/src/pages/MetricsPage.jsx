import { useState } from 'react';
import { cn } from '../lib/utils';
import { usePrecisionMetrics, useQualityMetrics } from '../hooks/useMetrics';
import QualitySection from '../components/metrics/QualitySection';
import PrecisionSection from '../components/metrics/PrecisionSection';

const DAY_OPTIONS = [7, 30, 90];

export default function MetricsPage() {
  const [days, setDays] = useState(30);
  const quality = useQualityMetrics(days);
  const precision = usePrecisionMetrics(days);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Metrics</h2>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium border-r border-gray-300 last:border-r-0',
                days === d ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <QualitySection data={quality.data} isLoading={quality.isLoading} />
      <PrecisionSection data={precision.data} isLoading={precision.isLoading} />
    </div>
  );
}
