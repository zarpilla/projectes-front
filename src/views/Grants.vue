<template>
  <div>
    <title-bar :title-stack="['Informes', 'Subvencions']" :subtitle="subtitle">
      <router-link to="/justifications" class="button">Justificacions</router-link>
    </title-bar>
    <section class="section is-main-section">
      <b-loading :is-full-page="true" v-model="loading" :can-cancel="false"></b-loading>
      <!-- Redesign A: state tabs with counts, search, figures and what's missing per project -->
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <div class="segmented" role="group" aria-label="Estat projecte">
          <button
            v-for="s in stateTabs"
            :key="s.id"
            type="button"
            :class="{ 'is-on': state === s.id }"
            @click="state = s.id"
          >{{ s.name }} · {{ s.count }}</button>
        </div>
        <b-input v-model="search" class="filter-search grants-search" icon="magnify" placeholder="Cerca per nom o expedient" aria-label="Cerca per nom o expedient" />
      </form>

      <div class="doc-kpis">
        <div class="doc-kpi">
          <span>Import total</span>
          <b>{{ withAmount.length ? money(totalAmount) : "—" }}</b>
          <small>{{ withAmount.length }} de {{ shown.length }} projectes en tenen</small>
        </div>
        <div class="doc-kpi">
          <span>Cofinançament</span>
          <b>{{ withCofinancing.length ? money(totalCofinancing) : "—" }}</b>
          <small>{{ withCofinancing.length ? withCofinancing.length + " projectes en tenen" : "Cap projecte en té" }}</small>
        </div>
        <div class="doc-kpi">
          <span>Propera justificació</span>
          <b>{{ nextJustification ? date(nextJustification.justification_date) : "—" }}</b>
          <small>{{ nextJustification ? nextJustification.name : "Cap projecte té data de justificació pendent" }}</small>
        </div>
      </div>

      <div v-if="incomplete.length" class="notification is-warning grants-warning">
        <span><b>{{ incomplete.length === shown.length ? `Tots ${incomplete.length}` : incomplete.length }} tenen dades per completar.</b> Sense import, Justificacions no pot calcular què queda pendent.</span>
        <button type="button" class="link-button" @click="onlyIncomplete = !onlyIncomplete">{{ onlyIncomplete ? "Mostra'ls tots" : "Mostra només les incompletes" }}</button>
      </div>

      <div class="card has-table">
        <b-table :data="tableRows" default-sort="name" hoverable>
          <b-table-column label="Projecte · expedient" field="name" sortable v-slot="props">
            <router-link :to="{ name: 'project.edit', params: { id: props.row.id } }" class="doc-title">{{ props.row.name }}</router-link>
            <div class="doc-subline">
              {{ props.row.grantable_reference || "Sense expedient" }}<template v-if="missing(props.row).length"> · <span class="has-text-warning-dark">falta {{ missing(props.row).join(", ") }}</span></template>
            </div>
          </b-table-column>
          <b-table-column label="Òrgan convocant" field="organ" sortable v-slot="props">
            <span :class="{ 'has-text-muted': !props.row.organ }">{{ props.row.organ || "—" }}</span>
          </b-table-column>
          <b-table-column label="Període" field="date_start" sortable v-slot="props">
            <span class="is-nowrap">{{ date(props.row.date_start) }} – {{ date(props.row.date_end) }}</span>
          </b-table-column>
          <b-table-column label="Import total" field="grantable_amount_total" sortable numeric v-slot="props">
            <b v-if="Number(props.row.grantable_amount_total)">{{ money(props.row.grantable_amount_total) }}</b>
            <span v-else class="has-text-muted">—</span>
          </b-table-column>
          <b-table-column label="Cofinançament" field="grantable_cofinancing" sortable numeric v-slot="props">
            <span v-if="Number(props.row.grantable_cofinancing)">{{ money(props.row.grantable_cofinancing) }}</span>
            <span v-else class="has-text-muted">—</span>
          </b-table-column>
          <b-table-column label="Sol·licitud" field="grantable_date" sortable v-slot="props">
            <span :class="{ 'has-text-muted': !props.row.grantable_date }">{{ date(props.row.grantable_date) || "—" }}</span>
          </b-table-column>
          <b-table-column label="Justificació" field="justification_date" sortable v-slot="props">
            <span :class="{ 'has-text-muted': !props.row.justification_date }">{{ date(props.row.justification_date) || "—" }}</span>
          </b-table-column>
          <b-table-column v-if="state === 0" label="Estat" field="stateName" sortable v-slot="props">
            {{ props.row.stateName }}
          </b-table-column>
          <template #empty>
            <p class="has-text-centered has-text-muted py-5">Cap projecte subvencionable amb aquests filtres.</p>
          </template>
        </b-table>
        <div class="grants-total">
          <b>Total · {{ tableRows.length }} projectes</b>
          <b>{{ money(tableRows.reduce((a, r) => a + (Number(r.grantable_amount_total) || 0), 0)) }}</b>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import service from "@/service/index";
