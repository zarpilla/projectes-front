// issues/041: ProjectForm.submit() replaced an empty region ({ id: 0 }) with
// null on the form itself to send it as null. The template binds
// v-model="form.region.id", so the next render read null.id and the page threw
// (then Vue's patch failed with "reading 'emitsOptions'"). The empty region
// must go out as null in the request while the form keeps { id: 0 }.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = { post: vi.fn(), put: vi.fn(), get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import ProjectForm from '@/views/ProjectForm.vue'

function vm (form) {
  return {
    form: {
      name: 'P-e2e',
      date_start: '2026-01-01',
      date_end: '2026-12-31',
      project_state: { id: 1 },
      project_scope: { id: 1 },
      leader: { id: 1 },
      ...form
    },
    periodification: [],
    $buefy: { snackbar: { open: vi.fn() } },
    $router: { push: vi.fn() },
    getData: vi.fn()
  }
}

describe('ProjectForm.submit() without a region (issues/041)', () => {
  beforeEach(() => {
    api.post.mockReset().mockResolvedValue({ data: { id: 7 } })
    api.put.mockReset().mockResolvedValue({ data: {} })
  })

  it('creating: sends region null and keeps form.region bindable', async () => {
    const c = vm({ region: { id: 0 } })
    await ProjectForm.methods.submit.call(c, 'continue')

    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post.mock.calls[0][1].region).toBeNull()
    expect(c.form.region).toEqual({ id: 0 })
  })

  it('editing: sends region null and keeps form.region bindable', async () => {
    const c = vm({ id: 5, region: { id: 0 } })
    await ProjectForm.methods.submit.call(c, 'continue')

    expect(api.put).toHaveBeenCalledTimes(1)
    expect(api.put.mock.calls[0][1].region).toBeNull()
    expect(c.form.region).toEqual({ id: 0 })
  })

  it('a refused save (missing name) leaves form.region bindable', async () => {
    const c = vm({ name: '', region: { id: 0 } })
    await ProjectForm.methods.submit.call(c, 'continue')

    expect(api.post).not.toHaveBeenCalled()
    expect(c.form.region).toEqual({ id: 0 })
  })

  it('a chosen region is sent as is', async () => {
    const c = vm({ region: { id: 3, name: 'Catalunya' } })
    await ProjectForm.methods.submit.call(c, 'continue')

    expect(api.post.mock.calls[0][1].region).toEqual({ id: 3, name: 'Catalunya' })
  })
})
