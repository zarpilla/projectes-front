<template>
  <div>
    <div class="table-view">
      <!-- <div class="info-help mb-4">
        <b-icon icon="information" size="is-small" />
        Desplega les seccions que vulguis consultar
      </div> -->

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
            <money-format
              :value="props.row.grantable_amount ? props.row.grantable_amount : 0"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value="false"
              :hide-subunits="false"
            />
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

          <b-table-column label="Pendent" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.grantable_amount - a.cost) - (b.grantable_amount - b.cost)">
            <money-format
              :value="props.row.grantable_amount ? props.row.grantable_amount - props.row.cost : -props.row.cost"
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
                <div class="column is-3">TOTAL</div>
                <div class="column is-2 has-text-right">
                  <money-format
                    :value="summaryAllGrantable"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  />
                </div>
                <div class="column is-2 has-text-right">
                  <money-format
                    :value="summaryAll"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  />
                </div>
                <div class="column is-2 has-text-right">
                  <money-format
                    :value="summaryAllGrantable - summaryAll"
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
            {{ props.row.quantity.toFixed(2) }} €
          </b-table-column>

          <b-table-column label="Hores (h)" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.dedication && a.dedication.costByHour ? a.quantity / a.dedication.costByHour : 0) - (b.dedication && b.dedication.costByHour ? b.quantity / b.dedication.costByHour : 0)">
            {{ props.row.dedication && props.row.dedication.costByHour ? (props.row.quantity / props.row.dedication.costByHour).toFixed(2) : 0 }}
          </b-table-column>

          <b-table-column label="Bestreta (€)" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.payroll ? a.payroll.total : 0) - (b.payroll ? b.payroll.total : 0)">
            {{ props.row.payroll ? props.row.payroll.total.toFixed(2) : "0" }} €
          </b-table-column>

          <b-table-column label="% Hores/Bestreta" sortable numeric v-slot="props" header-class="has-text-right" cell-class="has-text-right" :custom-sort="(a, b) => (a.payroll && a.payroll.total ? (100 * a.quantity) / a.payroll.total : 0) - (b.payroll && b.payroll.total ? (100 * b.quantity) / b.payroll.total : 0)">
            <span v-if="props.row.payroll && props.row.payroll.total">
              {{ ((100 * props.row.quantity) / props.row.payroll.total).toFixed(2) }} %
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
        <div class="card-body">
          <div class="columns">
            <div class="column">
              <b-select v-model="justification.year">
                <option
                  v-for="y in 5"
                  :key="'year-' + y"
                  :value="(new Date().getFullYear() - y + 1).toString()"
                >
                  {{ new Date().getFullYear() - y + 1 }}
                </option>
              </b-select>
            </div>
            <div class="column">
              <b-select v-model="justification.month">
                <option v-for="m in 12" :key="'month-' + m" :value="m">
                  {{ zeroPad(m, 2) }}
                </option>
              </b-select>
            </div>
            <div class="column">
              <b-autocomplete
                v-model="userSearch"
                placeholder="Selecciona una persona..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsers"
                field="username"
                @select="option => onUserSelect(option)"
                :clearable="true"
              >
              </b-autocomplete>
            </div>
            <div class="column">
              <b-autocomplete
                v-model="projectSearch2"
                placeholder="Selecciona un projecte..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProjects2"
                field="name"
                @select="option => onProjectSelect2(option)"
                :clearable="true"
              >
              </b-autocomplete>
            </div>
            <div class="column has-text-right">
              <b-input v-model="justification.quantity" />
            </div>
            <div class="column has-text-right"></div>
            <div class="column has-text-right"></div>
            <div class="column has-text-right"></div>
            <div class="column has-text-right">
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

          <download-excel class="export" :data="pivotData">
            <b-button
              title="Exporta dades"
              class="export-button mt-0"
              icon-left="file-excel"
            />
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
        <div class="card-body">
          <div class="columns">
            <div class="column">
              <b-select v-model="justificationInvoice.year">
                <option
                  v-for="y in 5"
                  :key="'year-' + y"
                  :value="(new Date().getFullYear() - y + 1).toString()"
                >
                  {{ new Date().getFullYear() - y + 1 }}
                </option>
              </b-select>
            </div>
            <div class="column">
              <b-autocomplete
                v-model="projectSearch"
                placeholder="Selecciona un projecte..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProjects"
                field="name"
                @select="option => onProjectSelect(option)"
                :clearable="true"
              >
              </b-autocomplete>
            </div>
            <div class="column">
              <b-autocomplete
                v-model="invoiceSearch"
                placeholder="Selecciona una factura..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredInvoices"
                field="code"
                @select="option => onEmittedInvoiceSelect(option)"
                :clearable="true"
              >
                <template slot-scope="props">
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
            <div class="column has-text-right">
              <b-input v-model="justificationInvoice.quantity" />
            </div>
            <div class="column has-text-right">
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

      <download-excel
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
        name="justificacions"
      >
        <b-button
          title="Exporta dades"
          class="export-button mt-0"
          icon-left="file-excel"
        />
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
import CardComponent from "@/components/CardComponent";
import _ from "lodash";
import { format } from "@/helpers/excelFormatter";
import { mapState } from "vuex";
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
      justification: {},
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
      invoices: [],
      invoiceSearch: "",
      projectSearch: "",
      projectSearch2: "",
      userSearch: "",
      pivotIdentifier: "justification-pivot"
    };
  },
  computed: {
    ...mapState(["userName", "user"]),
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
            .filter(
              a =>
                !this.theYear ||
                this.theYear.toString() ===
                  moment(a.date, "YYYY-MM-DD").format("YYYY")
            )
            .forEach(a => {
              const activityYear = moment(a.date, "YYYY-MM-DD").format("YYYY");
              const activity = {
                ...a,
                project: a.project,
                project_name: p.name,
                grantable_amount: this.getGrantableAmountForYear(
                  p,
                  activityYear,
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
        this.estimatedTotals.forEach(t => {
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
              activityYear,
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
            grantable_amount: rows[0].grantable_amount
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
          const year = rows[0].year;
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
      const projectsWithGrantableInvoices = this.projects
        .filter(project => {
          // Check if any year has grantable_structural_expenses_justify_invoices > 0
          const totalGrantable = this.getTotalGrantableAmount(
            project,
            "grantable_structural_expenses_justify_invoices"
          );
          console.log(`Project ${project.name}:`, {
            grantable_years: project.grantable_years,
            grantable_years_details: project.grantable_years.map(gy => ({
              year: typeof gy.year === "object" ? gy.year.year : gy.year,
              grantable_structural_expenses_justify_invoices:
                gy.grantable_structural_expenses_justify_invoices,
              allFields: Object.keys(gy)
            })),
            totalGrantable,
            hasGrantableInvoices: totalGrantable > 0
          });
          return totalGrantable > 0;
        })
        .map(project => ({
          project: project.name,
          cost: 0, // Default to 0 if no justifications yet
          grantable_amount: this.getTotalGrantableAmount(
            project,
            "grantable_structural_expenses_justify_invoices"
          )
        }));
      console.log(
        "projectsWithGrantableInvoices",
        projectsWithGrantableInvoices
      );
      console.log("invoiceJustifications", invoiceJustifications);
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
        const projectsWithGrantable = this.projects.map(project => {
          return {
            project: project.name,
            cost: 0, // Will be filled from justifications
            grantable_amount: this.getTotalGrantableAmount(project, "grantable_amount")
          };
        });
        
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
            grantable_amount: rows[0].grantable_amount
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
    addJustificationEnabled() {
      return (
        this.justification.month &&
        this.justification.year &&
        this.justification.users_permissions_user &&
        this.justification.project &&
        this.justification.quantity &&
        parseInt(this.justification.quantity) !== 0
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
          option.code
            .toString()
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
    // Helper function to get grantable amount for a specific year and field
    getGrantableAmountForYear(project, year, field = "grantable_amount") {
      if (
        !project ||
        !project.grantable_years ||
        !project.grantable_years.length
      ) {
        // Fallback to old structure if grantable_years not available
        return project[field] || 0;
      }

      // Find the grantable year data for the specified year
      const grantableYear = project.grantable_years.find(gy => {
        // Handle both cases: year as object or year as ID
        const gyYear = typeof gy.year === "object" ? gy.year.year : gy.year;
        return gyYear.toString() === year.toString();
      });

      return grantableYear ? grantableYear[field] || 0 : 0;
    },

    // Helper function to get total grantable amount for all years
    getTotalGrantableAmount(project, field = "grantable_amount") {
      if (
        !project ||
        !project.grantable_years ||
        !project.grantable_years.length
      ) {
        // Fallback to old structure
        return project[field] || 0;
      }

      return project.grantable_years.reduce((total, gy) => {
        return total + (gy[field] || 0);
      }, 0);
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

      const from = this.theYear
        ? moment(this.theYear, "YYYY")
            .startOf("year")
            .format("YYYY")
        : moment()
            .add(-20, "year")
            .startOf("year")
            .format("YYYY");
      const to = this.theYear
        ? moment(this.theYear, "YYYY")
            .endOf("year")
            .format("YYYY")
        : moment()
            .add(10, "year")
            .endOf("year")
            .format("YYYY");

      const years = (
        await service({ requiresAuth: true }).get("years?_limit=-1")
      ).data;

      const yearFrom = years.find(y => parseInt(y.year) === parseInt(from));

      let query = this.theYear
        ? `payrolls?_where[year]=${yearFrom.id}&_limit=-1`
        : `payrolls?_limit=-1`;
      
      // Build projects query with grantable and project_state filters
      const projectState = this.projectState !== null ? this.projectState : 0;
      let query2 = `projects?_where[grantable_eq]=true`;
      if (projectState !== 0 && projectState !== '0') {
        query2 += `&_where[project_state_eq]=${projectState}`;
      }
      query2 += `&_limit=-1`;

      this.payrolls = (await service({ requiresAuth: true }).get(query)).data;

      // Get projects with grantable_years populated
      this.projects = (await service({ requiresAuth: true }).get(query2)).data;
      
      // Load estimated-totals only for "Previstes" type, not for "Manuals previstes" or "Reals"
      if (this.type === "Previstes") {
        this.estimatedTotals = (
          await service({ requiresAuth: true }).get(
            this.theYear
              ? `projects/estimated-totals?_where[grantable_eq]=true&_limit=-1&year=${this.theYear}`
              : `projects/estimated-totals?_where[grantable_eq]=true&_limit=-1`
          )
        ).data;
      } else {
        // Clear estimated totals when viewing "Reals" or "Manuals previstes"
        this.estimatedTotals = [];
      }
      
      // Load justifications for both Reals and Previstes views
      const justifications = (
        await service({ requiresAuth: true }).get(
          this.theYear
            ? `justifications?year=${this.theYear}&_limit=-1`
            : `justifications?_limit=-1`
        )
      ).data;

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
      if (dataToSubmit.quantity) {
        // Convert to string, replace comma with dot, then parse as float
        const quantityStr = dataToSubmit.quantity.toString().replace(",", ".");
        dataToSubmit.quantity = parseFloat(quantityStr);
      }
      // Set justification_type based on current view
      dataToSubmit.justification_type = this.justificationTypeEnum;
      
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
      this.justification = {};
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
  filters: {
    formatDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).fromNow();
    },
    formatDMYDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("dddd DD/MM/YYYY");
    },
    formatTitle(val) {
      if (!val) {
        return "-";
      }
      return (
        moment(val).format("dddd DD/MM/YYYY") +
        " (" +
        moment(val).fromNow() +
        ")"
      );
    }
  }
};
</script>
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
</style>
<style>
.card-body {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}
.card-header-title {
  text-transform: capitalize;
}
.is-activity {
  cursor: pointer;
}
.is-total {
  background: #eee;
  text-transform: capitalize;
}
.auxiliar {
  color: #999;
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
