<template>
  <!-- Redesign A: the towns each route goes through. Instead of a grid of every
       town × every route, each route shows its towns (the office adds and
       removes them there), and "Quina ruta passa per…?" answers the members'
       question and lets the office change one town's routes. Each route has a
       usual time slot and a town can have its own one in it (issues/314): the
       office sets them with «Franges», everyone sees them. -->
  <div class="city-routes">
    <title-bar :title-stack="['Rutes i punts', 'Poblacions i rutes']" :subtitle="headline" />

    <section class="section is-main-section">
      <routes-tabs :is-staff="canEdit" :is-office="isOffice" />
      <b-loading :is-full-page="false" :model-value="isLoading" />

      <div class="cr-layout">
        <div class="cr-main">
          <div class="filter-bar">
            <b-field class="filter-grow">
              <b-input v-model="routeFilter" icon="magnify" placeholder="Filtra per ruta o població" />
            </b-field>
            <b-button size="is-small" @click="setAllOpen(!allOpen)">{{ allOpen ? "Plega-les totes" : "Desplega-les totes" }}</b-button>
            <!-- the slots as a spreadsheet, to fill them in LibreOffice (issues/320) -->
            <template v-if="isOffice">
              <b-button size="is-small" icon-left="download" :disabled="!routes.length" @click="exportSlots">Exporta franges (.ods)</b-button>
              <b-button size="is-small" icon-left="upload" :loading="importing" @click="$refs.slotsFile.click()">Importa franges</b-button>
              <input ref="slotsFile" type="file" accept=".ods,application/vnd.oasis.opendocument.spreadsheet" class="is-hidden" @change="onSlotsFile" />
            </template>
          </div>

          <div v-for="group in visibleGroups" :key="group.key" class="cr-day">
            <h2 class="cr-day-title">{{ group.label }} <small>· {{ group.routes.length }} {{ group.routes.length === 1 ? "ruta" : "rutes" }}</small></h2>

            <section v-for="route in group.routes" :key="route.id" class="a-box cr-route" :class="{ 'is-open': isOpen(route.id) }">
              <header class="cr-route-head">
                <button type="button" class="cr-route-toggle" :aria-expanded="isOpen(route.id) ? 'true' : 'false'" @click="toggle(route.id)">
                  <b-icon :icon="isOpen(route.id) ? 'chevron-down' : 'chevron-right'" size="is-small" />
                  <b>{{ route.name }}</b>
                </button>
                <span class="cr-route-meta">
                  {{ routeDaysText(route) }} ·
                  <span v-if="routeSlotText(route)" class="slot-tag">{{ routeSlotText(route) }}</span>
                  <span v-else class="slot-tag is-none">Franja per definir</span>
                  · {{ townsOf(route).length }} {{ townsOf(route).length === 1 ? "població" : "poblacions" }}
                </span>
                <b-button
                  v-if="isOffice"
                  class="cr-slot-toggle"
                  size="is-small"
                  :type="slotEdit[route.id] ? 'is-primary' : ''"
                  :icon-left="slotEdit[route.id] ? 'check' : 'clock-outline'"
                  :aria-pressed="slotEdit[route.id] ? 'true' : 'false'"
                  @click="toggleSlots(route)"
                >{{ slotEdit[route.id] ? "Fet" : "Franges" }}</b-button>
              </header>

              <!-- the office sets the route's slot and each town's own one -->
              <div v-if="slotEdit[route.id]" class="cr-slots">
                <!-- typed times stay a draft until the focus leaves the pair -->
                <div class="cr-slot-default" @focusout="commitRouteSlot(route, $event)">
                  <b>Franja de la ruta</b>
                  <input
                    class="input is-small slot-input"
                    type="time"
                    :value="routeDraft(route).from"
                    :aria-label="`Franja de ${route.name}: de`"
                    @input="editDraft(`r${route.id}`, routeDraft(route), 'from', $event.target.value)"
                  />
                  a
                  <input
                    class="input is-small slot-input"
                    type="time"
                    :value="routeDraft(route).to"
                    :aria-label="`Franja de ${route.name}: a`"
                    @input="editDraft(`r${route.id}`, routeDraft(route), 'to', $event.target.value)"
                  />
                  <span class="field-note">Totes les poblacions de la ruta la fan servir, menys les que en tenen una de pròpia. Deixa «a» buit per a una hora fixa («a les 7 h»).</span>
                </div>
                <div class="table-container">
                  <table class="table is-fullwidth is-narrow cr-slot-table">
                    <thead>
                      <tr><th>Població</th><th>Franja pròpia</th><th>Franja</th><th class="has-text-right"><span class="is-sr-only">Accions</span></th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="town in townsOf(route)" :key="town.id" :class="{ 'is-own': townSlot(town, route).own }">
                        <td><b>{{ town.name }}</b></td>
                        <td class="cr-slot-inputs" @focusout="commitTownSlot(town, route, $event)">
                          <input
                            class="input is-small slot-input"
                            type="time"
                            :value="townDraft(town, route).from"
                            :aria-label="`Franja de ${town.name} a ${route.name}: de`"
                            @input="editDraft(townKey(town, route), townDraft(town, route), 'from', $event.target.value)"
                          />
                          a
                          <input
                            class="input is-small slot-input"
                            type="time"
                            :value="townDraft(town, route).to"
                            :aria-label="`Franja de ${town.name} a ${route.name}: a`"
                            @input="editDraft(townKey(town, route), townDraft(town, route), 'to', $event.target.value)"
                          />
                        </td>
                        <td>
                          <span v-if="townSlot(town, route).text" class="slot-tag" :class="{ 'is-inherited': !townSlot(town, route).own }">{{ townSlot(town, route).text }}</span>
                          <span v-else class="slot-tag is-none">Per definir</span>
                          <small class="has-text-muted">{{ townSlot(town, route).own ? " pròpia" : " la de la ruta" }}</small>
                        </td>
                        <td class="has-text-right">
                          <button
                            v-if="townSlot(town, route).own"
                            type="button"
                            class="link-button"
                            :disabled="saving"
                            @click="clearTownSlot(town, route)"
                          >Torna a la de la ruta</button>
                        </td>
                      </tr>
                      <tr v-if="!townsOf(route).length"><td colspan="4" class="has-text-muted">Cap població.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div v-if="!slotEdit[route.id]" class="town-chips">
                <span
                  v-for="town in shownTowns(route)"
                  :key="town.id"
                  class="town-chip"
                  :class="{ 'is-match': matches(town) }"
                >
                  <button type="button" class="town-name" :title="`Quines rutes passen per ${town.name}?`" @click="lookup = town.name">
                    {{ town.name }}<span v-if="townSlot(town, route).own" class="slot-tag is-small">{{ townSlot(town, route).text }}</span>
                  </button>
                  <button
                    v-if="canEdit"
                    type="button"
                    class="town-remove"
                    :aria-label="`Treu ${town.name} de ${route.name}`"
                    :title="`Treu ${town.name} de la ruta`"
                    :disabled="saving"
                    @click="unlink(town, route)"
                  ><b-icon icon="close" size="is-small" /></button>
                </span>
                <button v-if="hiddenCount(route)" type="button" class="town-more" @click="toggle(route.id)">+{{ hiddenCount(route) }} més</button>
                <span v-if="!townsOf(route).length" class="has-text-muted">Cap població.</span>
              </div>

              <div v-if="canEdit && isOpen(route.id)" class="cr-add">
                <b-autocomplete
                  v-model="addText[route.id]"
                  :data="addOptions(route)"
                  field="name"
                  size="is-small"
                  icon="plus"
                  placeholder="Afegeix una població a la ruta"
                  :open-on-focus="false"
                  clear-on-select
                  @select="town => town && link(town, route)"
                >
                  <template #empty>
                    <span v-if="addText[route.id]">Cap població amb aquest nom. Crea-la a «Nova població».</span>
                  </template>
                </b-autocomplete>
              </div>
            </section>
          </div>
          <p v-if="!isLoading && !visibleGroups.length" class="a-box box-empty">{{ routeFilter && routeFilter.trim() ? "Cap ruta amb aquest filtre." : "Encara no hi ha cap ruta activa." }}</p>
        </div>

        <aside class="cr-side">
          <section class="a-box">
            <header class="box-head"><h2>Quina ruta passa per…?</h2></header>
            <b-input v-model="lookup" icon="magnify" placeholder="Escriu una població" />
            <ul v-if="lookupResults.length" class="lookup-list">
              <li v-for="town in lookupResults" :key="town.id" class="town-card">
                <b>{{ town.name }}</b>
                <div class="route-chips">
                  <span v-for="route in routesOf(town)" :key="route.id" class="route-chip" :title="routeDaysText(route)">
                    <span class="route-day">{{ routeDaysText(route) }}</span>
                    {{ route.short_name || route.name }}
                    <span v-if="townSlot(town, route).text" class="slot-tag is-small" :class="{ 'is-inherited': canEdit && !townSlot(town, route).own }">{{ townSlot(town, route).text }}</span>
                    <button
                      v-if="canEdit"
                      type="button"
                      class="town-remove"
                      :aria-label="`Treu ${route.name} de ${town.name}`"
                      :disabled="saving"
                      @click="unlink(town, route)"
                    ><b-icon icon="close" size="is-small" /></button>
                  </span>
                  <span v-if="!routesOf(town).length" class="no-route">Cap ruta hi passa</span>
                </div>
                <b-select
                  v-if="canEdit"
                  size="is-small"
                  :model-value="null"
                  :disabled="saving"
                  :aria-label="`Afegeix una ruta a ${town.name}`"
                  @update:model-value="routeId => routeId && link(town, routes.find(r => r.id === routeId))"
                >
                  <option :value="null">Afegeix una ruta…</option>
                  <optgroup v-for="group in groups" :key="group.key" :label="group.label">
                    <option v-for="route in group.routes.filter(r => !routesOf(town).includes(r))" :key="route.id" :value="route.id">{{ route.name }}</option>
                  </optgroup>
                </b-select>
              </li>
            </ul>
            <p v-else-if="lookup" class="box-empty">Cap població amb aquest nom.</p>
            <p v-else class="lookup-help">Les rutes depenen del dia de la setmana: tria la que et vagi bé per a l'entrega.</p>
          </section>

          <section v-if="isOffice && routesWithoutSlot.length" class="a-box">
            <header class="box-head">
              <h2>Sense franja</h2>
              <span class="box-hint">{{ routesWithoutSlot.length }} {{ routesWithoutSlot.length === 1 ? "ruta" : "rutes" }}</span>
            </header>
            <p class="lookup-help">Les sòcies hi veuen «Franja per definir». Posa-la amb «Franges».</p>
            <div class="town-chips">
              <span v-for="route in routesWithoutSlot" :key="route.id" class="town-chip">
                <button type="button" class="town-name" @click="toggleSlots(route, true)">{{ route.short_name || route.name }}</button>
              </span>
            </div>
          </section>

          <section v-if="canEdit && unrouted.length" class="a-box">
            <header class="box-head">
              <h2>Sense ruta</h2>
              <span class="box-hint">{{ unrouted.length }} {{ unrouted.length === 1 ? "població" : "poblacions" }}</span>
            </header>
            <div class="town-chips">
              <span v-for="town in unrouted" :key="town.id" class="town-chip">
                <button type="button" class="town-name" @click="lookup = town.name">{{ town.name }}</button>
              </span>
            </div>
          </section>

          <section v-if="canEdit && duplicates.length" class="a-box">
            <header class="box-head"><h2>Poblacions repetides</h2></header>
            <p class="lookup-help">Tenen el mateix nom; les comandes poden anar a una o a l'altra.</p>
            <div class="town-chips">
              <span v-for="d in duplicates" :key="d.name" class="town-chip">
                <button type="button" class="town-name" @click="lookup = d.name">{{ d.name }} ×{{ d.count }}</button>
              </span>
            </div>
          </section>

          <section v-if="canEdit" class="a-box">
            <header class="box-head"><h2>Nova població</h2></header>
            <form class="new-town" @submit.prevent="addCity">
              <b-input v-model="newCity" placeholder="Població" />
              <b-button native-type="submit" icon-left="plus" title="Nova població" :disabled="!newCity.trim()">Afegeix</b-button>
            </form>
            <p v-if="newCityExists" class="field-note">Ja existeix: {{ newCityExists.name }}.</p>
          </section>
        </aside>
      </div>
    </section>

    <!-- what importing the .ods will change, before saving it (issues/320) -->
    <b-modal v-model="importOpen" has-modal-card aria-role="dialog" aria-modal :can-cancel="!applying">
      <div v-if="importPlan" class="modal-card slots-import">
        <header class="modal-card-head">
          <p class="modal-card-title">Importa franges</p>
        </header>
        <section class="modal-card-body">
          <p class="slots-import-summary">
            <b>{{ importPlan.changes.length }} {{ importPlan.changes.length === 1 ? "franja canvia" : "franges canvien" }}</b>
            · {{ importPlan.unchanged }} sense canvis
            <template v-if="importPlan.errors.length"> · <span class="has-text-danger">{{ importPlan.errors.length }} {{ importPlan.errors.length === 1 ? "fila amb error" : "files amb error" }}</span></template>
          </p>
          <template v-if="importPlan.errors.length">
            <h3 class="slots-import-title">Files que no es desaran</h3>
            <ul class="slots-import-errors">
              <li v-for="(e, i) in importPlan.errors" :key="`e${i}`"><span v-if="e.row">Fila {{ e.row }}: </span>{{ e.message }}</li>
            </ul>
          </template>
          <template v-if="importPlan.changes.length">
            <h3 class="slots-import-title">Canvis</h3>
            <table class="table is-narrow is-fullwidth slots-import-table">
              <thead><tr><th>Fila</th><th>Ruta › població</th><th>Ara</th><th>Passa a</th></tr></thead>
              <tbody>
                <tr v-for="c in importPlan.changes" :key="c.url">
                  <td>{{ c.row }}</td>
                  <td>{{ c.label }}</td>
                  <td class="has-text-grey">{{ c.before }}</td>
                  <td><b>{{ c.after }}</b></td>
                </tr>
              </tbody>
            </table>
          </template>
          <p v-else-if="!importPlan.errors.length">El fitxer té les mateixes franges que ara.</p>
        </section>
        <footer class="modal-card-foot">
          <b-button :disabled="applying" @click="importOpen = false">Cancel·la</b-button>
          <b-button type="is-primary" :loading="applying" :disabled="!importPlan.changes.length" @click="applySlots">
            {{ applying ? `Desant ${applied} de ${importPlan.changes.length}` : `Desa ${importPlan.changes.length} ${importPlan.changes.length === 1 ? "canvi" : "canvis"}` }}
          </b-button>
        </footer>
      </div>
    </b-modal>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import RoutesTabs from "@/components/RoutesTabs.vue";
