<template>
  <!-- Redesign A (mockup A-Log-Facturar): the delivered orders not invoiced yet,
       by month and member, to invoice to the quarter's logistics project. -->
  <div class="orders-invoice">
    <b-loading :is-full-page="true" v-model="importing" :can-cancel="false" />

    <title-bar :title-stack="['Logística', 'Facturar']" subtitle="Comandes lliurades encara no facturades, per sòcia i mes d'entrega">
      <download-excel :data="exportRows" name="facturar.ods" :fields="exportFields">
        <b-button icon-left="download">Exporta</b-button>
      </download-excel>
      <b-button type="is-primary" icon-left="file-document-outline" :disabled="!projectId || !selectedGroups.length || importing" @click="invoiceSelection">
        Factura la selecció{{ selectedOrders ? ` (${selectedOrders} comandes)` : "" }}
      </b-button>
    </title-bar>

    <section class="section is-main-section">
      <div class="doc-kpis">
        <div class="doc-kpi">
          <span>Per facturar</span>
          <b>{{ money(totals.amount) }}</b>
          <small>base imposable, sense IVA</small>
        </div>
        <div class="doc-kpi">
          <span>Comandes lliurades</span>
          <b>{{ totals.count }}</b>
          <small>de {{ totals.owners }} sòcies</small>
        </div>
        <div class="doc-kpi">
          <span>Descomptes aplicats</span>
          <b>{{ money(totals.discounts) }}</b>
          <small>multientrega, recollida i volum</small>
        </div>
        <div class="doc-kpi">
          <span>Seleccionat</span>
          <b>{{ money(selectedAmount) }}</b>
          <small>{{ selectedOrders }} comandes</small>
        </div>
      </div>

      <section class="a-box invoice-setup">
        <div class="setup-row">
          <b-field label="Projecte on es creen les factures *" class="setup-project" :type="!projectId && triedWithoutProject ? 'is-danger' : ''" :message="!projectId && triedWithoutProject ? 'Cal triar un projecte abans de facturar.' : ''">
            <b-autocomplete
              v-model="projectSearch"
              placeholder="Escriu el nom del projecte..."
              :keep-first="false"
              :open-on-focus="true"
              :data="filteredProjects"
              field="name"
              :clearable="true"
              @select="projectSelected"
            />
          </b-field>
          <b-field label="Mes d'entrega">
            <div class="segmented" role="group" aria-label="Mes d'entrega">
              <button type="button" :class="{ 'is-on': !monthFilter }" @click="monthFilter = null">Tots</button>
              <button v-for="m in months" :key="m" type="button" :class="{ 'is-on': monthFilter === m }" @click="monthFilter = m">{{ monthShort(m) }}</button>
            </div>
          </b-field>
        </div>
        <div v-if="suggestion" class="notification is-info suggestion">
          <template v-if="suggestion.match">
            <span>Les comandes de {{ suggestion.label }} van al projecte <b>{{ suggestion.match.name }}</b>.</span>
            <button v-if="projectId !== suggestion.match.id" type="button" class="link-button" @click="projectSelected(suggestion.match)">Fes-lo servir</button>
          </template>
          <template v-else>
            <span>Encara no hi ha cap projecte de logística per al <b>{{ suggestion.label }}</b><template v-if="suggestion.latest">; l'últim és «{{ suggestion.latest.name }}»</template>.</span>
            <router-link to="/project/0" class="link-button">Crea el projecte</router-link>
          </template>
        </div>
      </section>

      <div class="inv-layout">
        <section class="a-box inv-box">
          <b-loading :is-full-page="false" :model-value="isLoading" />
          <div class="table-container">
            <table class="table is-fullwidth inv-table">
              <thead>
                <tr>
                  <th class="col-check"><b-checkbox :model-value="allChecked" :indeterminate="someChecked" aria-label="Selecciona-les totes" @update:model-value="toggleAll" /></th>
                  <th>Sòcia</th>
                  <th class="has-text-right">Comandes</th>
                  <th class="has-text-right">Caixes</th>
                  <th class="has-text-right">Kg</th>
                  <th class="has-text-right">Descomptes</th>
                  <th class="has-text-right">Import</th>
                  <th></th>
                </tr>
              </thead>
              <tbody v-for="month in visibleMonths" :key="month.month">
                <tr class="month-row">
                  <td class="col-check"><b-checkbox :model-value="monthChecked(month)" :indeterminate="monthSome(month)" :aria-label="`Selecciona ${monthLabel(month.month)}`" @update:model-value="toggleMonth(month, $event)" /></td>
                  <td><b>{{ monthLabel(month.month) }}</b> <span class="has-text-muted">· {{ month.groups.length }} {{ month.groups.length === 1 ? "sòcia" : "sòcies" }}</span></td>
                  <td class="has-text-right num"><b>{{ month.count }}</b></td>
                  <td colspan="3"></td>
                  <td class="has-text-right num"><b>{{ money(month.amount) }}</b></td>
                  <td></td>
                </tr>
                <tr v-for="g in month.groups" :key="g.key" :class="{ 'is-checked': selected.includes(g.key) }">
                  <td class="col-check"><b-checkbox :model-value="selected.includes(g.key)" :aria-label="`Selecciona ${ownerName(g)}`" @update:model-value="toggle(g, $event)" /></td>
                  <td class="col-owner">
                    <b>{{ ownerName(g) }}</b>
                    <router-link v-if="g.contact" :to="{ name: 'contacts.edit', params: { id: g.contact.id } }">{{ g.contact.name }}</router-link>
                  </td>
                  <td class="has-text-right num">{{ g.count }}</td>
                  <td class="has-text-right num">{{ formatNum(g.units) }}</td>
                  <td class="has-text-right num">{{ formatNum(g.kg) }}</td>
                  <td class="has-text-right num">{{ g.discounts ? money(g.discounts) : "—" }}</td>
                  <td class="has-text-right num"><b>{{ money(g.amount) }}</b></td>
                  <td class="has-text-right">
                    <b-button size="is-small" :disabled="importing || !projectId" @click="invoiceGroup(g)">Factura</b-button>
                  </td>
                </tr>
              </tbody>
              <tbody v-if="!isLoading && !visibleMonths.length">
                <tr><td colspan="8" class="box-empty">No hi ha comandes lliurades per facturar.</td></tr>
              </tbody>
              <tfoot v-if="visibleMonths.length">
                <tr>
                  <td></td>
                  <td><b>Total</b></td>
                  <td class="has-text-right num"><b>{{ visibleTotals.count }}</b></td>
                  <td class="has-text-right num"><b>{{ formatNum(visibleTotals.units) }}</b></td>
                  <td class="has-text-right num"><b>{{ formatNum(visibleTotals.kg) }}</b></td>
                  <td class="has-text-right num"><b>{{ money(visibleTotals.discounts) }}</b></td>
                  <td class="has-text-right num"><b>{{ money(visibleTotals.amount) }}</b></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <aside class="a-box inv-side">
          <header class="box-head"><h2>Últimes factures del projecte</h2></header>
          <p v-if="!projectId" class="box-empty">Tria un projecte per veure'n les factures.</p>
          <p v-else-if="!lastInvoices.length" class="box-empty">Aquest projecte encara no té factures.</p>
          <ul v-else class="last-invoices">
            <li v-for="inv in lastInvoices" :key="inv.id">
              <div>
                <router-link :to="`/document/${inv.id}/emitted-invoices`"><b>{{ (inv.contact && inv.contact.name) || "—" }}</b></router-link>
                <small>{{ formatDate(inv.emitted) }}</small>
              </div>
              <span class="tag" :class="inv.state === 'draft' ? '' : 'is-success is-light'">{{ inv.state === "draft" ? "Esborrany" : inv.code }}</span>
              <b class="num">{{ money(inv.total_base) }}</b>
            </li>
          </ul>
          <router-link to="/emitted-invoices" class="all-link">Totes les factures emeses →</router-link>
        </aside>
      </div>
    </section>
  </div>
