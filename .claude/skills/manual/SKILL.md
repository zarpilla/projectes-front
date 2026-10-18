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
  manual.json            # product, manuals, their modules and the roles (metadata vocabulary)
  check-meta.mjs         # checks every chapter's metadata block: `node manual/check-meta.mjs`
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
5. Fill or update the chapter's metadata block (see *Metadata*) and run `node manual/check-meta.mjs`.
6. Set the topic to `done` in `TOPICS.md` with today's date, or `partial` with a note of what is missing.
7. Report: files written, anything in the app that looked broken or confusing (offer to record it with
   the `issue` skill — don't fix app code from this skill).

## Environment and data safety

The manual will be shared, so screenshots never show real tenant data. They are taken
against **anonymized copies** of real tenants, served by a second backend and a second front that run
next to the everyday dev servers (which point at real data, and whose `.env` may point at production).

| Data | Use for | Source db | Anonymized v5 copy | API / front |
|---|---|---|---|---|
| resilience | projects, phases, hours, money (blocks A–E, G) | `resilience` (v3, ETL) | `projectes_v5_manual` | 1338 / 8081 |
| diligencia | logistics (block F) | `projectes_v5_diligencia` (v5, cloned) | `projectes_v5_manual_logistica` | 1340 / 8082 |

Making the resilience copy (ETL from v3; all from `../projectes-v5`, `nvm use 20`, db credentials from its `.env`):
1. `CREATE DATABASE <copy> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`.
2. Boot Strapi once on it to create the schema, then stop it:
   `CRON_ENABLED=false PORT=1338 DATABASE_NAME=<copy> npx strapi start`.
3. `node tools/etl/migrate.js --from <v3 db> --to <copy>`.
4. `mysql <copy> < manual/capture/anonymize.sql` — **once**: it also multiplies money by a constant.
5. `MYSQL_PWD=… manual/capture/check-leaks.sh <v3 db> <copy> <db user>` must print `no leaks found`.
   When it finds something, extend `anonymize.sql` (fix the copy by hand for that part) and re-check.
6. Logins keep their passwords; emails become `persona<id>@exemple.coop` (look the id up in the source db).

The logistics copy was made differently (2026-10-18): the local v5 db `projectes_v5_diligencia` (the one the
everyday API on 1337 serves; only read from it) is more current for orders than v3, so it was cloned, not migrated:
1. `CREATE DATABASE projectes_v5_manual_logistica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, then
   `mysqldump --single-transaction --no-tablespaces projectes_v5_diligencia | mysql projectes_v5_manual_logistica`.
2. `anonymize.sql` once. Its "logistics" section (idempotent; contact/user renames only run when the copy has
   orders, so resilience copies are unaffected) gives delivery points and providers logistics names
   (`Botiga La Placeta`, `Mas Can Demo`…), real towns of the route they are served by, `Carrer Exemple, N`
   addresses, copies them into the order snapshots, and replaces with generic text: order comments and contact
   notes, provider order numbers, incidences and their replies, packages (`orders.lines`), pickup names and
   messages, the contact form messages, document concepts, change-log users; it also clears sessions and tokens.
   To redo only that section on the copy, run the helper functions + that section (it does not touch money).
3. `check-leaks.sh projectes_v5_diligencia projectes_v5_manual_logistica <db user>` → `no leaks found`
   (the script takes a v3 or a v5 source, and skips town names from `cities`).
4. Demo logins (one per profile) got a known password; they are in `.env.manual` as `MANUAL_LOG_USER_ORDERS`
   (provider `persona51`, ~650 orders, transfers, deposits, incidences), `MANUAL_LOG_USER_ADMIN` (`persona30`,
   `orders_admin`), `MANUAL_LOG_USER_DELIVERY` (`persona69`, `orders_delivery`, 7 routes), `MANUAL_LOG_PASSWORD`,
   `MANUAL_LOG_API_URL` and `MANUAL_LOG_BASE_URL`. Other logins keep their (real) passwords.
5. The data ends on 2026-10-06 (last route date and last order): captures should set `today` around then.

Running for a session (check first; ask before starting anything that is already running elsewhere):
- API: `cd ../projectes-v5 && CRON_ENABLED=false PORT=1338 DATABASE_NAME=projectes_v5_manual npx strapi start`
  (cron off: no task e-mails, no FACe retries; certificates aren't copied, so nothing reaches AEAT/FACe).
- Front: `VUE_APP_API_URL=http://127.0.0.1:1338 npx vite --port 8081` (a few components read the build-time
  `VUE_APP_API_URL` directly, so the everyday 8080 server can't be reused).
- `start()` in `helpers.mjs` also serves its own `/config.js` (the front reads the API url from it at
  runtime and the dev one points at 1337) and aborts any `/api/` or `/uploads/` request to another origin.
- `manual/capture/.env.manual` holds `MANUAL_USER`, `MANUAL_PASSWORD`, `MANUAL_BASE_URL`
  (`http://localhost:8081/stats/`) and `MANUAL_API_URL` (`http://127.0.0.1:1338`). Never print the password.
- Logistics (block F): `CRON_ENABLED=false PORT=1340 DATABASE_NAME=projectes_v5_manual_logistica npx strapi start`
  and `VUE_APP_API_URL=http://127.0.0.1:1340 npx vite --port 8082`; credentials in the `MANUAL_LOG_*` variables.

Before publishing a chapter, look at every screenshot: the leak check covers names, NIFs, e-mails,
phones and IBANs, not free text in places nobody thought of. Kept on purpose (not personal): the
entity's generic configuration (project states, dedication types, bank names; for logistics: route,
product, rate and sector names, towns and regions). Project scopes, project types, activity types and
strategy codes were named after the entity's own projects and programmes, which identifies it (the user,
2026-10-18): `anonymize.sql` keeps only the generic ones and renames the rest, and `check-leaks.sh` checks
them (the generic names it keeps are in `leak-allow.txt`). A new generic name goes in both lists.

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
- The demo data ends in summer 2026: `start(page, slug, { today: '2026-06-17' })` moves the browser's
  clock there, so "today", the current month and the treasury's year have data.
