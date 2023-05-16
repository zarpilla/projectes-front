<template>
  <div>
    <div class="table-view">
      <card-component class="has-table has-mobile-sort-spaced" v-if="!isLoading">
        <!-- <pre>{{ activities }}</pre> -->
        <div class="columns card-body">
          <div class="column has-text-weight-bold">Data</div>
          <div class="column has-text-weight-bold">Entrada</div>
          <div class="column has-text-weight-bold">Sortida</div>
          <div class="column has-text-weight-bold">Total hores treballades</div>
          <!-- <div class="column has-text-weight-bold">a</div> -->
        </div>
        <div v-for="(a, i) in activities" v-bind:key="i" class="card-body">
          <div class="columns">
            <div class="column ">
              {{ a.date }}
              <button class="button is-small is-warning ml-5" type="button" @click="addPeriod(a, i)">
                <b-icon icon="plus" size="is-small" />
              </button>
            </div>
            <div class="column">
              <div class="is-flex">
                <b-input class="time-part-input mr-1" placeholder="Hora..." v-model="a.hour_in_h" type="number" min="0"
                  max="23" @change.native="changeHourIn(a, i)" :disabled="a.id === 0">
                </b-input>
                <b-input class="time-part-input" placeholder="Minut..." v-model="a.hour_in_m" type="number" min="0"
                  max="59" @change.native="changeHourIn(a, i)" :disabled="a.id === 0">
                </b-input>
                <button v-if="a.date === todayF" class="button is-small is-success ml-5" type="button"
                  @click.prevent="hourin(a, i)" title="Entrada"
                  :disabled="(a.hour_in_h !== null && a.hour_in_m != null) && (a.hour_in_h !== '' && a.hour_in_m != '')">
                  <b-icon icon="arrow-right" size="is-small" />
                </button>
              </div>
            </div>
            <div class="column">
              <div class="is-flex">

                <b-input class="time-part-input mr-1" placeholder="Hora..." v-model="a.hour_out_h" type="number" min="0"
                  max="23" @change.native="changeHourOut(a, i)" :disabled="a.id === 0">
                </b-input>
                <b-input class="time-part-input" placeholder="Minut..." v-model="a.hour_out_m" type="number" min="0"
                  max="59" @change.native="changeHourOut(a, i)" :disabled="a.id === 0">
                </b-input>
                <button v-if="a.date === todayF" class="button is-small is-danger ml-5" type="button"
                  @click.prevent="hourout(a, i)" title="Sortida"
                  :disabled="(a.hour_out_h !== null && a.hour_out_m != null) && (a.hour_out_h !== '' && a.hour_out_m != '')">
                  <b-icon icon="arrow-left" size="is-small" />
                </button>
              </div>

              <!-- <button class="button is-small is-danger mr-5" type="button" @click.prevent="hourout(a)" title="Entrada">
                <b-icon icon="arrow-left" size="is-small" />
              </button>
              {{ a.hour_out | formatHour }} -->
            </div>
            <div class="column">
              {{ a | formatHourDiff }}
            </div>
            <!-- <div class="column">
              {{ a }}
            </div> -->
            <!-- <div class="column">
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
            </div> -->
          </div>
        </div>
      </card-component>
    </div>
  </div>
</template>

