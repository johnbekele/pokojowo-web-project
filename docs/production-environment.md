# Production environment runbook

This is the source of truth for the variables required by the deployed
Pokojowo services. Keep values in the provider or host secret stores below;
never commit a production `.env` file, paste a secret into an issue/PR, or put
credentials in a `VITE_*` variable (Vite variables are shipped to every
browser).

## Where each value is set

| Component | Production location | Who consumes it |
| --- | --- | --- |
| FastAPI backend | `/opt/pokojowo/backend.env` on the production EC2 host | `pokojowo-backend` (the Compose file sets `DEBUG=False`, `PORT=10000`, and `GUNICORN_WORKERS=1`) |
| Chat service | `/opt/pokojowo/chat.env` on the production EC2 host | `pokojowo-chat` (Compose sets `DEBUG=False`, `PORT=10002`, `DATABASE_NAME=pokojowo_chat`, and `MAIN_API_URL=http://backend:10000`) |
| Web frontend | Vercel → Project Settings → Environment Variables, for the Production environment | Vite build and Vercel serverless sitemap function |
| Scraper worker/dashboard | The worker's private `.env`; dashboard values are Vercel/build-time variables in `pokojowo-scraper/admin` | Scraper process and dashboard API client |
| CI/CD | GitHub → Settings → Secrets and variables → Actions; use the `production` environment where applicable | GitHub Actions deployment workflows |

The production workflow builds immutable images after successful `main` CI and
rolls them out through SSM. It preserves the existing EC2 `backend.env` and
`chat.env` when those files are not present in the checkout, so changing a
secret on the host is followed by a manual production deploy (or a restart of
the affected Compose service).

## Backend: `backend.env`

### Required for a usable production service

```dotenv
DEBUG=False
MONGODB_URL=mongodb+srv://<user>:<url-encoded-password>@<cluster>/<options>
DATABASE_NAME=pokojowo
SECRET_KEY=<generated-with-openssl-rand-hex-32>
CORS_ORIGINS=https://pokojowo.com,https://www.pokojowo.com
FRONTEND_URL=https://pokojowo.com
AWS_REGION=us-east-1
S3_UPLOADS_BUCKET=<Pulumi uploads_bucket output>
```

`SECRET_KEY` must be unique and generated for production. With `DEBUG=False`
the backend refuses to start with an empty or known development default.
`S3_UPLOADS_BUCKET` is also mandatory when debug mode is off. AWS access keys
do not belong in this file: the EC2 instance profile supplies them.

The settings loader also accepts `MONGODB_URI` as an alias for
`MONGODB_URL` and `ACCESS_TOKEN_SECRET` as an alias for `SECRET_KEY`, but use
the names above so the backend and runbook stay unambiguous.

### Required for enabled integrations

```dotenv
# Email verification, password reset, and email notifications
SMTP_HOST=smtp.<provider>
SMTP_PORT=587
SMTP_USER=<provider username>
SMTP_PASSWORD=<provider password or app password>
EMAIL_FROM=noreply@pokojowo.com

# Scraper -> backend import endpoint (must match the scraper value)
SCRAPER_API_KEY=<generated-with-openssl-rand-hex-24>

# Backend -> chat internal calls (must match chat.env)
INTERNAL_API_KEY=<long random value>
```

SMTP credentials are not a startup requirement, but without them production
registration/resend-email requests return `503` and password-reset or email
notifications cannot be delivered. `SCRAPER_API_KEY` is required for
`POST /api/listings/import`; leave it unset only if publishing is deliberately
disabled. `INTERNAL_API_KEY` must be present and identical in both services for
internal chat calls.

### Optional integrations and observability

```dotenv
# Twilio Verify (set all three or leave all three unset)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://<backend-host>/api/auth/google/callback

# Native Apple Sign In (the iOS bundle ID / audience)
APPLE_CLIENT_ID=com.pokojowo.app

# Google AI matching (the code accepts GOOGLE_GENAI_API_KEY as an alias)
GOOGLE_AI_API_KEY=...

# Sentry
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=pokojowo-api@<commit-sha>
SENTRY_TRACES_SAMPLE_RATE=0

# Optional CDN and geocoding tuning
PUBLIC_CDN_BASE_URL=https://<cloudfront-domain>
PRIVATE_URL_TTL_SECONDS=300
NOMINATIM_URL=https://nominatim.openstreetmap.org
NOMINATIM_USER_AGENT=pokojowo-api/1.0 (contact@pokojowo.pl)
NOMINATIM_COUNTRY_CODES=pl
NOMINATIM_TIMEOUT_SECONDS=20
```

Configure all Twilio variables together; otherwise the service uses its local
development fallback and must not be considered phone-verification-ready for
production. Google OAuth also requires the callback URL to be registered in
Google Cloud.

## Chat: `chat.env`

The Compose deployment supplies the port, database name, and backend URL. Put
the remaining shared/auth settings in `/opt/pokojowo/chat.env`:

```dotenv
DEBUG=False
MONGODB_URL=mongodb+srv://<user>:<url-encoded-password>@<cluster>/<options>
SECRET_KEY=<exactly the same value as backend.env>
INTERNAL_API_KEY=<exactly the same value as backend.env>
CORS_ORIGINS=https://pokojowo.com,https://www.pokojowo.com

# Optional Sentry
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=pokojowo-chat@<commit-sha>
SENTRY_TRACES_SAMPLE_RATE=0
```

