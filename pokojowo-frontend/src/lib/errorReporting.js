import * as Sentry from '@sentry/react';

export const REDACTED = '[Filtered]';

const SENSITIVE_KEY = /(?:authorization|cookie|set-cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|token|password|passwd|secret|credential|email|phone|mobile|telephone)/i;
const BODY_KEY = /^(?:body|request[_-]?body|form|payload|data)$/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\w)(?:\+?\d[\d\s().-]{6,}\d)(?!\w)/g;
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;

/** Recursively remove credentials, PII, and request bodies from Sentry data. */
export function scrubEvent(value, key = '') {
  if (key && (SENSITIVE_KEY.test(key) || BODY_KEY.test(key))) return REDACTED;
  if (typeof value === 'string') {
    return value
      .replace(EMAIL, REDACTED)
      .replace(PHONE, REDACTED)
      .replace(JWT, REDACTED)
      .replace(
        /(?:authorization|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*[^\s&,;]+/gi,
        (match) => `${match.split(/\s*[:=]\s*/)[0]}=${REDACTED}`
      );
  }
  if (Array.isArray(value)) return value.map((item) => scrubEvent(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        scrubEvent(childValue, childKey),
      ])
    );
  }
  return value;
}

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();
const sentryEnvironment =
  import.meta.env.VITE_SENTRY_ENVIRONMENT ||
  (import.meta.env.MODE === 'production' ? 'production' : 'development');
const sentryRelease = import.meta.env.VITE_SENTRY_RELEASE || 'pokojowo-web@1.0.0';

export const sentryEnabled = Boolean(sentryDsn);

if (sentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    release: sentryRelease,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
  });
}

/** Single hand-off point used by the web error boundaries and async callers. */
export function reportError(error, context = {}) {
  if (import.meta.env.DEV) console.error('[pokojowo] unhandled error');
  if (!sentryEnabled) return;

  Sentry.withScope((scope) => {
    scope.setExtras(scrubEvent(context));
    Sentry.captureException(error);
  });
}
