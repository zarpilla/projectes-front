<template>
  <div>
    <modal-box-working-day
      :is-active="isModalActive"
      :dedication-object="dedicationObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
      @delete="modalDelete"
      :users="users"
      :quotes="quotes"
      :years="years"
    />
    <b-loading
      :is-full-page="true"
      v-model="loading"
      :can-cancel="false"
    ></b-loading>
    <div class="filter-bar persons-toolbar">
      <b-input
        v-model="search"
        class="filter-search"
        icon="magnify"
        placeholder="Cerca una persona"
        aria-label="Cerca una persona"
      />
      <div class="segmented" role="group" aria-label="Any">
        <button
          v-for="y in yearChoices"
          :key="y"
          type="button"
          :class="{ 'is-on': y === year }"
          :aria-pressed="y === year ? 'true' : 'false'"
          @click="setYear(y)"
        >{{ y }}</button>
      </div>
      <div class="persons-legend" aria-hidden="true">
        <span><i class="lg-bar"></i>Jornada (hores/dia)</span>
        <span><i class="lg-zero"></i>Sense jornada (0 h)</span>
        <span><i class="lg-today"></i>Avui</span>
      </div>
    </div>
    <div class="notification is-warning persons-warning">
      <b>Compte:</b> canviar jornades, salaris o costos de períodes passats
      recalcula el cost de les hores ja dedicades als projectes i pot afectar
      les bestretes.
    </div>
    <div class="gannt-container persons-gantt" v-if="showGantt">
      <div class="gantt" :id="ganttId"></div>
      <p class="persons-foot">
        Clica una barra per editar el període (dates, hores per dia,
        distribució setmanal, salari, Seguretat Social i cost/hora), o
        arrossega'n les vores per canviar-ne les dates. Clica el nom d'una
        persona o arrossega sobre la seva fila per afegir-li un període.
      </p>
    </div>
    <card-component
      class="has-table has-mobile-sort-spaced mt-5"
      v-if="true"
      title="Crear Bestretes"
    >
      <b-field horizontal>
        <b-field label="Any">
          <b-select v-model="filters.year" required>
            <option v-for="(year, index) in years" :key="index" :value="year">
              {{ year.year }}
            </option>
          </b-select>
        </b-field>
        <b-field label="Crear bestretes">
          <b-button
            type="is-primary mb-5"
            @click="createAll"
            :disabled="loading || !filters.year || !filters.year.id"
            >Crear</b-button
          >
        </b-field>
      </b-field>
    </card-component>
    <div class="help mb-3">
      <b-icon icon="help-circle-outline" custom-size="default" />
      <b>Informació</b><br />
      Amb aquest component pots crear les bestretes per tot l'any de totes les
      persones que tinguin definida la jornada
    </div>
    <card-component v-if="summary && summary.length">
      <div class="columns card-body">
        <div class="column has-text-weight-bold">Persona</div>
        <div class="column has-text-weight-bold">
          Bestretes creades
        </div>
        <div class="column has-text-weight-bold">
          Bestretes existents
        </div>
        <div class="column has-text-weight-bold">
          Bestretes totals
        </div>
      </div>
      <div v-for="info in summary" v-bind:key="info.user" class="card-body">
        <div class="columns">
          <div class="column">
            {{ info.username }}
          </div>
          <div class="column">
            {{ info.created }}
          </div>
          <div class="column">
            {{ info.existing }}
          </div>
          <div class="column">
            {{ info.created + info.existing }}
            <b-icon
              icon="alert-circle"
              custom-size="default"
              v-if="info.created + info.existing !== 12"
            />
          </div>
        </div>
      </div>
    </card-component>
  </div>
</template>

<script>
import ModalBoxWorkingDay from "@/components/ModalBoxWorkingDay.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
// import sumBy from 'lodash/sumBy'
import { Gantt } from "dhtmlx-gantt";
import moment from "moment";
import service from "@/service/index";
import _ from "lodash";
import CardComponent from "@/components/CardComponent.vue";
import { formatNumber } from "@/helpers/format-number.js";

