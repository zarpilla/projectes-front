// issues/103: Taules auxiliars › Anys showed «2.019», «2.020»… (an integer
// formatted as a quantity).
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import AdminEntityList from '@/components/AdminEntityList.vue'

const cell = (row, name, config) => AdminEntityList.methods.cellText.call({ ...AdminEntityList.methods }, row, name, config)

describe('Taules auxiliars cells (issues/103)', () => {
  it('shows years as they are written', () => {
    expect(cell({ year: 2019 }, 'year', { type: 'integer' })).toBe('2019')
  })
  it('keeps formatting quantities', () => {
    expect(cell({ working_hours: 1764 }, 'working_hours', { type: 'decimal' })).toBe('1.764')
  })
})
