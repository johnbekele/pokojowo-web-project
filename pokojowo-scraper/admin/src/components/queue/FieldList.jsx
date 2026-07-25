import { SourceBadge, fv } from './badges';

const FIELD_ORDER = [
  'rooms',
  'floor',
  'rent_extra',
  'deposit',
  'furnished',
  'address',
  'coordinates',
  'geo_precision',
  'offered_by',
  'phone',
  'available_from',
  'room_type',
  'building_type',
  'rent_for_only',
  'max_tenants',
  'close_to',
  'posted_at',
];

function formatValue(name, value) {
  if (value === null || value === undefined) return '—';
  if (name === 'coordinates' && typeof value === 'object') {
    return `${value.latitude?.toFixed?.(5)}, ${value.longitude?.toFixed?.(5)}`;
  }
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

export default function FieldList({ listing }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
      {FIELD_ORDER.map((name) => {
        const field = listing?.[name];
        const value = fv(field);
        const isFieldValue = field && typeof field === 'object' && 'value' in field;
        return (
          <div
            key={name}
            className="flex items-baseline justify-between gap-2 border-b border-gray-100 pb-1.5"
          >
            <dt className="text-xs text-gray-500 whitespace-nowrap">{name.replace(/_/g, ' ')}</dt>
            <dd className="flex items-center gap-1.5 text-sm text-gray-800 text-right min-w-0">
              <span className="truncate" title={formatValue(name, value)}>
                {formatValue(name, value)}
              </span>
              {isFieldValue && value != null && (
                <>
                  <SourceBadge source={field.source} />
                  {field.confidence != null && (
                    <span className="text-[10px] text-gray-400">
                      {Math.round(field.confidence * 100)}%
                    </span>
                  )}
                </>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
