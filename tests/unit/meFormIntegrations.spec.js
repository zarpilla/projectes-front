// issues/159: the DIR3 and PDF-reader addresses and keys could only be set in
// the Strapi admin. Configuració general now edits them; the keys are
// write-only: sent only when typed, never shown, and the API only says
// whether each one is set.
import { describe, it, expect, vi } from 'vitest'

const put = vi.fn().mockResolvedValue({ data: {} })
const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ put, get }) }))
import MeForm from '@/components/MeForm.vue'

const vm = (extra = {}) => {
  const data = MeForm.data.call({})
  return {
    ...data,
    form: { ...data.form, name: 'Coop' },
    ...extra,
    $buefy: { snackbar: { open: vi.fn() }, toast: { open: vi.fn() } }
  }
}

describe('MeForm integrations (issues/159)', () => {
  it('sends the addresses, and a key only when one was typed', async () => {
    const c = vm()
    c.form.dir3_api_url = 'https://dir3.example.org'
    c.tokens.invoice_parser_api_token = '  new-key  '
    await MeForm.methods.submit.call(c)
    const body = put.mock.calls.at(-1)[1]
    expect(body.dir3_api_url).toBe('https://dir3.example.org')
    expect(body.invoice_parser_api_token).toBe('new-key')
    expect(body).not.toHaveProperty('dir3_api_token')
    expect(c.tokens.invoice_parser_api_token).toBe('')
    expect(c.tokenSet.invoice_parser_api_token).toBe(true)
  })

  it('reads which keys are set from the API flags', async () => {
    const c = vm()
    get.mockImplementation(async url => ({ data: url === '/me' ? { name: 'Coop', dir3_api_url: 'https://d', dir3_api_token_set: true } : { permissions: [] } }))
    await MeForm.methods.loadData.call(c)
    expect(c.form.dir3_api_url).toBe('https://d')
    expect(c.tokenSet).toEqual({ dir3_api_token: true, invoice_parser_api_token: false })
  })
})
