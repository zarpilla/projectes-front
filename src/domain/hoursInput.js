// The hours typed in the «Afegeix hores» modal: «1,5», «1.5» or «1:30»
// (hours:minutes) are 1.5 h. Anything else is NaN, so it is refused before it
// reaches the backend («hours must be a number… NaN», issues/245). Empty stays
// empty (null).
export const parseHours = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  const text = String(value).trim()
  if (!text) return null
  const hm = text.match(/^(\d+):([0-5]\d)$/)
  if (hm) return Number(hm[1]) + Number(hm[2]) / 60
  const normalized = text.replace(',', '.')
  return /^-?(\d+\.?\d*|\.\d+)$/.test(normalized) ? Number(normalized) : NaN
}
