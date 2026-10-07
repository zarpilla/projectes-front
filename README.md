# ESSTRAPIS Front  — Gestió de projectes per a coopertives

- Projectes
- Planificació
- Hores dedicades
- Tasques
- Facturació
- Tresoreria
- Contactes
- Pressupostos


![ESSTRAPIS](/public/projectescoop.png?raw=true)
## Build Setup

Requires Node 20.19+ (`nvm use` picks it up from `.nvmrc`). Built with Vite;
state lives in a Pinia store (`src/stores/main.js`).

```bash
# install dependencies
$ npm install

# set environment variables
$ cp .env.example .env
$ nano .env

# VUE_APP_API_URL [Backend URL](https://github.com/zarpilla/projectes)
# VUE_APP_RESET_PASSWORD (Password reset URL for email)
# VUE_APP_PATH (this public URL)

# serve with hot reload at localhost:8080/stats/
$ npm run dev

# build for production (into dist/)
$ npm run build

# check that no Vue 2 APIs crept back in
$ npm run lint:vue3

```

## Licensing
- Licensed under GLP v3
