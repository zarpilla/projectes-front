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
      :saving="saving"
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

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>
    <b-loading
      :is-full-page="true"
      v-model="isLoadingImport"
      :can-cancel="false"
    ></b-loading>
    <b-loading
      :is-full-page="true"
      v-model="isLoadingMove"
      :can-cancel="false"
    ></b-loading>

    <!-- Redesign A: total, views and actions in one labelled toolbar
         (titles kept: the e2e tests use them) -->
    <div class="hours-toolbar">
      <div class="hours-total">
        <span>Total</span>
        <b>{{ formatHours(superTotal) }}</b>
      </div>
      <div class="segmented" role="group" aria-label="Vista">
        <button type="button" title="Vista calendari" :class="{ 'is-on': viewType == 'calendar' }" :aria-pressed="viewType == 'calendar' ? 'true' : 'false'" @click="viewType = 'calendar'">Calendari</button>
        <button type="button" title="Vista taula" :class="{ 'is-on': viewType == 'table' }" :aria-pressed="viewType == 'table' ? 'true' : 'false'" @click="viewType = 'table'">Taula</button>
        <button type="button" title="Vista completa" :class="{ 'is-on': viewType == 'all' }" :aria-pressed="viewType == 'all' ? 'true' : 'false'" @click="viewType = 'all'">Tot</button>
      </div>
      <div class="segmented" role="group" aria-label="Colors per">
        <button type="button" title="Vista persona" :class="{ 'is-on': colorType == 'user' }" :aria-pressed="colorType == 'user' ? 'true' : 'false'" @click="colorTypeChanged('user')">Per persona</button>
        <button type="button" title="Vista projecte" :class="{ 'is-on': colorType == 'project' }" :aria-pressed="colorType == 'project' ? 'true' : 'false'" @click="colorTypeChanged('project')">Per projecte</button>
      </div>
      <div class="hours-actions">
        <download-excel name="hores-dedicades" class="export" :data="activitiesJSON">
          <b-button size="is-small" title="Exporta dades" icon-left="download">Exporta</b-button>
        </download-excel>
        <b-button
          size="is-small"
          title="Importar des de calendari *.ics"
          :disabled="!user"
          :loading="isLoadingImport"
          icon-left="calendar-import"
          @click="importFromCalendar(true)"
        >Importa .ics</b-button>
        <b-button
          size="is-small"
          title="Moure hores entre projectes"
          :disabled="!project"
          :loading="isLoadingMove"
          icon-left="swap-horizontal"
          @click="showModalMoveToProject"
        >Mou hores</b-button>
        <b-button size="is-small" title="Afegir festiu" icon-left="calendar-star" @click="showModalFestive(null)">Festiu</b-button>
        <b-button id="time-counter-button" size="is-small" title="Començar dedicació" icon-left="clock-outline" @click="showModalCounter">Comptador</b-button>
        <b-button type="is-primary" title="Afegir dedicació" icon-left="plus" @click="showModal(null)">Afegeix hores</b-button>
      </div>
    </div>

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

    <p v-if="needsPerson" class="notification is-light">Tria una persona, o «Totes», per veure'n les hores.</p>
    <v-calendar
      ref="calendar"
      locale="ca"
      class="custom-calendar max-w-full mb-5"
      :first-day-of-week="2"
      :masks="masks"
      :attributes="attributes"
      @update:pages="pages => pageChange(pages[0])"
      title-position="left"
      expanded
      v-if="viewType == 'all' || viewType == 'calendar'"
    >
      <template v-slot:day-content="{ day, attributes }">
        <div class="flex flex-col h-full z-10 overflow-hidden" @click="dayTapped(day)">
          <span
            class="day-label text-sm text-gray-900"
            @click="dayClicked(day)"
            >{{ day.day }}</span
          >
          <span
            class="day-sum-label text-sm text-gray-900 week-total"
            v-if="day && (day.weekdayPosition === 7 || day.dayFromEnd === 1)"
            >Setmana: {{ weekSum(day.isoWeeknumber) }} h</span
          >
          <span
            class="day-sum-label text-sm text-gray-900"
            v-if="daySum(attributes)"
            >{{ daySum(attributes) }} h<span
              v-if="
                daySumPending(attributes) &&
                  daySumPending(attributes) !== daySum(attributes)
              "
            >
              / {{ daySumPending(attributes) }} h</span
            >
          </span>
          <!-- on a phone: one colour stripe per entry, the names are in the list below -->
          <span class="day-stripes" aria-hidden="true">
            <i
              v-for="attr in (attributes || []).filter(a => a.customData)"
              :key="attr.key"
              :class="{ 'is-pending': attr.customData.pending }"
              :style="{ backgroundColor: attr.customData.bg_project }"
            />
          </span>
          <div class="day-entries flex-grow overflow-y-auto overflow-x-auto">
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
                  : 'transparent'
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
    <!-- on a phone the month grid only shows stripes: the entries, listed by day -->
    <section
      v-if="(viewType == 'all' || viewType == 'calendar') && !needsPerson"
      class="hours-agenda"
      aria-label="Hores del mes per dia"
    >
      <p v-if="!agenda.length" class="agenda-empty">Cap hora en aquestes dates.</p>
      <div v-for="week in agenda" :key="week.key" class="agenda-week">
        <div class="agenda-week-title">
          <span>Setmana {{ week.week }}</span>
          <b>{{ hoursLabel(week.hours) }}</b>
        </div>
        <div
          v-for="d in week.days"
          :key="d.date"
          :id="'agenda-' + d.date"
          class="agenda-day"
          :class="{ 'is-today': d.date === today }"
        >
          <div class="agenda-day-title">
            <span class="agenda-day-name">{{ agendaDayTitle(d.date) }}</span>
            <span class="agenda-day-hours">{{ hoursLabel(d.hours) }}</span>
            <button
              type="button"
              class="agenda-add"
              :aria-label="'Afegeix hores el ' + agendaDayTitle(d.date)"
              @click="showModal({ date: d.date })"
            >
              <b-icon icon="plus" size="is-small" />
            </button>
          </div>
          <button
            v-for="e in d.entries"
            :key="e.key"
            type="button"
            class="agenda-entry"
            :class="{ 'is-pending': e.pending }"
            @click="openAgendaEntry(e)"
          >
            <i class="agenda-color" :style="{ backgroundColor: e.color }" />
            <span class="agenda-text">
              <span class="agenda-project">{{ e.project }}</span>
              <span v-if="e.type === 'festive' || !user || e.pending" class="agenda-sub">
                {{ e.type === "festive" ? "Festiu · " + e.username : e.pending ? "Calendari, per importar" : e.username }}
              </span>
            </span>
            <span v-if="e.type !== 'festive'" class="agenda-hours">{{ hoursLabel(e.hours) }}</span>
          </button>
        </div>
      </div>
    </section>


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
            'is-activity': a.project.name !== 'Total'
          }"
        >
          <div class="columns">
            <div
              class="column is-4"
              :class="{ 'has-text-weight-bold': a.project.name === 'Total' }"
              @click="showModal(a)"
            >
              <span class="is-total" v-if="a.project.name === 'Total'">
                {{ formatTitle(d.day) }}
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
              {{ hoursLabel(a.hours) }}
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
import ModalBox from "@/components/ModalBox.vue";
import service from "@/service/index";
import uniq from "lodash/uniq";
import map from "lodash/map";
import sumBy from "lodash/sumBy";
import sum from "lodash/sum";
import orderBy from "lodash/orderBy";
import moment from "moment";
import CardComponent from "@/components/CardComponent.vue";
import TimeCounter from "@/components/TimeCounter.vue";
import * as chartConfig from "@/components/Charts/chart.config";
import ModalBoxDedication from "@/components/ModalBoxDedication.vue";
import ModalBoxFestive from "@/components/ModalBoxFestive.vue";
import ModalBoxMoveProject from "@/components/ModalBoxMoveProject.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import { formatHours, formatNumber } from "@/helpers/format-number";

