<template>
  <div>
    <modal-box
      :is-active="isModalActive"
      :trash-object-name="trashObjectName"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />
    <modal-box-dedication
      :is-active="isModalEditActive"
      :dedication-object="dedicationObject"
      :projects="projects"
      :users="users"
      :counter="counterClicked ? counter : null"
      @submit="modalSubmit"
      @cancel="modalCancel"
      @delete="modalDelete"
      @counter-continue="counterContinue"
    />
    <modal-box-festive
      :is-active="isModalFestiveActive"
      :festive-object="festiveObject"
      :users="users"
      :festive-types="festiveTypes"
      @submit="modalFestiveSubmit"
      @cancel="modalFestiveCancel"
      @delete="modalFestiveDelete"
    />
    <modal-box-move-project
      :is-active="isModalMoveToProject"
      :projects="projects"
      @submit="modalMoveToProjectSubmit"
      @cancel="modalMoveToProjectCancel"
    />
    <card-component class="has-table has-mobile-sort-spaced">
      <div class="card-body is-total">
        <div class="columns">
          <div class="column is-4 has-text-weight-bold">
            Total
            <!-- <download-csv :data="activitiesJSON">
              <b-button
              class="zview-button"
              :type="'is-disabled'"
              icon-left="file-excel" />
            </download-csv> -->
          </div>
          <div class="column is-3 has-text-weight-bold">{{ superTotal }} h</div>
          <div class="column is-5 has-text-right">
            <b-button
              @click="viewType = 'all'"
              title="Vista completa"
              class="view-button"
              :type="viewType == 'all' ? 'is-primary' : 'is-disabled'"
              icon-left="table-headers-eye-off"
            />
            <b-button
              @click="viewType = 'calendar'"
              title="Vista calendari"
              class="view-button"
              :type="viewType == 'calendar' ? 'is-primary' : 'is-disabled'"
              icon-left="calendar"
            />
            <b-button
              @click="viewType = 'table'"
              title="Vista taula"
              class="view-button"
              :type="viewType == 'table' ? 'is-primary' : 'is-disabled'"
              icon-left="table-large"
            />
            <span class="separator"></span>
            <download-excel class="export view-button" :data="activitiesJSON">
              <b-button
                title="Exporta dades"
                class="zview-button"
                :type="'is-disabled'"
                icon-left="file-excel"
              />
            </download-excel>
            <span class="separator"></span>
            <b-button
              title="Vista persona"
              @click="colorTypeChanged('user')"
              class="view-button"
              :type="colorType == 'user' ? 'is-primary' : 'is-disabled'"
              icon-left="account"
            />
            <b-button
              title="Vista projecte"
              @click="colorTypeChanged('project')"
              class="view-button"
              :type="colorType == 'project' ? 'is-primary' : 'is-disabled'"
              icon-left="wrench"
            />
            <span class="separator"></span>
            <b-button
              title="Importar des de calendari *.ics"
              @click="importFromCalendar"
              class="view-button is-warning"
              :disabled="!user"
              :loading="isLoadingImport"
              icon-left="download"
            />
            <b-button
              title="Moure hores entre projectes"
              @click="showModalMoveToProject"
              class="view-button is-warning"
              :disabled="!project"
              :loading="isLoadingMove"
              icon-left="swap-horizontal"
            />
            <b-button
              title="Afegir festiu"
              @click="showModalFestive(null)"
              class="view-button is-warning"
              icon-left="calendar-star"
            />
            <b-button
              id="time-counter-button"
              title="Començar dedicació"
              @click="showModalCounter"
              class="view-button is-warning"
              icon-left="clock-outline"
            />
            <b-button
              title="Afegir dedicació"
              @click="showModal(null)"
              class="view-button is-warning"
              icon-left="plus"
            />
          </div>
        </div>
      </div>
    </card-component>

    <card-component class="has-table has-mobile-sort-spaced" v-if="counter">
      <div
        class="card-body is-total zhas-text-danger clickable"
        @click="showModalCounter"
      >
        <div class="columns">
          <div class="column is-4 has-text-weight-bold has-text-danger">
            <b-icon icon="clock-outline" />
            Activitat actual
          </div>
          <div class="column is-3 has-text-weight-bold">
            <time-counter :counter="counter" @update="updateCounter" />
          </div>
          <div class="column is-5">
            {{ counter.project ? counter.project.name : "" }}<br />
            {{ counter.description ? counter.description : "" }}
          </div>
        </div>
      </div>
    </card-component>

    <v-calendar
      ref="calendar"
      locale="ca"
      class="custom-calendar max-w-full mb-5"
      :first-day-of-week="2"
      :masks="masks"
      :attributes="attributes"
      @update:from-page="pageChange"
      title-position="left"
      is-expanded
      v-if="viewType == 'all' || viewType == 'calendar'"
    >
      <template v-slot:day-content="{ day, attributes }">
        <div class="flex flex-col h-full z-10 overflow-hidden">
          <span
            class="day-label text-sm text-gray-900"
            @click="dayClicked(day)"
            >{{ day.day }}</span
          >
          <span
            class="day-sum-label text-sm text-gray-900 week-total"
            v-if="day && day.weekdayPosition === 7"
            >Setmana: {{ weekSum(day.isoWeeknumber) }}h</span
          >
          <span
            class="day-sum-label text-sm text-gray-900"
            v-if="daySum(attributes)"
            >{{ daySum(attributes) }}h</span
          >
          <div class="flex-grow overflow-y-auto overflow-x-auto">
            <span
              v-for="attr in attributes"
              :key="attr.key"
              class="
                text-xs
                leading-tight
                rounded-sm
                p-1
                mt-0
                mb-1
                tag tag-hours
              "
              :class="attr.customData ? attr.customData.class : null"
              :style="{
                backgroundColor: attr.customData
                  ? attr.customData.bg_project
                  : 'transparent',
              }"
            >
              <span
                v-if="attr.customData && attr.customData.type === 'activity'"
                @click="showModal(attr.customData.a)"
              >
                {{ attr.customData.project }} - {{ attr.customData.username }}
                {{ attr.customData.hours ? `- ${attr.customData.hours}h` : "" }}
              </span>
              <span
                v-if="attr.customData && attr.customData.type === 'festive'"
                @click="showModalFestive(attr.customData.a)"
              >
                {{ attr.customData.project }} - {{ attr.customData.username }}
                {{ attr.customData.hours ? `- ${attr.customData.hours}h` : "" }}
              </span>
              <span
                v-if="attr.customData && attr.customData.type === 'ical'"
                @click="showModalICal(attr)"
              >
                {{ attr.customData.project }} - {{ attr.customData.username }}
                {{ attr.customData.hours ? `- ${attr.customData.hours}h` : "" }}
              </span>
            </span>
          </div>
        </div>
      </template>
    </v-calendar>

    <!-- <week-calendar :events="events"></week-calendar> -->

    <div class="table-view" v-if="viewType == 'all' || viewType == 'table'">
      <card-component
        class="has-table has-mobile-sort-spaced"
        v-for="(d, i) in distinctDaysObj"
        v-bind:key="i"
      >
        <div
          v-for="(a, j) in d.activities"
          v-bind:key="j"
          class="card-body"
          :class="{
            'is-total': a.project.name === 'Total',
            'is-activity': a.project.name !== 'Total',
          }"
        >
          <div class="columns">
            <div
              class="column is-4"
              :class="{ 'has-text-weight-bold': a.project.name === 'Total' }"
              @click="showModal(a)"
            >
              <span class="is-total" v-if="a.project.name === 'Total'">
                {{ d.day | formatTitle }}
              </span>
              <span v-else>
                {{ a.project && a.project.name ? a.project.name : "" }}
              </span>
              <div class="auxiliar">
                {{ a.description ? a.description : "" }}
              </div>
            </div>
            <div
              class="column"
              :class="{ 'has-text-weight-bold': a.project.name === 'Total' }"
              @click="showModal(a)"
            >
              {{
                a.users_permissions_user && a.users_permissions_user.username
                  ? a.users_permissions_user.username
                  : ""
              }}
            </div>
            <div
              class="column"
              :class="{ 'has-text-weight-bold': a.project.name === 'Total' }"
              @click="showModal(a)"
            >
              {{ a.hours.toFixed(2) }} h
            </div>
            <div
              class="column auxiliar"
              :class="{ 'has-text-weight-bold': a.project.name === 'Total' }"
              @click="showModal(a)"
            >
              <div>{{ a.dedication_type ? a.dedication_type.name : "" }}</div>
              <div v-if="a.activity_type && a.activity_type.id">
                {{ a.activity_type ? a.activity_type.name : "" }}
              </div>
              <div v-if="a.task && a.task.id">
                {{ a.task ? a.task.name : "" }}
              </div>
            </div>
            <div
              class="column is-2"
              :class="{ 'has-text-weight-bold': a.project.name === 'Total' }"
              @click="trashModal(a)"
            >
              <b-button
                label="Esborra"
                type="is-danger"
                icon-left="close"
                v-if="a.project.name !== 'Total' && !a.invoiced"
              />
            </div>
          </div>
        </div>
      </card-component>
    </div>
  </div>
