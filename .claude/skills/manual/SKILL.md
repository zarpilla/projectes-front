---
name: manual
description: Write the ESSTRAPIS user manual in Catalan as Markdown chapters with screenshots taken with Playwright, one topic per session. Use when the user asks to make, continue or update a manual chapter or its screenshots, or asks which manual topics are pending.
---

# ESSTRAPIS user manual (in Catalan)

ESSTRAPIS is the project, time, money and logistics management app for cooperatives, made of
this repo, `projectes-front` (Vue 3 + Vite + Buefy, served at `#/...` routes), and the Strapi 5 backend in
the sibling repo `../projectes-v5`. All paths below are relative to the `projectes-front` root.
The manual is large and is built over several days, one or a few topics per session.

Everything lives in `manual/`:

```
manual/
  TOPICS.md              # the topic list and its status — the plan; read it first
  ca/NN-slug.md          # one chapter per topic, in Catalan
  ca/img/NN-slug/*.png   # its screenshots
  capture/               # Playwright package that takes the screenshots
    scripts/NN-slug.spec.mjs
```

## Session flow

1. Read `manual/TOPICS.md`. Work on the topic the user names, or else the first `pending` one. Do one topic
   at a time and finish it before the next.
2. Learn the topic from the code, not from guesses: the route in `src/router/index.js`,
   the menu entry and permission in `src/service/menu.js`, the view in `src/views/` and its components,
   and the backend content type (`../projectes-v5/src/api/<name>/content-types/*/schema.json`) plus any
   controller/service/lifecycle logic that changes what the user sees (calculations, validations, states).
   Note the real UI labels (they are already in Catalan) and use them verbatim.
