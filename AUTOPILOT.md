# Pokojowo Autopilot Playbook

Instructions for the scheduled Claude session that runs the daily autonomous
development loop on this repo. Follow this document exactly.

## The loop (each daily run)

1. **Recover state.** `git checkout main && git pull`. Check open PRs with the
   `autopilot` label from previous runs: if CI is green, merge them
   (`gh pr merge N --merge --delete-branch`) and close their issues; if CI is
   red, fix the branch (max 3 fix attempts, then escalate — see below).
2. **Pick work.** Take the oldest open issue labeled `ready` + `autopilot`.
   Skip issues labeled `needs-human`. If no `ready` issue exists, post a
   comment on the tracking issue saying the queue is empty, and stop.
3. **Implement.** One issue per run per agent. For independent issues (touching
   disjoint files), up to 3 parallel agents with `isolation: "worktree"`.
   - Branch naming: `auto/<issue-number>-<slug>`.
   - Follow repo conventions: camelCase Mongo aliases in raw queries; static
     routes before `/{id}` routes; every new UI string in BOTH
     `locales/en/` and `locales/pl/`; new User/Listing fields Optional with
     safe defaults (no migrations); match-payload changes additive only.
4. **Test end-to-end locally before pushing.**
   - Backend: `.venv/bin/pytest -q` from `pokojowo-fastapi/` (must be green;
     add tests for new scoring/trust/pure logic).
   - Live check: start Mongo container `pokojowo-mongo` + backend
     (`.venv/bin/uvicorn main:socket_app --port 3000`), exercise the changed
     endpoints with the test users (`lv@`, `t1@`, `leg@`, `admin@test.com`,
     password `Passw0rd!123`), verify the acceptance criteria from the issue.
   - Web: `npm run build` in `pokojowo-frontend/`.
   - Mobile (if touched): `npx tsc --noEmit` — error count must stay ≤ 3.
5. **PR + CI gate.** Open a PR with `Closes #N`, label `autopilot`, body must
   include what was verified. Wait for CI (poll `gh pr checks`). Green → merge
   with `--merge --delete-branch`, label the issue `autopilot-done`. Red →
   read the failing log, fix, push (max 3 attempts).
6. **Report.** Comment on the tracking issue with a short run summary:
   issues shipped, PRs merged, anything escalated.

## Escalation policy — when to stop and alert the human

Alert = add label `needs-human` to the issue/PR and post a comment starting
with `@johnbekele` explaining exactly what is needed and why. GitHub emails
the mention. Then move on to the next issue (never block the whole run on one
escalation).

**Always escalate, never proceed:**
- A required secret/environment variable is missing (Twilio, SMTP, API keys,
  new env vars a feature needs). Say WHICH var, WHERE to get it, WHERE to set
  it (see issue #59 for the pattern).
- Anything destructive or hard to reverse: deleting a collection, dropping or
  renaming existing DB fields, removing a feature or endpoint that clients
  use, force-push, rewriting git history, changing auth/token semantics for
  existing sessions.
- Spending money or creating external accounts (SMS provider, paid tiers).
- Security-sensitive judgment calls (loosening validation, exposing new data
  publicly, changing permissions/roles).
- CI still red after 3 fix attempts on the same PR.
- The issue's requirements are ambiguous in a way that changes the design
  (don't guess between two materially different interpretations).

**Never escalate for (just handle it):**
- Ordinary bugs found while implementing (fix them, note in the PR).
- Adding dependencies that are free, well-known, and needed by the issue.
- Adding new optional model fields, endpoints, UI components, translations.
- Test data setup, dev-mode fallbacks that log instead of calling paid APIs.

## Hard safety rules

- NEVER merge a PR with red or pending required checks. Branch protection
  enforces this — do not bypass it with admin privileges.
- NEVER run destructive Mongo operations (`drop`, `deleteMany` without a
  narrow filter) against any database other than the local `pokojowo_dev`.
- NEVER commit secrets. `.env`, `private_uploads/` stay untracked.
- NEVER touch production deploys (Render/Vercel deploy on merge by
  themselves; that is the only deployment path).
- Rotate nothing, revoke nothing, delete no external resources.

## Issue intake (when the human drops a big idea)

When an issue is labeled `autopilot` but NOT `ready`, treat it as a feature
brief: explore the codebase, write a detailed implementation plan as a comment
(files, endpoints, data model, acceptance criteria, i18n keys, risks), split
it into child issues each small enough for one run, label the children
`ready` + `autopilot`, and link them from the parent. Do NOT implement in the
same run you planned — the human gets one day to veto the plan (they can
label the parent `needs-human` to pause it).

## Environment quick reference

- Backend venv: `pokojowo-fastapi/.venv` (Python 3.11). Server:
  `.venv/bin/uvicorn main:socket_app --port 3000` (run in background).
- Mongo: docker container `pokojowo-mongo` (start with
  `docker start pokojowo-mongo` if stopped), DB `pokojowo_dev`.
- Tests: `.venv/bin/pytest -q` — pure unit tests, no Mongo needed.
- Repo: single git repo, remote `johnbekele/pokojowo-web-project`.
  Git identity is configured repo-locally.
- Tracking issue for run reports: see the issue titled
  "Autopilot run log" (create it if missing, label `autopilot`).
