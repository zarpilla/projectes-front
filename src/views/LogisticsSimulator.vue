<template>
  <!-- The logistics simulator (issues/361): what an order would cost, before
       entering it. A member quotes from her own warehouse; the office first
       picks the member, then plays with it and can export the quote. Every
       step is the order form's own (src/domain/logisticsQuote.js). -->
  <div class="simulator">
    <title-bar :title-stack="['Rutes i punts', 'Simulador']" subtitle="Quant costaria una comanda: la ruta, el dia i el preu desglossat, sense desar res." />

    <section class="section is-main-section">
      <routes-tabs :is-staff="isOffice" :is-office="isOffice" />
      <b-loading :is-full-page="false" :model-value="isLoading" />

      <div v-if="!isLoading" class="sim-layout">
        <div class="sim-main">
          <!-- who -->
          <section v-if="isOffice" class="a-box">
            <header class="box-head"><h2>Sòcia</h2></header>
            <b-field>
              <b-autocomplete
                v-model="memberSearch"
                placeholder="Tria la sòcia"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredMembers"
                :custom-formatter="memberName"
                clearable
                data-test="member-select"
                @select="selectMember"
              />
            </b-field>
            <p class="box-help">Primer tria la sòcia: el preu depèn del seu magatzem, de les comandes que ja té i dels seus descomptes.</p>
          </section>

          <template v-if="memberId">
            <!-- where from -->
            <section class="a-box">
              <header class="box-head"><h2>D'on surt?</h2></header>
              <b-field label="Magatzem d'origen">
                <b-select v-model="warehouseId" expanded data-test="warehouse-select">
                  <option :value="null" disabled>Tria el magatzem</option>
                  <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
                </b-select>
              </b-field>
              <p v-if="defaultPickup && warehouseId === defaultPickup.id" class="box-help">{{ isOffice ? "El magatzem per defecte de la sòcia." : "El teu magatzem per defecte." }}</p>
              <div v-else-if="warehouseId" class="default-row">
                <p class="box-help">{{ defaultPickup ? `El magatzem per defecte és ${defaultPickup.name}.` : (isOffice ? "La sòcia encara no té magatzem per defecte." : "Encara no tens magatzem per defecte.") }}</p>
                <b-button size="is-small" icon-left="content-save" :loading="savingDefault" data-test="save-default" @click="saveDefault">
                  {{ isOffice ? "Desa'l com a magatzem de la sòcia" : "Desa'l com el meu magatzem" }}
                </b-button>
              </div>
              <b-field v-if="farmPickups.length" class="mt-3">
                <b-checkbox v-model="withFarmPickup" data-test="farm-pickup">Amb recollida a finca</b-checkbox>
              </b-field>
              <b-field v-if="withFarmPickup && farmPickups.length > 1" label="Recollida">
                <b-select v-model="farmPickupId" expanded>
                  <option v-for="p in farmPickups" :key="p.id" :value="p.id">{{ p.name }}</option>
                </b-select>
              </b-field>
            </section>

            <!-- where to -->
            <section class="a-box">
              <header class="box-head"><h2>On va?</h2></header>
              <b-field label="Població">
                <b-autocomplete
                  v-model="townSearch"
                  placeholder="Escriu una població"
                  :keep-first="true"
                  :data="townOptions"
                  field="name"
                  clearable
                  data-test="town-select"
                  @select="selectTown"
                />
              </b-field>
              <template v-if="town">
                <p v-if="!routesOfTown.length" class="notification is-warning is-light">Cap ruta passa per {{ town.name }}.</p>
                <b-field v-else label="Ruta">
                  <div class="pill-group">
                    <button
                      v-for="r in routesOfTown"
                      :key="r.id"
                      type="button"
                      class="button pill"
                      :class="{ 'is-warning': routeId === r.id, 'is-outlined': routeId !== r.id }"
                      :data-day="routeDaysText(r)"
                      @click="selectRoute(r.id)"
                    >{{ r.name }}</button>
                  </div>
                </b-field>
                <b-field v-if="route" label="Data prevista d'entrega">
                  <b-datepicker
                    v-model="date"
                    :show-week-number="false"
                    :locale="'ca-ES'"
                    :first-day-of-week="1"
                    :unselectable-dates="d => !isRouteDay(d)"
                    icon="calendar-today"
                    trap-focus
                    @update:model-value="loadMemberOrders"
                  />
                </b-field>
                <p v-if="dateWarning" class="notification is-warning is-light">{{ dateWarning }}</p>
              </template>
            </section>

            <!-- what -->
            <section class="a-box">
              <header class="box-head"><h2>Què hem de portar?</h2></header>
              <b-field label="Tipus de servei">
                <div class="pill-group">
                  <button
                    v-for="t in deliveryTypes"
                    :key="t.id"
                    type="button"
                    class="button pill"
                    :class="{ 'is-warning': deliveryTypeId === t.id, 'is-outlined': deliveryTypeId !== t.id }"
                    @click="deliveryTypeId = t.id"
                  >{{ t.name }}</button>
                </div>
              </b-field>
              <div class="a-form">
                <b-field label="Caixes">
                  <b-input v-model="units" type="number" min="0" step="1" />
                </b-field>
                <b-field label="Kg">
                  <b-input v-model="kilograms" type="number" min="0" step="any" data-test="kilograms" />
                </b-field>
              </div>
              <b-field class="mt-3">
                <b-checkbox v-model="otherOrderToPoint" :disabled="!multideliveryPercent">
                  Hi haurà una altra comanda al mateix punt d'entrega aquell dia
                  <small v-if="multideliveryPercent" class="has-text-muted">(descompte multientrega del {{ percent(multideliveryPercent) }} %)</small>
                  <small v-else class="has-text-muted">(sense descompte multientrega)</small>
                </b-checkbox>
              </b-field>
            </section>
          </template>
        </div>

        <!-- the quote -->
        <aside class="sim-side">
          <section class="a-box quote" data-test="quote">
            <header class="box-head"><h2>Preu</h2></header>
            <p v-if="!ready" class="box-help">{{ missingText }}</p>
            <template v-else>
              <dl class="quote-list">
                <dt>Ruta</dt><dd>{{ route.name }}</dd>
                <dt>Entrega</dt><dd>{{ formatDate(date) }}<template v-if="slotText"> · {{ slotText }}</template></dd>
                <dt>Tarifa</dt><dd>{{ quote.rate ? quote.rate.name || `#${quote.rate.id}` : "Cap tarifa" }}</dd>
                <dt>Preu de la ruta</dt><dd>{{ money(quote.price) }}</dd>
                <template v-if="quote.volume.discount"><dt>Descompte per volum</dt><dd class="has-text-success">−{{ money(quote.volume.discount) }}</dd></template>
                <template v-if="quote.late.late"><dt>Recàrrec fora de temps</dt><dd class="has-text-danger">+{{ percent(quote.late.surcharge) }} %</dd></template>
                <template v-if="quote.multidelivery.discount"><dt>Descompte multientrega</dt><dd class="has-text-success">−{{ percent(quote.multidelivery.discount) }} %</dd></template>
                <dt class="total">Total (sense IVA)</dt><dd class="total" data-test="quote-total">{{ money(quote.total) }}</dd>
              </dl>
              <p v-if="!quote.rate" class="notification is-warning is-light">Cap tarifa d'aquesta ruta encaixa amb aquest tipus de servei i magatzem.</p>
              <p v-if="quote.volume.fromOrders && !quote.volume.discount" class="box-help">
                Descompte per volum: −{{ money(quote.volume.amount) }} per comanda a partir de {{ quote.volume.fromOrders }} comandes el mateix dia en aquesta ruta (amb aquesta, {{ quote.volume.orders }}).
              </p>
              <p v-if="quote.late.late" class="box-help">Aquest dia ja vas tard: seria una comanda fora de temps.</p>
              <p v-if="transfer" class="box-help">La ruta no passa pel magatzem: les caixes hi arriben amb una transferència (sense cost afegit).</p>
              <download-excel v-if="isOffice" class="mt-3" :data="exportRows" :fields="{ Concepte: 'concepte', Valor: 'valor' }" :name="exportName">
                <b-button size="is-small" icon-left="download" data-test="quote-export">Exporta (.ods)</b-button>
              </download-excel>
            </template>
          </section>
        </aside>
      </div>
    </section>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import TitleBar from "@/components/TitleBar.vue";
