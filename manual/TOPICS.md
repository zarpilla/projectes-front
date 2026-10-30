# Manual d'ESSTRAPIS — temes

Pla del manual (vegeu la skill `manual` a `.claude/skills/manual/`). Un tema = un capítol (`ca/NN-slug.md`) amb les seves captures (`ca/img/NN-slug/`).
Cada capítol comença amb un bloc de metadades (títol, descripció, mòdul, rols, rutes…) definit a `manual.json`; es comprova amb `node manual/check-meta.mjs`.
Estat: `pending` · `partial` · `done (AAAA-MM-DD)`. Permís = permís d'usuari que dona accés a la pantalla.

Dades per a les captures: **resilience** i **arrandeterra** (projectes, fases, hores; blocs A–E, G) · **diligencia** (logística, bloc F; còpia `projectes_v5_manual_logistica`, API 1340, front 8082).

## A. Introducció

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 00 | Què és ESSTRAPIS | Per a qui és (cooperatives), què resol: projectes, hores, diners, tresoreria, logística. Mòduls i com es relacionen (projecte → fases → hores, ingressos, despeses). Glossari. | — | — | done (2026-10-17) |
| 01 | Primers passos | Accés, inici de sessió, contrasenya oblidada, el menú lateral i les seccions, la barra superior, perfil i canvi de contrasenya, registre de canvis, documentació. (Inici: capítol 37; captures del menú refetes el 2026-10-18.) | `/`, `/forgotten-password`, `/reset-password`, `/profile`, `/changelog`, `/documentacio` | — | done (2026-10-18) |
| 02 | Usuaris, rols i permisos | Què veu cada perfil (`projects`, `hours`, `orders`, `orders_admin`, `orders_delivery`, `admin`), per què el menú canvia segons l'usuari. | `/administracio/users` | admin | done (2026-10-18) |
| 37 | La pàgina d'inici | Accessos fixats amb l'estrella, Tot el menú i cercador, ordenar els accessos, «En entrar, obre», l'estrella del menú lateral, restablir. | `/inici` | — | done (2026-10-18) |

## B. Projectes

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 03 | Llistat de projectes | Cercar, filtrar per estat/coordinació/àmbit, columnes, ordenar, totals, edició ràpida, exportar. | `/projectes` | projects | done (2026-10-17) |
| 04 | Crear i editar un projecte | Assistent de 4 passos (dades, fases, planificació, tancar pressupost), pestanyes, barra de desar, duplicar, esborrar. Dades generals (codi, estat, àmbit, coordinació, dates, clients, tipus, probabilitat, estratègies, intercooperació, àmbit territorial), notes internes, projecte d'estructura, despesa indirecta, facturació (per projecte / per hores) i preu/hora. | `/project/:id` | projects | done (2026-10-30) |
| 05 | Fases i pressupost del projecte | Fases, previsió d'ingressos i despeses, hores estimades, resultat original / previst / executat, periodificació d'ingressos i despeses, projectes facturats per hores (pressupost per hores, per facturar, preu/hora). | `/project/:id` | projects | done (2026-10-30) |
| 06 | Projectes mare i fills | Lligar un fill a la mare, llista de projectes mare, què es veu al projecte mare (resum, fills, fases de consulta, planificació dels fills). | `/project/:id` | projects | done (2026-10-17) |
| 07 | Subvencions i justificacions | Expedient, imports per any, import a justificar (nòmines, factures indirectes), cofinançament, entitat líder, dates; pantalles de justificació i de subvencions. | `/project/:id`, `/justifications`, `/grants` | projects | done (2026-10-18) |
| 08 | Documents del projecte | Adjuntar i consultar documents d'un projecte; pestanya Cobraments i pagaments (documents econòmics i moviments). | `/project/:id` | projects | done (2026-10-18) |
| 09 | Planificació (Gantt) | Diagrama de Gantt del projecte i previsió de dedicació. | `/project/:id`, `/stats-previsio-gantt` | projects | done (2026-10-18) |
| 10 | Tasques | Tauler, llista i calendari; fitxa de tasca (descripció, checklist, documents, comentaris i mencions, prioritat, dates, hores estimades i fetes, imputar hores); tasques recurrents; plantilles; avisos per correu i l'opció de Configuració general; tasques al Gantt. | `/tasks`, `/project/:id` | projects | done (2026-10-17) |
| 11 | Contactes | Clients i proveïdors, tipus de contacte, fitxa, esborrar, DIR3 per a l'administració pública (FACe; sense captura: FACe desactivat a la còpia), pestanya Resum (projectes i documents del contacte), avís de NIF repetit. | `/contacts`, `/contact/:id`, `/client/:id` | projects | done (2026-10-30) |
| 12 | Pressupostos | Crear un pressupost, línies, enviament i acceptació, proforma, PDF. (No hi ha conversió automàtica a projecte o factura.) | `/quotes`, `/quote/:id` | projects | done (2026-10-18) |

## C. Hores i persones

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 13 | Imputar hores dedicades | Calendari, taula i tot; afegir, editar i esborrar hores; comptador; moure hores; festius i vacances; importar .ics. (Les dietes no són en aquesta pantalla.) | `/dedicacio` | hours | done (2026-10-18) |
| 14 | Registre de jornada | Fitxar entrada i sortida, trams a mà, lligar un tram a un projecte, mes i any, PDF. | `/registre-jornades` | hours | done (2026-10-18) |
| 15 | Persones i jornades laborals | Períodes de jornada de cada persona, salari i Seguretat Social, cost/hora, crear les bestretes de l'any. (Festius: al capítol 13.) | `/working-day`, `/administracio/user-festive` | projects | done (2026-10-18) |
| 16 | Saldo d'hores i hores anuals | Hores previstes vs. treballades, saldo per persona i any. | `/dedicacio-saldo`, `/dedicacio-summary` | projects | done (2026-10-18) |

