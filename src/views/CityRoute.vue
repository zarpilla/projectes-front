<template>
  <!-- Redesign A: the towns each route goes through. Instead of a grid of every
       town × every route, each route shows its towns (the office adds and
       removes them there), and "Quina ruta passa per…?" answers the members'
       question and lets the office change one town's routes. -->
  <div class="city-routes">
    <title-bar :title-stack="['Rutes i punts', 'Poblacions i rutes']" :subtitle="headline" />

    <section class="section is-main-section">
      <routes-tabs :is-staff="canEdit" />
      <b-loading :is-full-page="false" :model-value="isLoading" />

      <div class="cr-layout">
        <div class="cr-main">
          <div class="filter-bar">
            <b-field class="filter-grow">
              <b-input v-model="routeFilter" icon="magnify" placeholder="Filtra per ruta o població" />
            </b-field>
            <b-button size="is-small" @click="setAllOpen(!allOpen)">{{ allOpen ? "Plega-les totes" : "Desplega-les totes" }}</b-button>
          </div>

          <div v-for="group in visibleGroups" :key="group.key" class="cr-day">
            <h2 class="cr-day-title">{{ group.label }} <small>· {{ group.routes.length }} {{ group.routes.length === 1 ? "ruta" : "rutes" }}</small></h2>

            <section v-for="route in group.routes" :key="route.id" class="a-box cr-route" :class="{ 'is-open': isOpen(route.id) }">
              <header class="cr-route-head">
                <button type="button" class="cr-route-toggle" :aria-expanded="isOpen(route.id) ? 'true' : 'false'" @click="toggle(route.id)">
                  <b-icon :icon="isOpen(route.id) ? 'chevron-down' : 'chevron-right'" size="is-small" />
                  <b>{{ route.name }}</b>
                </button>
                <span class="cr-route-meta">{{ routeDaysText(route) }} · {{ townsOf(route).length }} {{ townsOf(route).length === 1 ? "població" : "poblacions" }}</span>
              </header>

              <div class="town-chips">
                <span
                  v-for="town in shownTowns(route)"
                  :key="town.id"
                  class="town-chip"
                  :class="{ 'is-match': matches(town) }"
                >
                  <button type="button" class="town-name" :title="`Quines rutes passen per ${town.name}?`" @click="lookup = town.name">{{ town.name }}</button>
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
                    {{ route.short_name || route.name }}
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
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import RoutesTabs from "@/components/RoutesTabs.vue";
import service from "@/service/index";
import { indexLinks, groupByWeekday, routeDays, searchTowns, normalizeName } from "@/domain/cityRoutes.js";

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
      routeFilter: "",
      lookup: "",
      open: {},
      addText: {}
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
