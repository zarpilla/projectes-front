import axios from 'axios'
import getConfig from '@/config'

// Strapi v5 runs users-permissions with `jwtManagement: 'refresh'`: the access
// JWT lives ~10 minutes and is renewed with POST /api/auth/refresh, which reads
// the refresh token from the httpOnly `strapi_up_refresh` cookie and rotates it.
//
// The access JWT stays in localStorage so every tab shares it. Refreshing is
// serialised across tabs (Web Locks) because the refresh token is single-use:
// two tabs rotating the same cookie at once would invalidate one another.

const LOCK_NAME = 'projectes-jwt-refresh'

let pending = null

function apiUrl (path) {
  const base = getConfig().VUE_APP_API_URL || 'http://localhost:1337'
  return `${base.replace(/\/+$/, '')}/api/${path}`
}

async function rotate (staleJwt) {
  const current = localStorage.getItem('jwt')
  // Logged out meanwhile (here or in another tab): don't resurrect the session.
  if (!current) {
    throw new Error('Not logged in')
  }
  // Another tab already refreshed while we waited for the lock.
  if (current !== staleJwt) {
    return current
  }
  const response = await axios.post(apiUrl('auth/refresh'), {}, { withCredentials: true })
  const jwt = response.data && response.data.jwt
  if (!jwt) {
    throw new Error('Refresh returned no jwt')
  }
  localStorage.setItem('jwt', jwt)
  return jwt
}

/**
 * Get a fresh access JWT after `staleJwt` was rejected. Concurrent callers in
 * this tab share one request; other tabs wait on the lock and reuse the result.
 */
export function refreshJwt (staleJwt) {
  if (!pending) {
    const run = () => rotate(staleJwt)
    const locked = typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request(LOCK_NAME, run)
      : run()
    pending = locked.finally(() => { pending = null })
  }
  return pending
}

export function clearSession () {
  localStorage.removeItem('user')
  localStorage.removeItem('jwt')
}

/** Revoke the server session (best effort) and forget the local one. */
export async function logout () {
  const post = jwt => axios.post(apiUrl('auth/logout'), {}, {
    withCredentials: true,
    headers: { Authorization: `Bearer ${jwt}` }
  })
  const jwt = localStorage.getItem('jwt')
  try {
    if (jwt) {
      try {
        await post(jwt)
      } catch (error) {
        if (!error.response || error.response.status !== 401) throw error
        await post(await refreshJwt(jwt))
      }
    }
  } catch (error) {
    console.warn('Logout could not revoke the server session', error)
  }
  clearSession()
}
