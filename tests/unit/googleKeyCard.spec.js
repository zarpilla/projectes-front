// issues/159: the Google service-account key that imports the Google Calendar
// events as hours (Resilience.Earth) could only be uploaded from the Strapi
// admin. Configuració general › Integracions uploads it with the certificate
// card: a .json, no password, and the account it belongs to.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const get = vi.fn()
const post = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, post, delete: vi.fn() }) }))
import CertificateCard from '@/components/CertificateCard.vue'

describe('Google key card (issues/159)', () => {
  it('shows the account, and uploads the .json without a password', async () => {
    get.mockResolvedValue({ data: { kind: 'google', configured: true, valid: true, fileName: 'clau.json', account: { clientEmail: 'hores@prova.iam.gserviceaccount.com', projectId: 'prova' } } })
    post.mockResolvedValue({ data: { kind: 'google', configured: true, valid: true, fileName: 'nova.json', account: { clientEmail: 'x@y', projectId: 'p' } } })
    const w = mount(CertificateCard, { props: { kind: 'google', title: 'Google' }, global: { plugins: [Buefy] } })
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/certificates/google')
    expect(w.text()).toContain('hores@prova.iam.gserviceaccount.com')
    expect(w.text()).toContain('Configurat')
    expect(w.text()).toContain('Substitueix la clau')

    await w.find('.cert-edit').trigger('click')
    expect(w.text()).not.toContain('Contrasenya')
    expect(w.find('input[type=file]').attributes('accept')).toContain('.json')
    w.vm.file = new File(['{}'], 'nova.json', { type: 'application/json' })
    await w.vm.upload()
    const [url, body] = post.mock.calls.at(-1)
    expect(url).toBe('/certificates/google')
    expect(body.has('file')).toBe(true)
    expect(body.has('password')).toBe(false)
  })
})
