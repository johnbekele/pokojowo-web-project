# Pokojowo Autopilot Playbook (v2 — staged multi-model pipeline)

The autopilot is an OS-level cron job (`/etc/cron.d/pokojowo-autopilot`,
daily 06:37) that runs `~/pokojowo-autopilot/run.sh`: three headless Claude
stages, each with its own model, prompt and time cap.

| Stage | Model | Cap | Job |
|---|---|---|---|
| 1. Plan | Fable 5 | 45 min | Turn `autopilot` idea issues into detailed `ready` child issues. Never writes code. Skipped when no unplanned ideas. |
| 2. Implement | Opus 4.8 | 100 min | Rework `changes-requested` PRs, else ship the oldest `ready` issue: branch `auto/<n>-<slug>`, full local test battery, open PR. **Never merges.** Skipped when queue empty. |
| 3. Review | Sonnet 5 | 30 min | Critically review every open `autopilot` PR, wait for CI, merge green+clean ones, send problems back via `changes-requested`, post the daily report on issue #67. Always runs. |

Separation of duties is deliberate: the implementer never merges its own PR;
only the reviewer has merge authority, and branch protection makes red-CI
merges impossible for everyone.

## Issue lifecycle

```
you: open issue + label `autopilot`        (a big idea, however vague)
  └─ Stage 1 posts a plan comment, splits into child issues labeled
     `ready`+`autopilot`, labels the parent `autopilot-done`
       └─ Stage 2 implements one child per day → PR (label `autopilot`)
            └─ Stage 3 reviews + merges → child closed, labeled `autopilot-done`
                 └─ (or) `changes-requested` → Stage 2 reworks next morning
```

Want something done sooner or it's already well-specified? Label it
`ready`+`autopilot` directly and Stage 2 picks it up next run.
Pause any item by labeling it `needs-human`.

## Escalation policy — when the human gets pinged

Escalation = `needs-human` label + comment starting `@johnbekele` (GitHub
emails the mention). The run always continues with other work.

Always escalate, never proceed:
- Missing secrets/env vars (state which var, where to get it, where to set it — issue #59 is the pattern)
- Destructive or hard-to-reverse changes (deleting collections/fields/features/endpoints, force-push, history rewrite, auth-semantics changes)
- Spending money or creating external accounts
- Security judgment calls (loosening validation, exposing data, changing roles)
- CI still red after 3 fix attempts on one PR
- Requirements ambiguous between materially different designs

The wrapper itself also escalates: disk critically low, broken gh auth,
network-dead git, or stages failing two days in a row.

## Hard safety rules (all stages)

- NEVER merge with red/pending required checks; never bypass branch protection.
- NEVER run destructive Mongo ops outside the local `pokojowo_dev` DB.
- NEVER commit secrets; `.env` and `private_uploads/` stay untracked.
- NEVER touch production deploys (Render/Vercel deploy from main by themselves).
- Rotate nothing, revoke nothing, delete no external resources.

## Repo conventions (all stages)

- Beanie stores camelCase aliases — raw Mongo queries must use alias names.
- Static routes before `/{id}` routes in every router.
- Every UI string in BOTH `locales/en/` and `locales/pl/`.
- New model fields Optional with safe defaults (no migration framework).
- Match-payload changes additive only (mobile compatibility).
- Test battery before any PR: `pytest -q` green, live verification against the
  `pokojowo-mongo` container with the test users (lv@/t1@/leg@/admin@test.com,
  `Passw0rd!123`), `npm run build` (web), `tsc --noEmit` ≤3 errors (mobile).

## Ops runbook

- **Logs:** `~/pokojowo-autopilot/logs/YYYY-MM-DD.log` (pruned after 30 days).
- **Run manually:** `~/pokojowo-autopilot/run.sh` or a single stage:
  `~/pokojowo-autopilot/run.sh --stage review`.
- **Pause:** `touch ~/pokojowo-autopilot/PAUSED` (delete to resume), or comment
  out the line in `/etc/cron.d/pokojowo-autopilot`.
- **Tune models/caps:** `~/pokojowo-autopilot/config.env`.
- **Missed days:** if the box is down at 06:37 nothing runs; work simply rolls
  to the next morning. No catch-up runs.
- **CI gate:** `.github/workflows/ci.yml`; required checks on `main`:
  Backend tests (pytest), Web build (vite), Mobile typecheck (tsc).
- **Daily report:** issue #67 (Autopilot run log).
