// issues/380: security headers of the nginx that serves the app, and the CSP
// hashes of the inline scripts of index.html.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { inlineScriptHashes } from '../../tools/csp-script-hashes.mjs'

const read = file => readFileSync(`${process.cwd()}/${file}`, 'utf8')
const sha = body => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`

describe('CSP hashes of the inline scripts', () => {
  it('hashes the body of each inline script, not the ones with src or empty', () => {
    const html = '<head><script src="/config.js"></script>\n<script>\n  var a = 1;\n</script>' +
      '<script type="module" src="/assets/x.js"></script><script> </script><SCRIPT>b()</SCRIPT></head>'
    expect(inlineScriptHashes(html)).toEqual([sha('\n  var a = 1;\n'), sha('b()')])
  })

  it('finds the two inline scripts of index.html (cache buster, theme)', () => {
    expect(inlineScriptHashes(read('index.html'))).toHaveLength(2)
  })
})

describe('nginx security headers', () => {
  const conf = read('nginx.conf.template')
  const headers = read('nginx-security-headers.conf')
  const include = 'include /etc/nginx/snippets/security-headers.conf;'

  it('sends the headers from the server block', () => {
    const server = conf.split(/\n\s*location\b/)[0]
    expect(server).toContain(include)
  })

  // nginx drops the server's add_header in a location that has its own
  it('includes them again in every location that has its own add_header', () => {
    const locations = conf.split(/\n\s*location\b/).slice(1)
    const withHeaders = locations.filter(l => /add_header/.test(l))
    expect(withHeaders.length).toBeGreaterThan(3)
    for (const l of withHeaders) expect(l, l.split('\n')[0]).toContain(include)
  })

  it('enforces no framing, nosniff and the referrer policy', () => {
    expect(headers).toContain('add_header X-Frame-Options "DENY" always;')
    expect(headers).toContain(`add_header Content-Security-Policy "frame-ancestors 'none'" always;`)
    expect(headers).toContain('add_header X-Content-Type-Options "nosniff" always;')
    expect(headers).toContain('add_header Referrer-Policy "strict-origin-when-cross-origin" always;')
    expect(headers).toContain('add_header X-Robots-Tag "noindex, nofollow" always;')
  })

  it('has the full policy report-only, with the API and the script hashes', () => {
    const csp = headers.match(/add_header Content-Security-Policy-Report-Only "([^"]+)" always;/)[1]
    expect(csp).toContain("script-src 'self' ${CSP_SCRIPT_HASHES}")
    expect(csp).toMatch(/connect-src 'self' \$\{API_ORIGIN\}/)
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('https://fonts.googleapis.com')
    expect(csp).toContain('https://cdn.materialdesignicons.com https://cdn.jsdelivr.net')
    // the entrypoint replaces only these two
    expect(headers.match(/\$\{?[A-Za-z_]+\}?/g).filter(v => !/^\$\{(API_ORIGIN|CSP_SCRIPT_HASHES)\}$/.test(v))).toEqual([])
  })
})
