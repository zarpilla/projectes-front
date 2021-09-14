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
    <div class='gstc-wrapper' ref='gstc'></div>
  </div>
</template>

<script>
import GSTC from 'gantt-schedule-timeline-calendar'
import { Plugin as TimelinePointer } from 'gantt-schedule-timeline-calendar/dist/plugins/timeline-pointer.esm.min.js'
import { Plugin as Selection } from 'gantt-schedule-timeline-calendar/dist/plugins/selection.esm.min.js'
import { Plugin as ItemResizing } from 'gantt-schedule-timeline-calendar/dist/plugins/item-resizing.esm.min.js'
import { Plugin as ItemMovement } from 'gantt-schedule-timeline-calendar/dist/plugins/item-movement.esm.min.js'
// import { Plugin as Bookmarks } from 'gantt-schedule-timeline-calendar/dist/plugins/time-bookmarks.esm.min.js'
// import { Plugin as DependencyLines } from 'gantt-schedule-timeline-calendar/dist/plugins/dependency-lines.esm.min.js'
// import { Plugin as ItemTypes } from 'gantt-schedule-timeline-calendar/dist/plugins/item-types.esm.min.js'
import { EventBus } from '@/service/event-bus.js'
import ModalBoxEstimatedHours from '@/components/ModalBoxEstimatedHours'
import { mapState } from 'vuex'
import 'gantt-schedule-timeline-calendar/dist/style.css'

let gstc, state
// helper functions
/**
 * @returns { import('gantt-schedule-timeline-calendar').Rows }
 */

// function onRowClick (row) {
//   // @ts-ignore
//   window.row = GSTC.api.sourceID(row.id)
//   // alert('Row ' + GSTC.api.sourceID(row.id) + ' clicked!')
//   console.log('row', row)
//   EventBus.$emit('event', row)
// }
function onItemClick (item) {
  EventBus.$emit('item-clicked', item)
}

const doNotSelectThisCells = []
const doNotSelectThisItems = []

function canSelectItem (item) {
  if (typeof item.canSelect === 'boolean') return item.canSelect
  return !doNotSelectThisItems.includes(item.id)
}

function preventSelection (selecting) {
  return {
    'chart-timeline-grid-row-cell': selecting['chart-timeline-grid-row-cell'].filter(
      (cell) => !doNotSelectThisCells.includes(cell.time.leftGlobalDate.format('YYYY-MM-DD'))
    ),
    'chart-timeline-items-row-item': selecting['chart-timeline-items-row-item'].filter((item) => canSelectItem(item))
  }
}

const movementPluginConfig = {
  events: {
    onMove ({ items }) {
      // prevent items to change row
      return items.before.map((beforeMovementItem, index) => {
        const afterMovementItem = items.after[index]
        const myItem = GSTC.api.merge({}, afterMovementItem)
        myItem.rowId = beforeMovementItem.rowId
        // if (!canChangeRow) {
        //   myItem.rowId = beforeMovementItem.rowId;
        // }
        // if (!canCollide && isCollision(myItem)) {
        //   myItem.time = { ...beforeMovementItem.time };
        //   myItem.rowId = beforeMovementItem.rowId;
        // }
        return myItem
      })
    }
  },
  snapToTime: {
    start ({ startTime, time }) {
      return startTime.startOf('month')
    }
  }
}

