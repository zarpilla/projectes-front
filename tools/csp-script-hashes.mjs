// Prints the CSP hashes ('sha256-…') of the inline <script>s of the built
// index.html, for the Content-Security-Policy of nginx-security-headers.conf
// (issues/380). Run by the Dockerfile after `npm run build`, so the hashes always
// match the scripts that are served: editing them in index.html needs nothing else.
//
//   node tools/csp-script-hashes.mjs dist/index.html
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export function inlineScriptHashes (html) {
  const hashes = []
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(attrs) || !body.trim()) continue
    hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`)
  }
  return hashes
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2] || 'dist/index.html'
  const hashes = inlineScriptHashes(readFileSync(file, 'utf8'))
  if (!hashes.length) {
    console.error(`no inline <script> in ${file}`)
  }
  process.stdout.write(hashes.join(' ') + '\n')
}
