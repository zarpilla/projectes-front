// The contact form warns when the NIF is already on another contact (decided
// 2026-10-30). Delivery points must not warn: in Diligència one organisation
// has several points under one NIF.
import { describe, it, expect, vi } from 'vitest'
import { nifKey, shouldCheckNif, nifWarningText, makeNifCheck } from '@/domain/contactNif'

describe('nifKey', () => {
  it('ignores case, spaces, dashes and dots', () => {
    expect(nifKey(' b-12.345 678 ')).toBe('B12345678')
    expect(nifKey(undefined)).toBe('')
  })
})

describe('shouldCheckNif', () => {
  it('checks a contact with a NIF', () => {
    expect(shouldCheckNif({ nif: 'B12345678' })).toBe(true)
  })
  it('never checks a delivery point', () => {
    expect(shouldCheckNif({ nif: 'B12345678', owner: 7 })).toBe(false)
    expect(shouldCheckNif({ nif: 'B12345678', owner: { id: 7 } })).toBe(false)
  })
  it('does not check an empty or too short NIF', () => {
    expect(shouldCheckNif({ nif: '' })).toBe(false)
    expect(shouldCheckNif({ nif: '1-2' })).toBe(false)
  })
})

describe('nifWarningText', () => {
  it('says nothing without matches', () => {
    expect(nifWarningText([])).toBe('')
  })
  it('counts the other contacts', () => {
    expect(nifWarningText([{ id: 1 }])).toBe('Ja hi ha un altre contacte amb aquest NIF:')
    expect(nifWarningText([{ id: 1 }, { id: 2 }])).toBe('Ja hi ha 2 contactes més amb aquest NIF:')
  })
})

describe('makeNifCheck', () => {
  it('asks for the NIF and leaves the contact being edited out', async () => {
    const get = vi.fn().mockResolvedValue({ data: [{ id: 3, name: 'Coop' }] })
    const check = makeNifCheck(get)
    expect(await check({ id: 5, nif: 'B 12345678' })).toEqual([{ id: 3, name: 'Coop' }])
    expect(get).toHaveBeenCalledWith('contacts/nif-matches?nif=B+12345678&exclude=5')
  })

  it('does not call the backend for a delivery point', async () => {
    const get = vi.fn()
    expect(await makeNifCheck(get)({ nif: 'B12345678', owner: 2 })).toEqual([])
    expect(get).not.toHaveBeenCalled()
  })

  it('drops an answer that arrives after a newer call', async () => {
    let resolveFirst
    const get = vi.fn()
      .mockImplementationOnce(() => new Promise(r => { resolveFirst = r }))
      .mockResolvedValueOnce({ data: [] })
    const check = makeNifCheck(get)
    const first = check({ nif: 'B1234567' })
    const second = await check({ nif: 'B12345678' })
    resolveFirst({ data: [{ id: 1 }] })
    expect(await first).toBeNull()
    expect(second).toEqual([])
  })

  it('warns of nothing when the call fails', async () => {
    const get = vi.fn().mockRejectedValue(new Error('403'))
    expect(await makeNifCheck(get)({ nif: 'B12345678' })).toEqual([])
  })
})
