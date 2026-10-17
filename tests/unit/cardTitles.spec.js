// issues/114 (review): the project's cards were titled in capitals («DADES BÀSIQUES
// PROJECTE»), and eleven components set `.card-header-title { text-transform:
// capitalize }` in unscoped styles, so after visiting one of them every card title
// of the app became «Fases I Pressupost Original».
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const src = path.resolve(process.cwd(), 'src')
const vueFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? vueFiles(path.join(dir, e.name)) : e.name.endsWith('.vue') ? [path.join(dir, e.name)] : [])

describe('card titles', () => {
  it('no component changes the case of every card title', () => {
    const offenders = vueFiles(src).filter(f => {
      const unscoped = [...fs.readFileSync(f, 'utf8').matchAll(/<style(?![^>]*scoped)[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n')
      return /\.card-header-title\s*\{[^}]*text-transform/.test(unscoped)
    })
    expect(offenders.map(f => path.relative(src, f))).toEqual([])
  })

  it('the project form titles its cards in sentence case', () => {
    const source = fs.readFileSync(path.join(src, 'views/ProjectForm.vue'), 'utf8')
    const titles = [...source.matchAll(/\btitle="([^"]+)"/g)].map(m => m[1])
    expect(titles.filter(t => /[A-ZÀÈÉÍÒÓÚÇ]{4,}/.test(t) && t === t.toUpperCase())).toEqual([])
  })
})
