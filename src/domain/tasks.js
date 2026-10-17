import moment from 'moment'

// Rules of the Tasques screens (board and list), out of Tasks.vue so they can be tested.

/**
 * The "done" state: the last one by order (Acabades), when there are at least two.
 * The board, the list, the overdue notice and the daily digest all use this rule;
 * before, some places compared with the state id 3.
 */
export function doneStateId (states) {
  if (!states || states.length < 2) return null
  const last = states.reduce((a, b) => ((b.order ?? 0) >= (a.order ?? 0) ? b : a))
  return last.id
}

const stateId = state => (state && typeof state === 'object' ? state.id : state)

export function isDone (task, states) {
  const done = doneStateId(states)
  return done !== null && stateId(task.task_state) === done
}

/** Due before today and not done. */
export function isOverdue (task, states, today = moment().format('YYYY-MM-DD')) {
  return !!task.due_date && task.due_date < today && !isDone(task, states)
}

export const DUE_BUCKETS = [
  { key: 'late', title: 'Vençudes', tone: 'late' },
  { key: 'week', title: 'Pròxims 7 dies' },
  { key: 'later', title: 'Més endavant' },
  { key: 'past', title: 'Data passada' },
  { key: 'none', title: 'Sense data' }
]

/**
 * Where a task goes when grouped by due date. Done tasks with a past date are not
 * "Vençudes": they go to "Data passada".
 */
export function dueBucket (task, states, today = moment().format('YYYY-MM-DD')) {
  if (!task.due_date) return 'none'
  if (task.due_date < today) return isDone(task, states) ? 'past' : 'late'
  const weekEnd = moment(today, 'YYYY-MM-DD').add(7, 'days').format('YYYY-MM-DD')
  return task.due_date <= weekEnd ? 'week' : 'later'
}

/**
 * Filters of the list. `state`: 'open' (not done, the default), 'all', 'done' or a
 * state id; `due`: 'all', 'late', 'week' (late or in the next 7 days) or 'none';
 * `activityType`: an id, 0 for "no Funció", 'all' (or null) for all; `priority`:
 * 'high' | 'normal' | 'low' or 'all'; `search` matches the name,
 * the description and the project.
 */
export function filterTasks (tasks, { state = 'open', due = 'all', activityType = null, priority = 'all', search = '' } = {}, states = [], today = moment().format('YYYY-MM-DD')) {
  const q = (search || '').trim().toLowerCase()
  return tasks.filter(t => {
    if (state === 'open' && isDone(t, states)) return false
    if (state === 'done' && !isDone(t, states)) return false
    if (typeof state === 'number' && stateId(t.task_state) !== state) return false
    if (due !== 'all') {
      const b = dueBucket(t, states, today)
      if (due === 'late' && b !== 'late') return false
      if (due === 'week' && b !== 'late' && b !== 'week') return false
      if (due === 'none' && b !== 'none') return false
    }
    if (activityType !== null && activityType !== undefined && activityType !== 'all') {
      const id = stateId(t.activity_type) || 0
      if (id !== activityType) return false
    }
    if (priority && priority !== 'all' && (t.priority || 'normal') !== priority) return false
    if (q && ![t.name, t.description, t.project && t.project.name].some(x => x && String(x).toLowerCase().includes(q))) return false
    return true
  })
}

const SORTS = {
  name: t => (t.name || '').toLowerCase(),
  project: t => (t.project && t.project.name ? t.project.name.toLowerCase() : '￿'),
  updated: t => t.updatedAt || t.updated_at || '',
  priority: t => ({ high: 0, normal: 1, low: 2 })[t.priority] ?? 1
}

/**
 * Sorted copy. 'due' puts tasks without date last in both directions; 'state' follows
 * the states' order.
 */
export function sortTasks (tasks, key = 'due', dir = 'asc', states = []) {
  const sign = dir === 'desc' ? -1 : 1
  const order = new Map(states.map(s => [s.id, s.order ?? 0]))
  const value = key === 'state'
    ? t => order.get(stateId(t.task_state)) ?? 9999
    : SORTS[key] || (t => t.due_date || null)
  return [...tasks].sort((a, b) => {
    const va = value(a)
    const vb = value(b)
    if (key === 'due' && (va === null || vb === null)) {
      if (va === vb) return (a.id || 0) - (b.id || 0)
      return va === null ? 1 : -1
    }
    if (va < vb) return -sign
    if (va > vb) return sign
    return (a.id || 0) - (b.id || 0)
  })
}

/**
 * Groups of the list: [{ key, title, tone, tasks, prefill }]. `prefill` is what a new
 * task added from the group starts with. By person, a task with several people is in
 * each of their groups.
 */
