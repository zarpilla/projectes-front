# Manual d'ESSTRAPIS — temes

Pla del manual (vegeu la skill `manual` a `.claude/skills/manual/`). Un tema = un capítol (`ca/NN-slug.md`) amb les seves captures (`ca/img/NN-slug/`).
Estat: `pending` · `partial` · `done (AAAA-MM-DD)`. Permís = permís d'usuari que dona accés a la pantalla.

Dades per a les captures: **resilience** i **arrandeterra** (projectes, fases, hores; blocs A–E, G) · **diligencia** (logística, bloc F).

## A. Introducció

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 00 | Què és ESSTRAPIS | Per a qui és (cooperatives), què resol: projectes, hores, diners, tresoreria, logística. Mòduls i com es relacionen (projecte → fases → hores, ingressos, despeses). Glossari. | — | — | done (2026-10-08) |
| 01 | Primers passos | Accés, inici de sessió, contrasenya oblidada, el menú lateral i les seccions, la barra superior, perfil i canvi de contrasenya, registre de canvis, documentació. | `/`, `/forgotten-password`, `/reset-password`, `/profile`, `/changelog`, `/documentacio` | — | pending |
| 02 | Usuaris, rols i permisos | Què veu cada perfil (`projects`, `hours`, `orders`, `orders_admin`, `orders_delivery`, `admin`), per què el menú canvia segons l'usuari. | `/admin/users` | admin | pending |

## B. Projectes

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 03 | Llistat de projectes | Cercar, filtrar per estat/àmbit/any, columnes, exportar a Excel. | `/projectes` | projects | pending |
| 04 | Crear i editar un projecte | Dades generals (codi, estat, àmbit, coordinació, dates, clients, tipus, probabilitat, estratègies, intercooperació, àmbit territorial), notes internes, projecte d'estructura, despesa indirecta. | `/project/:id` | projects | pending |
| 05 | Fases i pressupost del projecte | Fases, previsió d'ingressos i despeses, hores estimades, resultat original / previst / executat, periodificació d'ingressos i despeses. | `/project/:id` | projects | pending |
| 06 | Projectes mare i fills | Agrupar projectes, moure un projecte, com sumen els imports. | `/project/:id` | projects | pending |
| 07 | Subvencions i justificacions | Expedient, imports per any, import a justificar (nòmines, factures indirectes), cofinançament, entitat líder, dates; pantalles de justificació i de subvencions. | `/project/:id`, `/justifications`, `/grants` | projects | pending |
| 08 | Documents del projecte | Adjuntar i consultar documents d'un projecte. | `/project/:id` | projects | pending |
| 09 | Planificació (Gantt) | Diagrama de Gantt del projecte i previsió de dedicació. | `/project/:id`, `/stats-previsio-gantt` | projects | pending |
| 10 | Tasques (kanban) | Tauler de tasques, estats, assignar persones, vistes desades. | `/tasks` | projects | pending |
| 11 | Contactes | Clients i proveïdors, tipus de contacte, unificar duplicats, DIR3 per a l'administració pública. | `/contacts`, `/contact/:id`, `/client/:id` | projects | pending |
| 12 | Pressupostos | Crear un pressupost, línies, PDF, convertir-lo en projecte/factura. | `/quotes`, `/quote/:id` | projects | pending |

## C. Hores i persones

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 13 | Imputar hores dedicades | Calendari setmanal, imputar a projecte/fase i tipus de dedicació, comptador de temps, dietes. | `/dedicacio` | hours | pending |
| 14 | Registre de jornada | Fitxar entrada i sortida, jornada diària, incidències de jornada. | `/registre-jornades` | hours | pending |
| 15 | Persones i jornades laborals | Jornada de cada persona, cost/hora, festius d'usuari. | `/working-day`, `/admin/user-festive` | projects | pending |
| 16 | Saldo d'hores i hores anuals | Hores previstes vs. treballades, saldo per persona i any. | `/dedicacio-saldo`, `/dedicacio-summary` | projects | pending |

