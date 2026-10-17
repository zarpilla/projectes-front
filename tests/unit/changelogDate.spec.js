// issues/112: the profile's «Novetats» printed the changelog date as
// «2026/10/20» instead of «20/10/2026».
import { describe, it, expect } from 'vitest'
import { changelogDate } from '@/service/changelog'
import Profile from '@/views/Profile.vue'

describe('changelog date (issues/112)', () => {
  it('reads DD/MM/YYYY', () => {
    expect(changelogDate('2026.10.20')).toBe('20/10/2026')
  })
  it('is what the profile uses', () => {
    expect(Profile.methods.changelogDate).toBe(changelogDate)
  })
})