// main component
export default {
  name: 'ProjectGannt',
  props: {
    project: Object,
    users: Array
  },
  components: {
    ModalBoxEstimatedHours
  },
  computed: {
    ...mapState(['userName'])
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
      phases: null
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
  beforeUnmount () {
    if (gstc) gstc.destroy()
  },
  methods: {
    initializeGannt () {
      /**
       * @type { import('gantt-schedule-timeline-calendar').Config }
       */
      const months = [
        {
          zoomTo: 100, // we want to display this format for all zoom levels until 100
          period: 'month',
          periodIncrement: 1,
          main: true,
          format ({ timeStart }) {
            return timeStart.format('MMM YYYY') // full list of formats: https://day.js.org/docs/en/display/format
          }
        }
      ]
      // console.log('months', months)
      // console.log('months', movementPluginConfig)
      const addItem = this.addItem
      const config = {
        licenseKey:
          // '====BEGIN LICENSE KEY====\nXOfH/lnVASM6et4Co473t9jPIvhmQ/l0X3Ewog30VudX6GVkOB0n3oDx42NtADJ8HjYrhfXKSNu5EMRb5KzCLvMt/pu7xugjbvpyI1glE7Ha6E5VZwRpb4AC8T1KBF67FKAgaI7YFeOtPFROSCKrW5la38jbE5fo+q2N6wAfEti8la2ie6/7U2V+SdJPqkm/mLY/JBHdvDHoUduwe4zgqBUYLTNUgX6aKdlhpZPuHfj2SMeB/tcTJfH48rN1mgGkNkAT9ovROwI7ReLrdlHrHmJ1UwZZnAfxAC3ftIjgTEHsd/f+JrjW6t+kL6Ef1tT1eQ2DPFLJlhluTD91AsZMUg==||U2FsdGVkX1/SWWqU9YmxtM0T6Nm5mClKwqTaoF9wgZd9rNw2xs4hnY8Ilv8DZtFyNt92xym3eB6WA605N5llLm0D68EQtU9ci1rTEDopZ1ODzcqtTVSoFEloNPFSfW6LTIC9+2LSVBeeHXoLEQiLYHWihHu10Xll3KsH9iBObDACDm1PT7IV4uWvNpNeuKJc\npY3C5SG+3sHRX1aeMnHlKLhaIsOdw2IexjvMqocVpfRpX4wnsabNA0VJ3k95zUPS3vTtSegeDhwbl6j+/FZcGk9i+gAy6LuetlKuARjPYn2LH5Be3Ah+ggSBPlxf3JW9rtWNdUoFByHTcFlhzlU9HnpnBUrgcVMhCQ7SAjN9h2NMGmCr10Rn4OE0WtelNqYVig7KmENaPvFT+k2I0cYZ4KWwxxsQNKbjEAxJxrzK4HkaczCvyQbzj4Ppxx/0q+Cns44OeyWcwYD/vSaJm4Kptwpr+L4y5BoSO/WeqhSUQQ85nvOhtE0pSH/ZXYo3pqjPdQRfNm6NFeBl2lwTmZUEuw==\n====END LICENSE KEY====',
          '====BEGIN LICENSE KEY====\nIf2UZ3yHSderYokdg4oGpVTlF2meqvmf+NYD2lEGAz1g1M1dYONDR2/YopXSXaqACgv7CgrkoQtrt5T7eDkb3vyaSHkvyntKk3+R+9PrsZM2DsIxj8nqKqIyKZUPLkpae+6ZDlAqJE+cBBUr4bNCQgf8i3oFTbjb9gj3NFA90P9f2F62+tVE4bORMJ5Cyd/PFpRzHQ6rbiEQ0BbuklrQd2ntoIAnyhFBeQmuCFIfUvzYTXbRAIHw/Ch+7Hrb2fm0nyyNoIyfJwumrXO41FsE3zbjBS8QOrup3o0wXaeFGuJb3TidN2KcEVkF0xa+B1dEZiSNeVj7Mtzy/V8T49h3XQ==||U2FsdGVkX19G26SVS2UUXVEyoOl4TggkpKULqZPU9+DkXO7E1raVKzOcAPrrmXwEiI7P9q5fZ7r/xo11/s5ppuheSGQ97fbYgjWaU7fE8xo=\nT+Lw0WTTtL4kzOEu7vxt+x0nUFrmx3cUWorguYvUu1DwWxdVzoC4fHt3tAv9oMQOG4Px2MpVfG8HyY6SGZ5q0IuzYC7rbEeCUorhD1wuy7T9STMlTQ2LVGVlB3HhIO9kfKknAD7hzzS+DdxB1awdBCRkyfoIMxnfp/aGddVYzTi6odAiD4j9c+0S4LZg9tT10iRmyw3Dt0puygDPJgVwTnApsoylWWwIlDzBtjYl9BFVg8vyZUon4pArHuEW4kwd30OuXzMncboXBkQuDwlLZemHM3PlA97dshJ8nyaVAG4w5W/Qz/XQI+/he7w1yBHwz8/vV1jFPZHyMtM8kbE+hw==\n====END LICENSE KEY====',
        plugins: [
          TimelinePointer(),
          Selection({
            events: {
              // @ts-ignore
              onStart (lastSelected) {
                // we can clear selection each time we start to prevent shift+select multiple cells
                // gstc.api.plugins.selection.selectCells([]);
                // console.log('selecting start', lastSelected)
              },
              // @ts-ignore
              onSelecting (selecting, lastSelected) {
                const filtered = preventSelection(selecting)
                // console.log('Selecting cells', filtered['chart-timeline-grid-row-cell'])
                // console.log('Selecting items', filtered['chart-timeline-items-row-item'])
                return filtered
              },
              // @ts-ignore
              onEnd (selected, lastSelected) {
                const filtered = preventSelection(selected)
                addItem(filtered['chart-timeline-grid-row-cell'])
                // console.log('Selected cells', filtered['chart-timeline-grid-row-cell'])
                // console.log('Selected items', filtered['chart-timeline-items-row-item'])
                return filtered
              }
            }
          }),
          ItemResizing(),
          ItemMovement(movementPluginConfig)
        ],
        list: {
          toggle: {
            display: false
          },
          columns: {
            data: {
              [GSTC.api.GSTCID('label')]: {
                id: GSTC.api.GSTCID('label'),
                width: 260,
                data: 'label',
                expander: true,
                header: {
                  content: 'Fase'
                }
              },
              [GSTC.api.GSTCID('total_hours')]: {
                id: GSTC.api.GSTCID('total_hours'),
                width: 60,
                data: 'total_hours',
                header: {
                  content: 'Hores'
                }
              }
            }
          },
          rows: this.generateRows()
        },
        chart: {
          items: this.generateItems(),
          calendarLevels: [months],
          time: {
            zoom: this.zoom,
            from: GSTC.api.date('2021-01-01').valueOf(),
            to: GSTC.api.date().add(3, 'year').valueOf()
          }
        }
      }
      state = GSTC.api.stateFromConfig(config)
      gstc = GSTC({
        element: this.$refs.gstc,
        state
      })

      setTimeout(() => {
        const firstItem = state.get(`config.chart.items.${gstc.api.GSTCID('f0s0h0')}`)
        if (firstItem) {
          gstc.api.scrollToTime(firstItem.time.start, false)
        }
      }, 500)

      // state.update('config.plugin.Selection.multipleSelection', false)
      // state.update('config.plugin.Selection.items', false)

      state.subscribe('config.chart.items', items => {
        // console.log('items changed', items)
        for (var i in items) {
          const item = items[i]
          const months = GSTC.api.date(item.time.end).diff(GSTC.api.date(item.time.start), 'month') + 1 // - item.time.start
          item.from = GSTC.api.date(item.time.start).format('YYYY-MM-DD')
          item.to = GSTC.api.date(item.time.end).format('YYYY-MM-DD')
          if (months > 0) {
            item.monthly_quantity = item.quantity / months
          } else {
            item.monthly_quantity = 0
          }
          // console.log('item', item)
          // this.$emit('gantt-item-update', item)
        }
      })
      this.state = state
    },
    // updateFirstRow () {
    //   state.update(`config.list.rows.${GSTC.api.GSTCID('0')}`, (row) => {
    //     row.label = 'Changed dynamically'
    //     return row
    //   })
    // },
    changeZoomLevel (delta) {
      this.zoom = this.zoom + delta
      state.update('config.chart.time.zoom', this.zoom)
    },
    generateRows () {
      const rows = {}
      for (let i = 0; i < this.project.phases.length; i++) {
        const phase = this.project.phases[i]
        for (let j = 0; j < phase.subphases.length; j++) {
          const subphase = phase.subphases[j]
          const id2 = GSTC.api.GSTCID(('f' + i + 's' + j).toString())
          rows[id2] = {
            id: id2,
            label: `${phase.name} - ${subphase.concept}`,
            total_hours: subphase.total_estimated_hours,
            _phase: phase,
            _subphase: subphase
          }
        }
      }
      return rows
    },
    generateItems () {
      const items = {}
      const phases = this.phases || this.project.phases
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i]
        for (let j = 0; j < phase.subphases.length; j++) {
          const subphase = phase.subphases[j]
          const rowId = GSTC.api.GSTCID(('f' + i + 's' + j).toString())
          if (subphase.estimated_hours) {
            for (let k = 0; k < subphase.estimated_hours.length; k++) {
              const hours = subphase.estimated_hours[k]
              // console.log('generateItems hours', hours)
              // console.log('hours!!!', hours)
              const id = GSTC.api.GSTCID(('f' + i + 's' + j + 'h' + k).toString())
              const start = hours.from ? GSTC.api.date(hours.from) : GSTC.api.date(`${hours.year ? hours.year.year : GSTC.api.date().format('YYYY')}-${hours.month ? hours.month.month : '01'}-01`)
              const end = hours.to ? GSTC.api.date(hours.to) : (hours.month ? start.endOf('month') : start.endOf('year'))

              const months = end.diff(start, 'month') + 1 // - item.time.start
              const from = GSTC.api.date(start).format('YYYY-MM-DD')
              const to = GSTC.api.date(end).format('YYYY-MM-DD')
              const monthlyQuantity = months > 0 ? hours.quantity / months : 0

              items[id] = {
                id,
                label: this.itemLabelContent,
                rowId,
                users_permissions_user: hours.users_permissions_user,
                quantity: hours.quantity,
                year: hours.year,
                month: hours.month,
                from: hours.from || from,
                to: hours.to || to,
                monthly_quantity: monthlyQuantity,
                _phase: phase,
                _subphase: subphase,
                _hours: hours,
                time: {
                  start: start.valueOf(),
                  end: end.valueOf()
                }
              }
            }
          }
        }
      }
      return items
    },
    itemLabelContent ({ item, vido }) {
      return vido.html`<div class="my-item-content" style="cursor:pointer;" @click=${() =>
        onItemClick(
          item
        )}>${item._hours.users_permissions_user ? item._hours.users_permissions_user.username : ' ? '} - ${item._hours.quantity}h</div>`
    },
    addItem (cells) {
      if (cells.length <= 0) {
        return
      }
      let rowId = ''
      // const id = GSTC.api.GSTCID(('f0s0k9'))
      const id = GSTC.api.GSTCID(this.create_UUID())
      let startDayjs = 0
      let endDayjs = 0
      let phase = null
      let subphase = null
      for (var i in cells) {
        const cell = cells[i]
        if (cell.row.id === rowId || rowId === '') {
          rowId = cell.row.id
          phase = cell.row._phase
          subphase = cell.row._subphase
          const startDayjsCell = GSTC.api.date(cell.time.leftGlobalDate).startOf('month').valueOf()
          if (startDayjsCell < startDayjs || startDayjs === 0) {
            startDayjs = startDayjsCell
          }
          const endDayjsCell = GSTC.api.date(cell.time.rightGlobalDate).endOf('month').valueOf()
          if (endDayjsCell > endDayjs) {
            endDayjs = endDayjsCell
          }
        }
      }
      // console.log('this.user', this.user)
      const item = {
        id,
        label: this.itemLabelContent,
        time: {
          start: startDayjs,
          end: endDayjs
        },
        rowId,
        users_permissions_user: this.user,
        quantity: subphase.quantity || 1,
        _uuid: this.create_UUID(),
        _phase: phase,
        _subphase: subphase,
        _hours: {
          users_permissions_user: this.user,
          quantity: subphase.quantity || 1
        },
        // year: hours.year,
        // month: hours.month,
        // from: hours.from || from,
        // to: hours.to || to,
        monthly_quantity: 1
      }
      const items = this.generateItems()
      items[id] = item
      state.update('config.chart.items', () => {
        return items
      })
      this.$emit('gantt-item-update', item)
      // state.update(`config.chart.items.${item.id}`, item)
      // state.update('config.chart.items', () => {
      //   return item
      // })
    },
    async trashConfirm () {
      this.isModalActive = false
      // this.$buefy.snackbar.open({
      //   message: 'Esborrat',
      //   queue: false
      // })
    },
    async modalSubmit (activity) {
      // console.log('modalSubmit activity', activity)
      const items = state.get('config.chart.items')
      // console.log('modalSubmit items', items)
      const itemToUpdate = items[activity.id]
      itemToUpdate.quantity = activity.quantity
      itemToUpdate.comment = activity.comment
      itemToUpdate.users_permissions_user = activity.users_permissions_user
      state.update(`config.chart.items.${activity.id}`, (item) => {
        item.quantity = itemToUpdate.quantity
        item.users_permissions_user = itemToUpdate.users_permissions_user
        item._hours.users_permissions_user = itemToUpdate.users_permissions_user
        item._hours.quantity = itemToUpdate.quantity
        return item
      })
      this.$emit('gantt-item-update', itemToUpdate)
      this.isModalActive = false
    },
    async modalDelete (activity) {
      console.log('modalDelete activity', activity)
      this.$emit('gantt-item-delete', activity)
      const t = this
      state.update('config.chart.items', {})
      state.update('config.chart.items', () => {
        return t.generateItems()
      })
      this.isModalActive = false
      // if (activity.id) {
      //   await service({ requiresAuth: true }).delete(`activities/${activity.id}`)
      //   this.isModalEditActive = false
      //   this.getActivities()
      //   this.$buefy.snackbar.open({
      //     message: 'Esborrat',
      //     queue: false
      //   })
      // }
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
