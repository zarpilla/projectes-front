<template>
  <div>
    <div class="table-view">
      <b-loading
        :is-full-page="true"
        v-if="user"
        v-model="isLoading"
        :can-cancel="false"
      ></b-loading>

      <div class="alert" v-if="warn">
        <b-icon icon="alert-circle"></b-icon>
        Atenció, abans de consultar les nòmines cal definir la
        <a href="/stats/#/working-day" target="_blank">jornada laboral</a> de
        tot l'any.
      </div>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="!isLoading && !warn"
      >
        <div class="columns card-body">
          <div class="column has-text-weight-bold">Tipus</div>
          <div class="column has-text-weight-bold has-text-right">Hores</div>
          <div class="column has-text-weight-bold has-text-right"></div>
        </div>
        <div v-for="(value, key) in summary" v-bind:key="key" class="card-body">
          <div class="columns">
            <div class="column">
              {{ key }}
            </div>
            <div class="column has-text-right">{{ value }} h</div>
            <div class="column has-text-right"></div>
          </div>
        </div>
        <div class="card-body">
          <div class="columns">
            <div class="column">
              Salari total
            </div>
            <div class="column has-text-right">
              <money-format
                :value="xsalary"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
            <div class="column"></div>
          </div>
        </div>
      </card-component>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="!isLoading"
      >
        <div class="columns card-body">
          <div class="column has-text-weight-bold">Mes</div>
          <!-- <div class="column has-text-weight-bold">Obj</div> -->
          <div class="column has-text-weight-bold">Treballades</div>
          <div class="column has-text-weight-bold">Teòriques</div>
          <div class="column has-text-weight-bold">Saldo</div>
          <div class="column has-text-weight-bold">Saldo Acumulat</div>
          <div class="column has-text-weight-bold">Salari</div>
          <div class="column has-text-weight-bold">Nòmina</div>
        </div>
        <div v-for="(value, key) in months" v-bind:key="key" class="card-body">
          <div class="columns">
            <div class="column">
              {{ key }}
            </div>
            <!-- <div class="column">
              {{ value }}
            </div> -->
            <div class="column">{{ value.worked.toFixed(2) }} h</div>
            <div class="column">{{ value.theoricHours.toFixed(2) }} h</div>
            <div class="column">{{ value.balance.toFixed(2) }} h</div>
            <div class="column">{{ value.balanceTotal.toFixed(2) }} h</div>
            <div class="column">
              <span>
                {{ (value.dailySalary / value.theoricDays).toFixed(2) }} €
                <span
                  v-if="
                    hasPayroll(key) &&
                      (value.dailySalary / value.theoricDays).toFixed(2) !==
                        hasPayroll(key).total_base.toFixed(2)
                  "
                >
                  (Teòric)
                </span>
              </span>
              <br
                v-if="
                  hasPayroll(key) &&
                    (value.dailySalary / value.theoricDays).toFixed(2) !==
                      hasPayroll(key).total_base.toFixed(2)
                "
              />
              <span
                class="has-text-danger"
                v-if="
                  hasPayroll(key) &&
                    (value.dailySalary / value.theoricDays).toFixed(2) !==
                      hasPayroll(key).total_base.toFixed(2)
                "
              >
                {{ hasPayroll(key).total_base.toFixed(2) }} € (Nòmina)
              </span>
            </div>
            <div class="column">
              <div class="is-flex">
                <b-button
                  v-if="!hasPayroll(key)"
                  @click="
                    createPayroll(
                      key,
                      (value.dailySalary / value.theoricDays).toFixed(2)
                    )
                  "
                  class="is-warning"
                  icon="edit"
                  >Crear</b-button
                >
                <b-button
                  v-if="hasPayroll(key) && !payrollDetail(key).paid"
                  @click="
                    payPayroll(
                      key,
                      (value.dailySalary / value.theoricDays).toFixed(2)
                    )
                  "
                  class="is-primary mr-3"
                  icon="edit"
                  >Pagar</b-button
                >
                <b-button
                  v-if="hasPayroll(key)"
                  @click="
                    deletePayroll(
                      key,
                      (value.dailySalary / value.theoricDays).toFixed(2) !==
                        hasPayroll(key).total_base.toFixed(2)
                    )
                  "
                  class="is-danger mr-3"
                >
                  <b-icon icon="trash-can" size="is-small" />
                </b-button>
                <b-button
                  v-if="hasPayroll(key)"
                  @click="viewPayroll(key)"
                  class="is-primary mr-3"
                >
                  <b-icon icon="eye" size="is-small" />
                </b-button>
              </div>
            </div>
          </div>
        </div>
      </card-component>
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
import MoneyFormat from "@/components/MoneyFormat.vue";