import { hoursAgenda } from "@/domain/hoursAgenda";
window.setImmediate = window.setTimeout;
// import WeekCalendar from "./week-calendar.vue"

moment.locale("ca");


const NO_PROJECT = "Sense projecte";
export default {
  name: "DedicationInput",
  emits: ["calendar-changed"],
  components: {
    ModalBox,
    CardComponent,
    ModalBoxDedication,
    TimeCounter,
    ModalBoxFestive,
    ModalBoxMoveProject
  },
  props: {
    user: {
      type: Number,
      default: null
    },
    users: {
      type: Array
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
    last: {
      type: Boolean,
      default: false
    },
    projects: {
      type: Array
    }
  },
  data() {
    return {
      moving: false,
      lastCalendarPage: null,
      firstTime: true,
      isModalActive: false,
      isModalEditActive: false,
      // a save of the hours modal is running: further clicks send nothing (issues/098)
      saving: false,
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
        extraOptions: chartConfig.chartOptionsMain
      },
      pieChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsPie
      },
      usersChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsPie
      },
      // the calendar: «Tot» renders a card per activity per day (~54.000 px a month, issues/070)
      viewType: "calendar",
      colorType: "project",
      masks: {
        weekdays: "WWW"
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
        "2022-05-27": [{ title: "Rehearsal", url: "http://www.google.com" }]
      },
      icalEvents: [],
      isLoadingImport: false,
      icalVisible: false,
      isLoadingMove: false,
      shouldImportFromCalendar: false
    };
  },
  computed: {
    // no person picked (not even «Totes», id 0): nobody's hours are loaded (issues/070)
    needsPerson() {
      return (this.user === null || this.user === undefined) && !this.last;
    // the list under the grid, on a phone
    agenda() {
      return hoursAgenda(this.attributes);
    },
    today() {
      return moment().format("YYYY-MM-DD");
    },
    },
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    },
    superTotal() {
      return this.activities && sumBy(this.activities, "hours")
        ? sumBy(this.activities, "hours").toFixed(2)
        : 0;
    },
    ...mapState(useMainStore, ["me", "userName"]),
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
    activeProjects() {
      return this.projects.filter(
        p => p.project_state && p.project_state.can_assign_activities === true
      );
    }
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
    project: function(newVal, oldVal) {
      this.getActivities();
    },
    last: function(newVal, oldVal) {
      this.getActivities();
    },
    projects: {
      handler (newVal, oldVal) {
        this.getActivities();
      },
      deep: 1
    }
  },
  async mounted() {
    this.getActivities();
    // this.users = (await service({ requiresAuth: true, cached: true }).get('users')).data.filter(u => u.hidden !== true)
    this.festiveTypes = (
      await service({ requiresAuth: true, cached: true }).get(
        "festive-types?_limit=-1"
      )
    ).data;
  },
  methods: {
    formatHours,
    async getActivities() {
      if (this.isLoading) {
        return;
      }
      this.isLoading = true;
      if (
        !this.date1 ||
        !this.date2 ||
        !this.projects ||
        !this.projects.length
      ) {
        this.isLoading = false;
        return;
      }
      if (this.needsPerson) {
        this.activities = [];
        this.isLoading = false;
        return;
      }
      const from = moment(this.date1).format("YYYY-MM-DD");
      const to = moment(this.date2).format("YYYY-MM-DD");
      const calendar = this.$refs.calendar;
      this.moving = true;
      if (calendar) {
        await calendar.move({
          month: parseInt(moment(this.date1).format("M")),
          year: parseInt(moment(this.date1).format("YYYY"))
        });
      }
      this.moving = false;

      let festivesQuery = `festives?_where[date_gte]=${from}&[date_lte]=${to}&_limit=-1`;

      const festives = (
        await service({ requiresAuth: true }).get(festivesQuery)
      ).data;
      const userFestives = festives.filter(
        f =>
          f.users_permissions_user == null ||
          (f.users_permissions_user &&
            f.users_permissions_user.id === this.user)
      );

      let query = `activities/calendar?_where[date_gte]=${from}&[date_lte]=${to}`;
      if (this.last) {
        query = `activities/calendar?_where[updated_at_gte]=${moment()
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
        .then(r => {
          // hours without a project count too, under «Sense projecte»: the
          // calendar and the totals left them out (issues/062)
          this.activities = r.data.map(a =>
            a.project && a.project.id ? a : { ...a, project: { id: null, name: NO_PROJECT } }
          );
          this.hoursTotal = sumBy(this.activities, "hours") || 0;
          this.distinctDays = uniq(map(this.activities, "date"));
          this.distinctDays.sort();
          this.distinctDaysObj = orderBy(
            this.distinctDays.map(d => {
              const activities = this.activities.filter(a => a.date === d);
              const hours = sumBy(activities, "hours");
              activities.unshift({
                id: "Total",
                project: { name: "Total" },
                hours: hours
              });
              return { day: d, activities: activities, hours: hours };
            }),
            ["day"],
            ["desc"]
          );
          this.distinctTotals = this.distinctDaysObj.map(d => {
            return { day: d.day, hours: d.hours };
          });
          this.distinctProjects = uniq(map(this.activities, "project.name"));
          this.distinctProjectsObj = this.distinctProjects.map(p => {
            const activities = this.activities.filter(
              a => a.project && a.project.name === p
            );
            const hours = sumBy(activities, "hours");
            return {
              name: p,
              hours: hours,
              pct:
                this.hoursTotal > 0
                  ? parseFloat(((hours / this.hoursTotal) * 100).toFixed(2))
                  : 0
            };
          });
          this.distinctUsers = uniq(
            map(this.activities, "users_permissions_user.username")
          );
          this.distinctUsersObj = this.distinctUsers.map(p => {
            const activities = this.activities.filter(
              a =>
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
                  : 0
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
                          p => p === (a.users_permissions_user && a.users_permissions_user.username)
                        )
                      )
                    : this.getChartColor(
                        this.distinctProjects.findIndex(
                          p => a.project && p === a.project.name
                        )
                      ),
                class: "tag zis-primary",
                project: a.project ? a.project.name : "",
                username: a.users_permissions_user ? a.users_permissions_user.username : "",
                hours: a.hours,
                type: "activity"
              },
              dates: a.date
            };
          });
          this.attributes.unshift({
            key: "today",
            highlight: "red",
            dates: new Date()
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
                type: "festive"
              },
              dates: f.date
            });
          });

          this.getCounters();

          if (this.icalEvents.length && this.icalVisible) {
            this.showICalEvents();
          }

          this.isLoading = false;
          this.firstTime = true;
          this.activitiesJSON = this.activities.map(a => {
            const project =
              a.project && a.project.id
                ? this.projects.find(p => p.id === a.project.id)
                : null;
            const client =
              project && project.clients && project.clients.length > 0
                ? project.clients[0].name
                : null;
            return {
              date: a.date,
              project: a.project ? a.project.name : "",
              username: a.users_permissions_user ? a.users_permissions_user.username : "",
              hours: a.hours,
              description: a.description,
              activity: a.activity_type ? a.activity_type.name : "",
              type: a.dedication_type ? a.dedication_type.name : "",
              client: client
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
        queue: false
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
            data: this.distinctDays.map(dd => {
              return sumBy(
                this.activities.filter(
                  a => a.project && a.project.name === p && a.date === dd
                ),
                "hours"
              );
            })
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
          queue: false
        });
      }
    },
    showModalMoveToProject() {
      this.isModalMoveToProject = true;
    },
    showModalICal(event) {
      let firstWord = "";
      if (
        event.customData.a.summary &&
        event.customData.a.summary.toString().includes(" ")
      ) {
        firstWord = event.customData.a.summary.split(" ")[0];
      } else if (event.customData.a.summary) {
        firstWord = event.customData.a.summary;
      }
      const project = this.project
        ? this.projects.find(p => p.id === this.project)
        : firstWord &&
          this.projects.filter(p => p.name === firstWord).length === 1
        ? this.projects.find(p => p.name === firstWord)
        : null;

      const activity = {
        date: event.customData.a.start,
        hours: event.customData.hours,
        description: event.customData.a.summary,
        project: project,
        uid_ical: event.customData.a.uid,
        uid_word: firstWord
      };


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
        const userId = this.users.find(u => u.username === this.userName);
        const counterResp = await service({ requiresAuth: true }).post(
          `time-counters`,
          {
            start: moment().format("YYYY-MM-DD HH:mm:ss"),
            users_permissions_user: userId
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
      if (this.saving) {
        return;
      }
      this.saving = true;
      try {
        await this.saveActivity(activity);
      } finally {
        this.saving = false;
      }
    },
    async saveActivity(activity) {
      if (activity.counter) {
        await service({ requiresAuth: true }).delete(
          `time-counters/${activity.counter.id}`
        );
        this.counter = null;
      }
      this.counterClicked = false;
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
          queue: false
        });
      }

      await this.getActivities();
      if (this.icalVisible) {
        await this.importFromCalendar(this.shouldImportFromCalendar);
      }

      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false
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
          queue: false
        });
      } else if (activity.counter && activity.counter.id) {
        if (this.saving) {
          return;
        }
        this.saving = true;
        this.counterClicked = false;
        try {
          await service({ requiresAuth: true }).delete(
            `time-counters/${activity.counter.id}`
          );
        } finally {
          this.saving = false;
        }
        this.isModalEditActive = false;
        this.$buefy.snackbar.open({
          message: "Esborrat",
          queue: false
        });
        this.counter = null;
      }
    },
    modalCancel() {
      this.counterClicked = false;
      this.isModalEditActive = false;
    },
    pageChange(page) {
      // v-calendar 3 re-emits update:pages when it refreshes the same month;
      // v2's update:from-page only fired when the month actually changed
      const key = page && `${page.year}-${page.month}`;
      if (!key || key === this.lastCalendarPage) {
        return;
      }
      this.lastCalendarPage = key;
      if (!this.moving) {
        this.$emit("calendar-changed", { year: page.year, month: page.month });
      }
    },
    colorTypeChanged(colorType) {
      if (this.colorType !== colorType) {
        this.colorType = colorType;
        this.getActivities();
      }
    // the grid is too narrow on a phone to show the entries: dayTapped handles it
    isPhone() {
      return typeof window !== "undefined" && !!window.matchMedia &&
        window.matchMedia("(max-width: 768px)").matches;
    },
    // on a phone, a day with entries scrolls to them in the list; an empty day adds hours
    dayTapped(day) {
      if (!this.isPhone()) return;
      const date = moment(day.date).format("YYYY-MM-DD");
      const el = document.getElementById("agenda-" + date);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else this.showModal({ date });
    },
    agendaDayTitle(date) {
      return moment(date, "YYYY-MM-DD").format("dddd D MMMM");
    },
    openAgendaEntry(entry) {
      if (entry.type === "festive") this.showModalFestive(entry.attr.customData.a);
      else if (entry.type === "ical") this.showModalICal(entry.attr);
      else this.showModal(entry.attr.customData.a);
    },
    },
      if (this.isPhone()) return;
    dayClicked(day) {
      this.showModal({ date: moment(day.date).format("YYYY-MM-DD") });
    },
    daySum(attributes) {
      if (!attributes || (attributes && attributes.length === 0)) {
        return false;
      }
      // Catalan decimals, «7,50 h» (issues/104)
      return formatNumber(sumBy(
        attributes.map(a => {
          return {
            hours:
              a.customData && a.customData.pending === undefined
                ? a.customData.hours
                : 0
          };
        }),
        "hours"
      ), 2, 2);
    },
    daySumPending(attributes) {
      if (!attributes || (attributes && attributes.length === 0)) {
        return false;
      }
      const pendingAttributes = attributes.filter(
        a => a.customData && a.customData.pending === true
      );
      if (pendingAttributes.length === 0) {
        return false;
      }
      // Catalan decimals, «7,50 h» (issues/104)
      return formatNumber(sumBy(
        pendingAttributes.map(a => {
          return { hours: a.customData ? a.customData.hours : 0 };
        }),
        "hours"
      ), 2, 2);
    },
    weekSum(weekNumber) {
      const weekActivities = this.attributes
        .filter(
          a =>
            moment(a.dates, "YYYY-MM-DD").isoWeek() == weekNumber &&
            a.customData &&
            a.customData.hours
        )
        .map(a => {
          return { ...a, weekNumber: moment(a.dates, "YYYY-MM-DD").isoWeek() };
        });
      const weeksum = sumBy(weekActivities, a => a.customData.hours);
      return formatNumber(weeksum, 2, 2);
    },
    async counterContinue(info) {
      if (info) {
        await service({
          requiresAuth: true
        }).put(`time-counters/${this.counter.id}`, {
          project: info.project,
          description: info.description,
          activity_type: info.activity_type || null,
          dedication_type: info.dedication_type || null,
          task: info.task || null
        });
        this.counter.project = this.projects.find(p => p.id === info.project);
        this.counter.description = info.description;
        // kept for the next opening of the dialog (issues/051)
        this.counter.activity_type = info.activity_type || null;
        this.counter.dedication_type = info.dedication_type || null;
        this.counter.task = info.task || null;
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
            const day = moment(festive.date)
              .add(i, "days")
              .day();
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
          queue: false
        });
      }

      this.getActivities();

      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false
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
          queue: false
        });
      }
    },
    async modalMoveToProjectSubmit(data) {
      this.isModalMoveToProject = false;
      this.isLoadingMove = true;
      const movedata = {
        user: this.user,
        from: this.project,
        to: data.project,
        start: moment(this.date1).format("YYYY-MM-DD"),
        end: moment(this.date2).format("YYYY-MM-DD")
      };
      const moveResponse = (
        await service({ requiresAuth: true }).post(`activities/move`, movedata)
      ).data;

      this.isLoadingMove = false;
      this.$buefy.snackbar.open({
        message: "Actualitzat!",
        queue: false
      });
      this.getActivities();
    },
    removeAccents(name) {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    },
    async modalMoveToProjectCancel() {
      this.isModalMoveToProject = false;
    },
    async importFromCalendar(shouldImportFromCalendar) {
      this.shouldImportFromCalendar = shouldImportFromCalendar;
      if (this.user) {
        const user = this.users.find(u => u.id === this.user);
        if (!user.ical || !user.ical.startsWith("http")) {
          this.$buefy.toast.open({
            message: `La usuària no te un calendari de tipus iCal definit. Contacta amb l'administradora per fer servir aquesta funcionalitat`,
            type: "is-danger"
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
              `activities/import-calendar/${this.user}?from=${moment(
                this.date1
              ).format("YYYY-MM-DD")}&to=${moment(this.date2)
                .add(1, "days")
                .format("YYYY-MM-DD")}`
            )
          ).data;
          if (icalEvents.ical && icalEvents.ical.length) {
            this.icalEvents = icalEvents.ical;
            this.showICalEvents();

            // this.$buefy.snackbar.open({
            //   message:
            //     "Atenció. Has d'assignar projectes a les hores del calendari",
            //   queue: false,
            // });

            // this.$buefy.toast.open({
            //   message: `Atenció. Has d'assignar projectes a les hores del calendari`,
            //   type: "is-danger",
            // });
          }

          this.isLoadingImport = false;
        }
      }
    },
    showICalEvents() {
      if (!this.user) {
        return;
      }
      const user = this.users.find(u => u.id === this.user);
      this.icalEvents.forEach(event => {
        if (
          moment(event.start).isSameOrAfter(moment(this.date1)) &&
          moment(event.end).isSameOrBefore(moment(this.date2).endOf("day"))
        ) {
          // filter already used events
          const attr = this.attributes.find(
            a =>
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
                pending: true
              },
              dates: event.start
            });
          }
        }
      });
      var eventsAdded = this.attributes.filter(
        a =>
          a.customData && a.customData.type === "ical" && a.customData.project
      );
      let countFound = 0;
      let countNotFound = 0;
      for (const event of eventsAdded) {
        const projectName =
          event.customData.project.indexOf(" ") >= 0
            ? event.customData.project.split(" ")[0]
            : event.customData.project;

        if (projectName.startsWith("[") && projectName.includes("]")) {
          const indexOfEnd = projectName.indexOf("]");
          const projectName2 = projectName.substring(1, indexOfEnd);

          if (
            this.activeProjects.find(
              p =>
                this.removeAccents(p.name) === this.removeAccents(projectName2)
            )
          ) {
            countFound++;
          } else {
            const projectParts = projectName2.split("-");

            if (projectParts.length === 0) {
              countNotFound++;
            } else if (projectParts.length >= 1) {
              for (const part of projectParts) {
                const found = this.activeProjects.filter(
                  p => this.removeAccents(p.name) === this.removeAccents(part)
                );
                if (found.length === 1) {
                  countFound++;
                } else {
                  const found = this.activeProjects.filter(
                    p =>
                      this.removeAccents(p.name).includes(
                        this.removeAccents(part) + "-"
                      ) ||
                      this.removeAccents(p.name).includes(
                        "-" + this.removeAccents(part)
                      )
                  );
                  if (found.length === 1) {
                    countFound++;
                  } else {
                    countNotFound++;
                  }
                }
              }
            }
          }
        } else {
          const project = this.activeProjects.find(
            p => this.removeAccents(p.name) === this.removeAccents(projectName)
          );
          if (project) {
            countFound++;
          } else {
            if (projectName.includes("-")) {
              const indexOfDash = projectName.indexOf("-");
              const projectName2 = projectName.substring(indexOfDash + 1) || "";
              const projects2 = this.activeProjects.filter(
                p =>
                  (this.removeAccents(p.name).startsWith(
                    this.removeAccents(projectName2)
                  ) &&
                    projectName2 !== "") ||
                  (this.removeAccents(p.name).includes(
                    this.removeAccents(projectName2)
                  ) &&
                    projectName2 !== "") ||
                  (this.removeAccents(p.name).startsWith(
                    this.removeAccents(projectName)
                  ) &&
                    projectName2 === "")
              );
              if (projects2.length === 1) {
                countFound++;
              } else {
                countNotFound++;
              }
            } else {
              countNotFound++;
            }
          }
        }
      }

      if (this.shouldImportFromCalendar && countFound > 0) {
        this.shouldImportFromCalendar = false;
        this.$buefy.dialog.confirm({
          message: `S'han trobat ${countFound} esdeveniments que crearan hores automáticament i ${countNotFound} que no coincideixen amb cap projecte. Vols continuar amb la creació automàtica de les hores?`,
          onConfirm: async () => {
            this.createICalEvents();
          },
          onCancel: () => {
            return false;
          }
        });
      }

    },

    async createICalEvents() {
      this.isLoadingImport = true;
      var eventsAdded = this.attributes.filter(
        a =>
          a.customData && a.customData.type === "ical" && a.customData.project
      );

      var created = 0;
      for await (const event of eventsAdded) {
        // for (let i = 0; i < eventsAdded.length; i ++) {
        // const event = eventsAdded[i]
        const projectName =
          event.customData.project.indexOf(" ") >= 0
            ? event.customData.project.split(" ")[0] /*  */
            : event.customData.project;

        if (projectName.startsWith("[") && projectName.includes("]")) {
          const indexOfEnd = projectName.indexOf("]");
          const projectName2 = projectName.substring(1, indexOfEnd);

          let project = null;

          if (
            this.activeProjects.find(
              p =>
                this.removeAccents(p.name) === this.removeAccents(projectName2)
            )
          ) {
            project = this.activeProjects.find(
              p =>
                this.removeAccents(p.name) === this.removeAccents(projectName2)
            );
          } else {
            const projectParts = projectName2.split("-");

            if (projectParts.length === 0) {
            } else if (projectParts.length >= 1) {
              for (const part of projectParts) {
                const found = this.activeProjects.filter(
                  p => this.removeAccents(p.name) === this.removeAccents(part)
                );
                if (found.length === 1) {
                  project = found[0];
                } else {
                  const found = this.activeProjects.filter(
                    p =>
                      this.removeAccents(p.name).includes(
                        this.removeAccents(part) + "-"
                      ) ||
                      this.removeAccents(p.name).includes(
                        "-" + this.removeAccents(part)
                      )
                  );
                  if (found.length === 1) {
                    project = found[0];
                  } else {
                  }
                }
              }
            }
          }

          if (project) {
            const dedication_type = event.customData.project
              .toString()
              .toLowerCase()
              .includes("[h1]")
              ? 1
              : event.customData.project
                  .toString()
                  .toLowerCase()
                  .includes("[h2]")
              ? 2
              : event.customData.project
                  .toString()
                  .toLowerCase()
                  .includes("[h3]")
              ? 3
              : event.customData.project
                  .toString()
                  .toLowerCase()
                  .includes("[h4]")
              ? 4
              : project.default_dedication_type &&
                project.default_dedication_type.id
              ? project.default_dedication_type.id
              : project.default_dedication_type;

            const eventData = event.customData.a;
            const activity = {
              activity_type: null,
              date: eventData.start.substring(0, 10),
              dedication_type: dedication_type,
              hours:
                moment(eventData.end).diff(moment(eventData.start), "minutes") /
                60,
              project: project.id,
              users_permissions_user: this.user,
              uid_ical: eventData.uid
            };
            await service({ requiresAuth: true }).post("activities", activity);
            created++;
            this.$buefy.snackbar.open({
              message: `Dedicació creada (${created})`,
              queue: false
            });
          }
        } else {
          const project = this.activeProjects.find(
            p => this.removeAccents(p.name) === this.removeAccents(projectName)
          );
          if (project) {
            const eventData = event.customData.a;

            const dedication_type = event.customData.project
              .toString()
              .toLowerCase()
              .includes("[h1]")
              ? 1
              : event.customData.project
                  .toString()
                  .toLowerCase()
                  .includes("[h2]")
              ? 2
              : event.customData.project
                  .toString()
                  .toLowerCase()
                  .includes("[h3]")
              ? 3
              : event.customData.project
                  .toString()
                  .toLowerCase()
                  .includes("[h4]")
              ? 4
              : project.default_dedication_type &&
                project.default_dedication_type.id
              ? project.default_dedication_type.id
              : project.default_dedication_type;

            const activity = {
              activity_type: null,
              date: eventData.start.substring(0, 10),
              dedication_type: dedication_type,
              hours:
                moment(eventData.end).diff(moment(eventData.start), "minutes") /
                60,
              project: project.id,
              users_permissions_user: this.user,
              uid_ical: eventData.uid
            };
            await service({ requiresAuth: true }).post("activities", activity);

            created++;
            this.$buefy.snackbar.open({
              message: `Dedicació creada (${created})`,
              queue: false
            });
          } else {
            if (projectName.includes("-")) {
              const indexOfDash = projectName.indexOf("-");
              const projectName2 = projectName.substring(indexOfDash + 1);
              const projects2 = this.activeProjects.filter(
                p =>
                  (this.removeAccents(p.name).startsWith(
                    this.removeAccents(projectName2)
                  ) &&
                    projectName2 !== "") ||
                  (this.removeAccents(p.name).includes(
                    this.removeAccents(projectName2)
                  ) &&
                    projectName2 !== "") ||
                  (this.removeAccents(p.name).startsWith(
                    this.removeAccents(projectName)
                  ) &&
                    projectName2 === "")
              );
              if (projects2.length === 1) {

                const eventData = event.customData.a;
                const activity = {
                  activity_type: null,
                  date: eventData.start.substring(0, 10),
                  dedication_type:
                    projects2[0].default_dedication_type &&
                    projects2[0].default_dedication_type.id
                      ? project.default_dedication_type.id
                      : null,
                  hours:
                    moment(eventData.end).diff(
                      moment(eventData.start),
                      "minutes"
                    ) / 60,
                  project: projects2[0].id,
                  users_permissions_user: this.user,
                  uid_ical: eventData.uid
                };
                await service({ requiresAuth: true }).post(
                  "activities",
                  activity
                );
                created++;
                this.$buefy.snackbar.open({
                  message: `Dedicació creada (${created})`,
                  queue: false
                });
              }
            }
          }
        }
      }

      this.getActivities();
      this.isLoadingImport = false;
    },
    // «1,00 h», as the calendar view (issues/127)
    hoursLabel(hours) {
      return formatNumber(hours || 0, 2, 2) + " h";
    },
    // «Dimarts 30/06/2026 (d'aquí 13 dies)»: only the first letter in capitals (issues/127)
    formatTitle(val) {
      if (!val) {
        return "-";
      }
      const title = moment(val).format("dddd DD/MM/YYYY") + " (" + moment(val).fromNow() + ")";
      return title.charAt(0).toUpperCase() + title.slice(1);
    }
  }
};
</script>
<style scoped>
/* Redesign A: one toolbar with the total, the views and labelled actions */
.hours-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem 1rem;
  margin-bottom: 1rem;
  padding: .75rem 1rem;
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
}
.hours-total {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  margin-right: .5rem;
}
.hours-total span {
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-muted);
}
.hours-total b {
  font-size: 1.375rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--a-seg);
}
.segmented button {
  height: 2rem;
  padding: 0 .75rem;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font: inherit;
  font-size: .875rem;
  font-weight: 600;
  color: var(--a-fg-2);
  cursor: pointer;
}
.segmented button.is-on {
  background: var(--a-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
  font-weight: 800;
  color: var(--a-fg);
}
.hours-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .375rem;
}
.hours-actions .export {
  display: inline-flex;
}
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

