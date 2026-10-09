// issues/010: our SCSS (src/scss and the components' <style lang="scss">) must
// compile without Dart Sass deprecation warnings (@import, global built-ins...).
// Deprecations inside Bulma/Buefy are silenced by the Vite options (quietDeps).
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import * as sass from 'sass'
import { parse } from '@vue/compiler-sfc'

// vitest runs from the project root
const root = process.cwd()
// same as css.preprocessorOptions.scss in vite.config.js
const scssOptions = { quietDeps: true }

function compileWarnings (compile) {
  const warnings = []
  compile({
    ...scssOptions,
    // report every warning, not just the first few of each kind
    verbose: true,
    loadPaths: [join(root, 'node_modules')],
    logger: {
      warn (message, { deprecation, deprecationType, span }) {
        if (deprecation) {
          const where = span ? `${relative(root, fileURLToPath(span.url))}:${span.start.line + 1}` : ''
          warnings.push(`[${deprecationType?.id}] ${where} ${message.split('\n')[0]}`)
        }
      }
    }
  })
  return warnings
}

function vueFiles (dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return vueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}

describe('Sass deprecations (issues/010)', () => {
  it('src/scss/main.scss compiles without deprecation warnings', () => {
    const file = join(root, 'src/scss/main.scss')
    expect(compileWarnings(options => sass.compile(file, options))).toEqual([])
  })

  it('the components\' <style lang="scss"> blocks compile without deprecation warnings', () => {
    const warnings = vueFiles(join(root, 'src')).flatMap(file => {
      const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
      return descriptor.styles
        .filter(style => style.lang === 'scss')
        .flatMap(style => compileWarnings(options =>
          sass.compileString(style.content, { ...options, url: pathToFileURL(file) })))
    })
    expect(warnings).toEqual([])
  })
})
