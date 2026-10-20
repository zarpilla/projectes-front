// issues/302 (La Diligència, 2026-10-20): order 25432 was saved on Monday
// 2026-10-19 with its farm pickup on Tuesday the 13th, a week already gone;
// the date field offered past days and only warned about days the route
// doesn't run. Re-saving it kept collection order 25433-R of the 13th, because
// the form sent the same date back. Rule: no past pickup dates. Opening a
// pending order whose pickup day is gone moves it to the route's next day, so
// saving it groups it into a collection order of that day; loading never
// rewrites a pickup date that is still to come.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import moment from 'moment'

const get = vi.fn()
vi.mock('@/service/index', () => ({
  default: () => ({ get, put: vi.fn(), post: vi.fn(async () => ({ data: {} })) })
}))
import OrdersForm from '@/components/OrdersForm.vue'

// DT - BAIX MONTSENY runs on Tuesdays only
const ROUTE = { id: 11, name: 'DT - BAIX MONTSENY', active: true, tuesday: true }

function formVm (form = {}) {
  const vm = {
    form: {
      id: 25432,
      status: 'pending',
      owner: 61,
      collection_point: 7,
      collection_pickup_route: 11,
      collection_pickup_date: new Date(2026, 9, 13),
      ...form
    },
    canEdit: true,
    collectionPickupRoutes: [],
    collectionPickupDateWarningMessage: '',
    routeFestives: [],
    nextDayLimitHour: 14,
    permissions: ['orders_admin'],
    $buefy: { toast: { open: vi.fn() } }
  }
  for (const m of ['fetchCollectionPickupRoutes', 'calculateCollectionPickupDate', 'checkCollectionPickupDate', 'movePastCollectionPickupDate']) {
    vm[m] = OrdersForm.methods[m].bind(vm)
  }
  return vm
}

const day = d => moment(d).format('YYYY-MM-DD')

describe('farm pickup dates in the past (issues/302)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-19T17:34:00')) // Monday
    get.mockReset()
    get.mockResolvedValue({ data: [ROUTE] })
  })
  afterEach(() => vi.useRealTimers())

  it("opening a pending order whose pickup is gone moves it to the route's next day, with a warning", async () => {
    const vm = formVm()
    await vm.fetchCollectionPickupRoutes({ loading: true })
    await vm.movePastCollectionPickupDate()
    expect(day(vm.form.collection_pickup_date)).toBe('2026-10-20')
    expect(vm.collectionPickupDateWarningMessage).toMatch(/13\/10\/2026/)
  })

  it('loading keeps a pickup date still to come, even with one route for the point', async () => {
    const vm = formVm({ collection_pickup_date: new Date(2026, 9, 27) })
    await vm.fetchCollectionPickupRoutes({ loading: true })
    await vm.movePastCollectionPickupDate()
    expect(day(vm.form.collection_pickup_date)).toBe('2026-10-27')
    expect(vm.collectionPickupDateWarningMessage).toBe('')
  })

  it('an order past pending, or one the user cannot edit, keeps its date', async () => {
    for (const vm of [formVm({ status: 'delivered' }), Object.assign(formVm(), { canEdit: false })]) {
      vm.collectionPickupRoutes = [ROUTE]
      await vm.movePastCollectionPickupDate()
      expect(day(vm.form.collection_pickup_date)).toBe('2026-10-13')
    }
  })

  it('a past day picked by hand is warned about, even on a route day', async () => {
    const vm = formVm({ collection_pickup_date: new Date(2026, 9, 20) })
    vm.collectionPickupRoutes = [ROUTE]
    vm.form.collection_pickup_date = new Date(2026, 9, 13)
    await vm.checkCollectionPickupDate()
    expect(vm.collectionPickupDateWarningMessage).toMatch(/ja ha passat/)
  })
})
