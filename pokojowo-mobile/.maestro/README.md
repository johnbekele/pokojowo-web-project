# Maestro smoke test

The smoke flow launches a clean app, skips onboarding, signs in with a test
account, and visits all four authenticated tabs.

Run it against an attached simulator or emulator with Maestro installed:

```bash
TEST_EMAIL="smoke@example.com" TEST_PASSWORD="<test-password>" \
  maestro test .maestro/smoke.yaml
```

Use a disposable verified account. The credentials are supplied as environment
variables and are never committed to the repository.
