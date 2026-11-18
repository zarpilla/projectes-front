// «Consulta i autorització nou punt d'entrega» (issues/357).
import { townKey } from '@/domain/contactAccess'

const OFFICE = ['orders_admin', 'admin', 'projects']

/** The office (and full access) reads every request and marks them answered. */
export const isOfficeUser = permissions => (permissions || []).some(p => OFFICE.includes(p))

export const emptyPointRequest = () => ({
  trade_name: '',
  city: '',
  address: '',
  schedule: '',
  estimated_weight: '',
  notes: ''
})

const REQUIRED = [['city', 'la població'], ['address', "l'adreça"], ['schedule', "l'horari"]]

/** What the request lacks («Falta l'adreça i l'horari.»), or null. Same text as the API. */
export function pointRequestError (form) {
  const names = REQUIRED.filter(([key]) => !(form[key] && String(form[key]).trim())).map(([, name]) => name)
  if (!names.length) return null
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}` : names[0]
  return `Falta ${list}.`
}

// issues/357, seguiment: the office approves or rejects a request instead of a switch
// «Resposta». A request answered before has no status: «Resposta».
export const STATUS_TEXT = { approved: 'Aprovada', rejected: 'Rebutjada' }

/** { text, tag } of a request's state for the list. */
export function requestState (request) {
  if (!request || !request.answered) return { text: 'Pendent', tag: 'is-warning' }
  if (request.status === 'approved') return { text: STATUS_TEXT.approved, tag: 'is-success' }
  if (request.status === 'rejected') return { text: STATUS_TEXT.rejected, tag: 'is-danger' }
  return { text: 'Resposta', tag: 'is-info' }
}

const hourOf = (h, m) => {
  const hours = Number(h)
  const minutes = m === undefined || m === '' ? 0 : Number(m)
  if (!Number.isInteger(hours) || hours < 0 || hours > 24) return null
  if (![0, 15, 30, 45].includes(minutes) || (hours === 24 && minutes)) return null
  return hours + minutes / 60
}

// «8-14», «de 8 a 20 h», «8:30h – 13.30h», «16 fins a 19»
const RANGE = /(\d{1,2})(?:[:.,'h](\d{2}))?\s*h?\s*(?:-|–|—|\ba\b|\bfins\s+(?:a|les)\b)\s*(?:les\s+)?(\d{1,2})(?:[:.,'h](\d{2}))?/gi

/**
 * The delivery slots a free-text schedule names, at most two, earliest first,
 * as the point form keeps them (hours, quarters as decimals): «de 8 a 14 i de
 * 16 a 19 h» → time_slot_1 8–14, time_slot_2 16–19. Whatever it can't read
 * stays empty for the office to fill in.
 */
export function slotsFromSchedule (schedule) {
  const ranges = []
  for (const match of String(schedule || '').matchAll(RANGE)) {
    const ini = hourOf(match[1], match[2])
    const end = hourOf(match[3], match[4])
    if (ini === null || end === null || end <= ini) continue
    if (!ranges.some(r => r[0] === ini && r[1] === end)) ranges.push([ini, end])
  }
  ranges.sort((a, b) => a[0] - b[0])
  const [first, second] = ranges
  return {
    time_slot_1_ini: first ? first[0] : null,
    time_slot_1_end: first ? first[1] : null,
    time_slot_2_ini: second && second[0] >= first[1] ? second[0] : null,
    time_slot_2_end: second && second[0] >= first[1] ? second[1] : null
  }
}

const key = name => String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

/**
 * The delivery point form's fields from an approved request (issues/357, seguiment): the
 * member as owner, the name, the address, the town if it is on the list (and
 * its usual CP), the slots the schedule names, the notes; the schedule and the
 * weight as written go to the drivers' details.
 */
export function pointFromRequest (request, { cities = [], townPostcodes = {} } = {}) {
  const city = cities.find(c => townKey(c.name) === townKey(request.city))
  const name = (request.trade_name || '').trim() || null
  const details = [
    request.schedule ? `Horari indicat a la consulta: ${request.schedule.trim()}` : '',
    request.estimated_weight ? `Pes estimat de la comanda: ${request.estimated_weight.trim()}` : ''
  ].filter(Boolean).join('\n')
  const owner = request.user && typeof request.user === 'object' ? request.user.id : request.user
  return {
    owner: owner || null,
    trade_name: name,
    name,
    address: (request.address || '').trim() || null,
    city: city ? city.name : null,
    postcode: (city && townPostcodes[townKey(city.name)]) || null,
    notes: (request.notes || '').trim() || null,
    notes_delivery: details || null,
    ...slotsFromSchedule(request.schedule)
  }
}
