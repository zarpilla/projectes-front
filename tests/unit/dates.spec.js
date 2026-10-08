// Pins the output of every date calculation that used dayjs or date-fns, so
// moving them to moment can't change what users see or what is sent to the API.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import moment from 'moment'
import 'moment/dist/locale/ca'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import OrderView from '@/views/OrderView.vue'
import OrdersForm from '@/components/OrdersForm.vue'
import ClientForm from '@/views/ClientForm.vue'
import ProjectPhases from '@/components/ProjectPhases.vue'
import DocumentForm from '@/components/DocumentForm.vue'
import FooterBar from '@/components/FooterBar.vue'
import DedicationTable from '@/components/DedicationTable.vue'

// The app runs moment in Catalan
beforeEach(() => {
  moment.locale('ca')
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-07T10:30:00+02:00'))
  get.mockReset()
})
afterEach(() => vi.useRealTimers())

describe.each([
  ['OrderView', OrderView],
  ['OrdersForm', OrdersForm]
])('%s date formatting', (_, component) => {
  const { formatDate, formatDateTime } = component.methods

  it('formats dates as DD/MM/YYYY', () => {
    expect(formatDate('2026-10-07')).toBe('07/10/2026')
    expect(formatDate('2026-01-31T23:30:00.000Z')).toBe('01/02/2026') // Madrid is UTC+1
    expect(formatDate(new Date(2026, 11, 31))).toBe('31/12/2026')
    expect(formatDate(null)).toBe('')
    expect(formatDate('')).toBe('')
  })

  it('formats timestamps in Madrid time', () => {
    expect(formatDateTime('2026-10-07T13:45:00.000Z')).toBe('07/10/2026 15:45')
    expect(formatDateTime('2026-03-29T00:59:00.000Z')).toBe('29/03/2026 01:59')
    expect(formatDateTime('2026-03-29T01:00:00.000Z')).toBe('29/03/2026 03:00') // DST change
    expect(formatDateTime(undefined)).toBe('')
  })
})

describe.each([
  ['ClientForm', ClientForm],
  ['ProjectPhases', ProjectPhases]
])('%s readable creation date', (_, component) => {
  it('stays in English, as dayjs formatted it', () => {
    const vm = {}
    component.methods.input.call(vm, new Date(2026, 0, 5))
    expect(vm.createdReadable).toBe('Jan 5, 2026')
    component.methods.input.call(vm, '2026-10-07')
    expect(vm.createdReadable).toBe('Oct 7, 2026')
  })
})

describe('DocumentForm emitted-date limits', () => {
  it('allows dates from 25 years ago to 4 days ahead by default', () => {
    const vm = { $route: { query: {}, params: {} } }
    for (const [name, fn] of Object.entries(DocumentForm.methods)) vm[name] = fn.bind(vm)
    const data = DocumentForm.data.call(vm)
    expect(moment(data.minEmittedDate).format('YYYY-MM-DD HH:mm')).toBe('2001-10-07 10:30')
    expect(moment(data.maxEmittedDate).format('YYYY-MM-DD HH:mm')).toBe('2026-10-11 10:30')
    expect(data.minEmittedDate).toBeInstanceOf(Date)
  })

  const run = async (form, invoices) => {
    get.mockResolvedValue({ data: invoices })
    const vm = { type: 'emitted-invoices', form, minEmittedDate: null }
    await DocumentForm.methods.calculateMinEmittedDate.call(vm)
    return vm
  }

  it("starts a series' emitted date at its last real invoice", async () => {
    const vm = await run({ serial: { id: 3 }, state: 'real', emitted: '2026-10-01' }, [{ emitted: '2026-09-15' }])
    expect(get).toHaveBeenCalledWith(expect.stringContaining('_where[serial_eq]=3'))
    expect(vm.minEmittedDate).toBeInstanceOf(Date)
    expect(moment(vm.minEmittedDate).format('YYYY-MM-DD')).toBe('2026-09-15')
  })

  it('falls back to 25 years ago when the series has no real invoice', async () => {
    const vm = await run({ serial: 3, state: 'real' }, [])
    expect(moment(vm.minEmittedDate).format('YYYY-MM-DD')).toBe('2001-10-07')
  })

  it('moves a draft dated before the last invoice up to it', async () => {
    const vm = await run({ serial: 3, state: 'draft', emitted: '2026-09-01' }, [{ emitted: '2026-09-15' }])
    expect(moment(vm.form.emitted).format('YYYY-MM-DD')).toBe('2026-09-15')
  })

  it('leaves a draft dated after the last invoice alone', async () => {
    const vm = await run({ serial: 3, state: 'draft', emitted: '2026-09-20' }, [{ emitted: '2026-09-15' }])
    expect(vm.form.emitted).toBe('2026-09-20')
  })
})

describe('FooterBar', () => {
  it('shows the current year', () => {
    expect(FooterBar.computed.year.call({})).toBe(2026)
  })
})

describe('DedicationTable', () => {
  it('loads the activities of the last 7 days', () => {
    get.mockResolvedValue({ data: [] })
    DedicationTable.methods.getActivities.call({})
    expect(get).toHaveBeenCalledWith('activities/calendar?_limit=-1&_where[date_gte]=2026-09-30')
  })
})