</template>

<script>
import service from "@/service/index";
import moment from "moment";
import TitleBar from "@/components/TitleBar.vue";
import { formatMoney, formatNumber } from "@/helpers/format-number";
import { groupOrders, quarterOf, quarterProject } from "@/domain/logisticsInvoicing.js";

export default {
  name: "OrdersInvoiceTable",
  components: {
    TitleBar
  },
  data() {
    return {
      isLoading: false,
      importing: false,
      orders: [],
      groups: [],
      contacts: [],
      projectSearch: "",
      projectId: null,
      projects: [],
      monthFilter: null,
      selected: [],
      lastInvoices: [],
      triedWithoutProject: false,
      exportFields: { Mes: "month", Sòcia: "owner", Comandes: "count", Caixes: "units", Kg: "kg", Descomptes: "discounts", Import: "amount" }
    };
  },
  computed: {
    filteredProjects() {
      const q = this.projectSearch.toLowerCase();
      return this.projects.filter(p => p.name.toString().toLowerCase().includes(q));
    },
    months() {
      return [...new Set(this.groups.map(g => g.month))];
    },
    visibleGroups() {
      return this.monthFilter ? this.groups.filter(g => g.month === this.monthFilter) : this.groups;
    },
    visibleMonths() {
      const out = [];
      for (const g of this.visibleGroups) {
        let m = out.find(x => x.month === g.month);
        if (!m) out.push((m = { month: g.month, groups: [], count: 0, amount: 0 }));
        m.groups.push(g);
        m.count += g.count;
        m.amount += g.amount;
      }
      return out;
    },
    totals() {
      const sum = key => this.groups.reduce((a, g) => a + g[key], 0);
      return { amount: sum("amount"), count: sum("count"), discounts: sum("discounts"), owners: new Set(this.groups.map(g => g.owner.id)).size };
    },
    visibleTotals() {
      const sum = key => this.visibleGroups.reduce((a, g) => a + g[key], 0);
      return { amount: sum("amount"), count: sum("count"), units: sum("units"), kg: sum("kg"), discounts: sum("discounts") };
    },
    // only the ticked rows of the month shown: rows ticked under another
    // month are not invoiced behind the user's back (issues/153)
    selectedGroups() {
      return this.visibleGroups.filter(g => this.selected.includes(g.key));
    },
    selectedOrders() {
      return this.selectedGroups.reduce((a, g) => a + g.count, 0);
    },
    selectedAmount() {
      return this.selectedGroups.reduce((a, g) => a + g.amount, 0);
    },
    allChecked() {
      return this.visibleGroups.length > 0 && this.visibleGroups.every(g => this.selected.includes(g.key));
    },
    someChecked() {
      return !this.allChecked && this.visibleGroups.some(g => this.selected.includes(g.key));
    },
    // the quarter of the newest month shown, and its project
    suggestion() {
      const month = this.monthFilter || this.months[0];
      if (!month) return null;
      const q = quarterOf(month);
      return { label: `${q.quarter}T ${q.year}`, ...quarterProject(this.projects, q) };
    },
    exportRows() {
      return this.visibleGroups.map(g => ({ month: g.month, owner: this.ownerName(g), count: g.count, units: g.units, kg: g.kg, discounts: g.discounts.toFixed(2), amount: g.amount.toFixed(2) }));
    }
  },
  watch: {
    // typing in the project field after picking one unpicks it (issues/153)
    projectSearch(text) {
      if (!this.projectId) return;
      const picked = this.projects.find(p => p.id === this.projectId);
      if (!picked || picked.name !== text) {
        this.projectId = null;
        this.lastInvoices = [];
      }
    }
  },
  async mounted() {
    await this.getData();
  },
  methods: {
    async getData() {
      this.isLoading = true;
      const [orders, contacts, projects] = await Promise.all([
        service({ requiresAuth: true }).get("orders?_limit=-1&_sort=route_date:DESC,id:DESC&_where[status_eq]=delivered").then(r => r.data),
        service({ requiresAuth: true, cached: true }).get("contacts?_limit=-1&_sort=name:ASC&_where[users_permissions_user_gt]=0").then(r => r.data),
        service({ requiresAuth: true, cached: true }).get("projects/basic?_limit=-1&_sort=name:ASC").then(r => r.data)
      ]);
      this.orders = orders;
      this.contacts = contacts;
      this.projects = projects;
      this.groups = groupOrders(orders).map(g => ({
        ...g,
        contact: contacts.find(c => c.users_permissions_user && c.users_permissions_user.id === g.owner.id) || null
      }));
      this.selected = this.selected.filter(key => this.groups.some(g => g.key === key));
      this.isLoading = false;
    },
    ownerName(g) {
      return g.owner.fullname || g.owner.username;
    },
    toggle(g, on) {
      this.selected = on ? [...new Set([...this.selected, g.key])] : this.selected.filter(k => k !== g.key);
    },
    toggleAll(on) {
      const keys = this.visibleGroups.map(g => g.key);
      this.selected = on ? [...new Set([...this.selected, ...keys])] : this.selected.filter(k => !keys.includes(k));
    },
    monthChecked(month) {
      return month.groups.every(g => this.selected.includes(g.key));
    },
    monthSome(month) {
      return !this.monthChecked(month) && month.groups.some(g => this.selected.includes(g.key));
    },
    toggleMonth(month, on) {
      const keys = month.groups.map(g => g.key);
      this.selected = on ? [...new Set([...this.selected, ...keys])] : this.selected.filter(k => !keys.includes(k));
    },
    async invoiceOrders(orders, { quiet = false } = {}) {
      if (!this.projectId) {
        this.triedWithoutProject = true;
        return false;
      }
      this.importing = true;
      let ok = true;
      try {
        const response = await service({ requiresAuth: true }).post("orders/invoice", { orders, project: this.projectId });
        // the backend skips orders already invoiced (or still linked to an invoice)
        const skipped = response && response.data && response.data.skipped;
        if (skipped && skipped.length) {
          this.$buefy.snackbar.open({ message: `${skipped.length} comanda${skipped.length > 1 ? "es" : ""} ja estaven facturades i s'han saltat`, type: "is-warning", duration: 5000 });
        }
        if (!quiet) this.$buefy.snackbar.open({ message: "Comandes facturades correctament", type: "is-success" });
      } catch (error) {
        ok = false;
        this.$buefy.snackbar.open({ message: (error && error.data && error.data.message) || "Error al facturar les comandes", type: "is-danger" });
      }
      this.importing = false;
      if (!quiet) {
        await this.getData();
        this.loadLastInvoices();
      }
      return ok;
    },
    projectName() {
      const p = this.projects.find(x => x.id === this.projectId);
      return p ? p.name : "";
    },
    // ask first, with what will be created (issues/153)
    confirmInvoicing(groups, onConfirm) {
      const count = groups.reduce((a, g) => a + g.count, 0);
      const amount = groups.reduce((a, g) => a + g.amount, 0);
      const invoices = groups.length === 1 ? `1 factura (a ${this.ownerName(groups[0])}, ${this.monthLabel(groups[0].month).toLowerCase()})` : `${groups.length} factures`;
      this.$buefy.dialog.confirm({
        title: "Facturar comandes",
        message: `Es crearan ${invoices} en esborrany amb ${count} comandes per ${this.money(amount)}, al projecte <b>${this.projectName()}</b>. Vols continuar?`,
        confirmText: "Factura",
        cancelText: "Cancel·la",
        onConfirm
      });
    },
    invoiceGroup(g) {
      if (!this.projectId) {
        this.triedWithoutProject = true;
        return;
      }
      this.confirmInvoicing([g], () => this.invoiceOrders(g.orders));
    },
    // one invoice per member and month, as with the row buttons
    invoiceSelection() {
      if (!this.projectId) {
        this.triedWithoutProject = true;
        return;
      }
      const groups = this.selectedGroups;
      if (!groups.length) return;
      this.confirmInvoicing(groups, () => this.runInvoiceSelection(groups));
    },
    async runInvoiceSelection(groups) {
      let done = 0;
      for (const g of groups) {
        if (await this.invoiceOrders(g.orders, { quiet: true })) done++;
      }
      this.$buefy.snackbar.open({ message: `${done} de ${groups.length} factures creades`, type: done === groups.length ? "is-success" : "is-warning" });
      this.selected = [];
      await this.getData();
      this.loadLastInvoices();
    },
    projectSelected(project) {
      if (!project) {
        this.projectId = null;
        this.lastInvoices = [];
        return;
      }
      this.projectSearch = project.name;
      this.projectId = project.id;
      this.triedWithoutProject = false;
      this.loadLastInvoices();
    },
    async loadLastInvoices() {
      if (!this.projectId) return;
      this.lastInvoices = await service({ requiresAuth: true })
        .get(`emitted-invoices?_where[projects.id]=${this.projectId}&_sort=id:DESC&_limit=6`)
        .then(r => r.data)
        .catch(() => []);
    },
    monthLabel(month) {
      const text = moment(month, "YYYY-MM").locale("ca").format("MMMM YYYY");
      return text.charAt(0).toUpperCase() + text.slice(1);
    },
    monthShort(month) {
      return moment(month, "YYYY-MM").format("MM/YYYY");
    },
    formatDate(date) {
      return date ? moment(date).format("DD/MM/YYYY") : "";
    },
    formatNum(value) {
      return formatNumber(Number(value) || 0, 2);
    },
    money(value) {
      return formatMoney(Number(value) || 0);
    }
  }
};
</script>

