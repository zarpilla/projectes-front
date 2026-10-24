// issues/327: the same GET went out again less than 3 s after the first one
// (users/me, me, users, daily-dedications, workday-logs, admin-entities…), and
// users/me and me were read by App.vue and again by the page. Identical GETs on
// their way now share one request; users/me and me are read once per page load.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import service from '@/service/index'
import { clearSession } from '@/service/auth'

let mock

const b64 = obj => btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const jwtFor = (userId, n = 1) => `${b64({ alg: 'HS256' })}.${b64({ userId: String(userId), sessionId: `s${n}`, type: 'access' })}.sig`

// answers when the test says so
function held () {
  const waiting = []
  return {
    reply: () => new Promise(resolve => waiting.push(resolve)),
    answer: body => waiting.splice(0).forEach(resolve => resolve([200, body]))
  }
}

const urls = () => mock.history.get.map(r => r.url)
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  mock = new MockAdapter(axios)
  clearSession()
  localStorage.setItem('jwt', jwtFor(1))
  localStorage.setItem('user', '{"id":1}')
})
afterEach(() => mock.restore())

describe('identical GETs on their way share one request (issues/327)', () => {
  it('asks once and gives every caller its own copy', async () => {
    const answer = held()
    mock.onGet(/workday-logs/).reply(answer.reply)
    const a = service({ requiresAuth: true }).get('workday-logs?_limit=-1')
    const b = service({ requiresAuth: true }).get('workday-logs?_limit=-1')
    await tick()
    answer.answer({ data: [{ id: 1 }], meta: {} })
    const [ra, rb] = await Promise.all([a, b])
    expect(urls()).toEqual(['api/workday-logs?_limit=-1'])
    expect(ra.data).toEqual([{ id: 1 }])
    expect(rb.data).toEqual([{ id: 1 }])
    ra.data.push({ id: 2 })
    expect(rb.data).toEqual([{ id: 1 }])
  })

  it('asks again once the first answer has arrived', async () => {
    mock.onGet(/.*/).reply(200, { data: [], meta: {} })
    await service({ requiresAuth: true }).get('daily-dedications?_limit=-1')
    await service({ requiresAuth: true }).get('daily-dedications?_limit=-1')
    expect(urls()).toHaveLength(2)
  })

  it('a GET asked after a write does not join one asked before it', async () => {
    const answer = held()
    mock.onGet(/users/).reply(answer.reply)
    mock.onPut(/.*/).reply(200, {})
    const before = service({ requiresAuth: true }).get('users')
    await service({ requiresAuth: true }).put('workday-logs/3', { hour_in: '09:00' })
    const after = service({ requiresAuth: true }).get('users')
    await tick()
    answer.answer([{ id: 1 }])
    await Promise.all([before, after])
    expect(urls()).toEqual(['api/users', 'api/users'])
  })

  it('never shares between two people', async () => {
    const answer = held()
    mock.onGet(/.*/).reply(answer.reply)
    const a = service({ requiresAuth: true }).get('users')
    await tick()
    localStorage.setItem('jwt', jwtFor(2))
    const b = service({ requiresAuth: true }).get('users')
    const c = service().get('users')
    await tick()
    answer.answer([])
    await Promise.all([a, b, c])
    expect(mock.history.get.map(r => r.headers.Authorization)).toEqual([
      `Bearer ${jwtFor(1)}`, `Bearer ${jwtFor(2)}`, undefined
    ])
  })

  it('shares a failure, and asks again afterwards', async () => {
    mock.onGet(/.*/).replyOnce(500, {}).onGet(/.*/).reply(200, [])
    const results = await Promise.allSettled([
      service({ requiresAuth: true }).get('user-festives?_limit=-1'),
      service({ requiresAuth: true }).get('user-festives?_limit=-1')
    ])
    expect(results.map(r => r.status)).toEqual(['rejected', 'rejected'])
    await service({ requiresAuth: true }).get('user-festives?_limit=-1')
    expect(urls()).toHaveLength(2)
  })

  it('leaves calls with options alone (params, blobs…)', async () => {
    mock.onGet(/.*/).reply(200, [])
    await Promise.all([
      service({ requiresAuth: true }).get('orders/pdf', { responseType: 'blob' }),
      service({ requiresAuth: true }).get('orders/pdf', { responseType: 'blob' })
    ])
    expect(urls()).toHaveLength(2)
  })
})

