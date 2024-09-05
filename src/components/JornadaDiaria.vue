<template>
  <div>
    <div class="table-view">
      <div class="mb-4">
        <button
          v-if="!isLoading"
          class="button is-primary zmt-5"
          @click="generatePDF"
        >
          Descarrega PDF
        </button>

        <!-- <button
          v-if="!isLoading && generatedPDF"
          class="button is-primary zmt-5 ml-3"
          @click="downloadPDF"
          
        >
          Descarrega PDF
        </button> -->
      </div>

      <card-component
        class="has-table has-mobile-sort-spaced"
        v-if="!isLoading"
      >
        <div class="columns card-body">
          <div class="column has-text-weight-bold">Data</div>
          <div class="column has-text-weight-bold">Entrada</div>
          <div class="column has-text-weight-bold">Sortida</div>
          <div class="column has-text-weight-bold">
            Hores treballades (total)
          </div>
          <div class="column has-text-weight-bold">
            Projecte
          </div>
          <div class="column has-text-weight-bold"></div>
        </div>
        <div v-for="(a, i) in activities" v-bind:key="i" class="card-body">
          <div v-if="a._type !== 'total'" class="columns">
            <div class="column ">
              {{ a.date }}
              <button
                class="button is-small is-warning ml-5"
                type="button"
                @click="addPeriod(a, i)"
              >
                <b-icon icon="plus" size="is-small" />
              </button>              
            </div>
            <div class="column">
              <div class="is-flex">
                <b-input
                  class="time-part-input mr-1"
                  placeholder="Hora..."
                  v-model="a.hour_in_h"
                  type="number"
                  min="0"
                  max="23"
                  @change.native="changeHourIn(a, i)"
                  :disabled="a.id === 0"
                >
                </b-input>
                <b-input
                  class="time-part-input"
                  placeholder="Minut..."
                  v-model="a.hour_in_m"
                  type="number"
                  min="0"
                  max="59"
                  @change.native="changeHourIn(a, i)"
                  :disabled="a.id === 0"
                >
                </b-input>
                <button
                  v-if="a.date === todayF"
                  class="button is-small is-success ml-5"
                  type="button"
                  @click.prevent="hourin(a, i)"
                  title="Entrada"
                  :disabled="
                    a.hour_in_h !== null &&
                      a.hour_in_m != null &&
                      a.hour_in_h !== '' &&
                      a.hour_in_m != ''
                  "
                >
                  <b-icon icon="arrow-right" size="is-small" />
                </button>
              </div>
            </div>
            <div class="column">
              <div class="is-flex">
                <b-input
                  class="time-part-input mr-1"
                  placeholder="Hora..."
                  v-model="a.hour_out_h"
                  type="number"
                  min="0"
                  max="23"
                  @change.native="changeHourOut(a, i)"
                  :disabled="a.id === 0"
                >
                </b-input>
                <b-input
                  class="time-part-input"
                  placeholder="Minut..."
                  v-model="a.hour_out_m"
                  type="number"
                  min="0"
                  max="59"
                  @change.native="changeHourOut(a, i)"
                  :disabled="a.id === 0"
                >
                </b-input>
                <button
                  v-if="a.date === todayF"
                  class="button is-small is-danger ml-5"
                  type="button"
                  @click.prevent="hourout(a, i)"
                  title="Sortida"
                  :disabled="
                    a.hour_out_h !== null &&
                      a.hour_out_m != null &&
                      a.hour_out_h !== '' &&
                      a.hour_out_m != ''
                  "
                >
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
              <b
                >({{ daily.find(d => d.date === a.date) | formatHourMonth }})</b
              >
            </div>
            <div class="column">
         
              <b-autocomplete
                v-if="a.projectNameSearch !== undefined"
                v-model="a.projectNameSearch"
                placeholder="Projecte"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProjects(a.projectNameSearch)"
                field="name"
                @select="option => (a.project = option ? option.id : null)"
                @input="projectChanged(a, i)"
                :disabled="a.id === 0"
                :clearable="true"                
              >
              </b-autocomplete>
              
            </div>

            <div class="column">
              <button
                v-if="a.id"
                class="button is-small is-danger mr-5"
                type="button"
                @click.prevent="deleteWorkLog(a)"
                title="Esborrar"
              >
                <b-icon icon="trash-can" size="is-small" />
              </button>
            </div>
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
          <div class="columns" v-else>
            <div class="column">
              <b>TOTAL {{ a.date | formatMonthName }}: </b>
              {{ monthly.find(m => m.month === a.month) | formatHourMonth }}
            </div>
            <div class="column"></div>
            <div class="column"></div>
            <div class="column"></div>
            <div class="column"></div>
            <div class="column"></div>
          </div>
        </div>
      </card-component>

      <div v-if="generatedPDF || true" class="invoice-box-container">
        <div class="invoice-box" id="pdf">
          <table>
            <tr class="is-total bordered-2t">
              <th colspan="1" width="40%">
                REGISTRE DE JORNADES<br />
                {{ me.name }} - {{ me.nif }}
                <div v-if="me.ccc">C.C.C. {{ me.ccc }}</div>
              </th>
              <th colspan="1" style="text-align: right;">
                <img
                  v-if="imageUrl"
                  :src="imageUrl"
                  style="width:150px;margin-top: 1rem;margin-bottom: 1rem;margin-right: 1rem"
                />
              </th>
            </tr>
            <tr class="bordered-2t">
              <th width="40%">PERSONA</th>
              <td>{{ personName }} <span v-if="personID">- NIF: {{ personID }}</span> <span v-if="personNAF">- NAF: {{ personNAF }}</span></td>
            </tr>
            <tr class="bordered-2t pb-4">
              <th width="40%">PERÍODE</th>
              <td>{{ months.find(m => m.month === month).name }} {{ year }}</td>
            </tr>
          </table>

          <table class="mt-40">
            <tr class="bordered-2">
              <th>DATA</th>
              <th>HORES</th>
            </tr>

            <tr
              v-for="(a, i) in activities.filter(
                a => a.hour_in || a._type === 'total'
              )"
              v-bind:key="i"
              :class="{ 'is-total': a._type === 'total' }"
            >
              <td>
                <span class="has-text-weight-bold" v-if="a._type === 'total'"
                  >TOTAL {{ a.date | formatMonthName }}</span
                >
                <span v-else>{{ a.date }}</span>
              </td>
              <td>
                <span class="has-text-weight-bold" v-if="a._type === 'total'">{{
                  monthly.find(m => m.month === a.month) | formatHourMonth
                }}</span>
                <span v-else
                  >{{ a.hour_in_h }}:{{ a.hour_in_m }} - {{ a.hour_out_h }}:{{
                    a.hour_out_m
                  }}
                  ({{ a | formatHourDiff }})</span
                >
              </td>
            </tr>
            <tr>
              <td class="has-text-weight-bold">TOTAL</td>
              <td class="has-text-weight-bold">{{ superTotal }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import service from "@/service/index";
import sumBy from "lodash/sumBy";
import moment from "moment";
import CardComponent from "@/components/CardComponent";
import _ from "lodash";
import * as html2pdf from "html3pdf";

moment.locale("ca");

export default {
  name: "JornadaDiaria",
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
    },
    month: {
      type: Number,
      default: null
    },
    months: {
      type: Array,
      default: []
    }
  },
  data() {
    return {
      activities: [],
      isLoading: false,
      updating: false,
      generatedPDF: false,
      users: [],
      me: null,
      apiUrl: process.env.VUE_APP_API_URL,
      imageUrl: null,
      projects: [],
    };
  },

  watch: {
    user: function(newVal, oldVal) {
      this.getWorkDayLogs();
    },
    date1: function(newVal, oldVal) {
      this.getWorkDayLogs();
    },
    date2: function(newVal, oldVal) {
      this.getWorkDayLogs();
    },
    year: function(newVal, oldVal) {
      this.getWorkDayLogs();
    },
    month: function(newVal, oldVal) {
      this.getWorkDayLogs();
    }
  },
  mounted() {
    this.getWorkDayLogs();
  },
  computed: {
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    },
    todayF() {
      return moment().format("YYYY-MM-DD");
    },
    personName() {
      if (!this.users) {
        return "";
      }
      const user = this.users.find(u => u.id === this.user);
      if (!user) {
        return "";
      }
      return user.fullname || user.username;
    },
    personID() {
      if (!this.users) {
        return "";
      }
      const user = this.users.find(u => u.id === this.user);
      if (!user) {
        return "";
      }
      return user.identity_number;
    },
    personNAF() {
      if (!this.users) {
        return "";
      }
      const user = this.users.find(u => u.id === this.user);
      if (!user) {
        return "";
      }
      return user.naf;
    },
    monthly() {
      const totals = _(
        this.activities
          .filter(a => a._type !== "total" && a.hour_in !== null && a.hour_out)
          .map(a => {
            return {
              ...a,
              month: (moment(a.date).month() + 1).toString(),
              m: moment(a.hour_in, "HH:mm:ss").diff(
                moment(a.hour_out, "HH:mm:ss"),
                "minutes"
              )
            };
          })
      )
        .groupBy("month")
        .map((rows, id) => ({
          month: id,
          m: _.sumBy(
            rows,
            a =>
              -1 *
              moment(a.hour_in, "HH:mm:ss").diff(
                moment(a.hour_out, "HH:mm:ss"),
                "minutes"
              )
          )
          // rows: rows
        }))
        .value();

      return totals;
    },
    daily() {
      const totals = _(
        this.activities
          .filter(a => a._type !== "total" && a.hour_in !== null && a.hour_out)
          .map(a => {
            return {
              ...a,
              day: a.date,
              m: moment(a.hour_in, "HH:mm:ss").diff(
                moment(a.hour_out, "HH:mm:ss"),
                "minutes"
              )
            };
          })
      )
        .groupBy("day")
        .map((rows, id) => ({
          date: id,
          m: _.sumBy(rows, a => a.m)
          // rows: rows
        }))
        .value();

      return totals;
    },
    superTotal() {
      const totalMinutes = this.monthly.reduce((acc, m) => acc + m.m, 0);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formattedTime = `${hours}h ${minutes}m`;
      return formattedTime;
    },    
  },
  methods: {
    async getWorkDayLogs() {
      this.isLoading = true;
      this.generatedPDF = false;

      if (!this.year) {
        return;
      }

      if (!this.user) {
        return;
      }

      this.users = (await service({ requiresAuth: true }).get("users")).data;

      this.projects = (
        await service({ requiresAuth: true }).get("projects/basic?_limit=-1")
      ).data;

      console.log('this.projects', this.projects)

      const from = moment(this.year + "-" + this.month, "YYYY-MM")
        .startOf("month")
        .format("YYYY-MM-DD");
      const to = moment(this.year + "-" + this.month, "YYYY-MM")
        .endOf("month")
        .format("YYYY-MM-DD");

      let query = `workday-logs?_where[date_gte]=${from}&[date_lte]=${to}&_limit=-1`;
      if (this.user) {
        query = `${query}&[users_permissions_user.id]=${this.user}`;
      } else {
        return;
      }

      service({ requiresAuth: true })
        .get(query)
        .then(async r => {
          const activities = [];
          var allDates = this.enumerateDaysBetweenDates();

          allDates.forEach(d => {
            const date = moment(d).format("YYYY-MM-DD");
            const dailyWorkday = r.data.filter(dd => date === dd.date);

            if (date.endsWith("01")) {
              activities.push({
                _type: "total",
                date: date,
                month: (moment(d).month() + 1).toString()
              });
            }

            if (dailyWorkday.length === 0) {
              activities.push({
                id: 0,
                date: date,
                users_permissions_user: this.user,
                hour_in: null,
                hour_in_h: null,
                hour_in_m: null,
                hour_out: null,
                projectNameSearch: '',
                project: null,
                activity: null
              });
            } else {
              dailyWorkday.forEach(w => {
                w.projectNameSearch = ''
                w.project = w.activity && w.activity.project ? (w.activity.project.id ? w.activity.project.id : w.activity.project): null
                if (w.hour_in) {
                  w.hour_in_h = w.hour_in.split(":")[0];
                  w.hour_in_m = w.hour_in.split(":")[1];
                }
                if (w.hour_out) {
                  w.hour_out_h = w.hour_out.split(":")[0];
                  w.hour_out_m = w.hour_out.split(":")[1];
                }
                if (w.activity && w.activity.project) {
                  console.log('w.activity', w.activity)
                  w.projectNameSearch = this.projects.find(p => p.id === w.activity.project).name
                }
                activities.push(w);
              });
            }
          });

          this.activities = activities.reverse();

          this.isLoading = false;
        });

      this.me = (await service({ requiresAuth: true }).get("me")).data;

      if (this.me.logo && this.me.logo.url) {
        const img = `${this.apiUrl}${this.me.logo.url}`;
        this.toDataUrl(img, base64 => {
          this.imageUrl = base64;
        });
      }
    },

    toDataUrl(url, callback) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        var reader = new FileReader();
        reader.onloadend = function() {
          callback(reader.result);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.open("GET", url);
      xhr.responseType = "blob";
      xhr.send();
    },
    deleteWorkLog(activity, index) {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols eliminar el registre?",
        onConfirm: async () => {
          if (activity.activity) {
            await service({ requiresAuth: true }).delete(
              `activities/${activity.activity.id}`
            );
          }

          await service({ requiresAuth: true }).delete(
            `workday-logs/${activity.id}`
          );
          this.getWorkDayLogs();
        },
        onCancel: () => {}
      });
    },
    addPeriod(activity, index) {
      const item = {
        date: activity.date,
        users_permissions_user: this.user,
        hour_in: null,
        hour_in_h: null,
        hour_in_m: null,
        hour_out: null,
        projectNameSearch: '',
        project: null,
        activity: null
      };
      this.saveActivity(item, index, false);
    },
    changeHourIn(activity, i) {
      const zeroPad = (num, places) => String(num).padStart(places, "0");
      if (activity.hour_in_h !== "") {
        activity.hour_in_h = zeroPad(activity.hour_in_h, 2);
      }
      if (activity.hour_in_m !== "") {
        activity.hour_in_m = zeroPad(activity.hour_in_m, 2);
      }

      if (activity.hour_in_h !== "" && activity.hour_in_m !== "") {
        activity.hour_in = moment().format(
          `${activity.hour_in_h}:${activity.hour_in_m}:00.000`
        );        
        this.saveActivity(activity, i, true);
      } else if (activity.hour_in_h === "" && activity.hour_in_m === "") {
        activity.hour_in = null;
        this.saveActivity(activity, i, true);
      }
    },
    changeHourOut(activity, i) {
      const zeroPad = (num, places) => String(num).padStart(places, "0");
      if (activity.hour_out_h !== "") {
        activity.hour_out_h = zeroPad(activity.hour_out_h, 2);
      }
      if (activity.hour_out_m !== "") {
        activity.hour_out_m = zeroPad(activity.hour_out_m, 2);
      }

      if (activity.hour_out_h !== "" && activity.hour_out_m !== "") {
        activity.hour_out = moment().format(
          `${activity.hour_out_h}:${activity.hour_out_m}:00.000`
        );
        this.saveActivity(activity, i, true);
      } else if (activity.hour_out_h === "" && activity.hour_out_m === "") {
        activity.hour_out = null;
        this.saveActivity(activity, i, true);
      }
    },
    hourin(activity, i) {
      // activity.hour_in = moment().toDate()
      activity.hour_in_h = moment()
        .format("HH:mm")
        .split(":")[0];
      activity.hour_in_m = moment()
        .format("HH:mm")
        .split(":")[1];
      activity.hour_in = moment().format("HH:mm:ss.000");
      this.saveActivity(activity, i, true);
    },
    hourout(activity, i) {
      activity.hour_out = moment().toDate();
      activity.hour_out_h = moment()
        .format("HH:mm")
        .split(":")[0];
      activity.hour_out_m = moment()
        .format("HH:mm")
        .split(":")[1];
      activity.hour_out = moment().format("HH:mm:ss.000");
      this.saveActivity(activity, i, true);
    },
    async saveActivity(activity, i, replace, createActivity = true) {
      this.updating = true;
      try {
        if (
          activity.hour_in_h === "undefined" ||
          activity.hour_in_m === "undefined" ||
          activity.hour_out_h === "undefined" ||
          activity.hour_out_h === "undefined"
        ) {
          this.updating = false;
          return;
        }
        if (activity.id) {
          await service({ requiresAuth: true }).put(
            `workday-logs/${activity.id}`,
            activity
          );
          if (createActivity) {
            this.projectChanged(activity, i)
          }
          this.updating = false;
        } else {
          const db = await service({ requiresAuth: true }).post(
            "workday-logs",
            activity
          );
          activity = db.data;

          activity.projectNameSearch = ''
          activity.project = null
          activity.activity = null

          if (activity.hour_in) {
            activity.hour_in_h = activity.hour_in.split(":")[0];
            activity.hour_in_m = activity.hour_in.split(":")[1];
          }
          if (activity.hour_out) {
            activity.hour_out_h = activity.hour_out.split(":")[0];
            activity.hour_out_m = activity.hour_out.split(":")[1];
          }
          if (replace) {
            this.activities = this.activities.filter((a, j) => j !== i);
          }
          this.activities.splice(i, 0, activity);

          this.updating = false;

          // this.activities[i] = db.data
          // console.log('activity 1', activity)
        }
      } catch {
        this.updating = false;
      }
    },
    enumerateDaysBetweenDates() {
      var dates = [];
      var currDate = moment(this.year + "-" + this.month, "YYYY-MM").startOf(
        "month"
      );
      var endDate = moment(this.year + "-" + this.month, "YYYY-MM").endOf(
        "month"
      );
      if (currDate.diff(moment()) < 0) {
        dates.push(currDate.clone().toDate());
      }
      var currDateAux = currDate.clone();
      while (
        currDate.add(1, "days").diff(endDate) < 0 &&
        currDateAux.add(1, "days").diff(moment()) < 0
      ) {
        currDateAux = currDate.clone();
        dates.push(currDate.clone().toDate());
      }
      return dates;
    },
    generatePDF() {
      this.generatedPDF = true;
      setTimeout(() => {
        this.downloadPDF();
      }, 100);
    },
    downloadPDF() {
      var element = document.getElementById("pdf");
      var opt = {
        margin: [0, 0],
        filename: `hores`,
        html2canvas: { dpi: 300, letterRendering: false, scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
      };
      const pdf = html2pdf()
        .set(opt)
        .from(element);

      // await pdf.save(opt.filename, { returnPromise: true })

      pdf
        .toPdf()
        .get("pdf")
        .then(function(pdf) {
          window.open(pdf.output("bloburl", "hores.pdf"));
        });

      // const pdf = document.getElementById("pdf");
      // html2pdf()
      //   .from(pdf)
      //   .save();
    },
    filteredProjects(projectNameSearch) {      
      // active & not mother
      const projects = this.projects
            .filter(p => p.project_state && p.project_state.can_assign_activities === true)
            .filter(
              p =>
                p.mother === null ||
                (p.mother !== null && p.mother.id && p.mother.id !== p.id)
            );
      return projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(projectNameSearch.toLowerCase()) >= 0
        );
      });
    },
    async projectChanged(activity, i) {      
      console.log('projectChanged activity', activity)
      if (activity.project) {
        const item = {
          hours: moment(activity.hour_out, "HH:mm:ss").diff(
            moment(activity.hour_in, "HH:mm:ss"), 'hours', true
          ),
          date: activity.date,
          users_permissions_user: this.user,
          project: activity.project,
        }
        if (activity.activity && activity.activity.id) {
          await service({ requiresAuth: true }).put(
            `activities/${activity.activity.id || activity.activity}`,
            item
          );          
        } else {
          const newActivity = await service({ requiresAuth: true }).post("activities", item);
          activity.activity = newActivity.data;
          this.saveActivity(activity, i, true, false);
        }
        
      } else if (activity.activity) {
        await service({ requiresAuth: true }).delete(
          `activities/${activity.activity.id || activity.activity}`
        );
        activity.activity = null;
        this.saveActivity(activity, i, true, false);
      }
      // if (activity.projectNameSearch === '') {
      //   activity.project = null
      // }
    }
  },
  filters: {
    formatHour(val) {
      if (!val) {
        return "-";
      }
      return moment(val, "HH:mm:ss").format("HH:mm");
    },
    formatMonthName(dt) {
      return moment(dt)
        .format("MMMM")
        .toUpperCase();
    },
    formatHourMonth(m) {
      if (m && m.m) {
        m.m = Math.abs(m.m);
        return `${parseInt(m.m / 60)}h ${m.m - parseInt(m.m / 60) * 60}m`;
      }
      return "0h";
    },
    formatHourDiff(activity) {
      if (!activity.hour_in || !activity.hour_out) {
        return "0h";
      }
      const hours =
        -1 *
        moment(activity.hour_in, "HH:mm:ss").diff(
          moment(activity.hour_out, "HH:mm:ss"),
          "hours"
        );
      const minutes =
        -1 *
        moment(activity.hour_in, "HH:mm:ss").diff(
          moment(activity.hour_out, "HH:mm:ss"),
          "minutes"
        );

      return `${hours}h ${minutes - hours * 60}m`;
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

.time-part-input {
  max-width: 100px;
  margin-top: -4px;
}

.invoice-box-container {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
  border: 1px solid #eee;
  width: 100%;
  max-width: 800px;
  margin-top: 3rem;
}
.invoice-box {
  max-width: 800px;
  margin: auto;
  padding: 30px;
  font-size: 12px;
  line-height: 24px;
  font-family: sans-serif, "Helvetica Neue", "Helvetica", Helvetica, Arial,
    sans-serif;
  color: #222;
  background: #fff;
}

.invoice-box table {
  width: 100%;
  line-height: inherit;
  text-align: left;
}
tr.bordered-2t th,
tr.bordered-2t td {
  border-top: 2px solid #000;
}
tr.bordered-2 th,
tr.bordered-2 td {
  border-bottom: 2px solid #000;
}
tr.is-total td {
  border-bottom: 1px solid #000;
  border-top: 1px solid #000;
}
.mt-40 {
  margin-top: 40px;
}
</style>

<style lang="postcss"></style>
