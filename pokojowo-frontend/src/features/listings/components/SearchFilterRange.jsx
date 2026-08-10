import { createElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

export default function SearchFilterRange({
  type,
  filters,
  onChange,
  icon: iconComponent,
  iconClassName,
  iconWrapperClassName,
}) {
  const { t } = useTranslation('listings');
  const isPrice = type === 'price';
  const minKey = isPrice ? 'minPrice' : 'minSize';
  const maxKey = isPrice ? 'maxPrice' : 'maxSize';
  const maxValue = isPrice ? 10000 : 200;
  const step = isPrice ? 100 : 5;
  const unit = isPrice
    ? t('filters.priceUnit', 'PLN/month')
    : t('filters.sizeUnit', 'm²');
  const title = isPrice
    ? t('filters.price', 'Price Range')
    : t('filters.size', 'Room Size');

  const updateRange = (min, max) => onChange({ [minKey]: min, [maxKey]: max });
  const min = filters[minKey] || 0;
  const max = filters[maxKey] || maxValue;

  return (
    <div className="space-y-4 rounded-xl bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-2 ${iconWrapperClassName || 'bg-muted'}`}>
            {createElement(iconComponent, { className: iconClassName })}
          </div>
          <Label className="text-base font-semibold">{title}</Label>
        </div>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label className="mb-1 block text-xs text-muted-foreground">
            {t('filters.min', 'Min')}
          </Label>
          <Input
            type="number"
            min={0}
            max={max}
            value={min}
            onChange={(event) => updateRange(Math.min(Number(event.target.value), max), max)}
            className="h-12 text-center text-lg font-medium"
            placeholder="0"
          />
        </div>
        <span className="mt-5 text-muted-foreground">—</span>
        <div className="flex-1">
          <Label className="mb-1 block text-xs text-muted-foreground">
            {t('filters.max', 'Max')}
          </Label>
          <Input
            type="number"
            min={min}
            max={maxValue}
            value={max}
            onChange={(event) => updateRange(min, Math.max(Number(event.target.value), min))}
            className="h-12 text-center text-lg font-medium"
            placeholder={String(maxValue)}
          />
        </div>
      </div>

      <div className="px-2 pt-2">
        <Slider
          min={0}
          max={maxValue}
          step={step}
          value={[min, max]}
          onValueChange={([nextMin, nextMax]) => updateRange(nextMin, nextMax)}
          className="touch-manipulation"
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{isPrice ? t('filters.minPrice', '0 PLN') : t('filters.minSize', '0 m²')}</span>
          <span>
            {isPrice
              ? t('filters.maxPrice', '{{max}} PLN', { max: maxValue.toLocaleString() })
              : t('filters.maxSize', '{{max}} m²', { max: maxValue })}
          </span>
        </div>
      </div>
    </div>
  );
}
