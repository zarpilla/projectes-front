<template>
  <!-- Redesign A: the year's figures as KPIs, then a month table with the payroll
       state and its actions -->
  <div class="salary-view">
    <b-loading
      :is-full-page="true"
      v-if="user"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <div class="notification is-warning is-light" v-if="warn">
      Abans de consultar les nòmines cal definir la
      <router-link to="/working-day">jornada laboral</router-link> de tot l'any.
    </div>

    <div v-if="!isLoading && !warn" class="doc-kpis">
      <div v-for="(value, key) in summary" :key="key" class="doc-kpi">
        <span>{{ key }}</span>
        <b>{{ hours(value, /saldo/i.test(key)) }}</b>
      </div>
      <div class="doc-kpi">
        <span>Salari total</span>
        <b>{{ salary(xsalary) }}</b>
      </div>
    </div>

    <!-- without the working day there is nothing to pay yet (issues/128) -->
    <section v-if="!isLoading && !warn" class="a-box list-box">
      <header class="box-head">
        <h2>Nòmines per mes</h2>
        <span class="box-hint">Hores treballades i teòriques, saldo i salari de cada mes</span>
      </header>
      <div class="table-wrap">
        <table class="table is-fullwidth salary-table">
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col" class="has-text-right">Treballades</th>
              <th scope="col" class="has-text-right">Teòriques</th>
              <th scope="col" class="has-text-right">Saldo</th>
              <th scope="col" class="has-text-right">Saldo acumulat</th>
              <th scope="col" class="has-text-right">Salari</th>
              <th scope="col">Nòmina</th>
              <th scope="col"><span class="is-sr-only">Accions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(value, key) in months" :key="key">
              <th scope="row" class="month-name">{{ monthName(key) }}</th>
              <td class="has-text-right">{{ hours(value.worked) }}</td>
              <td class="has-text-right">{{ hours(value.theoricHours) }}</td>
              <td class="has-text-right" :class="'has-text-' + sign(value.balance)">{{ hours(value.balance, true) }}</td>
              <td class="has-text-right" :class="'has-text-' + sign(value.balanceTotal)">{{ hours(value.balanceTotal, true) }}</td>
              <td class="has-text-right">
                {{ salary(value.dailySalary / value.theoricDays) }}
                <template v-if="payrollDiffers(key, value)">
                  <small class="has-text-muted"> teòric</small>
                  <br />
                  <span class="has-text-danger">{{ salary(hasPayroll(key).total_base) }} <small>a la nòmina</small></span>
                </template>
              </td>
              <td>
                <span v-if="!hasPayroll(key)" class="tag">Sense nòmina</span>
                <span v-else-if="payrollDetail(key).paid" class="tag is-success is-light">Pagada</span>
                <span v-else class="tag is-warning is-light">Per pagar</span>
              </td>
              <td>
                <div class="row-actions">
                  <b-button
                    v-if="!hasPayroll(key)"
                    size="is-small"
                    type="is-primary"
                    icon-left="plus"
                    @click="createPayroll(key, (value.dailySalary / value.theoricDays).toFixed(2))"
                  >Crea</b-button>
                  <b-button
                    v-if="hasPayroll(key) && !payrollDetail(key).paid"
                    size="is-small"
                    type="is-primary"
                    @click="payPayroll(key, (value.dailySalary / value.theoricDays).toFixed(2))"
                  >Paga</b-button>
                  <b-button
                    v-if="hasPayroll(key)"
                    size="is-small"
                    icon-left="eye"
                    title="Mostra la nòmina"
                    aria-label="Mostra la nòmina"
                    @click="viewPayroll(key)"
                  />
                  <b-button
                    v-if="hasPayroll(key)"
                    size="is-small"
                    icon-left="trash-can"
                    title="Esborra la nòmina"
                    aria-label="Esborra la nòmina"
                    @click="deletePayroll(key, payrollDiffers(key, value))"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import service from "@/service/index";
// import uniq from 'lodash/uniq'
// import map from 'lodash/map'
import sumBy from "lodash/sumBy";
import moment from "moment";
import { festivesBetween, periodHours } from "@/domain/workdayLog.js";
import { startLoad } from "@/domain/latestLoad.js";
import { formatNumber, formatMoney, sign } from "@/helpers/format-number";

moment.locale("ca");

