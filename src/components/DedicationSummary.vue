<template>
  <div>
    <div class="table-view">
      <div class="alert" v-if="warn">
        <b-icon icon="alert-circle"></b-icon>
        Atenció, abans de consultar el resum d'hores anuals cal definir la
        <a href="/stats/#/working-day" target="_blank">jornada laboral</a> de
        tot l'any.
      </div>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="!isLoading && !warn"
      >
        <div class="columns card-body">
          <div class="column has-text-weight-bold">Tipus</div>
          <div class="column has-text-weight-bold">Hores</div>
          <div class="column has-text-weight-bold">Dies</div>
          <div class="column has-text-weight-bold">Gastats avui</div>
        </div>
        <div v-for="(value, key) in summary" v-bind:key="key" class="card-body">
          <div class="columns">
            <div class="column">
              {{ key }}
            </div>
            <div class="column">
              {{ value.hours }}
            </div>
            <div class="column">
              {{ value.days }} {{ value.max ? `/ ${value.max}` : "" }}
              <b-icon
              v-if="value.max && value.maxIsDefault === false"
              class="has-text-grey-light"
              icon="alert-circle"
              title="Valor personalitzat"
              size="is-small"
            >
            </b-icon>
            </div>
            <div class="column">
              {{ value.daysCurrent }} {{ value.max ? `/ ${value.max}` : "" }}
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
            if (theoricHours) {
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

          festiveTypes.forEach(ft => {
            if (this.summary[ft.name].days < this.summary[ft.name].max) {              
              const daysToAdd = this.summary[ft.name].max - this.summary[ft.name].days
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

