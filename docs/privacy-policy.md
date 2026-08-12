# Privacy policy — error tracking subprocessor notice

Pokojowo uses Sentry (Sentry.io) as an error-tracking and crash-reporting
subprocessor for the API, chat service, website, and mobile applications.
Sentry receives technical diagnostics such as exception type, stack trace,
app/version release, environment, device/runtime information, and a coarse
request URL when an error occurs. It is used to diagnose outages, measure
release health, and notify operators about new errors or error-rate spikes.

Pokojowo configures Sentry with PII collection disabled and scrubs
authorization headers, cookies, tokens, passwords, request bodies, email
addresses, and phone numbers before an event leaves the application. Users
should not include personal data in error-report context. Sentry's applicable
data-processing terms and retention controls govern the subprocessor service.

This notice should be published at the public `/privacy` URL linked from the
web and mobile settings before enabling a production DSN. Any change to the
subprocessor, event fields, or retention period requires a corresponding
policy review.
