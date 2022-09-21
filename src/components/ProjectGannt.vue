<template>
  <div>
    <modal-box-estimated-hours
      :is-active="isModalActive"
      :dedication-object="dedicationObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
      @delete="modalDelete"
      :dedications="dedications"
    />
    <div class="toolbox">
      <!-- <button @click='updateFirstRow'>Update first row</button> -->
      <b-field grouped>
        <!-- <button class="button zis-small is-primary mr-1" type="button" @click="changeZoomLevel(-1)">
          <b-icon icon="magnify-minus" size="is-small"/>
        </button>
        <button class="button zis-small is-primary mr-1" type="button" @click="changeZoomLevel(+1)">
          <b-icon icon="magnify-plus" size="is-small"/>
        </button> -->
        <b-select v-model="user" placeholder="Persona">
          <option v-for="(s, index) in users" :key="index" :value="s">
            {{ s.username }}
          </option>
        </b-select>
        <button
          class="button zis-small is-primary ml-1"
          type="button"
          @click="collapse"
        >
          {{ collapsed ? "Obrir detall" : "Tancar detall" }}
        </button>
        <button
          class="button zis-small is-primary ml-1"
          type="button"
          @click="toggleSubphases"
        >
          {{ showSubPhases ? "Mostrar només fases" : "Mostrar subfases" }}
        </button>
        <button
          class="button zis-small is-primary ml-1"
          type="button"
          @click="toggleView"
        >
          {{
            view == "month" ? "Visualització setmanal" : "Visualització mensual"
          }}
        </button>
      </b-field>
    </div>
    <div class="gannt-container" v-if="showGantt">
      <!-- <div v-for="(g, i) in gantts" :key="i" class="gantt" :ref="g"></div> -->
      <div class="gantt" :id="ganttId"></div>
      <!-- <pre>
        {{ tasks }}
      </pre> -->
    </div>
  </div>
</template>

<script>
import { EventBus } from "@/service/event-bus.js";
import ModalBoxEstimatedHours from "@/components/ModalBoxEstimatedHours";
import { mapState } from "vuex";
// import sumBy from 'lodash/sumBy'
import { gantt } from "dhtmlx-gantt";
import moment from "moment";
import service from "@/service/index";
import _ from "lodash";

