<template>
  <div>
    <div class="gannt-container" v-if="showGantt">
      <div class="gantt gantt-dedication" :id="ganttId"></div>
    </div>
    <div class="help">
      <b-icon icon="circle" class="has-text-warning" custom-size="default" />
      <b>Ocupada menys del 85%</b><br />
      <b-icon icon="circle" class="has-text-blue" custom-size="default" />
      <b>Ocupada entre el 85 i el 95%</b><br />
      <b-icon icon="circle" class="has-text-success" custom-size="default" />
      <b>Ocupada entre el 95 i el 105%</b><br />
      <b-icon icon="circle" class="has-text-danger" custom-size="default" />
      <b>Ocupada més del 105%</b><br />
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
    view: String
  },
  components: {},
  computed: {
    ...mapState(["userName"]),
    ...mapState(["me"])
  },
  watch: {
    dedications: function(newVal, oldVal) {
      // this.initializeGannt()
    },
    leaders: function(newVal, oldVal) {
      // this.initializeGannt()
    }
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
      showSubPhases: false
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
            readonly: true
          };
          
          // Pre-process all dedications with calculated values for performance
          const processedDedications = this.dedications
            .filter(d => d.username === leader.username && d.estimated_hours)
            .map(d => {
              const fromDate = moment(d.from, 'YYYY-MM-DD');
              const actualYear = fromDate.year();
              const actualMonth = fromDate.format('MM');
              const actualWeek = fromDate.isoWeek();
              
              const ymw = this.view === "week"
                ? `${actualYear}-01-${String(actualWeek).padStart(2, '0')}`
                : `${actualYear}-${actualMonth}-01`;
              
              return {
                ...d,
                ymw: ymw,
                _actualYear: actualYear,
                _actualMonth: actualMonth,
                _actualWeek: actualWeek
              };
            });

          const userDedications = processedDedications;

          // console.log(`DEBUG: ${leader.username} has ${userDedications.length} dedications`);

          if (userDedications && userDedications.length) {
            this.tasks.data.push(task);
          }

          // Add festives - optimized version
          const festiveDedications = [];
          this.festives.forEach(f => {
            if (
              (f.users_permissions_user &&
                f.users_permissions_user.username === leader.username) ||
              f.users_permissions_user === null
            ) {
              let dailyHours = 0;
              leader.daily_dedications.forEach(dd => {
                if (dd.from <= f.date && dd.to >= f.date) {
                  dailyHours = dd.hours;
                }
              });

              if (dailyHours > 0) {
                // Use the same date-based calculation as regular dedications
                const festiveDate = moment(f.date, "YYYY-MM-DD");
                const actualYear = festiveDate.year();
                const actualMonth = festiveDate.format('MM');
                const actualWeek = festiveDate.isoWeek();

                const ymw = this.view === "week"
                  ? `${actualYear}-01-${String(actualWeek).padStart(2, '0')}`
                  : `${actualYear}-${actualMonth}-01`;

                festiveDedications.push({
                  project_name: f.festive_type.name,
                  ymw: ymw,
                  estimated_hours: dailyHours,
                  from: f.date,
                  username: leader.username,
                  _actualYear: actualYear,
                  _actualMonth: actualMonth,
                  _actualWeek: actualWeek
                });
              }
            }
          });

          // Merge festive dedications with regular dedications
          const allDedications = [...userDedications, ...festiveDedications];
          
          const dedicationTotals = _(allDedications)
            .groupBy("ymw")
            .map((ymw, id) => ({
              ymw: id,
              year: id.substring(0, 4),
              month: id.substring(5, 7),
              week: id.substring(8, 10),
              total: _.sumBy(ymw, "estimated_hours"),
              from: ymw[0].from
            }))
            .value();

          for (let j = 0; j < dedicationTotals.length; j++) {
            tid++;
            const dedication = dedicationTotals[j];
            
            // const ymw = `${d.year}-${d.month}-${d.week}`
            var start_date = moment(
              `${dedication.year}-${
                this.view === "month" ? dedication.month : "01"
              }-01`,
              "YYYY-MM-DD"
            );

            if (dedication.from) {
              start_date = dedication.from;
            } else {
              start_date = start_date.format("YYYY-MM-DD");
            }

            const end_date = moment(start_date, "YYYY-MM-DD")
              .endOf(this.view)
              .add(1, "day")
              .format("YYYY-MM-DD");
            if (end_date > maxEnddate) {
              maxEnddate = end_date;
            }

            let dailyHours = 8;
            leader.daily_dedications.forEach(dd => {
              if (dd.from <= start_date && dd.to >= start_date) {
                dailyHours = dd.hours;
              }
            });

            const progress = dailyHours
              ? dedication.total /
                ((this.view === "month" ? 20 : 5) * dailyHours)
              : 0;

            let out = "";

            // out += `<pre>${task._year } - ${task._month } - ${task._week }</pre>`;
            // return out

            // Use merged dedications (including festives) for much faster filtering
            const taskDedications = allDedications.filter(d => {
              const yearMatch = d._actualYear === parseInt(dedication.year);
              
              if (this.view === "week") {
                const weekMatch = d._actualWeek === parseInt(dedication.week);
                return yearMatch && weekMatch;
              } else {
                const monthMatch = d._actualMonth === dedication.month;
                return yearMatch && monthMatch;
              }
            });

            const taskDedicationsByProject = _(taskDedications)
              .groupBy("project_name")
              .map((project_name, id) => ({
                project_name: id,
                estimated_hours: _.sumBy(project_name, "estimated_hours")
              }))
              .value();

            //let out = "";
            taskDedicationsByProject.forEach(td => {
              if (td.estimated_hours) {
                out += `<b>${td.project_name}:</b> ${td.estimated_hours.toFixed(
                  2
                )}h<br>`;
              }
            });

            // Note: Festive dedications are now included in taskDedications above,
            // so no need for separate festive processing here

            const totalHours =
              (this.view === "month"
                ? this.numberOfWorkingDays(start_date)
                : 5) * dailyHours;
            const dedicationTotal = dedication.total;

            const progressText = dedicationTotal
              ? (dedicationTotal / totalHours) * 100
              : 0;

            const hoursTask = {
              id: tid,
              text: `${dedication.total.toFixed(2)}h (${progressText.toFixed(
                0
              )}%)`, // (${dedication.year}-${dedication.month}-${dedication.week})`,
              start_date: start_date,
              end_date: end_date,
              parent: leader.id,
              progress: dedicationTotal ? dedicationTotal / totalHours : 0,
              readonly: true,
              _username: leader.username,
              _week: dedication.week,
              _month: dedication.month,
              _year: dedication.year,
              _dedication_total: dedication.total,
              _total_hours:
                (this.view === "month"
                  ? this.numberOfWorkingDays(start_date)
                  : 5) * dailyHours,
              _tooltip: null

              // open: true
            };
            // console.log('hoursTask', hoursTask)

            if (hoursTask._total_hours) {
              out += `<br><b>Hores període</b>: ${hoursTask._total_hours.toFixed(
                2
              )}h`;
              if (hoursTask._dedication_total) {
                if (hoursTask._total_hours - hoursTask._dedication_total > 0) {
                  out += `<br><b>Falten</b>: ${(
                    hoursTask._total_hours - hoursTask._dedication_total
                  ).toFixed(2)}h`;
                } else {
                  out += `<br><b>Sobren</b>: ${(
                    hoursTask._dedication_total - hoursTask._total_hours
                  ).toFixed(2)}h`;
                }
              }
            }

            hoursTask._tooltip = out;

            this.tasks.data.push(hoursTask);
          }
        }
      }

      // console.log('this.tasks.data', this.tasks.data)

      // https://docs.dhtmlx.com/gantt/samples/11_resources/10_resource_histogram_workload_percents.html
      // https://docs.dhtmlx.com/gantt/samples/11_resources/06_assign_multiple_owners.html
      // https://dhtmlx.com/blog/using-d3-visualize-workload-dhtmlxgantt/

      gantt.config.start_date = moment()
        .startOf("year")
        .toDate();
      gantt.config.end_date = moment(maxEnddate, "YYYY-MM-DD")
        .add(1, "months")
        .toDate();
      gantt.config.columns = [
        {
          name: "text",
          label: "Previsió",
          tree: true,
          width: "150",
          resize: true
        }
      ];

      gantt.templates.task_class = (start, end, task) => {
        if (task.progress < 0.85) {
          return "has-background-warning has-text-black";
        } else if (task.progress > 1.05) {
          return "has-background-danger";
        } else if (task.progress >= 0.95 && task.progress <= 1.05) {
          return "has-background-success";
        } else {
          return "z";
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
        { unit: "month", step: 1, format: "%M" }
      ];

      if (this.view === "week") {
        var weekScaleTemplate = date => {
          return this.getWeekTemplate(date);
        };

        gantt.config.scales.push({
          unit: "week",
          step: 1,
          format: weekScaleTemplate
        });
      }

      gantt.config.min_column_width = 100;

      gantt.plugins({ tooltip: true });

      gantt.showLightbox = function(id) {
        // code of the custom form
      };

      gantt.templates.tooltip_text = (start, end, task) => {
        return task._tooltip;
      };

      gantt.init(this.ganttId);

      gantt.parse(this.tasks);
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

    getWeekTemplate(date) {
      var to_day = gantt.date.date_to_str("%d");
      var month_day = to_day(date);
      var month_day2 = to_day(gantt.date.add(date, 6, "day"));
      return `${month_day}-${month_day2}`;
    },

    numberOfWorkingDays(day) {
      let n = 0;
      const initOfMonth = moment(day, "YYYY-MM-DD");
      const endOfMonth = initOfMonth.clone().endOf("month");
      const days = Math.round(
        moment.duration(endOfMonth.diff(initOfMonth)).asDays()
      );
      for (var i = 0; i < days; i++) {
        const day = initOfMonth.add(1, "day");
        if (![0, 6].includes(day.day())) {
          n++;
        }
      }
      return n;
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
      min-width: 300px;
    } */
.gantt_task_line.gantt_project,
.gantt_task_line {
  border-radius: 30px;
}

.gantt-dedication .gantt_task_line.has-background-warning {
  background-color: #ffdd57 !important;
}
.gantt-dedication .gantt_task_line.has-background-danger .gantt_task_progress {
  background-color: #f14668 !important;
}
.gantt-dedication .gantt_task_content {
  color: #222;
}

.gantt-dedication .gantt_task_line.has-background-warning .gantt_task_progress {
  background-color: #eecc46 !important;
}

.gantt-dedication .gantt_task_line.has-background-success .gantt_task_progress {
  background-color: #67b764 !important;
}

.has-text-blue {
  color: #299cb4 !important;
}
</style>
