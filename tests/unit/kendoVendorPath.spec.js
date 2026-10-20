// issues/248: every Kendo page (Dedicació, Projectes, Estratègies, Detall
// econòmic, Comandes, Incidències, Justificacions, IVA, Previsió, Tresoreria)
// built VUE_APP_PATH + "/vendor/…", so with base «/» it asked for
// «//vendor/kendo/kendo.all.min.js» (host «vendor») and stayed blank. 182 had
// fixed only Intercooperació.
import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { loadKendo } from '@/helpers/addScript'

const srcDir = path.join(__dirname, '../../src')
const sources = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? sources(path.join(dir, e.name)) : /\.(vue|js)$/.test(e.name) ? [path.join(dir, e.name)] : [])

describe('Kendo vendor files under the base path (issues/248)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.head.innerHTML = ''
  })

  it('loads them with one slash after base «/»', async () => {
    const urls = []
    vi.spyOn(document.head, 'appendChild').mockImplementation(el => {
      urls.push(el.src || el.href)
      setTimeout(() => el.dispatchEvent(new Event('load')))
      return el
    })
    await loadKendo('/')
    expect(urls.map(u => new URL(u).pathname)).toEqual([
      '/vendor/kendo/kendo.all.min.js',
      '/vendor/kendo/kendo.common.min.css',
      '/vendor/kendo/kendo.custom.css',
      '/vendor/kendo/custom.css'
    ])
    expect(urls.every(u => new URL(u).host === window.location.host)).toBe(true)
  })

  it('no page builds the vendor path by hand', () => {
    const offenders = sources(srcDir)
      .filter(f => !f.endsWith(path.join('helpers', 'addScript.js')))
      .filter(f => /vendor\/kendo/.test(fs.readFileSync(f, 'utf8')))
      .map(f => path.relative(srcDir, f))
    expect(offenders).toEqual([])
  })
})
