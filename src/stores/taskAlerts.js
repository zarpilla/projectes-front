import { defineStore } from 'pinia'
import service from '@/service/index'
import { currentUserId } from '@/domain/currentUser'
import { taskAlerts } from '@/domain/tasks'

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
    async refresh () {
      const me = currentUserId()
      if (!me) return
      try {
        const api = service({ requiresAuth: true })
        let seenAt = this.seenAt()
        if (!seenAt) {
          // first time: nothing old counts as new
          this.markSeen()
          seenAt = this.seenAt()
        }
        const [tasks, states, mentions] = await Promise.all([
          api.get(`tasks?_limit=-1&_where[archived_eq]=false&_where[users_permissions_users.id_eq]=${me}`),
          service({ requiresAuth: true, cached: true }).get('task-states?_sort=order'),
          api.get(`task-comments?_limit=-1&_where[mentions.id_eq]=${me}&_where[createdAt_gt]=${encodeURIComponent(seenAt)}`)
        ])
        const result = taskAlerts({ tasks: tasks.data || [], states: states.data || [], mentions: mentions.data || [], me, seenAt })
        this.overdue = result.overdue
        this.fresh = result.fresh
        this.loadedAt = Date.now()
      } catch {
        // no dot when it cannot be worked out
      }
    }
  }
})
