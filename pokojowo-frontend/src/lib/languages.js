// Mirror of SUPPORTED_LANGUAGES in pokojowo-fastapi/app/core/constants.py.
// Users can add languages beyond this list via the "Other" option; the
// backend normalizes free-text entries (trim/title-case/dedupe) on save.
export const SUPPORTED_LANGUAGES = [
  'English',
  'Polish',
  'German',
  'French',
  'Spanish',
  'Ukrainian',
  'Russian',
  'Italian',
];
