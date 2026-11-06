// issues/413: «Tresoreria › Conciliació». The screen adds up the lines picked
// by hand for a bank movement (one of them can be part of a pending
// document: a partial collection) and only lets them be accepted when they
// are the movement's amount; it labels what the backend proposed and did.
import { describe, it, expect } from 'vitest'
import { selectionTotals, acceptPayload, partialAmount, suggestionLabel, matchLabel } from '@/domain/bankReconciliation.js'

const line = (id, amount, pending = false) => ({ id, amount, pending })

describe('bank reconciliation selection (issues/413)', () => {
  const movement = { id: 1, amount: 350.5 }

  it('adds up the picked lines and says what is missing', () => {
    const picked = { a: { line: line('a', 100) }, b: { line: line('b', 200) } }
    expect(selectionTotals(movement, picked)).toEqual({ count: 2, sum: 300, missing: 50.5, ok: false })
    picked.c = { line: line('c', 50.5) }
    expect(selectionTotals(movement, picked).ok).toBe(true)
    expect(selectionTotals(movement, {}).ok).toBe(false)
  })

  it('counts the part typed for a pending document, and sends it only when it is a part', () => {
    const picked = { a: { line: line('a', 1000, true), amount: '350.5' } }
    expect(selectionTotals(movement, picked).ok).toBe(true)
    expect(acceptPayload(picked)).toEqual([{ id: 'a', amount: 350.5 }])
    expect(acceptPayload({ a: { line: line('a', 350.5, true), amount: null } })).toEqual([{ id: 'a' }])
  })

  it('proposes the movement as the part of a bigger pending document of the same sign', () => {
    expect(partialAmount(movement, line('a', 1000, true))).toBe(350.5)
    expect(partialAmount(movement, line('a', 100, true))).toBe(null)
    expect(partialAmount(movement, line('a', 1000, false))).toBe(null)
    expect(partialAmount(movement, line('a', -1000, true))).toBe(null)
  })

  it('labels suggestions and reconciled movements', () => {
    expect(suggestionLabel({ kind: 'line', auto: true, lines: [] })).toBe('Coincidència clara')
    expect(suggestionLabel({ kind: 'lines', lines: [1, 2] })).toBe("2 línies que sumen l'import")
    expect(suggestionLabel({ kind: 'partial', lines: [] })).toMatch(/parcial/)
    expect(matchLabel({ status: 'matched', match_kind: 'transfer' })).toBe('Traspàs entre comptes')
    expect(matchLabel({ status: 'matched', match_kind: 'annotation', rule: 'Comissions' })).toBe('Operació de tresoreria (regla «Comissions»)')
    expect(matchLabel({ status: 'ignored' })).toBe('Ignorat')
  })
})
