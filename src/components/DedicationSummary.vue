<template>
  <div class="annual-report">
    <div v-if="warn" class="notification is-warning">
      Abans de consultar el resum d'hores anuals cal definir la jornada laboral de tot l'any a
      <router-link to="/working-day">Persones</router-link>.
    </div>

    <template v-if="!isLoading && !warn && calc">
      <div v-for="o in overMax" :key="o.name" class="notification is-danger">
        <b>{{ o.name }}: {{ o.days }} dies gastats {{ o.max === 1 ? "d'1 disponible" : "de " + o.max + " disponibles" }}.</b>
        Revisa'n el registre o el màxim d'aquest any.
      </div>

      <!-- Redesign A: figures, holidays and absences, how the balance is computed
           and the holiday and free-choice days. Same figures as before (summary). -->
      <div class="doc-kpis">
        <div class="doc-kpi">
          <span>Saldo anual</span>
          <b :class="'has-text-' + sign(balance.hours)">{{ signed(balance.hours) }} h</b>
          <small>laborables − màxim del conveni ({{ signed(balance.days, 0) }} {{ Math.abs(balance.days) === 1 ? "dia" : "dies" }})</small>
        </div>
        <div class="doc-kpi">
          <span>Hores laborables</span>
          <b>{{ hours(summary["Laborables"].hours) }} h</b>
          <small>{{ summary["Laborables"].days }} dies</small>
        </div>
        <div class="doc-kpi">
          <span>Màxim del conveni</span>
          <b>{{ hours(summary["Màxim Conveni"].hours) }} h</b>
          <small>{{ formatNumber(summary["Màxim Conveni"].days, 1) }} dies</small>
        </div>
        <div class="doc-kpi">
          <span>Jornada</span>
          <b>{{ hours(calc.ratio * 8) }} h/dia</b>
          <small>{{ formatNumber(calc.ratio * 100, 1) }} % d'una jornada completa</small>
        </div>
      </div>

      <div class="report-columns">
        <section class="report-box">
          <header class="report-box-head">
            <h2>Festius, vacances i lliure elecció</h2>
            <span class="has-text-muted">dies gastats / màxim</span>
          </header>
          <div class="table-wrap">
            <table class="table is-fullwidth annual-table">
              <thead>
                <tr>
                  <th>Tipus</th>
                  <th class="has-text-right">Dies</th>
                  <th class="bar-col"><span class="is-sr-only">Progrés</span></th>
                  <th class="has-text-right">Hores</th>
                  <th v-if="isCurrentYear" class="has-text-right">Gastats a avui</th>
                  <th>Estat</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in festiveRows" :key="f.name">
                  <th scope="row">
                    {{ f.name }}
                    <b-icon v-if="f.max && f.maxIsDefault === false" icon="pencil-outline" custom-size="default" class="has-text-muted" title="Màxim personalitzat" />
                  </th>
                  <td class="has-text-right is-nowrap"><b>{{ f.days }}</b>{{ f.max ? " / " + f.max : "" }}</td>
                  <td class="bar-col">
                    <span v-if="f.max" class="bar"><i :class="{ 'is-over': f.days > f.max }" :style="{ width: Math.min(100, f.days / f.max * 100) + '%' }"></i></span>
                  </td>
                  <td class="has-text-right is-nowrap">{{ hours(f.hours) }} h</td>
                  <td v-if="isCurrentYear" class="has-text-right is-nowrap">{{ f.daysCurrent }}{{ f.max ? " / " + f.max : "" }}</td>
                  <td>
                    <span v-if="!f.max" class="has-text-muted">sense màxim</span>
                    <span v-else-if="f.days > f.max" class="tag is-danger is-light">↑ {{ f.days - f.max }} {{ f.days - f.max === 1 ? "dia" : "dies" }} per sobre del màxim</span>
                    <span v-else-if="f.days === f.max" class="tag">Complet</span>
                    <span v-else class="tag is-success is-light">{{ f.max - f.days === 1 ? "Queda 1 dia" : "Queden " + (f.max - f.days) + " dies" }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="report-box">
          <header class="report-box-head">
            <h2>Com es calcula</h2>
          </header>
          <dl class="calc-list">
            <dt>Dies feiners amb jornada</dt>
            <dd>{{ calc.baseDays }} dies</dd>
            <dd>{{ hours(calc.baseHours) }} h</dd>
            <template v-for="p in calc.pending" :key="p.name">
              <dt class="is-sub">− {{ p.name }} que falten per gastar ({{ p.max }} − {{ p.used }})</dt>
              <dd>−{{ p.days }} dies</dd>
              <dd>−{{ hours(p.hours) }} h</dd>
            </template>
            <dt class="is-strong">Laborables</dt>
            <dd class="is-strong">{{ summary["Laborables"].days }} dies</dd>
            <dd class="is-strong">{{ hours(summary["Laborables"].hours) }} h</dd>
            <dt class="is-sub">− Màxim del conveni</dt>
            <dd>{{ formatNumber(summary["Màxim Conveni"].days, 1) }} dies</dd>
            <dd>{{ hours(summary["Màxim Conveni"].hours) }} h</dd>
            <dt class="is-strong is-line">Saldo anual</dt>
            <dd class="is-strong is-line" :class="'has-text-' + sign(balance.days)">{{ signed(balance.days, 0) }} dies</dd>
            <dd class="is-strong is-line" :class="'has-text-' + sign(balance.hours)">{{ signed(balance.hours) }} h</dd>
            <dt class="is-line">Hores treballades (registrades)</dt>
            <dd class="is-line">{{ summary["Treballades"].days }} dies</dd>
            <dd class="is-line">{{ hours(summary["Treballades"].hours) }} h</dd>
          </dl>
        </section>
      </div>

      <section class="report-box">
        <header class="report-box-head">
          <h2>Dies de vacances i lliure elecció</h2>
          <span class="legend"><span class="tag is-success is-light">Vacances</span> <span class="tag is-warning is-light">Lliure elecció</span></span>
        </header>
        <p v-if="!personalDaysList.length" class="report-note">Cap dia registrat.</p>
        <div v-else class="table-wrap">
          <table class="table is-fullwidth annual-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Dies</th>
                <th class="has-text-right">Vacances</th>
                <th class="has-text-right">Lliure elecció</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in personalMonths" :key="m.key">
                <th scope="row">{{ m.name }}</th>
                <td>
                  <span
                    v-for="d in m.days"
                    :key="d.date"
                    class="tag day-chip"
                    :class="d.type === 'Vacances' ? 'is-success is-light' : 'is-warning is-light'"
                    :title="formatDMYDate(d.date) + ' · ' + d.type"
                  >{{ d.date.slice(8, 10) }}</span>
                </td>
                <td class="has-text-right">{{ m.holidays }}</td>
                <td class="has-text-right">{{ m.free }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th>Total {{ year }}</th>
                <th></th>
                <th class="has-text-right">{{ personalMonths.reduce((a, m) => a + m.holidays, 0) }}</th>
                <th class="has-text-right">{{ personalMonths.reduce((a, m) => a + m.free, 0) }}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p class="notification is-info">
        Aquí el balanç es fa amb el màxim d'hores del conveni. El saldo dia a dia entre hores registrades i jornada és a «Saldo d'hores».
      </p>
    </template>
  </div>
</template>

<script>
import service from "@/service/index";
// import uniq from 'lodash/uniq'
// import map from 'lodash/map'
import sumBy from "lodash/sumBy";
import moment from "moment";
import CardComponent from "@/components/CardComponent.vue";
import { formatNumber, sign } from "@/helpers/format-number";

moment.locale("ca");

export default {
  name: "DedicationSaldo",
  components: { CardComponent },
  props: {
    user: {
      type: Number,
      default: null
    },
    date1: {
      type: Date,
      default: null
    },
    date2: {
      type: Date,
      default: null
    },
    project: {
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
      // dailyDedications: [],
      dates: [],
      summary: {},
      personalDaysList: [],
      warn: false,
      // the festive types, and the steps of the calculation (for "Com es calcula")
      festiveNames: [],
      calc: null
    };
  },
  computed: {
    festiveRows() {
      return this.festiveNames.map(name => ({ name, ...this.summary[name] })).filter(f => f && f.days !== undefined);
    },
    overMax() {
      return this.festiveRows.filter(f => f.max && f.days > f.max);
    },
    balance() {
      const b = this.summary["Saldo anual d'hores (Laborables - Conveni)"] || {};
      return { hours: Number(b.hours) || 0, days: Number(b.days) || 0 };
    },
    isCurrentYear() {
      return Number(this.year) === moment().year();
    },
    personalMonths() {
      const months = [];
      this.personalDaysList.forEach(d => {
        const key = d.date.slice(0, 7);
        let m = months.find(x => x.key === key);
        if (!m) {
          const name = moment(key + "-01").format("MMMM");
          m = { key, name: name.charAt(0).toUpperCase() + name.slice(1), days: [], holidays: 0, free: 0 };
          months.push(m);
        }
        m.days.push(d);
        if (d.type === "Vacances") m.holidays++;
        else m.free++;
      });
      months.forEach(m => m.days.sort((a, b) => (a.date < b.date ? -1 : 1)));
      return months.sort((a, b) => (a.key < b.key ? -1 : 1));
    },
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    },
  },
  watch: {
    user: function(newVal, oldVal) {
      this.getActivities();
    },
    date1: function(newVal, oldVal) {
      this.getActivities();
    },
    date2: function(newVal, oldVal) {
      this.getActivities();
    },
    year: function(newVal, oldVal) {
      this.getActivities();
    }
  },
  mounted() {
    this.getActivities();

    // this.$on('update:page', () => { console.log('update:page') })
  },
  methods: {
    sign,
    formatNumber,
    hours(value) {
      return formatNumber(Number(value) || 0, 2, 2);
    },
    signed(value, decimals = 2) {
      const n = Number(value) || 0;
      return (n > 0.004 ? "+" : "") + formatNumber(n, decimals, decimals);
    },
    async getActivities() {
      this.isLoading = true;

      if (!this.year) {
        return;
      }

      const from = moment(this.year, "YYYY")
        .startOf("year")
        .format("YYYY-MM-DD");
      const to = moment(this.year, "YYYY")
        .endOf("year")
        .format("YYYY-MM-DD");

      let query = `activities/total-by-day?_where[date_gte]=${from}&[date_lte]=${to}&_limit=-1`;
      if (this.user) {
        query = `${query}&[users_permissions_user.id]=${this.user}`;
      } else {
        return;
      }

      service({ requiresAuth: true })
        .get(query)
        .then(async r => {
          this.activities = r.data;

          const yearDetails = (
            await service({ requiresAuth: true, cached: true }).get(
              `years?_where[year_eq]=${this.year}`
            )
          ).data[0];

          const festiveTypes = (
            await service({ requiresAuth: true, cached: true }).get("festive-types?_limit=-1")
          ).data;
          this.festiveNames = festiveTypes.map(ft => ft.name);
          festiveTypes.forEach(ft => {
            this.summary[ft.name] = {
              hours: 0,
              days: 0,
              max: ft.max,
              daysCurrent: 0,
              maxIsDefault: true
            };
          });

          const festives = (
            await service({ requiresAuth: true }).get(
              `festives?_where[date_gte]=${from}&[date_lte]=${to}&_limit=-1`
            )
          ).data.filter(
            f =>
              f.users_permissions_user === null ||
              f.users_permissions_user.id === this.user
          );

          this.personalDaysList = ["Vacances", "Lliure Elecció"]
            .flatMap(name =>
              festives
                .filter(f => f.festive_type && f.festive_type.name === name)
                .map(f => ({ date: f.date, type: name }))
            )
            .sort((a, b) => (a.date < b.date ? -1 : 1));

          const dailyDedications = (
            await service({ requiresAuth: true }).get(
              `daily-dedications?_limit=-1&_where[users_permissions_user.id]=${this.user}`
            )
          ).data;

          const yearFestives = (
            await service({ requiresAuth: true }).get(
              `user-festives?_limit=-1&_where[year.year]=${this.year}&_where[users_permissions_user_null]=true&_where[festive_type_null]=false`
            )
          ).data;

          const userFestives = (
            await service({ requiresAuth: true }).get(
              `user-festives?_limit=-1&_where[users_permissions_user.id]=${this.user}&_where[year_null]=true&_where[festive_type_null]=false`
            )
          ).data;

          const userYearFestives = (
            await service({ requiresAuth: true }).get(
              `user-festives?_limit=-1&_where[year.year]=${this.year}&_where[users_permissions_user.id]=${this.user}&_where[festive_type_null]=false`
            )
          ).data;

          for (const f of yearFestives) {
            this.summary[f.festive_type.name].max = f.max;
            this.summary[f.festive_type.name].maxIsDefault = false;
          }
          for (const f of userFestives) {
            this.summary[f.festive_type.name].max = f.max;
            this.summary[f.festive_type.name].maxIsDefault = false;
          }
          for (const f of userYearFestives) {
            this.summary[f.festive_type.name].max = f.max;
            this.summary[f.festive_type.name].maxIsDefault = false;
          }

          var allDates = this.enumerateDaysBetweenDates();
          var totalWorkedDays = 0;
          var totalWorkedHours = 0;
          var laborableDays = 0;
          var laborableHours = 0;
          this.warn = false;
          allDates.forEach(d => {
            const date = moment(d).format("YYYY-MM-DD");
            const day = moment(d).day();
            const festive = festives.find(
              f =>
                f.date === date &&
                (f.users_permissions_user === null ||
                  f.users_permissions_user.id == this.user)
            );
            const dailyDedication = dailyDedications.find(
              dd => date >= dd.from && date <= dd.to
            );
            if (!dailyDedication) {
              this.warn = true;
              console.warn("date!", date);
            }
            
            const startOnMondayDay = day === 0 ? 6 : day - 1;

            const theoricHours =
              !festive && dailyDedication && day !== 0 && day !== 6 && !dailyDedication.hoursperday
                ? dailyDedication.hours
                : 
                (!festive && dailyDedication && dailyDedication.hoursperday ? parseFloat(dailyDedication.hoursperday.split(',')[startOnMondayDay]) :
                0);

            laborableHours +=
              dailyDedication && day !== 0 && day !== 6
                ? dailyDedication.hours
                : 0;
            if (festive && dailyDedication) {
              this.summary[festive.festive_type.name].hours +=
                dailyDedication.hours;
              this.summary[festive.festive_type.name].days++;
              if (moment(d).isBefore(moment())) {
                this.summary[festive.festive_type.name].daysCurrent++;
                // console.log('daysCurrent', d, festive.festive_type.name)
              }
            }
            // A laborable weekday counts toward the contractual average even
            // when the per-day distribution schedules 0 hours for it (e.g. a
            // "0,9,10,9,0,0,0" distribution). Guarding on `theoricHours` skipped
            // such days, inflating the average and showing >100% for part-time
            // irregular jornadas. Count the weekday; its 0 hours add nothing to
            // totalWorkedHours but correctly dilute the daily average.
            const isLaborableWeekday =
              !festive && dailyDedication && day !== 0 && day !== 6;
            if (isLaborableWeekday) {
              totalWorkedDays++;
              totalWorkedHours += theoricHours;
            }
          });
          const ratio = totalWorkedHours / totalWorkedDays / 8;

          this.summary["Jornada"] = {
            hours: `${(ratio * 8).toFixed(2)} h/dia (${(ratio * 100).toFixed(
              1
            )}%)`,
            days: ""
          };

          this.summary["Laborables"] = {
            hours: totalWorkedHours,
            days: totalWorkedDays
          };

          const pending = [];
          const baseDays = totalWorkedDays;
          const baseHours = totalWorkedHours;
          festiveTypes.forEach(ft => {
            if (this.summary[ft.name].days < this.summary[ft.name].max) {              
              const daysToAdd = this.summary[ft.name].max - this.summary[ft.name].days
              pending.push({ name: ft.name, days: daysToAdd, hours: daysToAdd * ratio * 8, used: this.summary[ft.name].days, max: this.summary[ft.name].max })
              this.summary["Laborables"].hours = this.summary["Laborables"].hours - daysToAdd * ratio * 8
              this.summary["Laborables"].days = this.summary["Laborables"].days - daysToAdd
            }              
          });

          this.summary["Laborables"].hours = this.summary["Laborables"].hours

          this.summary["Màxim Conveni"] = {
            hours: (yearDetails.working_hours * ratio).toFixed(2),
            days: yearDetails.working_hours / 8
          };
          const label = "Saldo anual d'hores (Laborables - Conveni)"
          this.summary[label] = {
            hours: this.summary["Laborables"].hours - yearDetails.working_hours * ratio,           
            days: this.summary["Laborables"].days - yearDetails.working_hours / 8
          };

          this.summary["Laborables"].hours = this.summary["Laborables"].hours.toFixed(2)
          this.summary[label].hours = this.summary[label].hours.toFixed(2)


          this.summary["Treballades"] = { hours: sumBy(this.activities, 'hours') , days: this.activities.filter(a => a.hours > 0).length};
          this.calc = { baseDays, baseHours, pending, ratio };

          this.isLoading = false;
        });
    },
    enumerateDaysBetweenDates() {
      var dates = [];
      var currDate = moment(this.year, "YYYY").startOf("year");
      const endOfYear = moment(this.year, "YYYY").endOf("year");
      // var lastDate = endOfYear
      // endOfYear.diff(moment()) < 0
      //   ? moment(this.year, "YYYY").endOf("year")
      //   : moment();
      // var lastDate = moment()
      dates.push(currDate.clone().toDate());
      while (currDate.add(1, "days").diff(endOfYear) < 0) {
        dates.push(currDate.clone().toDate());
      }
      return dates;
    },
    formatDMYDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("dddd DD/MM/YYYY");
    }
  },
};
</script>
<style scoped>
.report-columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}
.report-box {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
}
.report-columns .report-box {
  margin-bottom: 0;
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
.table-wrap {
  overflow-x: auto;
}
.annual-table {
  font-size: .875rem;
  font-variant-numeric: tabular-nums;
}
.annual-table th:first-child,
.annual-table td:first-child {
  padding-left: 1.25rem;
}
.annual-table th:last-child,
.annual-table td:last-child {
  padding-right: 1.25rem;
}
.bar-col {
  width: 7rem;
}
.bar {
  display: block;
  height: .5rem;
  border-radius: 999px;
  background: var(--a-chip);
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  background: var(--a-accent);
}
.bar i.is-over {
  background: #D9480F;
}
.calc-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: .5rem 1rem;
  padding: 1rem 1.25rem;
  font-size: .875rem;
  font-variant-numeric: tabular-nums;
}
.calc-list dd {
  text-align: right;
  white-space: nowrap;
}
.calc-list .is-sub {
  color: var(--a-fg-2);
  padding-left: .5rem;
}
.calc-list .is-strong {
  font-weight: 800;
}
.calc-list .is-line {
  padding-top: .5rem;
  border-top: 1px solid var(--a-line);
}
.day-chip {
  margin: .125rem .25rem .125rem 0;
  min-width: 2rem;
  font-variant-numeric: tabular-nums;
}
.report-note {
  padding: .875rem 1.25rem;
  color: var(--a-muted);
}
@media screen and (max-width: 1023px) {
  .report-columns {
    grid-template-columns: minmax(0, 1fr);
  }
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