The chat service uses `DATABASE_NAME=pokojowo_chat` from Compose. Do not point
it at the backend's database name unless a migration explicitly requires it.

## Frontend: Vercel Production variables

Set these in Vercel, then redeploy so Vite embeds the new values:

| Variable | Production value / purpose |
| --- | --- |
| `VITE_API_URL` | Full backend origin used for OAuth redirects, for example `https://dh3iw703m1vvi.cloudfront.net/api` |
| `VITE_API_BASE_URL` | `/api` when Vercel rewrites are enabled; otherwise the full backend `/api` URL |
| `VITE_SOCKET_URL` | Backend origin for notification Socket.IO, for example `https://dh3iw703m1vvi.cloudfront.net` |
| `VITE_SITE_URL` | Canonical public site, for example `https://pokojowo.com` |
| `VITE_CHAT_API_URL` | Chat API base, or omit to use `VITE_API_BASE_URL` through the CloudFront rewrite |
| `VITE_CHAT_SOCKET_URL` | Chat Socket.IO origin, or omit to use `VITE_SOCKET_URL` |
| `SITEMAP_API_URL` | Server-only sitemap source, normally `<backend-origin>/api`; do not prefix with `VITE_` |
| `VITE_SENTRY_DSN` | Optional public Sentry DSN |
| `VITE_SENTRY_ENVIRONMENT` | Usually `production` |
| `VITE_SENTRY_RELEASE` | Frontend release identifier, usually `pokojowo-web@<commit-sha>` |
| `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | Build-only source-map upload settings; never expose them as `VITE_*` |

The current CloudFront distribution is the single origin for API, uploads, and
Socket.IO traffic. If a custom domain is introduced, update `CORS_ORIGINS`,
`FRONTEND_URL`, Vercel rewrites/CSP, and these values together.

## Scraper and dashboard

The scraper uses the `SCRAPER_` prefix from `pokojowo-scraper/src/pokojowo_scraper/config.py`.
For a production worker, set at least:

```dotenv
SCRAPER_MONGO_URI=mongodb+srv://<user>:<url-encoded-password>@<cluster>/<options>
SCRAPER_MONGO_DB=pokojowo_scraper
SCRAPER_POKOJOWO_API_URL=https://<backend-origin>
SCRAPER_POKOJOWO_API_KEY=<same value as backend SCRAPER_API_KEY>
SCRAPER_SCRAPER_USER_AGENT=PokojowoBot/1.0 (+https://pokojowo.pl/contact)
```

If the dashboard is exposed, set separate read and mutation credentials in its
build environment:

```dotenv
VITE_SCRAPER_DASHBOARD_KEY=<read-only dashboard key>
VITE_SCRAPER_DASHBOARD_ADMIN_KEY=<admin/run key>
```

Keep the admin key separate from the scraper publish key. The dashboard admin
key can trigger runs and moderation actions; it must not be reused as a
backend or database credential. Ollama, translation, city/page limits, retry
delays, quality thresholds, and geocoding variables are optional tuning values
documented in `pokojowo-scraper/.env.example`.

## GitHub Actions secrets

The current workflows require only these repository/environment secrets:

| Secret | Used by | Notes |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | Pulumi and production deploy | Scope to the required ECR, S3, EC2/SSM, and CloudFront actions |
| `AWS_SECRET_ACCESS_KEY` | Pulumi and production deploy | Rotate if exposed; Actions masks it |
| `PULUMI_ACCESS_TOKEN` | Pulumi workflow only | Not required by the production image rollout |

Do not add MongoDB, JWT, SMTP, Twilio, or scraper values to the repository
secrets expecting the production workflow to inject them: that workflow
deliberately preserves the private EC2 env files. Store those values on the
host through the approved SSM/secret-management procedure instead.

## First-time setup and verification

1. Rotate any credential that has appeared in git history (especially the
   MongoDB password), URL-encode special characters in the new URI, and update
   both backend and scraper values.
2. Generate fresh secrets, for example:

   ```bash
   openssl rand -hex 32  # SECRET_KEY
   openssl rand -hex 24  # SCRAPER_API_KEY
   openssl rand -hex 32  # INTERNAL_API_KEY
   ```

3. Set the EC2 files with SSM or the approved host procedure, restrict them to
   root (`chmod 600`), and verify that `.gitignore` continues to exclude them.
4. In Vercel, set Production variables and trigger a production redeploy.
5. Run the normal `main` CI → production-deploy workflow. The deploy has local
   backend/chat health gates and then checks the backend through CloudFront.
6. Verify without printing secrets:

   ```bash
   curl --fail --show-error https://<cloudfront-domain>/health
   curl --fail --show-error https://<cloudfront-domain>/health/details
   curl --fail --show-error 'https://<cloudfront-domain>/api/listings?limit=1'
   ```

   The first response must contain `{"status":"healthy"}` and the details
   endpoint should report `database: "connected"`.

When rotating a value, update every consumer atomically (for example,
`SECRET_KEY` in backend and chat, or `SCRAPER_API_KEY` in backend and scraper),
restart/redeploy, and repeat the health plus one authenticated smoke test.
