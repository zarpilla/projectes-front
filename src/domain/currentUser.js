import { useMainStore } from '@/stores/main.js'

// The logged-in person, for the screens that preselect them (Hores, Registre
// jornades, Persones…). Those matched `userName` from the store, which is still
// null while App.vue waits for /users/me after a reload, so the Persona filter
// started empty (or the match threw); hidden people were never found either
// (issues/061). The id is read from the store or, until it is set, from the
// session saved at login.
export function currentUserId () {
  const store = useMainStore()
  if (store.user && store.user.id) return store.user.id
  try {
    const saved = JSON.parse(localStorage.getItem('user') || 'null')
    return saved && saved.id ? saved.id : null
  } catch {
    return null
  }
}

/** The current person in a list of users (hidden ones too), or undefined. */
export function findCurrentUser (users) {
  const id = currentUserId()
  return id ? (users || []).find(u => u.id === id) : undefined
}
