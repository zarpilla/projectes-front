<template>
  <div>
    <modal-box-estimated-hours
      :is-active="isModalActive"
      :dedication-object="dedicationObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
      @delete="modalDelete"
    />
    <div class='toolbox'>
      <!-- <button @click='updateFirstRow'>Update first row</button> -->
      <b-field grouped>
        <button class="button zis-small is-primary mr-1" type="button" @click="changeZoomLevel(-1)">
          <b-icon icon="magnify-minus" size="is-small"/>
        </button>
        <button class="button zis-small is-primary mr-1" type="button" @click="changeZoomLevel(+1)">
          <b-icon icon="magnify-plus" size="is-small"/>
        </button>
        <b-select
          v-model="user"
          placeholder="Persona"
        >
          <option
            v-for="(s, index) in users"
            :key="index"
            :value="s"
          >
            {{ s.username }}
          </option>
        </b-select>
      </b-field>
    </div>
    <!-- <pre style="height:600px;width:800px;overflow:scroll">
      {{ project.phases }}
    </pre> -->
    <!-- <div class='gstc-wrapper' ref='gstc'></div> -->
    <div class="gantt" ref="gantt"></div>
  </div>
</template>

<script>
import { EventBus } from '@/service/event-bus.js'
import ModalBoxEstimatedHours from '@/components/ModalBoxEstimatedHours'
import { mapState } from 'vuex'
// import sumBy from 'lodash/sumBy'
import { gantt } from 'dhtmlx-gantt'

function onItemClick (item) {
  EventBus.$emit('item-clicked', item)
}

