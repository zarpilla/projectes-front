// Light / dark mode. The choice is kept in this browser only (localStorage) and
// applied as <html data-theme="light|dark">, which Bulma and the --a-* tokens
// follow. "system" follows the operating system and its changes.
// index.html applies it again before the app loads, so the page never flashes.

export const THEME_KEY = 'theme'
export const THEME_CHOICES = ['light', 'dark', 'system']

const darkQuery = () => (typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null)

export const getThemeChoice = () => {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return THEME_CHOICES.includes(value) ? value : 'light'
  } catch (e) {
    return 'light'
  }
}

export const resolveTheme = (choice, systemDark) =>
  choice === 'system' ? (systemDark ? 'dark' : 'light') : (choice === 'dark' ? 'dark' : 'light')

export const currentTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

export const applyTheme = (choice = getThemeChoice()) => {
  const query = darkQuery()
  const theme = resolveTheme(choice, !!(query && query.matches))
  if (document.documentElement.dataset.theme !== theme) {
    document.documentElement.dataset.theme = theme
    // charts and other canvases read the colours when they draw
    window.dispatchEvent(new CustomEvent('themechange', { detail: theme }))
  }
  return theme
}

export const setThemeChoice = choice => {
  try {
    localStorage.setItem(THEME_KEY, choice)
  } catch (e) { /* private mode: the choice lasts until the page is reloaded */ }
  return applyTheme(choice)
}

let watching = false
export const watchSystemTheme = () => {
  const query = darkQuery()
  if (watching || !query) return
  watching = true
  query.addEventListener('change', () => applyTheme())
}
