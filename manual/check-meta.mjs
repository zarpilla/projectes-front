// Checks the metadata block at the top of every manual chapter against manual/manual.json.
// Usage (from the repo root): node manual/check-meta.mjs
// The block is a YAML subset: one `key: value` per line, values are "strings" (double quotes),
// plain words, integers, dates or inline [lists]. Keep it that way so any YAML parser reads it too.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const index = JSON.parse(readFileSync(join(here, 'manual.json'), 'utf8'))
const roles = new Set(index.roles.map(r => r.id))

const REQUIRED = ['title', 'description', 'product', 'manual', 'module', 'order', 'roles', 'routes', 'lang', 'updated']

function parseValue (raw) {
  if (raw.startsWith('"')) return JSON.parse(raw)
  if (raw.startsWith('[')) {
    const inner = raw.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(/,\s*/).map(parseValue)
  }
  if (/^\d+$/.test(raw)) return Number(raw)
  return raw
}

function parseMeta (text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) return null
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/)
    if (!kv) throw new Error(`bad line: ${line}`)
    meta[kv[1]] = parseValue(kv[2].trim())
  }
  return meta
}

const errors = []
const seen = new Map()
for (const lang of readdirSync(here).filter(d => /^[a-z]{2}$/.test(d))) {
  for (const file of readdirSync(join(here, lang)).filter(f => /^\d\d-.*\.md$/.test(f)).sort()) {
    const where = `${lang}/${file}`
    const err = msg => errors.push(`${where}: ${msg}`)
    let meta
    try {
      meta = parseMeta(readFileSync(join(here, lang, file), 'utf8'))
    } catch (e) {
      err(e.message)
      continue
    }
    if (!meta) { err('no metadata block'); continue }
    for (const key of REQUIRED) if (!(key in meta)) err(`missing ${key}`)
    for (const key of Object.keys(meta)) if (!REQUIRED.includes(key)) err(`unknown key ${key}`)
    if (meta.product !== index.product.id) err(`product ${meta.product}`)
    const manual = index.manuals.find(x => x.id === meta.manual)
    if (!manual) { err(`unknown manual ${meta.manual}`); continue }
    if (!manual.modules.some(x => x.id === meta.module)) err(`unknown module ${meta.module}`)
    if (!manual.langs.includes(meta.lang) || meta.lang !== lang) err(`lang ${meta.lang}`)
    if (!Number.isInteger(meta.order)) err('order must be an integer')
    if (!Array.isArray(meta.roles)) err('roles must be a list')
    else for (const r of meta.roles) if (!roles.has(r)) err(`unknown role ${r}`)
    if (!Array.isArray(meta.routes)) err('routes must be a list')
    else for (const r of meta.routes) if (typeof r !== 'string' || !r.startsWith('/')) err(`bad route ${r}`)
    if (typeof meta.title !== 'string' || !meta.title) err('title must be a quoted string')
    if (typeof meta.description !== 'string' || !meta.description) err('description must be a quoted string')
    if (!/^\d{4}-\d\d-\d\d$/.test(String(meta.updated))) err('updated must be YYYY-MM-DD')
    const key = `${meta.manual}/${lang}/${meta.order}`
    if (seen.has(key)) err(`same order as ${seen.get(key)}`)
    seen.set(key, where)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`ok: ${seen.size} chapters`)
