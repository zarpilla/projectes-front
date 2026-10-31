// issues/394: without full access only one's own saved pivot views can be
// deleted; the 403 answers a clear message instead of a generic error.
import { describe, it, expect, vi } from 'vitest'

const del = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ delete: del, get: vi.fn(async () => ({ data: [] })) }) }))
vi.mock('@/service', () => ({ default: () => ({ delete: del, get: vi.fn(async () => ({ data: [] })) }) }))

const { default: mixin } = await import('@/mixins/pivotViewsMixin.js')

function context () {
  return { selectedViewId: null, loadPivotViews: vi.fn(), $toast: { open: vi.fn() } }
}

describe('deletePivotView (issues/394)', () => {
  it('explains a 403', async () => {
    globalThis.confirm = () => true
    del.mockRejectedValueOnce({ response: { status: 403 } })
    const ctx = context()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await mixin.methods.deletePivotView.call(ctx, { id: 2, name: 'admins' })
    expect(ctx.$toast.open).toHaveBeenCalledWith({ message: 'Només pots eliminar les vistes que has desat tu', type: 'is-danger' })
  })

  it('keeps the generic error otherwise', async () => {
    globalThis.confirm = () => true
    del.mockRejectedValueOnce(new Error('network'))
    const ctx = context()
    await mixin.methods.deletePivotView.call(ctx, { id: 2, name: 'x' })
    expect(ctx.$toast.open).toHaveBeenCalledWith({ message: 'Error eliminant la vista', type: 'is-danger' })
  })
})
