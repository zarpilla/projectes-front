// Found while writing the manual (2026-10): on Inici, in «Ordena els accessos»
// the arrow buttons at the bottom right of a tile covered the end of a long
// label («Previsió facturació»). While ordering, the tile keeps a strip at the
// bottom for them. jsdom has no layout, so this checks the scoped styles.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/views/Inici.vue'), 'utf8')
  .match(/<style scoped>([\s\S]*?)<\/style>/)[1]
const rule = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${escaped}\\s*\\{([^}]*)\\}`))
  return m ? m[1] : ''
}
const rem = (body, prop) => {
  const m = body.match(new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*([\\d.]+)rem`))
  return m ? Number(m[1]) : 0
}

describe('Inici, ordering the tiles', () => {
  it('reserves room under the label for the arrows', () => {
    const move = rule('.home-tile-move')
    const button = rule('.home-tile-move button')
    const arrowsTop = rem(move, 'bottom') + rem(button, 'height')
    expect(arrowsTop).toBeGreaterThan(0)
    const editing = rule('.is-editing .home-tile:not(.home-tile-add)')
    expect(rem(editing, 'padding-bottom')).toBeGreaterThanOrEqual(arrowsTop)
  })
})