export default {
  name: "DedicationSalary",
  components: {},
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
    // the payroll saved for the month has another base than the theoretical salary
    payrollDiffers(key, value) {
      const payroll = this.hasPayroll(key);
      return !!payroll && (value.dailySalary / value.theoricDays).toFixed(2) !== payroll.total_base.toFixed(2);
    },
    sign,
    monthName(key) {
      const names = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];
      return names[Number(key) - 1] || key;
    },
    // hours in Catalan format; balances with their sign
    hours(value, signed = false) {
      const number = Number(value) || 0;
      return (signed && number > 0 ? "+" : "") + formatNumber(number, 2, 2) + " h";
    },
    // a month with no theoretical days gives no salary figure (was "NaN €")
    salary(value) {
      return Number.isFinite(Number(value)) ? formatMoney(value) : "—";
    },
    async getActivities() {
      // only the last of overlapping loads may write (issues/219)
      const isStale = startLoad(this);
      this.months = {};
      this.payrolls = [];

      // nothing to show without a year and a person: no spinner left on (issues/078)
      if (!this.year || !this.user) {
        this.summary = {};
        this.isLoading = false;
        return;
      }
      this.isLoading = true;

      const from = moment(this.year, "YYYY")
        .startOf("year")
        .format("YYYY-MM-DD");
      const to = moment(this.year, "YYYY")
        .endOf("year")
        .format("YYYY-MM-DD");

      const query = `activities/total-by-day?_where[date_gte]=${from}&_where[date_lte]=${to}&_where[users_permissions_user.id]=${this.user}&_limit=-1`;

      const payrolls = (
        await service({ requiresAuth: true }).get(
          `payrolls?_limit=-1&_where[users_permissions_user.id]=${this.user}`
        )
      ).data;
      if (isStale()) {
        return;
      }
      this.payrolls = payrolls;

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

      const loadedActivities = (await service({ requiresAuth: true }).get(query))
        .data;

      const festives = (
        await service({ requiresAuth: true }).get(festivesBetween(from, to))
      ).data.filter(
        f =>
          f.users_permissions_user === null ||
          f.users_permissions_user.id === this.user
      );

      const dailyDedications = (
        await service({ requiresAuth: true }).get(
          `daily-dedications?_limit=-1&_where[users_permissions_user.id]=${this.user}`
        )
      ).data;
      if (isStale()) {
        return;
      }

      // everything is built for this load only, then shown at once
      const months = {};
      const summary = {};
      let warn = false;
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
        const date = moment(d).format("YYYY-MM-DD");
        const displayDate = moment(d).format("ddd DD/MM/YYYY");
        const day = moment(d).day();
        const week = moment(d).week();
        const month = moment(d).format("M");
        const dailyDedication = dailyDedications.find(
          dd => date >= dd.from && date <= dd.to
        );

        if (!dailyDedication) {
          warn = true;
        }
        const activities = loadedActivities.filter(a => a.date === date);
        const festive = festives.find(f => f.date === date);
        // the period's weekly distribution, as Saldo d'hores (issues/238)
        const dayHours = periodHours(dailyDedication, date);

        const theoricHours =
          (!festive ||
            (festive &&
              festive.users_permissions_user &&
              festive.users_permissions_user.id)) &&
          dailyDedication
            ? dayHours
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
        if (!months[month]) {
          months[month] = {
            theoricHours: 0,
            theoricDays: 0,
            worked: 0,
            balance: 0,
            balanceTotal: 0,
            theoricRatio: 0,
            dailySalary: 0
          };
        }
        months[month].theoricHours += theoricHours;

        if (
          (!festive ||
            (festive &&
              festive.users_permissions_user &&
              festive.users_permissions_user.id)) &&
          dailyDedication &&
          (dailyDedication.hoursperday ? dayHours > 0 : day !== 0 && day !== 6)
        ) {
          laborableDays++;
          months[month].theoricDays += 1;
          // each day at its own period's salary, so a month where the
          // period changes is split by days (it took the last day's salary
          // for the whole month, issues/264)
          months[month].dailySalary +=
            (Number(dailyDedication.monthly_salary) || 0) * theoricHours / 8;
        }

        months[month].theoricRatio =
          months[month].theoricHours / months[month].theoricDays / 8;

        months[month].worked += workedHours;
        months[month].balance =
          months[month].worked - months[month].theoricHours;

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
      dates.reverse();
      for (var m in months) {
        if (parseInt(m) === 1) {
          months[m].balanceTotal += months[m].balance;
        } else {
          months[m].balanceTotal +=
            months[parseInt(m) - 1].balanceTotal + months[m].balance;
        }
      }
      summary[
        "Total hores anuals laborables teòriques"
      ] = theoricHoursTotal.toFixed(2);
      summary["Total hores treballades"] = dates[0].totalWorkedHours.toFixed(2);
      summary["Saldo hores anual"] = dates[0].balance.toFixed(2);
      summary["Saldo hores avui"] = dates[0].balanceToday.toFixed(2);

      this.activities = loadedActivities;
      this.dailyDedications = dailyDedications;
      this.warn = warn;
      this.dates = dates;
      this.months = months;
      this.summary = summary;
      this.isLoading = false;
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
          p.users_permissions_user &&
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
          p.users_permissions_user &&
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
            p.users_permissions_user &&
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
          p.users_permissions_user &&
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
          p.users_permissions_user &&
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
};
</script>
<style scoped>
.salary-view .doc-kpis {
  margin-bottom: 1rem;
}
.salary-table {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.salary-table td,
.salary-table th {
  vertical-align: middle;
  white-space: nowrap;
}
.salary-table tr > :first-child {
  padding-left: 1.25rem;
}
.salary-table tr > :last-child {
  padding-right: 1.25rem;
}
.salary-table .month-name {
  text-transform: capitalize;
  font-weight: 700;
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: .375rem;
}
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
.is-striped .card-body:nth-child(2n) {
  background: var(--a-thead);
}
</style>
