import { cn } from '../../lib/utils';

const SOURCE_COLORS = {
  structured: 'bg-blue-100 text-blue-700',
  regex: 'bg-purple-100 text-purple-700',
  llm: 'bg-amber-100 text-amber-700',
  geocode: 'bg-cyan-100 text-cyan-700',
  overpass: 'bg-teal-100 text-teal-700',
  manual: 'bg-gray-200 text-gray-700',
};

export function SourceBadge({ source }) {
  if (!source) return null;
  return (
    <span
      className={cn(
        'inline-flex text-[10px] font-medium rounded px-1.5 py-0.5 uppercase tracking-wide',
        SOURCE_COLORS[source] || 'bg-gray-100 text-gray-600'
      )}
    >
      {source}
    </span>
  );
}

export function confidenceClasses(confidence) {
  const pct = Math.round((confidence || 0) * 100);
  if (pct >= 85) return 'bg-green-100 text-green-700';
  if (pct >= 60) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

export function ConfidenceBadge({ confidence, className }) {
  if (confidence === undefined || confidence === null) return null;
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={cn(
        'inline-flex text-xs font-semibold rounded-full px-2 py-0.5',
        confidenceClasses(confidence),
        className
      )}
    >
      {pct}%
    </span>
  );
}

export function SiteBadge({ site }) {
  return (
    <span
      className={cn(
        'inline-flex text-xs font-medium rounded-full px-2 py-0.5 uppercase',
        site === 'olx' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'
      )}
    >
      {site}
    </span>
  );
}

/** Unwrap a FieldValue {value, source, confidence} or return the plain value. */
export function fv(field) {
  if (field === null || field === undefined) return null;
  if (typeof field === 'object' && 'value' in field) return field.value;
  return field;
}
