# Error tracking and release configuration

Pokojowo uses Sentry for the FastAPI API, chat service, React web app, and
Expo mobile app. The SDKs are DSN-gated: with no DSN they do not initialise,
so tests and local development never send events.

## Required environment variables

Set these in the deployment secret store, not in the repository:

| Application | Runtime variables |
| --- | --- |
| FastAPI | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` (optional sample-rate: `SENTRY_TRACES_SAMPLE_RATE`) |
| Chat | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` (optional sample-rate: `SENTRY_TRACES_SAMPLE_RATE`) |
| Web | `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE` |
| Mobile | `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_ENVIRONMENT`, `EXPO_PUBLIC_SENTRY_RELEASE` |

If the release variable is omitted, each app derives a stable release from
its application name and `1.0.0` version. In production, set it to the commit
SHA or another immutable build identifier so regressions can be compared to a
deploy.

The web production build uploads hidden source maps only when all of
`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are available. Vite
deletes the maps after upload and never emits a public source-map URL. The
mobile EAS profiles use the `@sentry/react-native/expo` plugin; set
`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` as EAS secret
environment variables to enable the native/JavaScript symbol upload. The
auth token must never be placed in `extra`, `EXPO_PUBLIC_*`, or committed
files.

## Privacy safeguards

All four clients set `sendDefaultPii`/`send_default_pii` to false and run a
`beforeSend` scrubber. It removes authorization/cookie/API headers, access and
refresh tokens, passwords, complete request bodies, email addresses, phone
numbers, JWTs, and matching values inside URLs, breadcrumbs, exception text,
and extra context. The tests deliberately exercise auth-shaped events.

Do not add raw request payloads to `captureException` context. If a new
integration adds a field that can contain personal data, extend the scrubber
and its tests before enabling it.

## Sentry alerting checklist

For each Sentry project, create and keep enabled:

1. An issue alert for a new issue in the `production` environment (notify the
   on-call channel and project owners).
2. A metric alert for a spike in event count, for example more than 5 errors
   in 5 minutes and at least 2x the preceding hour's baseline.
3. A release health alert when crash-free sessions/users fall below the launch
   threshold (99% for web/API, 98% for mobile until baseline data exists).

Use the same environment and release names configured above. Test each rule
with a Sentry test event after creating it; alert configuration is account
state and intentionally is not stored in source control.
