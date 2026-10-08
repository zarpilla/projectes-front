// The API layer every view goes through (src/service/index.js + auth.js).
// Written against axios 0.21 and kept unchanged across the upgrade to 1.x.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import service from '@/service/index'
import { refreshJwt, clearSession } from '@/service/auth'

const API = 'http://api.test'
let mock

beforeEach(() => {
  mock = new MockAdapter(axios)
  localStorage.clear()
  localStorage.setItem('jwt', 'jwt-1')
  localStorage.setItem('user', '{"id":1}')
})
afterEach(() => mock.restore())

const lastRequest = () => mock.history.get.concat(mock.history.post, mock.history.put, mock.history.delete)
  .sort((a, b) => (a.__order || 0) - (b.__order || 0)).pop()

describe('requests', () => {
  it('maps v3 URLs under /api on the configured backend', async () => {
    mock.onGet(`${API}/api/projects?_limit=-1`).reply(200, [])
    await service().get('projects?_limit=-1')
    expect(mock.history.get[0].baseURL).toBe(API)
    expect(mock.history.get[0].url).toBe('api/projects?_limit=-1')
  })

  it('sends the jwt only when the call requires auth, read per request', async () => {
    mock.onGet(/.*/).reply(200, [])
    await service().get('logos')
    await service({ requiresAuth: true }).get('projects')
    localStorage.setItem('jwt', 'jwt-2')
    await service({ requiresAuth: true }).get('projects')
    const auths = mock.history.get.map(r => r.headers.Authorization)
    expect(auths).toEqual([undefined, 'Bearer jwt-1', 'Bearer jwt-2'])
  })

  it('sends cookies cross-origin (refresh token)', async () => {
    mock.onGet(/.*/).reply(200, [])
    await service().get('logos')
    expect(mock.history.get[0].withCredentials).toBe(true)
  })

  it('wraps create and update bodies in { data }, not custom actions or auth', async () => {
    mock.onAny(/.*/).reply(200, { data: { id: 1 } })
    await service({ requiresAuth: true }).post('projects', { name: 'A' })
    await service({ requiresAuth: true }).put('projects/7', { name: 'B' })
    await service({ requiresAuth: true }).put('me', { options: 1 })
    await service({ requiresAuth: true }).post('projects/7/duplicate', { x: 1 })
    await service().post('auth/local', { identifier: 'a', password: 'b' })
    const bodies = [...mock.history.post, ...mock.history.put].map(r => [r.url, JSON.parse(r.data)])
    expect(bodies).toEqual([
      ['api/projects', { data: { name: 'A' } }],
      ['api/projects/7/duplicate', { x: 1 }],
      ['api/auth/local', { identifier: 'a', password: 'b' }],
      ['api/projects/7', { data: { name: 'B' } }],
      ['api/me', { data: { options: 1 } }]
    ])
  })

  it('drops the read-side timestamp aliases before saving', async () => {
    mock.onPut(/.*/).reply(200, { data: {} })
    await service({ requiresAuth: true }).put('projects/7', {
      name: 'A', createdAt: 'x', created_at: 'x', leader: { id: 2, updatedAt: 'y', updated_at: 'y' }
    })
    expect(JSON.parse(mock.history.put[0].data)).toEqual({
      data: { name: 'A', createdAt: 'x', leader: { id: 2, updatedAt: 'y' } }
    })
  })

  it('sends multipart uploads with the multipart content type', async () => {
    mock.onPost(/.*/).reply(200, [])
    const body = new FormData()
    body.append('files', new Blob(['x']), 'x.txt')
    await service({ requiresAuth: true, multipart: true }).post('upload', body)
    expect(mock.history.post[0].headers['Content-Type']).toMatch(/^multipart\/form-data/)
    expect(mock.history.post[0].url).toBe('api/upload')
  })
})