/* the list under the grid: phones only */
.hours-agenda {
  display: none;
  margin: -0.5rem 0 1.25rem;
}
.agenda-empty {
  color: var(--a-muted);
  padding: 0.75rem 0;
}
.agenda-week + .agenda-week {
  margin-top: 1rem;
}
.agenda-week-title {
  display: flex;
  justify-content: space-between;
  padding: 0 0.25rem 0.375rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--a-muted);
}
.agenda-day {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
  scroll-margin-top: 4.5rem;
}
.agenda-day + .agenda-day {
  margin-top: 0.5rem;
}
.agenda-day.is-today {
  border-color: var(--a-accent);
}
.agenda-day-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.375rem 0.375rem 0.875rem;
  background: var(--a-thead);
  border-bottom: 1px solid var(--a-line-soft);
}
.agenda-day-name {
  flex: 1;
  font-weight: 800;
  color: var(--a-fg);
}
.agenda-day-name::first-letter {
  text-transform: uppercase;
}
.agenda-day-hours {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--a-fg-2);
}
.agenda-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--a-accent);
  cursor: pointer;
}
.agenda-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.5rem 0.875rem;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  color: var(--a-fg);
  cursor: pointer;
}
.agenda-entry + .agenda-entry {
  border-top: 1px solid var(--a-line-soft);
}
.agenda-entry.is-pending {
  opacity: 0.75;
}
.agenda-entry.is-pending .agenda-color {
  background: repeating-linear-gradient(-45deg, var(--a-muted) 0 3px, transparent 3px 6px) !important;
}
.agenda-color {
  flex: none;
  width: 4px;
  align-self: stretch;
  border-radius: 2px;
}
.agenda-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.agenda-project {
  font-weight: 600;
  line-height: 1.3;
  /* two lines at most: a whole name almost always fits */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.agenda-sub {
  font-size: 0.8125rem;
  color: var(--a-muted);
}
.agenda-hours {
  flex: none;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 768px) {
  .hours-agenda {
    display: block;
  }
}
.card-body {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.is-activity {
  cursor: pointer;
}
.is-total {
  background: var(--a-chip);
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
.export {
  display: inline-block;
}
.day-sum-label {
  float: right;
  font-size: 12px;
  color: var(--a-muted);
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
  --day-border: 1px solid var(--a-line);
  --day-border-highlight: 1px solid var(--a-line);
  --day-width: 90px;
  --day-height: 90px;
  --weekday-bg: #f8fafc;
  --weekday-border: 1px solid var(--a-line-soft);
  border-radius: 0.25rem;
  border: 0;
  width: 100%;
}
/* v-calendar 3 overlays the arrows header on the month header: only the
   month header gets the background, both get the same box so they line up */
.custom-calendar.vc-container .vc-header {
  height: auto;
  margin-top: 0;
  padding: 10px 0;
}
.custom-calendar.vc-container .vc-pane > .vc-header {
  background-color: var(--a-chip);
}
.custom-calendar.vc-container .vc-weeks {
  padding: 0;
}
.custom-calendar.vc-container .vc-weekday {
  background-color: var(--a-thead);
  border-bottom: 1px solid var(--a-line-soft);
  border-top: 1px solid var(--a-line-soft);
  padding: 5px 0;
}
.custom-calendar.vc-container .vc-day {
  padding: 0 5px 3px 5px;
  text-align: left;
  height: auto;
  min-height: 90px;
  min-width: 90px;
  background-color: var(--a-surface);
}
.custom-calendar.vc-container .vc-day.weekday-1,
.custom-calendar.vc-container .vc-day.weekday-7 {
  background-color: #eff8ff;
  background: var(--a-chip);
}
.custom-calendar.vc-container .vc-day:not(.on-bottom) {
  border-bottom: 1px solid var(--a-line);
}
.custom-calendar.vc-container .vc-day:not(.on-bottom).weekday-1 {
  border-bottom: 1px solid var(--a-line);
}

.custom-calendar.vc-container .vc-day:not(.on-right) {
  border-right: 1px solid var(--a-line);
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
.custom-calendar .vc-highlight {
  position: absolute;
  top: -2px;
  left: 1px;
}
.custom-calendar .is-today .day-label {
  color: #fff;
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

@media (max-width: 768px) {
  .custom-calendar.vc-container .vc-day {
.custom-calendar .day-stripes {
  display: none;
}

/* a phone: the grid shows the day's total and a stripe per entry; the entries
   themselves are in the list under it (.hours-agenda) */
    min-width: 0;
    min-height: 58px;
    padding: 0 3px 4px;
    cursor: pointer;
  }
  .custom-calendar .day-entries,
  .custom-calendar .day-sum-label span,
  .custom-calendar .day-sum-label.week-total {
    display: none;
  }
  .custom-calendar .day-sum-label {
    float: none;
    display: block;
    padding-top: 0;
    font-size: 11px;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .custom-calendar .day-stripes {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 3px;
  }
  .custom-calendar .day-stripes i {
    display: block;
    height: 4px;
    border-radius: 2px;
  }
  .custom-calendar .day-stripes i.is-pending {
    opacity: 0.4;
  }
}
</style>
