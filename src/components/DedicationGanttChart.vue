<template>
  <div>
    <div class="gannt-container" v-if="showGantt">
      <div class="gantt gantt-dedication" :id="ganttId"></div>
    </div>
    <div class="help">
      <b-icon icon="circle" class="has-text-warning" custom-size="default" />
      <b>Ocupada menys del 95%</b><br />
      <b-icon icon="circle" class="has-text-danger" custom-size="default" />
      <b>Ocupada més del 105%</b><br />
      <b-icon icon="circle" class="has-text-success" custom-size="default" />
      <b>Ocupada entre el 95 i el 105%</b><br />
    </div>      
  </div>
</template>

<script>
import { EventBus } from "@/service/event-bus.js";
import { mapState } from "vuex";
// import sumBy from 'lodash/sumBy'
import { gantt } from "dhtmlx-gantt";
import moment from "moment";
import service from "@/service/index";
import _ from "lodash";

// main component
export default {
  name: "DedicationChartGannt",
  props: {
    project: Object,
    leaders: Array,
    dedications: Array,
    festives: Array,
    view: String,
  },
  components: {},
  computed: {
    ...mapState(["userName"]),
    ...mapState(["me"]),
  },
  watch: {
    dedications: function (newVal, oldVal) {
      // this.initializeGannt()
    },
    leaders: function (newVal, oldVal) {
      // this.initializeGannt()
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
      // dedications: [],
      showSubPhases: false,
    };
  },
  async mounted() {
    this.ganttId = "gantt-" + this.create_UUID();
    this.initializeAll();
  },
  beforeDestroy() {
    console.log("beforeDestroy");
    gantt.clearAll();
    // gantt.destructor()
    this.showGantt = false;
  },
  methods: {
    initializeAll() {
      this.showGantt = true;
      // gantt.clearAll();

      this.tasks = { data: [] };

      setTimeout(() => {
        this.initializeGannt();
      }, 250);
    },
    initializeGannt() {
      this.tasks = { data: [] };
      var tid = 999999;
      var minEnddate = moment().format("YYYY-MM-DD");
      var maxEnddate = moment().format("YYYY-MM-DD");
      for (let i = 0; i < this.leaders.length; i++) {
        const leader = this.leaders[i];
        if (!leader.hidden) {
          const task = {
            id: leader.id,
            text: leader.username,
            open: true,
            type: gantt.config.types.project,
            unscheduled: false,
            render: "split",
            parent: 0,
            readonly: true,
          };
          // const ymw = this.view === 'week' ? `${d.year}-${d.month}-${d.week}` : `${d.year}-${d.month}-01`
          const userDedications = this.dedications
            .filter((d) => d.username === leader.username && d.estimated_hours)
            .map((d) => {
              const ymw = this.view === 'week' ? `${d.year}-01-${d.week}` : `${d.year}-${d.month}-01`
              return {
                ...d,
                // ymw: `${d.year}-${d.month}-${d.week}` //moment(`${d.year}-${d.month}-${d.week}`, "YYYYMMDD")
                ymw: ymw                
              };
            });

          if (userDedications && userDedications.length) {
            this.tasks.data.push(task);
          }

          // add festives
          this.festives.forEach((f) => {
            if (
              (f.users_permissions_user &&
                f.users_permissions_user.username === leader.username) ||
              f.users_permissions_user === null
            ) {
              let dailyHours = 8;
              leader.daily_dedications.forEach((dd) => {
                if (dd.from <= f.date && dd.to >= f.date) {
                  dailyHours = dd.hours;
                }
              });

              // const ymwf = this.view === 'week' ? `${d.year}-${d.month}-${d.week}` : `${d.year}-${d.month}`

              const ymw = this.view === 'week' ? `${moment(f.date, "YYYY-MM-DD").isoWeekYear()}-01-${moment(f.date, "YYYY-MM-DD").isoWeek()}` : `${moment(f.date, "YYYY-MM-DD").isoWeekYear()}-${moment(f.date, "YYYY-MM-DD").format("MM")}-01`

              const festiveDedication = {
                project_name: f.festive_type.name,
                ymw: ymw, // moment(f.date, "YYYY-MM-DD").format("YYYY-MM") + '-' + this.view === 'month' ? '01' : moment(f.date, "YYYY-MM-DD").isoWeek(),
                estimated_hours: dailyHours,
              };
              userDedications.push(festiveDedication);
            }
          });

          const dedicationTotals = _(userDedications)
            .groupBy("ymw")
            .map((ymw, id) => ({
              ymw: id,
              year: id.substring(0, 4),
              month: id.substring(5, 7),
              week: id.substring(8, 10),
              total: _.sumBy(ymw, "estimated_hours"),
              // rows: ymw
            }))
            .value();

          for (let j = 0; j < dedicationTotals.length; j++) {
            tid++;
            const dedication = dedicationTotals[j];
            // const ymw = `${d.year}-${d.month}-${d.week}`
            var start_date = moment(`${dedication.year}-${this.view === 'month' ? dedication.month : '01' }-01`, 'YYYY-MM-DD')

            if (this.view === 'week') {
              start_date = start_date.startOf('week').add(parseInt(dedication.week) - 1, 'weeks').format('YYYY-MM-DD');
            } else {
              start_date = start_date.format('YYYY-MM-DD');
            }
            
            const end_date = moment(start_date, "YYYY-MM-DD")
              .endOf(this.view).add(1, 'day')
              .format("YYYY-MM-DD");
            if (end_date > maxEnddate) {
              maxEnddate = end_date;
            }

            let dailyHours = 8;
            leader.daily_dedications.forEach((dd) => {
              if (dd.from <= start_date && dd.to >= start_date) {
                dailyHours = dd.hours;
              }
            });

            const progress = dailyHours ? dedication.total / ( (this.view === 'month' ? 20 : 5) * dailyHours) : 0;
            const progressText = dailyHours ? (progress * 100).toFixed(0) : '';

            const hoursTask = {
              id: tid,
              text: `${dedication.total.toFixed(2)}h (${progressText}%)`,// (${dedication.year}-${dedication.month}-${dedication.week})`,
              start_date: start_date,
              end_date: end_date,
              parent: leader.id,
              progress: progress,
              readonly: true,
              _username: leader.username,
              _week: dedication.week,
              _month: dedication.month,
              _year: dedication.year,
              _dedication_total: dedication.total,
              _total_hours: ( (this.view === 'month' ? 20 : 5) * dailyHours)

              // open: true
            };            
            // console.log('hoursTask', hoursTask)
            this.tasks.data.push(hoursTask);
          }
        }
      }

      // https://docs.dhtmlx.com/gantt/samples/11_resources/10_resource_histogram_workload_percents.html
      // https://docs.dhtmlx.com/gantt/samples/11_resources/06_assign_multiple_owners.html
      // https://dhtmlx.com/blog/using-d3-visualize-workload-dhtmlxgantt/

      gantt.config.start_date = moment().startOf("year").toDate();
      gantt.config.end_date = moment(maxEnddate, "YYYY-MM-DD")
        .add(1, "months")
        .toDate();
      gantt.config.columns = [
        {
          name: "text",
          label: "Previsió",
          tree: true,
          width: "150",
          resize: true,
        },
      ];

      gantt.templates.task_class  = (start, end, task) => {
        if (task.progress < 0.95) {
            return "has-background-warning has-text-black";
        }
        else if (task.progress > 1.05) {
            return "has-background-danger";
        }
        else {
            return "has-background-success";
        }
};

      gantt.config.scroll_size = 30;
      
      // gantt.plugins({ click_drag: true })
      // gantt.config.readonly = true
      // gantt.config.editable_property = "editable";
      gantt.config.xml_date = "%Y-%m-%d";
      gantt.config.duration_unit = this.view;
      gantt.config.scales = [
        { unit: "year", step: 1, format: "%Y" },
        { unit: "month", step: 1, format: "%M" },
      ];

      if (this.view === "week") {
        var weekScaleTemplate = (date) => {
          return this.getWeekTemplate(date);
        };

        gantt.config.scales.push({
          unit: "week",
          step: 1,
          format: weekScaleTemplate,
        });
      }

      gantt.plugins({ tooltip: true });

      gantt.showLightbox = function (id) {
        // code of the custom form
      };

      gantt.templates.tooltip_text = (start, end, task) => {        
        let out = "";

        // out += `<pre>${task._year } - ${task._month } - ${task._week }</pre>`;
        // return out

        const taskDedications = this.dedications.filter(
          (d) =>
            d.username === task._username &&
            parseInt(d.year) === parseInt(task._year) &&
            parseInt(d.month) === parseInt((this.view === 'week' ? d.month : task._month)) &&
            parseInt(d.week) === parseInt((this.view === 'week' ? task._week : d.week))
            // moment(d.from, 'YYYY-MM-DD').isAfter(moment(task.start_date)) && moment(d.from, 'YYYY-MM-DD').isBefore(moment(task.end_date))
        );

        const taskDedicationsByProject = _(taskDedications)
          .groupBy("project_name")
          .map((project_name, id) => ({
            project_name: id,
            estimated_hours: _.sumBy(project_name, "estimated_hours"),
          }))
          .value();

        //let out = "";
        taskDedicationsByProject.forEach((td) => {
          if (td.estimated_hours) {
            out += `<b>${td.project_name}:</b> ${td.estimated_hours.toFixed(
              2
            )}h<br>`;
          }
        });

        const festiveDedications = [];
        this.festives.forEach((f) => {
          if (
            (f.users_permissions_user &&
              f.users_permissions_user.username === task._username) ||
            f.users_permissions_user === null
          ) {
            if (
              parseInt(moment(f.date, "YYYY-MM-DD").isoWeekYear()) === parseInt(task._year) &&
              parseInt(moment(f.date, "YYYY-MM-DD").format("MM")) == parseInt(this.view === 'week' ? moment(f.date, "YYYY-MM-DD").format("MM") : task._month) &&
              parseInt(moment(f.date, "YYYY-MM-DD").isoWeek()) == parseInt(this.view === 'week' ? task._week : moment(f.date, "YYYY-MM-DD").isoWeek())
              // moment(f.date, 'YYYY-MM-DD').isAfter(moment(task.start_date)) && moment(f.date, 'YYYY-MM-DD').isBefore(moment(task.end_date))
            ) {
              let dailyHours = 8;
              const taskUser = this.leaders.find(
                (l) => l.username === task._username
              );
              taskUser.daily_dedications.forEach((dd) => {
                if (dd.from <= f.date && dd.to >= f.date) {
                  dailyHours = dd.hours;
                }
              });
              const festiveDedication = {
                project_name: f.festive_type.name,
                ymw: moment(f.date, "YYYY-MM-DD").format("YYYYMM"),
                estimated_hours: dailyHours,
              };
              festiveDedications.push(festiveDedication);
            }
          }
        });

        const festiveDedicationsByProject = _(festiveDedications)
          .groupBy("project_name")
          .map((project_name, id) => ({
            project_name: id,
            estimated_hours: _.sumBy(project_name, "estimated_hours"),
          }))
          .value();

        festiveDedicationsByProject.forEach((td) => {
          if (td.estimated_hours) {
            out += `<b>${td.project_name}:</b> ${td.estimated_hours.toFixed(
              2
            )}h<br>`;
          }
        });

        out += `<br><b>Hores període</b>: ${task._total_hours}`
        if (task._total_hours - task._dedication_total > 0) {
          out += `<br><b>Falten</b>: ${(task._total_hours - task._dedication_total).toFixed(2)}`
        } else {
          out += `<br><b>Sobren</b>: ${(task._dedication_total - task._total_hours).toFixed(2)}`
        }
        

        return out;
      };

      gantt.init(this.ganttId);

      gantt.parse(this.tasks);
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
/* .gantt_row_project, .gantt_layout_x > .gantt_layout_cell, .gantt_row_task, .gantt_grid_data .gantt_last_cell{
      min-width: 300px;
    } */
.gantt_task_line.gantt_project,
.gantt_task_line {
  border-radius: 30px;
}

.gantt-dedication .gantt_task_line.has-background-warning {
  background-color: #ffdd57 !important;
}
.gantt-dedication .gantt_task_line.has-background-danger .gantt_task_progress{
  background-color: #f14668 !important;
}
.gantt-dedication .gantt_task_content {
  color: #222;
}
</style>