describe('users/me and me are read once per page load (issues/327)', () => {
  it('App.vue and the page ask users/me and me once, however they write the URL', async () => {
    mock.onGet(/users\/me/).reply(200, { id: 1, username: 'jordi', permissions: [] })
    mock.onGet(/api\/me$/).reply(200, { data: { name: 'Coop' }, meta: {} })
    await Promise.all([
      service({ requiresAuth: true }).get('users/me'),
      service({ requiresAuth: true }).get('/users/me'),
      service({ requiresAuth: true }).get('me'),
      service({ requiresAuth: true, cached: true }).get('/me')
    ])
    const again = await service({ requiresAuth: true }).get('users/me')
    const entity = await service({ requiresAuth: true }).get('/me')
    expect(urls()).toEqual(['api/users/me', 'api/me'])
    expect(again.data.username).toBe('jordi')
    expect(entity.data).toEqual({ name: 'Coop' })
  })

  it('a refreshed token of the same person keeps them', async () => {
    mock.onGet(/.*/).reply(200, { id: 1, username: 'jordi' })
    await service({ requiresAuth: true }).get('users/me')
    localStorage.setItem('jwt', jwtFor(1, 2))
    await service({ requiresAuth: true }).get('users/me')
    expect(urls()).toHaveLength(1)
  })

  it('another person asks again', async () => {
    mock.onGet(/.*/).reply(200, { id: 1, username: 'jordi' })
    await service({ requiresAuth: true }).get('users/me')
    localStorage.setItem('jwt', jwtFor(2))
    await service({ requiresAuth: true }).get('users/me')
    expect(urls()).toHaveLength(2)
  })

  it('a write to the user or the entity reads them again', async () => {
    mock.onGet(/.*/).reply(200, {})
    mock.onPut(/.*/).reply(200, {})
    await service({ requiresAuth: true }).get('users/me')
    await service({ requiresAuth: true }).get('me')
    await service({ requiresAuth: true }).put('/me', { name: 'X' })
    await service({ requiresAuth: true }).put('users/1', { fullname: 'Y' })
    await service({ requiresAuth: true }).get('users/me')
    await service({ requiresAuth: true }).get('me')
    expect(urls()).toEqual(['api/users/me', 'api/me', 'api/users/me', 'api/me'])
  })

  it('{ reload: true } asks again and keeps the new answer (App.vue focus refresh)', async () => {
    mock.onGet(/.*/).replyOnce(200, { permissions: [] }).onGet(/.*/).reply(200, { permissions: [{ permission: 'orders' }] })
    await service({ requiresAuth: true }).get('users/me')
    const fresh = await service({ requiresAuth: true }).get('users/me', { reload: true })
    const later = await service({ requiresAuth: true }).get('users/me')
    expect(urls()).toHaveLength(2)
    expect(fresh.data.permissions).toEqual([{ permission: 'orders' }])
    expect(later.data.permissions).toEqual([{ permission: 'orders' }])
  })

  it('other users/... reads are not kept', async () => {
    mock.onGet(/.*/).reply(200, {})
    await service({ requiresAuth: true }).get('users/me/home')
    await service({ requiresAuth: true }).get('users/me/home')
    await service({ requiresAuth: true }).get('me/dir3/search/nif/B1')
    await service({ requiresAuth: true }).get('me/dir3/search/nif/B1')
    expect(urls()).toHaveLength(4)
  })
})
