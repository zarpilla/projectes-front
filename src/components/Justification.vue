<template>
  <div>
    <div class="table-view">
      <!-- Redesign A: figures and what's missing, from the same totals as the tables -->
      <div v-if="kpi.rows.length" class="doc-kpis">
        <div class="doc-kpi">
          <span>Import justificat</span>
          <b>{{ money(kpi.justified) }}</b>
          <small>{{ kpi.withCost }} {{ kpi.withCost === 1 ? "projecte" : "projectes" }} · {{ view === "Factures" ? "factures" : "hores " + (type || "").toLowerCase() }}</small>
        </div>
        <div class="doc-kpi">
          <span>Import a justificar</span>
          <b>{{ kpi.withGrantable ? money(kpi.grantable) : "—" }}</b>
          <small>{{ kpi.withGrantable ? kpi.withGrantable + " projectes en tenen" + forYear() : "Cap projecte en té" + forYear() }}</small>
        </div>
        <div class="doc-kpi">
          <span>Pendent</span>
          <b>{{ kpi.withGrantable ? money(kpi.grantable - kpi.justifiedWithGrantable) : "—" }}</b>
          <small>{{ kpi.withGrantable ? percent(kpi.justifiedWithGrantable, kpi.grantable) + " justificat" : "Cal l'import a justificar" }}</small>
        </div>
        <div class="doc-kpi">
          <span>Projectes</span>
          <b>{{ kpi.withCost }} <small>de {{ kpi.rows.length }}</small></b>
          <small>amb import justificat</small>
        </div>
      </div>
      <div v-if="kpi.withoutGrantable" class="notification is-warning just-warning">
        <span><b>{{ kpi.withoutGrantable }} {{ kpi.withoutGrantable === 1 ? "projecte no té" : "projectes no tenen" }} import a justificar{{ forYear() }}</b>, així que no se'n pot calcular el pendent ni el percentatge. Es defineix a la fitxa del projecte, a «Subvencions», per a cada any.</span>
        <router-link to="/grants" class="just-link">Obre Subvencions</router-link>
      </div>

      <!-- <div class="info-help mb-4">
        <b-icon icon="information" size="is-small" />
        Desplega les seccions que vulguis consultar
      </div> -->

      <!-- nothing to justify for these filters (no grant projects…): say so
           instead of an empty page (issues/108) -->
      <p
        v-if="!isLoading && !monthlyActivitiesTotal.length && !justifications.length"
        class="pivot-empty"
      >
        No hi ha cap projecte subvencionat amb dades per a aquests filtres.
      </p>
      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="
          (monthlyActivitiesTotal.length || justifications.length) &&
            view === 'Bestretes'
        "
        title="Totals per projecte (bestretes)"
        :close-icon="true"
        :content-visible="true"
      >
        <b-table
          :data="summaryByProjectAll"
          :striped="false"
          :hoverable="false"
          :mobile-cards="false"
          default-sort="project"
        >
          <b-table-column field="project" label="Projecte" sortable v-slot="props">
            {{ props.row.project }}
          </b-table-column>

          <b-table-column field="grantable_amount" label="Import a justificar" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right">
            <template v-if="props.row.grantable_amount">{{ money(props.row.grantable_amount) }}</template>
            <span v-else class="tag is-warning is-light">Sense import</span>
          </b-table-column>

          <b-table-column field="cost" label="Import justificat" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right">
            <b>{{ money(props.row.cost) }}</b>
          </b-table-column>

          <b-table-column label="Pendent" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.grantable_amount - a.cost) - (b.grantable_amount - b.cost)">
            <template v-if="props.row.grantable_amount">{{ money(props.row.grantable_amount - props.row.cost) }}</template>
            <span v-else class="has-text-muted">—</span>
          </b-table-column>

          <b-table-column label="%" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.grantable_amount ? (a.cost / a.grantable_amount) * 100 : 0) - (b.grantable_amount ? (b.cost / b.grantable_amount) * 100 : 0)">
            <template v-if="props.row.grantable_amount">{{ percent(props.row.cost, props.row.grantable_amount) }}</template>
            <span v-else class="has-text-muted">—</span>
          </b-table-column>

          <template #footer>
            <div class="just-total">
              <span>Total · {{ kpi.rows.length }} projectes</span>
              <span>{{ kpi.withGrantable ? money(kpi.grantable) : "—" }}</span>
              <span>{{ money(kpi.justified) }}</span>
              <span>{{ kpi.withGrantable ? money(kpi.grantable - kpi.justifiedWithGrantable) : "—" }}</span>
            </div>
          </template>
        </b-table>
      </card-component>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="justifications.length && view === 'Factures'"
        title="Totals per projecte (factures)"
      >
        <b-table
          :data="summaryByProjectInvoices"
          :striped="true"
          :hoverable="true"
          :mobile-cards="false"
          default-sort="project"
        >
          <b-table-column field="project" label="Projecte" sortable v-slot="props" width="40%">
            {{ props.row.project }}
          </b-table-column>

          <b-table-column field="cost" label="Import justificat" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right">
            <money-format
              :value="props.row.cost"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value="false"
              :hide-subunits="false"
            />
          </b-table-column>

          <b-table-column field="grantable_amount" label="Import a justificar" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right">
            <money-format
              :value="props.row.grantable_amount ? props.row.grantable_amount : 0"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value="false"
              :hide-subunits="false"
            />
          </b-table-column>

          <b-table-column label="%" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.grantable_amount ? (a.cost / a.grantable_amount) * 100 : 0) - (b.grantable_amount ? (b.cost / b.grantable_amount) * 100 : 0)">
            <money-format
              :value="props.row.grantable_amount ? (props.row.cost / props.row.grantable_amount) * 100 : 0"
              :locale="'es'"
              :currency-code="'%'"
              :subunits-value="false"
              :hide-subunits="false"
              currency="%"
            />
          </b-table-column>

          <template #footer>
            <div class="has-text-weight-bold">
              <div class="columns">
                <div class="column is-4">TOTAL</div>
                <div class="column is-2 has-text-right">
                  <money-format
                    :value="summaryAllInvoices"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  />
                </div>
                <div class="column is-2 has-text-right">
                  <money-format
                    :value="summaryAllGrantableInvoices"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  />
                </div>
                <div class="column is-2"></div>
              </div>
            </div>
          </template>
        </b-table>
      </card-component>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="
          (monthlyActivitiesTotal.length || justifications.length) &&
            view === 'Bestretes'
        "
        title="Bestretes manuals"
      >
        <b-table
          :data="justifications.filter(j => j.users_permissions_user && (j.justification_type === justificationTypeEnum || (!j.justification_type && type === 'Reals')))"
          :striped="true"
          :hoverable="true"
          :mobile-cards="false"
          default-sort="year"
          default-sort-direction="desc"
        >
          <b-table-column field="year" label="Any" sortable v-slot="props">
            {{ props.row.year }}
          </b-table-column>

          <b-table-column field="month" label="Mes" sortable v-slot="props">
            {{ zeroPad(props.row.month, 2) }}
          </b-table-column>

          <b-table-column field="users_permissions_user.username" label="Persona" sortable v-slot="props">
            {{ props.row.users_permissions_user ? props.row.users_permissions_user.username : "" }}
          </b-table-column>

          <b-table-column field="project.name" label="Projecte" sortable v-slot="props">
            {{ props.row.project ? props.row.project.name : "" }}
          </b-table-column>

          <b-table-column field="quantity" label="Hores (€)" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right">
            {{ money(props.row.quantity) }}
          </b-table-column>

          <b-table-column label="Hores (h)" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.dedication && a.dedication.costByHour ? a.quantity / a.dedication.costByHour : 0) - (b.dedication && b.dedication.costByHour ? b.quantity / b.dedication.costByHour : 0)">
            {{ props.row.dedication && props.row.dedication.costByHour ? number(props.row.quantity / props.row.dedication.costByHour) + " h" : "—" }}
          </b-table-column>

          <b-table-column label="Bestreta (€)" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.payroll ? a.payroll.total : 0) - (b.payroll ? b.payroll.total : 0)">
            {{ props.row.payroll ? money(props.row.payroll.total) : "—" }}
          </b-table-column>

          <b-table-column label="% Hores/Bestreta" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.payroll && a.payroll.total ? (100 * a.quantity) / a.payroll.total : 0) - (b.payroll && b.payroll.total ? (100 * b.quantity) / b.payroll.total : 0)">
            <span v-if="props.row.payroll && props.row.payroll.total">
              {{ percent(props.row.quantity, props.row.payroll.total) }}
            </span>
            <b-icon
              v-if="isJustificationExceeding100(props.row)"
              icon="alert"
              type="is-warning"
              size="is-small"
              :title="`La suma de percentatges per aquesta persona en aquest mes supera el 100%. S'utilitza l'import de la bestreta (${props.row.payroll.total.toFixed(2)}€) en lloc de les hores fetes.`"
              style="cursor: help; margin-left: 4px;"
            />
          </b-table-column>

          <b-table-column label="Accions" v-slot="props" header-class="has-text-right" cell-class="has-text-right">
            <b-button
              @click="deleteJustification(props.row)"
              title="Esborrar"
              class="view-button"
              type="is-danger"
              icon-left="trash-can"
            />
          </b-table-column>
        </b-table>
        <div class="card-body add-row-form">
          <div class="columns">
            <div class="column is-2">
              <label class="add-row-label">Any</label>
              <b-select v-model="justification.year" expanded>
                <option
                  v-for="y in 5"
                  :key="'year-' + y"
                  :value="(new Date().getFullYear() - y + 1).toString()"
                >
                  {{ new Date().getFullYear() - y + 1 }}
                </option>
              </b-select>
            </div>
            <div class="column is-1">
              <label class="add-row-label">Mes</label>
              <b-select v-model="justification.month" expanded>
                <option v-for="m in 12" :key="'month-' + m" :value="m">
                  {{ zeroPad(m, 2) }}
                </option>
              </b-select>
            </div>
            <div class="column is-3">
              <label class="add-row-label">Persona</label>
              <b-autocomplete
                v-model="userSearch"
                placeholder="Selecciona una persona..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsers"
                field="username"
                @select="option => onUserSelect(option)"
                :clearable="true"
                expanded
              >
              </b-autocomplete>
            </div>
            <div class="column is-3">
              <label class="add-row-label">Projecte</label>
              <b-autocomplete
                v-model="projectSearch2"
                placeholder="Selecciona un projecte..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProjects2"
                field="name"
                @select="option => onProjectSelect2(option)"
                :clearable="true"
                expanded
              >
              </b-autocomplete>
            </div>
            <div class="column is-2">
              <label class="add-row-label">
                {{ justification.unit === 'hours' ? 'Hores (h)' : justification.unit === 'pct' ? '% Bestreta' : 'Hores (€)' }}
              </label>
              <b-field>
                <b-input
                  v-model="justification.quantity"
                  expanded
                  :placeholder="justification.unit === 'hours' ? 'Hores' : justification.unit === 'pct' ? '%' : '€'"
                />
                <b-select v-model="justification.unit">
                  <option value="eur">€</option>
                  <option value="hours">h</option>
                  <option value="pct">%</option>
                </b-select>
              </b-field>
              <p
                class="help"
                :class="formQuantityHintClass"
                v-if="formQuantityHint"
              >
                <template v-if="formQuantityInEur.ok">
                  ≈ <strong>{{ formQuantityInEur.eur.toFixed(2) }} €</strong>
                </template>
                <template v-else>{{ formQuantityHint }}</template>
              </p>
            </div>
            <div class="column is-1 is-flex is-align-items-end">
              <b-button
                @click="addJustification"
                title="Afegir"
                class="view-button"
                type="is-primary"
                :disabled="!addJustificationEnabled"
                icon-left="plus"
              />
            </div>
          </div>
        </div>
      </card-component>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="
          (monthlyActivitiesTotal.length || justifications.length) &&
            view === 'Bestretes'
        "
        title="Detall de bestretes"
        :close-icon="true"
        :content-visible="true"
      >
        <div class="p-4">
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

          <div id="justification-pivot"></div>

          <download-excel name="justificacions-bestretes" class="export" :data="pivotData">
            <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
          </download-excel>
        </div>
      </card-component>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="
          (monthlyActivitiesTotal.length || justifications.length) &&
            view === 'Factures'
        "
        title="Detall de factures"
        :close-icon="true"
        :content-visible="true"
      >
        <b-table
          :data="justifications.filter(j => j.emitted_invoice)"
          :striped="false"
          :hoverable="false"
          :mobile-cards="false"
          default-sort="year"
          default-sort-direction="desc"
        >
          <b-table-column field="year" label="Any" sortable v-slot="props">
            {{ props.row.year }}
          </b-table-column>

          <b-table-column field="project.name" label="Projecte" sortable v-slot="props">
            {{ props.row.project.name }}
          </b-table-column>

          <b-table-column field="emitted_invoice.code" label="Factura" sortable v-slot="props">
            {{ props.row.emitted_invoice ? props.row.emitted_invoice.code : "" }}
          </b-table-column>

          <b-table-column field="quantity" label="Import" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right">
            <money-format
              :value="props.row.quantity"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value="false"
              :hide-subunits="false"
            />
          </b-table-column>

          <b-table-column label="Accions" v-slot="props" header-class="has-text-right" cell-class="has-text-right">
            <b-button
              @click="deleteJustification(props.row)"
              title="Esborrar"
              class="view-button"
              type="is-danger"
              icon-left="trash-can"
            />
          </b-table-column>
        </b-table>
        <div class="card-body add-row-form">
          <div class="columns">
            <div class="column is-1">
              <label class="add-row-label">Any</label>
              <b-select v-model="justificationInvoice.year" expanded>
                <option
                  v-for="y in 5"
                  :key="'year-' + y"
                  :value="(new Date().getFullYear() - y + 1).toString()"
                >
                  {{ new Date().getFullYear() - y + 1 }}
                </option>
              </b-select>
            </div>
            <div class="column is-4">
              <label class="add-row-label">Projecte</label>
              <b-autocomplete
                v-model="projectSearch"
                placeholder="Selecciona un projecte..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProjects"
                field="name"
                @select="option => onProjectSelect(option)"
                :clearable="true"
                expanded
              >
              </b-autocomplete>
            </div>
            <div class="column is-4">
              <label class="add-row-label">Factura</label>
              <b-autocomplete
                v-model="invoiceSearch"
                placeholder="Selecciona una factura..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredInvoices"
                field="code"
                @select="option => onEmittedInvoiceSelect(option)"
                :clearable="true"
                expanded
              >
                <template v-slot="props">
                  {{ props.option.code }} ({{
                    props.option.total_base
                      ? props.option.total_base.toFixed(2)
                      : "-"
                  }}
                  €)
                </template>
                <template #empty>No hi ha resultats</template>
              </b-autocomplete>
            </div>
            <div class="column is-2">
              <label class="add-row-label">Import</label>
              <b-input v-model="justificationInvoice.quantity" expanded />
            </div>
            <div class="column is-1 is-flex is-align-items-end">
              <b-button
                @click="addJustificationInvoice"
                title="Afegir"
                class="view-button"
                type="is-primary"
                :disabled="!addJustificationInvoiceEnabled"
                icon-left="plus"
              />
            </div>
          </div>
        </div>
      </card-component>

      <download-excel name="justificacions-factures"
        class="export"
        :data="dataCSV"
        :fields="{
          hours: 'hours',
          year: 'year',
          month: 'month',
          username: 'username',
          project_id: 'project_id',
          project: 'project',
          cost: {
            field: 'cost',
            callback: value => {
              return excelFormat(value);
            }
          },
          payroll: {
            field: 'payroll',
            callback: value => {
              return excelFormat(value);
            }
          },
          grantable_amount: {
            field: 'grantable_amount',
            callback: value => {
              return excelFormat(value);
            }
          }
        }"
      >
        <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
      </download-excel>
    </div>
  </div>