moment.locale("ca");

export default {
  name: "DedicationSalary",
  components: { CardComponent, MoneyFormat },
  props: {
    user: {
      type: Number,
      default: null
    },
    year: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      activities: [],
      isLoading: false,
      distinctDays: [],
      distinctDaysObj: [],
      distinctTotals: [],
      distinctUsers: [],
      distinctUsersObj: [],
      hoursTotal: 0,
      dailyDedications: [],
      dates: [],
      summary: {},
      months: {},
      monthsDb: [],
      yearsDb: [],
      payrolls: [],
      warn: false
    };
  },
  computed: {
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    },
    superTotal() {
      return sumBy(this.activities, "hours");
    },
    xsalary() {
      const sal = [];
      for (var i in this.months) {
        const m = this.months[i];
        sal.push(m);
      }
      return sumBy(sal, s => s.dailySalary / s.theoricDays);
    }
  },
  watch: {
    user: function(newVal, oldVal) {
      this.getActivities();
    },
    year: function(newVal, oldVal) {
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

      const from = moment(this.year, "YYYY")
        .startOf("year")
        .format("YYYY-MM-DD");
      const to = moment(this.year, "YYYY")
        .endOf("year")
        .format("YYYY-MM-DD");

      let query = `activities/total-by-day?_where[date_gte]=${from}&_where[date_lte]=${to}`;
      if (this.user) {
        query = `${query}&_where[users_permissions_user.id]=${this.user}`;
      } else {
        return;
      }

      query = `${query}&_limit=-1`;

      // service({ requiresAuth: true })
      //   .get(`payrolls?_limit=-1&_where[users_permissions_user.id]=${this.user}`)
      //   .then((r) => {
      //     this.payrolls = r.data
      // })
      await this.updatePayrolls();

      if (this.monthsDb.length === 0) {
        this.monthsDb = (
          await service({ requiresAuth: true, cached: true }).get("months")
        ).data;
      }
      if (this.yearsDb.length === 0) {
        this.yearsDb = (
          await service({ requiresAuth: true, cached: true }).get("years")
        ).data;
      }

      service({ requiresAuth: true })
        .get(query)
        .then(async r => {
          this.activities = r.data;

          const festives = (
            await service({ requiresAuth: true }).get("festives?_limit=-1")
          ).data.filter(
            f =>
              f.users_permissions_user === null ||
              f.users_permissions_user.id === this.user
          );

          this.warn = false;

          service({ requiresAuth: true })
            .get(
              `daily-dedications?_limit=-1&_where[users_permissions_user.id]=${this.user}`
            )
            .then(r => {
              this.dailyDedications = r.data;
              var allDates = this.enumerateDaysBetweenDates();
              var balance = 0;
              var balanceToday = 0;
              var balanceTotal = 0;
              var totalWorkedHours = 0;
              var dates = [];
              var laborableDays = 0;
              var salary = 0;
              var theoricHoursTotal = 0;
              allDates.forEach(d => {
                // console.log('date', d)
                const date = moment(d).format("YYYY-MM-DD");
                const displayDate = moment(d).format("ddd DD-MM-YYYY");
                const day = moment(d).day();
                const week = moment(d).week();
                const month = moment(d).format("M");
                const dailyDedication = this.dailyDedications.find(
                  dd => date >= dd.from && date <= dd.to
                );

                if (!dailyDedication) {
                  this.warn = true;
                  console.warn("date!", date);
                }
                const activities = this.activities.filter(a => a.date === date);
                const festive = festives.find(f => f.date === date);

                const startOnMondayDay = day === 0 ? 6 : day - 1;

                const theoricHours =
                  (!festive ||
                    (festive &&
                      festive.users_permissions_user &&
                      festive.users_permissions_user.id)) &&
                  dailyDedication &&
                  day !== 0 &&
                  day !== 6                  
                    ? dailyDedication.hours
                    : 0;

                const workedHours =
                  sumBy(activities, "hours") +
                  (festive &&
                  festive.users_permissions_user &&
                  festive.users_permissions_user.id
                    ? theoricHours
                    : 0);
                const dateDescription = festive
                  ? festive.festive_type
                    ? festive.festive_type.name
                    : "FESTIU"
                  : "";

                theoricHoursTotal += theoricHours;
                if (!this.months[month]) {
                  this.months[month] = {
                    theoricHours: 0,
                    theoricDays: 0,
                    worked: 0,
                    balance: 0,
                    balanceTotal: 0,
                    theoricRatio: 0,
                    dailySalary: 0
                  };
                }
                this.months[month].theoricHours += theoricHours;

                if (
                  (!festive ||
                    (festive &&
                      festive.users_permissions_user &&
                      festive.users_permissions_user.id)) &&
                  dailyDedication &&
                  day !== 0 &&
                  day !== 6
                ) {
                  laborableDays++;
                  this.months[month].theoricDays += 1;
                }
                // this.months[month].theoricDays += 1

                this.months[month].theoricRatio =
                  this.months[month].theoricHours /
                  this.months[month].theoricDays /
                  8;
                this.months[month].dailySalary =
                  (dailyDedication ? dailyDedication.monthly_salary : 0) *
                  this.months[month].theoricRatio *
                  this.months[month].theoricDays;

                this.months[month].worked += workedHours;
                this.months[month].balance =
                  this.months[month].worked - this.months[month].theoricHours;
                // this.months[month].balanceTotal = month > 1 ? this.months[month - 1].balance + this.months[month].worked - this.months[month].theoricHours : this.months[month].worked - this.months[month].theoricHours

                totalWorkedHours += workedHours;
                balance += workedHours - theoricHours;
                if (moment(d).isBefore(moment())) {
                  balanceToday += workedHours - theoricHours;
                }
                dates.push({
                  date: displayDate,
                  dateDescription: dateDescription,
                  week: week,
                  theoricHours: theoricHours,
                  workedHours: workedHours,
                  totalWorkedHours: totalWorkedHours,
                  balance: balance,
                  balanceTotal: balanceTotal,
                  balanceToday: balanceToday,
                  costByHour: dailyDedication ? dailyDedication.costByHour : 0,
                  costByDay: dailyDedication
                    ? dailyDedication.costByHour * workedHours
                    : 0,
                  error: dailyDedication === null
                });
                if (dailyDedication) {
                  salary += dailyDedication.costByHour * workedHours;
                }
              });
              this.dates = dates.reverse();
              for (var m in this.months) {
                if (parseInt(m) === 1) {
                  this.months[m].balanceTotal += this.months[m].balance;
                } else {
                  this.months[m].balanceTotal +=
                    this.months[parseInt(m) - 1].balanceTotal +
                    this.months[m].balance;
                }
              }
              this.summary[
                "Total hores anuals laborables teòriques"
              ] = theoricHoursTotal.toFixed(2);
              this.summary[
                "Total hores treballades"
              ] = this.dates[0].totalWorkedHours.toFixed(2);
              this.summary["Saldo hores anual"] = this.dates[0].balance.toFixed(
                2
              );
              this.summary[
                "Saldo hores avui"
              ] = this.dates[0].balanceToday.toFixed(2);
              this.isLoading = false;
            });
        });
    },
    enumerateDaysBetweenDates() {
      var dates = [];
      var currDate = moment(this.year, "YYYY").startOf("year");
      const endOfYear = moment(this.year, "YYYY").endOf("year");
      // var lastDate =
      //   endOfYear.diff(moment()) < 0
      //     ? moment(this.year, "YYYY").endOf("year")
      //     : moment().endOf("year");
      // var lastDate = moment()
      dates.push(currDate.clone().toDate());
      while (currDate.add(1, "days").diff(endOfYear) < 0) {
        dates.push(currDate.clone().toDate());
      }
      return dates;
    },
    hasPayroll(month) {
      const m = this.monthsDb.find(m => m.month === parseInt(month));
      const y = this.yearsDb.find(y => y.year === parseInt(this.year));
      const payroll = this.payrolls.find(
        p =>
          p.year.id === y.id &&
          p.month.id === m.id &&
          p.users_permissions_user.id === this.user
      );
      return payroll;
    },
    payrollDetail(month) {
      const m = this.monthsDb.find(m => m.month === parseInt(month));
      const y = this.yearsDb.find(y => y.year === parseInt(this.year));
      const payroll = this.payrolls.find(
        p =>
          p.year.id === y.id &&
          p.month.id === m.id &&
          p.users_permissions_user.id === this.user
      );
      return payroll;
    },
    async createPayroll(month, total) {
      const m = this.monthsDb.find(m => m.month === parseInt(month));
      const y = this.yearsDb.find(y => y.year === parseInt(this.year));

      const emitted = moment(`${y.year}-${m.month}-01`, "YYYY-MM-DD")
        .endOf("month")
        .format("YYYY-MM-DD");

      const dailyDedication = this.dailyDedications.find(
        dd => emitted >= dd.from && emitted <= dd.to
      );

      const payroll = {
        month: m.id,
        year: y.id,
        users_permissions_user: this.user,
        total_base: total,
        total: total,
        total_irpf: 0,
        total_vat: 0,
        paid: false,
        emitted: emitted,
        net_base: 0,
        net_date: emitted,
        ss_base: dailyDedication.pct_quota
          ? (total * dailyDedication.pct_quota) / 100
          : dailyDedication.quota,
        ss_date: moment(`${y.year}-${m.month}-01`, "YYYY-MM-DD")
          .add(1, "month")
          .endOf("month")
          .format("YYYY-MM-DD"), // mes següent vençut
        irpf_base: dailyDedication.pct_irpf
          ? (total * dailyDedication.pct_irpf) / 100
          : 0,
        irpf_date: moment(`${y.year}-${m.month}-01`, "YYYY-MM-DD")
          .endOf("quarter")
          .add(20, "day")
          .format("YYYY-MM-DD"),
        other_base: dailyDedication.pct_other
          ? (total * dailyDedication.pct_other) / 100
          : 0,
        other_date: moment(`${y.year}-${m.month}-01`, "YYYY-MM-DD")
          .add(1, "month")
          .endOf("month")
          .format("YYYY-MM-DD")
      };

      payroll.net_base =
        parseFloat(payroll.total) -
        parseFloat(payroll.irpf_base) -
        parseFloat(payroll.other_base);
      payroll.total =
        parseFloat(payroll.total) + parseFloat(payroll.ss_base || 0);

      await service({ requiresAuth: true }).post("payrolls", payroll);

      await this.updatePayrolls();
    },
    async viewPayroll(month) {
      if (month) {
        const m = this.monthsDb.find(m => m.month === parseInt(month));
        const y = this.yearsDb.find(y => y.year === parseInt(this.year));
        const payroll = this.payrolls.find(
          p =>
            p.year.id === y.id &&
            p.month.id === m.id &&
            p.users_permissions_user.id === this.user
        );
        let routeData = this.$router.resolve({
          name: "document.edit",
          params: { id: payroll.id, type: "payrolls" }
        });
        window.open(routeData.href, "_blank");
      }
    },
    async payPayroll(month, total) {
      const m = this.monthsDb.find(m => m.month === parseInt(month));
      const y = this.yearsDb.find(y => y.year === parseInt(this.year));
      const payroll = this.payrolls.find(
        p =>
          p.year.id === y.id &&
          p.month.id === m.id &&
          p.users_permissions_user.id === this.user
      );
      await service({ requiresAuth: true }).put(`payrolls/${payroll.id}`, {
        paid: true,
        paid_date: payroll.emitted
      });
      await this.updatePayrolls();
    },
    async deletePayroll(month, warn) {
      if (warn) {
        this.$buefy.dialog.confirm({
          message:
            "La nòmina es va modificar manualment. Estàs segura d'esborrar-la?",
          onConfirm: () => this.proceedDeletePayroll(month),
          onCancel: () => {
            return false;
          }
        });
      } else {
        this.proceedDeletePayroll(month);
      }
    },

    async proceedDeletePayroll(month) {
      const m = this.monthsDb.find(m => m.month === parseInt(month));
      const y = this.yearsDb.find(y => y.year === parseInt(this.year));
      const payroll = this.payrolls.find(
        p =>
          p.year.id === y.id &&
          p.month.id === m.id &&
          p.users_permissions_user.id === this.user
      );

      await service({ requiresAuth: true }).delete(`payrolls/${payroll.id}`);
      await this.updatePayrolls();
    },

    async updatePayrolls() {
      this.payrolls = (
        await service({ requiresAuth: true }).get(
          `payrolls?_limit=-1&_where[users_permissions_user.id]=${this.user}`
        )
      ).data;
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
