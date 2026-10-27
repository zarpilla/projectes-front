// Where the router sends a URL: follows the redirect records (router.resolve
// doesn't) and gives the final full path.
export function redirectedTo (router, url) {
  let current = url
  for (let i = 0; i < 5; i++) {
    const route = router.resolve(current)
    const record = route.matched[route.matched.length - 1]
    if (!record || !record.redirect) return route.fullPath
    const target = typeof record.redirect === 'function' ? record.redirect(route) : record.redirect
    current = typeof target === 'string' ? target : router.resolve(target).fullPath
  }
  throw new Error(`redirect loop from ${url}`)
}