- With the cron off, the copy's projects stay `dirty` and every project page warns that its totals are
  being updated. Refresh them once per copy (from `../projectes-v5`, the copy's API can stay up):
  a script that loads Strapi (`createStrapi(await compileStrapi()).load()`) and calls
  `require('./src/api/project/services/totalsRefreshScheduler').processDirty()`, run with
  `DATABASE_NAME=<copy> PORT=1339 CRON_ENABLED=false`. Done on `projectes_v5_manual` on 2026-10-17.
- Many projects warn about lines without a date; pick example projects without the warning unless the
  chapter is about it (642 is a good all-positive active one).
- `getByRole('button', { name: 'Plega-ho tot' })` also matches «Desplega-ho tot» (and `exact` fails
  because of the icon glyph): use `locator('button', { hasText, hasNotText })`.
- Find good example records with SQL on the copy (e.g. a project whose original/forecast/actual results
  are all positive) and note their ids at the top of the script.
- `shot()` hides broken images (the copy has no uploads: logos, attachments) and removes snackbars left by
  earlier steps; pass `{ keepToasts: true }` when the picture is about one.
- Links that open a new tab (`window.open`) don't get `start()`'s API redirection: `page.goto` the same route.
- Some buttons write as soon as they are clicked: **Comptador** creates a timer (delete it with «Elimina
  Comptador»), **Anul·la i rectifica…** only prepares an unsaved draft. The manual user can't delete uploads through
  the API: scripts that upload files say how to clean them up in SQL (see `08-documents-projecte.spec.mjs`).
- Kendo pivot rows unfold by clicking the icon before the header text, e.g.
  `.k-pivot-rowheaders` › `getByText('Projectes (TOTS)')` › preceding `span.k-icon`.
- No anonymized data for: intercooperation, Verifactu/FACe records, manual justifications, logistics. Chapters
  describe those parts without a picture.

After running, read every PNG: it shows what the chapter says, the data has loaded, nothing real leaked.

## Chapter

`manual/ca/NN-slug.md`, written in Catalan for end users (cooperative workers, not developers):

```markdown
---
title: "Títol del tema"
description: "Una frase: què s'hi explica."
product: esstrapis
manual: usuari
module: projectes
order: NN
roles: [projects]
routes: ["/projectes"]
lang: ca
updated: AAAA-MM-DD
---
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

## Metadata

Every chapter starts with a metadata block, so a future documentation viewer (inside ESSTRAPIS, and a single
portal for all the docs) can list, filter and link chapters without reading their text. The levels are
**product › manual › module › chapter**; `manual/manual.json` lists the allowed manuals, modules and roles.

| Key | Value |
|---|---|
| `title` | The chapter title without its number, in double quotes. |
| `description` | One sentence in Catalan for lists and search results, in double quotes. |
| `product` | `esstrapis`. |
| `manual` | `usuari` (the user manual). A new kind of manual (admin, technical…) is added to `manual.json` first. |
| `module` | The TOPICS.md block: `introduccio`, `projectes`, `hores`, `diners`, `informes`, `logistica`, `administracio`. |
| `order` | The chapter number (the glossary is `100`, last of `introduccio`). Unique within a manual and language. |
| `roles` | Permissions that may read it: any of them is enough. The union of the permissions in the chapter's «Permís necessari» line; `[]` = any logged-in user. |
| `routes` | The app routes the chapter explains (TOPICS.md *Pantalles*), as in `src/router/index.js` (`:id` params; a trailing `*` = every route with that prefix). For contextual help. |
| `lang` | `ca` (same as the folder). |
| `updated` | Date of the last content change (`YYYY-MM-DD`). |

Keep the block a plain YAML subset (one `key: value` per line, quoted strings, inline lists) — the checker reads
it without a YAML library. The «> Permís necessari» line stays in the Markdown for the team (it explains the nuances that `roles`
can't), but the docs viewer (esstrapis-docs) hides it and shows `roles` as badges, named by each role's
`audience` in `manual.json`.

Style: informal "tu" or impersonal — pick impersonal and keep it; UI labels in **bold** and exactly as
shown; no code, field API names or English jargon; explain domain terms (bestreta, periodificació,
justificació, intercooperació) the first time they appear and add them to `manual/ca/00-glossari.md`.
Keep `manual/ca/README.md` as the manual's table of contents, generated from `TOPICS.md`.

## Git

`manual/` is versioned with the front (branch rules in the repo's notes apply; don't commit or push unless
asked). `manual/capture/.gitignore` keeps `node_modules/`, `results/` and `.env.manual` out.
