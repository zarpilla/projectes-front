// issues/181: number, date and wording slips of the third redesign review:
// «100.00 €», «2272.74 €», «de octubre», «(fa 5 dies)» for 4 days ago,
// «(0.010h)», «0h 0m» in the printed workday log, a hard-coded «La
// Diligència», the pending payments notice on every page load, two ways of
// asking before deleting, «Cancel·la | D'acord» to cancel an order and an
// English «Festive» list.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import moment from 'moment'
import 'moment/dist/locale/ca'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn(), delete: vi.fn() }) }))

import { ofWord, daysFromToday } from '@/helpers/catalan'
import { formatHoursMinutes } from '@/domain/workdayLog'
import { counterElapsed } from '@/service/timeCounter'
import ModalBoxEmittedInvoices from '@/components/ModalBoxEmittedInvoices.vue'
import ModalBoxInvoice from '@/components/ModalBoxInvoice.vue'
import ModalBoxDedication from '@/components/ModalBoxDedication.vue'
import TasksCalendar from '@/components/TasksCalendar.vue'
import DedicationInput from '@/components/DedicationInput.vue'
import JornadaDiaria from '@/components/JornadaDiaria.vue'
import OrdersForm from '@/components/OrdersForm.vue'
import AdminEntityList from '@/components/AdminEntityList.vue'

beforeAll(() => moment.locale('ca'))

describe('Catalan words (issues/181)', () => {
  it('«de» or «d\'» before a month or a name', () => {
    expect(ofWord('octubre')).toBe("d'octubre")
    expect(ofWord('abril')).toBe("d'abril")
    expect(ofWord('gener')).toBe('de gener')
    expect(ofWord('Arran de Terra')).toBe("d'Arran de Terra")
    expect(ofWord('La Diligència')).toBe('de La Diligència')
  })

  it('dates say «18 d\'octubre», not «18 de octubre»', () => {
    const date = new Date(2026, 9, 18)
    expect(TasksCalendar.methods.longDate(date)).toMatch(/^18 d.octubre$/)
    const subtitle = ModalBoxDedication.computed.headSubtitle.call({ userNameSearch: '', form: { date } })
    expect(subtitle).toMatch(/^diumenge 18 d.octubre de 2026$/)
  })

  it('days ago counted in calendar days', () => {
    const today = moment('2026-10-18T17:30:00')
    expect(daysFromToday('2026-10-14', today)).toBe('fa 4 dies')
    expect(daysFromToday('2026-10-17', today)).toBe('ahir')
    expect(daysFromToday('2026-10-18', today)).toBe('avui')
    expect(daysFromToday('2026-10-31', today)).toBe("d'aquí 13 dies")
    expect(DedicationInput.methods.formatTitle(moment().format('YYYY-MM-DD'))).toMatch(/\(avui\)$/)
  })
})

describe('Catalan numbers (issues/181)', () => {
  it('the invoice confirmation shows «100,00 €»', () => {
    expect(ModalBoxEmittedInvoices.methods.money(100)).toBe('100,00 €')
    expect(ModalBoxEmittedInvoices.methods.money(1234.5)).toBe('1.234,50 €')
  })

  it('the timer and the printed workday log', () => {
    const e = counterElapsed({ createdAt: '2026-10-18T10:00:00Z' }, moment('2026-10-18T10:00:36Z'))
    expect(e.display).toBe('0 h 0 min 36 s (0,010 h)')
    expect(formatHoursMinutes(0)).toBe('0 h 00')
    expect(formatHoursMinutes(270)).toBe('4 h 30')
  })

  it('the hours header shows 2 decimals, as its rows', () => {
    expect(DedicationInput.methods.hoursLabel(4.25)).toBe('4,25 h')
    expect(DedicationInput.methods.hoursLabel(0.01)).toBe('0,01 h')
  })
})

describe('pending payments notice (issues/181)', () => {
  it('the amount in Catalan and the entity\'s own name', () => {
    const sum = ModalBoxInvoice.computed.sumOfInvoices.call({ invoices: [{ total: 2000 }, { total: 272.74 }] })
    expect(sum).toBe('2.272,74 €')
    expect(ModalBoxInvoice.computed.ofEntity.call({ me: { name: 'Arran de Terra' } })).toBe("d'Arran de Terra")
    expect(ModalBoxInvoice.computed.ofEntity.call({ me: null })).toBe("de l'entitat")
  })
})

describe('dialogs (issues/181)', () => {
  it('deleting a workday log asks as the other deletions do', () => {
    const confirm = vi.fn()
    JornadaDiaria.methods.deleteWorkLog.call({ $buefy: { dialog: { confirm } } }, {}, 0)
    expect(confirm.mock.calls[0][0]).toMatchObject({ title: 'Esborrar?', confirmText: 'Esborra', type: 'is-danger' })
  })

  it('cancelling an order: «No, torna» / «Anul·la la comanda»', async () => {
    const confirm = vi.fn()
    await OrdersForm.methods.deleteOrder.call({ $buefy: { dialog: { confirm } }, form: { id: 1 } })
    expect(confirm.mock.calls[0][0]).toMatchObject({ confirmText: 'Anul·la la comanda', cancelText: 'No, torna' })
    expect(confirm.mock.calls[0][0].message).toMatch(/anul·lar la comanda/)
  })
})

describe('an entity the admin screens don\'t list (issues/181)', () => {
  beforeEach(() => get.mockReset())

  it('says it isn\'t managed there and loads nothing', async () => {
    get.mockResolvedValue({ data: { entities: [{ name: 'region', attributes: {} }], entityToApiPath: {} } })
    const vm = { entityName: 'festive', isLoading: false, $buefy: { toast: { open: vi.fn() } } }
    await AdminEntityList.methods.loadMetadata.call(vm)
    expect(vm.notManaged).toBe(true)
    expect(vm.$buefy.toast.open).not.toHaveBeenCalled()
    get.mockClear()
    await AdminEntityList.methods.loadData.call(vm)
    expect(get).not.toHaveBeenCalled()
  })
})
