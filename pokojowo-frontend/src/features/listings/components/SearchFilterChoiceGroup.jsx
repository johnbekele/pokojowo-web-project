import { createElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import FilterChip from './FilterChip';

export default function SearchFilterChoiceGroup({
  title,
  icon: iconComponent,
  iconClassName,
  iconWrapperClassName,
  options,
  selectedValues,
  onToggle,
  label,
}) {
  const { t } = useTranslation('listings');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg p-2 ${iconWrapperClassName || 'bg-muted'}`}>
          {createElement(iconComponent, { className: iconClassName })}
        </div>
        <Label className="text-base font-semibold">{title}</Label>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <FilterChip
            key={option.value}
            selected={selectedValues.includes(option.value)}
            onClick={() => onToggle(option.value)}
            icon={option.icon}
          >
            {label ? label(option) : t(option.labelKey)}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
