<template>
  <div>
    <div class="gannt-container" v-if="showGantt">
      <div class="gantt" :id="ganttId"></div>      
    </div>
    
  </div>
</template>

<script>
import { EventBus } from '@/service/event-bus.js'
import { mapState } from 'vuex'
// import sumBy from 'lodash/sumBy'
import { gantt } from 'dhtmlx-gantt'
import moment from 'moment'
import service from '@/service/index'
import _ from "lodash";

// main component
export default {
  name: 'ProjectGannt2',
  props: {
    project: Object,
    leaders: Array,
    dedications: Array,
    festives: Array,
  },
  components: {
  },
  computed: {
    ...mapState(['userName']),
    ...mapState(['me'])
  },
  watch: {
    dedications: function (newVal, oldVal) {
      // this.initializeGannt()
    },
    leaders: function (newVal, oldVal) {      
      // this.initializeGannt()
    }
  },
  data () {
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
      ganttId: '',
      // dedications: [],
      showSubPhases: false
    }
  },
  async mounted () {
    this.ganttId = 'gantt-' + this.create_UUID()
    this.initializeAll();    
  },
  beforeDestroy() {        
    console.log('beforeDestroy')
    gantt.clearAll()
    // gantt.destructor()
    this.showGantt = false
  },
  methods: {
    initializeAll () {
      this.showGantt = true
      // gantt.clearAll();      

      this.tasks = { data: [] }

      setTimeout(() => {
        this.initializeGannt()
      }, 250)
    },
    initializeGannt () {

      this.tasks = { data: [] }
      var tid = 999999;
      var minEnddate = moment().format('YYYY-MM-DD')
      var maxEnddate = moment().format('YYYY-MM-DD')
      for (let i = 0; i < this.leaders.length; i++) {
        const leader = this.leaders[i]
        if (!leader.hidden) {
          const task = { id: leader.id, text: leader.username, open: true, type: gantt.config.types.project, unscheduled: false, render: "split", parent: 0, readonly: true }
          
          const userDedications = this.dedications.filter(d => d.username === leader.username && d.estimated_hours).map(d => { return { ...d, ym: moment(`${d.year}-${d.month}-01`, "YYYYMMDD").format("YYYYMM") }})

          if (userDedications && userDedications.length) {
            this.tasks.data.push(task)
          }

          // add festives
          this.festives.forEach(f => {
            if ((f.users_permissions_user && f.users_permissions_user.username === leader.username) || f.users_permissions_user === null) {
              let dailyHours = 8
              leader.daily_dedications.forEach(dd => {
                if (dd.from <= f.date && dd.to >= f.date) {
                  dailyHours = dd.hours
                }
              })
              const festiveDedication = {
                project_name: f.festive_type.name,
                ym: moment(f.date, 'YYYY-MM-DD').format('YYYYMM'),
                estimated_hours: dailyHours
              }
              userDedications.push(festiveDedication)
            }
          })

          const dedicationTotals = _(userDedications)
          .groupBy('ym')
          .map((ym, id) => ({
            ym: id,
            year: !isNaN(id) ? id.substring(0, 4) : "2099",
            month: !isNaN(id) ? id.substring(4, 6) : "99",
            total: _.sumBy(ym, 'estimated_hours')
          }))
          .value()

          for (let j = 0; j < dedicationTotals.length; j++) {            
            tid++
            const dedication = dedicationTotals[j]
            const start_date = `${dedication.year}-${dedication.month}-01`
            const end_date = moment(start_date, 'YYYY-MM-DD').endOf('month').format('YYYY-MM-DD') 
            if (end_date > maxEnddate) {
              maxEnddate = end_date
            }
            let dailyHours = 8
            leader.daily_dedications.forEach(dd => {
              if (dd.from <= start_date && dd.to >= start_date) {
                dailyHours = dd.hours
              }
            })

            const hoursTask = { 
              id: tid, 
              text: `${dedication.total.toFixed(2)}h`, 
              start_date: start_date, 
              end_date: end_date, 
              parent: leader.id, 
              progress: dedication.total / (20 * dailyHours),
              readonly: true,
              _username: leader.username,
              _month: dedication.month,
              _year: dedication.year,
              // open: true
            }
            // console.log('hoursTask', hoursTask)
            this.tasks.data.push(hoursTask)
          }
        }        
      }
      // const initialDate = this.project.date_start ? moment(this.project.date_start).startOf('year').toDate() : moment().startOf('year').toDate();
      // const endDate = this.project.date_end ? moment(this.project.date_end).add(1, 'year').endOf('year').toDate() : moment().add(3, 'year').endOf('year').toDate();
      gantt.config.start_date = moment().startOf('year').toDate();
			gantt.config.end_date = moment(maxEnddate, 'YYYY-MM-DD').add(3, 'monthy').toDate();
      gantt.config.columns = [
		    { name: "text", label: "Previsió", tree: true, width: '*' },
      ]
      // gantt.plugins({ click_drag: true })
      // gantt.config.readonly = true
      // gantt.config.editable_property = "editable";
      gantt.config.xml_date = '%Y-%m-%d'
      gantt.config.duration_unit = 'month'
      gantt.config.scales = [
        { unit: 'year', step: 1, format: '%Y' },
        { unit: 'month', step: 1, format: '%M' }
      ]

      gantt.plugins({ tooltip: true }); 
      
      gantt.showLightbox = function(id){
        // code of the custom form
      }

      gantt.templates.tooltip_text = (start,end,task) => {
        const taskDedications = this.dedications.filter(d => d.username === task._username && d.year === task._year && d.month === task._month)
        const taskDedicationsByProject = _(taskDedications)
          .groupBy('project_name')
          .map((project_name, id) => ({
            project_name: id,
            estimated_hours: _.sumBy(project_name, 'estimated_hours')
          }))
          .value()

        let out = ''
        taskDedicationsByProject.forEach(td => {
          if (td.estimated_hours) {
            out += `<b>${td.project_name}:</b> ${td.estimated_hours.toFixed(2)}h<br>`
          }          
        })

        const festiveDedications = []
        this.festives.forEach(f => {
            if ((f.users_permissions_user && f.users_permissions_user.username === task._username) || f.users_permissions_user === null) {
              if (moment(f.date, 'YYYY-MM-DD').format('YYYY') == task._year && moment(f.date, 'YYYY-MM-DD').format('MM') == task._month) {
                let dailyHours = 8
                const taskUser = this.leaders.find(l => l.username === task._username)
                taskUser.daily_dedications.forEach(dd => {
                  if (dd.from <= f.date && dd.to >= f.date) {
                    dailyHours = dd.hours
                  }
                })
                const festiveDedication = {
                  project_name: f.festive_type.name,
                  ym: moment(f.date, 'YYYY-MM-DD').format('YYYYMM'),
                  estimated_hours: dailyHours
                }
                festiveDedications.push(festiveDedication)

              }
              
            }
          })
        
        const festiveDedicationsByProject = _(festiveDedications)
          .groupBy('project_name')
          .map((project_name, id) => ({
            project_name: id,
            estimated_hours: _.sumBy(project_name, 'estimated_hours')
          }))
          .value()

        festiveDedicationsByProject.forEach(td => {
          if (td.estimated_hours) {
            out += `<b>${td.project_name}:</b> ${td.estimated_hours.toFixed(2)}h<br>`
          }          
        })

        return out;
      };

      gantt.init(this.ganttId)
      
      gantt.parse(this.tasks);

      
    },
    
    create_UUID () {
      var dt = new Date().getTime()
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0
        dt = Math.floor(dt / 16)
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
      })
      return uuid
    }
  }
}
</script>
<style scoped>
.gstc-component {
  margin: 0;
  padding: 0
}
.toolbox {
  padding: 10px
}
</style>
<style>
    @import "~dhtmlx-gantt/codebase/dhtmlxgantt.css";

    .gantt > div {
      min-height: 600px;
    }
    .gantt_row_project, .gantt_layout_x > .gantt_layout_cell, .gantt_row_task, .gantt_grid_data .gantt_last_cell{
      min-width: 300px;
    }
    .gantt_task_line.gantt_project, .gantt_task_line {
      border-radius: 30px;
    }
</style>
