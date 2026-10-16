<template>
  <div>
    <modal-box-invoicing
      :is-active="isModalActive"
      :invoicing-object="trashObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
    />

    <!-- Redesign A: year, project states and accounts as labelled toggles -->
    <div class="treasury-filters">
    <div class="treasury-row">
      <div class="segmented" role="group" aria-label="Any">
        <button
          v-for="year in years"
          :key="year.year"
          type="button"
          :class="{ 'is-on': selectedYear == year.year }"
          :aria-pressed="selectedYear == year.year ? 'true' : 'false'"
          @click="goToYear(year.year)"
        >
          {{ year.year }}
        </button>
      </div>
      <b-button class="ml-auto" icon-left="refresh" @click="getData">Refrescar</b-button>

      <download-excel
        class="export view-button"
        :data="treasuryDataDesc"
        v-if="treasuryDataDesc && treasuryDataDesc.length"
        name="tresoreria"
        :fields="{
          data: 'datex',
          import: {
            field: 'total_amount',
            callback: (value, row) => {
              // For balance annotations, show the account balance instead of total_amount
              if (
                row &&
                row.is_balance_annotation &&
                row.account_balance !== undefined
              ) {
                return `Saldo: ${this.excelFormat(row.account_balance)}`;
              }
              return this.excelFormat(value);
            }
          },
          saldo: {
            field: 'subtotal',
            callback: value => {
              return excelFormat(value);
            }
          },
          moviment: 'type',
          concepte: 'concept',
          projecte: 'project_name',
          nomina: 'contact',
          pagat: 'paid'
        }"
      >
        <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
      </download-excel>
      <b-button type="is-primary" icon-left="plus" title="Moviment manual o saldo real del compte" @click="goToOperations">Nova operació</b-button>
    </div>

    <div class="treasury-row">
      <div class="toggle-group" role="group" aria-label="Estats de projecte">
        <span class="toggle-label">Projectes</span>
        <button
          v-for="state in projectStates"
          :key="state.id"
          type="button"
          class="chip-toggle"
          :class="{ 'is-on': selectedProjectStates.includes(state.id) }"
          :aria-pressed="selectedProjectStates.includes(state.id) ? 'true' : 'false'"
          @click="toggleState(state)"
        >
          {{ state.name }}
        </button>
      </div>
      <div v-if="bankAccounts && bankAccounts.length > 1" class="toggle-group" role="group" aria-label="Comptes">
        <span class="toggle-label">Comptes</span>
        <button
          v-for="account in bankAccounts"
          :key="account.id"
          type="button"
          class="chip-toggle"
          :class="{ 'is-on': selectedBankAccountIds.includes(account.id) }"
          :aria-pressed="selectedBankAccountIds.includes(account.id) ? 'true' : 'false'"
          @click="toggleBankAccount(account)"
        >
          {{ account.name }}
        </button>
      </div>
    </div>

    <div class="treasury-row">
      <b-autocomplete
        v-model="projectSearch"
        class="treasury-project"
        placeholder="Filtra per projecte"
        aria-label="Projecte"
        icon="folder-outline"
        :keep-first="false"
        :open-on-focus="true"
        :data="filteredProjects"
        field="name"
        :clearable="true"
        @select="projectSelected"
      >
        <template #empty>Cap projecte trobat</template>
      </b-autocomplete>
      <div class="treasury-dates">
        <b-datepicker
          v-model="filterDateStart"
          aria-label="Des de"
          :show-week-number="false"
          :locale="'ca-ES'"
          :first-day-of-week="1"
          icon="calendar-today"
          placeholder="Des de…"
          trap-focus
          editable
          :clearable="true"
          @update:model-value="applyDateFilters"
        />
        <span aria-hidden="true">–</span>
        <b-datepicker
          v-model="filterDateEnd"
          aria-label="Fins a"
          :show-week-number="false"
          :locale="'ca-ES'"
          :first-day-of-week="1"
          icon="calendar-today"
          placeholder="Fins a…"
          trap-focus
          editable
          :clearable="true"
          @update:model-value="applyDateFilters"
        />
      </div>
      <b-button v-if="selectedProject || filterDateStart || filterDateEnd" type="is-text" @click="clearFilters">Netejar filtres</b-button>
    </div>
    </div>

    <!-- <pre>{{ treasuryData }}</pre> -->

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <!-- Redesign A: figures, month-end balance chart and the monthly forecast.
         Same figures as the old "PREVISIÓ DE TRESORERIA" table (pivotData). -->
    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Saldo avui</span>
        <b :class="'has-text-' + sign(todayBalance)">{{ money(todayBalance) }}</b>
        <small>{{ isSingleAccountView ? singleAccountName : "suma dels comptes" }}, amb els previstos pendents</small>
      </div>
      <div class="doc-kpi">
        <span>Punt més baix previst</span>
        <b :class="'has-text-' + sign(lowestMonth ? lowestMonth.subtotal : 0)">{{ lowestMonth ? money(lowestMonth.subtotal) : "—" }}</b>
        <small>{{ lowestMonth ? "a final de " + monthName(lowestMonth.month) : "sense mesos previstos" }}</small>
      </div>
      <div class="doc-kpi">
        <span>Saldo a 31/12/{{ selectedYear }}</span>
        <b :class="'has-text-' + sign(yearEnd ? yearEnd.subtotal : 0)">{{ yearEnd ? money(yearEnd.subtotal) : "—" }}</b>
        <small v-if="yearEnd">resultat de l'any {{ money(yearEnd.total_amount) }}</small>
      </div>
      <div class="doc-kpi is-clickable" :class="{ 'is-warn': overdueCount }" role="button" tabindex="0" title="Mostra'ls a Moviments bancaris" @click="showOverdue" @keydown.enter="showOverdue">
        <span>Previstos endarrerits</span>
        <b>{{ overdueCount }}</b>
        <small>previstos del {{ selectedYear }} amb data passada sense executar</small>
      </div>
    </div>

    <div v-if="noDate && (noDate.total_incomes || noDate.total_expenses)" class="notification is-warning tres-nodate">
      <b>Moviments previstos sense data:</b>
      {{ money(noDate.total_incomes) }} de cobraments i {{ money(noDate.total_expenses) }} de pagaments no entren a la previsió.
    </div>

    <section class="report-box">
      <header class="report-box-head">
        <h2>Saldo a final de mes · {{ selectedYear }}</h2>
        <span class="chart-legend" aria-hidden="true">
          <span><i class="c-pos"></i>positiu</span>
          <span><i class="c-neg"></i>negatiu</span>
          <span><i class="c-fut"></i>previst</span>
        </span>
      </header>
      <div class="month-bars" role="img" :aria-label="chartMonths.map(m => monthName(m.month) + ': ' + money(m.subtotal)).join(', ')">
        <div class="zero-line" :style="{ bottom: zeroPos }"></div>
        <div
          v-for="(m, k) in chartMonths"
          :key="m.ym"
          class="mb-col"
          :class="{ 'is-now': m.ym === currentYm, 'is-hover': hoverYm === m.ym }"
          tabindex="0"
          @mouseenter="hoverYm = m.ym"
          @mouseleave="hoverYm = null"
          @focus="hoverYm = m.ym"
          @blur="hoverYm = null"
        >
          <div v-if="hoverYm === m.ym" class="mb-tip" :class="{ 'is-left': k > chartMonths.length - 4 }" role="tooltip">
            <b>{{ monthName(m.month) }} {{ m.year }}<span v-if="m.ym > currentYm"> · previst</span></b>
            <dl>
              <dt>Cobraments</dt><dd>{{ money(m.total_incomes) }}</dd>
              <dt>Pagaments</dt><dd class="has-text-neg">{{ money(m.total_expenses) }}</dd>
              <dt>Resultat</dt><dd :class="'has-text-' + sign(m.total_amount)">{{ money(m.total_amount, true) }}</dd>
              <dt class="is-strong">Saldo final</dt><dd class="is-strong" :class="'has-text-' + sign(m.subtotal)">{{ money(m.subtotal) }}</dd>
            </dl>
          </div>
          <div class="mb-area">
            <i
              :class="[m.subtotal < 0 ? 'c-neg' : 'c-pos', { 'is-future': m.ym > currentYm }]"
              :style="barStyle(m.subtotal)"
            ></i>
          </div>
          <span class="mb-label">{{ monthShort(m.month) }}</span>
        </div>
      </div>
    </section>

    <section class="report-box">
      <header class="report-box-head">
        <h2>Previsió mensual {{ selectedYear }}</h2>
        <div class="segmented" role="group" aria-label="Saldo des de">
          <button type="button" :class="{ 'is-on': view !== 'today' }" @click="view !== 'today' || toogleView()">Des de l'inici d'any</button>
          <button type="button" :class="{ 'is-on': view === 'today' }" @click="view === 'today' || toogleView()">Des d'avui</button>
        </div>
      </header>
      <div class="table-wrap">
        <table class="table is-fullwidth forecast-months">
          <thead>
            <tr>
              <th>Mes</th>
              <th class="has-text-right">Cobraments</th>
              <th class="has-text-right">Pagaments</th>
              <th class="has-text-right">Resultat</th>
              <th class="has-text-right">Saldo final</th>
            </tr>
          </thead>
          <tbody>
            <tr class="is-start">
              <th>{{ view === "today" ? "Avui" : "Inici d'any" }}</th>
              <td></td><td></td><td></td>
              <td class="has-text-right"><b>{{ money(todaySubTotal) }}</b></td>
            </tr>
            <tr v-for="data in tableMonths" :key="data.ym" :class="{ 'is-year': data.month === '00', 'is-now': data.ym === currentYm }">
              <th>
                <template v-if="data.month === '00'">Total {{ data.year }}</template>
                <template v-else-if="data.month === '99'">Sense data</template>
                <template v-else>{{ monthName(data.month) }}<span v-if="data.year !== selectedYear"> {{ data.year }}</span></template>
                <span v-if="data.ym === currentYm" class="tag is-info is-light">Mes en curs</span>
              </th>
              <td class="has-text-right">{{ money(data.total_incomes) }}</td>
              <td class="has-text-right has-text-neg">{{ money(data.total_expenses) }}</td>
              <td class="has-text-right" :class="'has-text-' + sign(data.total_amount)">{{ money(data.total_amount, true) }}</td>
              <td class="has-text-right" :class="['has-text-' + sign(data.subtotal), { 'has-text-weight-bold': data.month === '00' }]">{{ money(data.subtotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="laterCount" class="tres-more">
        <button type="button" class="button is-small" @click="showLater = !showLater">
          {{ showLater ? "Amaga els anys següents" : "Mostra els anys següents (" + laterCount + " mesos)" }}
        </button>
      </div>
    </section>

    <card-component title="Per projecte" class="ztile is-child mt-2">
      <!-- Pivot Views Component -->
      <pivot-views
        :pivot-views="pivotViews"
        :selected-view-id="selectedViewId"
        :show-save-modal="showSaveViewModal"
        :view-name="newViewName"
        @apply-view="applyPivotView"
        @apply-default="applyDefaultView"
        @save-view="showSaveView"
        @delete-view="deletePivotView"
        @close-save-modal="showSaveViewModal = false"
        @confirm-save="saveCurrentView"
        @update:viewName="newViewName = $event"
      />

      <div id="project-stats"></div>
    </card-component>

    <!-- Treasury operations (manual movement, real balance) in a modal: "Nova operació" -->
    <b-modal v-model="opsOpen" has-modal-card :can-cancel="['escape', 'outside', 'x']">
      <div class="modal-card ops-modal">
        <header class="modal-card-head">
          <p class="modal-card-title">Operacions de tresoreria</p>
          <button type="button" class="delete" aria-label="Tanca" @click="opsOpen = false"></button>
        </header>
        <section class="modal-card-body">
          <treasury-annotation-input
            :projects="projects"
            @annotation="onAnnotation"
          ></treasury-annotation-input>
        </section>
      </div>
    </b-modal>

    <card-component title="Moviments bancaris" class="ztile is-child mt-2">
      <section class="section">
        <!-- Redesign A: what to list and a search over concept, project and contact -->
        <div class="filter-bar movements-bar">
          <div class="segmented" role="group" aria-label="Moviments">
            <button v-for="t in movementTabs" :key="t.id" type="button" :class="{ 'is-on': movementsTab === t.id }" @click="movementsTab = t.id">
              {{ t.label }}<template v-if="t.count !== null"> · {{ t.count }}</template>
            </button>
          </div>
          <b-input v-model="movementsSearch" class="filter-search" icon="magnify" placeholder="Cerca concepte, projecte o contacte" aria-label="Cerca moviments" />
        </div>
        <!-- paginated (the whole year was one ~60.000 px table); opens on the page with "Avui" -->
        <b-table
          v-model:current-page="movementsPage"
          :loading="isLoading"
          :paginated="true"
          :per-page="movementsPerPage"
          pagination-position="both"
          aria-next-label="Pàgina següent"
          aria-previous-label="Pàgina anterior"
          aria-page-label="Pàgina"
          aria-current-label="Pàgina actual"
          :striped="false"
          :data="movementsShown"
          :row-class="
            (row, index) =>
              (row.subtotal < 0 && 'has-text-danger has-text-bold') ||
              (row.type == 'Avui' && 'has-background-warning-light') ||
              (row.type == 'Inici Any' && 'has-background-warning-light') ||
              (row.is_balance_annotation && 'has-background-warning-light') ||
              (row.is_real_balance_adjustment && 'has-background-warning-light')
          "
        >
          <b-table-column
            label="Data"
            field="datef"
            sortable
            searchable
            cell-class="is-nowrap"
            v-slot="props"
          >
            {{ props.row.datex }}
            <b-icon
              v-if="props.row.date_error"
              class="has-text-danger"
              icon="alert-circle"
              title="No hi ha data"
              size="is-small"
            >
            </b-icon>
          </b-table-column>
          <b-table-column
            label="Import"
            field="total_amount"
            sortable
            searchable
            v-slot="props"
          >
            <span v-if="props.row.is_balance_annotation">
              <span class="zhas-text-weight-bold zhas-text-info">
                {{ formatPrice(props.row.account_balance) }} €
              </span>
            </span>
            <span v-else-if="props.row.is_real_balance_adjustment">
              <span class="zhas-text-weight-bold zhas-text-info">
                {{ formatPrice(props.row.total_amount) }} €
              </span>
            </span>
            <span v-else> {{ formatPrice(props.row.total_amount) }} € </span>
          </b-table-column>
          <b-table-column
            field="subtotal"
            sortable
            searchable
          >
            <template #header>
              <span>
                Saldo
                <span v-if="isSingleAccountView" class="is-size-7 has-text-grey-light">
                  ({{ singleAccountName }})
                </span>
              </span>
            </template>
            <template v-slot="props">
              {{ formatPrice(displayBalance(props.row)) }} €
            </template>
          </b-table-column>
          <b-table-column
            label="Moviment"
            field="type"
            sortable
            searchable
            v-slot="props"
          >
            <span
              :class="
                props.row.paid && props.row.real
                  ? 'has-text-success'
                  : 'zhas-text-success'
              "
            >
              <b-icon
                v-if="props.row.is_balance_annotation"
                icon="bank"
                size="is-small"
                class="mr-1"
              />
              <b-icon
                v-if="props.row.is_real_balance_adjustment"
                icon="calculator"
                size="is-small"
                class="mr-1"
              />
              <b-icon
                v-if="props.row.type === 'Avui'"
                icon="calendar-today"
                size="is-small"
                class="mr-1"
              />
              {{ props.row.type }}
            </span>
          </b-table-column>
          <b-table-column
            label="Concepte"
            field="concept"
            sortable
            searchable
            v-slot="props"
          >
            <template v-if="props.row.to" :to="props.row.to">
              <router-link v-if="props.row.to" :to="props.row.to">
                <span class="project-name has-text-info">
                  {{ props.row.concept }}
                </span>
              </router-link>
              <div v-if="props.row.conceptProject">
                {{ props.row.conceptProject }}
              </div>
            </template>
            <span v-else>{{ props.row.concept }}</span>
          </b-table-column>
          <b-table-column
            label="Projecte"
            field="project_name"
            sortable
            searchable
            v-slot="props"
          >
            <!-- No project: Vue Router 4 throws on a missing id (issues/014) -->
            <router-link
              v-if="props.row.project_id"
              :to="{
                name: 'project.edit',
                params: { id: props.row.project_id }
              }"
            >
              <span class="project-name has-text-info">
                {{ props.row.project_name }}
              </span>
            </router-link>
            <span v-else>{{ props.row.project_name }}</span>
          </b-table-column>
          <b-table-column
            label="Contacte"
            field="contact"
            sortable
            searchable
            v-slot="props"
          >
            {{ props.row.contact }}
          </b-table-column>
          <b-table-column
            label="Compte bancari"
            field="bank_account"
            sortable
            searchable
            v-slot="props"
            v-if="bankAccounts && bankAccounts.length > 0"
          >
            {{ props.row.bank_account }}
          </b-table-column>
          <b-table-column label="Accions" v-slot="props">
            <!-- Warning icon for non-executed movements before today -->
            <b-icon
              v-if="!(props.row.paid || props.row.real) && isBeforeToday(props.row.datef)"
              icon="alert"
              class="has-text-warning mr-2"
              size="is-small"
              title="Moviment previst pendent"
            />
            <!-- Validation checkbox for real movements -->
            <b-checkbox
              v-if="(props.row.paid || props.row.real) && props.row.validation_key"
              :model-value="props.row.is_validated"
              @update:model-value="toggleValidation(props.row)"
              class="mr-2"
              :title="props.row.is_validated ? 'Moviment validat' : 'Marcar com validat'"
            />
            <!-- <button
              v-if="props.row.expenseId"
              class="button is-small is-danger"
              type="button"
              @click.prevent="trashModal(props.row)"
              title="Marcar com a pagat"
            >
              <b-icon icon="cash-multiple" size="is-small" />
            </button>
            <button
              v-if="props.row.incomeId"
              class="button is-small is-danger"
              type="button"
              @click.prevent="trashModal(props.row)"
              title="Marcar com a pagat"
            >
              <b-icon icon="cash-multiple" size="is-small" />
            </button> -->
            <button
              v-if="props.row.type === 'Operació de tresoreria' || props.row.type === 'Saldo real ajustat'"
              class="button is-small is-danger"
              type="button"
              @click.prevent="trashManual(props.row.treasury_id)"
              title="Eliminar"
            >
              <b-icon icon="delete" size="is-small" />
            </button>
          </b-table-column>
        </b-table>
      </section>
    </card-component>
  </div>
</template>

<script>
// import ModalBox from '@/components/ModalBox.vue'
import service from "@/service/index";
import moment from "moment";
import sortBy from "lodash/sortBy";
import _ from "lodash";
import configPivot from "@/service/configStatsTreasury";
import ModalBoxInvoicing from "./ModalBoxInvoicing.vue";
import CardComponent from "./CardComponent.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import MoneyFormat from "@/components/MoneyFormat.vue";
import TreasuryAnnotationInput from "@/components/TreasuryAnnotationInput.vue";
import { addScript, addStyle } from "@/helpers/addScript";
import getTreasuryData from "@/service/treasury";
import { formatMoney, sign } from "@/helpers/format-number";
import { format } from "@/helpers/excelFormatter";
import PivotViews from "@/components/PivotViews.vue";
import pivotViewsMixin from "@/mixins/pivotViewsMixin.js";

export default {
  name: "Tresoreria",
  components: {
    ModalBoxInvoicing,
    CardComponent,
    MoneyFormat,
    TreasuryAnnotationInput,
    PivotViews
  },
  mixins: [pivotViewsMixin],
  props: {
    titleStack: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      movementsPage: 1,
      movementsPerPage: 50,
      isLoading: false,
      years: [],
      projects: [],
      treasury: [],
      treasuryData: [],
      emitted: [],
      received: [],
      tickets: [],
      diets: [],
      contacts: [],
      emittedGrants: [],
      receivedGrants: [],
      projectIncomes: [],
      projectExpenses: [],
      receivedIncomes: [],
      receivedExpenses: [],
      payrolls: [],
      bankAccounts: [],
      isModalActive: false,
      trashObject: null,
      vat: { paid: 0, received: 0 },
      vat_expected: { paid: 0, received: 0 },
      me: null,
      payingVat: false,
      view: "startOfYear",
      projectStates: [],
      selectedProjectStates: [],
      selectedYear: null,
      showLater: false,
      hoverYm: null,
      movementsTab: "all",
      opsOpen: false,
      movementsSearch: "",
      selectedBankAccountIds: [],
      pivotIdentifier: "tresoreria-pivot",
      projectSearch: "",
      selectedProject: null,
      filterDateStart: null,
      filterDateEnd: null
    };
  },
  async mounted() {
    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval);
        await addScript(
          (import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : "") +
            "/vendor/kendo/kendo.all.min.js",
          "kendo-all-min-js"
        );
        await addStyle(
          (import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : "") +
            "/vendor/kendo/kendo.common.min.css",
          "kendo-common-min-css"
        );
        await addStyle(
          (import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : "") +
            "/vendor/kendo/kendo.custom.css",
          "kendo-custom-css"
        );
        await addStyle(
          (import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : "") +
            "/vendor/kendo/custom.css",
          "custom-css"
        );
        this.isLoading = false;
        this.getInitialData();
      }
    }, 100);
  },
  watch: {
    // the movements list opens on the page that holds today's row ("Avui")
    movementsShown(rows) {
      const today = (rows || []).findIndex(r => r.type === "Avui");
      this.movementsPage = today >= 0 ? Math.floor(today / this.movementsPerPage) + 1 : 1;
    },
    pivotData2: {
      handler(newVal) {
        // Update the pivot table when filter data changes
        if (this.pivotGridInstance) {
          try {
            const dataSource = this.pivotGridInstance.dataSource;
            dataSource.data(newVal);
            dataSource.read();
          } catch (error) {
            console.error("Error updating pivot data:", error);
          }
        }
      },
      deep: true
    }
  },
  computed: {
    ...mapState(useMainStore, ["userName", "user"]),
    monthlySummary() {
      const year = this.$route.query.year
        ? this.$route.query.year
        : moment().format("YYYY");

      this.selectedYear = year;

      // const fn = (t) => { return this.view === 'today' ? t.datef >= t.datef >= moment().format("YYYYMMDD") : t.datef >= moment().startOf('year').format("YYYYMMDD") }
      let treasuryData = this.treasuryData
        // .filter((t) => t.datef >= moment().startOf('year').format("YYYYMMDD"))
        .filter(t =>
          this.view === "today"
            ? t.datef >= moment().format("YYYYMMDD")
            : t.datef >= `${year}0101`
        );

      // Apply project filter (exclude balance annotations from filtering)
      if (this.selectedProject) {
        treasuryData = treasuryData.filter(t => {
          // Always include "Inici Any" and "Avui" entries regardless of project filter
          if (
            t.type === "Inici Any" ||
            t.type === "Avui" ||
            t.is_balance_annotation ||
            t.is_real_balance_adjustment
          ) {
            return true;
          }
          return t.project_id === this.selectedProject.id;
        });
      }

      // Apply date filters (exclude balance annotations from filtering)
      if (this.filterDateStart) {
        const startDateFormatted = moment(this.filterDateStart).format(
          "YYYYMMDD"
        );
        treasuryData = treasuryData.filter(t => {
          // Always include "Inici Any" entries regardless of date filter
          if (t.type === "Inici Any" || t.is_balance_annotation || t.is_real_balance_adjustment) {
            return true;
          }
          return t.datef >= startDateFormatted;
        });
      }

      if (this.filterDateEnd) {
        const endDateFormatted = moment(this.filterDateEnd).format("YYYYMMDD");
        treasuryData = treasuryData.filter(t => {
          // Always include "Inici Any" entries regardless of date filter
          if (t.type === "Inici Any" || t.is_balance_annotation || t.is_real_balance_adjustment) {
            return true;
          }
          return t.datef <= endDateFormatted;
        });
      }

      treasuryData = treasuryData.map(t => {
        return {
          ...t,
          year: moment(t.datef, "YYYYMMDD").format("YYYY"),
          month: moment(t.datef, "YYYYMMDD").format("MM"),
          ym: moment(t.datef, "YYYYMMDD").format("YYYYMM")
        };
      });

      return treasuryData;
    },
    monthlySummaryForPivot() {
      return this.monthlySummary.map(s => {
        // For balance annotations and real-balance adjustments, we don't want to
        // count them as income or expenses (they only adjust the running saldo).
        const isBalanceAnnotation = s.is_balance_annotation;
        const isRealBalanceAdjustment = s.is_real_balance_adjustment;

        return {
          ...s,
          project_name:
            s.project_name !== "-" && s.project_name !== ""
              ? s.project_name
              : s.type,
          bank_account: s.bank_account || "Sense compte assignat",
          total_incomes:
            !isBalanceAnnotation &&
            !isRealBalanceAdjustment &&
            s.total_amount > 0
              ? s.total_amount
              : 0,
          total_expenses:
            !isBalanceAnnotation &&
            !isRealBalanceAdjustment &&
            s.total_amount < 0
              ? s.total_amount
              : 0
        };
      });
    },
    pivotData() {
      return this.monthlySummaryTotal;
    },
    // the shown year (and the months without date); later years on request
    tableMonths() {
      return this.showLater ? this.pivotData : this.pivotData.filter(d => d.year <= String(this.selectedYear) || d.month === "99");
    },
    laterCount() {
      return this.pivotData.filter(d => d.year > String(this.selectedYear) && d.month !== "00" && d.month !== "99").length;
    },
    movementTabs() {
      const rows = this.treasuryDataDesc.filter(r => this.isMovement(r));
      return [
        { id: "all", label: "Tots", count: null },
        { id: "next", label: "Pròxims", count: rows.filter(r => this.movementState(r) === "next").length },
        { id: "overdue", label: "Endarrerits", count: rows.filter(r => this.movementState(r) === "overdue").length },
        { id: "done", label: "Executats", count: rows.filter(r => this.movementState(r) === "done").length }
      ];
    },
    // the movements list after the tab and the search (balance rows only in "Tots")
    movementsShown() {
      const q = this.movementsSearch.trim().toLowerCase();
      return this.treasuryDataDesc.filter(r => {
        if (this.movementsTab !== "all") {
          if (!this.isMovement(r) || this.movementState(r) !== this.movementsTab) return false;
        }
        if (!q) return true;
        return [r.concept, r.project_name, r.contact, r.type].some(v => v && String(v).toLowerCase().includes(q));
      });
    },
    currentYm() {
      return moment().format("YYYYMM");
    },
    // months of the shown year, in order
    chartMonths() {
      return this.pivotData.filter(d => d.year === String(this.selectedYear) && d.month !== "00" && d.month !== "99");
    },
    chartRange() {
      const values = this.chartMonths.map(m => m.subtotal);
      return { max: Math.max(0, ...values), min: Math.min(0, ...values) };
    },
    zeroPos() {
      const { max, min } = this.chartRange;
      const span = max - min || 1;
      return ((-min) / span * 100) + "%";
    },
    todayBalance() {
      const today = this.treasuryData.find(t => t.type === "Avui");
      if (!today) return 0;
      return this.isSingleAccountView && today.account_subtotal !== undefined ? today.account_subtotal : today.subtotal;
    },
    lowestMonth() {
      const future = this.pivotData.filter(d => d.month !== "00" && d.month !== "99" && d.ym >= this.currentYm);
      return future.reduce((low, d) => (!low || d.subtotal < low.subtotal ? d : low), null);
    },
    yearEnd() {
      return this.pivotData.find(d => d.month === "00" && d.year === String(this.selectedYear)) || null;
    },
    noDate() {
      return this.pivotData.find(d => d.month === "99") || null;
    },
    // the same rows as the "Endarrerits" tab of the movements (shown year and filters)
    overdueCount() {
      return this.treasuryDataDesc.filter(r => this.isMovement(r) && this.movementState(r) === "overdue").length;
    },
    pivotData2() {
      return this.monthlySummaryForPivot;
    },
    monthlySummaryTotal() {
      const ans = _(this.monthlySummary)
        .groupBy("ym")
        .map((ym, id) => ({
          ym: id,
          year: !isNaN(id) ? id.substring(0, 4) : "2099",
          month: !isNaN(id) ? id.substring(4, 6) : "99",
          valid: !isNaN(id),
          maxYm: _.maxBy(this.monthlySummary, e => (!isNaN(e.ym) ? e.ym : ""))
            .ym,
          total_amount: _.sumBy(ym, e =>
            e.is_balance_annotation || e.is_real_balance_adjustment
              ? 0
              : e.total_amount
          ),
          total_incomes: _.sumBy(ym, e =>
            !e.is_balance_annotation &&
            !e.is_real_balance_adjustment &&
            e.total_amount > 0
              ? e.total_amount
              : 0
          ),
          total_expenses: _.sumBy(ym, e =>
            !e.is_balance_annotation &&
            !e.is_real_balance_adjustment &&
            e.total_amount < 0
              ? e.total_amount
              : 0
          ),
          subtotal: this.todaySubTotal
        }))
        .value();

      const ansWithSubtotal = [];
      var subtotal = this.todaySubTotal;
      for (var i = 0; i < ans.length; i++) {
        // The running Saldo accumulates real cash flows only. Real-balance
        // adjustments are NOT a cash flow: they correct the starting balance,
        // which is already reflected in the todaySubTotal seed (the "Inici Any"
        // / "Avui" row subtotal, computed by the backend after the adjustment).
        // Adding them here would double-count the adjustment.
        subtotal = subtotal + ans[i].total_amount;
        ans[i]["subtotal"] = subtotal;
        ansWithSubtotal.push(ans[i]);
        if (ans[i].month === "12") {
          const y = ans[i].year;
          const yearValues = ansWithSubtotal.filter(a => a.year === y);
          const yearSummary = {
            ym: `${y}00`,
            year: y,
            month: "00",
            valid: true,
            maxYm: ans[i].maxYm,
            total_amount: _.sumBy(yearValues, "total_amount"),
            total_incomes: _.sumBy(yearValues, "total_incomes"),
            total_expenses: _.sumBy(yearValues, "total_expenses"),
            subtotal: ans[i].subtotal
          };
          ansWithSubtotal.push(yearSummary);
        }
      }

      return ansWithSubtotal;
    },
    todaySubTotal() {
      // With multiple bank accounts, we have multiple "Today"/"Start of Year" entries
      // We'll use the subtotal from the first one found, as they should all have the same subtotal
      // (the running balance is calculated across all accounts)
      const today =
        this.view === "today"
          ? this.treasuryData.find(t => t.type === "Avui")
          : this.treasuryData.find(t => t.type === "Inici Any");
      
      if (!today) return 0;
      
      // If viewing a single account, show that account's balance
      if (this.isSingleAccountView && today.account_subtotal !== undefined) {
        return today.account_subtotal;
      }
      
      return today.subtotal;
    },
    treasuryDataDesc() {
      //return _.reverse(this.treasuryData)
      let treasuryDataOfYear = this.treasuryData.filter(
        d => moment(d.datex, "dd-MM-YYYY").year() == this.selectedYear
      );

      // Apply project filter (exclude balance annotations from filtering)
      if (this.selectedProject) {
        treasuryDataOfYear = treasuryDataOfYear.filter(d => {
          // Always include "Inici Any" and "Avui" entries regardless of project filter
          if (
            d.type === "Inici Any" ||
            d.type === "Avui" ||
            d.is_balance_annotation ||
            d.is_real_balance_adjustment
          ) {
            return true;
          }
          return d.project_id === this.selectedProject.id;
        });
      }

      // Apply date filters (exclude balance annotations from filtering)
      if (this.filterDateStart) {
        const startDate = moment(this.filterDateStart).format("DD-MM-YYYY");
        treasuryDataOfYear = treasuryDataOfYear.filter(d => {
          // Always include "Inici Any" entries regardless of date filter
          if (d.type === "Inici Any" || d.is_balance_annotation || d.is_real_balance_adjustment) {
            return true;
          }
          return moment(d.datex, "DD-MM-YYYY").isSameOrAfter(
            moment(startDate, "DD-MM-YYYY")
          );
        });
      }

      if (this.filterDateEnd) {
        const endDate = moment(this.filterDateEnd).format("DD-MM-YYYY");
        treasuryDataOfYear = treasuryDataOfYear.filter(d => {
          // Always include "Inici Any" entries regardless of date filter
          if (d.type === "Inici Any" || d.is_balance_annotation || d.is_real_balance_adjustment) {
            return true;
          }
          return moment(d.datex, "DD-MM-YYYY").isSameOrBefore(
            moment(endDate, "DD-MM-YYYY")
          );
        });
      }

      return _.reverse(treasuryDataOfYear);
    },
    filteredProjects() {
      if (!this.projectSearch) {
        return this.projects;
      }
      return this.projects.filter(option => {
        return (
          option.name &&
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
      });
    },
    isSingleAccountView() {
      return this.selectedBankAccountIds.length === 1;
    },
    singleAccountName() {
      if (this.isSingleAccountView && this.bankAccounts.length > 0) {
        const account = this.bankAccounts.find(
          acc => acc.id === this.selectedBankAccountIds[0]
        );
        return account ? account.name : '';
      }
      return '';
    }
  },
  methods: {
    async getData() {
      this.isLoading = true;
      const year = this.$route.query.year
        ? this.$route.query.year
        : moment().format("YYYY");
      this.selectedYear = year;
      const treasuryData = await getTreasuryData(
        this.selectedProjectStates,
        this.selectedYear,
        this.selectedBankAccountIds.join(",") // Convert array to comma-separated string
      );
      this.vat = treasuryData.vat;
      this.vat_expected = treasuryData.vat_expected;
      this.treasuryData = treasuryData.treasury.map(d => {
        return { ...d, executat: d.paid ? "SÍ" : "NO" };
      });
      this.projects = treasuryData.projects;

      configPivot.dataSource.data = this.pivotData2;
      this.initializePivotWithViews("#project-stats", configPivot);
      this.isLoading = false;
    },
    async getInitialData() {
      this.isLoading = true;

      this.contacts = (
        await service({ requiresAuth: true }).get(
          "contacts/basic?_limit=-1&_sort=name:ASC"
        )
      ).data;

      this.me = (await service({ requiresAuth: true }).get("me")).data;

      let filter = "";
      if (this.$route.query.filter) {
        filter = this.$route.query.filter;
      }

      this.years = await service({ requiresAuth: true, cached: true })
        .get("years?_sort=year:DESC")
        .then(r => r.data);

      this.projectStates = await service({ requiresAuth: true, cached: true })
        .get("project-states")
        .then(r => r.data);

      this.bankAccounts = await service({ requiresAuth: true, cached: true })
        .get("bank-accounts?_sort=name:ASC")
        .then(r => r.data);

      if (localStorage.getItem("TresoreriaTable.selectedProjectStates")) {
        this.selectedProjectStates = JSON.parse(
          localStorage.getItem("TresoreriaTable.selectedProjectStates")
        );
      } else {
        this.selectedProjectStates = this.projectStates.map(s => s.id);
      }

      // Initialize all bank accounts as selected by default
      this.selectedBankAccountIds = this.bankAccounts.map(ba => ba.id);

      this.getData();
    },
    isMovement(r) {
      return r.type !== "Avui" && r.type !== "Inici Any" && !r.is_balance_annotation && !r.is_real_balance_adjustment;
    },
    // executed (paid or real), overdue (forecast with a past date) or next
    movementState(r) {
      if (r.paid || r.real) return "done";
      return r.datef && this.isBeforeToday(r.datef) ? "overdue" : "next";
    },
    // header actions: the operations card (manual movements and real balance)
    showOverdue() {
      this.movementsTab = "overdue";
      this.$nextTick(() => {
        const el = this.$el.querySelector(".movements-bar");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    goToOperations() {
      this.opsOpen = true;
    },
    // a movement or a real balance was saved: reload and close
    onAnnotation() {
      this.opsOpen = false;
      this.getData();
    },
    money(value, signed = false) {
      const n = Number(value) || 0;
      return (signed && n > 0.004 ? "+" : "") + formatMoney(n);
    },
    sign,
    monthName(month) {
      const name = moment(month, "MM").format("MMMM");
      return name.charAt(0).toUpperCase() + name.slice(1);
    },
    monthShort(month) {
      return moment(month, "MM").format("MMM").replace(".", "");
    },
    barStyle(value) {
      const { max, min } = this.chartRange;
      const span = max - min || 1;
      const zero = (-min) / span * 100;
      const h = Math.abs(value) / span * 100;
      return value >= 0
        ? { bottom: zero + "%", height: Math.max(h, .5) + "%" }
        : { bottom: (zero - h) + "%", height: Math.max(h, .5) + "%" };
    },
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    displayBalance(row) {
      // If viewing a single account, show that account's balance
      // Otherwise show the global balance across all accounts
      if (this.isSingleAccountView && row.account_subtotal !== undefined) {
        return row.account_subtotal;
      }
      return row.subtotal;
    },
    formatDate(value) {
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
    },
    async trashManual(treasuryId) {
      this.$buefy.dialog.confirm({
        message: "Estàs segura d'eliminar l'entrada?",
        onConfirm: async () => {
          await this.submitDeleteManual(treasuryId);
        },
        onCancel: () => {
          return false;
        }
      });
    },
    async submitDeleteManual(treasuryId) {
      await service({ requiresAuth: true }).delete(`treasuries/${treasuryId}`);

      this.$buefy.snackbar.open({
        message: "Eliminada",
        queue: false
      });

      this.getData();
    },
    trashModal(trashObject) {
      // console.log('trashObject', trashObject)

      const invoicingObject = {
        origin: "treasury",
        ...trashObject,
        type: trashObject.expenseId ? "expenses" : "incomes",
        emitted_invoices: this.emitted.filter(
          i => i.project && i.project.id === trashObject.project_id
        ),
        received_invoices: this.received.filter(
          i => i.project && i.project.id === trashObject.project_id
        ),
        diets: this.diets.filter(
          i => i.project && i.project.id === trashObject.project_id
        ),
        tickets: this.tickets.filter(
          i => i.project && i.project.id === trashObject.project_id
        ),
        grants: trashObject.expenseId
          ? this.receivedGrants.filter(
              i => i.project && i.project.id === trashObject.project_id
            )
          : this.emittedGrants.filter(
              i => i.project && i.project.id === trashObject.project_id
            ),
        contacts: this.contacts
      };

      // console.log("invoicingObject", invoicingObject);

      // this.invoicingObject = {
      //   type,
      //   phase,
      //   subphase,
      //   i,
      //   j,
      //   emitted_invoices: this.form.emitted_invoices,
      //   received_invoices: this.form.received_invoices,
      //   diets: this.form.diets,
      //   tickets: this.form.tickets
      // }
      this.trashObject = invoicingObject;
      this.isModalActive = true;
    },
    async modalSubmit(invoicing) {
      this.isModalActive = false;
      if (this.trashObject.expenseId) {
        await service({ requiresAuth: true }).put(
          `projects/${this.trashObject.project_id}/pay-expense/${this.trashObject.expenseId}`,
          invoicing
        );
      } else if (this.trashObject.incomeId) {
        await service({ requiresAuth: true }).put(
          `projects/${this.trashObject.project_id}/pay-income/${this.trashObject.incomeId}`,
          invoicing
        );
      }
      // await service({ requiresAuth: true }).delete(`projects/${this.trashObject.id}`)
      // this.projectsData = this.projectsData.filter(p => p.id !== this.trashObject.id)
      this.$buefy.snackbar.open({
        message: "Fet",
        queue: false
      });
      this.getData();
    },
    modalCancel() {
      this.isModalActive = false;
    },
    async payVat() {
      this.payingVat = true;
      await service({ requiresAuth: true }).post(`emitted-invoices/pay-vat`);
      this.payingVat = false;
      window.location.reload();
    },
    toogleView() {
      this.view = this.view === "today" ? "startOfYear" : "today";
      this.getData();
    },
    goToYear(year) {
      this.$router.push({ query: { year } });
    },
    toggleState(state) {
      if (this.selectedProjectStates.includes(state.id)) {
        this.selectedProjectStates = this.selectedProjectStates.filter(
          s => s !== state.id
        );
      } else {
        this.selectedProjectStates.push(state.id);
      }
      localStorage.setItem(
        "TresoreriaTable.selectedProjectStates",
        JSON.stringify(this.selectedProjectStates)
      );
    },
    toggleBankAccount(account) {
      if (this.selectedBankAccountIds.includes(account.id)) {
        // Prevent unselecting if it's the only one selected
        if (this.selectedBankAccountIds.length > 1) {
          this.selectedBankAccountIds = this.selectedBankAccountIds.filter(
            id => id !== account.id
          );
        }
      } else {
        this.selectedBankAccountIds.push(account.id);
      }
    },
    excelFormat(value) {
      return format(this.user, value);
    },
    projectSelected(option) {
      this.selectedProject = option;
    },
    applyDateFilters() {
      // Trigger reactivity by updating the computed property
      this.$forceUpdate();
    },
    clearFilters() {
      this.selectedProject = null;
      this.projectSearch = "";
      this.filterDateStart = null;
      this.filterDateEnd = null;
    },
    applyDefaultView() {
      this.selectedViewId = null
      if (this.pivotGridInstance) {
        // Reset to default configuration
        const dataSource = this.pivotGridInstance.dataSource;
        const defaultConfig = configPivot.dataSource;

        dataSource.columns(defaultConfig.columns || []);
        dataSource.rows(defaultConfig.rows || []);
        dataSource.measures(defaultConfig.measures || []);
        // Note: Kendo Pivot Grid doesn't support filters() method
        // dataSource.filters([])

        this.selectedViewId = null;
      }
    },
    isBeforeToday(datef) {
      return datef < moment().format("YYYYMMDD");
    },
    async toggleValidation(row) {
      try {
        // Parse validation key to extract entity_type, entity_id, and sub_type
        const parts = row.validation_key.split(':');
        const entity_type = parts[0];
        const entity_id = parseInt(parts[1]);
        const sub_type = parts[2] || null;

        // Call the toggle endpoint
        const response = await service({ requiresAuth: true }).post(
          'treasury-validations/toggle',
          {
            entity_type,
            entity_id,
            sub_type
          }
        );

        // Update the local data
        row.is_validated = response.data.validated;

        // this.$buefy.snackbar.open({
        //   message: response.data.validated ? 'Moviment validat' : 'Validació eliminada',
        //   type: response.data.validated ? 'is-success' : 'is-info',
        //   queue: false
        // });
      } catch (error) {
        console.error('Error toggling validation:', error);
        this.$buefy.snackbar.open({
          message: 'Error al validar el moviment',
          type: 'is-danger',
          queue: false
        });
      }
    }
  }
};
</script>
<style scoped>
/* Redesign A */
.tres-nodate {
  font-size: .875rem;
}
.report-box {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
}
.report-box-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: .5rem 1rem;
  padding: .875rem 1.25rem;
  border-bottom: 1px solid var(--a-line);
}
.report-box-head h2 {
  font-size: 1rem;
  font-weight: 800;
}
.chart-legend {
  display: inline-flex;
  gap: 1rem;
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
}
.chart-legend i {
  width: .75rem;
  height: .75rem;
  border-radius: 3px;
  display: inline-block;
}
.c-pos { background: var(--a-accent); }
.c-neg { background: #C2410C; }
.c-fut { background: #9FD3C7; }
.month-bars {
  position: relative;
  display: flex;
  gap: .75rem;
  height: 15rem;
  padding: 1.25rem 1.25rem .5rem;
}
.zero-line {
  position: absolute;
  left: 1.25rem;
  right: 1.25rem;
  height: 1px;
  background: var(--a-line);
  margin-bottom: 1.75rem;
}
.mb-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .375rem;
}
.mb-area {
  position: relative;
  flex: 1;
  width: 70%;
  max-width: 3rem;
}
.mb-area i {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: 3px;
}
.mb-area i.is-future.c-pos {
  background: #9FD3C7;
}
.mb-area i.is-future.c-neg {
  background: #F2B8A0;
}
.mb-col {
  position: relative;
  cursor: default;
  outline: none;
}
.mb-col.is-hover .mb-area i {
  filter: brightness(.9);
}
.mb-tip {
  position: absolute;
  top: 0;
  left: calc(50% + 1.75rem);
  z-index: 5;
  min-width: 13rem;
  padding: .625rem .75rem;
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(16, 32, 30, .14);
  font-size: .8125rem;
  pointer-events: none;
}
.mb-tip.is-left {
  left: auto;
  right: calc(50% + 1.75rem);
}
.mb-tip dl {
  display: grid;
  grid-template-columns: auto auto;
  gap: .125rem 1rem;
  margin-top: .375rem;
  font-variant-numeric: tabular-nums;
}
.mb-tip dd {
  text-align: right;
}
.mb-tip .is-strong {
  font-weight: 800;
  padding-top: .25rem;
  border-top: 1px solid var(--a-line-soft);
}
.mb-label {
  font-size: .75rem;
  color: var(--a-muted);
  text-transform: capitalize;
}
.mb-col.is-now .mb-label {
  font-weight: 800;
  color: var(--a-fg);
}
.table-wrap {
  overflow-x: auto;
}
.forecast-months {
  font-size: .875rem;
  font-variant-numeric: tabular-nums;
}
.forecast-months th:first-child {
  padding-left: 1.25rem;
}
.forecast-months td:last-child,
.forecast-months th:last-child {
  padding-right: 1.25rem;
}
.forecast-months td {
  white-space: nowrap;
}
.forecast-months tr.is-year > * {
  background: var(--a-thead);
  font-weight: 800;
}
.forecast-months tr.is-now > * {
  background: var(--a-accent-soft);
}
.forecast-months tr.is-start > * {
  color: var(--a-fg-2);
}
.ops-modal {
  width: min(44rem, calc(100vw - 2rem));
}
.movements-bar {
  margin-bottom: .75rem;
}
.movements-bar .filter-search {
  flex: 0 1 22rem;
}
.doc-kpi.is-clickable {
  cursor: pointer;
}
.doc-kpi.is-clickable:hover {
  border-color: var(--a-input);
}
.tres-more {
  padding: .75rem 1.25rem;
  border-top: 1px solid var(--a-line-soft);
}
.forecast-months .tag {
  margin-left: .5rem;
  font-size: .6875rem;
}
</style>
<style>
.treasury-filters {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  margin-bottom: 1.25rem;
}
.treasury-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem 1.5rem;
}
.treasury-row .export {
  display: inline-flex;
}
.treasury-project {
  flex: 1 1 14rem;
  max-width: 22rem;
}
.treasury-dates {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.treasury-dates .datepicker {
  width: 9.5rem;
}
.treasury-table.b-table .table th,
.treasury-table.b-table td {
  min-width: 150px;
}
</style>
