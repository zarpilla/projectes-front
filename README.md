# ESSTRAPIS frontend

The web application of **ESSTRAPIS**, management software for cooperatives, associations and other organisations of the Social and Solidarity Economy (ESS, *Economia Social i Solidària*).

This repository is the frontend, built with Vue 3. It talks to the API in [projectes-back](https://github.com/zarpilla/projectes-back).

- Website: https://esstrapis.org
- Backend: https://github.com/zarpilla/projectes-back

![ESSTRAPIS](/public/projectescoop.png?raw=true)

## What is ESSTRAPIS?

ESSTRAPIS brings the day-to-day management of an organisation into one place: its projects, the hours each person puts into them, and the money that comes in and goes out. Everything revolves around the project, so that at any moment you can see whether it is going as budgeted: what was expected to be earned, spent and worked, and what actually was.

| Area | What it covers |
| ---- | -------------- |
| **Projects** | Projects with phases and budgets, parent and child projects, planning (Gantt), tasks, contacts, quotes |
| **Time** | Hours per person, task and project, workday log, hour balance, payroll and advances |
| **Money** | Issued and received invoices, expenses, VAT, treasury and forecasts |
| **E-invoicing** | VERI\*FACTU records and electronic invoices to the public administration through FACe |
| **Grants** | Economic status of each grant and its justifications |
| **Logistics** | Orders, pickup points, routes and incidences, for the organisations that deliver goods |
| **Data** | Pivot tables and charts, CSV and Excel export |

Who uses it:

- **Members and workers** log the hours they put into each project, clock their workday and check their hour balance.
- **Project coordinators** create projects, budget them by phase and follow their planning and tasks.
- **Administration and finance** issue and record invoices, control VAT, advances and treasury, and prepare grant justifications.
- **Logistics teams**, in some organisations, enter, deliver and invoice orders.

Each user only sees the menu sections their permissions allow.

ESSTRAPIS is used by cooperatives such as Resilience Earth, Arran de Terra, La Diligència, Raiels, L'Arada and Núria Social. The user manual, in Catalan, is in [manual/ca](manual/ca/README.md).

## Stack

- Vue 3, Vue Router and Pinia (`src/stores/main.js`)
- Buefy and Bulma for the interface
- Vite for the build, Vitest for unit tests, Playwright for browser checks

## Getting started

You need Node 20.19 or later (`nvm use` reads `.nvmrc`) and a running [backend](https://github.com/zarpilla/projectes-back).

```bash
npm install

# settings
cp .env.example .env

# dev server with hot reload at http://localhost:8080/stats/
npm run dev
```

| Variable | Meaning |
| -------- | ------- |
| `VUE_APP_API_URL` | URL of the backend |
| `VUE_APP_RESET_PASSWORD` | Password reset URL sent by email |
| `VUE_APP_PATH` | Public path the app is served under, `/stats/` by default |

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run test:unit` | All unit tests in `tests/unit/` |
| `npx vitest run tests/unit/<file>.spec.js` | One test file |
| `npm run lint:vue3` | Check that no Vue 2 APIs crept back in |

## Project layout

| Path | Contents |
| ---- | -------- |
| `src/views/` | One component per screen |
| `src/components/` | Shared components and the big forms |
| `src/domain/` | Business rules taken out of the forms: document totals, order validation, project documents and treasury |
| `src/service/` | API calls and helpers |
| `tests/unit/` | Vitest tests |
| `tools/smoke/` | Playwright browser checks and end-to-end tests |
| `manual/` | User manual |

## Documentation

- [AGENTS.md](AGENTS.md): conventions for tests and browser checks
- [DOCKER_SETUP.md](DOCKER_SETUP.md): how one Docker image is configured at runtime for each environment
- [tools/smoke/README.md](tools/smoke/README.md): browser checks and end-to-end tests

## Deployment

One Docker image serves every organisation; its settings are injected at runtime. A push to `master` runs the tests, builds the image and deploys it. Changes to docs, the manual, `deploy/` and Markdown files don't trigger a build.

## Contributing

Every bug fix or feature should come with a test that fails before the change and passes after it. Issues are tracked at https://tiquets.esstrapis.org.

## License

[GNU General Public License v3](LICENSE)
