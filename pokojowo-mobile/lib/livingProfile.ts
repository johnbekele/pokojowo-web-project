import type { LivingProfile } from '@/types/matching.types';

/** `t('key', 'fallback')` — matches how react-i18next is used across the app. */
type Translate = (key: string, fallback: string) => string;

export interface ProfileFact {
  key: string;
  label: string;
  value: string;
}

/** "very_clean" -> "Very clean", used when a translation key is missing. */
function humanize(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function label(t: Translate, group: string, value?: string | null): string | null {
  if (!value) return null;
  return t(`living.${group}.${value}`, humanize(value));
}

/**
 * Short, self-explanatory chips for the summary view. Ordered by how much
 * they tell you about sharing a flat with someone, and capped by the caller.
 */
export function getLivingHighlights(profile: LivingProfile | undefined, t: Translate): string[] {
  if (!profile) return [];

  const traits = profile.flatmate_traits ?? {};
  const lifestyle = profile.lifestyle ?? {};
  const chips: (string | null)[] = [
    label(t, 'cleanliness', traits.cleanliness),
    label(t, 'socialLevel', traits.socialLevel),
    label(t, 'guests', traits.guestsFrequency),
  ];

  if (lifestyle.smokes === false) chips.push(t('living.lifestyle.nonSmoker', 'Non-smoker'));
  if (lifestyle.smokes === true) chips.push(t('living.lifestyle.smoker', 'Smoker'));
  if (lifestyle.hasPets === true) chips.push(t('living.lifestyle.hasPets', 'Has pets'));
  if (lifestyle.okWithPets === true) chips.push(t('living.lifestyle.okWithPets', 'Pet-friendly'));

  for (const trait of profile.personality ?? []) {
    chips.push(label(t, 'personality', trait));
  }

  return chips.filter((c): c is string => Boolean(c));
}

function formatBudget(profile: LivingProfile, t: Translate): string | null {
  const budget = profile.budget;
  if (!budget || (budget.min == null && budget.max == null)) return null;

  const currency = budget.currency || 'PLN';
  if (budget.min != null && budget.max != null) {
    return `${Math.round(budget.min)}–${Math.round(budget.max)} ${currency}`;
  }
  const single = budget.max ?? budget.min;
  return budget.max != null
    ? t('living.budget.upTo', 'Up to {{amount}}').replace(
        '{{amount}}',
        `${Math.round(single as number)} ${currency}`
      )
    : `${Math.round(single as number)} ${currency}`;
}

/** The full label/value list revealed behind "See all details". */
export function getLivingFacts(
  profile: LivingProfile | undefined,
  t: Translate
): ProfileFact[] {
  if (!profile) return [];

  const traits = profile.flatmate_traits ?? {};
  const lifestyle = profile.lifestyle ?? {};
  const routine = profile.daily_routine;
  const facts: ProfileFact[] = [];

  const push = (key: string, labelText: string, value?: string | null) => {
    if (value) facts.push({ key, label: labelText, value });
  };

  push('cleanliness', t('living.labels.cleanliness', 'Cleanliness'), label(t, 'cleanliness', traits.cleanliness));
  push('socialLevel', t('living.labels.socialLevel', 'Social level'), label(t, 'socialLevel', traits.socialLevel));
  push('guests', t('living.labels.guests', 'Guests'), label(t, 'guests', traits.guestsFrequency));
  push('noise', t('living.labels.noise', 'Noise tolerance'), label(t, 'noise', traits.noiseTolerance));
  push('cooking', t('living.labels.cooking', 'Cooking'), label(t, 'cooking', traits.cookingFrequency));

  if (lifestyle.smokes != null) {
    push(
      'smoking',
      t('living.labels.smoking', 'Smoking'),
      lifestyle.smokes
        ? t('living.lifestyle.smoker', 'Smoker')
        : t('living.lifestyle.nonSmoker', 'Non-smoker')
    );
  }
  if (lifestyle.hasPets != null) {
    push(
      'pets',
      t('living.labels.pets', 'Pets'),
      lifestyle.hasPets
        ? t('living.lifestyle.hasPets', 'Has pets')
        : t('living.lifestyle.noPets', 'No pets')
    );
  }
  if (lifestyle.okWithSmoking != null) {
    push(
      'okWithSmoking',
      t('living.labels.okWithSmoking', 'OK with smoking'),
      lifestyle.okWithSmoking ? t('common.yes', 'Yes') : t('common.no', 'No')
    );
  }

  push('budget', t('living.labels.budget', 'Budget'), formatBudget(profile, t));

  if (profile.lease_duration_months) {
    push(
      'lease',
      t('living.labels.lease', 'Lease length'),
      t('living.lease.months', '{{count}} months').replace(
        '{{count}}',
        String(profile.lease_duration_months)
      )
    );
  }

  push('preferredLocation', t('living.labels.preferredLocation', 'Looking in'), profile.preferred_location);

  if (traits.sharedSpaces?.length) {
    push(
      'sharedSpaces',
      t('living.labels.sharedSpaces', 'Happy to share'),
      traits.sharedSpaces.map((s) => label(t, 'sharedSpaces', s)).filter(Boolean).join(', ')
    );
  }

  if (routine?.wakeUp) push('wakeUp', t('living.labels.wakeUp', 'Wakes up'), routine.wakeUp);
  if (routine?.sleepTime) push('sleepTime', t('living.labels.sleepTime', 'Sleeps'), routine.sleepTime);

  if (profile.has_partner) {
    push('partner', t('living.labels.household', 'Household'), t('living.household.partner', 'Moving in with a partner'));
  }
  if (profile.has_children) {
    push('children', t('living.labels.household', 'Household'), t('living.household.children', 'Has children'));
  }

  return facts;
}
