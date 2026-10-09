# Route smoke test

Safety net for the Vue 2 → Vue 3 migration (there are no other tests). It logs
in, visits every route in `src/router/index.js` and records uncaught errors,
console errors, Vue warnings and a full-page screenshot.

## Setup (Node 20+)

```sh
cd tools/smoke
npm install && npx playwright install chromium
cp params.example.json params.json   # real ids for routes with :params
printf 'SMOKE_USER=...\nSMOKE_PASSWORD=...\n' > .env.smoke
```

Run the frontend against a **local** backend. Requests to `/api/` on any
other host are blocked and fail the test, because `.env` can point at production:

```sh
VUE_APP_API_URL=http://127.0.0.1:1337 npm run serve   # from the repo root
```

## Usage

Record the baseline from an **untouched** checkout of the old code, served on a
second port, so it can't pick up in-progress changes:

```sh
git worktree add ../front-baseline v5 && cd ../front-baseline && npm ci
VUE_APP_API_URL=http://127.0.0.1:1337 npx vue-cli-service serve --port 8081
# then, in tools/smoke:
SMOKE_BASE_URL=http://localhost:8081/stats/ npm run baseline
```

Give each checkout its own `node_modules`. The old one needs
`NODE_OPTIONS=--openssl-legacy-provider` (webpack 4).

| Command | What it does |
| --- | --- |
| `npm run baseline` | On the Vue 2 code: writes `baseline/*.png` (local only, contains tenant data) and `baseline/known-errors.json` (errors the app already throws). |
| `npm run compare` | Fails on new uncaught errors and on screenshots that drift more than 3 %. |
| `npm test` | Same checks without the screenshot comparison. |
| `SMOKE_STRICT=1 npm test` | Also fails on any Vue warning or console error. |

Set `SMOKE_BASELINE_DIR=baseline-vue3` (for example) to record and compare against
a second baseline without touching `baseline/`.

The per-route report (errors, Vue warnings, console errors, where each route
landed) is written to `reports/console-<label>.json`; `SMOKE_LABEL` names it.

# End-to-end tests (`e2e/`)

Unlike the checks above, these **save for real**, and check both the screen and what
the API stored. Each spec file logs in once and runs its tests in order (later tests
use what earlier ones created). Records are named `E2E <run stamp> …`, so runs don't
collide. Shared setup and helpers are in `e2e/helpers.mjs`.

| Spec | Covers |
| --- | --- |
| `core.spec.mjs` | project creation wizard, original phases and "Tancar pressupost", project edition, execution phases, hours in "Hores dedicades" → "Hores executades (h)", Persones work periods, draft emitted invoice and received invoice assigned to budget lines |
| `hours-costs.spec.mjs` | a work period's cost/hour prices the activities ("Hores executades" €), changing it re-prices them, overlapping periods are refused, "Crear bestretes" (payroll amounts and dates, no duplicates), "Moure hores entre projectes" |
| `money.spec.mjs` | issuing an invoice ("Emetre factura": series number, code, can't be deleted), "Cobrada" → "Factura cobrada" in Tresoreria, the IRPF movement of a received invoice, manual treasury movements (validate, delete), quotes, "Nou Contacte" from a document |
| `admin.spec.mjs` | creating a user in #/admin/users, what an hours-only user sees and may do, login errors, token refresh, contacts (create, edit, delete, in-use guard), tasks kanban (create, drag, archive), every ADMINISTRACIÓ screen loads, admin entities (strategy code name) |

### Known bugs

Tests for confirmed bugs are marked `test.fail()` with a `KNOWN BUG` comment: they
pass while the bug is there and fail once it is fixed, as a reminder to remove the
mark. Bugs a flow runs into without being its subject are reported as "known error"
annotations instead (`KNOWN_ERRORS` in `helpers.mjs`, `KNOWN_BROKEN_ADMIN` in
`admin.spec.mjs`). Run with `--reporter=list` to see them.

## A throwaway database

The tests only write to a copy of an **anonymized** tenant (failure screenshots and
traces then hold no real data), served by its own backend and front:

```sh
# from tools/smoke; MySQL credentials from ../projectes-v5/.env
MYSQL_PWD=... ./e2e-db.sh projectes_v5_manual projectes_v5_e2e   # stop the e2e backend first
# from ../projectes-v5
CRON_ENABLED=false PORT=1339 DATABASE_NAME=projectes_v5_e2e \
  EMAIL_PROVIDER=nodemailer SMTP_HOST=127.0.0.1 SMTP_PORT=9 \
  RESET_PASSWORD_URL='http://localhost:8082/stats/#/reset-password' npx strapi start   # no cron, no real e-mail
# from the front root
VUE_APP_API_URL=http://localhost:1339 npx vite --port 8082
```

`e2e-db.sh` only accepts a target whose name ends in `_e2e`. Besides copying, it:
- adds the `E2E SENTINEL` contact. The tests refuse to write unless the backend has it,
  so they can't touch a real tenant even if the URLs are wrong;
- un-hides the e2e login (a hidden user breaks the new-project form);
- drops the entity logo (uploads aren't copied, and a missing logo file makes every
  new emitted invoice fail).

`projectes_v5_manual` is the anonymized copy made for the user manual (see the manual
skill). Rebuild the e2e copy whenever you want a clean start.

## Running

`.env.e2e` (git-ignored) holds `E2E_USER`, `E2E_PASSWORD`, `E2E_BASE_URL`
(`http://localhost:8082/stats/`) and `E2E_API_URL` (`http://localhost:1339`, must be
local; use the same host name as the front, or the browser won't send the refresh-token
cookie and the session ends after 10 minutes). Then:

```sh
npm run e2e
```

Uncaught page errors fail the test, except for the bugs listed in `KNOWN_ERRORS`,
which are reported as "known error" annotations (and on the console). Remove an entry
once its bug is fixed.

Emitted invoices stay drafts (`ESBORRANY`): the tests never issue them, so nothing
is sent to AEAT/FACe and no invoice number is used.
