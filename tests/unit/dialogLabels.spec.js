// issues/131: confirm dialogs without their own labels said «Cancel» / «OK»
// (Buefy's defaults), e.g. leaving a project with unsaved changes.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createApp } from 'vue'
import Buefy from 'buefy'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import { buefyConfig } from '@/helpers/buefyConfig'
import ProjectForm from '@/views/ProjectForm.vue'

const buttons = () => [...document.querySelectorAll('.dialog .modal-card-foot button')].map(b => b.textContent.trim())

describe('dialog labels (issues/131)', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('confirm dialogs default to Catalan buttons', async () => {
    const app = createApp({ template: '<div/>' })
    app.use(Buefy, buefyConfig)
    app.mount(document.createElement('div'))
    app.config.globalProperties.$buefy.dialog.confirm({ message: 'Segur?' })
    await new Promise(r => setTimeout(r))
    expect(buttons()).toEqual(['Cancel·la', "D'acord"])
  })

  it('leaving a project with unsaved changes says what each button does', () => {
    const confirm = vi.fn()
    const next = vi.fn()
    const ctx = { dirty: true, isInitialLoad: false, userHasInteracted: true, $buefy: { dialog: { confirm } } }
    ProjectForm.beforeRouteLeave.call(ctx, {}, {}, next)
    const opts = confirm.mock.calls[0][0]
    expect(opts.confirmText).toBe('Surt sense desar')
    expect(opts.cancelText).toBe('Continua editant')
    opts.onCancel()
    expect(next).toHaveBeenCalledWith(false)
  })
})
