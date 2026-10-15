// issues/049 — template listeners that name a method the component doesn't have.
// Vue 3 compiles `@event="name"` to `_ctx.name && _ctx.name(...)`, so a missing
// method fails silently: "Cancel·lar" in "Nova Dieta" did nothing (issues/048),
// picking a ticket in the invoicing modal didn't clear the other expense fields.
// Every bare `@event="name"` must be a method of the component or of one of its
// mixins.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'

// Known, waiting for a decision (see the issue). Remove the entry once it's settled.
const KNOWN = {
  'components/PrevisioTable.vue': ['payVat'] // issues/049: the IVA card never loads `vat`
}

const src = path.resolve('src')
const read = f => fs.readFileSync(f, 'utf8')
const defines = (script, name) => new RegExp(`(^|[\\s,{])(async\\s+)?${name}\\s*(\\(|:)`, 'm').test(script)

function mixinSources (script) {
  return [...script.matchAll(/import\s+\w+\s+from\s+['"]@\/(mixins\/[^'"]+)['"]/g)]
    .map(([, p]) => path.join(src, p.endsWith('.js') ? p : `${p}.js`))
    .filter(f => fs.existsSync(f))
    .map(read)
}

function missingHandlers (file) {
  const { descriptor } = parse(read(file))
  if (!descriptor.template || !(descriptor.script || descriptor.scriptSetup)) return []
  const template = descriptor.template.content.replace(/<!--[\s\S]*?-->/g, '')
  const scripts = [(descriptor.script || descriptor.scriptSetup).content, ...mixinSources((descriptor.script || descriptor.scriptSetup).content)]
  const names = new Set([...template.matchAll(/(?:@|v-on:)[\w:.-]+="\s*([A-Za-z_$][\w$]*)\s*"/g)].map(m => m[1]))
  return [...names].filter(n => !scripts.some(s => defines(s, n)))
}

describe('template event handlers', () => {
  it('name methods that exist', () => {
    const files = fs.readdirSync(src, { recursive: true }).filter(f => f.endsWith('.vue'))
    const missing = {}
    for (const f of files) {
      const names = missingHandlers(path.join(src, f)).filter(n => !(KNOWN[f] || []).includes(n))
      if (names.length) missing[f] = names
    }
    expect(missing).toEqual({})
  })
})
