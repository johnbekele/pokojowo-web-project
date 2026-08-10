import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SearchFilterTenants({ value, onChange }) {
  const { t } = useTranslation('listings');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-teal-100 p-2 dark:bg-teal-900/30">
          <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        </div>
        <Label className="text-base font-semibold">
          {t('filters.maxTenants', 'Maximum Tenants')}
        </Label>
      </div>
      <Select value={value?.toString() || 'any'} onValueChange={onChange}>
        <SelectTrigger className="h-12 text-base">
          <SelectValue placeholder={t('filters.anyTenants', 'Any number')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any" className="h-12">
            {t('filters.anyTenants', 'Any number')}
          </SelectItem>
          <SelectItem value="1" className="h-12">
            {t('filters.tenantCount.one', '1 tenant')}
          </SelectItem>
          <SelectItem value="2" className="h-12">
            {t('filters.tenantCount.two', '2 tenants')}
          </SelectItem>
          <SelectItem value="3" className="h-12">
            {t('filters.tenantCount.three', '3 tenants')}
          </SelectItem>
          <SelectItem value="4" className="h-12">
            {t('filters.tenantCount.fourPlus', '4+ tenants')}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
