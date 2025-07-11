<template>
  <div>
    <div class="table-view">
      <!-- <pre>{{ monthlyActivitiesTotal }}</pre> -->
      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="monthlyActivitiesTotal.length || justifications.length"
      >
        <div class="columns card-body">
          <div class="column is-4 has-text-weight-bold">Projecte</div>
          <div class="column is-2 has-text-weight-bold has-text-right">
            Import justificat
          </div>
          <div class="column is-2 has-text-weight-bold has-text-right">
            Import a justificar
          </div>
          <div class="column is-2 has-text-weight-bold has-text-right">%</div>
        </div>
        <div v-for="(row, i) in summaryByProjectAll" :key="i" class="card-body">
          <div class="columns">
            <div class="column is-4">{{ row.project }}</div>
            <div class="column is-2 has-text-right">
              <money-format
                :value="row.cost"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
            <div class="column is-2 has-text-right">
              <money-format
                :value="row.grantable_amount ? row.grantable_amount : 0"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
            <div class="column is-2 has-text-right">
              <money-format
                :value="
                  row.grantable_amount
                    ? (row.cost / row.grantable_amount) * 100
                    : 0
                "
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
                currency="%"
              >
              </money-format>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="columns">
            <div class="column is-4 has-text-weight-bold">TOTAL</div>
            <div class="column is-2 has-text-weight-bold has-text-right">
              <money-format
                :value="summaryAll"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
            <div class="column is-2 has-text-weight-bold has-text-right">
              <money-format
                :value="summaryAllGrantable"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
            <div class="column is-2 has-text-right"></div>
          </div>
        </div>
      </card-component>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="monthlyActivitiesTotal.length || justifications.length"
      >
        <div class="columns card-body">
          <div class="column is-4 has-text-weight-bold">Persona</div>
          <div class="column is-2 has-text-weight-bold has-text-right">
            Import Justificat
          </div>
        </div>
        <div
          v-for="(row, i) in summaryByUserAll"
          :key="i * 100"
          class="card-body"
        >
          <div class="columns">
            <div class="column is-4">{{ row.username }}</div>
            <div class="column is-2 has-text-right">
              <money-format
                :value="row.cost"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
          </div>
        </div>
      </card-component>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="monthlyActivitiesTotal.length || justifications.length"
      >
        <div class="columns card-body">
          <div class="column is-2 has-text-weight-bold">Persona</div>
          <div class="column is-2 has-text-weight-bold">Any</div>
          <div class="column is-2 has-text-weight-bold">Mes</div>
          <div class="column is-2 has-text-weight-bold has-text-right">
            Import Justificat
          </div>
          <div class="column is-2 has-text-weight-bold has-text-right">
            Bestreta
          </div>
          <div class="column is-2 has-text-weight-bold has-text-right">
            % Bestreta
          </div>
        </div>
        <div
          v-for="(row, i) in summaryByUserMonth"
          :key="i * 10000"
          class="card-body"
        >
          <div class="columns">
            <div class="column is-2">{{ row.username }}</div>
            <div class="column is-2">{{ row.year }}</div>
            <div class="column is-2">{{ row.month }}</div>
            <div class="column is-2 has-text-right">
              <money-format
                :value="row.cost"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
            <div class="column is-2 has-text-right">
              <money-format
                :value="
                  row.payroll && row.payroll.total ? row.payroll.total : 0
                "
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
              <b-icon
                v-if="!(row.payroll && row.payroll.total)"
                class="has-text-warning"
                icon="alert-circle"
                title="Sense bestreta pagada"
                size="is-small"
              >
              </b-icon>
            </div>
            <div class="column is-2 has-text-right">
              <money-format
                :value="
                  row.payroll && row.payroll.total
                    ? (row.cost / row.payroll.total) * 100
                    : 0
                "
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
                currency="%"
              >
              </money-format>
            </div>
          </div>
        </div>
      </card-component>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="monthlyActivitiesTotal.length || justifications.length"
      >
        <div class="columns card-body">
          <div class="column has-text-weight-bold">Mes</div>
          <div class="column has-text-weight-bold">Persona</div>
          <div class="column has-text-weight-bold">Projecte</div>
          <div class="column has-text-weight-bold has-text-right">
            Hores (€)
          </div>
          <div class="column has-text-weight-bold has-text-right">
            Hores (h)
          </div>
          <div class="column has-text-weight-bold has-text-right">
            Bestreta (€)
          </div>
          <div class="column has-text-weight-bold has-text-right">
            % Hores/Bestreta
          </div>
          <div class="column has-text-weight-bold has-text-right">Accions</div>
        </div>
        <div
          v-for="(row, i) in monthlyActivitiesTotal"
          :key="i * 1000000"
          class="card-body"
        >
          <div class="columns">
            <div class="column">
              {{ row.month }}
            </div>
            <div class="column">
              {{ row.username }}
            </div>
            <div class="column">
              {{ row.project }}
            </div>
            <div class="column has-text-right">
              <money-format
                :value="row.cost"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
            <div class="column has-text-right">
              <money-format
                :value="row.hours"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
                currency="h"
              >
              </money-format>
            </div>
            <div class="column has-text-right">
              <money-format
                :value="row.payroll"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
            <div class="column has-text-right">
              <money-format
                :value="
                  row.payroll && row.cost ? (100 * row.cost) / row.payroll : 0
                "
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
                currency="%"
              >
              </money-format>
            </div>
            <div class="column has-text-right"></div>
          </div>
        </div>
        <div
          v-for="(row, i) in justifications"
          :key="i * 100000000"
          class="card-body"
        >
          <div class="columns">
            <div class="column">
              {{ zeroPad(row.month, 2) }}
            </div>
            <div class="column">
              {{
                row.users_permissions_user
                  ? row.users_permissions_user.username
                  : ""
              }}
            </div>
            <div class="column">
              {{ row.project ? row.project.name : "" }}
            </div>
            <div class="column has-text-right">
              {{ row.quantity.toFixed(2) }} €
            </div>
            <div class="column has-text-right">
              {{
                row.dedication && row.dedication.costByHour
                  ? (row.quantity / row.dedication.costByHour).toFixed(2)
                  : 0
              }}
            </div>
            <div class="column has-text-right">
              {{ row.payroll ? row.payroll.total.toFixed(2) : "0" }} €
            </div>
            <div class="column has-text-right">
              {{
                row.payroll &&
                row.payroll.total &&
                row.dedication &&
                row.dedication.costByHour
                  ? ((100 * row.quantity) / row.payroll.total).toFixed(2)
                  : ""
              }}
              %
            </div>
            <div class="column has-text-right">
              <b-button
                @click="deleteJustification(row)"
                title="Esborrar"
                class="view-button"
                type="is-danger"
                icon-left="trash-can"
              />
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="columns">
            <div class="column">
              <b-select v-model="justification.month">
                <option v-for="m in 12" :key="m" :value="m">
                  {{ zeroPad(m, 2) }}
                </option>
              </b-select>
            </div>
            <div class="column">
              <b-select v-model="justification.users_permissions_user">
                <option v-for="u in users" :key="u.id" :value="u">
                  {{ u.username }}
                </option>
              </b-select>
            </div>
            <div class="column">
              <b-select v-model="justification.project">
                <option v-for="u in projects" :key="u.id" :value="u">
                  {{ u.name }}
                </option>
              </b-select>
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

