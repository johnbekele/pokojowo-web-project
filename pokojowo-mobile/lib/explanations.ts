// Translate a match explanation via its stable reason_key with the
// English `reason` string as fallback (older backend / unmapped keys).
import type { TFunction } from 'i18next';
import type { MatchExplanation } from '@/types/matching.types';

export function translateExplanation(t: TFunction, explanation: MatchExplanation): string {
  if (!explanation) return '';
  if (explanation.reason_key) {
    return t(`explanations.${explanation.reason_key}`, {
      ...(explanation.params || {}),
      defaultValue: explanation.reason,
    });
  }
  return explanation.reason;
}