// main component
export default {
  name: 'ProjectGannt2',
  props: {
    project: Object,
    users: Array,
    tasks: {
      type: Object,
      default () {
        return { data: [], links: [] }
      }
    }
  },
  components: {
    ModalBoxEstimatedHours
  },
  computed: {
    ...mapState(['userName']),
    ...mapState(['me'])
  },
  watch: {
    project: function (newVal, oldVal) {
      console.log('project changes', newVal)
      // if (gstc) gstc.destroy()
      // this.initializeGannt()
    },
    users: function (newVal, oldVal) {
      if (newVal) {
        const user = newVal.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
        if (user && user.id) {
          this.user = user
        }
      }
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
      minYear: null
    }
  },
  mounted () {
    EventBus.$on('item-clicked', (item) => {
      // console.log('item-clicked', item)
      this.dedicationObject = item
      this.isModalActive = true
    })
    EventBus.$on('phases-updated', (phases) => {
      this.phases = phases
    })
    this.initializeGannt()
  },
  methods: {
    initializeGannt () {
      gantt.config.xml_date = '%Y-%m-%d'
      gantt.config.duration_unit = 'month'
      gantt.config.scales = [
        { unit: 'year', step: 1, format: '%Y' },
        { unit: 'month', step: 1, format: '%M' }
      ]
      gantt.init(this.$refs.gantt)
      gantt.parse(this.$props.tasks)
    },
    // updateFirstRow () {
    //   state.update(`config.list.rows.${GSTC.api.GSTCID('0')}`, (row) => {
    //     row.label = 'Changed dynamically'
    //     return row
    //   })
    // },
    changeZoomLevel (delta) {
      this.zoom = this.zoom + delta
      // state.update('config.chart.time.zoom', this.zoom)
    },
    generateRows () {
      const rows = {}
      // for (let i = 0; i < this.project.phases.length; i++) {
      //   const phase = this.project.phases[i]
      //   for (let j = 0; j < phase.subphases.length; j++) {
      //     const subphase = phase.subphases[j]
      //     console.log('subphase', subphase)
      //     const id2 = GSTC.api.GSTCID(('f' + i + 's' + j).toString())
      //     rows[id2] = {
      //       id: id2,
      //       label: `${phase.name} - ${subphase.concept}`,
      //       total_hours: subphase.total_estimated_hours,
      //       total_amount: sumBy(subphase.estimated_hours, 'total_amount') + '€',
      //       _phase: phase,
      //       _subphase: subphase
      //     }
      //   }
      // }
      return rows
    },
    generateItems () {
      const items = {}
      // const phases = this.phases || this.project.phases
      // for (let i = 0; i < phases.length; i++) {
      //   const phase = phases[i]
      //   for (let j = 0; j < phase.subphases.length; j++) {
      //     const subphase = phase.subphases[j]
      //     const rowId = GSTC.api.GSTCID(('f' + i + 's' + j).toString())
      //     if (subphase.estimated_hours) {
      //       for (let k = 0; k < subphase.estimated_hours.length; k++) {
      //         const hours = subphase.estimated_hours[k]
      //         // console.log('generateItems hours', hours)
      //         // console.log('hours!!!', hours)
      //         const id = GSTC.api.GSTCID(('f' + i + 's' + j + 'h' + k).toString())
      //         const start = hours.from ? GSTC.api.date(hours.from) : GSTC.api.date(`${hours.year ? hours.year.year : GSTC.api.date().format('YYYY')}-${hours.month ? hours.month.month : '01'}-01`)
      //         const end = hours.to ? GSTC.api.date(hours.to) : (hours.month ? start.endOf('month') : start.endOf('year'))

      //         const months = end.diff(start, 'month') + 1 // - item.time.start
      //         const from = GSTC.api.date(start).format('YYYY-MM-DD')
      //         const to = GSTC.api.date(end).format('YYYY-MM-DD')
      //         const monthlyQuantity = months > 0 ? hours.quantity / months : 0

      //         const minYear = parseInt(GSTC.api.date(start).format('YYYY'))
      //         if (!this.minYear || this.minYear > minYear) {
      //           this.minYear = minYear
      //         }

      //         items[id] = {
      //           id,
      //           label: this.itemLabelContent,
      //           rowId,
      //           users_permissions_user: hours.users_permissions_user,
      //           quantity: hours.quantity,
      //           year: hours.year,
      //           month: hours.month,
      //           from: hours.from || from,
      //           to: hours.to || to,
      //           monthly_quantity: monthlyQuantity,
      //           amount: hours.amount,
      //           total_amount: hours.total_amount,
      //           _phase: phase,
      //           _subphase: subphase,
      //           _hours: hours,
      //           time: {
      //             start: start.valueOf(),
      //             end: end.valueOf()
      //           }
      //         }
      //       }
      //     }
      //   }
      // }
      return items
    },
    itemLabelContent ({ item, vido }) {
      return vido.html`<div class="my-item-content" style="cursor:pointer;" @click=${() =>
        onItemClick(
          item
        )}>${item._hours.users_permissions_user ? item._hours.users_permissions_user.username : ' ? '} - ${item._hours.quantity}h</div>`
    },
    addItem (cells) {
      // if (cells.length <= 0) {
      //   return
      // }
      // let rowId = ''
      // // const id = GSTC.api.GSTCID(('f0s0k9'))
      // const id = GSTC.api.GSTCID(this.create_UUID())
      // let startDayjs = 0
      // let endDayjs = 0
      // let phase = null
      // let subphase = null
      // for (var i in cells) {
      //   const cell = cells[i]
      //   if (cell.row.id === rowId || rowId === '') {
      //     rowId = cell.row.id
      //     phase = cell.row._phase
      //     subphase = cell.row._subphase
      //     const startDayjsCell = GSTC.api.date(cell.time.leftGlobalDate).startOf('month').valueOf()
      //     if (startDayjsCell < startDayjs || startDayjs === 0) {
      //       startDayjs = startDayjsCell
      //     }
      //     const endDayjsCell = GSTC.api.date(cell.time.rightGlobalDate).endOf('month').valueOf()
      //     if (endDayjsCell > endDayjs) {
      //       endDayjs = endDayjsCell
      //     }
      //   }
      // }
      // // console.log('this.user', this.user)
      // const item = {
      //   id,
      //   label: this.itemLabelContent,
      //   time: {
      //     start: startDayjs,
      //     end: endDayjs
      //   },
      //   rowId,
      //   users_permissions_user: this.user,
      //   quantity: subphase.quantity || 1,
      //   _uuid: this.create_UUID(),
      //   _phase: phase,
      //   _subphase: subphase,
      //   _hours: {
      //     users_permissions_user: this.user,
      //     quantity: subphase.quantity || 1
      //   },
      //   // year: hours.year,
      //   // month: hours.month,
      //   // from: hours.from || from,
      //   // to: hours.to || to,
      //   monthly_quantity: 1
      // }
      // const items = this.generateItems()
      // items[id] = item
      // state.update('config.chart.items', () => {
      //   return items
      // })
      // this.$emit('gantt-item-update', item)
    },
    async trashConfirm () {
      this.isModalActive = false
      // this.$buefy.snackbar.open({
      //   message: 'Esborrat',
      //   queue: false
      // })
    },
    async modalSubmit (activity) {
      // // console.log('modalSubmit activity', activity)
      // const items = state.get('config.chart.items')
      // // console.log('modalSubmit items', items)
      // const itemToUpdate = items[activity.id]
      // itemToUpdate.quantity = activity.quantity
      // itemToUpdate.amount = activity.amount
      // itemToUpdate.total_amount = activity.total_amount
      // itemToUpdate.comment = activity.comment
      // itemToUpdate.users_permissions_user = activity.users_permissions_user
      // state.update(`config.chart.items.${activity.id}`, (item) => {
      //   item.quantity = itemToUpdate.quantity
      //   item.amount = itemToUpdate.amount
      //   item.total_amount = itemToUpdate.total_amount
      //   item.users_permissions_user = itemToUpdate.users_permissions_user
      //   item._hours.users_permissions_user = itemToUpdate.users_permissions_user
      //   item._hours.quantity = itemToUpdate.quantity
      //   return item
      // })
      // this.$emit('gantt-item-update', itemToUpdate)
      // this.isModalActive = false
    },
    async modalDelete (activity) {
      // console.log('modalDelete activity', activity)
      // this.$emit('gantt-item-delete', activity)
      // const t = this
      // state.update('config.chart.items', {})
      // state.update('config.chart.items', () => {
      //   return t.generateItems()
      // })
      // this.isModalActive = false
      // // if (activity.id) {
      // //   await service({ requiresAuth: true }).delete(`activities/${activity.id}`)
      // //   this.isModalEditActive = false
      // //   this.getActivities()
      // //   this.$buefy.snackbar.open({
      // //     message: 'Esborrat',
      // //     queue: false
      // //   })
      // // }
    },
    modalCancel () {
      this.isModalActive = false
    },
    trashCancel () {
      this.isModalActive = false
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
      height: 300px;
    }
</style>