</template>

<script>
import service from "@/service/index";
// import uniq from 'lodash/uniq'
// import map from 'lodash/map'
import sumBy from "lodash/sumBy";
import moment from "moment";
import CardComponent from "@/components/CardComponent.vue";
import _ from "lodash";
import { formatMoney, formatNumber } from "@/helpers/format-number";
import { grantableAmountForYear, grantableAmountAllYears } from "@/domain/grantable";
import { fiscalYearLabel, fiscalYearOf } from "@/domain/years";
import { loadFiscalSettings } from "@/service/fiscalYear";
import { format } from "@/helpers/excelFormatter";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import MoneyFormat from "@/components/MoneyFormat.vue";
import configJustificationPivot from "@/service/configJustificationPivot";
import PivotViews from "@/components/PivotViews.vue";
import pivotViewsMixin from "@/mixins/pivotViewsMixin.js";

moment.locale("ca");

export default {
  name: "Justification",
  components: { CardComponent, MoneyFormat, PivotViews },
  mixins: [pivotViewsMixin],
  props: {
    type: {
      type: String,
      default: null
    },
    year: {
      type: [Number, String],
      default: null
    },
    view: {
      type: String,
      default: null
    },
    projectState: {
      type: [Number, String],
      default: null
    }
  },
  data() {
    return {
      isLoading: false,
      projectInfo: null,
      payrolls: [],
      users: [],
      projects: [],
      estimatedTotals: [],
      justification: { unit: "eur" },
      justificationInvoice: {
        year: "",
        month: null,
        project: null,
        emitted_invoice: null,
        quantity: ""
      },
      justifications: [],
      dedications: [],
      theYear: 0,
      // first month of a grant year: the fiscal year's when grant years are
      // fiscal (Configuració general › Projectes), else 1. The rows keep the
      // calendar year and month, which payrolls and justifications use.
      grantStartMonth: 1,
      invoices: [],
      invoiceSearch: "",
      projectSearch: "",
      projectSearch2: "",
      userSearch: "",
      pivotIdentifier: "justification-pivot"
    };
  },
  computed: {
    ...mapState(useMainStore, ["userName", "user"]),
    justificationTypeEnum() {
      // Map view type to enum value
      if (this.type === 'Reals') {
        return 'real';
      } else if (this.type === 'Manuals previstes' || this.type === 'Previstes') {
        return 'estimated';
      }
      return 'estimated';
    },
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    },
    monthlyActivities() {
      if (!this.users || !this.users.length) {
        return [];
      }
      
      // For "Manuals previstes", return empty array (only justifications will be shown)
      if (this.type === "Manuals previstes") {
        return [];
      }
      
      const activities = [];
      if (this.type === "Reals") {
        this.projects.forEach(p => {
          p.activities
            .filter(a => this.inGrantYear(a.date))
            .forEach(a => {
              const activityYear = moment(a.date, "YYYY-MM-DD").format("YYYY");
              const activity = {
                ...a,
                project: a.project,
                project_name: p.name,
                grantable_amount: this.getGrantableAmountForYear(
                  p,
                  this.grantYearOf(a.date),
                  "grantable_amount"
                ),
                users_permissions_user: a.users_permissions_user,
                year: activityYear,
                month: moment(a.date, "YYYY-MM-DD").format("MM"),
                key:
                  moment(a.date, "YYYY-MM-DD").format("YYYYMM") +
                  "-" +
                  a.users_permissions_user +
                  "-" +
                  a.project
              };
              activities.push(activity);
            });
        });
      } else {
        this.estimatedTotals.filter(t => this.inGrantYear(t.day)).forEach(t => {
          const activityYear = moment(t.day, "YYYY-MM-DD").format("YYYY");
          const project = this.projects.find(p => p.id == t.project);
          
          // Skip if project not found (filtered out by project_state)
          if (!project) {
            return;
          }
          
          const activity = {
            ...t,
            project: t.project,
            project_name: t.project_name,
            grantable_amount: this.getGrantableAmountForYear(
              project,
              this.grantYearOf(t.day),
              "grantable_amount"
            ),
            users_permissions_user: t.userId,
            year: activityYear,
            month: moment(t.day, "YYYY-MM-DD").format("MM"),
            hours: t.q,
            cost_by_hour: t.costByHour,
            key:
              moment(t.day, "YYYY-MM-DD").format("YYYYMM") +
              "-" +
              t.userId +
              "-" +
              t.project
          };
          activities.push(activity);
        });
      }
      return activities;
    },
    monthlyActivitiesTotal() {
      const activities = _(this.monthlyActivities)
        .groupBy("key")
        .map((rows, id) => {
          const pr = this.payrolls.find(
            p =>
              p.users_permissions_user &&
              p.users_permissions_user.id &&
              rows[0].users_permissions_user &&
              p.users_permissions_user.id.toString() ===
                rows[0].users_permissions_user.toString() &&
              parseInt(p.year.year) === parseInt(rows[0].year) &&
              parseInt(p.month.month) === parseInt(rows[0].month)
          );
          const user = this.users.find(
            u => u.id === rows[0].users_permissions_user
          );
          return {
            ym: id,
            cost: _.sumBy(rows, r => r.hours * r.cost_by_hour),
            hours: _.sumBy(rows, "hours"),
            year: rows[0].year,
            month: rows[0].month,
            users_permissions_user: rows[0].users_permissions_user,
            username: user ? user.username : "",
            project_id: rows[0].project,
            project: rows[0].project_name,
            payroll: pr ? pr.total : null,
            grantable_amount: rows[0].grantable_amount
            // rows: rows
          };
        })
        .value();
      return activities;
    },
    summaryByProject() {
      const activities = _(this.monthlyActivitiesTotal)
        .groupBy("project")
        .map((rows, id) => {
          return {
            project: id,
            cost: _.sumBy(rows, r => r.cost),
            grantable_amount: this.grantableOfProjectName(id)
          };
        })
        .value();
      return activities;
    },
    summaryJustificationsByProject() {
      // First, calculate capped amounts per user/month
      const justificationsByCapped = this.getJustificationsWithCappedAmounts();
      
      // Then group by project
      const activities = _(justificationsByCapped)
        .groupBy("project.name")
        .map((rows, id) => {
          return {
            project: id,
            cost: _.sumBy(rows, r => r.cappedAmount)
          };
        })
        .value();
      return activities;
    },
    summaryJustificationsInvoicesByProject() {
      // Get actual invoice justifications grouped by project
      const invoiceJustifications = _(
        this.justifications.filter(j => j.emitted_invoice)
      )
        .groupBy("project.name")
        .map((rows, id) => {
          // Get the project and year to find the correct grantable amount
          const project = rows[0].project;
          const year = this.justificationGrantYear(rows[0]);
          return {
            project: id,
            cost: _.sumBy(rows, r => r.quantity),
            grantable_amount: this.getGrantableAmountForYear(
              project,
              year,
              "grantable_structural_expenses_justify_invoices"
            )
          };
        })
        .value();

      // Get all projects that should have invoice justifications (grantable_structural_expenses_justify_invoices > 0)
      // issues/263: the chosen year's amount (all years with «Tots»)
      const projectsWithGrantableInvoices = this.projects
        .map(project => ({
          project: project.name,
          cost: 0, // Default to 0 if no justifications yet
          grantable_amount: this.grantableForSelectedYear(
            project,
            "grantable_structural_expenses_justify_invoices"
          )
        }))
        .filter(row => row.grantable_amount > 0);
      // Merge both arrays, giving priority to actual justifications
      const combined = _.concat(
        projectsWithGrantableInvoices,
        invoiceJustifications
      );

      // Group by project name and sum costs, keeping the grantable_amount
      const activities = _(combined)
        .groupBy("project")
        .map((rows, id) => {
          return {
            project: id,
            cost: _.sumBy(rows, r => r.cost),
            grantable_amount: rows[0].grantable_amount // Take the first one (should be the same for all)
          };
        })
        .value();

      return activities;
    },
    summaryByProjectAll() {
      // For "Manuals previstes", only include manual justifications but show all projects
      if (this.type === "Manuals previstes") {
        // Get all grantable projects with their grantable amounts
        // issues/263: the chosen year's amount (all years with «Tots»); with a
        // year, only the projects with an amount for it (or a justification)
        const projectsWithGrantable = this.projects
          .map(project => {
            return {
              project: project.name,
              cost: 0, // Will be filled from justifications
              grantable_amount: this.grantableForSelectedYear(project, "grantable_amount")
            };
          })
          .filter(row => !this.theYear || Number(row.grantable_amount));
        
        // Merge with justifications data
        const combined = _.concat(projectsWithGrantable, this.summaryJustificationsByProject);
        
        const activities = _(combined)
          .groupBy("project")
          .map((rows, id) => {
            return {
              project: id,
              cost: _.sumBy(rows, r => r.cost),
              grantable_amount: rows.find(r => r.grantable_amount)?.grantable_amount || 0
            };
          })
          .value();
        
        return _.orderBy(activities, "project");
      }
      
      // For "Previstes" and "Reals", include both activities and justifications
      const activities = _(
        _.concat(this.summaryByProject, this.summaryJustificationsByProject)
      )
        .groupBy("project")
        .map((rows, id) => {
          return {
            project: id,
            cost: _.sumBy(rows, r => r.cost),
            // issues/263: the project's amount for the chosen year (all
            // years with «Tots»), not the first row's (a justification has none)
            grantable_amount: this.grantableOfProjectName(id)
          };
        })
        .value();
      return _.orderBy(activities, "project");
    },
    summaryByProjectInvoices() {
      const activities = _(this.summaryJustificationsInvoicesByProject)
        .groupBy("project")
        .map((rows, id) => {
          return {
            project: id,
            cost: _.sumBy(rows, r => r.cost),
            grantable_amount: rows[0].grantable_amount
          };
        })
        .value();
      return _.orderBy(activities, "project");
    },
    // figures of the shown view (bestretes or factures), from the totals tables
    kpi() {
      const rows = (this.view === "Factures" ? this.summaryByProjectInvoices : this.summaryByProjectAll) || [];
      const withGrantable = rows.filter(r => Number(r.grantable_amount));
      return {
        rows,
        justified: _.sumBy(rows, r => Number(r.cost) || 0),
        grantable: _.sumBy(withGrantable, r => Number(r.grantable_amount)),
        justifiedWithGrantable: _.sumBy(withGrantable, r => Number(r.cost) || 0),
        withGrantable: withGrantable.length,
        withCost: rows.filter(r => Number(r.cost)).length,
        withoutGrantable: rows.filter(r => !Number(r.grantable_amount) && Number(r.cost)).length
      };
    },
    summaryAll() {
      return _.sumBy(this.summaryByProjectAll, "cost");
    },
    summaryAllGrantable() {
      return _.sumBy(this.summaryByProjectAll, "grantable_amount");
    },
    summaryAllInvoices() {
      return _.sumBy(this.summaryByProjectInvoices, "cost");
    },
    summaryAllGrantableInvoices() {
      return _.sumBy(this.summaryByProjectInvoices, "grantable_amount");
    },
    summaryByUser() {
      const activities = _(this.monthlyActivitiesTotal)
        .groupBy("username")
        .map((rows, id) => {
          return {
            username: id,
            cost: _.sumBy(rows, r => r.cost)
          };
        })
        .value();
      return activities;
    },
    summaryJustificationsByUser() {
      // Use capped amounts when exceeding 100%
      const justificationsByCapped = this.getJustificationsWithCappedAmounts();
      
      const activities = _(justificationsByCapped)
        .groupBy("users_permissions_user.username")
        .map((rows, id) => {
          return {
            username: id,
            cost: _.sumBy(rows, "cappedAmount")
          };
        })
        .value();
      return activities;
    },
    summaryByUserMonth() {
      const activities1 = _(this.monthlyActivitiesTotal)
        .groupBy(item => `${item.username}_${item.month}`)
        .map((rows, id) => {
          return {
            username: rows[0].username,
            month: rows[0].month,
            year: rows[0].year,
            cost: _.sumBy(rows, r => r.cost)
          };
        })
        .value();
      const activities2 = _(
        this.justifications.filter(
          j => j.users_permissions_user && 
          (j.justification_type === this.justificationTypeEnum || 
           (!j.justification_type && this.type === 'Reals'))
        )
      )
              .groupBy(
                item => `${item.users_permissions_user.username}_${item.month}`
              )
              .map((rows, id) => {
                return {
                  username: rows[0].users_permissions_user.username,
                  month: this.zeroPad(rows[0].month, 2),
                  year: rows[0].year,
                  cost: _.sumBy(rows, r => r.quantity)
                };
              })
              .value();

      const activitiesjoin = _.concat(activities1, activities2);

      const activities = _(activitiesjoin)
        .groupBy(item => `${item.username}_${item.month}`)
        .map((rows, id) => {
          return {
            username: rows[0].username,
            month: rows[0].month,
            year: rows[0].year,
            cost: _.sumBy(rows, "cost"),
            payroll: this.payrolls.find(
              p =>
                p.users_permissions_user.username === rows[0].username &&
                parseInt(p.year.year) === parseInt(rows[0].year) &&
                parseInt(p.month.month) === parseInt(rows[0].month)
            )
          };
        })
        .value();
      return _.orderBy(activities, ["username", "month"]);
    },
    summaryByUserAll() {
      const activities = _(
        _.concat(this.summaryByUser, this.summaryJustificationsByUser)
      )
        .groupBy("username")
        .map((rows, id) => {
          return {
            username: id,
            cost: _.sumBy(rows, r => r.cost)
          };
        })
        .value();
      return activities;
    },
    dataCSV() {
      const justifications = this.justifications
        .filter(
          j => j.justification_type === this.justificationTypeEnum || 
          (!j.justification_type && this.type === 'Reals')
        )
        .map(
              ({
                id,
                project,
                dedication,
                payroll,
                created_at,
                updated_at,
                ...row
              }) => {
                return {
                  ...row,
                  project_id: project.id,
                  project: project.name,
                  payroll: payroll ? payroll.total : 0,
                  username: row.users_permissions_user
                    ? row.users_permissions_user.username
                    : "",
                  emitted_invoice: row.emitted_invoice
                    ? row.emitted_invoice.code
                    : "",
                  cost: row.quantity
                };
              }
            );
      const rows = _.concat(this.monthlyActivitiesTotal, justifications);
      return rows.map(({ ym, users_permissions_user, ...row }) => row);
    },
    // The daily-dedication covering the form's current user/year/month
    formDedication() {
      const j = this.justification;
      if (
        !j ||
        !j.users_permissions_user ||
        !j.users_permissions_user.id ||
        !j.year ||
        !j.month
      ) {
        return null;
      }
      const date = moment(`${j.year}-${this.zeroPad(j.month, 2)}-01`).format(
        "YYYY-MM-DD"
      );
      return (
        this.dedications.find(
          d =>
            d.users_permissions_user &&
            d.users_permissions_user.id === j.users_permissions_user.id &&
            d.from <= date &&
            d.to >= date
        ) || null
      );
    },
    // The payroll for the form's current user/year/month
    formPayroll() {
      const j = this.justification;
      if (
        !j ||
        !j.users_permissions_user ||
        !j.users_permissions_user.id ||
        !j.year ||
        !j.month
      ) {
        return null;
      }
      return (
        this.payrolls.find(
          p =>
            p.users_permissions_user &&
            p.users_permissions_user.id === j.users_permissions_user.id &&
            parseInt(p.year.year) === parseInt(j.year) &&
            parseInt(p.month.month) === parseInt(j.month)
        ) || null
      );
    },
    // Convert the form's quantity (in the selected unit) to euros.
    // Returns { ok, eur, reason }. `ok === false` means the value cannot be
    // safely stored (no cost/hour or payroll for the chosen unit).
    formQuantityInEur() {
      const j = this.justification;
      const empty = { ok: false, eur: null, reason: null };
      if (!j || !j.quantity) {
        return empty;
      }
      const quantityStr = j.quantity.toString().replace(",", ".");
      const quantity = parseFloat(quantityStr);
      if (isNaN(quantity)) {
        return empty;
      }
      const unit = j.unit || "eur";

      if (unit === "eur") {
        return { ok: true, eur: quantity, reason: null };
      }
      if (unit === "hours") {
        const costByHour =
          this.formDedication && this.formDedication.costByHour
            ? this.formDedication.costByHour
            : 0;
        if (costByHour > 0) {
          return { ok: true, eur: quantity * costByHour, reason: null };
        }
        return {
          ok: false,
          eur: null,
          reason:
            "No hi ha cost/hora definit per a aquesta persona en aquest mes (cal una dedicació diària)"
        };
      }
      if (unit === "pct") {
        const total =
          this.formPayroll && this.formPayroll.total ? this.formPayroll.total : 0;
        if (total > 0) {
          return { ok: true, eur: (quantity / 100) * total, reason: null };
        }
        return {
          ok: false,
          eur: null,
          reason:
            "No hi ha bestreta definida per a aquesta persona en aquest mes"
        };
      }
      return empty;
    },
    // Hint text shown under the quantity field (only the error reason; the
    // success "≈ X €" is rendered directly in the template).
    formQuantityHint() {
      const j = this.justification;
      if (!j || !j.quantity) return null;
      const unit = j.unit || "eur";
      if (unit === "eur") return null;
      if (this.formQuantityInEur.ok) return "ok";
      return this.formQuantityInEur.reason;
    },
    formQuantityHintClass() {
      if (!this.justification || !this.justification.quantity) return "";
      const unit = this.justification.unit || "eur";
      if (unit === "eur") return "";
      return this.formQuantityInEur.ok
        ? "has-text-grey-light"
        : "has-text-danger";
    },
    addJustificationEnabled() {
      return (
        this.justification.month &&
        this.justification.year &&
        this.justification.users_permissions_user &&
        this.justification.project &&
        this.justification.quantity &&
        parseInt(this.justification.quantity) !== 0 &&
        this.formQuantityInEur.ok
      );
    },
    addJustificationInvoiceEnabled() {
      return (
        this.justificationInvoice.year &&
        this.justificationInvoice.project &&
        this.justificationInvoice.emitted_invoice &&
        this.justificationInvoice.quantity &&
        parseInt(this.justificationInvoice.quantity) > 0
      );
    },
    filteredInvoices() {
      if (!this.invoiceSearch) {
        return this.invoices;
      }
      return this.invoices.filter(option => {
        return (
          // invoices without a code (drafts) threw here (issues/059)
          String(option.code ?? "")
            .toLowerCase()
            .indexOf(this.invoiceSearch.toLowerCase()) >= 0 ||
          (option.total_base &&
            option.total_base.toString().indexOf(this.invoiceSearch) >= 0)
        );
      });
    },
    filteredProjects() {
      if (!this.projectSearch) {
        return this.projects;
      }
      return this.projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredProjects2() {
      if (!this.projectSearch2) {
        return this.projects;
      }
      return this.projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch2.toLowerCase()) >= 0
        );
      });
    },
    filteredUsers() {
      if (!this.userSearch) {
        return this.users;
      }
      return this.users.filter(option => {
        return (
          option.username
            .toString()
            .toLowerCase()
            .indexOf(this.userSearch.toLowerCase()) >= 0
        );
      });
    },
    pivotData() {
      // Combine monthlyActivitiesTotal with justifications for pivot table
      const activities = this.monthlyActivitiesTotal.map(row => ({
        year: row.year,
        month: row.month.toString().padStart(2, "0"),
        username: row.username,
        project: row.project,
        cost: row.cost || 0,
        hours: row.hours || 0,
        payroll: row.payroll || 0,
        grantable_amount: row.grantable_amount || 0,
        count: 1,
        percentage_bestreta:
          row.payroll && row.payroll > 0 ? row.cost / row.payroll : 0,
        type: "activity"
      }));

      const justifications = this.justifications
        .filter(
          j => j.users_permissions_user && 
          (j.justification_type === this.justificationTypeEnum || 
           (!j.justification_type && this.type === 'Reals'))
        )
        .map(row => {
                const payroll = this.payrolls.find(
                  p =>
                    p.users_permissions_user &&
                    p.users_permissions_user.id ===
                      row.users_permissions_user.id &&
                    parseInt(p.year.year) === parseInt(row.year) &&
                    parseInt(p.month.month) === parseInt(row.month)
                );
                const payrollTotal = payroll ? payroll.total : 0;
                const cost = row.quantity || 0;
                return {
                  year: row.year.toString(),
                  month: row.month.toString().padStart(2, "0"),
                  username: row.users_permissions_user.username,
                  project: row.project ? row.project.name : "",
                  cost: cost,
                  hours:
                    row.dedication && row.dedication.costByHour
                      ? row.quantity / row.dedication.costByHour
                      : 0,
                  payroll: payrollTotal,
                  grantable_amount: 0, // justifications don't have grantable_amount
                  count: 1,
                  percentage_bestreta:
                    payrollTotal > 0 ? cost / payrollTotal : 0,
                  type: "justification"
                };
              });

      return [...activities, ...justifications];
    },
    // Computed property to check justifications that exceed 100% by user/month
    justificationsExceeding100() {
      const grouped = _(
        this.justifications.filter(
          j => j.users_permissions_user && 
          (j.justification_type === this.justificationTypeEnum || 
           (!j.justification_type && this.type === 'Reals'))
        )
      )
        .groupBy(item => `${item.users_permissions_user.id}_${item.year}_${item.month}`)
        .map((rows, key) => {
          const firstRow = rows[0];
          const payroll = this.payrolls.find(
            p =>
              p.users_permissions_user &&
              p.users_permissions_user.id === firstRow.users_permissions_user.id &&
              parseInt(p.year.year) === parseInt(firstRow.year) &&
              parseInt(p.month.month) === parseInt(firstRow.month)
          );
          
          if (!payroll || !payroll.total) {
            return null;
          }
          
          const totalPercentage = _.sumBy(rows, row => {
            return (row.quantity / payroll.total) * 100;
          });
          
          return {
            key: key,
            userId: firstRow.users_permissions_user.id,
            year: firstRow.year,
            month: firstRow.month,
            totalPercentage: totalPercentage,
            exceeds: totalPercentage > 100,
            payrollTotal: payroll.total
          };
        })
        .filter(item => item !== null && item.exceeds)
        .value();
      
      return grouped;
    }
  },
  watch: {
    type: function(newVal, oldVal) {
      this.getActivities();
    },
    year: function(newVal, oldVal) {
      if (newVal === "Tots") {
        this.theYear = 0;
      } else {
        this.theYear = parseInt(newVal);
      }
      this.getActivities();
    },
    projectState: function(newVal, oldVal) {
      this.getActivities();
    },
    pivotData: function(newVal, oldVal) {
      this.$nextTick(() => {
        this.updatePivotTable();
      });
    }
  },
  mounted() {
    this.getActivities();
  },
  methods: {
    money(value) {
      return formatMoney(Number(value) || 0);
    },
    number(value) {
      return formatNumber(Number(value) || 0, 2, 2);
    },
    percent(part, whole) {
      return whole ? formatNumber((Number(part) || 0) / whole * 100, 1, 1) + " %" : "—";
    },
    // The grant year of a date (a fiscal year when grant years are fiscal), as a string
    grantYearOf(date) {
      const year = fiscalYearOf(date, this.grantStartMonth);
      return year === null ? "" : String(year);
    },
    // a date of the selected grant year (any with «Tots»)
    inGrantYear(date) {
      return !this.theYear || this.grantYearOf(date) === this.theYear.toString();
    },
    justificationDate(j) {
      return `${j.year}-${this.zeroPad(j.month, 2)}-01`;
    },
    // The grant year of a justification. Invoice justifications may have no
    // month: their year is the grant year as entered (issues/263; it built
    // «2025-null-01» and the row disappeared when a year was chosen).
    justificationGrantYear(j) {
      if (!j.month) return j.year === null || j.year === undefined ? "" : String(j.year);
      return this.grantYearOf(this.justificationDate(j));
    },
    // The justifications of the chosen grant year
    filterJustifications(justifications) {
      return justifications.filter(j => {
        if (this.theYear && this.justificationGrantYear(j) !== this.theYear.toString()) return false;
        return true;
      });
    },
    // A project's amount (to justify by default) for the chosen grant year,
    // or the sum of all its years with «Tots» (issues/263)
    grantableForSelectedYear(project, field = "grantable_amount") {
      if (!project) return 0;
      return Number(
        this.theYear
          ? this.getGrantableAmountForYear(project, this.theYear, field)
          : this.getTotalGrantableAmount(project, field)
      ) || 0;
    },
    grantableOfProjectName(name, field = "grantable_amount") {
      return this.grantableForSelectedYear(this.projects.find(p => p.name === name), field);
    },
    // «2026», or «2026/27» when grant years are fiscal
    grantYearLabel(year) {
      return fiscalYearLabel(year, this.grantStartMonth);
    },
    // « per al 2026» after the KPI texts; nothing for «Tots» (issues/213)
    forYear() {
      return this.year && this.year !== "Tots" ? " per al " + this.grantYearLabel(this.year) : "";
    },
    // Helper function to get grantable amount for a specific year and field
    getGrantableAmountForYear(project, year, field = "grantable_amount") {
      return grantableAmountForYear(project, year, field);
    },

    // Helper function to get total grantable amount for all years
    getTotalGrantableAmount(project, field = "grantable_amount") {
      return grantableAmountAllYears(project, field);
    },
    // Check if a justification row exceeds 100% for its user/month
    isJustificationExceeding100(row) {
      const key = `${row.users_permissions_user.id}_${row.year}_${row.month}`;
      return this.justificationsExceeding100.find(item => item.key === key);
    },
    // Get justifications with capped amounts (when exceeding 100%, use payroll total proportionally)
    getJustificationsWithCappedAmounts() {
      const filtered = this.justifications.filter(
        j => j.users_permissions_user && 
        (j.justification_type === this.justificationTypeEnum || 
         (!j.justification_type && this.type === 'Reals'))
      );
      
      // Group by user/month to check if they exceed 100%
      const grouped = _.groupBy(filtered, j => `${j.users_permissions_user.id}_${j.year}_${j.month}`);
      
      const result = [];
      
      Object.keys(grouped).forEach(key => {
        const justificationsGroup = grouped[key];
        const firstJust = justificationsGroup[0];
        
        // Find payroll for this user/month
        const payroll = this.payrolls.find(
          p =>
            p.users_permissions_user &&
            p.users_permissions_user.id === firstJust.users_permissions_user.id &&
            parseInt(p.year.year) === parseInt(firstJust.year) &&
            parseInt(p.month.month) === parseInt(firstJust.month)
        );
        
        if (payroll && payroll.total) {
          const totalQuantity = _.sumBy(justificationsGroup, 'quantity');
          const percentage = (totalQuantity / payroll.total) * 100;
          
          if (percentage > 100) {
            // Distribute the payroll total proportionally among justifications
            justificationsGroup.forEach(j => {
              const proportion = j.quantity / totalQuantity;
              result.push({
                ...j,
                cappedAmount: payroll.total * proportion
              });
            });
          } else {
            // No capping needed
            justificationsGroup.forEach(j => {
              result.push({
                ...j,
                cappedAmount: j.quantity
              });
            });
          }
        } else {
          // No payroll found, use original quantity
          justificationsGroup.forEach(j => {
            result.push({
              ...j,
              cappedAmount: j.quantity
            });
          });
        }
      });
      
      return result;
    },
    async getActivities() {
      this.isLoading = true;

      if (!this.year) {
        return;
      }

      this.months = {};
      this.payrolls = [];
      const fiscal = await loadFiscalSettings();
      this.grantStartMonth = fiscal.grantableFiscal ? fiscal.startMonth : 1;
      // a fiscal grant year spans two calendar years (2026/27: Sep 2026 – Aug 2027)
      const calendarYears = this.theYear
        ? (this.grantStartMonth > 1 ? [this.theYear, this.theYear + 1] : [this.theYear])
        : [];

      const years = (
        await service({ requiresAuth: true }).get("years?_limit=-1")
      ).data;

      const payrollQueries = this.theYear
        ? calendarYears
            .map(y => years.find(e => parseInt(e.year) === y))
            .filter(Boolean)
            .map(y => `payrolls?_where[year]=${y.id}&_limit=-1`)
        : [`payrolls?_limit=-1`];
      
      // Build projects query with grantable and project_state filters
      const projectState = this.projectState !== null ? this.projectState : 0;
      // with-activities: the real hours ("Reals") are read from each project's activities (issues/016)
      let query2 = `projects/with-activities?_where[grantable_eq]=true`;
      if (projectState !== 0 && projectState !== '0') {
        query2 += `&_where[project_state_eq]=${projectState}`;
      }
      query2 += `&_limit=-1`;

      this.payrolls = (
        await Promise.all(payrollQueries.map(q => service({ requiresAuth: true }).get(q)))
      ).flatMap(r => r.data);

      // Get projects with grantable_years populated
      this.projects = (await service({ requiresAuth: true }).get(query2)).data;
      
      // Load estimated-totals only for "Previstes" type, not for "Manuals previstes" or "Reals"
      if (this.type === "Previstes") {
        const queries = this.theYear
          ? calendarYears.map(y => `projects/estimated-totals?_where[grantable_eq]=true&_limit=-1&year=${y}`)
          : [`projects/estimated-totals?_where[grantable_eq]=true&_limit=-1`];
        this.estimatedTotals = (
          await Promise.all(queries.map(q => service({ requiresAuth: true }).get(q)))
        ).flatMap(r => r.data);
      } else {
        // Clear estimated totals when viewing "Reals" or "Manuals previstes"
        this.estimatedTotals = [];
      }
      
      // Load justifications for both Reals and Previstes views
      const justificationQueries = this.theYear
        ? calendarYears.map(y => `justifications?year=${y}&_limit=-1`)
        : [`justifications?_limit=-1`];
      const loadedJustifications = (
        await Promise.all(justificationQueries.map(q => service({ requiresAuth: true }).get(q)))
      )
        .flatMap(r => r.data);
      const justifications = this.filterJustifications(loadedJustifications);

      this.dedications = (
        await service({ requiresAuth: true }).get("daily-dedications?_limit=-1")
      ).data;

      for (const just of justifications.filter(j => j.users_permissions_user)) {
          const date = moment(`${just.year}-${just.month}-01`).format(
            "YYYY-MM-DD"
          );
          const dedication = this.dedications.find(
            d =>
              d.users_permissions_user &&
              just.users_permissions_user &&
              d.users_permissions_user.id === just.users_permissions_user.id &&
              d.from <= date &&
              d.to >= date
          );
          just.dedication = dedication;
          const payroll = this.payrolls.find(
            p =>
              p.users_permissions_user &&
              just.users_permissions_user &&
              p.users_permissions_user.id === just.users_permissions_user.id &&
              parseInt(p.year.year) === parseInt(just.year) &&
              parseInt(p.month.month) === parseInt(just.month)
          );
        just.payroll = payroll;
      }
      this.justifications = justifications;

      this.users = (
        await service({ requiresAuth: true, cached: true }).get(
          "users?_limit=-1"
        )
      ).data;

      this.invoices = (
        await service({ requiresAuth: true, cached: true }).get(
          "emitted-invoices?_limit=-1"
        )
      ).data;

      // Initialize or update pivot table
      this.$nextTick(() => {
        if (this.pivotData.length > 0) {
          configJustificationPivot.dataSource.data = Object.freeze(
            this.pivotData
          );
          this.initializePivotWithViews(
            "#justification-pivot",
            configJustificationPivot
          );
        }
      });

      this.isLoading = false;
    },

    zeroPad(num, places) {
      return String(num).padStart(places, "0");
    },
    async deleteJustification(row) {
      this.$buefy.dialog.confirm({
        message: "Eliminar justificació?",
        onConfirm: async () => {
          await service({ requiresAuth: true }).delete(
            `justifications/${row.id}`
          );
          this.$buefy.snackbar.open({
            message: "Eliminada",
            queue: false
          });
          this.getActivities();
        },
        onCancel: () => {
          return false;
        }
      });
    },
    async addJustification() {
      const dataToSubmit = { ...this.justification };

      // Convert the entered value (in the selected unit) to euros before saving.
      // `quantity` is always stored in €; the unit selector is a UI-only helper.
      const conversion = this.formQuantityInEur;
      if (!conversion.ok) {
        // Defensive: the add button is disabled when !ok, but guard anyway.
        if (conversion.reason) {
          this.$buefy.snackbar.open({
            message: conversion.reason,
            type: "is-danger",
            queue: false
          });
        }
        return;
      }
      dataToSubmit.quantity = conversion.eur;

      // Set justification_type based on current view
      dataToSubmit.justification_type = this.justificationTypeEnum;

      // `unit` is a transient UI field, do not send it to the backend
      delete dataToSubmit.unit;

      // Check if this justification would exceed 100% of the bestreta
      const userId = dataToSubmit.users_permissions_user.id;
      const year = dataToSubmit.year;
      const month = dataToSubmit.month;

      // Find the payroll for this user/month
      const payroll = this.payrolls.find(
        p =>
          p.users_permissions_user &&
          p.users_permissions_user.id === userId &&
          parseInt(p.year.year) === parseInt(year) &&
          parseInt(p.month.month) === parseInt(month)
      );

      if (payroll && payroll.total) {
        // Calculate existing justifications total for this user/month
        const existingTotal = this.justifications
          .filter(
            j =>
              j.users_permissions_user &&
              j.users_permissions_user.id === userId &&
              parseInt(j.year) === parseInt(year) &&
              parseInt(j.month) === parseInt(month) &&
              (j.justification_type === this.justificationTypeEnum ||
               (!j.justification_type && this.type === 'Reals'))
          )
          .reduce((sum, j) => sum + (j.quantity || 0), 0);

        // Calculate total percentage including the new justification
        const newTotal = existingTotal + dataToSubmit.quantity;
        const percentage = (newTotal / payroll.total) * 100;

        if (percentage > 100) {
          // Show warning dialog but allow user to continue
          this.$buefy.dialog.confirm({
            title: 'Atenció',
            message: `El percentatge total d'hores/bestreta per aquesta persona en aquest mes serà del ${percentage.toFixed(2)}%, superant el 100% de la bestreta (${payroll.total.toFixed(2)}€).<br><br>Vols continuar igualment?`,
            confirmText: 'Continuar',
            cancelText: 'Cancel·lar',
            type: 'is-warning',
            hasIcon: true,
            icon: 'alert',
            onConfirm: async () => {
              await this.saveJustification(dataToSubmit);
            }
          });
          return;
        }
      }

      // If percentage is OK or no payroll found, proceed normally
      await this.saveJustification(dataToSubmit);
    },
    async saveJustification(dataToSubmit) {
      await service({ requiresAuth: true }).post(
        `justifications`,
        dataToSubmit
      );
      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false
      });
      this.justification = { unit: "eur" };
      this.projectSearch2 = "";
      this.userSearch = "";
      this.getActivities();
    },
    async addJustificationInvoice() {
      // Fix decimals before submitting
      const dataToSubmit = { ...this.justificationInvoice };
      if (dataToSubmit.quantity) {
        // Convert to string, replace comma with dot, then parse as float
        const quantityStr = dataToSubmit.quantity.toString().replace(",", ".");
        dataToSubmit.quantity = parseFloat(quantityStr);
      }
      
      await service({ requiresAuth: true }).post(
        `justifications`,
        dataToSubmit
      );
      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false
      });
      this.justificationInvoice = {
        year: "",
        month: null,
        project: null,
        emitted_invoice: null,
        quantity: ""
      };
      this.invoiceSearch = "";
      this.projectSearch = "";
      this.getActivities();
    },
    excelFormat(value) {
      return format(this.user, value);
    },
    onEmittedInvoiceSelect(option) {
      this.justificationInvoice.emitted_invoice = option;
      if (option) {
        if (this.justificationInvoice.project) {
          this.justificationInvoice.quantity = option.total_base;
        }
      } else {
        this.justificationInvoice.quantity = "";
      }
    },
    onProjectSelect(option) {
      this.justificationInvoice.project = option;
    },
    onProjectSelect2(option) {
      this.justification.project = option;
    },
    onUserSelect(option) {
      this.justification.users_permissions_user = option;
    },
    applyDefaultView() {
      this.selectedViewId = null
      if (this.pivotGridInstance) {
        // Reset to default configuration
        const dataSource = this.pivotGridInstance.dataSource;
        const defaultConfig = configJustificationPivot.dataSource;

        dataSource.columns(defaultConfig.columns || []);
        dataSource.rows(defaultConfig.rows || []);
        dataSource.measures(defaultConfig.measures || []);

        this.selectedViewId = null;
      }
    },
    updatePivotTable() {
      if (this.pivotGridInstance && this.pivotData.length > 0) {
        try {
          // Update the current dataSource data instead of setting a new dataSource
          const currentDataSource = this.pivotGridInstance.dataSource;
          if (currentDataSource && currentDataSource.data) {
            // Just update the data array
            currentDataSource.data(this.pivotData);
          } else {
            // Fallback: recreate the entire pivot grid if dataSource is not available
            this.initializePivotWithViews("#justification-pivot", {
              ...configJustificationPivot,
              dataSource: {
                ...configJustificationPivot.dataSource,
                data: this.pivotData
              }
            });
          }
        } catch (error) {
          console.error("Error updating pivot table:", error);
          // Fallback: recreate the entire pivot grid
          this.initializePivotWithViews("#justification-pivot", {
            ...configJustificationPivot,
            dataSource: {
              ...configJustificationPivot.dataSource,
              data: this.pivotData
            }
          });
        }
      }
    },
  },
};
</script>
<style scoped>
.just-warning {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-size: .875rem;
}
.just-total {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 10rem 10rem 10rem 3rem;
  gap: .5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.just-total span:not(:first-child) {
  text-align: right;
}
.just-link {
  font-weight: 800;
  text-decoration: underline;
  white-space: nowrap;
}
.doc-kpi b small {
  font-size: .875rem;
  color: var(--a-muted);
}
</style>
<style scoped>
.separator {
  margin-right: 0.5rem;
  display: inline-block;
}
.tag-hours {
  cursor: pointer;
}
.day-label {
  cursor: pointer;
}
.add-row-form {
  border-top: 2px dashed var(--a-line);
  margin-top: 0.5rem;
  background: var(--a-thead);
}
.add-row-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--a-fg);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
</style>
<style>
.card-body {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.is-activity {
  cursor: pointer;
}
.is-total {
  background: var(--a-chip);
  text-transform: capitalize;
}
.auxiliar {
  color: var(--a-muted);
}
.projects-bars {
  margin-bottom: 2rem;
}
.projects-bars progress {
  margin-top: 1rem;
}
.view-button {
  margin-left: 0.5rem;
}
.export-button {
  margin-top: 1rem;
}
</style>