export function groupTasks (tasks, by, states = [], today = moment().format('YYYY-MM-DD')) {
  if (by === 'state') {
    const groups = states.map(s => ({ key: 'state-' + s.id, title: s.name, tasks: [], prefill: { task_state: s } }))
    tasks.forEach(t => {
      const g = groups.find(g => g.prefill.task_state.id === stateId(t.task_state))
      if (g) g.tasks.push(t)
    })
    return groups.filter(g => g.tasks.length)
  }
  if (by === 'project' || by === 'person') {
    const map = new Map()
    const add = (key, title, prefill, t) => {
      if (!map.has(key)) map.set(key, { key, title, tasks: [], prefill })
      map.get(key).tasks.push(t)
    }
    tasks.forEach(t => {
      if (by === 'project') {
        if (t.project && t.project.id) add('project-' + t.project.id, t.project.name, { project: t.project }, t)
        else add('project-none', 'Sense projecte', {}, t)
      } else {
        const people = t.users_permissions_users || []
        if (!people.length) add('person-none', 'Sense persona', {}, t)
        people.forEach(u => add('person-' + u.id, u.username, { users_permissions_users: [u] }, t))
      }
    })
    const none = by === 'project' ? 'project-none' : 'person-none'
    return [...map.values()].sort((a, b) =>
      a.key === none ? 1 : b.key === none ? -1 : a.title.localeCompare(b.title, 'ca'))
  }
  const groups = DUE_BUCKETS.map(b => ({ ...b, tasks: [], prefill: {} }))
  tasks.forEach(t => groups.find(g => g.key === dueBucket(t, states, today)).tasks.push(t))
  return groups.filter(g => g.tasks.length)
}

/** "avui", "ahir", "fa 3 dies", "fa 2 mesos"… */
export function updatedLabel (updatedAt, now = moment()) {
  if (!updatedAt) return ''
  const days = moment(now).startOf('day').diff(moment(updatedAt).startOf('day'), 'days')
  if (days <= 0) return 'avui'
  if (days === 1) return 'ahir'
  if (days < 45) return `fa ${days} dies`
  const months = Math.round(days / 30)
  if (months < 18) return `fa ${months} mesos`
  const years = Math.max(1, Math.floor(days / 365))
  return years === 1 ? 'fa 1 any' : `fa ${years} anys`
}

/** Not touched for more than 15 days: the daily digest's "ÚLTIM AVÍS" rule. */
export function isStale (task, now = moment()) {
  const at = task.updatedAt || task.updated_at
  return !!at && moment(now).diff(moment(at), 'days') > 15
}

/** Query of the board/list: not archived unless asked, and by person on the server. */
export function tasksQuery ({ project = null, user = null, archived = false } = {}) {
  let query = 'tasks?_limit=-1'
  if (!archived) query += '&_where[archived_eq]=false'
  if (project) query += '&_where[project_eq]=' + project
  if (user) query += '&_where[users_permissions_users.id_eq]=' + user
  return query
}

/** Saved card order of the board, per project, person and view. */
export function kanbanViewQuery ({ project = null, user = null, view }) {
  return `kanban-views?_limit=1&_where[projectId_eq]=${project || 0}&_where[userId_eq]=${user || 0}&_where[view_eq]=${view}`
}

// ---------- phase 2: priority, hours, mentions, calendar, templates ----------

export const PRIORITIES = [
  { value: 'high', label: 'Alta' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Baixa' }
]
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 }
export const priorityOf = task => (task && PRIORITY_RANK[task.priority] !== undefined ? task.priority : 'normal')
export const priorityLabel = value => (PRIORITIES.find(p => p.value === value) || PRIORITIES[1]).label
export const priorityRank = task => PRIORITY_RANK[priorityOf(task)]

export const RECURRENCES = [
  { value: null, label: 'No es repeteix' },
  { value: 'weekly', label: 'Cada setmana' },
  { value: 'biweekly', label: 'Cada 2 setmanes' },
  { value: 'monthly', label: 'Cada mes' },
  { value: 'quarterly', label: 'Cada 3 mesos' },
  { value: 'yearly', label: 'Cada any' }
]
export const recurrenceLabel = value => (RECURRENCES.find(r => r.value === value) || RECURRENCES[0]).label

/** Hours logged and estimated, rounded for display: { done, estimate, ratio, over }. */
export function taskHours (task, logged = {}) {
  const done = Number(logged[task.id] || 0)
  const estimate = task.estimated_hours === null || task.estimated_hours === undefined || task.estimated_hours === ''
    ? null
    : Number(task.estimated_hours)
  return {
    done,
    estimate,
    ratio: estimate ? Math.min(1, done / estimate) : 0,
    over: estimate !== null && done > estimate
  }
}

export const formatHours = h => {
  const n = Math.round(Number(h || 0) * 100) / 100
  return String(n).replace('.', ',') + ' h'
}

/**
 * The person being mentioned at the caret ("…@Lai|" → "Lai"), or null.
 * Usernames have spaces ("Laia Puig"), so up to two words are taken.
 */
export function mentionQuery (text, caret) {
  const before = String(text || '').slice(0, caret)
  const m = before.match(/(?:^|\s)@([^\s@]*(?:\s[^\s@]*)?)$/)
  return m ? m[1] : null
}

