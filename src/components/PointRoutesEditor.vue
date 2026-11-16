<template>
  <!-- «Rutes del punt» (issues/351): the office changes the routes of one
       delivery point. The town's routes can be cancelled there, other routes
       added as extraordinary (with the point's own time slot), and one of
       them made the main route, listed first and preselected in the order
       form. Saved at once, apart from the point's form. -->
  <section class="point-routes" data-test="point-routes">
    <header class="pr-head">
      <h3>Rutes del punt</h3>
      <span class="pr-hint">Només l'oficina. Els canvis es desen a l'acte.</span>
    </header>
    <b-loading :is-full-page="false" :model-value="isLoading" />

    <p v-if="!townRoutes.length && !extraRows.length" class="pr-help">
      {{ town ? `Cap ruta no passa per ${town}.` : "El punt no té població." }} Pots afegir-hi una ruta extraordinària.
    </p>

    <table v-if="townRoutes.length || extraRows.length" class="table is-fullwidth is-narrow pr-table">
      <thead>
        <tr>
          <th>Ruta</th>
          <th>Dies</th>
          <th>Franja</th>
          <th class="has-text-centered">Principal</th>
          <th class="has-text-centered">Anul·lada</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in townRoutes" :key="`t${r.id}`" :class="{ 'is-cancelled': isCancelled(r.id) }" :data-test="`town-route-${r.id}`">
          <td>{{ r.name }}</td>
          <td>{{ days(r) }}</td>
          <td>{{ townSlot(r) || "—" }}</td>
          <td class="has-text-centered">
            <input type="radio" name="main-route" :checked="isMain(r.id)" :disabled="isCancelled(r.id) || isSaving" :aria-label="`${r.name} principal`" @click="toggleMain(r.id)" />
          </td>
          <td class="has-text-centered">
            <b-switch size="is-small" :model-value="isCancelled(r.id)" :disabled="isSaving" :aria-label="`Anul·la ${r.name}`" @update:model-value="setCancelled(r.id, $event)" />
          </td>
          <td><small class="has-text-muted">població</small></td>
        </tr>
        <tr v-for="row in extraRows" :key="`e${row.id}`" class="is-extra" :data-test="`extra-route-${routeIdOf(row)}`">
          <td>{{ routeName(routeIdOf(row)) }} <span class="tag is-light">extraordinària</span></td>
          <td>{{ days(routeById(routeIdOf(row))) }}</td>
          <td>
            <div class="pr-slot">
              <input v-model="slots[row.id].from" type="time" class="input is-small" aria-label="De" @change="saveSlot(row)" />
              <span>–</span>
              <input v-model="slots[row.id].to" type="time" class="input is-small" aria-label="A" @change="saveSlot(row)" />
            </div>
            <small v-if="!slots[row.id].from" class="has-text-muted">la de la ruta: {{ routeSlot(routeIdOf(row)) || "—" }}</small>
          </td>
          <td class="has-text-centered">
            <input type="radio" name="main-route" :checked="!!row.main" :disabled="isSaving" :aria-label="`${routeName(routeIdOf(row))} principal`" @click="toggleMain(routeIdOf(row))" />
          </td>
          <td></td>
          <td>
            <b-button size="is-small" icon-left="delete" :disabled="isSaving" title="Treu la ruta extraordinària" @click="removeExtra(row)" />
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pr-add">
      <b-field label="Afegeix una ruta extraordinària" custom-class="is-small">
        <b-select v-model="newRoute" size="is-small" placeholder="Tria la ruta" data-test="extra-route-select">
          <option v-for="r in addableRoutes" :key="r.id" :value="r.id">{{ r.name }}{{ days(r) ? ` (${days(r)})` : "" }}</option>
        </b-select>
      </b-field>
      <b-field label="Franja (opcional)" custom-class="is-small">
        <div class="pr-slot">
          <input v-model="newFrom" type="time" class="input is-small" aria-label="De" />
          <span>–</span>
          <input v-model="newTo" type="time" class="input is-small" aria-label="A" />
        </div>
      </b-field>
      <b-button size="is-small" type="is-primary" icon-left="plus" :disabled="!newRoute || isSaving" data-test="extra-route-add" @click="addExtra">Afegeix</b-button>
    </div>
  </section>
</template>

<script>
import service from "@/service/index";
import { routeDays, slotOf, formatSlots } from "@/domain/cityRoutes.js";

const idOf = value => (value && typeof value === "object" ? value.id : value || null);
const hhmm = value => (value ? String(value).slice(0, 5) : "");

export default {
  name: "PointRoutesEditor",
  props: {
    contactId: { type: Number, required: true },
    town: { type: String, default: "" },
    // the town's routes, as the form shows them, and the town-route links
    townRoutes: { type: Array, default: () => [] },
    linkOf: { type: Function, default: () => null },
    allRoutes: { type: Array, default: () => [] }
  },
  emits: ["changed"],
  data() {
    return { rows: [], slots: {}, isLoading: false, isSaving: false, newRoute: null, newFrom: "", newTo: "" };
  },
  computed: {
    extraRows() {
      return this.rows.filter(r => r.extra);
    },
    addableRoutes() {
      const taken = new Set([...this.townRoutes.map(r => r.id), ...this.extraRows.map(r => this.routeIdOf(r))]);
      return this.allRoutes.filter(r => r.active !== false && !taken.has(r.id));
    }
  },
  watch: {
    contactId() {
      this.load();
    }
  },
  mounted() {
    this.load();
  },
  methods: {
    routeIdOf: row => idOf(row && row.route),
    routeById(id) {
      return this.allRoutes.find(r => r.id === id) || (this.rows.find(r => this.routeIdOf(r) === id) || {}).route || null;
    },
    routeName(id) {
      const route = this.routeById(id);
      return route ? route.name : `#${id}`;
    },
    days(route) {
      return route ? routeDays(route).join(", ") : "";
    },
    townSlot(route) {
      return slotOf(this.linkOf(route.id), route).text;
    },
    routeSlot(id) {
      const route = this.routeById(id);
      return route ? formatSlots(route) : "";
    },
    rowOf(routeId) {
      return this.rows.find(r => this.routeIdOf(r) === routeId) || null;
    },
    isCancelled(routeId) {
      const row = this.rowOf(routeId);
      return !!(row && row.cancelled);
    },
    isMain(routeId) {
      const row = this.rowOf(routeId);
      return !!(row && row.main);
    },
    async load() {
      if (!this.contactId) return;
      this.isLoading = true;
      try {
        const { data } = await service({ requiresAuth: true }).get(`point-routes?_where[contact]=${this.contactId}&_limit=-1`);
        this.rows = Array.isArray(data) ? data : [];
        const slots = {};
        for (const row of this.rows) slots[row.id] = { from: hhmm(row.time_from), to: hhmm(row.time_to) };
        this.slots = slots;
      } catch (e) {
        this.rows = [];
      } finally {
        this.isLoading = false;
      }
    },
    async write(action) {
      this.isSaving = true;
      try {
        await action(service({ requiresAuth: true }));
        await this.load();
        this.$emit("changed", this.rows);
      } catch (e) {
        const message = e?.response?.data?.error?.message || "No s'ha pogut desar la ruta del punt";
        this.$buefy.snackbar.open({ message, type: "is-danger", queue: false });
        await this.load();
      } finally {
        this.isSaving = false;
      }
    },
    create(api, data) {
      return api.post("point-routes", { contact: this.contactId, ...data });
    },
    // a row that says nothing any more goes
    update(api, row, data) {
      const next = { extra: !!row.extra, cancelled: !!row.cancelled, main: !!row.main, ...data };
      if (!next.extra && !next.cancelled && !next.main) return api.delete(`point-routes/${row.id}`);
      return api.put(`point-routes/${row.id}`, data);
    },
    toggleMain(routeId) {
      const row = this.rowOf(routeId);
      if (row && row.main) return this.write(api => this.update(api, row, { main: false }));
      return this.write(api => (row ? this.update(api, row, { main: true }) : this.create(api, { route: routeId, main: true })));
    },
    setCancelled(routeId, cancelled) {
      const row = this.rowOf(routeId);
      if (cancelled) {
        return this.write(api =>
          row ? this.update(api, row, { cancelled: true, main: false }) : this.create(api, { route: routeId, cancelled: true })
        );
      }
      if (!row) return null;
      return this.write(api => this.update(api, row, { cancelled: false }));
    },
    addExtra() {
      const data = { route: this.newRoute, extra: true, time_from: this.newFrom || null, time_to: this.newTo || null };
      return this.write(async api => {
        await this.create(api, data);
        this.newRoute = null;
        this.newFrom = "";
        this.newTo = "";
      });
    },
    removeExtra(row) {
      return this.write(api => api.delete(`point-routes/${row.id}`));
    },
    saveSlot(row) {
      const slot = this.slots[row.id] || {};
      // both ends or none
      if (!!slot.from !== !!slot.to) return null;
      return this.write(api => api.put(`point-routes/${row.id}`, { time_from: slot.from || null, time_to: slot.to || null }));
    }
  }
};
</script>

<style lang="scss" scoped>
.point-routes {
  position: relative;
  margin-top: 1rem;
  padding: .75rem 1rem;
  border: 1px solid var(--a-line);
  border-radius: .5rem;
}
.pr-head {
  display: flex;
  align-items: baseline;
  gap: .75rem;
  margin-bottom: .5rem;
  h3 {
    font-weight: 700;
  }
}
.pr-hint,
.pr-help {
  font-size: .8125rem;
  color: var(--a-muted);
}
.pr-table tr.is-cancelled td:first-child {
  text-decoration: line-through;
  color: var(--a-muted);
}
.pr-slot {
  display: flex;
  align-items: center;
  gap: .25rem;
  .input {
    width: 6.5rem;
  }
}
.pr-add {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: .75rem;
  margin-top: .5rem;
}
</style>