// main component
export default {
  name: "DedicationWorkingDay",
  components: { ModalBoxWorkingDay, CardComponent },
  emits: ["summary"],
  computed: {
    ...mapState(useMainStore, ["userName"]),
    ...mapState(useMainStore, ["me"]),
    yearChoices() {
      const now = moment().year();
      return [now - 1, now, now + 1];
    }
  },
  watch: {
    search() {
      if (this.gantt && this.ganttReady) {
        this.gantt.render();
      }
    }
  },
  data() {
    return {
      isModalActive: false,
      dedicationObject: null,
      tasks: {},
      showGantt: false,
      ganttId: "",
      users: [],
      quotes: null,
      years: [],
      filters: {
        year: null,
        people_year: null
      },
      summary: [],
      loading: false,
      search: "",
      year: moment().year(),
      payrollsByUser: {},
      ganttReady: false,
      gantt: null // Will be initialized with separate instance
    };
  },
  async mounted() {
    // Create a separate gantt instance for this component (dhtmlx-gantt v10)
    this.gantt = Gantt.getGanttInstance();

    this.ganttId = "gantt-" + this.create_UUID();
    this.initializeAll();
  },
  beforeUnmount() {
    if (this.gantt) {
      this.gantt.detachEvent("onTaskClick");
      // Remove custom drag listeners
      if (this._onBarMouseDownBound) {
        const container =
          this.gantt.$task_data || this.gantt.$root || document;
        container.removeEventListener(
          "mousedown",
          this._onBarMouseDownBound,
          true
        );
      }
      document.removeEventListener("mousemove", this._onBarMouseMoveBound);
      document.removeEventListener("mouseup", this._onBarMouseUpBound);
      this.gantt.clearAll();
      // Properly destroy the gantt instance
      this.gantt.destructor();
    }

    this.showGantt = false;
  },
  methods: {
    initializeAll() {
      this.showGantt = true;

      this.tasks = { data: [] };

      this.getQuotes();

      setTimeout(() => {
        this.initializeGannt();
      }, 250);
    },
    async getQuotes() {
      const me = (await service({ requiresAuth: true, cached: true }).get("me"))
        .data;
      if (me && me.quotes && me.quotes.id) {
        this.quotes = me.quotes;
      }
    },
    async initializeGannt() {
      this.tasks = { data: [] };
      const users = (
        await service({ requiresAuth: true, cached: true }).get("users")
      ).data;
      this.users = users;
      const dedications = (
        await service({ requiresAuth: true }).get("daily-dedications?_limit=-1")
      ).data;
      this.years = (
        await service({ requiresAuth: true, cached: true }).get(
          "years?_limit=-1&_sort=year:DESC"
        )
      ).data;
      if (!this.filters.year) {
        this.filters.year = this.years.find(y => String(y.year) === String(this.year)) || null;
      }

      var minStartDate = moment().format("YYYY-MM-DD");

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (!user.hidden) {
          const userDedications = dedications.filter(
            d =>
              d.users_permissions_user &&
              d.users_permissions_user.id === user.id
          );

          // Users without dedications (e.g. recently created) must still be
          // listed so an admin can add their first working-day period. We
          // give them a default date range centred on "now" so the row is
          // visible and clickable.
          let minUserDate = null;
          let maxUserDate = null;

          if (userDedications.length > 0) {
            // Calculate parent task date range from children
            userDedications.forEach(d => {
              if (!minUserDate || moment(d.from).isBefore(moment(minUserDate))) {
                minUserDate = d.from;
              }
              if (!maxUserDate || moment(d.to).isAfter(moment(maxUserDate))) {
                maxUserDate = d.to;
              }
            });

            // Track the earliest start date
            if (
              minUserDate &&
              moment(minUserDate).isBefore(moment(minStartDate))
            ) {
              minStartDate = moment(minUserDate).format("YYYY-MM-DD");
            }
          } else {
            // placeholder for "Defineix la primera jornada" (see emptyRange)
            [minUserDate, maxUserDate] = this.emptyRange();
          }

          // NOTE: dhtmlx-gantt Community edition does NOT support inline
          // split-task rendering (render:"split" only works in PRO). To show
          // all dedication periods on a SINGLE row per person we use ONE flat
          // task per person spanning the full date range, and draw the
          // individual periods as bars inside it via the task_text template.
          const task = {
            id: user.id,
            text: user.username,
            start_date: moment(minUserDate, "YYYY-MM-DD").toDate(),
            end_date: moment(maxUserDate, "YYYY-MM-DD")
              .add(1, "day")
              .toDate(),
            parent: 0,
            readonly: true,
            _user: user,
            _dedications: userDedications.slice().sort((a, b) => {
              return moment(a.from).diff(moment(b.from));
            }),
            _dedication: { users_permissions_user: user } // for "add new" modal
          };

          this.tasks.data.push(task);
        }
      }

      this.gantt.i18n.setLocale("ca");
      this.gantt.config.columns = [
        {
          name: "text",
          label: "Persona · jornada actual",
          tree: false,
          width: 230,
          template: task =>
            `<div class="person-cell"><b>${this.escape(task.text)}</b>` +
            `<span>${this.escape(this.personSubline(task))}</span></div>`
        }
      ];
      // a second grid on the right: payroll advances of the shown year
      this.payrollColumn = {
        name: "payrolls",
        label: "Bestretes " + this.year,
        align: "right",
        width: 130,
        template: task => this.payrollTag(task)
      };
      this.gantt.config.layout = {
        css: "gantt_container",
        rows: [
          {
            cols: [
              { view: "grid", width: 230, scrollX: "scrollHor", scrollY: "scrollVer" },
              { view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
              {
                view: "grid",
                id: "payrollGrid",
                bind: "task",
                width: 130,
                scrollY: "scrollVer",
                config: {
                  columns: [this.payrollColumn]
                }
              },
              { view: "scrollbar", id: "scrollVer" }
            ]
          },
          { view: "scrollbar", id: "scrollHor", height: 12 }
        ]
      };

      this.gantt.config.row_height = 54;
      this.gantt.config.bar_height = 22;
      this.gantt.config.scale_height = 40;
      this.gantt.config.autosize = "y";
      this.gantt.config.show_tasks_outside_timescale = true;
      this.gantt.config.xml_date = "%Y-%m-%d";
      this.gantt.config.duration_unit = "day";
      this.gantt.config.scales = [{ unit: "month", step: 1, format: "%M" }];
      this.applyYearRange();

      this.gantt.attachEvent("onBeforeTaskDisplay", (id, task) => {
        const q = this.search.trim().toLowerCase();
        return !q || String(task.text || "").toLowerCase().includes(q);
      });

      this.gantt.plugins({ click_drag: true });
      // "today" line (the marker plugin is not in the free edition)
      this.gantt.attachEvent("onGanttRender", () => this.drawToday());

      this.gantt.showLightbox = function(id) {
        // code of the custom form
      };

      // Render dedication bars inside each person's task bar.
      this.gantt.templates.task_text = (start, end, task) => {
        if (!task._dedications || !task._dedications.length) {
          return `<span class="first-period">+ Defineix la primera jornada</span>`;
        }
        // the person's bar is drawn only over the shown year: place the periods
        // against that visible part, and leave out the ones outside it
        const [taskStart, taskEnd] = this.visibleRange(task);
        const span = taskEnd - taskStart || 1;
        let html = "";
        task._dedications.forEach(d => {
          const dStart = Math.max(+moment(d.from), taskStart);
          const dEnd = Math.min(+moment(d.to, "YYYY-MM-DD").add(1, "day"), taskEnd);
          if (dEnd <= dStart) {
            return;
          }
          const left = ((dStart - taskStart) / span) * 100;
          const width = ((dEnd - dStart) / span) * 100;
          html +=
            `<div class="dedication-bar` +
            (Number(d.hours) ? "" : " is-zero") +
            `" data-dedication-id="` +
            d.id +
            `" style="left:` +
            left.toFixed(2) +
            `%;width:` +
            width.toFixed(2) +
            `%">` +
            `<div class="dedication-resize-handle dedication-handle-left"></div>` +
            `<span class="dedication-bar-label">` +
            (d.hours != null ? this.formatHours(d.hours) + " h" : "") +
            `</span>` +
            `<div class="dedication-resize-handle dedication-handle-right"></div>` +
            `</div>`;
        });
        return html;
      };

      // Hide the default task content text (we draw our own bars)
      this.gantt.templates.task_class = (start, end, task) => {
        if (!task._dedications) {
          return "";
        }
        return task._dedications.length ? "dedication-row" : "dedication-row is-empty";
      };

      this.gantt.attachEvent(
        "onTaskClick",
        (id, e) => {
          // If we just finished a drag/resize, do not open the edit modal
          if (this._suppressNextClick) {
            this._suppressNextClick = false;
            return true;
          }
          // Detect a click on a specific dedication bar
          const barEl = e.target.closest
            ? e.target.closest("[data-dedication-id]")
            : null;
          if (barEl) {
            const dedicationId = barEl.getAttribute("data-dedication-id");
            const task = this.tasks.data.find(
              t => t.id.toString() === id.toString()
            );
            const dedication = task
              ? task._dedications.find(
                  d => d.id.toString() === dedicationId.toString()
                )
              : null;
            if (dedication) {
              this.dedicationObject = {
                _dedication: dedication
              };
              this.isModalActive = true;
              return false;
            }
          }

          // Otherwise open the user-level (add new period) modal
          this.dedicationObject = this.tasks.data.find(
            t => t.id.toString() === id.toString()
          );
          this.isModalActive = true;
          return true;
        },
        { id: "onTaskClick" }
      );

      this.gantt.config.click_drag = {
        callback: this.onDragEnd,
        singleRow: false
      };

      this.gantt.init(this.ganttId);

      this.gantt.parse(this.tasks);
      this.ganttReady = true;
      this.emitSummary();
      this.loadPayrolls();

      // Enable drag-to-resize / drag-to-move on the dedication bars
      this.setupResizeHandlers();
    },

    // ---- Custom resize / move for dedication bars (Community edition) ----
    setupResizeHandlers() {
      this._onBarMouseDownBound = ev => this.onBarMouseDown(ev);
      this._onBarMouseMoveBound = ev => this.onBarMouseMove(ev);
      this._onBarMouseUpBound = ev => this.onBarMouseUp(ev);
      const container =
        this.gantt.$task_data || this.gantt.$root || document;
      container.addEventListener(
        "mousedown",
        this._onBarMouseDownBound,
        true
      );
    },
    onBarMouseDown(e) {
      const target = e.target;
      const barEl = target.closest ? target.closest(".dedication-bar") : null;
      if (!barEl) return;
      const taskLineEl = barEl.closest
        ? barEl.closest(".gantt_task_line")
        : null;
      if (!taskLineEl) return;
      const dedicationId = barEl.getAttribute("data-dedication-id");
      const taskId = taskLineEl.getAttribute(
        this.gantt.config.task_attribute
      );
      const task = this.tasks.data.find(
        t => String(t.id) === String(taskId)
      );
      if (!task || !task._dedications) return;
      const dedication = task._dedications.find(
        d => String(d.id) === String(dedicationId)
      );
      if (!dedication) return;

      let mode = "move";
      if (target.classList.contains("dedication-handle-left"))
        mode = "resize-left";
      else if (target.classList.contains("dedication-handle-right"))
        mode = "resize-right";

      this._drag = {
        task,
        dedication,
        mode,
        barEl,
        taskLineEl,
        moved: false,
        grabOffsetMs: null
      };
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener("mousemove", this._onBarMouseMoveBound);
      document.addEventListener("mouseup", this._onBarMouseUpBound);
      barEl.classList.add("dragging");
    },
    onBarMouseMove(e) {
      if (!this._drag) return;
      const drag = this._drag;
      const { task, dedication, mode, barEl, taskLineEl } = drag;

      const rect = taskLineEl.getBoundingClientRect();
      const [taskStart, taskEnd] = this.visibleRange(task);
      const span = taskEnd - taskStart || 1;
      // Do NOT clamp pct to [0,1]: when expanding a period past the task
      // bar's visual bounds, the pointer is outside the bar so pct goes
      // below 0 or above 1. Clamping would block expansion.
      const pct = (e.clientX - rect.left) / rect.width;
      const pointerMs = taskStart + pct * span;

      const curStart = +moment(dedication.from);
      const curEnd = +moment(dedication.to, "YYYY-MM-DD").add(1, "day");
      let newStart = curStart;
      let newEnd = curEnd;

      if (mode === "resize-left") {
        const candidate = this.startOfDayMs(pointerMs);
        if (candidate < curEnd - 86400000) newStart = candidate;
      } else if (mode === "resize-right") {
        const candidate = this.startOfDayMs(pointerMs);
        if (candidate > curStart + 86400000) newEnd = candidate;
      } else {
        if (drag.grabOffsetMs == null) {
          drag.grabOffsetMs = pointerMs - curStart;
        }
        newStart = this.startOfDayMs(pointerMs - drag.grabOffsetMs);
        newEnd = newStart + (curEnd - curStart);
      }

      // Prevent overlapping other periods of the same person
      if (
        this.dedicationsOverlap(task._dedications, dedication.id, newStart, newEnd)
      ) {
        return;
      }

      // NOTE: we intentionally do NOT clamp to the task's current date range.
      // The task range is just a display container (recomputed after save via
      // recomputeTaskRange). Clamping would prevent extending the last period
      // to the right and would block moving any period, because the task
      // range tightly wraps the existing periods.

      // Live visual feedback
      const leftPct = ((newStart - taskStart) / span) * 100;
      const widthPct = ((newEnd - newStart) / span) * 100;
      barEl.style.left = leftPct.toFixed(2) + "%";
      barEl.style.width = widthPct.toFixed(2) + "%";

      drag.newStart = newStart;
      drag.newEnd = newEnd;
      drag.moved = true;
    },
    onBarMouseUp(e) {
      document.removeEventListener("mousemove", this._onBarMouseMoveBound);
      document.removeEventListener("mouseup", this._onBarMouseUpBound);
      const drag = this._drag;
      this._drag = null;
      if (!drag) return;
      drag.barEl.classList.remove("dragging");
      if (!drag.moved) {
        return; // pure click -> let onTaskClick open the modal
      }
      // Suppress the click event that follows, so the modal won't open
      this._suppressNextClick = true;

      const newFrom = moment(drag.newStart).format("YYYY-MM-DD");
      const newTo = moment(drag.newEnd - 86400000).format("YYYY-MM-DD");
      this.saveDedicationResize(drag.task, drag.dedication, newFrom, newTo);
    },
    startOfDayMs(ms) {
      const d = new Date(ms);
      d.setHours(0, 0, 0, 0);
      return +d;
    },
    dedicationsOverlap(dedications, exceptId, startMs, endMs) {
      return dedications.some(d => {
        if (String(d.id) === String(exceptId)) return false;
        const oStart = +moment(d.from);
        const oEnd = +moment(d.to, "YYYY-MM-DD").add(1, "day");
        return startMs < oEnd && endMs > oStart;
      });
    },
    async saveDedicationResize(task, dedication, from, to) {
      // Final overlap guard before persisting
      const startMs = +moment(from);
      const endMs = +moment(to, "YYYY-MM-DD").add(1, "day");
      if (this.dedicationsOverlap(task._dedications, dedication.id, startMs, endMs)) {
        this.$buefy.snackbar.open({
          message: "No es pot solapar amb un altre període",
          queue: false
        });
        if (this.gantt.isTaskExists(task.id)) this.gantt.updateTask(task.id);
        return;
      }

      this.loading = true;
      try {
        // The backend beforeUpdate lifecycle reads several scalar fields from
        // the payload (costByHour, monthly_salary, scheme, quota, pct_*,
        // hoursperday) to recompute activity costs. If any is missing it
        // becomes undefined => NaN is written to the DB ("Unknown column NaN").
        // So we keep all the dedication's scalar fields, override from/to,
        // and replace the users_permissions_user RELATION with just its ID
        // (sending the full nested user object also causes a 500).
        const userId =
          dedication.users_permissions_user &&
          (dedication.users_permissions_user.id ||
            dedication.users_permissions_user);
        const payload = { ...dedication };
        delete payload._dedication;
        delete payload.users_permissions_user;
        delete payload.created_at;
        delete payload.updated_at;
        payload.from = from;
        payload.to = to;
        payload.users_permissions_user = userId;
        const newActivity = (
          await service({ requiresAuth: true }).put(
            `daily-dedications/${dedication.id}`,
            payload
          )
        ).data;

        const idx = task._dedications.findIndex(
          d => String(d.id) === String(dedication.id)
        );
        if (idx > -1) {
          task._dedications.splice(idx, 1, newActivity);
          task._dedications.sort((a, b) =>
            moment(a.from).diff(moment(b.from))
          );
          this.recomputeTaskRange(task);
          if (this.gantt.isTaskExists(task.id)) {
            this.gantt.getTask(task.id).start_date = task.start_date;
            this.gantt.getTask(task.id).end_date = task.end_date;
            this.gantt.updateTask(task.id);
          }
        }
        this.$buefy.snackbar.open({ message: "Guardat", queue: false });
      } catch (err) {
        console.error("activities error", err);
        this.$buefy.snackbar.open({ message: "Error", queue: false });
        if (this.gantt.isTaskExists(task.id)) this.gantt.updateTask(task.id);
      }
      this.loading = false;
    },

    onDragEnd(
      startPoint,
      endPoint,
      startDate,
      endDate,
      tasksBetweenDates,
      tasksInRow
    ) {
      if (tasksInRow.length) {
        const userId = tasksInRow[0].id;

        const task = this.tasks.data.find(
          t => t.id.toString() === userId.toString()
        );

        // New dedication period via drag
        this.dedicationObject = {
          start_date: this.gantt.roundDate(startDate),
          end_date: this.gantt.roundDate(endDate),
          _dedication: {
            from: moment(this.gantt.roundDate(startDate)).format("YYYY-MM-DD"),
            to: moment(
              this.gantt.date.add(this.gantt.roundDate(endDate), -1, "day")
            ).format("YYYY-MM-DD"),
            users_permissions_user: this.users.find(
              u => u.id.toString() === userId.toString()
            )
          }
        };

        this.isModalActive = true;
        return true;
      }
      return;
    },
    create_UUID() {
      var dt = new Date().getTime();
      var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function(c) {
          var r = (dt + Math.random() * 16) % 16 | 0;
          dt = Math.floor(dt / 16);
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        }
      );
      return uuid;
    },
    async modalSubmit(activity) {
      if (
        moment(activity.from).format("YYYY-MM-DD") <
        moment().format("YYYY-MM-DD")
      ) {
        this.$buefy.dialog.confirm({
          message:
            "Estàs a punt de modificar períodes anteriors que poden modificar les bestretes ja pagades. Caldràs esborrar i regenerar manualment les bestretes. Estàs segura?",
          onConfirm: async () => {
            await this.updateActivity(activity);
          },
          onCancel: () => {
            return false;
          }
        });
      } else {
        await this.updateActivity(activity);
      }
    },

    payrollsOverlaps(from, to, payrolls) {
      const overlaps = false;
      const mdiff = Math.round(
        moment
          .duration(moment(to, "YYYY-MM-DD").diff(moment(from, "YYYY-MM-DD")))
          .asMonths()
      );
      for (let i = 0; i < mdiff; i++) {
        const day = moment(from, "YYYY-MM-DD").add(i, "month");
        const year = day.format("YYYY");
        const month = day.format("M");
        if (
          payrolls.filter(p => p.year.year == year && p.month.month == month)
            .length
        ) {
          return true;
        }
      }
      return true;
    },

    async updateActivity(activity) {
      this.loading = true;

      if (activity.id) {
        const { _dedication, ...activityObject } = activity;
        activityObject.from = moment(activityObject.from).format("YYYY-MM-DD");
        activityObject.to = moment(activityObject.to).format("YYYY-MM-DD");

        try {
          const newActivity = (
            await service({ requiresAuth: true }).put(
              `daily-dedications/${activity.id}`,
              activityObject
            )
          ).data;
          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          // Update the dedication inside the user task and refresh the row
          const task = this.tasks.data.find(
            t =>
              t._dedications &&
              t._dedications.some(
                d => d.id.toString() === activity.id.toString()
              )
          );
          if (task) {
            const idx = task._dedications.findIndex(
              d => d.id.toString() === activity.id.toString()
            );
            if (idx > -1) {
              task._dedications.splice(idx, 1, newActivity);
              task._dedications.sort((a, b) =>
                moment(a.from).diff(moment(b.from))
              );
              this.recomputeTaskRange(task);
              if (this.gantt.isTaskExists(task.id)) {
                this.gantt.getTask(task.id).start_date = task.start_date;
                this.gantt.getTask(task.id).end_date = task.end_date;
                this.gantt.updateTask(task.id);
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
      } else {
        const userId =
          activity.users_permissions_user.id || activity.users_permissions_user;

        try {
          const newActivity = (
            await service({ requiresAuth: true }).post(
              "daily-dedications",
              {
                ...activity,
                from: moment(activity.from).format("YYYY-MM-DD"),
                to: moment(activity.to).format("YYYY-MM-DD")
              }
            )
          ).data;

          const task = this.tasks.data.find(
            t => t.id.toString() === userId.toString()
          );
          if (task) {
            task._dedications.push(newActivity);
            task._dedications.sort((a, b) =>
              moment(a.from).diff(moment(b.from))
            );
            this.recomputeTaskRange(task);
            if (this.gantt.isTaskExists(task.id)) {
              this.gantt.getTask(task.id).start_date = task.start_date;
              this.gantt.getTask(task.id).end_date = task.end_date;
              this.gantt.updateTask(task.id);
            }
          }

          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });
        } catch (err) {
          console.error("activities error", err);
          this.$buefy.snackbar.open({
            message:
              "Error al guardar. Pot ser que s'estiguin solapant períodes?",
            queue: false
          });
        }
      }
      this.loading = false;
      this.isModalActive = false;
    },
    setYear(year) {
      if (year === this.year) {
        return;
      }
      this.year = year;
      const y = this.years.find(item => String(item.year) === String(year));
      if (y) {
        this.filters.year = y;
      }
      this.applyYearRange();
      this.tasks.data
        .filter(t => t._dedications && !t._dedications.length && this.gantt.isTaskExists(t.id))
        .forEach(t => {
          const [from, to] = this.emptyRange();
          t.start_date = moment(from).toDate();
          t.end_date = moment(to).add(1, "day").toDate();
          Object.assign(this.gantt.getTask(t.id), { start_date: t.start_date, end_date: t.end_date });
        });
      this.gantt.render();
      this.loadPayrolls();
    },
    drawToday() {
      const area = this.gantt.$task_data;
      if (!area) {
        return;
      }
      let line = area.querySelector(".today-marker");
      const now = new Date();
      if (now < this.gantt.config.start_date || now >= this.gantt.config.end_date) {
        if (line) line.remove();
        return;
      }
      if (!line) {
        line = document.createElement("div");
        line.className = "today-marker";
        line.title = "Avui";
        area.appendChild(line);
      }
      line.style.left = this.gantt.posFromDate(now) + "px";
    },
    // the part of a person's row bar inside the shown year (dhtmlx clips the bar to it)
    visibleRange(task) {
      return [
        Math.max(+task.start_date, +this.gantt.config.start_date),
        Math.min(+task.end_date, +this.gantt.config.end_date)
      ];
    },
    // the timeline shows one year, its twelve months filling the width
    applyYearRange() {
      const start = moment({ year: this.year }).startOf("year");
      this.gantt.config.start_date = start.toDate();
      this.gantt.config.end_date = start.clone().add(1, "year").toDate();
      const el = document.getElementById(this.ganttId);
      const width = el ? el.clientWidth : 1100;
      // person grid + payroll grid + vertical scrollbar
      const timeline = Math.max(width - 230 - 130 - 20, 480);
      this.gantt.config.min_column_width = Math.floor(timeline / 12);
    },
    emptyRange() {
      const from = moment({ year: this.year }).startOf("year");
      return [from.format("YYYY-MM-DD"), from.clone().add(3, "month").subtract(1, "day").format("YYYY-MM-DD")];
    },
    currentDedication(task) {
      const today = moment().format("YYYY-MM-DD");
      return (task._dedications || []).find(d => d.from <= today && (!d.to || d.to >= today));
    },
    personSubline(task) {
      if (!task._dedications) {
        return "";
      }
      if (!task._dedications.length) {
        return "Sense cap període definit";
      }
      const current = this.currentDedication(task);
      if (current && Number(current.hours)) {
        // No cost per hour here: the list is shown on screen, keep it discreet.
        return `${this.formatHours(current.hours)} h/dia`;
      }
      if (current) {
        return "0 h ara · sense jornada activa";
      }
      const last = task._dedications[task._dedications.length - 1];
      if (last.to && last.to < moment().format("YYYY-MM-DD")) {
        return `Sense jornada activa · fins al ${moment(last.to).format("DD/MM/YYYY")}`;
      }
      return "Sense jornada activa";
    },
    formatHours(hours) {
      return formatNumber(hours, 2);
    },
    escape(text) {
      return String(text === undefined || text === null ? "" : text).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    },
    emitSummary() {
      const people = this.tasks.data.filter(t => t._dedications);
      const active = people.filter(t => {
        const current = this.currentDedication(t);
        return current && Number(current.hours);
      });
      this.$emit("summary", { people: people.length, active: active.length });
    },
    async loadPayrolls() {
      const y = this.years.find(item => String(item.year) === String(this.year));
      const counts = {};
      if (y) {
        const payrolls = (
          await service({ requiresAuth: true }).get(`payrolls?_where[year]=${y.id}&_limit=-1`)
        ).data;
        payrolls.forEach(p => {
          const user = p.users_permissions_user && (p.users_permissions_user.id || p.users_permissions_user);
          if (user) {
            counts[user] = (counts[user] || 0) + 1;
          }
        });
      }
      this.payrollsByUser = y ? counts : null;
      // the grid keeps its own copy of the columns
      const grid = this.gantt && this.gantt.$ui && this.gantt.$ui.getView("payrollGrid");
      const columns = grid && grid.$getConfig ? grid.$getConfig().columns : null;
      [this.payrollColumn, ...(columns || [])].forEach(c => {
        if (c && c.name === "payrolls") c.label = "Bestretes " + this.year;
      });
      if (this.gantt && this.ganttReady) {
        this.gantt.render();
      }
    },
    payrollTag(task) {
      if (!task._dedications) {
        return "";
      }
      if (!this.payrollsByUser) {
        return `<span class="payroll-tag">—</span>`;
      }
      const n = this.payrollsByUser[task.id] || 0;
      const css = n >= 12 ? "is-full" : n > 0 ? "is-partial" : "";
      return `<span class="payroll-tag ${css}" title="Bestretes de ${this.year}">${n} / 12</span>`;
    },
    recomputeTaskRange(task) {
      if (!task._dedications || !task._dedications.length) return;
      let minD = null;
      let maxD = null;
      task._dedications.forEach(d => {
        if (!minD || moment(d.from).isBefore(moment(minD))) minD = d.from;
        if (!maxD || moment(d.to).isAfter(moment(maxD))) maxD = d.to;
      });
      task.start_date = moment(minD, "YYYY-MM-DD").toDate();
      task.end_date = moment(maxD, "YYYY-MM-DD")
        .add(1, "day")
        .toDate();
    },
    async modalDelete(activity) {
      await service({ requiresAuth: true }).delete(
        `daily-dedications/${activity.id}`
      );

      const task = this.tasks.data.find(
        t =>
          t._dedications &&
          t._dedications.some(d => d.id.toString() === activity.id.toString())
      );
      if (task) {
        task._dedications = task._dedications.filter(
          d => d.id.toString() !== activity.id.toString()
        );
        if (task._dedications.length) {
          this.recomputeTaskRange(task);
          if (this.gantt.isTaskExists(task.id)) {
            this.gantt.getTask(task.id).start_date = task.start_date;
            this.gantt.getTask(task.id).end_date = task.end_date;
            this.gantt.updateTask(task.id);
          }
        } else {
          this.tasks.data = this.tasks.data.filter(
            t => t.id.toString() !== task.id.toString()
          );
          if (this.gantt.isTaskExists(task.id)) {
            this.gantt.deleteTask(task.id);
          }
        }
      }

      this.$buefy.snackbar.open({
        message: "Esborrat",
        queue: false
      });

      this.isModalActive = false;
    },
    modalCancel() {
      this.isModalActive = false;
    },
    trashCancel() {
      this.isModalActive = false;
    },

    async createAll() {
      // Guard against double-clicks / concurrent calls. The backend reads the
      // user's existing payrolls once into a snapshot, so two overlapping
      // requests both see a stale (empty) list and create duplicates. The
      // full-page loading overlay + disabled button prevent the trigger, and
      // the backend now also re-checks before each insert (defense in depth).
      if (this.loading) {
        return;
      }
      this.loading = true;
      try {
        this.summary = (
          await service({ requiresAuth: true }).post(
            `payrolls/create-all?year=${this.filters.year.year}`
          )
        ).data.userPayrollsInfo;
        this.$buefy.snackbar.open({
          message: "Bestretes creades",
          queue: false
        });
      } catch (err) {
        console.error("createAll error", err);
        this.$buefy.snackbar.open({
          message: "Error al crear les bestretes",
          queue: false
        });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
<style scoped>
.persons-toolbar .filter-search {
  flex: 0 1 22rem;
}
.persons-legend {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: .25rem 1rem;
  font-size: .8125rem;
  font-weight: 600;
  color: var(--a-fg-2);
}
.persons-legend span {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
}
.persons-legend i {
  display: inline-block;
  width: 1rem;
  height: .5rem;
  border-radius: 3px;
}
.persons-legend .lg-bar {
  background: var(--a-accent);
}
.persons-legend .lg-zero {
  background: repeating-linear-gradient(135deg, var(--a-line) 0 3px, var(--a-chip) 3px 6px);
}
.persons-legend .lg-today {
  width: 2px;
  height: .875rem;
  background: #D9480F;
}
.persons-warning {
  padding: .75rem 1rem;
  font-size: .875rem;
}
.persons-gantt {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
}
.persons-foot {
  padding: .75rem 1rem;
  border-top: 1px solid var(--a-line);
  font-size: .8125rem;
  color: var(--a-fg-2);
}
</style>
<style>
@import "dhtmlx-gantt/codebase/dhtmlxgantt.css";

/* ---- Persones chart (redesign A) ---- */
.persons-gantt .gantt_container {
  font-family: inherit;
  font-size: .8125rem;
  border: 0;
  color: var(--a-fg);
}
.persons-gantt .gantt_grid_scale,
.persons-gantt .gantt_task_scale {
  background: var(--a-thead);
  border-bottom: 1px solid var(--a-line);
}
.persons-gantt .gantt_grid_head_cell,
.persons-gantt .gantt_scale_cell {
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--a-muted);
}
.persons-gantt .gantt_grid_head_cell {
  text-align: left;
  padding-left: 1rem;
}
.persons-gantt .gantt_grid_head_cell[data-column-name="payrolls"] {
  text-align: right;
  padding-right: 1rem;
}
.persons-gantt .gantt_scale_cell {
  text-align: left;
  padding-left: .375rem;
  border-right-color: var(--a-line-soft);
}
.persons-gantt .gantt_grid,
.persons-gantt .gantt_grid_scale {
  border-right: 0;
}
.persons-gantt .gantt_row,
.persons-gantt .gantt_task_row {
  border-bottom-color: var(--a-line-soft);
}
.persons-gantt .gantt_task_cell {
  border-right-color: var(--a-line-soft);
}
.persons-gantt .gantt_row:hover,
.persons-gantt .gantt_task_row:hover,
.persons-gantt .gantt_row.gantt_selected,
.persons-gantt .gantt_task_row.gantt_selected {
  background: var(--a-chip);
}
.persons-gantt .gantt_row {
  cursor: pointer;
}
.persons-gantt .gantt_cell {
  padding: 0 1rem;
}
.person-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.3;
  height: 100%;
  white-space: normal;
}
.person-cell b {
  font-weight: 700;
  font-size: .875rem;
  color: var(--a-fg);
}
.person-cell span {
  font-size: .75rem;
  color: var(--a-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.payroll-tag {
  display: inline-block;
  padding: .125rem .5rem;
  border-radius: 999px;
  background: var(--a-chip);
  color: var(--a-fg-2);
  font-size: .75rem;
  font-weight: 800;
  line-height: 1.4;
}
.payroll-tag.is-partial {
  background: var(--a-warn-bg);
  color: var(--a-warn-fg);
}
.payroll-tag.is-full {
  background: var(--a-accent-soft);
  color: var(--a-accent-hover);
}
.today-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #D9480F;
  z-index: 5;
  pointer-events: none;
}

/* The person row: the default bar is only a container, the dedication
   periods are drawn inside it (rendered via task_text). */
.dedication-row.gantt_task_line {
  background: transparent;
  border: 0;
  box-shadow: none;
}
.dedication-row .gantt_task_content {
  position: absolute;
  padding: 0;
  overflow: visible;
}
.dedication-row.is-empty .gantt_task_content {
  position: static;
  display: flex;
  align-items: center;
}
.first-period {
  display: inline-block;
  padding: 0 .625rem;
  border: 1px dashed var(--a-input);
  border-radius: 6px;
  background: var(--a-surface);
  color: var(--a-accent);
  font-size: .75rem;
  font-weight: 800;
  line-height: 1.6;
  cursor: pointer;
}

/* Individual dedication periods drawn inside the person's row */
.dedication-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 4px;
  background: var(--a-accent);
  border: 1px solid var(--a-surface);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  transition: filter 0.15s ease;
  box-sizing: border-box;
}
/* narrow periods (e.g. one per month) hide their label instead of clipping it */
.dedication-bar {
  container-type: inline-size;
}
@container (max-width: 34px) {
  .dedication-bar-label {
    display: none;
  }
}
.dedication-bar.is-zero {
  background: repeating-linear-gradient(135deg, var(--a-line) 0 4px, var(--a-chip) 4px 8px);
}
.dedication-bar:hover {
  filter: brightness(1.1);
}
.dedication-bar.dragging {
  z-index: 20;
  filter: brightness(1.08);
  cursor: grabbing;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

/* Resize handles (edges of each dedication bar) */
.dedication-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 3;
}
.dedication-handle-left {
  left: 0;
}
.dedication-handle-right {
  right: 0;
}
.dedication-bar-label {
  color: var(--a-on-accent);
  font-size: .6875rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  padding: 0 .5rem;
}
.dedication-bar.is-zero .dedication-bar-label {
  color: var(--a-fg-2);
}
</style>