3. Write the capture script (see *Screenshots*), run it, look at the screenshots.
4. Write the chapter (see *Chapter*) around those screenshots.
5. Set the topic to `done` in `TOPICS.md` with today's date, or `partial` with a note of what is missing.
6. Report: files written, anything in the app that looked broken or confusing (offer to record it with
   the `issue` skill — don't fix app code from this skill).

## Environment and data safety

The manual will be shared, so screenshots never show real tenant data. They are taken
against **anonymized copies** of real tenants, served by a second backend and a second front that run
next to the everyday dev servers (which point at real data, and whose `.env` may point at production).

| Data | Use for | Source (v3 db) | Anonymized v5 copy |
|---|---|---|---|
| resilience | projects, phases, hours, money (blocks A–E, G) | `resilience` | `projectes_v5_manual` |
| diligencia | logistics (block F) | `diligencia` | `projectes_v5_manual_logistica` (not made yet) |

Making a copy (once per source; all from `../projectes-v5`, `nvm use 20`, db credentials from its `.env`):
1. `CREATE DATABASE <copy> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`.
2. Boot Strapi once on it to create the schema, then stop it:
   `CRON_ENABLED=false PORT=1338 DATABASE_NAME=<copy> npx strapi start`.
3. `node tools/etl/migrate.js --from <v3 db> --to <copy>`.
4. `mysql <copy> < manual/capture/anonymize.sql` — **once**: it also multiplies money by a constant.
5. `MYSQL_PWD=… manual/capture/check-leaks.sh <v3 db> <copy> <db user>` must print `no leaks found`.
   When it finds something, extend `anonymize.sql` (fix the copy by hand for that part) and re-check.
6. Logins keep their passwords; emails become `persona<id>@exemple.coop` (look the id up in the source db).

Running for a session (check first; ask before starting anything that is already running elsewhere):
- API: `cd ../projectes-v5 && CRON_ENABLED=false PORT=1338 DATABASE_NAME=projectes_v5_manual npx strapi start`
  (cron off: no task e-mails, no FACe retries; certificates aren't copied, so nothing reaches AEAT/FACe).
- Front: `VUE_APP_API_URL=http://127.0.0.1:1338 npx vite --port 8081` (a few components read the build-time
  `VUE_APP_API_URL` directly, so the everyday 8080 server can't be reused).
- `start()` in `helpers.mjs` also serves its own `/config.js` (the front reads the API url from it at
  runtime and the dev one points at 1337) and aborts any `/api/` or `/uploads/` request to another origin.
- `manual/capture/.env.manual` holds `MANUAL_USER`, `MANUAL_PASSWORD`, `MANUAL_BASE_URL`
  (`http://localhost:8081/stats/`) and `MANUAL_API_URL` (`http://127.0.0.1:1338`). Never print the password.

Before publishing a chapter, look at every screenshot: the leak check covers names, NIFs, e-mails,
phones and IBANs, not free text in places nobody thought of. Kept on purpose (not personal): the
entity's own configuration (project scopes, states, strategies, types, bank names).

Scripts that create or edit records are fine on the copy; say which records a script creates so re-runs
stay consistent (prefer names like `Projecte demo 03`, or delete them at the end of the script). Use a user
whose permissions match the chapter's audience (`hours`-only user for time tracking, `admin` for settings).

## Screenshots

First session only: create `manual/capture/` from the templates next to this skill
(`templates/package.json`, `templates/playwright.config.mjs`, `templates/helpers.mjs`, and
`templates/gitignore` copied as `.gitignore`), then `npm install` there (the Chromium build in
`~/.cache/ms-playwright` is reused). This is a separate package like `tools/smoke`; it is not part of the
app build.

Each topic gets `manual/capture/scripts/NN-slug.spec.mjs`, run from `manual/capture` with
`npx playwright test scripts/NN-slug.spec.mjs`. Helpers from `helpers.mjs`:

- `await start(page, 'NN-slug')` — first line of every script: names the chapter's image folder, points the
  app at `MANUAL_API_URL` and blocks every other backend.
- `login(page, user, password)` — logs in (defaults from `.env.manual`) and waits for the landing page.
- `settle(page, ms)` — wait for the screen's requests and loading spinner to finish, then `ms` more.
- `shot(page, name, options)` — saves `manual/ca/img/NN-slug/NN-name.png`, numbered in order; `options`
  go to `page.screenshot` (`clip`, `fullPage`). Take one for every step the chapter describes.

Rules: 1440×900, ca-ES locale, Europe/Madrid timezone (set in the config). Prefer role/label locators
(`getByRole`, `getByLabel`, `getByText` with the Catalan label) over CSS. Never leave dialogs, toasts or
hover effects half-shown. Crop with `clip` when only one card matters, but check the crop isn't cut off
(some cards overflow sideways).

Lessons so far (see `scripts/00-que-es-esstrapis.spec.mjs`):
- Menu links have an icon glyph in their accessible name: select them by route,
  `aside.locator('a[href="#/tresoreria"]')`; section headers are `aside .menu-label`. To reach a screen,
  `page.goto('#/route')` is enough unless the chapter is about the menu itself.
- Wait for something only the new screen has (its title text), not for a generic button: the previous
  view can stay mounted while the next one loads. Pivot-table screens load the Kendo library first; wait
  for `Taula dinàmica` and `Per defecte`, then scroll `.k-pivot-table` into view.
- The demo hours end in summer 2026: go back with the calendar's `.vc-arrow.vc-prev`.
- Leaving **Tresoreria** breaks navigation on the `vue-3` branch (a bank movement without project renders a
  RouterLink without id). Until that is fixed, make it the last screen of a script.
- Find good example records with SQL on the copy (e.g. a project whose original/forecast/actual results
  are all positive) and note their ids at the top of the script.

After running, read every PNG: it shows what the chapter says, the data has loaded, nothing real leaked.

## Chapter

`manual/ca/NN-slug.md`, written in Catalan for end users (cooperative workers, not developers):

```markdown
# NN. Títol del tema

> Permís necessari: `projects`

Una o dues frases: què és i per a què serveix.

## Abans de començar
Requisits (permisos, dades que han d'existir, configuració prèvia → enllaç al capítol).

## Pas a pas
### 1. ...
Text breu + ![Descripció](img/NN-slug/01-....png)

## Camps i opcions
Taula amb cada camp: nom exacte a la pantalla, què vol dir, si és obligatori.

## Com es calcula
(only when the screen shows computed values: explain the rule taken from the code, in plain words)

## Preguntes freqüents / Errors habituals

## Vegeu també
Enllaços a capítols relacionats.
```

Style: informal "tu" or impersonal — pick impersonal and keep it; UI labels in **bold** and exactly as
shown; no code, field API names or English jargon; explain domain terms (bestreta, periodificació,
justificació, intercooperació) the first time they appear and add them to `manual/ca/00-glossari.md`.
Keep `manual/ca/README.md` as the manual's table of contents, generated from `TOPICS.md`.

## Git

`manual/` is versioned with the front (branch rules in the repo's notes apply; don't commit or push unless
asked). `manual/capture/.gitignore` keeps `node_modules/`, `results/` and `.env.manual` out.
