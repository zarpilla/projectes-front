<template>
  <div v-if="!isLoading && dates.length" class="saldo-report">
    <!-- Redesign A: figures, the balance month by month and one month day by day.
         Same daily figures as before (dates). -->
    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Saldo a {{ shortDate(lastDay.iso) }}</span>
        <b :class="'has-text-' + sign(lastDay.balance)">{{ signed(lastDay.balance) }} h</b>
        <small>{{ lastDay.balance >= 0 ? "hores fetes de més" : "hores fetes de menys" }} respecte de la jornada</small>
      </div>
      <div class="doc-kpi">
        <span>Hores treballades</span>
        <b>{{ hours(lastDay.totalWorkedHours) }} h</b>
        <small>registrades a «Hores dedicades»</small>
      </div>
      <div class="doc-kpi">
        <span>Hores teòriques</span>
        <b>{{ hours(totals.theoric) }} h</b>
        <small>{{ totals.workdays }} dies de jornada</small>
      </div>
      <div class="doc-kpi">
        <span>Festius i absències</span>
        <b>{{ totals.festiveDays }} dies</b>
        <small>festius, vacances i altres entre setmana</small>
      </div>
    </div>

    <section class="report-box">
      <header class="report-box-head">
        <h2>Saldo acumulat</h2>
        <span class="has-text-muted">a final de cada mes</span>
      </header>
      <svg class="balance-chart" :viewBox="'0 0 ' + chart.w + ' ' + chart.h" role="img" :aria-label="'Saldo acumulat: ' + months.map(m => m.name + ' ' + signed(m.balance) + ' h').join(', ')">
        <line :x1="chart.pad" :x2="chart.w - chart.pad" :y1="chart.y(0)" :y2="chart.y(0)" class="zero" />
        <polygon :points="chart.area" class="area" />
        <polyline :points="chart.line" class="line" />
        <g v-for="(m, i) in months" :key="m.key">
          <circle :cx="chart.x(i)" :cy="chart.y(m.balance)" r="4" class="dot" />
          <text :x="chart.x(i)" :y="chart.y(m.balance) - 10" class="value">{{ signed(m.balance, 1) }}</text>
          <text :x="chart.x(i)" :y="chart.h - 6" class="label">{{ m.short }}</text>
        </g>
      </svg>
    </section>

    <section class="report-box">
      <header class="report-box-head">
        <h2>Per mes</h2>
        <span class="has-text-muted">clica un mes per veure'n els dies</span>
      </header>
      <div class="table-wrap">
        <table class="table is-fullwidth saldo-table is-hoverable">
          <thead>
            <tr>
              <th>Mes</th>
              <th class="has-text-right">Dies de jornada</th>
              <th class="has-text-right">Hores teòriques</th>
              <th class="has-text-right">Hores treballades</th>
              <th class="has-text-right">Diferència</th>
              <th class="has-text-right">Saldo acumulat</th>
              <th>Festius i absències</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in months"
              :key="m.key"
              :class="{ 'is-selected-row': m.key === shownMonth }"
              tabindex="0"
              @click="selectedMonth = m.key"
              @keydown.enter="selectedMonth = m.key"
            >
              <th scope="row">{{ m.name }}</th>
              <td class="has-text-right">{{ m.workdays }}</td>
              <td class="has-text-right">{{ hours(m.theoric) }} h</td>
              <td class="has-text-right">{{ hours(m.worked) }} h</td>
              <td class="has-text-right" :class="'has-text-' + sign(m.diff)">{{ signed(m.diff) }} h</td>
              <td class="has-text-right" :class="'has-text-' + sign(m.balance)">{{ signed(m.balance) }} h</td>
              <td>
                <span v-for="(count, name) in m.festives" :key="name" class="tag is-info is-light">{{ count }} {{ name }}</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th>Total {{ year }}</th>
              <th class="has-text-right">{{ totals.workdays }}</th>
              <th class="has-text-right">{{ hours(totals.theoric) }} h</th>
              <th class="has-text-right">{{ hours(lastDay.totalWorkedHours) }} h</th>
              <th class="has-text-right" :class="'has-text-' + sign(lastDay.balance)">{{ signed(lastDay.balance) }} h</th>
              <th class="has-text-right" :class="'has-text-' + sign(lastDay.balance)">{{ signed(lastDay.balance) }} h</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <section v-if="monthDays.length" class="report-box">
      <header class="report-box-head">
        <h2>{{ monthName(shownMonth) }} dia a dia</h2>
        <b-checkbox v-model="showWeekends">Mostra caps de setmana</b-checkbox>
      </header>
      <div class="table-wrap">
        <table class="table is-fullwidth saldo-table">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Festiu / absència</th>
              <th class="has-text-right">Hores teòriques</th>
              <th class="has-text-right">Hores treballades</th>
              <th class="has-text-right">Diferència</th>
              <th class="has-text-right">Saldo acumulat</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in monthDays" :key="d.iso" :class="{ 'is-weekend': isWeekend(d) && !d.workedHours }">
              <th scope="row">{{ dayLabel(d.iso) }}</th>
              <td>
                <span v-if="d.dateDescription" class="tag is-info is-light">{{ d.dateDescription }}</span>
                <span v-else-if="isWeekend(d)" class="has-text-muted">cap de setmana</span>
              </td>
              <td class="has-text-right">{{ isWeekend(d) && !d.theoricHours ? "" : hours(d.theoricHours) + " h" }}</td>
              <td class="has-text-right">{{ isWeekend(d) && !d.workedHours ? "" : hours(d.workedHours) + " h" }}</td>
              <td class="has-text-right" :class="'has-text-' + sign(d.workedHours - d.theoricHours)">{{ isWeekend(d) && !d.workedHours ? "" : signed(d.workedHours - d.theoricHours) + " h" }}</td>
              <td class="has-text-right" :class="'has-text-' + sign(d.balance)">{{ signed(d.balance) }} h</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="notification is-info">
      El saldo compara, dia a dia, les hores registrades amb la jornada teòrica (sense festius ni vacances). El balanç anual el trobareu a «Hores anuals».
    </p>
  </div>