## D. Diners

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 17 | Ingressos: factures emeses | Crear factura, sèries, línies i IVA, assignar a projecte, PDF, enviar, cobrament, factures rectificatives, altres ingressos. | `/emitted-invoices`, `/document/:id/:type`, `/invoice/:id/:type`, `/pdf/:id/:type` | projects | pending |
| 18 | Facturació electrònica: Verifactu i FACe | Què és Verifactu, cadena de registres, declaració; enviament de factures a l'administració per FACe i la seva cua. | `/verifactu`, `/admin/verifactu*`, `/admin/face-queue` | projects / admin | pending |
| 19 | Despeses: factures rebudes | Registrar factures de proveïdors i altres despeses, tipus de despesa, assignar a projecte/fase, pagament. | `/received-invoices`, `/document/:id/:type` | projects | pending |
| 20 | Bestretes (nòmines) | Bestretes i nòmines per període, com s'imputen als projectes segons les hores. | `/salary` | projects | pending |
| 21 | IVA | Resum d'IVA repercutit i suportat per trimestre. | `/vat` | projects | pending |
| 22 | Tresoreria | Previsió de tresoreria, comptes bancaris, anotacions manuals, validació. | `/tresoreria` | projects | pending |
| 23 | Importar, exportar i Contasol | Importar dades (CSV), exportar, enviar clients/proveïdors/factures a Contasol. | `/import-export`, `/contasol` | projects | pending |

## E. Consulta de dades (informes)

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 24 | Com funcionen les taules dinàmiques | Files, columnes, filtres, valors, desar vistes, exportar a Excel. Base per a tots els informes. | `/stats-projectes` | projects | pending |
| 25 | Informes de projectes i econòmics | Projectes, ingressos/despeses, despeses, previsió econòmica, preu hora, estratègies, intercooperació. | `/stats-projectes`, `/stats-economic-detail`, `/stats-despeses`, `/forecast`, `/price-hour`, `/stats-estrategies`, `/stats-intercoop` | projects | pending |
| 26 | Informes de dedicació | Gràfics i taula de dedicació, % de dedicació real, previsió vs. real. | `/dedicacio-charts`, `/stats-dedicacio`, `/stats-real-gantt`, `/stats-previsio-hores` | hours / projects | pending |

## F. Logística (comandes)

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 27 | Visió general de la logística | Actors (proveïdor, punt d'entrega, punt de consum, transport), flux d'una comanda, perfils `orders`, `orders_admin`, `orders_delivery`. | — | orders* | pending |
| 28 | Comandes (proveïdor) | Crear comanda, validacions, imprimir etiquetes, importar comandes, seguiment. | `/orders`, `/order/:id`, `/order/view/:id` | orders | pending |
| 29 | Punts d'entrega i de consum | Gestió de punts d'entrega i punts de consum. | `/user-contacts`, `/contact-user/:id`, `/pickup-points` | orders | pending |
| 30 | Poblacions, rutes i dies | Poblacions i rutes, dies de ruta, festius de ruta, tarifes. | `/city-route`, `/city-route-delivery`, `/route-days` | orders / orders_admin | pending |
| 31 | Dipòsits, transferències i operacions | Dipòsits, transferències, operacions de comandes, lectura de QR. | `/deposits`, `/transfers`, `/order-operations` | orders_admin / orders_delivery | pending |
| 32 | Incidències i contacte | Obrir i seguir incidències, formulari de contacte. | `/incidences`, `/contact-us`, `/incidences-stats` | orders | pending |
| 33 | Facturació de la logística | Sòcies, facturar comandes, factures de proveïdors, taula de comandes. | `/partners`, `/orders-invoice`, `/provider-invoices`, `/orders-stats` | orders_admin | pending |

## G. Administració

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 34 | Configuració general de l'entitat | Dades fiscals, logo, opcions generals. | `/admin/me` | admin | pending |
| 35 | Taules auxiliars | Anys, àmbits, estats i probabilitats de projecte, estats de tasca, estratègies, formes jurídiques, mètodes de pagament, regions, sectors, sèries, tipus (contacte, dedicació, despesa, ingrés, projecte), entitats socials, comptes bancaris. | `/admin/*` | admin | pending |
| 36 | Inici d'any i manteniment | Preparar un any nou (anys, festius, sèries), recalcular. | `/admin/year`, `/recalculate` | admin | pending |
