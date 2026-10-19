import { describe, it, expect, vi } from 'vitest'
import { reloadOnChunkError } from '@/service/chunkReload'

function memoryStorage () {
  const data = {}
  return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}

describe('reloadOnChunkError', () => {
  it('reloads and swallows the error when a chunk of an old build is missing', () => {
    const event = { preventDefault: vi.fn() }
    const reload = vi.fn()
    expect(reloadOnChunkError(event, { storage: memoryStorage(), reload, now: 100000 })).toBe(true)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload again within 10 s, so a really missing chunk cannot loop', () => {
    const storage = memoryStorage()
    const reload = vi.fn()
    reloadOnChunkError({ preventDefault () {} }, { storage, reload, now: 100000 })
    const event = { preventDefault: vi.fn() }
    expect(reloadOnChunkError(event, { storage, reload, now: 105000 })).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(reloadOnChunkError({ preventDefault () {} }, { storage, reload, now: 111000 })).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('still reloads when storage is unavailable', () => {
    const storage = { getItem () { throw new Error('blocked') }, setItem () { throw new Error('blocked') } }
    const reload = vi.fn()
    expect(reloadOnChunkError({ preventDefault () {} }, { storage, reload, now: 100000 })).toBe(true)
    expect(reload).toHaveBeenCalled()
  })
})