/** Replaces the "@query" before the caret with "@Username ". */
export function insertMention (text, caret, username) {
  const before = String(text || '').slice(0, caret)
  const after = String(text || '').slice(caret)
  const start = before.search(/@[^@]*$/)
  const head = before.slice(0, start) + '@' + username + ' '
  return { text: head + after, caret: head.length }
}

/** Ids of the people whose "@Username" is in the text. */
export function mentionedIds (text, users) {
  const t = String(text || '')
  return (users || []).filter(u => u.username && t.includes('@' + u.username)).map(u => u.id)
}

/**
 * Month grid of the calendar view: weeks (Monday first) of { date, inMonth, tasks }.
 * A task with start and due date shows on every day in between; with only one of
 * them, on that day.
 */
export function calendarWeeks (month, tasks) {
  const first = moment(month, 'YYYY-MM').startOf('month')
  const start = first.clone().startOf('isoWeek')
  const end = first.clone().endOf('month').endOf('isoWeek')
  const byDay = new Map()
  tasks.forEach(t => {
    const from = t.start_date || t.due_date
    const to = t.due_date || t.start_date
    if (!from) return
    const d = moment.max(moment(from), start.clone())
    const last = moment.min(moment(to), end.clone())
    for (; d.isSameOrBefore(last, 'day'); d.add(1, 'day')) {
      const key = d.format('YYYY-MM-DD')
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key).push(t)
    }
  })
  const weeks = []
  for (const d = start.clone(); d.isSameOrBefore(end, 'day'); d.add(1, 'week')) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const day = d.clone().add(i, 'days')
      const key = day.format('YYYY-MM-DD')
      week.push({ date: key, day: day.date(), inMonth: day.month() === first.month(), tasks: byDay.get(key) || [] })
    }
    weeks.push(week)
  }
  return weeks
}

/**
 * Template items from tasks: their dates become days from the earliest one, so the
 * template can be applied from any day.
 */
export function templateItems (tasks) {
  const dates = tasks.flatMap(t => [t.start_date, t.due_date]).filter(Boolean).sort()
  const base = dates.length ? moment(dates[0]) : null
  const days = d => (d && base ? moment(d).diff(base, 'days') : null)
  return tasks.map(t => ({
    name: t.name,
    description: t.description || null,
    activity_type: t.activity_type && t.activity_type.id ? t.activity_type.id : null,
    priority: priorityOf(t),
    estimated_hours: t.estimated_hours ?? null,
    recurrence: t.recurrence || null,
    start_days: days(t.start_date),
    due_days: days(t.due_date),
    checklist: (t.checklist || []).map(c => c.name).filter(Boolean)
  }))
}

/** Tasks to create from a template in a project, starting on `from`. */
export function tasksFromTemplate (items, { project, from, stateId, users = [], createdBy = null }) {
  const at = days => (days === null || days === undefined ? null : moment(from).add(days, 'days').format('YYYY-MM-DD'))
  return (items || []).map(i => ({
    name: i.name,
    description: i.description || null,
    project,
    activity_type: i.activity_type || null,
    priority: i.priority || 'normal',
    estimated_hours: i.estimated_hours ?? null,
    recurrence: i.recurrence || null,
    start_date: at(i.start_days),
    due_date: at(i.due_days),
    task_state: stateId,
    archived: false,
    created: createdBy,
    users_permissions_users: users,
    checklist: (i.checklist || []).map(name => ({ name, done: false }))
  }))
}

/**
 * Notices of the logged-in person for the Tasques menu entry:
 * - overdue: their open tasks past the due date, and the unticked checklist items of
 *   their tasks assigned to them past theirs;
 * - fresh: since they last opened Tasques, tasks someone else created for them and
 *   comments that mention them.
 */
export function taskAlerts ({ tasks = [], states = [], mentions = [], me, seenAt = null, today = moment().format('YYYY-MM-DD') }) {
  const mine = t => (t.users_permissions_users || []).some(u => u.id === me)
  const overdueTasks = tasks.filter(t => !t.archived && mine(t) && isOverdue(t, states, today)).length
  const overdueChecks = tasks.filter(t => !t.archived && !isDone(t, states)).reduce((n, t) =>
    n + (t.checklist || []).filter(c => {
      const user = c.user && typeof c.user === 'object' ? c.user.id : c.user
      return user === me && !c.done && c.due_date && c.due_date < today
    }).length, 0)
  const after = at => !seenAt || (at && at > seenAt)
  const createdBy = t => (t.created && typeof t.created === 'object' ? t.created.id : t.created)
  const freshTasks = tasks.filter(t => !t.archived && mine(t) && !isDone(t, states) && createdBy(t) !== me && after(t.createdAt)).length
  const freshMentions = mentions.filter(c => after(c.createdAt) && (!c.author || c.author.id !== me)).length
  return { overdue: overdueTasks + overdueChecks, fresh: freshTasks + freshMentions }
}
