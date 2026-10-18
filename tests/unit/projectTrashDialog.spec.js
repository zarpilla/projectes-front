// issues/135: «Esborrar projecte» said «S'esborrarà permanentment … No es
// podrà desfer.», but the project only goes to the trash (`published_at: null`)
import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import ModalBox from '@/components/ModalBox.vue'
import { projectTrashDialog } from '@/domain/projectTrash'

describe('project delete dialog (issues/135)', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('says the project goes to the trash, not that it is deleted for good', async () => {
    const w = mount(ModalBox, {
      props: { isActive: false, trashObjectName: 'R/26. Projecte', ...projectTrashDialog },
      global: { plugins: [Buefy] },
      attachTo: document.body
    })
    await w.setProps({ isActive: true })
    await flushPromises()
    const text = document.querySelector('.modal-card-body').textContent
    expect(text).toContain("S'enviarà a la paperera el projecte R/26. Projecte")
    expect(text).toContain('Deixarà de sortir als llistats i als informes')
    expect(text).not.toMatch(/permanentment|No es podrà desfer/)
    w.unmount()
  })
})
