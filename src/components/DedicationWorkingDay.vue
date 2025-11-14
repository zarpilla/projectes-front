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
import { gantt } from "dhtmlx-gantt";
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
      loading: false
    };
  },
  async mounted() {
    // console.log('gantt wd', gantt)
    this.ganttId = "gantt-" + this.create_UUID();
    this.initializeAll();
  },
  beforeDestroy() {
    // console.log('beforeDestroy')
    gantt.detachEvent("onTaskClick");
    gantt.clearAll();
    // gantt.detachEvent("onBeforeLightbox");

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
          const task = {
            id: user.id,
            text: user.username,
            open: true,
            type: gantt.config.types.project,
            unscheduled: false,
            render: "split",
            parent: 0,
            readonly: true,
            _dedication: { users_permissions_user: user }
          };

          this.tasks.data.push(task);

          const userDedications = dedications.filter(
            d =>
              d.users_permissions_user &&
              d.users_permissions_user.id === user.id
          );

          userDedications.forEach(d => {
            const from = moment(d.from, "YYYY-MM-DD")
              .endOf(this.view)
              .add(1, "day")
              .format("YYYY-MM-DD");
            if (from < minStartDate) {
              minStartDate = from;
            }

            const dedicationTask = {
              id: 9999 + d.id,
              text: `${d.hours} h`,
              start_date: d.from,
              end_date: d.to,
              parent: user.id,
              readonly: true,
              _dedication: d
            };
            // console.log('hoursTask', hoursTask)
            this.tasks.data.push(dedicationTask);
          });
        }
      }

      gantt.config.columns = [
        {
          name: "text",
          label: "Jornada",
          tree: true,
          width: "150",
          resize: true
        }
      ];

      gantt.config.scroll_size = 30;
      gantt.config.xml_date = "%Y-%m-%d";
      gantt.config.duration_unit = "month";
      gantt.config.scales = [
        { unit: "year", step: 1, format: "%Y" },
        { unit: "month", step: 1, format: "%M" }
      ];

      gantt.config.start_date = moment(minStartDate, "YYYY-MM-DD").toDate();
      gantt.config.end_date = moment()
        .add(2, "year")
        .endOf("year")
        .toDate();

      gantt.showLightbox = function(id) {
        // code of the custom form
      };

      gantt.plugins({ click_drag: true });

      gantt.attachEvent(
        "onTaskClick",
        (id, e) => {
          this.dedicationObject = this.tasks.data.find(
            t => t.id.toString() === id.toString()
          );

          this.isModalActive = true;
          return true;
        },
        { id: "onTaskClick" }
      );

      gantt.config.click_drag = {
        callback: this.onDragEnd,
        singleRow: true
      };

      gantt.templates.task_class = (start, end, task) => {
        return "";
      };

      gantt.init(this.ganttId);

      gantt.parse(this.tasks);

      var date = moment()
        .startOf("year")
        .toDate();
      var position = gantt.posFromDate(date);
      gantt.scrollTo(position);

      // gantt.config.end_date = moment().add(2, 'year').endOf("year").toDate()
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

        this.dedicationObject = this.tasks.data.find(
          t => t.id.toString() === userId.toString()
        );

        this.dedicationObject.start_date = gantt.roundDate(startDate);
        this.dedicationObject.end_date = gantt.roundDate(endDate);
        this.dedicationObject._dedication.from = gantt.roundDate(startDate);
        this.dedicationObject._dedication.to = gantt.date.add(
          gantt.roundDate(endDate),
          -1,
          "day"
        );

        this.dedicationObject._dedication.users_permissions_user = this.users.find(
          u => u.id.toString() === userId.toString()
        );

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

          const task = this.tasks.data.find(
            t =>
              t._dedication &&
              t._dedication.id &&
              t._dedication.id.toString() === activity.id.toString()
          );
          task.start_date = moment(activity.from, "YYYY-MM-DD").toDate();
          task.end_date = moment(activity.to, "YYYY-MM-DD").toDate();
          task.taskName = `${activity.hours} h`;
          task._dedication = newActivity;

          gantt.getTask(task.id).text = task.taskName;
          gantt.updateTask(task.id);
        } catch (err) {
          console.error("activities error", err);
          this.$buefy.snackbar.open({
            message: "Error",
            queue: false
          });
        }
      } else {
        const newId = 999999 + activity.users_permissions_user;
        const dedicationTask = {
          id: newId,
          text: `${activity.hours} h`,
          start_date: activity.from,
          end_date: activity.to,
          parent: activity.users_permissions_user,
          readonly: true,
          _dedication: activity
        };

        activity.from = moment(activity.from).format("YYYY-MM-DD");
        activity.to = moment(activity.to).format("YYYY-MM-DD");

        try {
          const newActivity = (
            await service({ requiresAuth: true }).post(
              "daily-dedications",
              activity
            )
          ).data;

          this.tasks.data.push(dedicationTask);
          gantt.addTask(dedicationTask);
          const task = this.tasks.data.find(
            t => t.id.toString() === newId.toString()
          );
          task._dedication = newActivity;

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
    async modalDelete(activity) {
      await service({ requiresAuth: true }).delete(
        `daily-dedications/${activity.id}`
      );

      const task = this.tasks.data.find(
        t =>
          t._dedication &&
          t._dedication.id &&
          t._dedication.id.toString() === activity.id.toString()
      );
      this.tasks.data = this.tasks.data.filter(
        t => t.id.toString() !== task.id.toString()
      );
      gantt.deleteTask(task.id);

      this.$buefy.snackbar.open({
        message: "Esborrat",
        queue: false
      });

      this.isModalActive = false;
    },
    modalCancel() {
      // console.log('modalCancel')
      // const task = this.tasks.data.find(t => t.id.toString() === this.dedicationObject.id.toString())
      // gantt.deleteTask(this.dedicationObject.id)
      // this.tasks.data = this.tasks.data.filter(t => t.id.toString() !== this.dedicationObject.id.toString())
      this.isModalActive = false;
      // console.log('modalcancel', this.dedicationObject)
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
/* .gantt_row_project, .gantt_layout_x > .gantt_layout_cell, .gantt_row_task, .gantt_grid_data .gantt_last_cell{
      min-width: 100px;
    } */
.gantt_task_line.gantt_project,
.gantt_task_line {
  border-radius: 30px;
}
</style>
