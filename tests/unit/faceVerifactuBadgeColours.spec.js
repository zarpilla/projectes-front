// FACe/VeriFactu badges: no blue (the user, 2026-10-26). «test» mode is yellow
// like ESBORRANY, «Registrada» the usual light green (is-success is-light),
// «Lliurada» solid green.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { submissionStatus } from '@/components/InvoiceSubmissionCard.vue'

const src = (name) => readFileSync(resolve(process.cwd(), 'src/components', name), 'utf8')

describe('FACe/VeriFactu badge colours', () => {
  it('Registrada is the usual light green and Lliurada solid green on the invoice card', () => {
    expect(submissionStatus('face', 'registered').tag).toBe('is-success is-light')
    expect(submissionStatus('face', 'delivered').tag).toBe('is-success')
  })

  it.each(['FaceQueueList.vue', 'VerifactuChainList.vue'])('%s shows the test mode in yellow', (name) => {
    expect(src(name)).toContain("props.row.mode === 'real' ? 'is-success' : 'is-warning'")
  })

  it('the FACe list shows Registrada in light green', () => {
    expect(src('FaceQueueList.vue')).toContain("registered: 'is-success is-light'")
    expect(src('FaceQueueList.vue')).toContain("delivered: 'is-success'")
  })

  it.each(['FaceQueueList.vue', 'VerifactuChainList.vue', 'InvoiceSubmissionCard.vue'])('%s has no blue badge', (name) => {
    expect(src(name)).not.toMatch(/is-info/)
  })
})