moment.locale("ca");

export default {
  name: "Justification",
  components: { CardComponent, MoneyFormat },
  props: {
    type: {
      type: String,
      default: null
    },
    year: {
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
      justifications: [],
      dedications: [],
      theYear: 0
    };
  },
  computed: {
    ...mapState(["userName", "user"]),
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
      const activities = [];
      if (this.type === "Reals") {
        this.projects.forEach(p => {
          p.activities
            .filter(
              a =>
                !this.theYear || this.theYear.toString() ===
                moment(a.date, "YYYY-MM-DD").format("YYYY")
            )
            .forEach(a => {
              const activity = {
                ...a,
                project: a.project,
                project_name: p.name,
                grantable_amount: p.grantable_amount,
                users_permissions_user: a.users_permissions_user,
                year: moment(a.date, "YYYY-MM-DD").format("YYYY"),
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
          const activity = {
            ...t,
            project: t.project,
            project_name: t.project_name,
            grantable_amount: this.projects.find(p => p.id == t.project)
              .grantable_amount,
            users_permissions_user: t.userId,
            year: moment(t.day, "YYYY-MM-DD").format("YYYY"),
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
              p.users_permissions_user.id.toString() ===
                rows[0].users_permissions_user.toString() &&
              parseInt(p.year.year) === parseInt(rows[0].year) &&
              parseInt(p.month.month) === parseInt(rows[0].month)
          );
          return {
            ym: id,
            cost: _.sumBy(rows, r => r.hours * r.cost_by_hour),
            hours: _.sumBy(rows, "hours"),
            year: rows[0].year,
            month: rows[0].month,
            users_permissions_user: rows[0].users_permissions_user,
            username: this.users.find(
              u => u.id === rows[0].users_permissions_user
            ).username,
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
      const activities = _(this.justifications)
        .groupBy("project.name")
        .map((rows, id) => {
          return {
            project: id,
            cost: _.sumBy(rows, r => r.quantity)
          };
        })
        .value();
      return activities;
    },
    summaryByProjectAll() {
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
    summaryAll() {
      return _.sumBy(this.summaryByProjectAll, "cost");
    },
    summaryAllGrantable() {
      return _.sumBy(this.summaryByProjectAll, "grantable_amount");
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
      const activities = _(this.justifications)
        .groupBy("users_permissions_user.username")
        .map((rows, id) => {
          return {
            username: id,
            cost: _.sumBy(rows, "quantity")
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
      // return activities
      const activities2 = _(this.justifications)
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
                parseInt(p.year.year) === parseInt(this.year) &&
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
      const justifications = this.justifications.map(
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
            payroll: payroll?.total,
            username: row.users_permissions_user.username,
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
        this.justification.users_permissions_user &&
        this.justification.project &&
        this.justification.quantity &&
        parseInt(this.justification.quantity) > 0
      );
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
    }
  },
  mounted() {
    this.getActivities();
  },
  methods: {
    async getActivities() {
      this.isLoading = true;

      if (!this.year) {
        return;
      }

      this.months = {};
      this.payrolls = [];

      console.log("Getting activities for year", this.theYear);

      const from = this.theYear
        ? moment(this.theYear, "YYYY")
            .startOf("year")
            .format("YYYY-MM-DD")
        : moment()
            .add(-20, "year")
            .startOf("year")
            .format("YYYY-MM-DD");
      const to = this.theYear
        ? moment(this.theYear, "YYYY")
            .endOf("year")
            .format("YYYY-MM-DD")
        : moment()
            .add(10, "year")
            .endOf("year")
            .format("YYYY-MM-DD");

      let query = `payrolls?_where[paid_date_gte]=${from}&[paid_date_lte]=${to}&_limit=-1`;
      let query2 = `projects?_where[grantable_eq]=true&_limit=-1`;

      this.payrolls = (await service({ requiresAuth: true }).get(query)).data;

      this.projects = (await service({ requiresAuth: true }).get(query2)).data;

      if (this.type !== "Reals") {
        this.estimatedTotals = (
          await service({ requiresAuth: true }).get(
            this.theYear
              ? `projects/estimated-totals?_where[grantable_eq]=true&_limit=-1&year=${this.theYear}`
              : `projects/estimated-totals?_where[grantable_eq]=true&_limit=-1`
          )
        ).data;
      }

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

      for (const just of justifications) {
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
      this.justification.year = this.year;
      await service({ requiresAuth: true }).post(
        `justifications`,
        this.justification
      );
      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false
      });
      this.justification = {};
      this.getActivities();
    },
    excelFormat(value) {
      return format(this.user, value);
    }
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
</style>
