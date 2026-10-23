<template>
  <!-- Redesign A (mockup A-Log-Rutes): the routes by weekday and four weeks of
       their days; a click opens or closes a route on a day (office). Holidays
       with open routes are warned about. -->
  <div class="route-days">
    <title-bar :title-stack="['Rutes i punts', 'Rutes i dies']" :subtitle="headline">
      <b-button icon-left="chevron-left" aria-label="Setmanes anteriors" @click="shift(-1)" />
      <b-button @click="goToday">Avui</b-button>
      <b-button icon-left="chevron-right" aria-label="Setmanes següents" @click="shift(1)" />
    </title-bar>

    <section class="section is-main-section">
      <routes-tabs :is-staff="canEdit" :is-office="isOffice" />

      <div v-for="h in holidayWarnings" :key="h.date" class="notification is-warning holiday-note">
        <span>
          <b>{{ longDay(h.date) }} és festiu</b> i {{ h.routes.length === 1 ? "la ruta" : `les ${h.routes.length} rutes` }} d'aquell dia
          {{ h.routes.length === 1 ? "hi és oberta" : "hi són obertes" }}<template v-if="h.orders">, amb {{ h.orders }} {{ h.orders === 1 ? "comanda prevista" : "comandes previstes" }}</template>.
        </span>
        <b-button v-if="canEdit" size="is-small" :loading="saving" @click="closeAll(h)">Tanca les rutes del {{ shortDay(h.date) }}</b-button>
      </div>

      <div class="rd-layout">
        <section class="a-box rd-table-box">
          <b-loading :is-full-page="false" :model-value="isLoading" />
          <header class="rd-legend">
            <span><i class="sw is-open"></i>Oberta</span>
            <span><i class="sw is-closed"></i>Tancada</span>
            <span><i class="sw is-holiday"></i>Oberta en dia festiu</span>
            <span class="rd-asof">Dades a {{ shortDay(today) }}</span>
          </header>
          <div class="table-container">
            <table class="table is-fullwidth rd-table">
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th v-for="w in weeks" :key="w.start">Setm. {{ w.number }}</th>
                </tr>
              </thead>
              <!-- no active routes: say it instead of headers alone (issues/108) -->
              <tbody v-if="!groups.length">
                <tr><td :colspan="weeks.length + 1" class="has-text-muted has-text-centered py-5">Encara no hi ha cap ruta activa.</td></tr>
              </tbody>
              <tbody v-for="group in groups" :key="group.key">
                <tr class="rd-day-row">
                  <td :colspan="weeks.length + 1"><b>{{ group.label }}</b> · {{ group.routes.length }} {{ group.routes.length === 1 ? "ruta" : "rutes" }}</td>
                </tr>
                <tr v-for="route in group.routes" :key="route.id">
                  <th scope="row" class="rd-route">
                    <b>{{ route.name }}</b>
                    <small>{{ routeNote(route) }}</small>
                  </th>
                  <td v-for="w in weeks" :key="w.start" class="rd-week">
                    <component
                      :is="canEdit ? 'button' : 'div'"
                      v-for="cell in cellsOf(route, w)"
                      :key="cell.date"
                      :type="canEdit ? 'button' : undefined"
                      class="rd-cell"
                      :class="{ 'is-closed': !cell.open, 'is-holiday': cell.open && cell.holiday, 'is-past': cell.past }"
                      :disabled="canEdit && saving"
                      :title="canEdit ? (cell.open ? 'Clica per tancar la ruta aquest dia' : 'Clica per obrir la ruta aquest dia') : ''"
                      @click="canEdit && toggle(route, cell)"
                    >
                      <b>{{ shortDay(cell.date) }}</b>
                      <span>{{ cell.open ? (cell.holiday ? "Oberta · festiu" : "Oberta") : "Tancada" }}</span>
                      <small>{{ cell.orders ? `${cell.orders} com.` : "—" }}</small>
                    </component>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <aside class="rd-side">
          <section class="a-box">
            <header class="box-head"><h2>Quina ruta passa per…?</h2></header>
            <b-input v-model="lookup" icon="magnify" placeholder="Escriu una població" />
            <ul v-if="lookupResults.length" class="lookup-list">
              <li v-for="town in lookupResults" :key="town.id">
                <b>{{ town.name }}</b>
                <div class="route-chips">
                  <span v-for="r in index.routesByTown.get(town.id) || []" :key="r.id" class="route-chip" :title="routeDaysText(r)">
                    {{ r.short_name || r.name }}<template v-if="slotText(town, r)"> · {{ slotText(town, r) }}</template>
                  </span>
                  <span v-if="!(index.routesByTown.get(town.id) || []).length" class="no-route">Cap ruta hi passa</span>
                </div>
              </li>
            </ul>
            <p v-else-if="lookup" class="box-empty">Cap població amb aquest nom.</p>
            <router-link to="/city-route" class="all-towns">Totes les poblacions ({{ cities.length }}) →</router-link>
          </section>
          <div v-if="unroutedCount" class="notification is-info">
            {{ unroutedCount }} {{ unroutedCount === 1 ? "població no té" : "poblacions no tenen" }} cap ruta assignada.
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>