import service from "@/service/index";
import { indexLinks, groupByWeekday, routeDays, searchTowns, normalizeName, formatSlot, slotOf, timeInput, timeValue, slotError } from "@/domain/cityRoutes.js";
import { slotSheetRows, planSlotImport } from "@/domain/citySlotsSheet.js";
import { buildOds, readOds, ODS_MIME } from "@/service/ods";
import download from "downloadjs";

const PREVIEW = 12;

export default {
  name: "CityRoute",
  components: {
    TitleBar,
    RoutesTabs
  },
  data() {
    return {
      isLoading: false,
      saving: false,
      cities: [],
      routes: [],
      cityRoutes: [],
      newCity: "",
      canEdit: false,
      isOffice: false,
      routeFilter: "",
      lookup: "",
      open: {},
      addText: {},
      slotEdit: {},
      // times typed and not saved yet: { "r<route id>" | "l<link id>": { from, to } }
      drafts: {},
      // .ods import (issues/320)
      importing: false,
      importOpen: false,
      importPlan: null,
      applying: false,
      applied: 0
    };
  },
  computed: {
    index() {
      return indexLinks(this.cities, this.routes, this.cityRoutes);
    },
    groups() {
      return groupByWeekday(this.routes);
    },
    visibleGroups() {
      const q = normalizeName(this.routeFilter);
      if (!q) return this.groups;
      return this.groups
        .map(g => ({ ...g, routes: g.routes.filter(r => normalizeName(r.name).includes(q) || this.townsOf(r).some(t => normalizeName(t.name).includes(q))) }))
        .filter(g => g.routes.length);
    },
    unrouted() {
      return this.cities.filter(c => !(this.index.routesByTown.get(c.id) || []).length);
    },
    duplicates() {
      const counts = new Map();
      for (const c of this.cities) {
        const key = normalizeName(c.name);
        counts.set(key, { name: c.name, count: (counts.get(key)?.count || 0) + 1 });
      }
      return [...counts.values()].filter(d => d.count > 1);
    },
    lookupResults() {
      return searchTowns(this.cities, this.lookup, 6);
    },
    routesWithoutSlot() {
      return this.routes.filter(r => !r.time_from);
    },
    allOpen() {
      return this.routes.length > 0 && this.routes.every(r => this.open[r.id]);
    },
    newCityExists() {
      const q = normalizeName(this.newCity);
      return q ? this.cities.find(c => normalizeName(c.name) === q) : null;
    },
    headline() {
      if (!this.cities.length) return "";
      return `${this.cities.length} poblacions · ${this.routes.length} rutes actives${this.unrouted.length ? ` · ${this.unrouted.length} sense ruta` : ""}`;
    }
  },
  async mounted() {
    const me = await service({ requiresAuth: true, cached: true }).get("users/me");
    const permissions = me.data.permissions.map(p => p.permission);
    this.canEdit = permissions.includes("orders_admin") || permissions.includes("orders_delivery");
    this.isOffice = permissions.includes("orders_admin");
    this.isLoading = true;
    await this.getData();
    this.isLoading = false;
  },
  methods: {
    async getData() {
      const [cities, routes, cityRoutes] = await Promise.all([
        service({ requiresAuth: true, cached: false }).get("cities?_sort=name&_limit=-1").then(r => r.data),
        service({ requiresAuth: true, cached: true }).get("routes?_sort=order&_where[active]=true&_limit=-1").then(r => r.data),
        service({ requiresAuth: true, cached: false }).get("city-routes/basic").then(r => r.data)
      ]);
      this.cities = cities.map(c => ({ id: c.id, name: c.name }));
      this.routes = routes;
      this.cityRoutes = cityRoutes;
    },
    townsOf(route) {
      return this.index.townsByRoute.get(route.id) || [];
    },
    routesOf(town) {
      return this.index.routesByTown.get(town.id) || [];
    },
    routeDaysText(route) {
      return routeDays(route).join(", ") || "sense dia";
    },
    timeInput,
    routeSlotText(route) {
      return formatSlot(route.time_from, route.time_to);
    },
    // the slot of a town in a route: its own one, else the route's
    townSlot(town, route) {
      return slotOf(this.index.linkOf(town.id, route.id), route);
    },
    townKey(town, route) {
      const link = this.index.linkOf(town.id, route.id);
      return link ? `l${link.id}` : "";
    },
    // what the time inputs show: the draft, else what is saved
    routeDraft(route) {
      return this.drafts[`r${route.id}`] || { from: timeInput(route.time_from), to: timeInput(route.time_to) };
    },
    townDraft(town, route) {
      const link = this.index.linkOf(town.id, route.id);
      const own = link && link.time_from ? { from: timeInput(link.time_from), to: timeInput(link.time_to) } : { from: "", to: "" };
      return this.drafts[`l${link?.id}`] || own;
    },
    editDraft(key, current, field, value) {
      if (!key) return;
      this.drafts = { ...this.drafts, [key]: { ...current, [field]: value } };
    },
    dropDraft(key) {
      const { [key]: _, ...rest } = this.drafts;
      this.drafts = rest;
    },
    // saves the draft when the focus leaves the pair of inputs
    async commitDraft(key, saved, url, target, event) {
      if (event && event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return;
      const draft = this.drafts[key];
      if (!draft) return;
      if (draft.from === saved.from && draft.to === saved.to) {
        this.dropDraft(key);
        return;
      }
      if (await this.saveSlot(url, draft.from, draft.to, data => Object.assign(target, data))) this.dropDraft(key);
    },
    commitRouteSlot(route, event) {
      const saved = { from: timeInput(route.time_from), to: timeInput(route.time_to) };
      return this.commitDraft(`r${route.id}`, saved, `routes/${route.id}`, route, event);
    },
    commitTownSlot(town, route, event) {
      const link = this.index.linkOf(town.id, route.id);
      if (!link) return;
      const saved = link.time_from ? { from: timeInput(link.time_from), to: timeInput(link.time_to) } : { from: "", to: "" };
      return this.commitDraft(`l${link.id}`, saved, `city-routes/${link.id}`, link, event);
    },
    async clearTownSlot(town, route) {
      const link = this.index.linkOf(town.id, route.id);
      if (!link) return;
      if (await this.saveSlot(`city-routes/${link.id}`, "", "", data => Object.assign(link, data))) this.dropDraft(`l${link.id}`);
    },
    toggleSlots(route, on) {
      const show = on ?? !this.slotEdit[route.id];
      this.slotEdit = { ...this.slotEdit, [route.id]: show };
      if (show) this.open = { ...this.open, [route.id]: true };
    },
    // validated like the API; "" for both clears the slot. True when saved.
    async saveSlot(url, from, to, apply) {
      const error = slotError(from, to);
      if (error) {
        this.$buefy.snackbar.open({ message: error, type: "is-danger", queue: false });
        return false;
      }
      const data = { time_from: timeValue(from), time_to: timeValue(from) ? timeValue(to) : null };
      this.saving = true;
      try {
        await service({ requiresAuth: true }).put(url, data);
        apply(data);
        this.$buefy.snackbar.open({ message: "Franja desada", queue: false });
        return true;
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar", type: "is-danger", queue: false });
        return false;
      } finally {
        this.saving = false;
      }
    },
    // --- .ods export / import of the slots (issues/320) ---
    exportSlots() {
      const rows = slotSheetRows(this.cities, this.routes, this.cityRoutes);
      download(new Blob([buildOds(rows, "Franges")], { type: ODS_MIME }), "franges-poblacions-rutes.ods", ODS_MIME);
    },
    async onSlotsFile(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = "";
      if (!file) return;
      this.importing = true;
      try {
        // the slots may have changed since the page was opened
        await this.getData();
        const rows = readOds(await file.arrayBuffer());
        this.importPlan = planSlotImport(rows, { cities: this.cities, routes: this.routes, cityRoutes: this.cityRoutes });
        this.importOpen = true;
      } catch (e) {
        this.$buefy.snackbar.open({ message: e.message || "No s'ha pogut llegir el fitxer", type: "is-danger", queue: false });
      } finally {
        this.importing = false;
      }
    },
    // saves the changed slots, a few at a time; the failures are named
    async applySlots() {
      const changes = this.importPlan.changes;
      const failed = [];
      this.applying = true;
      this.applied = 0;
      let next = 0;
      const worker = async () => {
        while (next < changes.length) {
          const change = changes[next++];
          try {
            await service({ requiresAuth: true }).put(change.url, change.data);
          } catch (e) {
            failed.push(change);
          }
          this.applied++;
        }
      };
      try {
        await Promise.all([worker(), worker(), worker(), worker()]);
        await this.getData();
      } finally {
        this.applying = false;
      }
      const saved = changes.length - failed.length;
      if (failed.length) {
        this.$buefy.snackbar.open({
          message: `${saved} desades. No s'han pogut desar: ${failed.map(c => `fila ${c.row}`).join(", ")}`,
          type: "is-danger",
          indefinite: true,
          queue: false
        });
      } else {
        this.$buefy.snackbar.open({ message: `${saved} ${saved === 1 ? "franja desada" : "franges desades"}`, queue: false });
      }
      this.importOpen = false;
    },
    isOpen(routeId) {
      return !!this.open[routeId];
    },
    toggle(routeId) {
      this.open = { ...this.open, [routeId]: !this.open[routeId] };
    },
    setAllOpen(on) {
      this.open = on ? Object.fromEntries(this.routes.map(r => [r.id, true])) : {};
    },
    shownTowns(route) {
      const towns = this.townsOf(route);
      return this.isOpen(route.id) || this.routeFilter ? towns : towns.slice(0, PREVIEW);
    },
    hiddenCount(route) {
      return this.isOpen(route.id) || this.routeFilter ? 0 : Math.max(0, this.townsOf(route).length - PREVIEW);
    },
    matches(town) {
      const q = normalizeName(this.routeFilter);
      return !!q && normalizeName(town.name).includes(q);
    },
    addOptions(route) {
      const text = this.addText[route.id];
      const current = new Set(this.townsOf(route).map(t => t.id));
      return searchTowns(this.cities, text, 10).filter(t => !current.has(t.id));
    },
    async link(town, route) {
      if (!town || !route || this.index.linkOf(town.id, route.id)) return;
      this.saving = true;
      try {
        await service({ requiresAuth: true }).post("city-routes", { city: town.id, route: route.id });
        await this.getData();
        this.$buefy.snackbar.open({ message: `${town.name} afegida a ${route.name}`, queue: false });
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar", type: "is-danger", queue: false });
      } finally {
        this.saving = false;
      }
    },
    async unlink(town, route) {
      const link = this.index.linkOf(town.id, route.id);
      if (!link) return;
      this.saving = true;
      try {
        await service({ requiresAuth: true }).delete(`city-routes/${link.id}`);
        await this.getData();
        this.$buefy.snackbar.open({
          message: `${town.name} treta de ${route.name}`,
          actionText: "Desfés",
          queue: false,
          onAction: () => this.link(town, route)
        });
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar", type: "is-danger", queue: false });
      } finally {
        this.saving = false;
      }
    },
    addCity() {
      const name = this.newCity.trim();
      if (!name) return;
      if (this.newCityExists) {
        this.lookup = this.newCityExists.name;
        return;
      }
      this.$buefy.dialog.confirm({
        message: "Vols afegir la població?",
        onConfirm: async () => {
          await service({ requiresAuth: true }).post("cities", { name });
          this.newCity = "";
          await this.getData();
          // straight to its routes
          this.lookup = name;
        }
      });
    }
  }
};
</script>

<style scoped>
.slots-import {
  width: min(48rem, calc(100vw - 2rem));
}
.slots-import-summary {
  margin-bottom: .75rem;
}
.slots-import-title {
  margin: .75rem 0 .35rem;
  font-weight: 700;
}
.slots-import-errors {
  margin-left: 1.1rem;
  list-style: disc;
  color: var(--a-danger, #b42318);
}
.slots-import-table td:first-child {
  color: var(--a-muted);
  width: 3.5rem;
}
.cr-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24rem;
  gap: 1rem;
  align-items: start;
}
.cr-main {
  min-width: 0;
}
.cr-side {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.cr-day + .cr-day {
  margin-top: 1.25rem;
}
.cr-day-title {
  margin-bottom: .5rem;
  font-weight: 800;
  color: var(--a-fg);
}
.cr-day-title small {
  font-weight: 600;
  color: var(--a-muted);
}
.cr-route {
  margin-bottom: .5rem;
  padding: .75rem 1rem;
}
.cr-route-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem 1rem;
  margin-bottom: .5rem;
}
.cr-route-toggle {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--a-fg);
  cursor: pointer;
}
.cr-route-meta {
  font-size: .8125rem;
  color: var(--a-muted);
}
.town-chips,
.route-chips {
  display: flex;
  flex-wrap: wrap;
  gap: .375rem;
}
.town-chip,
.route-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--a-line);
  border-radius: 999px;
  background: var(--a-chip);
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.town-chip.is-match {
  border-color: var(--a-accent);
  background: var(--a-accent-soft);
  color: var(--a-accent-hover);
}
.town-name {
  padding: .1875rem .625rem;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.town-name:hover {
  color: var(--a-accent);
}
.town-remove {
  display: inline-flex;
  margin-right: .25rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--a-muted);
  cursor: pointer;
}
.town-remove:hover {
  color: var(--a-neg);
}
.route-chip {
  gap: .25rem;
  padding: .1875rem .25rem .1875rem .625rem;
  font-weight: 700;
  font-size: .75rem;
}
.town-more {
  border: 0;
  background: none;
  font: inherit;
  font-size: .8125rem;
  font-weight: 700;
  color: var(--a-accent);
  cursor: pointer;
}
.cr-add {
  margin-top: .75rem;
  max-width: 22rem;
}
.lookup-list {
  margin-top: .75rem;
}
.town-card {
  display: flex;
  flex-direction: column;
  gap: .375rem;
  padding: .75rem 0;
  border-top: 1px solid var(--a-line-soft);
}
.town-card b {
  color: var(--a-fg);
}
.no-route {
  font-size: .8125rem;
  color: var(--a-over);
}
.lookup-help {
  margin-top: .75rem;
  font-size: .8125rem;
  color: var(--a-muted);
}
.new-town {
  display: flex;
  gap: .5rem;
}
.new-town .control {
  flex: 1;
}
.field-note {
  margin-top: .375rem;
  font-size: .75rem;
  color: var(--a-muted);
}
.slot-tag {
  display: inline-flex;
  align-items: center;
  padding: 0 .5rem;
  border-radius: 999px;
  background: var(--a-info-bg, #E8F1FB);
  font-size: .75rem;
  font-weight: 800;
  white-space: nowrap;
  color: var(--a-info-fg, #1D4E89);
}
.slot-tag.is-none {
  background: var(--a-warn-bg, #FFF6DE);
  color: var(--a-warn-fg, #5C4200);
}
.slot-tag.is-inherited {
  background: var(--a-chip);
  color: var(--a-muted);
}
.slot-tag.is-small {
  margin-left: .375rem;
  font-size: .6875rem;
}
.cr-slot-toggle {
  margin-left: auto;
}
.cr-slots {
  margin-top: .25rem;
}
.cr-slot-default {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .375rem .625rem;
  padding: .625rem .75rem;
  margin-bottom: .5rem;
  border: 1px solid var(--a-line-soft);
  border-radius: 8px;
  background: var(--a-thead, #F8FAFA);
}
.cr-slot-default .field-note {
  flex-basis: 100%;
  margin: 0;
}
.slot-input {
  width: 7rem;
}
.cr-slot-inputs {
  white-space: nowrap;
}
.cr-slot-table tr.is-own td {
  background: var(--a-accent-soft);
}
.link-button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-accent);
  cursor: pointer;
}
.route-day {
  font-weight: 600;
  color: var(--a-muted);
  text-transform: capitalize;
}
@media screen and (max-width: 1023px) {
  .cr-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .cr-side {
    position: static;
    order: -1;
  }
}
</style>
