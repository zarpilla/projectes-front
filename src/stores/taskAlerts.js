import { defineStore } from 'pinia'
import moment from 'moment'
import service from '@/service/index'
import { currentUserId } from '@/domain/currentUser'

// after a page load the dot waits for the page's own data: one server thread
// per entity, and these were asked together with it (issues/307)
export const TASK_ALERTS_DELAY_MS = 2500
let soon = null

// The dot of the Tasques menu entry (AsideMenuItem): overdue tasks of the logged-in
// person and what is new for them since they last opened Tasques.
const seenKey = me => `tasksSeenAt:${me}`

export const useTaskAlerts = defineStore('taskAlerts', {
  state: () => ({ overdue: 0, fresh: 0, loadedAt: 0 }),
  getters: {
    count: state => state.overdue + state.fresh,
    title: state => {
      const parts = []
      if (state.overdue) parts.push(`${state.overdue} ${state.overdue === 1 ? 'vençuda' : 'vençudes'}`)
      if (state.fresh) parts.push(`${state.fresh} ${state.fresh === 1 ? 'novetat' : 'novetats'}`)
      return parts.length ? 'Tasques: ' + parts.join(' · ') : ''
    }
  },
  actions: {
    seenAt () {
      const me = currentUserId()
      try {
        return me ? localStorage.getItem(seenKey(me)) : null
      } catch {
        return null
      }
    },
    // opening Tasques: what was new is seen
    markSeen () {
      const me = currentUserId()
      if (!me) return
      try {
        localStorage.setItem(seenKey(me), new Date().toISOString())
      } catch {
        // private window: the dot comes back on reload
      }
      this.fresh = 0
    },
    // a page is loading: count once it has had the server first
    refreshSoon (delay = TASK_ALERTS_DELAY_MS) {
      clearTimeout(soon)
      soon = setTimeout(() => {
        soon = null
        this.refresh()
      }, delay)
    },
    // the server counts them (GET tasks/alerts, issues/307): it asked the
    // person's tasks with everything populated (~40 KB), the task states and
    // her mentions, three requests, to count two numbers here
    async refresh () {
      const me = currentUserId()
      if (!me) return
      try {
        let seenAt = this.seenAt()
        if (!seenAt) {
          // first time: nothing old counts as new
          this.markSeen()
          seenAt = this.seenAt()
        }
        const today = moment().format('YYYY-MM-DD')
        const { data } = await service({ requiresAuth: true }).get(
          `tasks/alerts?seen=${encodeURIComponent(seenAt || '')}&today=${today}`
        )
        this.overdue = Number(data && data.overdue) || 0
        this.fresh = Number(data && data.fresh) || 0
        this.loadedAt = Date.now()
      } catch {
        // no dot when it cannot be worked out
      }
    }
  }
})