<script>
import moment from "moment";
import TitleBar from "@/components/TitleBar.vue";
import RoutesTabs from "@/components/RoutesTabs.vue";
import service from "@/service/index";
import { formatMoney } from "@/helpers/format-number";
import { indexLinks, groupByWeekday, routeDays, searchTowns, slotOf } from "@/domain/cityRoutes.js";
import { weekStart, weeksFrom, routeDatesInWeek, dayCell, countOrders, openOnHolidays } from "@/domain/routeDays.js";

const WEEKS = 4;

export default {
  name: "RouteDays",
  components: {
    TitleBar,
    RoutesTabs
  },
  data() {
    return {
      isLoading: false,
      saving: false,
      canEdit: false,
      isOffice: false,
      routes: [],
      closures: [],
      holidays: [],
      orders: [],
      cities: [],
      cityRoutes: [],
      offset: 0,
      lookup: "",
      today: moment().format("YYYY-MM-DD")
    };
  },
  computed: {
    weeks() {
      return weeksFrom(weekStart(this.today, this.offset), WEEKS);
    },
    from() {
      return this.weeks[0].start;
    },
    to() {
      return moment(this.weeks[WEEKS - 1].start).add(6, "days").format("YYYY-MM-DD");
    },
    groups() {
      return groupByWeekday(this.routes);
    },
    orderCounts() {
      return countOrders(this.orders);
    },
    index() {
      return indexLinks(this.cities, this.routes, this.cityRoutes);
    },
    lookupResults() {
      return searchTowns(this.cities, this.lookup, 6);
    },
    unroutedCount() {
      return this.cities.filter(c => !(this.index.routesByTown.get(c.id) || []).length).length;
    },
    holidayWarnings() {
      return openOnHolidays({
        routes: this.routes,
        holidays: this.holidays,
        closures: this.closures,
        orderCounts: this.orderCounts,
        from: this.today > this.from ? this.today : this.from,
        to: this.to
      });
    },
    headline() {
      const range = `setmanes del ${moment(this.from).format("DD/MM")} al ${moment(this.to).format("DD/MM/YYYY")}`;
      return `${this.routes.length} rutes actives · ${range}${this.canEdit ? " · clica un dia per obrir o tancar la ruta" : ""}`;
    }
  },
  async mounted() {
    const me = await service({ requiresAuth: true, cached: true }).get("users/me");
    const permissions = me.data.permissions.map(p => p.permission);
    this.canEdit = permissions.includes("orders_admin") || permissions.includes("orders_delivery");
    this.isOffice = permissions.includes("orders_admin");
    this.isLoading = true;
    const [routes, cities, cityRoutes] = await Promise.all([
      service({ requiresAuth: true, cached: true }).get("routes?_sort=order&_where[active]=true&_limit=-1").then(r => r.data),
      service({ requiresAuth: true, cached: true }).get("cities?_sort=name&_limit=-1").then(r => r.data),
      service({ requiresAuth: true, cached: false }).get("city-routes/basic").then(r => r.data)
    ]);
    this.routes = routes;
    this.cities = cities.map(c => ({ id: c.id, name: c.name }));
    this.cityRoutes = cityRoutes;
    await this.getData();
    this.isLoading = false;
  },
  methods: {
    // when we pass by the town on that route (issues/314)
    slotText(town, route) {
      return slotOf(this.index.linkOf(town.id, route.id), route).text;
    },
    async getData() {
      const range = `_where[date_gte]=${this.from}&_where[date_lte]=${this.to}&_limit=-1`;
      const [closures, festives, orders] = await Promise.all([
        service({ requiresAuth: true, cached: false }).get(`route-festives?${range}`).then(r => r.data),
        service({ requiresAuth: true, cached: true }).get(`festives?${range}`).then(r => r.data).catch(() => []),
        service({ requiresAuth: true, cached: false })
          .get(`orders/table?_where[estimated_delivery_date_gte]=${this.from}&_where[estimated_delivery_date_lte]=${this.to}&_limit=-1`)
          .then(r => r.data)
          .catch(() => [])
      ]);
      this.closures = closures;
      // the entity's holidays (a person's days off have a user)
      this.holidays = festives.filter(f => !f.users_permissions_user).map(f => f.date);
      this.orders = orders;
    },
    cellsOf(route, week) {
      return routeDatesInWeek(route, week.start).map(date =>
        dayCell({ route, date, closures: this.closures, holidays: this.holidays, orderCounts: this.orderCounts, today: this.today })
      );
    },
    routeDaysText(route) {
      return routeDays(route).join(", ");
    },
    routeNote(route) {
      const towns = (this.index.townsByRoute.get(route.id) || []).length;
      const parts = [`${towns} ${towns === 1 ? "població" : "poblacions"}`];
      if (route.volume_discount_price && route.volume_discount_number_of_orders) {
        parts.push(`−${formatMoney(route.volume_discount_price)} a partir de ${route.volume_discount_number_of_orders} comandes`);
      }
      if (route.is_transfer_route) parts.push("fa transferències");
      return parts.join(" · ");
    },
    shortDay(date) {
      return moment(date).locale("ca").format("dd DD/MM");
    },
    longDay(date) {
      const text = moment(date).locale("ca").format("dddd DD/MM/YYYY");
      return text.charAt(0).toUpperCase() + text.slice(1);
    },
    async shift(weeks) {
      this.offset += weeks;
      this.isLoading = true;
      await this.getData();
      this.isLoading = false;
    },
    async goToday() {
      this.offset = 0;
      await this.shift(0);
    },
    async toggle(route, cell) {
      this.saving = true;
      try {
        if (cell.open) {
          // the date as the local YYYY-MM-DD: a Date would be sent as UTC and
          // stored one day early
          await service({ requiresAuth: true }).post("route-festives", { date: cell.date, route: route.id });
        } else if (cell.closure) {
          await service({ requiresAuth: true }).delete(`route-festives/${cell.closure.id}`);
        }
        await this.getData();
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar", type: "is-danger", queue: false });
      } finally {
        this.saving = false;
      }
    },
    async closeAll(holiday) {
      this.saving = true;
      try {
        for (const route of holiday.routes) {
          await service({ requiresAuth: true }).post("route-festives", { date: holiday.date, route: route.id });
        }
        await this.getData();
        this.$buefy.snackbar.open({ message: `Rutes tancades el ${this.shortDay(holiday.date)}`, queue: false });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.holiday-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
  justify-content: space-between;
}
.rd-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22rem;
  gap: 1rem;
  align-items: start;
}
.rd-table-box {
  position: relative;
  padding: 0;
  overflow: hidden;
}
.rd-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: .875rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.rd-legend span {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
}
.rd-asof {
  margin-left: auto;
  color: var(--a-muted);
}
.sw {
  width: .875rem;
  height: .875rem;
  border-radius: 3px;
}
.sw.is-open {
  background: var(--a-accent-soft);
  border: 1px solid var(--a-accent-soft);
}
.sw.is-closed {
  border: 1px dashed var(--a-input);
}
.sw.is-holiday {
  background: var(--a-warn-bg);
  border: 1px solid var(--a-warn-line);
}
.rd-table th,
.rd-table td {
  vertical-align: middle;
}
.rd-day-row td {
  background: var(--a-thead);
  font-size: .875rem;
  color: var(--a-fg-2);
}
.rd-route {
  min-width: 13rem;
  font-weight: 400;
}
.rd-route b,
.rd-route small {
  display: block;
}
.rd-route b {
  color: var(--a-fg);
}
.rd-route small {
  font-size: .75rem;
  color: var(--a-muted);
}
.rd-week {
  min-width: 7.5rem;
}
.rd-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: .375rem .625rem;
  border: 1px solid var(--a-accent-soft);
  border-radius: 8px;
  background: var(--a-accent-soft);
  font: inherit;
  font-size: .75rem;
  text-align: left;
  color: var(--a-accent-hover);
}
.rd-cell + .rd-cell {
  margin-top: .25rem;
}
button.rd-cell {
  cursor: pointer;
}
button.rd-cell:hover {
  border-color: var(--a-accent);
}
.rd-cell b {
  font-size: .8125rem;
}
.rd-cell small {
  color: var(--a-muted);
}
.rd-cell.is-closed {
  border: 1px dashed var(--a-input);
  background: transparent;
  color: var(--a-muted);
}
.rd-cell.is-holiday {
  border-color: var(--a-warn-line);
  background: var(--a-warn-bg);
  color: var(--a-warn-fg);
}
.rd-cell.is-past {
  opacity: .6;
}
.rd-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.lookup-list li {
  padding: .75rem 0;
  border-top: 1px solid var(--a-line-soft);
}
.lookup-list b {
  display: block;
  margin-bottom: .375rem;
  color: var(--a-fg);
}
.route-chips {
  display: flex;
  flex-wrap: wrap;
  gap: .375rem;
}
.route-chip {
  padding: .1875rem .625rem;
  border: 1px solid var(--a-line);
  border-radius: 999px;
  background: var(--a-chip);
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-fg-2);
}
.no-route {
  font-size: .8125rem;
  color: var(--a-over);
}
.lookup-list {
  margin-top: .75rem;
}
.all-towns {
  display: inline-block;
  margin-top: .75rem;
  font-size: .875rem;
  font-weight: 700;
  text-decoration: underline;
}
@media screen and (max-width: 1215px) {
  .rd-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
