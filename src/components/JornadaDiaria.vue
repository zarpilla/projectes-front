<template>
  <div>
    <b-loading
      :is-full-page="true"
      v-model="updating"
      :can-cancel="false"
    ></b-loading>
    
    <div class="table-view">
      <div v-if="!isLoading && showToday" class="wl-today">
        <span class="wl-today-label">Avui</span>
        <b>{{ todayLong }}</b>
        <span class="has-text-muted">{{ personName }} · {{ todayStatus }}</span>
        <b-button
          class="ml-auto"
          type="is-primary"
          :icon-left="openSlotToday ? 'stop' : 'play'"
          @click="clockToday"
        >
          {{ openSlotToday ? "Fitxa la sortida" : "Fitxa l'entrada" }}
        </b-button>
      </div>

      <div v-if="!isLoading" class="doc-kpis wl-kpis">
        <div class="doc-kpi">
          <span>Hores treballades</span>
          <b>{{ formatDuration(totalMinutes) }}</b>
          <small>total {{ periodLabelOf }}</small>
        </div>
        <div class="doc-kpi">
          <span>Jornada prevista</span>
          <b>{{ formatExpected(expectedTotal) }}</b>
          <small>{{ expectedDays }} dies laborables</small>
        </div>
        <div class="doc-kpi">
          <span>Diferència</span>
          <b :class="'has-text-' + (balanceMinutes > 0 ? 'pos' : balanceMinutes < 0 ? 'neg' : 'muted')">{{ balanceMinutes > 0 ? "+" : "" }}{{ formatDuration(balanceMinutes) }}</b>
          <small>respecte a la jornada fins avui</small>
        </div>
        <div class="doc-kpi">
          <span>Dies registrats</span>
          <b>{{ loggedWorkingDays }} de {{ expectedDaysToDate }}</b>
          <small>{{ festivesLabel }}</small>
        </div>
      </div>

      <div v-if="!isLoading" class="wl-table">
        <div class="wl-head">
          <span>Dia</span>
          <span>Trams (entrada – sortida) · projecte</span>
          <span class="has-text-right">Hores</span>
        </div>
        <template v-for="row in rows" :key="row.key">
          <div v-if="row.type === 'week'" class="wl-sum">
            <span>Setmana {{ row.week }}</span>
            <span class="has-text-muted">{{ row.expected ? "de " + formatExpected(row.expected) + " previstes" : "" }}</span>
            <b class="has-text-right">{{ formatDuration(row.minutes) }}</b>
          </div>
          <div v-else-if="row.type === 'month'" class="wl-sum is-month">
            <span>Total {{ row.name }}</span>
            <span class="has-text-muted">{{ row.expected ? "de " + formatExpected(row.expected) + " previstes" : "" }}</span>
            <b class="has-text-right">{{ formatDuration(row.minutes) }}</b>
          </div>
          <div
            v-else
            class="wl-day"
            :class="{ 'is-quiet': !row.slots.length && (row.weekend || row.festive), 'is-festive': row.festive, 'is-today': row.date === todayF }"
            :data-date="row.date"
          >
            <span class="wl-date">{{ row.label }}</span>
            <div class="wl-slots">
              <div v-for="slot in row.slots" :key="slot.key" class="wl-slot">
                <span class="wl-time" :class="{ 'is-empty': !slot.a.hour_in }">
                  <input v-model="slot.a.hour_in_h" class="wl-num" inputmode="numeric" maxlength="2" placeholder="hh" aria-label="Hora d'entrada" @change="changeHourIn(slot.a, slot.i)" />
                  <span>:</span>
                  <input v-model="slot.a.hour_in_m" class="wl-num" inputmode="numeric" maxlength="2" placeholder="mm" aria-label="Minut d'entrada" @change="changeHourIn(slot.a, slot.i)" />
                </span>
                <span class="wl-dash">–</span>
                <span class="wl-time" :class="{ 'is-empty': !slot.a.hour_out }">
                  <input v-model="slot.a.hour_out_h" class="wl-num" inputmode="numeric" maxlength="2" placeholder="hh" aria-label="Hora de sortida" @change="changeHourOut(slot.a, slot.i)" />
                  <span>:</span>
                  <input v-model="slot.a.hour_out_m" class="wl-num" inputmode="numeric" maxlength="2" placeholder="mm" aria-label="Minut de sortida" @change="changeHourOut(slot.a, slot.i)" />
                </span>
                <span
                  class="wl-dur"
                  :class="{ 'has-text-danger': slotIsInverted(slot.a.hour_in, slot.a.hour_out) }"
                  :title="slotIsInverted(slot.a.hour_in, slot.a.hour_out) ? 'La sortida és abans de l\'entrada' : null"
                >{{ slot.a.hour_in && slot.a.hour_out ? formatDuration(slotMinutes(slot.a.hour_in, slot.a.hour_out)) : slot.a.hour_in ? "en curs" : "" }}</span>
                <span v-if="slotIsInverted(slot.a.hour_in, slot.a.hour_out)" class="wl-slot-warning has-text-danger">La sortida és abans de l'entrada</span>
                <b-autocomplete
                  v-if="slot.a.projectNameSearch !== undefined"
                  v-model="slot.a.projectNameSearch"
                  class="wl-project"
                  size="is-small"
                  placeholder="Projecte (opcional)"
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredProjects(slot.a.projectNameSearch)"
                  field="name"
                  :disabled="!slot.a.id || slot.a.id <= 0"
                  :clearable="true"
                  @select="option => selectProject(option, slot.a, slot.i)"
                />
                <button
                  v-if="slot.a.id && slot.a.id > 0"
                  class="wl-icon"
                  type="button"
                  title="Esborrar"
                  aria-label="Esborra el tram"
                  @click.prevent="deleteWorkLog(slot.a)"
                >
                  <b-icon icon="trash-can-outline" custom-size="default" />
                </button>
              </div>
              <span v-if="!row.slots.length" class="wl-none">
                {{ row.festive ? row.festiveName : row.weekend ? "cap de setmana" : "sense trams" }}
              </span>
            </div>
            <button class="wl-add" type="button" title="Afegeix tram" @click="addSlot(row)">
              <b-icon icon="plus" custom-size="default" />
              <span v-if="!row.slots.length">Afegeix tram</span>
            </button>
            <b class="wl-total">{{ row.slots.length ? formatDuration(row.minutes) : "" }}</b>
          </div>
        </template>
        <div class="wl-sum is-total">
          <span>Total {{ periodLabelOf.replace(/^de |^d'/, "") }}</span>
          <span></span>
          <b class="has-text-right">{{ formatDuration(totalMinutes) }}</b>
        </div>
      </div>

      <!-- source of the PDF: rendered (html2pdf clones it) but kept off screen -->
      <div v-if="(generatedPDF || true) && me" class="invoice-box-container pdf-source" aria-hidden="true">
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
              <td>{{ month ? months.find(m => m.month === month).name + ' ' + year : 'Any ' + year }}</td>
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
                  >TOTAL {{ formatMonthName(a.date) }}</span
                >
                <span v-else>{{ a.date }}</span>
              </td>
              <td>
                <span class="has-text-weight-bold" v-if="a._type === 'total'">{{
                  formatHourMonth(monthly.find(m => m.month === a.month))
                }}</span>
                <span v-else
                  >{{ a.hour_in_h }}:{{ a.hour_in_m }} - {{ a.hour_out_h }}:{{
                    a.hour_out_m
                  }}
                  ({{ formatHourDiff(a) }})</span
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
import CardComponent from "@/components/CardComponent.vue";
import _ from "lodash";
import html2pdf from "html3pdf";
import getConfig from '@/config'
import { slotMinutes, slotIsInverted, formatDuration, formatExpected, formatHoursMinutes, expectedHours, festiveOn, festivesBetween, isValidTime } from "@/domain/workdayLog.js";
import { toRaw } from "vue";

// new slots get a key of their own, kept after the first save gives them an
// id: keyed by id, the row was remounted and lost the focus (issues/180)
let newSlotKey = 0;
// a slot's saves run one after the other: a second change while the first
// POST is in flight must not create the slot twice
const pendingSaves = new WeakMap();
const saveErrorMessage = error => {
  const message = error && error.response && error.response.data && error.response.data.error && error.response.data.error.message;
  return message ? `No s'ha pogut desar el tram: ${message}` : "No s'ha pogut desar el tram";
};

moment.locale("ca");

export default {
  name: "JornadaDiaria",
  components: { CardComponent },
  emits: ["summary"],
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
      apiUrl: import.meta.env.VUE_APP_API_URL,
      imageUrl: null,
      projects: [],
      periods: [],
      festives: [],
    };
  },

  watch: {
    summary: {
      handler(value) {
        this.$emit("summary", value);
      },
      immediate: true
    },
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
    const config = getConfig();
    this.apiUrl = config.VUE_APP_API_URL;
    
    this.getWorkDayLogs();
  },
  computed: {
    // one row per day (newest first) with its slots, week subtotals and, over a
    // whole year, month totals, each heading its days. Slots keep their index in `activities`, which the
    // save methods work with.
    rows() {
      const byDate = {};
      this.activities.forEach((a, i) => {
        if (a._type === "total") return;
        (byDate[a.date] = byDate[a.date] || []).push({ a, i, key: a._key || (a.id > 0 ? a.id : "n" + i) });
      });
      const rows = [];
      let week = null;
      let month = null;
      const today = this.todayF;
      const closeWeek = () => {
        if (week && week.days) rows.push(week);
      };
      const closeMonth = () => {
        if (!this.month && month && month.days) rows.push(month);
      };
      Object.keys(byDate).sort().forEach(date => {
        const d = moment(date, "YYYY-MM-DD");
        const isoWeek = d.isoWeek();
        const monthNumber = d.month();
        if (week && week.week !== isoWeek) {
          closeWeek();
          week = null;
        }
        if (month && month.month !== monthNumber) {
          closeWeek();
          week = null;
          closeMonth();
          month = null;
        }
        week = week || { type: "week", key: "w" + date, week: isoWeek, minutes: 0, expected: 0, days: 0 };
        month = month || { type: "month", key: "m" + date, month: monthNumber, name: d.format("MMMM"), minutes: 0, expected: 0, days: 0 };
        const slots = byDate[date]
          .filter(s => s.a.id !== 0)
          .sort((x, y) => (x.a.hour_in || "99") < (y.a.hour_in || "99") ? -1 : 1);
        const minutes = slots.reduce((acc, s) => acc + slotMinutes(s.a.hour_in, s.a.hour_out), 0);
        const festive = festiveOn(date, this.festives);
        const expected = expectedHours(date, this.periods, this.festives);
        rows.push({
          type: "day",
          key: date,
          date,
          label: d.format("ddd D"),
          weekend: d.isoWeekday() > 5,
          festive: !!festive,
          festiveName: festive ? "Festiu" + (festive.festive_type && festive.festive_type.name ? " · " + festive.festive_type.name : "") : "",
          slots,
          minutes,
          placeholder: byDate[date].find(s => s.a.id === 0)
        });
        [week, month].forEach(group => {
          group.minutes += minutes;
          group.expected += date <= today ? expected : 0;
          group.days++;
        });
      });
      closeWeek();
      closeMonth();
      // built oldest first with the totals after their days: reversed, the
      // newest day comes first and each total heads its week / month
      return rows.reverse();
    },
    dayRows() {
      return this.rows.filter(r => r.type === "day");
    },
    totalMinutes() {
      return this.dayRows.reduce((acc, r) => acc + r.minutes, 0);
    },
    slotCount() {
      return this.dayRows.reduce((acc, r) => acc + r.slots.length, 0);
    },
    loggedDays() {
      return this.dayRows.filter(r => r.slots.length).length;
    },
    loggedWorkingDays() {
      return this.dayRows.filter(r => r.slots.length && expectedHours(r.date, this.periods, this.festives) > 0).length;
    },
    // every date of the chosen month or year (the list stops at today)
    periodDates() {
      if (!this.year) return [];
      const from = this.month ? moment({ year: this.year, month: this.month - 1 }) : moment({ year: this.year });
      const to = from.clone().endOf(this.month ? "month" : "year");
      const dates = [];
      for (const d = from.clone(); d.isSameOrBefore(to, "day"); d.add(1, "day")) {
        dates.push(d.format("YYYY-MM-DD"));
      }
      return dates;
    },
    expectedTotal() {
      return this.periodDates.reduce((acc, d) => acc + expectedHours(d, this.periods, this.festives), 0);
    },
    expectedDays() {
      return this.periodDates.filter(d => expectedHours(d, this.periods, this.festives) > 0).length;
    },
    expectedDaysToDate() {
      return this.periodDates.filter(d => d <= this.todayF && expectedHours(d, this.periods, this.festives) > 0).length;
    },
    balanceMinutes() {
      const expected = this.periodDates
        .filter(d => d <= this.todayF)
        .reduce((acc, d) => acc + expectedHours(d, this.periods, this.festives), 0);
      return this.totalMinutes - Math.round(expected * 60);
    },
    festivesLabel() {
      const days = this.periodDates
        .map(d => festiveOn(d, this.festives))
        .filter(f => f && moment(f.date).isoWeekday() <= 5);
      if (!days.length) return "cap festiu entre setmana";
      const list = days.slice(0, 3).map(f => moment(f.date).format("D MMM")).join(", ");
      return `${days.length} ${days.length === 1 ? "festiu" : "festius"}: ${list}${days.length > 3 ? "…" : ""}`;
    },
    periodLabelOf() {
      if (!this.year) return "";
      if (!this.month) return "de " + this.year;
      const name = moment({ year: this.year, month: this.month - 1 }).format("MMMM");
      return (/^[aeiouà-ú]/i.test(name) ? "d'" : "de ") + name;
    },
    summary() {
      if (this.isLoading || !this.year || !this.user) return null;
      return { person: this.personName, slots: this.slotCount, days: this.loggedDays };
    },
    showToday() {
      return this.activities.some(a => a.date === this.todayF);
    },
    todayLong() {
      return moment().format("dddd D MMMM [de] YYYY");
    },
    openSlotToday() {
      const row = this.dayRows.find(r => r.date === this.todayF);
      return row ? row.slots.find(s => s.a.hour_in && !s.a.hour_out && s.a.id > 0) || null : null;
    },
    todayStatus() {
      const row = this.dayRows.find(r => r.date === this.todayF);
      const slots = row ? row.slots.filter(s => s.a.id > 0) : [];
      if (!slots.length) return "encara no hi ha cap tram";
      if (this.openSlotToday) return `entrada a les ${this.openSlotToday.a.hour_in.slice(0, 5)} · en curs`;
      return `${slots.length} ${slots.length === 1 ? "tram" : "trams"} · ${formatDuration(row.minutes)}`;
    },
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
      return _(this.activities.filter(a => a._type !== "total" && a.hour_in !== null && a.hour_out))
        .groupBy(a => (moment(a.date).month() + 1).toString())
        .map((rows, id) => ({ month: id, m: _.sumBy(rows, a => slotMinutes(a.hour_in, a.hour_out)) }))
        .value();
    },
    daily() {
      return _(this.activities.filter(a => a._type !== "total" && a.hour_in !== null && a.hour_out))
        .groupBy("date")
        .map((rows, id) => ({ date: id, m: _.sumBy(rows, a => slotMinutes(a.hour_in, a.hour_out)) }))
        .value();
    },
    superTotal() {
      return formatHoursMinutes(this.monthly.reduce((acc, m) => acc + m.m, 0));
    },
  },
  methods: {
    slotMinutes,
    slotIsInverted,
    formatDuration,
    formatExpected,
    addSlot(row) {
      if (row.slots.length) {
        const last = row.slots[row.slots.length - 1];
        this.addPeriod(last.a, last.i);
      } else if (row.placeholder) {
        this.addPeriod(row.placeholder.a, row.placeholder.i);
      }
    },
    clockToday() {
      if (this.openSlotToday) {
        this.hourout(this.openSlotToday.a, this.openSlotToday.i);
        return;
      }
      let index = this.activities.findIndex(a => a.date === this.todayF && a.id <= 0 && !a.hour_in);
      if (index > -1 && this.activities[index].id === 0) {
        this.addPeriod(this.activities[index], index);
      } else if (index === -1) {
        const anyToday = this.activities.findIndex(a => a.date === this.todayF);
        this.addPeriod(this.activities[anyToday], anyToday);
        index = this.activities.findIndex(a => a.date === this.todayF && a.id === -1 && !a.hour_in);
      }
      this.hourin(this.activities[index], index);
    },
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

      const from = this.month 
        ? moment(this.year + "-" + this.month, "YYYY-MM")
            .startOf("month")
            .format("YYYY-MM-DD")
        : moment(this.year, "YYYY")
            .startOf("year")
            .format("YYYY-MM-DD");
      const to = this.month
        ? moment(this.year + "-" + this.month, "YYYY-MM")
            .endOf("month")
            .format("YYYY-MM-DD")
        : moment(this.year, "YYYY")
            .endOf("year")
            .format("YYYY-MM-DD");

      const [periods, festives] = await Promise.all([
        service({ requiresAuth: true }).get(`daily-dedications?_limit=-1&_where[users_permissions_user.id]=${this.user}`),
        service({ requiresAuth: true, cached: true }).get(festivesBetween(from, to))
      ]);
      this.periods = periods.data;
      this.festives = festives.data.filter(
        f => !f.users_permissions_user || (f.users_permissions_user.id || f.users_permissions_user) === this.user
      );

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
                if (w.project) {
                  // `w.project` is the id normalised just above; comparing against
                  // `w.activity.project` only worked while v3 returned relations as
                  // bare FK ids. Guard the lookup too — a project the picker does
                  // not list (trashed, or not assignable) would throw on `.name`.
                  const assigned = this.projects.find(p => p.id === w.project);
                  w.projectNameSearch = assigned ? assigned.name : "";
                }
                activities.push(w);
              });
            }
          });

          this.activities = activities.reverse();

          this.isLoading = false;
          this.updating = false;
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
      // the same words as the other deletions (ModalBox, issues/181)
      this.$buefy.dialog.confirm({
        title: "Esborrar?",
        message: "S'esborrarà el registre d'aquest dia. No es podrà desfer.",
        confirmText: "Esborra",
        type: "is-danger",
        onConfirm: async () => {
          this.updating = true;
          try {
            if (activity.activity) {
              await service({ requiresAuth: true }).delete(
                `activities/${activity.activity.id}`
              );
            }

            await service({ requiresAuth: true }).delete(
              `workday-logs/${activity.id}`
            );
            this.getWorkDayLogs();
          } catch (error) {
            this.updating = false;
          }
        },
        onCancel: () => {}
      });
    },
    addPeriod(activity, index) {
      const item = {
        id: -1,  // Use negative ID to mark as new editable period
        _key: "new" + ++newSlotKey,
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
      // Keep the new period next to the clicked row instead of jumping to the
      // top: an empty placeholder day (id 0) is replaced in place, otherwise
      // the extra period goes right below the existing one.
      if (activity.id === 0) {
        this.activities.splice(index, 1, item);
      } else {
        this.activities.splice(index + 1, 0, item);
      }
    },
    changeHourIn(activity, i) {
      const zeroPad = (num, places) => String(num).padStart(places, "0");
      // A field counts as "filled" only when it holds a real value. null/undefined
      // must NOT be zero-padded: String(null) === "null" would yield
      // "09:null:00.000", which Strapi rejects with
      // "Invalid time format, expected HH:mm:ss.SSS" (PUT /workday-logs 500).
      const hasH = activity.hour_in_h !== "" && activity.hour_in_h !== null && activity.hour_in_h !== undefined;
      const hasM = activity.hour_in_m !== "" && activity.hour_in_m !== null && activity.hour_in_m !== undefined;
      if (hasH) {
        activity.hour_in_h = zeroPad(activity.hour_in_h, 2);
      }
      if (hasM) {
        activity.hour_in_m = zeroPad(activity.hour_in_m, 2);
      }

      if (hasH && hasM && !isValidTime(activity.hour_in_h, activity.hour_in_m)) {
        this.refuseTime(activity, "hour_in");
      } else if (hasH && hasM) {
        // Build the literal time string directly. Do NOT use moment().format()
        // here: the typed hour/minute are interpolated into the *format string*,
        // which is both wrong (it formats the current moment) and fragile.
        activity.hour_in = `${activity.hour_in_h}:${activity.hour_in_m}:00.000`;
        this.saveActivity(activity, i, true);
      } else if (!hasH && !hasM) {
        activity.hour_in = null;
        this.saveActivity(activity, i, true);
      }
    },
    changeHourOut(activity, i) {
      const zeroPad = (num, places) => String(num).padStart(places, "0");
      // See changeHourIn: guard against null/undefined so we never build a
      // time string like "09:null:00.000".
      const hasH = activity.hour_out_h !== "" && activity.hour_out_h !== null && activity.hour_out_h !== undefined;
      const hasM = activity.hour_out_m !== "" && activity.hour_out_m !== null && activity.hour_out_m !== undefined;
      if (hasH) {
        activity.hour_out_h = zeroPad(activity.hour_out_h, 2);
      }
      if (hasM) {
        activity.hour_out_m = zeroPad(activity.hour_out_m, 2);
      }

      if (hasH && hasM && !isValidTime(activity.hour_out_h, activity.hour_out_m)) {
        this.refuseTime(activity, "hour_out");
      } else if (hasH && hasM) {
        activity.hour_out = `${activity.hour_out_h}:${activity.hour_out_m}:00.000`;
        this.saveActivity(activity, i, true);
      } else if (!hasH && !hasM) {
        activity.hour_out = null;
        this.saveActivity(activity, i, true);
      }
    },
    // an impossible time (25:00, 09:75) is not saved: the fields go back to
    // the saved time and a notice says why (issues/180)
    refuseTime(activity, field) {
      const saved = activity[field] ? activity[field].split(":") : [null, null];
      activity[field + "_h"] = saved[0];
      activity[field + "_m"] = saved[1];
      this.$buefy.toast.open({
        message: "L'hora ha d'anar de 00:00 a 23:59",
        type: "is-danger",
        queue: false
      });
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
    saveActivity(activity, i, replace, createActivity = true) {
      const raw = toRaw(activity);
      const previous = pendingSaves.get(raw) || Promise.resolve();
      const save = previous.then(() => this.storeActivity(activity, i, createActivity));
      pendingSaves.set(raw, save);
      return save;
    },
    async storeActivity(activity, i, createActivity) {
      this.updating = true;
      try {
        // Validate that at least one full pair (entrada or sortida) is set.
        // Previously this required BOTH pairs, which prevented saving when
        // the user only clicked "Entrada" (hour_out is still undefined).
        const hasHourIn =
          activity.hour_in_h !== undefined &&
          activity.hour_in_m !== undefined &&
          activity.hour_in_h !== "undefined" &&
          activity.hour_in_m !== "undefined" &&
          activity.hour_in_h !== null &&
          activity.hour_in_m !== null &&
          activity.hour_in_h !== "" &&
          activity.hour_in_m !== "";
        const hasHourOut =
          activity.hour_out_h !== undefined &&
          activity.hour_out_m !== undefined &&
          activity.hour_out_h !== "undefined" &&
          activity.hour_out_m !== "undefined" &&
          activity.hour_out_h !== null &&
          activity.hour_out_m !== null &&
          activity.hour_out_h !== "" &&
          activity.hour_out_m !== "";

        if (!hasHourIn && !hasHourOut) {
          this.updating = false;
          return;
        }
        if (activity.id && activity.id > 0) {
          await service({ requiresAuth: true }).put(
            `workday-logs/${activity.id}`,
            activity
          );
          if (createActivity) {
            this.projectChanged(activity, i)
          }
        } else {
          const db = await service({ requiresAuth: true }).post(
            "workday-logs",
            activity
          );
          // the slot stays the same object, with its key, its fields and
          // whatever was typed while the POST was on its way (issues/180)
          activity.id = db.data.id;
        }
      } catch (error) {
        this.$buefy.toast.open({
          message: saveErrorMessage(error),
          type: "is-danger",
          queue: false
        });
      } finally {
        this.updating = false;
      }
    },
    enumerateDaysBetweenDates() {
      var dates = [];
      var currDate = this.month
        ? moment(this.year + "-" + this.month, "YYYY-MM").startOf("month")
        : moment(this.year, "YYYY").startOf("year");
      var endDate = this.month
        ? moment(this.year + "-" + this.month, "YYYY-MM").endOf("month")
        : moment(this.year, "YYYY").endOf("year");
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
      const filename = this.month 
        ? `hores_${this.year}_${this.month}` 
        : `hores_${this.year}`;
      var opt = {
        margin: [0, 0],
        filename: filename,
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
          window.open(pdf.output("bloburl", filename + ".pdf"));
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
    selectProject(option, activity, i) {
      activity.project = option ? option.id : null;
      this.projectChanged(activity, i);
    },
    async projectChanged(activity, i) {
      this.updating = true;
      try {
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
            this.updating = false;
          } else {
            const newActivity = await service({ requiresAuth: true }).post("activities", item);
            activity.activity = newActivity.data;
            await this.saveActivity(activity, i, true, false);
            // saveActivity handles updating = false
          }
          
        } else if (activity.activity) {
          await service({ requiresAuth: true }).delete(
            `activities/${activity.activity.id || activity.activity}`
          );
          activity.activity = null;
          await this.saveActivity(activity, i, true, false);
          // saveActivity handles updating = false
        } else {
          // Nothing to save, just clear the loading state
          this.updating = false;
        }
      } catch (error) {
        this.updating = false;
      }
    },
    formatHourDiff(activity) {
      if (!activity.hour_in || !activity.hour_out) {
        return "0h";
      }
      return formatHoursMinutes(slotMinutes(activity.hour_in, activity.hour_out));
    },
    formatHourMonth(m) {
      return formatHoursMinutes(m && m.m ? m.m : 0);
    },
    formatMonthName(dt) {
      return moment(dt)
        .format("MMMM")
        .toUpperCase();
    }
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

/* ---- redesign A ---- */
.wl-today {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem 1rem;
  padding: .875rem 1.25rem;
  margin-bottom: 1rem;
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
}
.wl-today-label {
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--a-accent);
}
.wl-today b:first-letter {
  text-transform: uppercase;
}
.wl-table {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
  font-variant-numeric: tabular-nums;
}
.wl-head,
.wl-day,
.wl-sum {
  display: grid;
  grid-template-columns: 5rem minmax(0, max-content) auto minmax(0, 1fr) 5.5rem;
  align-items: center;
  gap: .75rem;
  padding: .5rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.wl-head {
  grid-template-columns: 5rem minmax(0, 1fr) 5.5rem;
  background: var(--a-thead);
  border-bottom-color: var(--a-line);
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--a-muted);
}
.wl-sum {
  grid-template-columns: minmax(0, 1fr) auto 5.5rem;
  background: var(--a-thead);
  font-weight: 800;
}
.wl-sum span:nth-child(2) {
  font-weight: 600;
}
.wl-sum.is-month,
.wl-sum.is-total {
  border-top: 1px solid var(--a-line);
}
.wl-sum.is-total {
  border-bottom: 0;
}
.wl-day {
  align-items: start;
}
.wl-date {
  font-weight: 800;
  line-height: 2rem;
}
.wl-total {
  grid-column: 5;
  line-height: 2rem;
}
.wl-day.is-quiet .wl-date,
.wl-day.is-quiet .wl-none {
  line-height: 1.75rem;
}
.wl-date:first-letter {
  text-transform: uppercase;
}
.wl-day.is-quiet {
  padding-top: .25rem;
  padding-bottom: .25rem;
  color: var(--a-muted);
}
.wl-day.is-quiet .wl-date {
  font-weight: 600;
}
.wl-day.is-festive {
  background: var(--a-info-bg);
  color: var(--a-info-fg);
}
.wl-day.is-today .wl-date {
  color: var(--a-accent);
}
.wl-slots {
  display: flex;
  flex-direction: column;
  gap: .375rem;
  min-width: 0;
}
.wl-slot {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: .375rem;
}
.wl-time {
  display: inline-flex;
  align-items: center;
  height: 2rem;
  padding: 0 .375rem;
  border: 1px solid var(--a-input);
  border-radius: 7px;
  background: var(--a-surface);
}
.wl-time:focus-within {
  border-color: var(--a-accent);
  box-shadow: 0 0 0 3px var(--a-focus);
}
.wl-num {
  width: 1.375rem;
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  font-size: .875rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--a-fg);
  outline: none;
}
.wl-num::placeholder {
  color: var(--a-line);
}
.wl-dash {
  color: var(--a-muted);
}
.wl-slot-warning {
  font-size: 0.8rem;
  margin-left: 0.5rem;
}
.wl-dur {
  min-width: 3.75rem;
  font-size: .75rem;
  font-weight: 800;
  color: var(--a-muted);
}
.wl-project {
  flex: none;
  width: 16rem;
}
.wl-icon,
.wl-add {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  border: 0;
  background: transparent;
  color: var(--a-muted);
  font: inherit;
  font-size: .8125rem;
  font-weight: 700;
  border-radius: 6px;
  padding: .25rem;
  cursor: pointer;
}
.wl-icon:hover {
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
}
.wl-add {
  color: var(--a-accent);
  justify-self: start;
  height: 2rem;
}
.wl-day.is-quiet .wl-add {
  height: 1.75rem;
}
.wl-add:hover {
  background: var(--a-accent-soft);
}
.wl-none {
  font-size: .8125rem;
  line-height: 2rem;
}
.wl-total {
  text-align: right;
}
@media screen and (max-width: 768px) {
  .wl-slot {
    flex-wrap: wrap;
  }
  .wl-project {
    width: 100%;
  }
  .wl-day {
    grid-template-columns: 4rem minmax(0, 1fr) 4.5rem;
  }
  .wl-day .wl-add {
    grid-column: 2;
  }
  .wl-day .wl-total {
    grid-column: 3;
    grid-row: 1;
  }
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

.time-part-input {
  max-width: 100px;
  margin-top: -4px;
}

.invoice-box-container.pdf-source {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 800px;
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
