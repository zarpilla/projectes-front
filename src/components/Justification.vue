<template>
  <div>
    <div class="table-view">      
      
      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="monthlyActivitiesTotal && monthlyActivitiesTotal.length"
      >
        <div class="columns card-body">
          <div class="column has-text-weight-bold">Mes</div>
          <div class="column has-text-weight-bold">Persona</div>
          <div class="column has-text-weight-bold has-text-right">Hores (€)</div>
          <div class="column has-text-weight-bold has-text-right">Bestreta (€)</div>
          <div class="column has-text-weight-bold has-text-right">%</div>
        </div>
        <div v-for="(row, i) in monthlyActivitiesTotal" v-bind:key="i" class="card-body">
          <div class="columns">
            <div class="column">
              {{ row.month }}
            </div>
            <div class="column">
              {{ row.username }}
            </div>
            <div class="column has-text-right">
              {{ row.cost ? row.cost.toFixed(2) : '0' }} €
            </div>
            <div class="column has-text-right">
              {{ row.payroll ? row.payroll.toFixed(2) : '0' }} €
            </div>
            <div class="column has-text-right">
              {{ row.payroll && row.cost ? (100 * row.cost / row.payroll).toFixed(2) : '' }} %
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
import _ from "lodash";

moment.locale("ca");

export default {
  name: "DedicationSalary",
  components: { CardComponent },
  props: {
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
      isLoading: false,
      projectInfo: null,
      payrolls: [],
      users: []
    };
  },
  computed: {
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    },
    monthlyActivities() {
      if (!this.projectInfo || !this.projectInfo.activities) {
        return []
      }
      const activities = this.projectInfo.activities
      .filter(a => this.year.toString() === moment(a.date, "YYYY-MM-DD").format("YYYY"))
        .map((a) => {
          return {
            ...a,
            year: moment(a.date, "YYYY-MM-DD").format("YYYY"),
            month: moment(a.date, "YYYY-MM-DD").format("MM"),
            // users_permissions_user: a.users_permissions_user,
            ym: moment(a.date, "YYYY-MM-DD").format("YYYYMM") + '-' + a.users_permissions_user,
            // username: this.users.find(u => u.id === a.users_permissions_user).username,
            cost_by_hour_calc: this.users.find(u => u.id === a.users_permissions_user).daily_dedications.find(dd => dd.from <= a.date && dd.to >= a.date)?.costByHour
          };
        });
      return activities;
    },
    monthlyActivitiesTotal() {
      const activities = _(this.monthlyActivities)
        .groupBy("ym", "users_permissions_user")
        .map((ym, id) => ({
          ym: id,
          year: parseInt(id.substring(0, 4)),
          month: parseInt(id.substring(4, 6)),
          users_permissions_user: parseInt(id.substring(7, 9)),
          hours: _.sumBy(ym, 'hours'),
          cost: _.sumBy(ym, (e) =>
            e.cost_by_hour_calc && e.hours ? e.cost_by_hour_calc * e.hours : 0
          ),
          // rows: ym
        }))
        .value();

      const activitiesWithPayrolls = activities.map(a => {
        const pr = this.payrolls.find(p => p.users_permissions_user.id === a.users_permissions_user && p.year.year === a.year && p.month.month === a.month)
        return {
          ...a,
          username: this.users.find(u => u.id === a.users_permissions_user).username,
          // userdata: this.users.find(u => u.id === a.users_permissions_user),
          payroll: pr ? pr.total_base: null
        }
      })

      return activitiesWithPayrolls;
    },
  },
  watch: {
    project: function (newVal, oldVal) {
      this.getActivities();
    },
    year: function (newVal, oldVal) {
      this.getActivities();
    },
  },
  mounted() {
    this.getActivities();
  },
  methods: {
    async getActivities() {
      this.isLoading = true;

      if (!this.year || !this.project) {
        return;
      }

      this.months = {}
      this.payrolls = []
      
      const from = moment(this.year, "YYYY").startOf("year").format("YYYY-MM-DD");
      const to = moment(this.year, "YYYY").endOf("year").format("YYYY-MM-DD");

      let query = `payrolls?_where[paid_date_gte]=${from}&[paid_date_lte]=${to}&_limit=-1`;
      // if (this.user) {
      //   query = `${query}&[users_permissions_user.id]=${this.user}`;
      // } else {
      //   return;
      // }

      this.payrolls = (await service({ requiresAuth: true }).get(query)).data
      this.users = (await service({ requiresAuth: true }).get('users?_limit=-1')).data
      this.projectInfo = (await service({ requiresAuth: true }).get(`projects/${this.project}`)).data

          
    },
    enumerateDaysBetweenDates() {
      var dates = [];
      var currDate = moment(this.year, "YYYY").startOf("year");
      const endOfYear = moment(this.year, "YYYY").endOf("year");
      var lastDate =
        endOfYear.diff(moment()) < 0
          ? moment(this.year, "YYYY").endOf("year")
          : moment().endOf("year");
      // var lastDate = moment()
      dates.push(currDate.clone().toDate());
      while (currDate.add(1, "days").diff(lastDate) < 0) {
        dates.push(currDate.clone().toDate());
      }
      return dates;
    },
    hasPayroll(month) {
      const m = this.monthsDb.find(m => m.month === parseInt(month))
      const y = this.yearsDb.find(y => y.year === parseInt(this.year))
      const payroll = this.payrolls.find(p => p.year.id === y.id && p.month.id === m.id && p.users_permissions_user.id === this.user)
      return payroll
    },
    payrollDetail(month) {
      const m = this.monthsDb.find(m => m.month === parseInt(month))
      const y = this.yearsDb.find(y => y.year === parseInt(this.year))
      const payroll = this.payrolls.find(p => p.year.id === y.id && p.month.id === m.id && p.users_permissions_user.id === this.user)
      return payroll
    },
    async createPayroll(month, total) {      
      const m = this.monthsDb.find(m => m.month === parseInt(month))
      const y = this.yearsDb.find(y => y.year === parseInt(this.year))

      const emitted = moment(`${y.year}-${m.month}-01`, 'YYYY-MM-DD').endOf('month').format('YYYY-MM-DD')

      const payroll = { month: m.id, year: y.id, users_permissions_user: this.user, total_base: total, total: total, total_irpf: 0, total_vat: 0, paid: false, emitted: emitted  }

      await service({ requiresAuth: true }).post('payrolls', payroll)

      await this.updatePayrolls()
    },
    async payPayroll(month, total) {
      const m = this.monthsDb.find(m => m.month === parseInt(month))
      const y = this.yearsDb.find(y => y.year === parseInt(this.year))
      const payroll = this.payrolls.find(p => p.year.id === y.id && p.month.id === m.id && p.users_permissions_user.id === this.user)
      await service({ requiresAuth: true }).put(`payrolls/${payroll.id}`, { paid: true, paid_date: payroll.emitted, total_base: total, total: total })
      await this.updatePayrolls()
    },
    async deletePayroll(month) {
      const m = this.monthsDb.find(m => m.month === parseInt(month))
      const y = this.yearsDb.find(y => y.year === parseInt(this.year))
      const payroll = this.payrolls.find(p => p.year.id === y.id && p.month.id === m.id && p.users_permissions_user.id === this.user)

      await service({ requiresAuth: true }).delete(`payrolls/${payroll.id}`)
      await this.updatePayrolls()
    },
    
    async updatePayrolls() {
      this.payrolls = (await service({ requiresAuth: true }).get(`payrolls?_limit=-1&_where[users_permissions_user.id]=${this.user}`)).data
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
    },
  },
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