// main component
export default {
  name: "ProjectGannt",
  props: {
    project: Object,
    users: Array,
  },
  components: {
    ModalBoxEstimatedHours,
  },
  computed: {
    ...mapState(["userName"]),
    ...mapState(["me"]),
  },
  watch: {
    project: function (newVal, oldVal) {},
    users: function (newVal, oldVal) {
      if (newVal) {
        const user = newVal.find(
          (u) => u.username.toLowerCase() === this.userName.toLowerCase()
        );
        if (user && user.id) {
          this.user = user;
        }
      }
    },
  },
  data() {
    return {
      isModalActive: false,
      zoom: 24,
      user: {},
      dedicationObject: null,
      state: null,
      phases: null,
      minYear: null,
      tasks: {},
      updating: false,
      showGantt: false,
      ganttId: "",
      dedications: [],
      showSubPhases: false,
      view: "month",
      projectTasks: [],
      collapsed: false,
      taskToAddId: 0,
    };
  },
  async mounted() {
    this.showSubPhases = !this.me.options.showEstimatedHoursInPhases;
    this.dedications = (
      await service({ requiresAuth: true }).get("daily-dedications?_limit=-1")
    ).data;

    EventBus.$on("item-clicked", (item) => {
      // console.log('item-clicked', item)
      this.dedicationObject = item;
      this.isModalActive = true;
    });
    EventBus.$on("phases-updated", (info) => {
      this.phases = info.phases;
    });

    let query =
      "tasks?_limit=-1&_where[archived_eq]=false&_where[due_date_null]=false";

    if (this.project) {
      query += "&_where[project_eq]=" + this.project.id;
    } else {
      query += "&_where[project_eq]=-1";
    }

    this.projectTasks = (await service({ requiresAuth: true }).get(query)).data;

    this.ganttId = "gantt-" + this.create_UUID();

    setTimeout(() => {
      this.showGantt = true;
      // console.log('gantt', gantt)
      gantt.clearAll();
      this.tasks = { data: [] };
      setTimeout(() => {
        this.initializeGannt();
      }, 250);
    }, 250);
  },
  beforeDestroy() {
    console.log("beforeDestroy");
    gantt.detachEvent("onTaskClick");
    gantt.detachEvent("onAfterTaskUpdate");
    // gantt.detachEvent("onBeforeLightbox");
    gantt.clearAll();

    this.showGantt = false;
  },
  methods: {
    initializeGannt() {
      // console.log('initializeGannt!!!')

      // this.tasks = {
      //   data: [
      //     { id: 1, text: 'Task #1', start_date: '2020-01-17', duration: 3, progress: 0.6 },
      //     { id: 2, text: 'Task #2', start_date: '2020-01-20', duration: 3, progress: 0.4, parent: 1 }
      //   ],
      //   links: [
      //     { id: 1, source: 1, target: 2, type: '0' }
      //   ]
      // }

      // console.log('initializeGannt', this.project)
      this.tasks = { data: [] };
      let minDate = moment().format("YYYY-MM-DD");
      let maxDate = moment().format("YYYY-MM-DD");
      for (let i = 0; i < this.project.original_phases.length; i++) {
        const phase = this.project.original_phases[i];
        const task = {
          id: phase.id,
          text: phase.name,
          open: true,
          type: gantt.config.types.project,
          _phase: phase,
        };
        let parentId = phase.id;
        if (!this.showSubPhases) {
          task._subphase = phase.subphases[0];
        }
        this.tasks.data.push(task);
        for (let j = 0; j < phase.subphases.length; j++) {
          const subphase = phase.subphases[j];
          if (!subphase.estimated_hours) {
            subphase.estimated_hours = [];
          }
          const unscheduled =
            !subphase.estimated_hours || subphase.estimated_hours.length === 0;
          const subTask = {
            id: 9999 + subphase.id,
            text: subphase.concept,
            parent: phase.id,
            open: true,
            unscheduled: unscheduled,
            type: gantt.config.types.project,
            _phase: phase,
            _subphase: subphase,
          };
          if (this.showSubPhases && phase.subphases.length) {
            this.tasks.data.push(subTask);
            parentId = 9999 + subphase.id;
          }

          for (let k = 0; k < subphase.estimated_hours.length; k++) {
            const hours = subphase.estimated_hours[k];
            const hoursName = `${
              hours.users_permissions_user
                ? hours.users_permissions_user.username
                : ""
            } - ${hours.quantity}h${
              hours.quantity_type && hours.quantity_type == "week"
                ? "/setmana"
                : hours.quantity_type && hours.quantity_type == "month"
                ? "/mes"
                : ""
            }`;

            if (hours.from && hours.to) {
              const hoursTask = {
                id: 99999999 + (hours.id ? hours.id : 9999999999 + k),
                text: hoursName,
                start_date: hours.from,
                end_date: moment(hours.to, "YYYY-MM-DD")
                  .add(1, "day")
                  .format("YYYY-MM-DD"),
                parent: parentId,
                open: true,
                _hours: hours,
                _phase: phase,
                _subphase: subphase,
              };

              this.tasks.data.push(hoursTask);              
              if (minDate > hours.from) {
                minDate = hours.from;
              }
              if (maxDate < hours.to) {
                maxDate = hours.to;
              }
            }
          }
        }
      }

      if (this.me.options.showTasksInGantt) {
        this.projectTasks.forEach((pt, i) => {
          if (pt.due_date) {
            const milestone = {
              id: 9999999999 + i,
              text: pt.name,
              type: gantt.config.types.milestone,
              start_date: pt.due_date,
              readonly: true,
            };
            this.tasks.data.push(milestone);
          }
        });
      }

      const initialDate = this.project.date_start
        ? moment(this.project.date_start).startOf("year").toDate()
        : moment().startOf("year").add(-1, "year").toDate();
      const endDate = this.project.date_end
        ? moment(this.project.date_end).add(1, "year").endOf("year").toDate()
        : moment().add(3, "year").endOf("year").toDate();

        console.log('initialDate', initialDate)
        console.log('minDate', minDate)

      if (moment(initialDate).isBefore(moment(minDate))) {
        minDate = initialDate
      }
      if (moment(endDate).isAfter(moment(maxDate))) {
        maxDate = endDate
      }

      gantt.config.start_date = minDate;
      gantt.config.end_date = maxDate;
      
      gantt.config.columns = [
        {
          name: "text",
          label: "Fases i dedicacions",
          tree: true,
          width: "300",
        },
      ];

      gantt.config.scroll_size = 30;

      gantt.plugins({ click_drag: true, tooltip: true });

      gantt.templates.tooltip_text = (start, end, task) => {
        // console.log('task', task)
        var children = this.tasks.data.filter((t) => t.parent === task.id);
        if (!children || !children.length) {
          return;
        }
        var hours = _.sumBy(children, "_hours.quantity");
        if (hours) {
          return "<b>Durada:</b> " + hours + "h";
        }
      };

      var weekScaleTemplate = (date) => {
        return this.getWeekTemplate(date);
      };

      gantt.config.xml_date = "%Y-%m-%d";
      gantt.config.duration_unit = this.view;
      gantt.config.scales = [
        { unit: "year", step: 1, format: "%Y" },
        { unit: "month", step: 1, format: "%M" },
      ];

      if (this.view === "week") {
        gantt.config.scales.push({
          unit: "week",
          step: 1,
          format: weekScaleTemplate,
        });
      }

      gantt.templates.task_class = (start, end, task) => {        
          return "";
      };

      gantt.config.click_drag = {
        callback: this.onDragEnd,
        singleRow: true,
      };
      gantt.attachEvent(
        "onTaskClick",
        (id, e) => {
          if (
            e &&
            e.target &&
            (e.target.classList.contains("gantt_open") ||
              e.target.classList.contains("gantt_close"))
          ) {
            return true;
          }
          this.dedicationObject = this.tasks.data.find(
            (t) => t.id.toString() === id.toString()
          );
          if (
            this.dedicationObject.type === "project" ||
            this.dedicationObject.type === "milestone"
          ) {
            return true;
          }
          this.isModalActive = true;
          return true;
        },
        { id: "onTaskClick" }
      );

      gantt.attachEvent(
        "onAfterTaskUpdate",
        (id, item) => {
          // console.log('onAfterTaskUpdate', item, this.project)
          if (
            moment(item.start_date).format("YYYYMMDD") <
              moment(this.project.date_start).format("YYYYMMDD") ||
            moment(item.end_date).format("YYYYMMDD") >
              moment(this.project.date_end).format("YYYYMMDD")
          ) {
            this.$buefy.snackbar.open({
              message: "Atenció, planificació fora del període del projecte",
              queue: false,
            });
          }
          //any custom logic here
          // this.dedicationObject = this.tasks.data.find(t => t.id.toString() === id.toString())
          // this.isModalActive = true
          if (!this.updating) {
            // console.log('onAfterTaskUpdate', item)
            // console.log('onAfterTaskUpdate', this.tasks.data)
            const task = this.tasks.data.find(
              (t) => t.id.toString() === id.toString()
            );
            task.start_date = item.start_date;
            task.end_date = item.end_date;
            task.end_date = item.end_date;
            // console.log('onAfterTaskUpdate item', item)
            // console.log('onAfterTaskUpdate task', task)
            this.$emit("gantt-item-update", task);
          }
        },
        { id: "onAfterTaskUpdate" }
      );
      gantt.showLightbox = function (id) {
        // code of the custom form
      };

      gantt.init(this.ganttId);
      gantt.parse(this.tasks);
    },

    onDragEnd(
      startPoint,
      endPoint,
      startDate,
      endDate,
      tasksBetweenDates,
      tasksInRow
    ) {
      const taskName = `${this.user.username}`;
      let taskId = 0;

      if (tasksInRow.length === 1) {
        var currentTask = tasksInRow[0];

        if (!currentTask.parent && this.showSubPhases) {
          return;
        }

        var taskToAdd = null;
        var metaInfo = {
          _uuid: this.create_UUID(),
          _phase: currentTask._phase,
          _subphase: currentTask._subphase,
          _hours: {
            users_permissions_user: this.user,
            quantity_type: "total",
            quantity:
              currentTask._subphase && currentTask._subphase.quantity
                ? currentTask._subphase.quantity
                : 1,
          },
        };
        if (currentTask.type === "milestone") {
          return;
        }

        if (currentTask.type === "project") {
          // currentTask.render = "split";

          taskId = gantt.addTask(
            {
              text: taskName,
              start_date: gantt.roundDate(startDate),
              end_date: gantt.roundDate(endDate),
              ...metaInfo,
            },
            currentTask.id
          );

          taskToAdd = {
            id: taskId,
            text: taskName,
            parent: currentTask.id,
            open: true,
            start_date: gantt.roundDate(startDate),
            end_date: gantt.roundDate(endDate),
            ...metaInfo,
          };
          this.taskToAddId = taskId;
          this.tasks.data.push(taskToAdd);

          gantt.getTask(currentTask.id).start_date = gantt.roundDate(startDate);
          gantt.getTask(currentTask.id).end_date = gantt.roundDate(endDate);
          gantt.getTask(currentTask.id).unscheduled = false;
          gantt.updateTask(currentTask.id);
        } else {
          taskId = gantt.addTask(
            {
              text: taskName,
              start_date: gantt.roundDate(startDate),
              end_date: gantt.roundDate(endDate),
              ...metaInfo,
            },
            currentTask.parent
          );

          taskToAdd = {
            id: taskId,
            text: taskName,
            parent: currentTask.parent,
            open: true,
            start_date: gantt.roundDate(startDate),
            end_date: gantt.roundDate(endDate),
            ...metaInfo,
          };
          this.taskToAddId = taskId;
          this.tasks.data.push(taskToAdd);
        }
      } else if (tasksInRow.length > 1) {
        const ph =
          this.project.original_phases[this.project.original_phases.length - 1];
        // const sph = ph.subphases[ph.subphases.length - 1];
        // console.log('sph', sph)
        var projects = tasksInRow.filter((t) => t.type === "project");
        currentTask = projects[projects.length - 1];
        if (!currentTask) {
          return;
        }
        metaInfo = {
          _uuid: this.create_UUID(),
          _phase: currentTask._phase,
          _subphase: currentTask._subphase,
          _hours: {
            users_permissions_user: this.user,
            quantity:
              currentTask._subphase && currentTask._subphase.quantity
                ? currentTask._subphase.quantity
                : 1,
          },
        };

        // console.log('currentTask!!', currentTask)
        taskId = gantt.addTask(
          {
            text: taskName,
            start_date: gantt.roundDate(startDate),
            end_date: gantt.roundDate(endDate),
            ...metaInfo,
          },
          currentTask.id
        );

        taskToAdd = {
          id: taskId,
          text: taskName,
          parent: currentTask.id,
          open: true,
          start_date: gantt.roundDate(startDate),
          end_date: gantt.roundDate(endDate),
          ...metaInfo,
        };
        this.taskToAddId = taskId;
        this.tasks.data.push(taskToAdd);

        gantt.getTask(currentTask.id).start_date = gantt.roundDate(startDate);
        gantt.getTask(currentTask.id).end_date = gantt.roundDate(endDate);
        gantt.getTask(currentTask.id).unscheduled = false;
        gantt.updateTask(currentTask.id);
      } else if (tasksInRow.length === 0) {
      }
      this.dedicationObject = taskToAdd;
      this.isModalActive = true;
    },
    changeZoomLevel(delta) {
      this.zoom = this.zoom + delta;
      // state.update('config.chart.time.zoom', this.zoom)
    },
    collapse() {
      if (!this.collapsed) {
        gantt.eachTask(function (task2close) {
          if (task2close.$level == 0) {
            //is a project, not a task
            gantt.close(task2close.id);
          } //endif
        });
      } else {
        gantt.eachTask(function (task2open) {
          if (task2open.$level == 0) {
            //is a project, not a task
            gantt.open(task2open.id);
            console.log(task2open.id);
          } //endif
        });
      }
      this.collapsed = !this.collapsed;
    },
    toggleSubphases() {
      this.showSubPhases = !this.showSubPhases;

      setTimeout(() => {
        gantt.clearAll();
        this.tasks = { data: [] };
        setTimeout(() => {
          this.initializeGannt();
        }, 250);
      }, 250);
    },
    toggleView() {
      this.view = this.view === "month" ? "week" : "month";
      // console.log("this.view", this.view);
      setTimeout(() => {
        gantt.clearAll();
        this.tasks = { data: [] };
        setTimeout(() => {
          this.initializeGannt();
        }, 250);
      }, 250);
    },
    async trashConfirm() {
      this.isModalActive = false;
      // this.$buefy.snackbar.open({
      //   message: 'Esborrat',
      //   queue: false
      // })
    },
    async modalSubmit(activity) {
      this.updating = true;

      const task = this.tasks.data.find(
        (t) => t.id.toString() === activity.id.toString()
      );
      // console.log('task', task)
      const taskName = `${
        activity.users_permissions_user
          ? activity.users_permissions_user.username
          : ""
      } - ${activity.quantity}h${
        activity.quantity_type && activity.quantity_type == "week"
          ? "/setmana"
          : activity.quantity_type && activity.quantity_type == "month"
          ? "/mes"
          : ""
      }`;
      gantt.getTask(activity.id).text = taskName;
      gantt.updateTask(activity.id);

      this.isModalActive = false;
      this.$emit("gantt-item-update", task);

      this.updating = false;
    },
    async modalDelete(activity) {
      // console.log('modalDelete activity', activity, this.tasks.data)
      this.tasks.data = this.tasks.data.filter(
        (t) => t.id.toString() !== activity.id.toString()
      );
      gantt.deleteTask(activity.id);

      this.isModalActive = false;

      this.$emit("gantt-item-delete", activity);
    },
    modalCancel() {
      this.tasks.data = this.tasks.data.filter(
        (t) => t.id.toString() !== this.taskToAddId.toString()
      );
      // console.log('this.taskToAddId', this.taskToAddId)
      // console.log('this.tasks.data', this.tasks.data)
      if (this.taskToAddId) {
        gantt.deleteTask(this.taskToAddId);
      }
      this.isModalActive = false;
    },
    trashCancel() {
      this.isModalActive = false;
    },
    create_UUID() {
      var dt = new Date().getTime();
      var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (dt + Math.random() * 16) % 16 | 0;
          dt = Math.floor(dt / 16);
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        }
      );
      return uuid;
    },
    getWeekTemplate(date) {
      var to_day = gantt.date.date_to_str("%d");
      var month_day = to_day(date);
      var month_day2 = to_day(gantt.date.add(date, 6, "day"));
      return `${month_day}-${month_day2}`;
    },
  },
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
/* .gantt_row_project, .zgantt_layout_x > .gantt_layout_cell, .gantt_row_task, .gantt_grid_data .gantt_last_cell, .gantt .gantt_layout_y .gantt_layout_x .gantt_layout_content .gantt_grid{
      min-width: 300px;
    } */

.gantt_task_line.gantt_project,
.gantt_task_line {
  border-radius: 30px;
}
</style>
