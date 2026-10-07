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