import sortBy from "lodash/sortBy";
import moment from "moment";
import { formatMoney } from "@/helpers/format-number";

export default {
  name: "Grants",
  components: { TitleBar },
  data() {
    return {
      loading: false,
      projects: [],
      project_states: [],
      // 1 = Actiu, as before; 0 = all
      state: 1,
      search: "",
      onlyIncomplete: false
    };
  },
  computed: {
    rows() {
      return this.projects.map(p => ({
        ...p,
        organ: p.clients && p.clients.length ? p.clients[0].name : "",
        stateId: p.project_state ? (p.project_state.id || p.project_state) : null,
        stateName: p.project_state && p.project_state.name ? p.project_state.name : ""
      }));
    },
    stateTabs() {
      const tabs = this.project_states
        .map(s => ({ id: s.id, name: s.name, count: this.rows.filter(r => r.stateId === s.id).length }))
        .filter(t => t.count || t.id === 1);
      return [...tabs, { id: 0, name: "Tots", count: this.rows.length }];
    },
    shown() {
      const q = this.search.trim().toLowerCase();
      return this.rows.filter(r =>
        (!this.state || r.stateId === this.state) &&
        (!q || [r.name, r.grantable_reference].some(v => v && String(v).toLowerCase().includes(q))));
    },
    incomplete() {
      return this.shown.filter(r => this.missing(r).length);
    },
    tableRows() {
      return this.onlyIncomplete ? this.incomplete : this.shown;
    },
    withAmount() {
      return this.shown.filter(r => Number(r.grantable_amount_total));
    },
    totalAmount() {
      return this.withAmount.reduce((a, r) => a + Number(r.grantable_amount_total), 0);
    },
    withCofinancing() {
      return this.shown.filter(r => Number(r.grantable_cofinancing));
    },
    totalCofinancing() {
      return this.withCofinancing.reduce((a, r) => a + Number(r.grantable_cofinancing), 0);
    },
    nextJustification() {
      const today = moment().format("YYYY-MM-DD");
      return sortBy(this.shown.filter(r => r.justification_date && r.justification_date >= today), "justification_date")[0] || null;
    },
    subtitle() {
      const tab = this.stateTabs.find(t => t.id === this.state);
      return `${this.shown.length} projectes subvencionables${tab && tab.id ? " · " + tab.name.toLowerCase() : ""}`;
    }
  },
  async mounted() {
    this.loading = true;
    try {
      const [states, projects] = await Promise.all([
        service({ requiresAuth: true }).get("project-states").then(r => r.data),
        service({ requiresAuth: true }).get("projects/basic?_limit=-1&grantable=true").then(r => r.data)
      ]);
      this.project_states = states;
      this.projects = sortBy(projects, "name");
    } finally {
      this.loading = false;
    }
  },
  methods: {
    date(value) {
      return value ? moment(value).format("DD/MM/YYYY") : "";
    },
    money(value) {
      return formatMoney(Number(value) || 0);
    },
    missing(row) {
      const out = [];
      if (!Number(row.grantable_amount_total)) out.push("import");
      if (!row.organ) out.push("òrgan");
      if (!row.justification_date) out.push("justificació");
      return out;
    }
  }
};
</script>

<style scoped>
.grants-search {
  margin-left: auto;
  flex: 0 1 22rem;
}
.grants-warning {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.link-button {
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  font-weight: 800;
  text-decoration: underline;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.grants-total {
  display: flex;
  justify-content: space-between;
  padding: .75rem 1rem;
  border-top: 1px solid var(--a-line);
  background: var(--a-thead);
}
</style>
