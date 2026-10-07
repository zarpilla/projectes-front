# Manual QA checklist (Vue 3 migration)

The smoke test only *opens* pages. These flows change data or produce files, so
they must be checked by hand, on a local or staging tenant, before and after the switch.

## Projects
- [ ] ProjectForm: create, edit and save a project, including phases, budget lines and the Gantt tab
- [ ] Project list ↔ mother-projects default-view preference (redirect from `/projectes`)
- [ ] Dedication: add or edit hours in `/dedicacio`, JornadaDiaria, `/working-day`
- [ ] Gantt views (`/stats-previsio-gantt`, `/stats-real-gantt`) drag and resize
- [ ] Justifications: every Excel export button downloads a file that opens

## Documents and invoices
- [ ] DocumentForm: create an emitted invoice, add lines, change VAT, save, delete
- [ ] Received invoice, income and expense forms (`/document/0/received-*`)
- [ ] Invoice/Quote view → PDF download renders correctly (html2pdf)
- [ ] VAT table, treasury, forecast: filters and totals
- [ ] Verifactu / FACe screens load and show their states

## Orders and logistics
- [ ] OrdersForm: new order, pickup-point order (`/order/0?pickup_point=true`), edit, status buttons
- [ ] Orders table: filters, checked rows, bulk actions, CSV/Excel export
- [ ] QR scanner modal opens the camera and reads a code
- [ ] City route and delivery screens; route days; pickup points
- [ ] Incidences: create from an order, list, stats

## Common
- [ ] Login, logout, wrong password message, redirect to the original URL after login
- [ ] Toasts, snackbars and confirm dialogs (delete confirmations) appear and work
- [ ] Datepickers: Catalan locale, first day Monday, typing a date by hand
- [ ] Autocompletes: search, select, clear
- [ ] Modals open and close (Esc, backdrop, buttons)
- [ ] Charts on the stats pages render, and their tooltips work
- [ ] Kendo pivot views load and pivot
- [ ] Mobile width: aside menu toggles and closes on navigation

## Vue 3 differences to confirm against production (Vue 2)

On the local copy these pages were broken or empty on Vue 2 and work on Vue 3.
Check whether production Vue 2 behaves the same, so the change is understood:
- [ ] `/salary` (Bestretes): on Vue 2 the year select stayed at "0" and the page kept loading
- [ ] `/dedicacio-saldo`, `/orders-stats`, `/incidences-stats`: same year-select pattern, Vue 2 never finished loading
- [ ] `/route-days`: Vue 2's calendar showed no routes, Vue 3 shows each weekday's routes
- [ ] Opening one document after another (`/document/:id/:type`): Vue 2 kept showing the previous document

Intentional behaviour changes:
- [ ] Changing "Línies" per page in DocumentForm now jumps back to page 1 (the handler never fired on Vue 2)
- [ ] Logging in from a deep link returns to that page (the redirect was lost on Vue 2)
