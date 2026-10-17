// issues/076: pivot totals showed «15848.300000000001 h» / «15,848.30». The
// Catalan culture is set (kendoCulture), and every measure the pivots show
// (also the ones a user can add) needs a number format so it is used;
// counts are whole numbers.
import { describe, it, expect } from 'vitest'

const configs = import.meta.glob('@/service/configStats*.js', { eager: true })

describe('pivot measure formats (issues/076)', () => {
  for (const [file, mod] of Object.entries(configs)) {
    it(file.split('/').pop(), () => {
      const { dataSource } = mod.default
      const measures = dataSource.schema.cube.measures
      // any measure can be added from «Configura la taula dinàmica»
      const missing = Object.keys(measures)
        .filter(name => measures[name].field !== 'count' && !measures[name].format)
      expect(missing).toEqual([])
    })
  }
})
