<template>
  <!-- «Resum» of a contact (decided 2026-10-30): its projects and documents -->
  <div class="contact-summary">
    <b-loading :is-full-page="false" :model-value="isLoading" />
    <p v-if="error" class="notification is-danger is-light">{{ error }}</p>

    <template v-if="loaded">
      <div class="filter-bar">
        <label class="filter-select">
          <span>Període</span>
          <b-select v-model="period" aria-label="Període">
            <option v-for="y in years" :key="y" :value="y">{{ yearLabel(y) }}</option>
            <option :value="allYears">Històric</option>
          </b-select>
        </label>
      </div>

      <div class="doc-kpis">
        <div class="doc-kpi">
          <span>Projectes</span>
          <b>{{ projects.length }}</b>
          <small>{{ projectsSmall }}</small>
        </div>
        <div class="doc-kpi">
          <span>Facturat {{ periodName }}</span>
          <b>{{ money(figures.sales) }}</b>
          <small>{{ isAll ? "Sense IVA" : `Històric: ${money(figures.salesAll)}` }}</small>
        </div>
        <div class="doc-kpi" :class="{ 'is-warn': figures.overdueCount }">
          <span>Pendent de cobrar</span>
          <b>{{ money(figures.toCollect) }}</b>
          <small>{{ collectSmall }}</small>
        </div>
        <div class="doc-kpi">
          <span>Comprat {{ periodName }}</span>
          <b>{{ money(figures.purchases) }}</b>
          <small>{{ isAll ? "Sense IVA" : `Històric: ${money(figures.purchasesAll)}` }}</small>
        </div>
        <div class="doc-kpi">
          <span>Pendent de pagar</span>
          <b>{{ money(figures.toPay) }}</b>
          <small>{{ figures.toPayCount ? `${figures.toPayCount} ${figures.toPayCount === 1 ? "document" : "documents"}, de tots els anys` : "Res pendent" }}</small>
        </div>
      </div>

      <h3 class="summary-title">Projectes</h3>
      <div class="table-wrap">
        <table v-if="projectRows.length" class="table is-fullwidth summary-table">
          <thead>
            <tr>
              <th>Projecte</th>
              <th>Rol</th>
              <th>Estat</th>
              <th>Dates</th>
              <th class="has-text-right">Facturat {{ periodName }}</th>
              <th class="has-text-right">Comprat {{ periodName }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in projectRows" :key="p.id">
              <td><router-link :to="{ name: 'project.edit', params: { id: p.id } }">{{ p.name }}</router-link></td>
              <td><span v-for="r in p.roles" :key="r" class="tag mr-1">{{ roleLabel(r) }}</span></td>
              <td>{{ p.state ? p.state.name : "—" }}</td>
              <td class="is-nowrap">{{ dateRange(p) }}</td>
              <td class="has-text-right is-nowrap">{{ p.sales ? money(p.sales) : "—" }}<sup v-if="p.shared && p.sales" title="Inclou documents repartits entre diversos projectes"> *</sup></td>
              <td class="has-text-right is-nowrap">{{ p.purchases ? money(p.purchases) : "—" }}<sup v-if="p.shared && p.purchases" title="Inclou documents repartits entre diversos projectes"> *</sup></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="has-text-muted py-3">Aquest contacte no té cap projecte ni cap document de projecte.</p>
      </div>
      <p v-if="projectRows.some(p => p.shared && (p.sales || p.purchases))" class="summary-note">
        * Inclou documents repartits entre diversos projectes, comptats sencers a cadascun.
      </p>

      <h3 class="summary-title">Documents</h3>
      <div class="filter-bar">
        <div class="segmented" role="group" aria-label="Tipus de document">
          <button
            v-for="f in docFilters"
            :key="f.id"
            type="button"
            :class="{ 'is-on': docFilter === f.id }"
            :aria-pressed="docFilter === f.id ? 'true' : 'false'"
            @click="docFilter = f.id"
          >{{ f.label }}</button>
        </div>
        <span class="has-text-muted">{{ docFilter === "pending" ? "De tots els anys" : periodLabel }}</span>
      </div>
      <b-table
        :data="shownDocuments"
        :paginated="shownDocuments.length > perPage"
        :per-page="perPage"
        default-sort="emitted"
        default-sort-direction="desc"
        class="summary-docs"
        aria-next-label="Pàgina següent"
        aria-previous-label="Pàgina anterior"
        aria-page-label="Pàgina"
        aria-current-label="Pàgina actual"
      >
        <b-table-column label="Data" field="emitted" sortable cell-class="is-nowrap" v-slot="props">
          {{ date(props.row.emitted) }}
        </b-table-column>
        <b-table-column label="Tipus" field="kind" sortable v-slot="props">
          <span class="tag">{{ kindLabel(props.row.kind) }}</span>
        </b-table-column>
        <b-table-column label="Codi" field="code" sortable v-slot="props">
          <router-link :to="{ name: 'document.edit', params: { id: props.row.id, type: props.row.kind } }">{{ props.row.code || "(sense codi)" }}</router-link>
          <span v-if="props.row.concept" class="doc-subline doc-clamp">{{ props.row.concept }}</span>
        </b-table-column>
        <b-table-column label="Projecte" v-slot="props" cell-class="summary-projects">
          <template v-if="props.row.projects && props.row.projects.length">
            <router-link
              v-for="p in props.row.projects"
              :key="p.id"
              :to="{ name: 'project.edit', params: { id: p.id } }"
              class="doc-clamp"
            >{{ p.name }}</router-link>
          </template>
          <span v-else class="has-text-muted">—</span>
        </b-table-column>
        <b-table-column label="Total" field="total" sortable numeric cell-class="is-nowrap" v-slot="props">
          {{ money(props.row.total) }}
        </b-table-column>
        <b-table-column label="Estat" field="paid_date" cell-class="is-nowrap" v-slot="props">
          <span class="tag" :class="toneClass(status(props.row).tone)">{{ status(props.row).label }}</span>
          <span v-if="props.row.paybefore && isPending(props.row)" class="doc-subline">venç {{ date(props.row.paybefore) }}</span>
        </b-table-column>
        <template #empty>
          <p class="has-text-muted has-text-centered py-5">Cap document {{ docFilter === "pending" ? "pendent" : "en aquest període" }}.</p>
        </template>
      </b-table>
    </template>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import { formatMoney } from "@/helpers/format-number";
import { loadFiscalSettings } from "@/service/fiscalYear";
import { fiscalYearOf, fiscalYearLabel } from "@/domain/years";
import {
  ALL_YEARS,
  KIND_LABELS,
  ROLE_LABELS,
  DOC_FILTERS,
  docStatus,
  isPending,
  periodYears,
  summaryFigures,
  projectFigures,
  filterDocuments
} from "@/domain/contactSummary";

const ROLE_SMALL = {
  client: "com a clienta",
  intercooperation: "d'intercooperació",
  documents: "només amb documents"
};

const TONES = {
  success: "is-success is-light",
  danger: "is-danger is-light",
  warning: "is-warning",
  info: "is-info is-light",
  neutral: ""
};

export default {
  name: "ContactSummary",
  props: {
    contactId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      isLoading: false,
      loaded: false,
      error: "",
      projects: [],
      documents: [],
      startMonth: 1,
      period: null,
      docFilter: "all",
      perPage: 25
    };
  },
  computed: {
    allYears: () => ALL_YEARS,
    docFilters: () => DOC_FILTERS,
    isAll() {
      return this.period === ALL_YEARS;
    },
    years() {
      return periodYears(this.documents, this.startMonth);
    },
    periodLabel() {
      return this.isAll ? "Històric" : this.yearLabel(this.period);
    },
    // «Facturat 2026», «Facturat (històric)»
    periodName() {
      return this.isAll ? "(històric)" : this.yearLabel(this.period);
    },
    figures() {
      return summaryFigures(this.documents, this.period, this.startMonth);
    },
    projectRows() {
      return projectFigures(this.projects, this.documents, this.period, this.startMonth);
    },
    projectsSmall() {
      const counts = {};
      for (const p of this.projects) for (const r of p.roles) counts[r] = (counts[r] || 0) + 1;
      const parts = Object.keys(ROLE_LABELS)
        .filter(r => counts[r])
        .map(r => `${counts[r]} ${ROLE_SMALL[r]}`);
      return parts.join(", ") || "Cap projecte";
    },
    collectSmall() {
      const f = this.figures;
      if (!f.toCollectCount) return "Res pendent";
      const docs = `${f.toCollectCount} ${f.toCollectCount === 1 ? "document" : "documents"}`;
      return f.overdueCount ? `${docs}, ${f.overdueCount} ${f.overdueCount === 1 ? "vençut" : "vençuts"}` : `${docs}, de tots els anys`;
    },
    shownDocuments() {
      return filterDocuments(this.documents, this.docFilter, this.period, this.startMonth);
    }
  },
  watch: {
    contactId() {
      this.load();
    }
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      this.isLoading = true;
      this.error = "";
      try {
        const [settings, summary] = await Promise.all([
          loadFiscalSettings(),
          service({ requiresAuth: true }).get(`contacts/${this.contactId}/summary`)
        ]);
        this.startMonth = settings.startMonth;
        this.projects = summary.data.projects || [];
        this.documents = summary.data.documents || [];
        this.period = fiscalYearOf(moment(), this.startMonth);
        this.loaded = true;
      } catch (e) {
        this.error = "No s'ha pogut carregar el resum del contacte.";
      } finally {
        this.isLoading = false;
      }
    },
    yearLabel(y) {
      return fiscalYearLabel(y, this.startMonth);
    },
    money(v) {
      return formatMoney(Number(v) || 0);
    },
    date(d) {
      return d ? moment(d, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
    },
    dateRange(p) {
      if (!p.date_start && !p.date_end) return "—";
      return `${p.date_start ? this.date(p.date_start) : "…"} – ${p.date_end ? this.date(p.date_end) : "…"}`;
    },
    kindLabel(kind) {
      return KIND_LABELS[kind] || kind;
    },
    roleLabel(role) {
      return ROLE_LABELS[role] || role;
    },
    status(d) {
      return docStatus(d);
    },
    isPending(d) {
      return isPending(d);
    },
    toneClass(tone) {
      return TONES[tone] || "";
    }
  }
};
</script>

<style lang="scss" scoped>
.contact-summary {
  position: relative;
  min-height: 8rem;
}
.summary-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--a-fg);
  margin: 1.5rem 0 .5rem;
}
.table-wrap {
  overflow-x: auto;
}
.summary-note {
  font-size: .8125rem;
  color: var(--a-muted);
  margin-top: -.5rem;
}
:deep(.summary-projects) a {
  display: block;
  max-width: 16rem;
}
.summary-table td,
.summary-table th {
  vertical-align: middle;
}
</style>
