// Shared bits of the report charts (Ingressos i despeses, Projectes)

// a colour token of the theme (it changes with the dark theme)
export const token = (name, fallback) => {
  const v = typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

const isDark = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'

export const chartColors = () => ({
  income: token('--a-accent', '#0F7B6C'),
  expense: '#C2410C',
  hours: '#F2B8A0',
  planned: token('--a-line', '#D5DDDA'),
  line: token('--a-fg', '#1F2A2E'),
  pos: token('--a-pos', '#15803D'),
  neg: token('--a-neg', '#C2410C'),
  // two series side by side (logistics: normal / refrigerated); checked for
  // colour-blind separation against each theme's surface
  first: isDark() ? '#21A08B' : '#00876F',
  second: isDark() ? '#5E88D8' : '#3B6FD4',
  warn: token('--a-over', '#C2410C')
})

// axis ticks: 12500 → 12,5k (or 13k), 1.2M
export const shortAmount = v => {
  const a = Math.abs(v)
  if (a >= 1000000) return `${(v / 1000000).toFixed(1).replace('.', ',')}M`
  if (a >= 1000) return `${(v / 1000).toFixed(a >= 10000 ? 0 : 1).replace('.', ',')}k`
  return String(v)
}

// a long category label cut for the axis (the tooltip shows it whole)
export const shortLabel = (l, max = 28) => (l && l.length > max ? l.slice(0, max - 1) + '…' : l)