</template>

<script>
import ModalBox from "@/components/ModalBox";
import service from "@/service/index";
import uniq from "lodash/uniq";
import map from "lodash/map";
import sumBy from "lodash/sumBy";
import sum from "lodash/sum";
import orderBy from "lodash/orderBy";
import moment from "moment";
import CardComponent from "@/components/CardComponent";
import TimeCounter from "@/components/TimeCounter";
import * as chartConfig from "@/components/Charts/chart.config";
import ModalBoxDedication from "@/components/ModalBoxDedication";
import ModalBoxFestive from "@/components/ModalBoxFestive";
import ModalBoxMoveProject from "@/components/ModalBoxMoveProject";
import { mapState } from "vuex";
import ical from "node-ical";

window.setImmediate = window.setTimeout;
// import WeekCalendar from "./week-calendar.vue"

moment.locale("ca");

export default {
  name: "DedicationInput",
  components: {
    ModalBox,
    CardComponent,
    ModalBoxDedication,
    TimeCounter,
    ModalBoxFestive,
    ModalBoxMoveProject,
  },
  props: {
    user: {
      type: Number,
      default: null,
    },
    users: {
      type: Array,
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
    last: {
      type: Boolean,
      default: false,
    },
    projects: {
      type: Array,
    },
  },
  data() {
    return {
      moving: false,
      firstTime: true,
      isModalActive: false,
      isModalEditActive: false,
      dedicationObject: null,
      festiveObject: null,
      isModalFestiveActive: false,
      isModalMoveToProject: false,
      trashObject: null,
      activities: [],
      activitiesJSON: [],
      isLoading: false,
      paginated: false,
      perPage: 10,
      checkedRows: [],
      distinctDays: [],
      distinctDaysObj: [],
      distinctTotals: [],
      distinctProjects: [],
      distinctProjectsObj: [],
      distinctUsers: [],
      distinctUsersObj: [],
      hoursTotal: 0,
      defaultChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsMain,
      },
      pieChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsPie,
      },
      usersChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsPie,
      },
      viewType: "all",
      colorType: "project",
      masks: {
        weekdays: "WWW",
      },
      attributes: [],
      counter: null,
      counterClicked: false,
      counterDisplayTime: "",
      counterDisplayTimeInHours: "",
      counterInterval: 0,
      updateCounterCount: 0,
      festiveTypes: [],
      zevents: {
        "2022-05-27": [{ title: "Rehearsal", url: "http://www.google.com" }],
      },
      icalEvents: [],
      isLoadingImport: false,
      icalVisible: false,
      isLoadingMove: false
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
      return sumBy(this.activities, "hours").toFixed(2);
    },
    ...mapState(["me", "userName"]),
    counterTime() {
      if (this.counter === null) {
        return 0;
      }
      const startTime = moment(this.counter.start, "YYYY-MM-DDTHH:mm:ss.000Z");
      const endTime = moment();
      // const d = moment(this.counter, 'YYYY-MM-DD HH:mm:ss')
      var duration = moment.duration(endTime.diff(startTime));
      var hours = parseInt(duration.asHours());
      var minutes = parseInt(duration.asMinutes()) % 60;
      var seconds = parseInt(duration.asSeconds()) % 3600;

      var hoursDiff = endTime.diff(startTime, "hours") - hours;
      var minutesDiff = endTime.diff(startTime, "minutes") - hours * 60;
      var secondsDiff =
        endTime.diff(startTime, "seconds") - hours * 60 * 60 - minutes * 60;

      return (
        hours +
        "h " +
        minutes +
        " m " +
        seconds +
        "s" +
        " -----" +
        `${hoursDiff}h ${minutesDiff}m  ${secondsDiff}s`
      );
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
    project: function (newVal, oldVal) {
      this.getActivities();
    },
    last: function (newVal, oldVal) {
      this.getActivities();
    },
    projects: function (newVal, oldVal) {
      this.getActivities();
    },
  },
  async mounted() {
    // console.log('mounted')
    this.getActivities();
    // this.users = (await service({ requiresAuth: true }).get('users')).data.filter(u => u.hidden !== true)
    this.festiveTypes = (
      await service({ requiresAuth: true }).get("festive-types")
    ).data;
  },
  methods: {
    async getActivities() {
      this.isLoading = true;
      if (
        !this.date1 ||
        !this.date2 ||
        !this.projects ||
        !this.projects.length
      ) {
        return;
      }
      const from = moment(this.date1).format("YYYY-MM-DD");
      const to = moment(this.date2).format("YYYY-MM-DD");
      const calendar = this.$refs.calendar;
      this.moving = true;
      if (calendar) {
        await calendar.move({
          month: parseInt(moment(this.date1).format("M")),
          year: parseInt(moment(this.date1).format("YYYY")),
        });
      }
      this.moving = false;

      let festivesQuery = `festives?_where[date_gte]=${from}&[date_lte]=${to}&_limit=-1`;

      const festives = (
        await service({ requiresAuth: true }).get(festivesQuery)
      ).data;
      const userFestives = festives.filter(
        (f) =>
          f.users_permissions_user == null ||
          (f.users_permissions_user &&
            f.users_permissions_user.id === this.user)
      );

      let query = `activities?_where[date_gte]=${from}&[date_lte]=${to}`;
      if (this.last) {
        query = `activities?_where[updated_at_gte]=${moment()
          .add(-7, "days")
          .format("YYYY-MM-DD")}`;
      }
      if (this.user) {
        query = `${query}&[users_permissions_user.id]=${this.user}`;
      }
      if (this.project) {
        query = `${query}&[project.id]=${this.project}`;
      }
      query = `${query}&_limit=-1`;
      service({ requiresAuth: true })
        .get(query)
        .then((r) => {
          this.activities = r.data.filter((a) => a.project && a.project.id);
          this.hoursTotal = sumBy(this.activities, "hours");
          this.distinctDays = uniq(map(this.activities, "date"));
          this.distinctDays.sort();
          this.distinctDaysObj = orderBy(
            this.distinctDays.map((d) => {
              const activities = this.activities.filter((a) => a.date === d);
              const hours = sumBy(activities, "hours");
              activities.unshift({
                id: "Total",
                project: { name: "Total" },
                hours: hours,
              });
              return { day: d, activities: activities, hours: hours };
            }),
            ["day"],
            ["desc"]
          );
          this.distinctTotals = this.distinctDaysObj.map((d) => {
            return { day: d.day, hours: d.hours };
          });
          this.distinctProjects = uniq(map(this.activities, "project.name"));
          this.distinctProjectsObj = this.distinctProjects.map((p) => {
            const activities = this.activities.filter(
              (a) => a.project && a.project.name === p
            );
            const hours = sumBy(activities, "hours");
            return {
              name: p,
              hours: hours,
              pct:
                this.hoursTotal > 0
                  ? parseFloat(((hours / this.hoursTotal) * 100).toFixed(2))
                  : 0,
            };
          });
          this.distinctUsers = uniq(
            map(this.activities, "users_permissions_user.username")
          );
          this.distinctUsersObj = this.distinctUsers.map((p) => {
            const activities = this.activities.filter(
              (a) =>
                (p &&
                  a.users_permissions_user &&
                  a.users_permissions_user.username === p) ||
                (!p && !a.users_permissions_user)
            );
            const hours = sumBy(activities, "hours");
            return {
              name: p,
              hours: hours,
              pct:
                this.hoursTotal > 0
                  ? parseFloat(((hours / this.hoursTotal) * 100).toFixed(2))
                  : 0,
            };
          });

          this.attributes = this.activities.map((a, i) => {
            return {
              key: i + 1,
              customData: {
                a: a,
                bg_project:
                  this.colorType === "user"
                    ? this.getChartColor(
                        this.distinctUsers.findIndex(
                          (p) => p === a.users_permissions_user.username
                        )
                      )
                    : this.getChartColor(
                        this.distinctProjects.findIndex(
                          (p) => a.project && p === a.project.name
                        )
                      ),
                class: "tag zis-primary",
                project: a.project ? a.project.name : "",
                username: a.users_permissions_user.username,
                hours: a.hours,
                type: "activity",
              },
              dates: a.date,
            };
          });
          this.attributes.unshift({
            key: "today",
            highlight: "red",
            dates: new Date(),
          });
          const len = this.activities.length;
          userFestives.forEach((f, i) => {
            this.attributes.push({
              key: len + i + 1,
              customData: {
                a: f,
                bg_project: "#f03a5f",
                class: "tag zis-primary",
                project: f.festive_type ? f.festive_type.name : "Festiu",
                username: f.users_permissions_user
                  ? f.users_permissions_user.username
                  : "TOTES",
                hours: 0,
                type: "festive",
              },
              dates: f.date,
            });
          });

          this.getCounters();

          if (this.icalEvents.length && this.icalVisible) {
            this.showICalEvents();
          }

          this.isLoading = false;
          this.firstTime = true;
          this.activitiesJSON = this.activities.map((a) => {
            const project =
              a.project && a.project.id
                ? this.projects.find((p) => p.id === a.project.id)
                : null;
            const client =
              project && project.clients && project.clients.length > 0
                ? project.clients[0].name
                : null;
            return {
              date: a.date,
              project: a.project ? a.project.name : "",
              username: a.users_permissions_user.username,
              hours: a.hours,
              description: a.description,
              activity: a.activity_type ? a.activity_type.name : "",
              type: a.dedication_type ? a.dedication_type.name : "",
              client: client,
            };
          });
        });
    },
    async getCounters() {
      if (this.counter === null) {
        const resp = await service({ requiresAuth: true }).get(
          `time-counters?_where[users_permissions_user.username]=${this.userName}`
        );
        const counters = resp.data;
        if (resp.data && resp.data.length) {
          this.counter = resp.data[0];
          this.showModalCounter();
        }
      }
    },
    trashModal(trashObject) {
      this.trashObject = trashObject;
      this.isModalActive = true;
    },
    async trashConfirm() {
      this.isModalActive = false;

      await service({ requiresAuth: true }).delete(
        `activities/${this.trashObject.id}`
      );

      this.getActivities();

      this.$buefy.snackbar.open({
        message: "Esborrat",
        queue: false,
      });
    },
    trashCancel() {
      this.isModalActive = false;
    },
    fillChartData() {
      this.defaultChart.chartData = null;
      const chartData = {};
      const labels = [];
      this.distinctDays.forEach((d, i) => {
        labels.push(d);
        const datasets = [];
        this.distinctProjects.forEach((p, j) => {
          datasets.push({
            label: p,
            backgroundColor: this.getChartColor(j),
            data: this.distinctDays.map((dd) => {
              return sumBy(
                this.activities.filter(
                  (a) => a.project && a.project.name === p && a.date === dd
                ),
                "hours"
              );
            }),
          });
        });
        chartData.labels = labels;
        chartData.datasets = datasets;
      });
      this.defaultChart.chartData = chartData;

      // this.pieChart.chartData = {
      //   datasets: [
      //     {
      //       data: this.distinctProjectsObj.map(d => { return d.hours }),
      //       backgroundColor: this.someChartColors(this.distinctProjects.length)
      //     }
      //   ],
      //   labels: this.distinctProjects
      // }

      // this.usersChart.chartData = {
      //   datasets: [
      //     {
      //       data: this.distinctUsersObj.map(d => { return d.hours }),
      //       backgroundColor: this.someChartColors(this.distinctUsers.length)
      //     }
      //   ],
      //   labels: this.distinctUsers
      // }
    },
    someChartColors(n) {
      const data = [];
      for (let i = 0; i <= n; i++) {
        data.push(chartConfig.chartDataColors[i]);
      }
      return data;
    },
    getChartColor(n) {
      return chartConfig.chartDataColors[n];
    },
    showModal(activity) {
      // console.log('activity', activity)

      this.counterClicked = false;
      if (activity) {
        activity.counter = null;
        this.dedicationObject = activity;
      } else {
        this.dedicationObject = null;
      }
      this.isModalEditActive = true;
    },
    showModalFestive(festive) {
      if (
        (festive &&
          festive.festive_type &&
          festive.festive_type.personal === true) ||
        festive === null
      ) {
        this.festiveObject = festive;
        this.isModalFestiveActive = true;
      } else {
        this.$buefy.snackbar.open({
          message: "No es poden editar els festius globals",
          queue: false,
        });
      }
    },
    showModalMoveToProject() {
      this.isModalMoveToProject = true;
    },
    showModalICal(event) {
      const project = this.project
        ? this.projects.find((p) => p.id === this.project)
        : null;
      const activity = {
        date: event.customData.a.start,
        hours: event.customData.hours,
        description: event.customData.a.summary,
        project: project,
        uid_ical: event.customData.a.uid,
      };

      // console.log('activity', activity)

      this.counterClicked = false;
      if (activity) {
        activity.counter = null;
        this.dedicationObject = activity;
      } else {
        this.dedicationObject = null;
      }
      this.isModalEditActive = true;
    },
    async showModalCounter() {
      if (this.counter === null) {
        const userId = this.users.find((u) => u.username === this.userName);
        const counterResp = await service({ requiresAuth: true }).post(
          `time-counters`,
          {
            start: moment().format("YYYY-MM-DD HH:mm:ss"),
            users_permissions_user: userId,
          }
        );
        if (counterResp.data && counterResp.data.id) {
          this.counter = counterResp.data;
        }
      }
      this.counterClicked = true;
      // this.showModal(null)
      this.dedicationObject = null;
      this.isModalEditActive = true;
    },
    async modalSubmit(activity) {
      if (activity.counter) {
        await service({ requiresAuth: true }).delete(
          `time-counters/${activity.counter.id}`
        );
        this.counter = null;
      }
      this.counterClicked = false;
      // console.log('activity dt', moment(activity.date).format('YYYY-MM-DD'))
      const activity2 = { ...activity };
      activity2.date = moment(activity.date).format("YYYY-MM-DD");
      activity2.hours = activity.hours
        ? activity.hours.toString().replace(",", ".")
        : activity.hours;
      this.isModalEditActive = false;

      try {
        if (activity.id) {
          await service({ requiresAuth: true }).put(
            `activities/${activity.id}`,
            activity2
          );
        } else {
          await service({ requiresAuth: true }).post("activities", activity2);
        }
      } catch (err) {
        console.error("activities error", err);
        this.$buefy.snackbar.open({
          message: "Error",
          queue: false,
        });
      }

      await this.getActivities();
      if (this.icalVisible) {
        await this.importFromCalendar();
      }

      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false,
      });
    },
    async modalDelete(activity) {
      if (activity.id) {
        await service({ requiresAuth: true }).delete(
          `activities/${activity.id}`
        );
        this.isModalEditActive = false;
        this.getActivities();
        this.$buefy.snackbar.open({
          message: "Esborrat",
          queue: false,
        });
      } else if (activity.counter && activity.counter.id) {
        this.counterClicked = false;
        await service({ requiresAuth: true }).delete(
          `time-counters/${activity.counter.id}`
        );
        this.isModalEditActive = false;
        this.$buefy.snackbar.open({
          message: "Esborrat",
          queue: false,
        });
        this.counter = null;
      }
    },
    modalCancel() {
      this.counterClicked = false;
      this.isModalEditActive = false;
    },
    pageChange(page) {
      if (!this.moving) {
        this.$emit("calendar-changed", { year: page.year, month: page.month });
      }
    },
    colorTypeChanged(colorType) {
      if (this.colorType !== colorType) {
        this.colorType = colorType;
        this.getActivities();
      }
    },
    dayClicked(day) {
      // console.log('day', day)
      // console.log('mm', moment(day.date).format('YYYY-MM-DD'))
      this.showModal({ date: moment(day.date).format("YYYY-MM-DD") });
    },
    daySum(attributes) {
      if (!attributes || (attributes && attributes.length === 0)) {
        return false;
      }
      return sumBy(
        attributes.map((a) => {
          return { hours: a.customData ? a.customData.hours : 0 };
        }),
        "hours"
      ).toFixed(2);
    },
    weekSum(weekNumber) {
      const weekActivities = this.attributes
        .filter(
          (a) =>
            moment(a.dates, "YYYY-MM-DD").isoWeek() == weekNumber &&
            a.customData &&
            a.customData.hours
        )
        .map((a) => {
          return { ...a, weekNumber: moment(a.dates, "YYYY-MM-DD").isoWeek() };
        });
      const weeksum = sumBy(weekActivities, (a) => a.customData.hours);
      return weeksum.toFixed(2);
    },
    async counterContinue(info) {
      if (info) {
        await service({ requiresAuth: true }).put(
          `time-counters/${this.counter.id}`,
          { project: info.project, description: info.description }
        );
        this.counter.project = this.projects.find((p) => p.id === info.project);
        this.counter.description = info.description;
      }
      this.counterClicked = false;
      this.isModalEditActive = false;
    },
    updateCounter() {
      this.updateCounterCount++;
      const button = document.getElementById("time-counter-button");
      if (button && this.updateCounterCount % 2 == 0) {
        button.classList.toggle("is-danger");
      }
      if (this.updateCounterCount == 10) {
        this.updateCounterCount = 0;
      }
    },
    async modalFestiveSubmit(festive) {
      const festive2 = { ...festive };
      festive2.date = moment(festive.date).format("YYYY-MM-DD");
      this.isModalFestiveActive = false;

      try {
        if (festive.id) {
          await service({ requiresAuth: true }).put(
            `festives/${festive.id}`,
            festive2
          );
        } else {
          const diff = festive.endDate
            ? moment(festive.endDate).diff(festive.date, "days") + 1
            : 1;
          for (let i = 0; i < diff; i++) {
            const day = moment(festive.date).add(i, "days").day();
            if (day !== 6 && day !== 0) {
              festive2.date = moment(festive.date)
                .add(i, "days")
                .format("YYYY-MM-DD");
              await service({ requiresAuth: true }).post("festives", festive2);
            }
          }
        }
      } catch (err) {
        console.error("activities error", err);
        this.$buefy.snackbar.open({
          message: "Error",
          queue: false,
        });
      }

      this.getActivities();

      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false,
      });
    },
    async modalFestiveCancel() {
      this.isModalFestiveActive = false;
    },
    async modalFestiveDelete(festive) {
      if (festive.id) {
        await service({ requiresAuth: true }).delete(`festives/${festive.id}`);
        this.isModalFestiveActive = false;
        this.getActivities();
        this.$buefy.snackbar.open({
          message: "Esborrat",
          queue: false,
        });
      }
    },
    async modalMoveToProjectSubmit(data) {
      console.log("modalMoveToProjectSubmit", data.project);
      this.isModalMoveToProject = false;
      this.isLoadingMove = true;
      const movedata = {
        user: this.user,
        from: this.project,
        to: data.project,
        start: moment(this.date1).format('YYYY-MM-DD'),
        end: moment(this.date2).format('YYYY-MM-DD'),
      };
      const moveResponse = (
        await service({ requiresAuth: true }).post(`activities/move`, movedata)
      ).data;

      this.isLoadingMove = false;      
      this.$buefy.snackbar.open({
        message: "Actualitzat!",
        queue: false,
      });
      this.getActivities();

      
    },
    async modalMoveToProjectCancel() {
      this.isModalMoveToProject = false;
    },
    async importFromCalendar() {
      if (this.user) {
        const user = this.users.find((u) => u.id === this.user);
        if (!user.ical || !user.ical.startsWith("http")) {
          this.$buefy.toast.open({
            message: `La usuària no te un calendari de tipus iCal definit. Contacta amb l'administradora per fer servir aquesta funcionalitat`,
            type: "is-danger",
          });
          return;
        } else if (this.icalEvents.length) {
          this.icalVisible = true;
          this.showICalEvents();
        } else {
          this.isLoadingImport = true;
          this.icalVisible = true;
          const icalEvents = (
            await service({ requiresAuth: true }).get(
              `activities/import-calendar/${this.user}`
            )
          ).data;
          if (icalEvents.ical && icalEvents.ical.length) {
            this.icalEvents = icalEvents.ical;
            this.showICalEvents();

            this.$buefy.snackbar.open({
              message:
                "Atenció. Has d'assignar projectes a les hores del calendari",
              queue: false,
            });

            this.$buefy.toast.open({
              message: `Atenció. Has d'assignar projectes a les hores del calendari`,
              type: "is-danger",
            });
          }

          this.isLoadingImport = false;
        }
      }
    },
    showICalEvents() {
      if (!this.user) {
        return;
      }
      const user = this.users.find((u) => u.id === this.user);
      this.icalEvents.forEach((event) => {
        if (
          moment(event.start).isAfter(moment(this.date1)) &&
          moment(event.end).isBefore(moment(this.date2))
        ) {
          // filter already used events
          const attr = this.attributes.find(
            (a) =>
              a.customData &&
              a.customData.type === "activity" &&
              a.customData.a &&
              a.customData.a.uid_ical === event.uid
          );
          if (!attr) {
            // add to calendar
            this.attributes.push({
              key: event.uid,
              customData: {
                bg_project: "#17191E",
                class: "tag tag-blink",
                project: event.summary,
                username: user.username,
                hours:
                  moment(event.end).diff(moment(event.start), "minutes") / 60,
                type: "ical",
                a: event,
              },
              dates: event.start,
            });
          }
        }
      });
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
  color: #fff;
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
.export {
  display: inline-block;
}
.day-sum-label {
  float: right;
  font-size: 12px;
  color: #999;
  padding-top: 3px;
}
.week-total {
  position: absolute;
  bottom: 0;
  right: 4px;
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
.tag-blink {
  animation: blink 5s infinite;
}
@keyframes blink {
  0% {
    background-color: #17191e;
  }
  50% {
    background-color: #aaa;
  }

  100% {
    background-color: #17191e;
  }
}
</style>
