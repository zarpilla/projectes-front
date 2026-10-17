// issues/063: a received invoice sometimes opened blank: /api/me answered 403
// and DocumentForm.getData stopped there, before loading the document.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DocumentForm from '@/components/DocumentForm.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.setItem('user', JSON.stringify({ id: 4, username: 'anna' }))
})

describe('DocumentForm without /me (issues/063)', () => {
  it('still loads the document and warns', async () => {
    const forbidden = Object.assign(new Error('403'), { response: { status: 403 } })
    get.mockImplementation(async url => {
      if (url === '/users/me' || url === 'me') throw forbidden
      return { data: {} }
    })
    const ctx = {
      type: 'received-invoices',
      $route: { params: { id: 0 } },
      $buefy: { snackbar: { open: vi.fn() } },
      warnSettingsMissing: DocumentForm.methods.warnSettingsMissing
    }
    // reaching the auxiliary data is enough: the rest is the usual loading
    const reached = new Error('reached the document loading')
    ctx.getAuxiliarData = vi.fn(async () => { throw reached })
    await expect(DocumentForm.methods.getData.call(ctx)).rejects.toBe(reached)
    expect(ctx.user).toMatchObject({ id: 4 })
    expect(ctx.options).toEqual({})
    expect(ctx.$buefy.snackbar.open).toHaveBeenCalled()
  })
})

// The 403s on /api/me: App.vue asked /me while logged out (login page), i.e.
// without a JWT, for options nothing read.
describe('App while logged out (issues/063)', () => {
  it('does not ask /me', async () => {
    const App = (await import('@/App.vue')).default
    localStorage.removeItem('user')
    localStorage.removeItem('jwt')
    get.mockReset()
    const ctx = { loaded: false }
    await App.methods.loadUserData.call(ctx)
    expect(get).not.toHaveBeenCalled()
    expect(ctx.loaded).toBe(true)
  })
})