## D. Diners

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 17 | Ingressos: factures emeses | Crear factura, sèries, línies i IVA, assignar a projecte, PDF, enviar, cobrament, factures rectificatives, altres ingressos. | `/emitted-invoices`, `/document/:id/:type` | projects | done (2026-10-18) |
| 18 | Facturació electrònica: Verifactu i FACe | Què és Verifactu, cadena de registres, declaració; enviament de factures a l'administració per FACe i la seva cua. | `/verifactu`, `/administracio/verifactu*`, `/administracio/face-queue` | projects / admin | done (2026-10-18) |
| 19 | Despeses: factures rebudes | Registrar factures de proveïdors i altres despeses, tipus de despesa, assignar a projecte/fase, pagament. | `/received-invoices`, `/document/:id/:type` | projects | done (2026-10-18) |
| 20 | Bestretes (nòmines) | Bestretes i nòmines per període, com s'imputen als projectes segons les hores. | `/salary` | projects | done (2026-10-18) |
| 21 | IVA | Resum d'IVA repercutit i suportat per trimestre. | `/vat` | projects | done (2026-10-18) |
| 22 | Tresoreria | Previsió de tresoreria, comptes bancaris, anotacions manuals, validació. | `/tresoreria` | projects | done (2026-10-18) |
| 23 | Importar, exportar i Contasol | Importar dades (CSV), exportar, enviar clients/proveïdors/factures a Contasol. | `/import-export`, `/contasol` | projects | done (2026-10-18) |

## E. Consulta de dades (informes)

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 24 | Com funcionen les taules dinàmiques | Files, columnes, filtres, valors, desar vistes, exportar a Excel. Base per a tots els informes. | `/stats-projectes` | projects | done (2026-10-18) |
| 25 | Informes de projectes i econòmics | Panell de projectes, ingressos/despeses, preu hora, previsió econòmica, previsió facturació, estratègies, intercooperació (sense captura: no hi ha dades a la còpia). | `/stats-projectes`, `/stats-economic-detail`, `/stats-despeses`, `/forecast`, `/price-hour`, `/stats-estrategies`, `/stats-intercoop` | projects | done (2026-10-18) |
| 26 | Informes de dedicació | Dedicació (previst i fet, gràfics i taula), % de dedicació real. | `/stats-dedicacio`, `/stats-real-gantt` | hours / projects | done (2026-10-18) |

## F. Logística (comandes)

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 27 | Visió general de la logística | Actors (proveïdor, punt d'entrega, punt de consum, transport), flux d'una comanda, perfils `orders`, `orders_admin`, `orders_delivery`. | — | orders* | done (2026-10-18) |
| 28 | Comandes (proveïdor) | Crear comanda, validacions, imprimir etiquetes, importar comandes, seguiment. | `/orders`, `/order/:id`, `/order/view/:id` | orders | done (2026-10-18) |
| 29 | Punts d'entrega i de consum | Gestió de punts d'entrega i punts de consum. | `/user-contacts`, `/contact-user/:id`, `/pickup-points` | orders | done (2026-10-18) |
| 30 | Poblacions, rutes i dies | Poblacions i rutes, dies de ruta, festius de ruta, tarifes; crear, editar i desactivar rutes (orders_admin, issues/141). | `/city-route`, `/city-route-delivery`, `/route-days`, `/routes` | orders / orders_admin | done (2026-10-18) |
| 31 | Dipòsits, transferències i operacions | Dipòsits, transferències, operacions de comandes, lectura de QR. | `/deposits`, `/transfers`, `/order-operations` | orders_admin / orders_delivery | done (2026-10-18) |
| 32 | Incidències i contacte | Obrir i seguir incidències, formulari de contacte. | `/incidences`, `/contact-us`, `/incidences-stats` | orders | done (2026-10-18) |
| 33 | Facturació de la logística | Sòcies, facturar comandes, factures de proveïdors, taula de comandes. | `/partners`, `/orders-invoice`, `/provider-invoices`, `/orders-stats` | orders_admin | done (2026-10-18) |
| 38 | Guia per a sòcies | Guia curta i independent per a qui només té el permís `orders`: el seu menú, punts d'entrega, fer i importar comandes, albarans, dipositar, seguiment, incidències, factures, contactar. Enllaça als capítols 27–33. | `/orders`, `/order/:id`, `/user-contacts`, `/deposits`, `/incidences`, `/provider-invoices`, `/contact-us` | orders | done (2026-10-18) |

## G. Administració

| # | Tema | Contingut | Pantalles | Permís | Estat |
|---|------|-----------|-----------|--------|-------|
| 34 | Configuració general de l'entitat | Dades fiscals, logo, opcions generals, facturació per defecte dels projectes nous. | `/administracio/me` | admin | done (2026-10-30) |
| 35 | Taules auxiliars | Anys, àmbits, estats i probabilitats de projecte, estats de tasca, estratègies, formes jurídiques, mètodes de pagament, regions, sectors, sèries, tipus (contacte, dedicació, despesa, ingrés, projecte), entitats socials, comptes bancaris. | `/administracio/*` | admin | done (2026-10-18) |
| 36 | Inici d'any i manteniment | Preparar un any nou (anys, festius, sèries), recalcular. | `/administracio/year`, `/recalculate` | admin | done (2026-10-18) |
