const DRAFT_VERSION = 1;

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}
export function readFormDraft(storageKey) {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || draft.version !== DRAFT_VERSION || !draft.formData) return null;
    return draft;
  } catch {
    return null;
  }
}

export function writeFormDraft(storageKey, formData, currentStep) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ version: DRAFT_VERSION, formData, currentStep, savedAt: Date.now() }),
    );
  } catch {
    // Draft persistence is best effort. A full/private storage bucket must not
    // make the form unusable.
  }
}

export function clearFormDraft(storageKey) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage access failures; the submitted data is already safe.
  }
}
