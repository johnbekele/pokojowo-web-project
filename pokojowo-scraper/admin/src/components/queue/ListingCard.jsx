import { AlertTriangle, ImageOff, Languages } from 'lucide-react';
import { ConfidenceBadge, SiteBadge, fv } from './badges';

export default function ListingCard({ item, onClick }) {
  const listing = item.listing || {};
  const images = fv(listing.images) || [];
  const title = fv(listing.title);
  const price = fv(listing.price);
  const size = fv(listing.size);
  const gatesFailed = item.quality?.gates_failed || [];

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-left hover:shadow-md hover:border-gray-300 transition-shadow flex flex-col"
    >
      <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        {images[0] ? (
          <img src={images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ImageOff className="w-8 h-8 text-gray-300" />
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
            {title || 'Untitled listing'}
          </h3>
          <ConfidenceBadge confidence={item.quality?.confidence} className="shrink-0" />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          {price != null && <span className="font-semibold">{price.toLocaleString()} zł</span>}
          {size != null && <span className="text-gray-500">{size} m²</span>}
          <span className="ml-auto">
            <SiteBadge site={item.source_site} />
          </span>
        </div>
        {(gatesFailed.length > 0 || listing.translation_suspect) && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {gatesFailed.map((gate) => (
              <span
                key={gate}
                className="inline-flex text-[10px] font-medium rounded px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200"
              >
                {gate}
              </span>
            ))}
            {listing.translation_suspect && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200"
                title="Translation flagged as suspect"
              >
                <Languages className="w-3 h-3" />
                <AlertTriangle className="w-3 h-3" />
                translation
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