<style scoped>
.orders-invoice :deep(.title-bar .actions) {
  flex-wrap: wrap;
}
.invoice-setup {
  margin-bottom: 1rem;
}
.setup-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  align-items: flex-start;
}
.setup-project {
  flex: 1 1 22rem;
  max-width: 34rem;
}
.suggestion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
  justify-content: space-between;
  margin: 1rem 0 0;
}
.link-button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 800;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.inv-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22rem;
  gap: 1rem;
  align-items: start;
}
.inv-box {
  position: relative;
  padding: 0;
  overflow: hidden;
}
.inv-table td {
  vertical-align: middle;
}
.col-check {
  width: 2.5rem;
}
.num {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.month-row td {
  background: var(--a-thead);
}
tr.is-checked td {
  background: var(--a-accent-soft);
}
.col-owner b,
.col-owner a {
  display: block;
}
.col-owner a {
  font-size: .75rem;
  font-weight: 600;
}
.inv-table tfoot td {
  border-top: 2px solid var(--a-line);
}
.box-empty {
  padding: 1.5rem !important;
  text-align: center;
  color: var(--a-muted);
}
.last-invoices li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: .5rem;
  align-items: center;
  padding: .625rem 0;
  border-bottom: 1px solid var(--a-line-soft);
}
.last-invoices small {
  display: block;
  font-size: .75rem;
  color: var(--a-muted);
}
.all-link {
  display: inline-block;
  margin-top: .75rem;
  font-size: .875rem;
  font-weight: 700;
  text-decoration: underline;
}
@media screen and (max-width: 1215px) {
  .inv-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