<style lang="postcss">
.vc-container {
  font-family: "Nunito";
}
::-webkit-scrollbar {
  width: 0px;
}
::-webkit-scrollbar-track {
  display: none;
}
.custom-calendar.vc-container {
  --day-border: 1px solid #b8c2cc;
  --day-border-highlight: 1px solid #b8c2cc;
  --day-width: 90px;
  --day-height: 90px;
  --weekday-bg: #f8fafc;
  --weekday-border: 1px solid #eaeaea;
  border-radius: 0.25rem;
  border: 0;
  width: 100%;
}
.custom-calendar.vc-container .vc-header {
  background-color: #eee;
  padding: 10px 0;
  border-top-right-radius: 0.25rem;
  border-top-left-radius: 0.25rem;
}
.custom-calendar.vc-container .vc-weeks {
  padding: 0;
}
.custom-calendar.vc-container .vc-weekday {
  background-color: #f8f8f8;
  border-bottom: 1px solid #eaeaea;
  border-top: 1px solid #eaeaea;
  padding: 5px 0;
}
.custom-calendar.vc-container .vc-day {
  padding: 0 5px 3px 5px;
  text-align: left;
  height: auto;
  min-height: 90px;
  min-width: 90px;
  background-color: white;
}
.custom-calendar.vc-container .vc-day.weekday-1,
.custom-calendar.vc-container .vc-day.weekday-7 {
  background-color: #eff8ff;
  background: #eee;
}
.custom-calendar.vc-container .vc-day:not(.on-bottom) {
  border-bottom: 1px solid #b8c2cc;
}
.custom-calendar.vc-container .vc-day:not(.on-bottom).weekday-1 {
  border-bottom: 1px solid #b8c2cc;
}

.custom-calendar.vc-container .vc-day:not(.on-right) {
  border-right: 1px solid #b8c2cc;
}

.custom-calendar.vc-container .vc-day .vc-day-dots {
  margin-bottom: 5px;
}
.custom-calendar .vc-title {
  margin-left: 1rem;
}
</style>
