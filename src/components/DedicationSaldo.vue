<template>
  <div>
    <div class="table-view">
      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="!isLoading"
      >
        <div class="columns card-body">
          <div class="column has-text-weight-bold">Data</div>
          <div class="column has-text-weight-bold">Hores teòriques</div>
          <div class="column has-text-weight-bold">Hores treballades dia</div>
          <div class="column has-text-weight-bold">Total hores treballades</div>
          <div class="column has-text-weight-bold">Saldo hores</div>
        </div>
        <div v-for="(d, i) in dates" v-bind:key="i" class="card-body">
          <div class="columns">
            <div class="column">
              {{ d.date }}
            </div>
            <div class="column">
              {{ d.theoricHours.toFixed(2) }}
              {{ d.dateDescription ? `- ${d.dateDescription}` : "" }}
            </div>
            <div class="column">
              {{ d.workedHours.toFixed(2) }}
            </div>
            <div class="column">
              {{ d.totalWorkedHours.toFixed(2) }}
            </div>
            <div class="column">
              {{ d.balance.toFixed(2) }}
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
            await service({ requiresAuth: true, cached: true }).get("festives?_limit=-1")
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
                const workedHours = sumBy(activities, "hours");
                const dateDescription = festive
                  ? festive.festive_type
                    ? festive.festive_type.name
                    : "FESTIU"
                  : "";
                totalWorkedHours += workedHours;
                balance += workedHours - theoricHours;
                dates.push({
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