</template>

<script>
import service from "@/service/index";
// import uniq from 'lodash/uniq'
// import map from 'lodash/map'
import sumBy from "lodash/sumBy";
import moment from "moment";
import { festivesBetween } from "@/domain/workdayLog.js";
import CardComponent from "@/components/CardComponent.vue";
import { formatNumber, sign } from "@/helpers/format-number";

moment.locale("ca");

export default {
  name: "DedicationSaldo",
  components: { CardComponent },
  props: {
    user: {
      type: Number,
      default: null,
    },
    date1: {
      type: Date,
      default: null,
    },
    date2: {
      type: Date,
      default: null,
    },
    project: {
      type: Number,
      default: null,
    },
    year: {
      type: Number,
      default: null,
    },
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
      selectedMonth: null,
      showWeekends: true,
    };
  },
  computed: {
    // dates come newest first
    lastDay() {
      return this.dates[0];
    },
    chronological() {
      return [...this.dates].reverse();
    },
    months() {
      const months = [];
      this.chronological.forEach(d => {
        const key = d.iso.slice(0, 7);
        let m = months[months.length - 1];
        if (!m || m.key !== key) {
          m = { key, name: this.monthName(key, false), short: moment(key + "-01").format("MMM"), workdays: 0, theoric: 0, worked: 0, diff: 0, balance: 0, festives: {} };
          months.push(m);
        }
        if (d.theoricHours > 0) m.workdays++;
        m.theoric += d.theoricHours;
        m.worked += d.workedHours;
        m.diff += d.workedHours - d.theoricHours;
        m.balance = d.balance;
        if (d.dateDescription && !this.isWeekend(d)) {
          m.festives[d.dateDescription] = (m.festives[d.dateDescription] || 0) + 1;
        }
      });
      return months;
    },
    totals() {
      return {
        theoric: this.months.reduce((acc, m) => acc + m.theoric, 0),
        workdays: this.months.reduce((acc, m) => acc + m.workdays, 0),
        festiveDays: this.months.reduce((acc, m) => acc + Object.values(m.festives).reduce((a, n) => a + n, 0), 0)
      };
    },
    shownMonth() {
      return this.selectedMonth && this.months.some(m => m.key === this.selectedMonth)
        ? this.selectedMonth
        : (this.months.length ? this.months[this.months.length - 1].key : null);
    },
    monthDays() {
      return this.chronological.filter(d => d.iso.startsWith(this.shownMonth) && (this.showWeekends || !this.isWeekend(d)));
    },
    chart() {
      const w = 900, h = 220, pad = 28;
      const values = this.months.map(m => m.balance);
      const max = Math.max(0, ...values);
      const min = Math.min(0, ...values);
      const span = max - min || 1;
      const x = i => pad + (this.months.length > 1 ? i * (w - 2 * pad) / (this.months.length - 1) : (w - 2 * pad) / 2);
      const y = v => pad + (max - v) / span * (h - 2 * pad - 14);
      const pts = this.months.map((m, i) => `${x(i)},${y(m.balance)}`);
      const area = this.months.length ? `${x(0)},${y(0)} ${pts.join(" ")} ${x(this.months.length - 1)},${y(0)}` : "";
      return { w, h, pad, x, y, line: pts.join(" "), area };
    },
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    },
  },
  watch: {
    user: function (newVal, oldVal) {
      this.getActivities();
    },
    date1: function (newVal, oldVal) {
      this.getActivities();
    },
    date2: function (newVal, oldVal) {
      this.getActivities();
    },
    year: function (newVal, oldVal) {
      this.getActivities();
    },
  },
  mounted() {
    this.getActivities();

    // this.$on('update:page', () => { console.log('update:page') })
  },
  methods: {
    sign,
    hours(value) {
      return formatNumber(Number(value) || 0, 2, 2);
    },
    signed(value, decimals = 2) {
      const n = Number(value) || 0;
      return (n > 0.004 ? "+" : "") + formatNumber(n, decimals, decimals);
    },
    isWeekend(d) {
      return d.weekday === 0 || d.weekday === 6;
    },
    monthName(key, withYear = true) {
      if (!key) return "";
      const d = moment(key + "-01");
      const name = d.format("MMMM");
      return name.charAt(0).toUpperCase() + name.slice(1) + (withYear ? " " + d.format("YYYY") : "");
    },
    shortDate(iso) {
      return moment(iso).format("DD/MM/YYYY");
    },
    dayLabel(iso) {
      return moment(iso).format("ddd DD/MM");
    },
    async getActivities() {
      this.isLoading = true;

      if (!this.year) {
        return;
      }

      const from = moment(this.year, "YYYY")
        .startOf("year")
        .format("YYYY-MM-DD");
      const to = moment(this.year, "YYYY").endOf("year").format("YYYY-MM-DD");

      let query = `activities/total-by-day?_where[date_gte]=${from}&_where[date_lte]=${to}`;
      if (this.user) {
        query = `${query}&_where[users_permissions_user.id]=${this.user}`;
      } else {
        return;
      }
      query = `${query}&_limit=-1`;

      service({ requiresAuth: true })
        .get(query)
        .then(async (r) => {
          this.activities = r.data;

          const festiveTypes = (
            await service({ requiresAuth: true, cached: true }).get("festive-types?_limit=-1")
          ).data;
          festiveTypes.forEach((ft) => {
            this.summary[ft.name] = 0;
          });
          
          const festives = (
            await service({ requiresAuth: true, cached: true }).get(festivesBetween(from, to))
          ).data.filter(
            (f) =>
              f.users_permissions_user === null ||
              f.users_permissions_user.id === this.user
          );

          service({ requiresAuth: true })
            .get(
              `daily-dedications?_limit=-1&_where[users_permissions_user.id]=${this.user}`
            )
            .then((r) => {
              this.dailyDedications = r.data
              var allDates = this.enumerateDaysBetweenDates()
              var balance = 0
              var totalWorkedHours = 0
              var dates = []
              var laborableDays = 0
              var salary = 0
              allDates.forEach((d) => {
                // console.log('date', moment(d).day)
                const date = moment(d).format("YYYY-MM-DD");
                const displayDate = moment(d).format("ddd DD-MM-YYYY");
                const day = moment(d).day();
                const week = moment(d).week();
                const dailyDedication = this.dailyDedications.find(
                  (dd) => date >= dd.from && date <= dd.to
                );
                const activities = this.activities.filter(
                  (a) => a.date === date
                );
                const festive = festives.find((f) => f.date === date);
                const startOnMondayDay = day === 0 ? 6 : day - 1;
                const theoricHours =
                  !festive && dailyDedication && day !== 0 && day !== 6 && !dailyDedication.hoursperday
                    ? dailyDedication.hours
                    : 
                    (!festive && dailyDedication && dailyDedication.hoursperday ? parseFloat(dailyDedication.hoursperday.split(',')[startOnMondayDay]) :
                    0);
                if (!festive && dailyDedication && day !== 0 && day !== 6) {
                  laborableDays++
                }
                // sumBy returns null when an activity has hours: null, and NaN
                // when hours is non-numeric. Coerce to 0 so toFixed/balance math
                // don't break (a null poisons balance/totalWorkedHours downstream).
                const workedHours = sumBy(activities, "hours") || 0;
                const dateDescription = festive
                  ? festive.festive_type
                    ? festive.festive_type.name
                    : "FESTIU"
                  : "";
                totalWorkedHours += workedHours;
                balance += workedHours - theoricHours;
                dates.push({
                  iso: date,
                  weekday: day,
                  date: displayDate,
                  dateDescription: dateDescription,
                  week: week,
                  theoricHours: theoricHours,
                  workedHours: workedHours,
                  totalWorkedHours: totalWorkedHours,
                  balance: balance,
                  costByHour: dailyDedication ? dailyDedication.costByHour : 0,
                  costByDay: dailyDedication ? dailyDedication.costByHour*workedHours : 0,
                  error: dailyDedication === null,
                });
                if (dailyDedication) {
                  salary += dailyDedication.costByHour*workedHours
                }

                if (day !== 0 && day !== 6 && festive && festive.festive_type && dailyDedication) {
                  this.summary[festive.festive_type.name] +=
                    dailyDedication.hours;
                }
              });
              this.dates = dates.reverse();
              // this.summary['Dies Laborables'] = laborableDays
              this.summary['Saldo hores'] = this.dates[0].balance.toFixed(2)
              this.summary['Total hores treballades'] = this.dates[0].totalWorkedHours.toFixed(2)                            
              // this.summary['Bestreta per hora treballada*'] = `${this.dates[0].costByHour} €`
              // this.summary['Hores treballades diaries'] = (this.dates[0].totalWorkedHours / laborableDays).toFixed(2)
              // this.summary['Bestreta'] = `${salary.toFixed(2)} €`
              this.isLoading = false;
            });
        });
    },
    enumerateDaysBetweenDates() {
      var dates = [];
      var currDate = moment(this.year, "YYYY").startOf("year");
      const endOfYear = moment(this.year, "YYYY").endOf("year");
      var lastDate =
        endOfYear.diff(moment()) < 0
          ? moment(this.year, "YYYY").endOf("year")
          : moment();
      // var lastDate = moment()
      dates.push(currDate.clone().toDate());
      while (currDate.add(1, "days").diff(lastDate) < 0) {
        dates.push(currDate.clone().toDate());
      }
      return dates;
    },
  },
};
</script>
<style scoped>
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
  gap: 1rem;
  padding: .875rem 1.25rem;
  border-bottom: 1px solid var(--a-line);
}
.report-box-head h2 {
  font-size: 1rem;
  font-weight: 800;
}
.report-box-head > span {
  font-size: .8125rem;
}
.balance-chart {
  display: block;
  width: 100%;
  height: auto;
  padding: .5rem 1rem;
}
.balance-chart .zero {
  stroke: var(--a-line);
}
.balance-chart .area {
  fill: var(--a-accent-soft);
  opacity: .8;
}
.balance-chart .line {
  fill: none;
  stroke: var(--a-accent);
  stroke-width: 2.5;
}
.balance-chart .dot {
  fill: var(--a-accent);
}
.balance-chart .value {
  font-size: 11px;
  font-weight: 800;
  text-anchor: middle;
  fill: var(--a-fg);
}
.balance-chart .label {
  font-size: 11px;
  text-anchor: middle;
  fill: var(--a-muted);
}
.table-wrap {
  overflow-x: auto;
}
.saldo-table {
  font-size: .875rem;
  font-variant-numeric: tabular-nums;
}
.saldo-table th:first-child,
.saldo-table td:first-child {
  padding-left: 1.25rem;
}
.saldo-table td:last-child,
.saldo-table th:last-child {
  padding-right: 1.25rem;
}
.saldo-table td,
.saldo-table tbody th {
  white-space: nowrap;
}
.saldo-table tbody tr {
  cursor: pointer;
}
.saldo-table tr.is-selected-row > * {
  background: var(--a-accent-soft);
}
.saldo-table tr.is-weekend > * {
  color: var(--a-muted);
  font-weight: 400;
  font-size: .8125rem;
  padding-top: .25rem;
  padding-bottom: .25rem;
}
.saldo-table .tag {
  margin: .125rem .25rem .125rem 0;
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
.card-header-title {
  text-transform: capitalize;
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
</style>
