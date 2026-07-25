import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ImageGallery({ images = [] }) {
  const [index, setIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="h-56 bg-gray-100 rounded-lg flex items-center justify-center">
        <ImageOff className="w-8 h-8 text-gray-300" />
      </div>
    );
  }

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div>
      <div className="relative h-56 bg-gray-900 rounded-lg overflow-hidden">
        <img src={images[index]} alt="" className="w-full h-full object-contain" />
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
            <span className="absolute bottom-2 right-2 text-xs text-white bg-black/50 rounded px-1.5 py-0.5">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={url + i}
              onClick={() => setIndex(i)}
              className={cn(
                'w-14 h-10 rounded overflow-hidden shrink-0 border-2',
                i === index ? 'border-blue-500' : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