import RoutesTabs from "@/components/RoutesTabs.vue";
import { orderMembers } from "@/domain/routeAccess";
import { routeDays, searchTowns, slotOf } from "@/domain/cityRoutes";
import { checkIfDateIsValidInroute } from "@/service/assignRouteRate.js";
import { quoteDate, quoteOrder, quoteRows, townRoutes, transferNeeded } from "@/domain/logisticsQuote";
import { formatMoney, formatNumber } from "@/helpers/format-number";

const idOf = value => (value && typeof value === "object" ? value.id : value);
const OFFICE = ["orders_admin", "admin", "projects"];

export default {
  name: "LogisticsSimulator",
  components: { TitleBar, RoutesTabs },
  data() {
    return {
      isLoading: true,
      permissions: [],
      me: null,
      ordersOptions: {},
      members: [],
      memberSearch: "",
      memberId: null,
      defaultPickup: null,
      savingDefault: false,
      pickups: [],
      deliveryTypes: [],
      routeRates: [],
      routes: [],
      cities: [],
      cityRoutes: [],
      closures: [],
      warehouseId: null,
      withFarmPickup: false,
      farmPickupId: null,
      townSearch: "",
      town: null,
      routeId: null,
      date: null,
      dateWarning: "",
      deliveryTypeId: null,
      units: 1,
      kilograms: 10,
      otherOrderToPoint: false,
      pendingOrders: [],
      routeOrders: []
    };
  },
  computed: {
    isOffice() {
      return this.permissions.some(p => OFFICE.includes(p));
    },
    member() {
      return this.members.find(m => m.id === this.memberId) || null;
    },
    filteredMembers() {
      const q = this.memberSearch.trim().toLowerCase();
      return this.members.filter(m => !q || this.memberName(m).toLowerCase().includes(q));
    },
    warehouses() {
      return this.pickups.filter(p => p && p.pickup === false);
    },
    farmPickups() {
      return this.pickups.filter(p => p && p.pickup === true);
    },
    warehouse() {
      return this.warehouses.find(w => w.id === this.warehouseId) || null;
    },
    farmPickup() {
      if (!this.withFarmPickup) return null;
      return this.farmPickups.find(p => p.id === this.farmPickupId) || this.farmPickups[0] || null;
    },
    townOptions() {
      return searchTowns(this.cities, this.townSearch, 10);
    },
    routesOfTown() {
      return this.town ? townRoutes(this.town.id, this.cityRoutes, this.routes) : [];
    },
    route() {
      return this.routesOfTown.find(r => r.id === this.routeId) || null;
    },
    multideliveryPercent() {
      if (this.member && this.member.multidelivery_discount === false) return 0;
      return Number(this.ordersOptions.multidelivery_discount) || 0;
    },
    sameDayOrders() {
      if (!this.date) return [];
      const day = moment(this.date).format("YYYY-MM-DD");
      return this.routeOrders.filter(o => o.estimated_delivery_date && moment(o.estimated_delivery_date).format("YYYY-MM-DD") === day);
    },
    ready() {
      return Boolean(this.memberId && this.warehouse && this.route && this.date && this.deliveryTypeId && Number(this.kilograms) > 0);
    },
    missingText() {
      if (!this.memberId) return this.isOffice ? "Tria la sòcia." : "";
      if (!this.warehouse) return "Tria el magatzem d'origen.";
      if (!this.town) return "Tria la població d'entrega.";
      if (!this.route) return this.routesOfTown.length ? "Tria la ruta." : "Cap ruta passa per aquesta població.";
      if (!this.date) return "Tria el dia d'entrega.";
      if (!this.deliveryTypeId) return "Tria el tipus de servei.";
      return "Escriu els kg.";
    },
    quote() {
      if (!this.ready) return null;
      return quoteOrder(
        {
          route: this.route,
          date: this.date,
          kilograms: this.kilograms,
          deliveryType: this.deliveryTypeId,
          warehouse: this.warehouse,
          farmPickup: this.farmPickup
        },
        {
          routeRates: this.routeRates,
          pickups: this.pickups,
          ownerId: this.memberId,
          pendingOrders: this.pendingOrders,
          sameDayOrders: this.sameDayOrders,
          otherOrderToPoint: this.otherOrderToPoint,
          multideliveryAllowed: !(this.member && this.member.multidelivery_discount === false),
          ordersOptions: this.ordersOptions,
          // the quote is for the member: the office plays with her case
          exempt: false
        }
      );
    },
    transfer() {
      return !this.farmPickup && transferNeeded(this.warehouse, this.route, this.cityRoutes);
    },
    slotText() {
      if (!this.town || !this.route) return "";
      const link = this.cityRoutes.find(cr => idOf(cr.city) === this.town.id && idOf(cr.route) === this.route.id);
      return slotOf(link, this.route).text;
    },
    exportRows() {
      if (!this.quote) return [];
      const type = this.deliveryTypes.find(t => t.id === this.deliveryTypeId);
      return quoteRows(
        { route: this.route, date: this.date, kilograms: this.kilograms, units: this.units, warehouse: this.warehouse, farmPickup: this.farmPickup },
        this.quote,
        { member: this.member ? this.memberName(this.member) : "", town: this.town ? this.town.name : "", deliveryTypeName: type ? type.name : "" }
      );
    },
    exportName() {
      return `pressupost-logistica-${moment().format("YYYYMMDD-HHmm")}.ods`;
    }
  },
  async mounted() {
    try {
      await this.getData();
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    async getData() {
      const api = service({ requiresAuth: true, cached: true });
      const me = (await api.get("users/me")).data;
      this.me = me;
      this.permissions = (me.permissions || []).map(p => p.permission);
      const [org, pickups, types, rates, routes, cities, cityRoutes, closures] = await Promise.all([
        api.get("me").then(r => r.data).catch(() => ({})),
        api.get("pickups?_limit=-1").then(r => r.data),
        api.get("delivery-types?_limit=-1").then(r => r.data),
        api.get("route-rates?_limit=-1").then(r => r.data),
        api.get("routes?_limit=-1&_sort=order:ASC&_where[active]=true").then(r => r.data),
        api.get("cities?_limit=-1&_sort=name").then(r => r.data),
        api.get("city-routes/basic").then(r => r.data),
        api.get("route-festives?_limit=-1").then(r => r.data).catch(() => [])
      ]);
      this.ordersOptions = (org && org.orders_options) || {};
      this.pickups = pickups || [];
      this.deliveryTypes = types || [];
      this.deliveryTypeId = this.deliveryTypes.length ? this.deliveryTypes[0].id : null;
      this.routeRates = rates || [];
      this.routes = routes || [];
      this.cities = cities || [];
      this.cityRoutes = cityRoutes || [];
      this.closures = closures || [];

      if (this.isOffice) {
        this.members = orderMembers((await api.get("users?_limit=-1")).data || []);
      } else {
        this.members = [me];
        await this.selectMember(me);
      }
    },
    memberName(m) {
      return m ? m.fullname || m.username || `#${m.id}` : "";
    },
    async selectMember(m) {
      this.memberId = m ? m.id : null;
      this.defaultPickup = null;
      this.warehouseId = null;
      if (!m) return;
      try {
        const path = this.isOffice ? `users/${m.id}/default-pickup` : "users/me/default-pickup";
        this.defaultPickup = (await service({ requiresAuth: true }).get(path)).data.pickup;
      } catch (e) {
        this.defaultPickup = null;
      }
      if (this.defaultPickup) this.warehouseId = this.defaultPickup.id;
      else if (this.warehouses.length === 1) this.warehouseId = this.warehouses[0].id;
      await this.loadMemberOrders();
    },
    async saveDefault() {
      if (!this.warehouseId || !this.memberId) return;
      this.savingDefault = true;
      try {
        const path = this.isOffice ? `users/${this.memberId}/default-pickup` : "users/me/default-pickup";
        this.defaultPickup = (await service({ requiresAuth: true }).put(path, { pickup: this.warehouseId })).data.pickup;
        this.$buefy.toast.open({ message: "Magatzem per defecte desat", type: "is-success" });
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar el magatzem", type: "is-danger" });
      } finally {
        this.savingDefault = false;
      }
    },
    selectTown(t) {
      this.town = t || null;
      this.routeId = null;
      this.date = null;
      this.dateWarning = "";
      if (this.routesOfTown.length === 1) this.selectRoute(this.routesOfTown[0].id);
    },
    selectRoute(id) {
      this.routeId = id;
      const { nextDay, warning } = quoteDate(this.route, { ordersOptions: this.ordersOptions, closures: this.closures });
      this.date = nextDay.clone().startOf("day").toDate();
      this.dateWarning = warning;
      this.loadMemberOrders();
    },
    isRouteDay(d) {
      if (!this.route) return false;
      const day = moment(d);
      return !day.isBefore(moment(), "day") && checkIfDateIsValidInroute(this.route, day, this.closures);
    },
    routeDaysText(r) {
      return routeDays(r).join(", ");
    },
    // the member's orders on the route: the pending ones (rate of a farm
    // pickup) and those of the day (volume discount)
    async loadMemberOrders() {
      if (!this.memberId || !this.routeId) {
        this.pendingOrders = [];
        this.routeOrders = [];
        return;
      }
      const today = moment().format("YYYY-MM-DD");
      try {
        const rows = (
          await service({ requiresAuth: true }).get(
            `orders?_limit=-1&_where[owner]=${this.memberId}&_where[route]=${this.routeId}&_where[estimated_delivery_date_gte]=${today}&populate[0]=owner&populate[1]=pickup&populate[2]=route`
          )
        ).data || [];
        this.routeOrders = rows.filter(o => o.status !== "cancelled");
        this.pendingOrders = rows.filter(o => o.status === "pending");
      } catch (e) {
        this.routeOrders = [];
        this.pendingOrders = [];
      }
    },
    money(v) {
      return formatMoney(Number(v) || 0);
    },
    percent(v) {
      return formatNumber(Number(v) || 0, 2);
    },
    formatDate(d) {
      return d ? moment(d).format("dddd D/M/YYYY") : "";
    }
  }
};
</script>

<style scoped>
.sim-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22rem;
  gap: 1rem;
  align-items: start;
}
.sim-main {
  display: grid;
  gap: 1rem;
}
.sim-side {
  position: sticky;
  top: 1rem;
}
.box-help {
  font-size: .875rem;
  color: var(--a-muted);
}
.default-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
}
.a-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .75rem;
}
.pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}
.pill.button {
  height: auto;
  min-height: 2.5rem;
  flex-direction: column;
  align-items: flex-start;
  padding: .375rem .75rem;
  white-space: normal;
  text-align: left;
}
.pill.button[data-day]:not([data-day=""])::after {
  content: attr(data-day);
  font-size: .6875rem;
  font-weight: 600;
  color: var(--a-muted);
}
.quote-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .25rem .75rem;
}
.quote-list dd {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.quote-list .total {
  font-weight: 800;
  font-size: 1.125rem;
  border-top: 1px solid var(--a-border, #ddd);
  padding-top: .375rem;
  margin-top: .25rem;
}
@media (max-width: 900px) {
  .sim-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .sim-side {
    position: static;
  }
}
</style>
