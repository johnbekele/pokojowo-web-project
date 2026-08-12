import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { scrubEvent } from './observabilityPrivacy';

export { REDACTED, scrubEvent } from './observabilityPrivacy';

const extra = Constants.expoConfig?.extra ?? {};
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || extra.sentryDsn;
const sentryEnvironment =
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
  extra.sentryEnvironment ||
  (__DEV__ ? 'development' : 'production');
const sentryRelease =
  process.env.EXPO_PUBLIC_SENTRY_RELEASE?.trim() ||
  extra.sentryRelease ||
  'pokojowo-mobile@1.0.0';

export const sentryEnabled = Boolean(sentryDsn);

if (sentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    release: sentryRelease,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event) as typeof event,
  });
}

/** Capture an application error with only already-scrubbed context. */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (!sentryEnabled) return;
  Sentry.withScope((scope) => {
    scope.setExtras(scrubEvent(context) as Record<string, unknown>);
    Sentry.captureException(error);
  });
}
