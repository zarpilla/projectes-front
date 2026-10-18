// The AEAT / FACe certificate card of «Verifactu i FACe» and Configuració
// general (ticket 159): status read by the backend from the keystore, and the
// upload, where the password goes only in the multipart body.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const get = vi.fn()
const post = vi.fn()
const del = vi.fn()
const options = []
vi.mock('@/service/index', () => ({
  default: opts => {
    options.push(opts)
    return { get, post, delete: del }
  }
}))

import CertificateCard, { certificateExpiry } from '@/components/CertificateCard.vue'

const NOW = new Date('2026-10-18T10:00:00Z')
const certificate = (notAfter = '2027-06-30T00:00:00.000Z') => ({
  subject: { commonName: 'ENTITAT DE PROVA - B12345678', organization: 'Entitat de Prova SCCL' },
  nif: 'B12345678',
  issuer: { commonName: 'AC Representación', organization: 'FNMT-RCM' },
  notBefore: '2025-06-30T00:00:00.000Z',
  notAfter
})
const status = over => ({
  kind: 'verifactu',
  configured: true,
  fileName: 'certificat.p12',
  uploadedAt: '2026-10-01T09:00:00.000Z',
  passwordSet: true,
  valid: true,
  error: null,
  message: null,
  certificate: certificate(),
  ...over
})

const mountCard = (props = {}) => mount(CertificateCard, {
  props: { kind: 'verifactu', title: "Certificat de l'AEAT", ...props },
  global: { plugins: [Buefy] }
})
const tag = w => w.find('.cert-head .tag').text()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  get.mockReset()
  post.mockReset()
  del.mockReset()
  options.length = 0
})
afterEach(() => vi.useRealTimers())

describe('certificateExpiry', () => {
  it('warns under 30 days and once expired', () => {
    expect(certificateExpiry(certificate('2027-06-30T00:00:00Z'), NOW)).toMatchObject({ expired: false, soon: false })
    expect(certificateExpiry(certificate('2026-11-01T00:00:00Z'), NOW)).toEqual({ expired: false, soon: true, days: 13 })
    expect(certificateExpiry(certificate('2026-10-01T00:00:00Z'), NOW)).toMatchObject({ expired: true, soon: false })
    expect(certificateExpiry(null, NOW)).toEqual({ expired: false, soon: false, days: null })
  })
})

describe('CertificateCard', () => {
  it('shows holder, NIF, issuer and validity of a configured certificate', async () => {
    get.mockResolvedValue({ data: status() })
    const w = mountCard()
    await flushPromises()

    expect(get).toHaveBeenCalledWith('/certificates/verifactu')
    expect(tag(w)).toBe('Configurat')
    const text = w.find('.cert-facts').text()
    expect(text).toContain('ENTITAT DE PROVA - B12345678 · Entitat de Prova SCCL')
    expect(text).toContain('B12345678')
    expect(text).toContain('AC Representación')
    expect(text).toContain('30/06/2027')
    expect(text).toContain('certificat.p12 · pujat el 01/10/2026')
    expect(w.find('.notification').exists()).toBe(false)
    expect(w.find('.cert-edit').text()).toBe('Substitueix el certificat')
  })

  it('says when there is no certificate', async () => {
    get.mockResolvedValue({ data: status({ configured: false, fileName: null, valid: false, certificate: null }) })
    const w = mountCard({ kind: 'face' })
    await flushPromises()

    expect(get).toHaveBeenCalledWith('/certificates/face')
    expect(tag(w)).toBe('No configurat')
    expect(w.text()).toContain("Encara no s'ha pujat cap certificat")
    expect(w.find('.cert-edit').text()).toBe('Puja el certificat')
    expect(w.find('.cert-remove').exists()).toBe(false)
  })

  it('shows when the stored password does not open the certificate', async () => {
    get.mockResolvedValue({ data: status({ valid: false, error: 'wrong_password', message: 'La contrasenya no obre el certificat.', certificate: null }) })
    const w = mountCard()
    await flushPromises()

    expect(tag(w)).toBe('Amb errors')
    expect(w.find('.notification.is-danger').text()).toBe('La contrasenya no obre el certificat.')
  })

  it('warns when it expires within 30 days, and when it has expired', async () => {
    get.mockResolvedValue({ data: status({ certificate: certificate('2026-11-01T00:00:00Z') }) })
    let w = mountCard()
    await flushPromises()
    expect(tag(w)).toBe('Caduca aviat')
    expect(w.find('.notification.is-warning').text()).toContain("d'aquí a 13 dies")

    get.mockResolvedValue({ data: status({ certificate: certificate('2026-10-01T00:00:00Z') }) })
    w = mountCard()
    await flushPromises()
    expect(tag(w)).toBe('Amb errors')
    expect(w.find('.notification.is-danger').text()).toContain('va caducar el 01/10/2026')
  })

  it('uploads the file with the password in the multipart body, and never prefills it', async () => {
    get.mockResolvedValue({ data: status() })
    post.mockResolvedValue({ data: status({ fileName: 'nou.pfx' }) })
    const w = mountCard()
    await flushPromises()

    await w.find('.cert-edit').trigger('click')
    const password = w.find('input[type="password"]')
    expect(password.element.value).toBe('')
    expect(w.find('.cert-save').attributes('disabled')).toBeDefined()

    const file = new File(['p12'], 'nou.pfx', { type: 'application/x-pkcs12' })
    const input = w.find('input[type="file"]')
    expect(input.attributes('accept')).toBe('.p12,.pfx')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await password.setValue('secret')
    await w.find('.cert-save').trigger('click')
    await flushPromises()

    expect(post).toHaveBeenCalledTimes(1)
    const [url, body] = post.mock.calls[0]
    expect(url).toBe('/certificates/verifactu')
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('password')).toBe('secret')
    expect(body.get('file').name).toBe('nou.pfx')
    expect(options[options.length - 1]).toEqual({ requiresAuth: true, multipart: true })
    // back to the status, the password gone
    expect(w.find('.cert-upload').exists()).toBe(false)
    expect(w.vm.password).toBe('')
    expect(w.find('.cert-facts').text()).toContain('nou.pfx')
  })

  it('keeps the form open and the status when the backend refuses the file', async () => {
    get.mockResolvedValue({ data: status() })
    post.mockRejectedValue({ response: { data: { message: 'La contrasenya no obre el certificat.' } } })
    const w = mountCard()
    await flushPromises()
    const toast = vi.spyOn(w.vm.$buefy.toast, 'open').mockImplementation(() => {})

    await w.find('.cert-edit').trigger('click')
    const input = w.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'a.p12')] })
    await input.trigger('change')
    await w.find('.cert-save').trigger('click')
    await flushPromises()

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: "No s'ha desat el certificat: La contrasenya no obre el certificat.", type: 'is-danger' }))
    expect(w.find('.cert-upload').exists()).toBe(true)
    expect(tag(w)).toBe('Configurat')
  })
})
