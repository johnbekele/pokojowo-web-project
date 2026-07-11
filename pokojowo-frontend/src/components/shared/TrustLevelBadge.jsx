import { useTranslation } from 'react-i18next';
import { ShieldCheck, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Tiered trust badge:
 * - verified      = email + phone verified
 * - id_verified   = landlord documents approved by an admin
 * Renders nothing for "unverified".
 */
export default function TrustLevelBadge({ trustLevel, className = '' }) {
  const { t } = useTranslation('common');

  if (trustLevel === 'id_verified') {
    return (
      <Badge variant="outline" className={`gap-1 text-blue-600 border-blue-500 ${className}`}>
        <BadgeCheck className="h-3.5 w-3.5" />
        {t('trust.idVerified', 'ID Verified')}
      </Badge>
    );
  }
  if (trustLevel === 'verified') {
    return (
      <Badge variant="outline" className={`gap-1 text-success border-success ${className}`}>
        <ShieldCheck className="h-3.5 w-3.5" />
        {t('trust.verified', 'Verified')}
      </Badge>
    );
  }
  return null;
}