<script>
import service from "@/service/index";
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
      updating: false
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
    todayF() {
      return moment().format('YYYY-MM-DD')
    }
  },
  watch: {
    user: function (newVal, oldVal) {
      this.getWorkDayLogs();
    },
    date1: function (newVal, oldVal) {
      this.getWorkDayLogs();
    },
    date2: function (newVal, oldVal) {
      this.getWorkDayLogs();
    },
    year: function (newVal, oldVal) {
      this.getWorkDayLogs();
    },
  },
  mounted() {
    this.getWorkDayLogs();
  },
  methods: {
    async getWorkDayLogs() {
      this.isLoading = true;

      if (!this.year) {
        return;
      }

      if (!this.user) {
        return;
      }

      const from = moment(this.year, "YYYY")
        .startOf("year")
        .format("YYYY-MM-DD");
      const to = moment(this.year, "YYYY").endOf("year").format("YYYY-MM-DD");

      let query = `workday-logs?_where[date_gte]=${from}&[date_lte]=${to}&_limit=-1`;
      if (this.user) {
        query = `${query}&[users_permissions_user.id]=${this.user}`;
      } else {
        return;
      }

      service({ requiresAuth: true })
        .get(query)
        .then(async (r) => {
          const activities = r.data;
          var allDates = this.enumerateDaysBetweenDates()
          allDates.forEach((d) => {
            const date = moment(d).format("YYYY-MM-DD");
            const dailyWorkday = activities.filter(
              (dd) => date === dd.date
            );
            if (dailyWorkday.length === 0) {
              activities.push({ id: 0, date: date, users_permissions_user: this.user, hour_in: null, hour_in_h: null, hour_in_m: null, hour_out: null })
            } else {
              dailyWorkday.forEach((w) => {
                if (w.hour_in) {
                  w.hour_in_h = w.hour_in.split(':')[0]
                  w.hour_in_m = w.hour_in.split(':')[1]
                }
                if (w.hour_out) {
                  w.hour_out_h = w.hour_out.split(':')[0]
                  w.hour_out_m = w.hour_out.split(':')[1]
                }

                activities.push(w)
              })

            }
          });

          this.activities = activities.reverse()

          this.isLoading = false;

        });
    },
    addPeriod(activity, index) {
      const item = { date: activity.date, users_permissions_user: this.user, hour_in: null, hour_in_h: null, hour_in_m: null, hour_out: null }
      this.saveActivity(item, index, false)
    },
    changeHourIn(activity, i) {

      const zeroPad = (num, places) => String(num).padStart(places, "0");
      if (activity.hour_in_h !== '') {
        activity.hour_in_h = zeroPad(activity.hour_in_h, 2)
      }
      if (activity.hour_in_m !== '') {
        activity.hour_in_m = zeroPad(activity.hour_in_m, 2)
      }

      if (activity.hour_in_h !== '' && activity.hour_in_m !== '') {
        activity.hour_in = moment().format(`${activity.hour_in_h}:${activity.hour_in_m}:00.000`)
        this.saveActivity(activity, i, true)
      } else if (activity.hour_in_h === '' && activity.hour_in_m === '') {
        activity.hour_in = null
        this.saveActivity(activity, i, true)
      }
    },
    changeHourOut(activity, i) {

      const zeroPad = (num, places) => String(num).padStart(places, "0");
      if (activity.hour_out_h !== '') {
        activity.hour_out_h = zeroPad(activity.hour_out_h, 2)
      }
      if (activity.hour_out_m !== '') {
        activity.hour_out_m = zeroPad(activity.hour_out_m, 2)
      }

      if (activity.hour_out_h !== '' && activity.hour_out_m !== '') {
        activity.hour_out = moment().format(`${activity.hour_out_h}:${activity.hour_out_m}:00.000`)
        this.saveActivity(activity, i, true)
      } else if (activity.hour_out_h === '' && activity.hour_out_m === '') {
        activity.hour_out = null
        this.saveActivity(activity, i, true)
      }

    },
    hourin(activity, i) {
      // activity.hour_in = moment().toDate()
      activity.hour_in_h = moment().format("HH:mm").split(':')[0]
      activity.hour_in_m = moment().format("HH:mm").split(':')[1]
      activity.hour_in = moment().format("HH:mm:ss.000")
      this.saveActivity(activity, i, true)
    },
    hourout(activity, i) {
      activity.hour_out = moment().toDate()
      activity.hour_out_h = moment().format("HH:mm").split(':')[0]
      activity.hour_out_m = moment().format("HH:mm").split(':')[1]
      activity.hour_out = moment().format("HH:mm:ss.000")
      this.saveActivity(activity, i, true)
    },
    async saveActivity(activity, i, replace) {
      this.updating = true
      try {
        if (activity.hour_in_h === "undefined" || activity.hour_in_m === "undefined" || activity.hour_out_h === "undefined" || activity.hour_out_h === "undefined") {
          this.updating = false
          return
        }
        if (activity.id) {
          await service({ requiresAuth: true }).put(`workday-logs/${activity.id}`, activity);
          this.updating = false
        } else {
          const db = await service({ requiresAuth: true }).post("workday-logs", activity);
          activity = db.data
          if (activity.hour_in) {
            activity.hour_in_h = activity.hour_in.split(':')[0]
            activity.hour_in_m = activity.hour_in.split(':')[1]
          }
          if (activity.hour_out) {
            activity.hour_out_h = activity.hour_out.split(':')[0]
            activity.hour_out_m = activity.hour_out.split(':')[1]
          }
          if (replace) {
            this.activities = this.activities.filter((a, j) => j !== i)
          }
          this.activities.splice(i, 0, activity)
          
          
          this.updating = false

          // this.activities[i] = db.data
          // console.log('activity 1', activity)
        }
      } catch {
        this.updating = false
      }

    },
    enumerateDaysBetweenDates() {
      var dates = [];
      var currDate = moment(this.year, "YYYY").startOf("year");
      // const endOfYear = moment(this.year, "YYYY").endOf("year");
      dates.push(currDate.clone().toDate());
      while (currDate.add(1, "days").diff(moment()) < 0) {
        dates.push(currDate.clone().toDate());
      }
      return dates;
    },
  },
  filters: {
    formatHour(val) {
      if (!val) {
        return "-";
      }
      return moment(val, "HH:mm:ss").format("HH:mm");
    },
    formatHourDiff(activity) {
      if (!activity.hour_in || !activity.hour_out) {
        return "-";
      }
      const hours = -1 * moment(activity.hour_in, "HH:mm:ss").diff(moment(activity.hour_out, "HH:mm:ss"), 'hours')
      const minutes = -1 * moment(activity.hour_in, "HH:mm:ss").diff(moment(activity.hour_out, "HH:mm:ss"), 'minutes')

      return `${hours}h ${(minutes - (hours * 60))}m`
    },
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

.time-part-input {
  max-width: 100px;
  margin-top: -4px;

}
</style>

<style lang="postcss"></style>
