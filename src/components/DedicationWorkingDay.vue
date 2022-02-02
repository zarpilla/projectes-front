<template>
  <div>
    <modal-box-working-day
      :is-active="isModalActive"
      :dedication-object="dedicationObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
      @delete="modalDelete"
      :users="users"
    />
    <div class="gannt-container" v-if="showGantt">
      <div class="gantt" :id="ganttId"></div>      
    </div>    
  </div>
</template>

<script>
import { EventBus } from '@/service/event-bus.js'
import ModalBoxWorkingDay from '@/components/ModalBoxWorkingDay'
import { mapState } from 'vuex'
// import sumBy from 'lodash/sumBy'
import { gantt } from 'dhtmlx-gantt'
import moment from 'moment'
import service from '@/service/index'
import _ from "lodash";

// main component
export default {
  name: 'DedicationWorkingDay',
  components: { ModalBoxWorkingDay },
  computed: {
    ...mapState(['userName']),
    ...mapState(['me'])
  },
  data () {
    return {
      isModalActive: false,      
      dedicationObject: null,      
      tasks: {},
      showGantt: false,
      ganttId: '',
      users: []
    }
  },
  async mounted () {
    this.ganttId = 'gantt-' + this.create_UUID()
    this.initializeAll();    
  },
  beforeDestroy() {
    gantt.detachEvent("onTaskClick");
    
    this.showGantt = false
  },
  methods: {
    initializeAll () {
      this.showGantt = true 

      this.tasks = { data: [] }

      setTimeout(() => {
        this.initializeGannt()
      }, 250)
    },
    async initializeGannt () {

      this.tasks = { data: [] }      
      const users = (await service({ requiresAuth: true }).get('users')).data
      this.users = users
      const dedications = (await service({ requiresAuth: true }).get('daily-dedications?_limit=-1')).data

      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        if (!user.hidden) {
          const task = { id: user.id, text: user.username, open: true, type: gantt.config.types.project, unscheduled: false, render: "split", parent: 0, readonly: true, _dedication: { users_permissions_user: user } }
          
          this.tasks.data.push(task)

          const userDedications = dedications.filter(d => d.users_permissions_user.id === user.id)

          userDedications.forEach(d => {
            const dedicationTask = { 
              id: 999 + d.id, 
              text: `${d.hours} h`, 
              start_date: d.from, 
              end_date: d.to, 
              parent: user.id,
              readonly: true,
              _dedication: d
            }
            // console.log('hoursTask', hoursTask)
            this.tasks.data.push(dedicationTask)
            
          });

          // if (userDedications && userDedications.length) {
          //   this.tasks.data.push(task)
          // }

          // // add festives
          // this.festives.forEach(f => {
          //   if ((f.users_permissions_user && f.users_permissions_user.username === leader.username) || f.users_permissions_user === null) {
          //     let dailyHours = 8
          //     leader.daily_dedications.forEach(dd => {
          //       if (dd.from <= f.date && dd.to >= f.date) {
          //         dailyHours = dd.hours
          //       }
          //     })
          //     const festiveDedication = {
          //       project_name: f.festive_type.name,
          //       ym: moment(f.date, 'YYYY-MM-DD').format('YYYYMM'),
          //       estimated_hours: dailyHours
          //     }
          //     userDedications.push(festiveDedication)
          //   }
          // })

          // const dedicationTotals = _(userDedications)
          // .groupBy('ym')
          // .map((ym, id) => ({
          //   ym: id,
          //   year: !isNaN(id) ? id.substring(0, 4) : "2099",
          //   month: !isNaN(id) ? id.substring(4, 6) : "99",
          //   total: _.sumBy(ym, 'estimated_hours')
          // }))
          // .value()

          // for (let j = 0; j < dedicationTotals.length; j++) {            
          //   tid++
          //   const dedication = dedicationTotals[j]
          //   const start_date = `${dedication.year}-${dedication.month}-01`
          //   const end_date = moment(start_date, 'YYYY-MM-DD').endOf('month').format('YYYY-MM-DD') 
          //   if (end_date > maxEnddate) {
          //     maxEnddate = end_date
          //   }
          //   let dailyHours = 8
          //   leader.daily_dedications.forEach(dd => {
          //     if (dd.from <= start_date && dd.to >= start_date) {
          //       dailyHours = dd.hours
          //     }
          //   })

          //   const hoursTask = { 
          //     id: tid, 
          //     text: `${dedication.total.toFixed(2)}h`, 
          //     start_date: start_date, 
          //     end_date: end_date, 
          //     parent: leader.id, 
          //     progress: dedication.total / (20 * dailyHours),
          //     readonly: true,
          //     _username: leader.username,
          //     _month: dedication.month,
          //     _year: dedication.year,
          //     // open: true
          //   }
          //   // console.log('hoursTask', hoursTask)
          //   this.tasks.data.push(hoursTask)
          // }
        }        
      }
      // const initialDate = this.project.date_start ? moment(this.project.date_start).startOf('year').toDate() : moment().startOf('year').toDate();
      // const endDate = this.project.date_end ? moment(this.project.date_end).add(1, 'year').endOf('year').toDate() : moment().add(3, 'year').endOf('year').toDate();
      // gantt.config.start_date = moment().startOf('year').toDate();
			// gantt.config.end_date = moment(maxEnddate, 'YYYY-MM-DD').add(3, 'monthy').toDate();
      gantt.config.columns = [
		    { name: "text", label: "Jornada", tree: true, width: '*', resize: true },
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

      gantt.attachEvent("onTaskClick", (id, e) => {
        this.dedicationObject = this.tasks.data.find(t => t.id.toString() === id.toString())
        // console.log('this.dedicationObject', this.dedicationObject)
        // if (this.dedicationObject.type === 'project') {
        //   return
        // }   
        this.isModalActive = true        
        return true;
      }, {id: "onTaskClick"});

      // gantt.plugins({ tooltip: true }); 

      // gantt.templates.tooltip_text = (start,end,task) => {
      //   const taskDedications = this.dedications.filter(d => d.username === task._username && d.year === task._year && d.month === task._month)
      //   const taskDedicationsByProject = _(taskDedications)
      //     .groupBy('project_name')
      //     .map((project_name, id) => ({
      //       project_name: id,
      //       estimated_hours: _.sumBy(project_name, 'estimated_hours')
      //     }))
      //     .value()

      //   let out = ''
      //   taskDedicationsByProject.forEach(td => {
      //     if (td.estimated_hours) {
      //       out += `<b>${td.project_name}:</b> ${td.estimated_hours.toFixed(2)}h<br>`
      //     }          
      //   })

      //   const festiveDedications = []
      //   this.festives.forEach(f => {
      //       if ((f.users_permissions_user && f.users_permissions_user.username === task._username) || f.users_permissions_user === null) {
      //         if (moment(f.date, 'YYYY-MM-DD').format('YYYY') == task._year && moment(f.date, 'YYYY-MM-DD').format('MM') == task._month) {
      //           let dailyHours = 8
      //           const taskUser = this.leaders.find(l => l.username === task._username)
      //           taskUser.daily_dedications.forEach(dd => {
      //             if (dd.from <= f.date && dd.to >= f.date) {
      //               dailyHours = dd.hours
      //             }
      //           })
      //           const festiveDedication = {
      //             project_name: f.festive_type.name,
      //             ym: moment(f.date, 'YYYY-MM-DD').format('YYYYMM'),
      //             estimated_hours: dailyHours
      //           }
      //           festiveDedications.push(festiveDedication)

      //         }
              
      //       }
      //     })
        
      //   const festiveDedicationsByProject = _(festiveDedications)
      //     .groupBy('project_name')
      //     .map((project_name, id) => ({
      //       project_name: id,
      //       estimated_hours: _.sumBy(project_name, 'estimated_hours')
      //     }))
      //     .value()

      //   festiveDedicationsByProject.forEach(td => {
      //     if (td.estimated_hours) {
      //       out += `<b>${td.project_name}:</b> ${td.estimated_hours.toFixed(2)}h<br>`
      //     }          
      //   })

      //   return out;
      // };

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
    },
    async modalSubmit (activity) {
      this.updating = true
      console.log('activity', activity)

      if (activity.id) {
        const activityObject = activity
        delete activityObject._dedication
        activityObject.from = moment(activityObject.from).format('YYYY-MM-DD')
        activityObject.to = moment(activityObject.to).format('YYYY-MM-DD')

        try {
          const newActivity = (await service({ requiresAuth: true }).put(`daily-dedications/${activity.id}`, activityObject)).data
          this.$buefy.snackbar.open({
            message: 'Guardat',
            queue: false
          })

          const task = this.tasks.data.find(t => t._dedication && t._dedication.id && t._dedication.id.toString() === activity.id.toString())
          task.start_date = moment(activity.from, 'YYYY-MM-DD').toDate()
          task.end_date = moment(activity.to, 'YYYY-MM-DD').toDate()
          task.taskName = `${activity.hours} h`
          task._dedication = newActivity

          gantt.getTask(task.id).text = task.taskName
          gantt.updateTask(task.id)          
        } catch (err) {
          console.error('activities error', err)
          this.$buefy.snackbar.open({
            message: 'Error',
            queue: false
          })
        }
      } else {
        const newId = 999999 + activity.users_permissions_user
        const dedicationTask = { 
          id: newId, 
          text: `${activity.hours} h`, 
          start_date: activity.from, 
          end_date: activity.to, 
          parent: activity.users_permissions_user,
          readonly: true,
          _dedication: activity
        }

        try {
          const newActivity = (await service({ requiresAuth: true }).post('daily-dedications', activity)).data

          this.tasks.data.push(dedicationTask)
          gantt.addTask(dedicationTask)
          const task = this.tasks.data.find(t => t.id.toString() === newId.toString())
          task._dedication = newActivity

          this.$buefy.snackbar.open({
            message: 'Guardat',
            queue: false
          })
        } catch (err) {
          console.error('activities error', err)
          this.$buefy.snackbar.open({
            message: 'Error',
            queue: false
          })
        }
      }

      this.isModalActive = false      
    },
    async modalDelete (activity) {
      
      await service({ requiresAuth: true }).delete(`daily-dedications/${activity.id}`)


      const task = this.tasks.data.find(t => t._dedication && t._dedication.id && t._dedication.id.toString() === activity.id.toString())
      this.tasks.data = this.tasks.data.filter(t => t.id.toString() !== task.id.toString())
      gantt.deleteTask(task.id)

      this.$buefy.snackbar.open({
          message: 'Esborrat',
          queue: false
      })

      this.isModalActive = false
    },
    modalCancel () {
      // console.log('modalCancel')
      // const task = this.tasks.data.find(t => t.id.toString() === this.dedicationObject.id.toString())
      // gantt.deleteTask(this.dedicationObject.id)
      // this.tasks.data = this.tasks.data.filter(t => t.id.toString() !== this.dedicationObject.id.toString())
      this.isModalActive = false
      // console.log('modalcancel', this.dedicationObject)
    },
    trashCancel () {
      this.isModalActive = false
    },
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
      min-width: 100px;
    }
    .gantt_task_line.gantt_project, .gantt_task_line {
      border-radius: 30px;
    }
</style>
