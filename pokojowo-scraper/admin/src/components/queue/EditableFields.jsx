import { SourceBadge, fv } from './badges';

const EDITABLE = [
  { name: 'district', label: 'District', type: 'text' },
  { name: 'price', label: 'Price (zł)', type: 'number' },
  { name: 'size', label: 'Size (m²)', type: 'number' },
  { name: 'city', label: 'City', type: 'text' },
];

/**
 * Editable inputs for district/price/size/city plus side-by-side PL/EN
 * descriptions (EN editable). Controlled by parent via edits/setEdits.
 */
export default function EditableFields({ listing, edits, setEdits }) {
  const setField = (name, value) => setEdits((prev) => ({ ...prev, [name]: value }));

  const current = (name) => (name in edits ? edits[name] : fv(listing?.[name]) ?? '');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {EDITABLE.map(({ name, label, type }) => (
          <div key={name}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
              {label}
              <SourceBadge source={listing?.[name]?.source} />
            </label>
            <input
              type={type}
              step={type === 'number' ? 'any' : undefined}
              value={current(name)}
              onChange={(e) =>
                setField(
                  name,
                  type === 'number' && !Number.isNaN(e.target.valueAsNumber)
                    ? e.target.valueAsNumber
                    : e.target.value
                )
              }
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
            Description (PL)
            <SourceBadge source={listing?.description_pl?.source} />
          </label>
          <textarea
            readOnly
            value={fv(listing?.description_pl) ?? ''}
            className="w-full h-40 border border-gray-200 bg-gray-50 rounded-lg px-2 py-1.5 text-sm text-gray-600 resize-y"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
            Description (EN)
            <SourceBadge source={listing?.description_en?.source} />
            {listing?.translation_suspect && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5">
                suspect
              </span>
            )}
          </label>
          <textarea
            value={'description_en' in edits ? edits.description_en : fv(listing?.description_en) ?? ''}
            onChange={(e) => setField('description_en', e.target.value)}
            className="w-full h-40 border border-gray-300 rounded-lg px-2 py-1.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
