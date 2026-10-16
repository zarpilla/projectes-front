// "Dedicació" report: how the hours of a period split by month, person, project,
// type of activity and function. Works on the rows of activities/calendar.

const hoursOf = activity => Number(activity && activity.hours) || 0

// [{ name, hours, share }] sorted by hours (largest first); `nameOf` gives the
// group of an activity, and activities without one go to `noneName`
export const groupHours = (activities, nameOf, noneName = 'Sense assignar') => {
  const groups = new Map()
  let total = 0
  ;(activities || []).forEach(a => {
    const hours = hoursOf(a)
    total += hours
    const name = nameOf(a) || noneName
    groups.set(name, (groups.get(name) || 0) + hours)
  })
  return [...groups.entries()]
    .map(([name, hours]) => ({ name, hours, share: total ? hours / total : 0 }))
    .sort((x, y) => y.hours - x.hours || x.name.localeCompare(y.name))
}

// the first `limit` groups and, when there are more, one "Altres N …" row
export const topWithRest = (groups, limit, restName = count => `Altres ${count}`) => {
  if (groups.length <= limit) return groups
  const rest = groups.slice(limit)
  return [
    ...groups.slice(0, limit),
    {
      name: restName(rest.length),
      hours: rest.reduce((acc, g) => acc + g.hours, 0),
      share: rest.reduce((acc, g) => acc + g.share, 0),
      isRest: true
    }
  ]
}

// [{ key: 'YYYY-MM', hours }] for every month from `from` to `to` (ISO dates),
// months without hours included
export const hoursByMonth = (activities, from, to) => {
  const byMonth = new Map()
  ;(activities || []).forEach(a => {
    const key = String(a.date || '').slice(0, 7)
    if (key) byMonth.set(key, (byMonth.get(key) || 0) + hoursOf(a))
  })
  const months = []
  if (from && to) {
    let [y, m] = from.slice(0, 7).split('-').map(Number)
    const [ty, tm] = to.slice(0, 7).split('-').map(Number)
    while (y < ty || (y === ty && m <= tm)) {
      const key = `${y}-${String(m).padStart(2, '0')}`
      months.push({ key, hours: byMonth.get(key) || 0 })
      m++
      if (m > 12) { m = 1; y++ }
    }
  } else {
    [...byMonth.keys()].sort().forEach(key => months.push({ key, hours: byMonth.get(key) }))
  }
  return months
}
