import { chromium } from '@playwright/test'
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync('.env.smoke','utf8').split('\n').map(l=>l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2]]))
const routes = process.argv.slice(2)
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const log = []; p.on('pageerror', e => log.push('PAGEERROR ' + String(e.stack || e).split('\n').slice(0,4).join(' | ')))
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.push(m.type() + ' ' + m.text().split('\n').slice(0,3).join(' | ').slice(0, 400)) })
await p.goto('http://localhost:8080/stats/#/')
await p.locator('input[type=email]').fill(env.SMOKE_USER); await p.locator('input[type=password]').fill(env.SMOKE_PASSWORD)
await p.locator('[type=submit]').first().click(); await p.waitForFunction(() => !!localStorage.getItem('jwt')); await p.waitForTimeout(3000)
for (const r of routes) {
  log.length = 0
  await p.goto('http://localhost:8080/stats/#' + r); await p.waitForTimeout(6000)
  console.log('=== ' + r); console.log([...new Set(log)].filter(l => !l.includes('cannot be child of')).slice(0, 12).join('\n'))
}
await b.close()
