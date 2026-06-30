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
    <div class="gannt-container" v-if="showGantt">
      <div class="gantt" :id="ganttId"></div>
    </div>
    <div class="help">
      <b-icon icon="help-circle-outline" custom-size="default" />
      <b>Com funciona?</b><br />
      Fent click sobre el nom de la persona o en cadascun dels períodes ja
      definits (blau) es pot editar el període, les hores diaries de treball, el
      salari i el cost hora.
      <br /><br />
      <b-icon icon="help-circle-outline" custom-size="default" />
      <b>Atenció</b><br />
      Modificar les jornades laborals o els salaris o els costos laborals de
      períodes passats pot afectar a les bestretes i sobretot, als costos dels
      projectes amb hores dedicades, per això cal que estiguis segura del que
      vas a fer.
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
            :disabled="!filters.year || !filters.year.id"
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
import { EventBus } from "@/service/event-bus.js";
import ModalBoxWorkingDay from "@/components/ModalBoxWorkingDay";
import { mapState } from "vuex";
// import sumBy from 'lodash/sumBy'
import { Gantt } from "dhtmlx-gantt";
import moment from "moment";
import service from "@/service/index";
import _ from "lodash";
import CardComponent from "@/components/CardComponent";

// main component
export default {
  name: "DedicationWorkingDay",
  components: { ModalBoxWorkingDay, CardComponent },
  computed: {
    ...mapState(["userName"]),
    ...mapState(["me"])
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
      gantt: null // Will be initialized with separate instance
    };
  },
  async mounted() {
    // Create a separate gantt instance for this component (dhtmlx-gantt v10)
    this.gantt = Gantt.getGanttInstance();

    this.ganttId = "gantt-" + this.create_UUID();
    this.initializeAll();
  },
  beforeDestroy() {
    // console.log('beforeDestroy')
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
      // console.log('me!', me)
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

      var minStartDate = moment().format("YYYY-MM-DD");

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (!user.hidden) {
          const userDedications = dedications.filter(
            d =>
              d.users_permissions_user &&
              d.users_permissions_user.id === user.id
          );

          // Only add user if they have dedications
          if (userDedications.length === 0) {
            continue;
          }

          // Calculate parent task date range from children
          let minUserDate = null;
          let maxUserDate = null;
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

      this.gantt.config.columns = [
        {
          name: "text",
          label: "Jornada",
          tree: true,
          width: "150",
          resize: true
        }
      ];

      this.gantt.config.scroll_size = 30;
      this.gantt.config.xml_date = "%Y-%m-%d";
      this.gantt.config.duration_unit = "day";
      this.gantt.config.scales = [
        { unit: "year", step: 1, format: "%Y" },
        { unit: "month", step: 1, format: "%M" }
      ];

      this.gantt.config.start_date = moment(minStartDate, "YYYY-MM-DD").toDate();
      this.gantt.config.end_date = moment()
        .add(2, "year")
        .endOf("year")
        .toDate();

      this.gantt.showLightbox = function(id) {
        // code of the custom form
      };

      this.gantt.plugins({ click_drag: true });

      // Render dedication bars inside each person's task bar.
      this.gantt.templates.task_text = (start, end, task) => {
        if (!task._dedications || !task._dedications.length) {
          return "";
        }
        const taskStart = +task.start_date;
        const taskEnd = +task.end_date;
        const span = taskEnd - taskStart || 1;
        let html = "";
        task._dedications.forEach(d => {
          const dStart = +moment(d.from);
          const dEnd = +moment(d.to, "YYYY-MM-DD")
            .add(1, "day");
          const left = Math.max(0, ((dStart - taskStart) / span) * 100);
          const width = Math.min(
            100 - left,
            Math.max(0, ((dEnd - dStart) / span) * 100)
          );
          html +=
            `<div class="dedication-bar" data-dedication-id="` +
            d.id +
            `" style="left:` +
            left.toFixed(2) +
            `%;width:` +
            width.toFixed(2) +
            `%">` +
            `<div class="dedication-resize-handle dedication-handle-left"></div>` +
            `<span class="dedication-bar-label">` +
            (d.hours != null ? d.hours + " h" : "") +
            `</span>` +
            `<div class="dedication-resize-handle dedication-handle-right"></div>` +
            `</div>`;
        });
        return html;
      };

      // Hide the default task content text (we draw our own bars)
      this.gantt.templates.task_class = (start, end, task) => {
        return task._dedications ? "dedication-row" : "";
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

      var date = moment()
        .startOf("year")
        .toDate();
      var position = this.gantt.posFromDate(date);
      this.gantt.scrollTo(position);

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
      const taskStart = +moment(task.start_date);
      const taskEnd = +moment(task.end_date);
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
        const activityObject = activity;
        delete activityObject._dedication;
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
      this.summary = (
        await service({ requiresAuth: true }).post(
          `payrolls/create-all?year=${this.filters.year.year}`
        )
      ).data.userPayrollsInfo;
      this.$buefy.snackbar.open({
        message: "Bestretes creades",
        queue: false
      });
    }
  }
};
</script>
<style scoped>
.gstc-component {
  margin: 0;
  padding: 0;
}
.toolbox {
  padding: 10px;
}
</style>
<style>
@import "~dhtmlx-gantt/codebase/dhtmlxgantt.css";

.gantt > div {
  min-height: 600px;
}

/* The person row: make the default bar transparent so only the
   dedication periods (rendered via task_text) are visible. */
.dedication-row.gantt_task_line {
  background: rgba(83, 124, 250, 0.08);  
  border-radius: 30px;
}
.dedication-row .gantt_task_content {
  position: absolute;
  padding: 0;
  overflow: visible;
}

/* Individual dedication periods drawn inside the person's row */
.dedication-bar {
  position: absolute;
  top: 3px;
  bottom: 3px;
  min-width: 4px;
  background: var(--dhx-gantt-base-colors-primary, #537cfa);
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  transition: filter 0.15s ease;
  box-sizing: border-box;
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
  border-radius: 30px 0 0 30px;
}
.dedication-handle-right {
  right: 0;
  border-radius: 0 30px 30px 0;
}
.dedication-bar-label {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  padding: 0 10px;
}
</style>