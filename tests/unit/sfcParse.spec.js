// A broken template (e.g. a stray closing tag left by an edit) only showed up as Vite's
// error overlay when someone opened the page: Taules auxiliars on 2026-10-17. Every
// component must parse, template included.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parse, compileTemplate } from '@vue/compiler-sfc'

const src = path.resolve(process.cwd(), 'src')
const vueFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? vueFiles(path.join(dir, e.name)) : e.name.endsWith('.vue') ? [path.join(dir, e.name)] : [])

describe('single-file components', () => {
  it('all parse without errors', () => {
    const broken = []
    for (const file of vueFiles(src)) {
      const { descriptor, errors } = parse(fs.readFileSync(file, 'utf8'), { filename: file })
      const templateErrors = descriptor.template
        ? compileTemplate({ source: descriptor.template.content, filename: file, id: 'x' }).errors
        : []
      const all = [...errors, ...templateErrors]
      if (all.length) broken.push(`${path.relative(src, file)}: ${all[0].message || all[0]}`)
    }
    expect(broken).toEqual([])
  })
})
