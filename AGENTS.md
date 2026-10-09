# projectes-front (Vue 3 + Vite + Buefy)

## Commands
- `npm run dev` — Vite dev server
- `npm run test:unit` — Vitest (all `tests/unit/**/*.spec.js`)
- `npx vitest run tests/unit/<file>.spec.js` — a single test file
- `npm run lint:vue3`

## Tests
Every bug fix or feature should come with a test that fails before the change and passes after it. If that is not reasonable, say why in the issue/PR.

- Tests live in `tests/unit/`, named `<topic>.spec.js`. `tests/unit/setup.js` provides `window.APP_CONFIG`.
- Pure logic (services, helpers in `src/service/`): plain Vitest tests.
- Components: mount with `@vue/test-utils` and the Buefy plugin (see `tests/unit/DocumentLines.spec.js`). Mock API calls with `vi.mock` / `vi.fn` and await them with `flushPromises`.
- Snapshots go in `tests/unit/__snapshots__/`. Only update them when the change is intended.
- When a test covers an issue, reference its id in a comment (e.g. `issues/001`).
- `src/domain/` holds business rules taken out of the big forms (document totals, order validation, project documents/treasury). Their tests were recorded from the old component code over generated data (seeded PRNG) and must stay bit-for-bit equal unless a change is intended.

## Browser checks (`tools/smoke/`, Playwright)
A separate package (`cd tools/smoke && npm install`, Node 20+), run against a local backend and a running dev server. Credentials go in `tools/smoke/.env.smoke` (`SMOKE_USER`, `SMOKE_PASSWORD`); record ids in `params.json` / `forms.local.json` (see the `*.example.json` files). All of these, the screenshots and the recorded payloads are git-ignored (tenant data).
- `npm run baseline` / `npm run compare`: visit every route, compare screenshots and uncaught errors against a baseline recorded from a reference build (`SMOKE_BASE_URL`, `SMOKE_BASELINE_DIR`).
- `npm run forms:record` / `npm run forms`: save flows of the critical forms (projects, invoices/expenses, orders). Writes are intercepted and never reach the backend; the payloads must match those recorded from the reference build.
- Record and compare on the same day against the same database: the data is live.
- `node style-diff.mjs <route>`: computed-style differences between two running builds.
Use these for refactors and UI-library upgrades. Bug fixes still need a Vitest test. Ask before adding other e2e tooling.