describe('responses', () => {
  it('unwraps the v5 { data, meta } envelope and keeps meta', async () => {
    mock.onGet(/.*/).reply(200, { data: [{ id: 1, createdAt: '2026-10-07' }], meta: { pagination: { total: 1 } } })
    const r = await service({ requiresAuth: true }).get('projects')
    expect(r.data).toEqual([{ id: 1, createdAt: '2026-10-07', created_at: '2026-10-07' }])
    expect(r.meta).toEqual({ pagination: { total: 1 } })
    expect(r.status).toBe(200)
  })

  it('leaves auth/users payloads as they are', async () => {
    mock.onPost(/.*/).reply(200, { jwt: 'x', user: { id: 1 } })
    const r = await service().post('auth/local', {})
    expect(r.data).toEqual({ jwt: 'x', user: { id: 1 } })
  })

  it('emulates <type>/count with a one-row read and returns the total', async () => {
    mock.onGet(/.*/).reply(200, { data: [{ id: 1 }], meta: { pagination: { total: 42 } } })
    const r = await service({ requiresAuth: true }).get('projects/count?_where[x]=1&_limit=-1')
    expect(mock.history.get[0].url).toBe('api/projects?_where[x]=1&_start=0&_limit=1')
    expect(r.data).toBe(42)
  })

  it('serves cached calls from memory after the first response', async () => {
    mock.onGet(/.*/).reply(200, { data: [{ id: 1 }], meta: {} })
    const a = await service({ requiresAuth: true, cached: true }).get('years-cache-test')
    const b = await service({ requiresAuth: true, cached: true }).get('years-cache-test')
    expect(mock.history.get).toHaveLength(1)
    expect(b.data).toEqual(a.data)
  })
})

describe('errors', () => {
  it('normalizes the v5 error body to a v3-style message string', async () => {
    mock.onPost(/.*/).reply(400, { data: null, error: { status: 400, name: 'ValidationError', message: 'Invalid identifier or password' } })
    const err = await service().post('auth/local', {}).catch(e => e)
    expect(err.response.status).toBe(400)
    expect(err.response.data.message).toBe('Invalid identifier or password')
    expect(err.data.message).toBe('Invalid identifier or password')
    expect(typeof err.message).toBe('string')
  })

  it('refreshes an expired jwt once and replays the request', async () => {
    mock.onGet(`${API}/api/projects`).replyOnce(401, {}).onGet(`${API}/api/projects`).reply(200, { data: [{ id: 1 }], meta: {} })
    mock.onPost(`${API}/api/auth/refresh`).reply(200, { jwt: 'jwt-new' })
    const r = await service({ requiresAuth: true }).get('projects')
    expect(r.data).toEqual([{ id: 1 }])
    expect(localStorage.getItem('jwt')).toBe('jwt-new')
    expect(mock.history.get.map(g => [g.url, g.headers.Authorization])).toEqual([
      ['api/projects', 'Bearer jwt-1'],
      ['api/projects', 'Bearer jwt-new']
    ])
    // the replay is not mapped a second time (no api/api/...)
    expect(mock.history.post[0].withCredentials).toBe(true)
  })

  it('ends the session when the refresh token is rejected', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {}) // jsdom: navigation not implemented
    mock.onGet(/.*/).reply(401, {})
    mock.onPost(`${API}/api/auth/refresh`).reply(401, {})
    const err = await service({ requiresAuth: true }).get('projects').catch(e => e)
    expect(err.response.status).toBe(401)
    expect(localStorage.getItem('jwt')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    consoleError.mockRestore()
  })

  it('keeps the session when the refresh fails for network reasons', async () => {
    mock.onGet(/.*/).reply(401, {})
    mock.onPost(`${API}/api/auth/refresh`).networkError()
    await service({ requiresAuth: true }).get('projects').catch(e => e)
    expect(localStorage.getItem('jwt')).toBe('jwt-1')
  })
})

describe('auth', () => {
  it('shares one refresh between concurrent callers', async () => {
    mock.onPost(`${API}/api/auth/refresh`).reply(() => new Promise(resolve => setTimeout(() => resolve([200, { jwt: 'jwt-9' }]), 10)))
    const [a, b] = await Promise.all([refreshJwt('jwt-1'), refreshJwt('jwt-1')])
    expect([a, b]).toEqual(['jwt-9', 'jwt-9'])
    expect(mock.history.post).toHaveLength(1)
  })

  it('reuses a jwt another tab already refreshed', async () => {
    localStorage.setItem('jwt', 'jwt-other-tab')
    expect(await refreshJwt('jwt-1')).toBe('jwt-other-tab')
    expect(mock.history.post).toHaveLength(0)
  })

  it('clearSession forgets the user and the jwt', () => {
    clearSession()
    expect(localStorage.getItem('jwt')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})
