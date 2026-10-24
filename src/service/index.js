import axios from 'axios'
import getConfig from '@/config'
import {
  mapRequest,
  wrapRequestBody,
  isEnvelope,
  addTimestampAliases,
  stripReadAliases,
  normalizeErrorBody
} from './v5-compat'
import { refreshJwt, clearSession } from './auth'
import {
  cachedGet,
  clearCache,
  forgetInFlight,
  identity,
  isCatalog,
  isSessionRead,
  keyOf,
  reloadCached,
  resourceOf,
  sharedGet
} from './cache'

export default ({ requiresAuth = false, multipart = false, cached = false } = {}) => {
  const config = getConfig()
  const options = {}
  options.baseURL = config.VUE_APP_API_URL || 'http://localhost:1337'
  // Send the httpOnly refresh cookie (set by auth/local) cross-origin in dev.
  options.withCredentials = true

  if (multipart) {
    options.headers = options.headers || {}
    options.headers['Content-Type'] = 'multipart/form-data'
  }
  const instance = axios.create(options)

  instance.interceptors.request.use(config => {
    // Read the JWT per request so a token refreshed by another call or tab is used.
    if (requiresAuth) {
      const jwt = localStorage.getItem('jwt')
      if (jwt) {
        config.headers.Authorization = `Bearer ${jwt}`
      }
    }

    // A retry after a token refresh was already mapped and wrapped.
    if (config.v5Mapped) {
      return config
    }
    config.v5Mapped = true

    // v3 → v5: move the route under /api and wrap core create/update bodies.
    // See ./v5-compat.js for the full list of differences absorbed here.
    const mapped = mapRequest(String(config.method || 'get').toLowerCase(), config.url)
    config.url = mapped.url
    config.v5Count = mapped.isCount
    config.v5Unwrap = mapped.unwrap
    // Drop the aliases the response interceptor added — v5 validates nested
    // relation payloads and rejects `created_at` inside them.
    stripReadAliases(config.data)
    if (mapped.wrapBody) {
      config.data = wrapRequestBody(config.data)
    }

    return config;
  }, error => {
    return Promise.reject(error);
  });

  instance.interceptors.response.use(response => {
    const conf = response.config || {}

    // v5 answers core find/findOne with { data, meta }. Views expect
    // `response.data` to be the array/entity itself, so unwrap and keep the
    // pagination block on `response.meta`.
    if (conf.v5Unwrap !== false && isEnvelope(response.data)) {
      response.meta = response.data.meta
      response.data = response.data.data
    }
    addTimestampAliases(response.data)

    // `<type>/count` was emulated as a 1-row read; hand back the total only.
    if (conf.v5Count) {
      response.data = (response.meta && response.meta.pagination &&
        response.meta.pagination.total) || 0
    }

    return response;
  }, async error => {
    // Access JWT expired: refresh it once and replay the request.
    const conf = error.config
    const sentAuth = conf && conf.headers && conf.headers.Authorization
    const staleJwt = sentAuth ? String(sentAuth).replace(/^Bearer /, '') : null
    if (requiresAuth && staleJwt && !conf.v5Retried &&
        error.response && error.response.status === 401) {
      let refreshed = false
      try {
        await refreshJwt(staleJwt)
        refreshed = true
      } catch (refreshError) {
        // Only a rejected refresh token ends the session; network errors don't.
        const status = refreshError.response && refreshError.response.status
        if (status === 400 || status === 401) {
          clearSession()
          location.href = getConfig().VUE_APP_PATH || '/'
        }
      }
      if (refreshed) {
        return instance.request({ ...conf, v5Retried: true })
      }
    }

    if (error.response) {
      error.response.data = normalizeErrorBody(error.response.data)
    }
    return Promise.reject({
      ...error,
      message: error.message,
      response: error.response,
      data: error.response ? error.response.data : null
    });
  });

  // GETs without options: identical ones on their way share one request, and
  // catalogs, users/me, me and `cached` calls are kept for the session. Keyed
  // per person (issues/327). `{ reload: true }` asks a kept read again.
  const get = instance.get.bind(instance)
  instance.get = (url, conf) => {
    const reload = !!(conf && conf.reload)
    if (conf && !reload) {
      return get(url, conf)
    }
    const key = keyOf(identity(requiresAuth), url)
    const load = () => sharedGet(key, () => get(url))
    if (cached || isCatalog(url) || isSessionRead(url)) {
      return reload ? reloadCached(key, url, () => get(url)) : cachedGet(key, url, load)
    }
    return load()
  }
  for (const method of ['post', 'put', 'patch', 'delete']) {
    const write = instance[method].bind(instance)
    instance[method] = async (url, ...args) => {
      forgetInFlight()
      try {
        return await write(url, ...args)
      } finally {
        forgetInFlight()
        clearCache(resourceOf(url))
      }
    }
  }

  return instance;
}
