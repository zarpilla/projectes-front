/* After a deploy, a tab still running the old build asks for chunks that no
 * longer exist: reload to pick up the new build instead of failing silently.
 * At most once every 10 s, so a chunk that is really missing can't loop. */
const KEY = 'chunk_reload_at'
const MIN_INTERVAL = 10000

export function reloadOnChunkError (event, { storage = window.sessionStorage, reload = () => window.location.reload(), now = Date.now() } = {}) {
  let last = 0
  try { last = Number(storage.getItem(KEY)) || 0 } catch (e) {}
  if (now - last < MIN_INTERVAL) return false
  try { storage.setItem(KEY, String(now)) } catch (e) {}
  event.preventDefault()
  reload()
  return true
}

export function installChunkReload () {
  window.addEventListener('vite:preloadError', event => reloadOnChunkError(event))
}
