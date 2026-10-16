// Light / dark mode (Perfil · Aparença): the choice lives in localStorage and is
// applied as <html data-theme>, which Bulma and the --a-* tokens follow.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { THEME_KEY, applyTheme, getThemeChoice, resolveTheme, setThemeChoice } from '@/service/theme'

const mockSystem = dark => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: dark, addEventListener: vi.fn() })
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    mockSystem(false)
  })

  it('is light until the person chooses, even on a dark system', () => {
    mockSystem(true)
    expect(getThemeChoice()).toBe('light')
    expect(applyTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('ignores an unknown stored value', () => {
    localStorage.setItem(THEME_KEY, 'sepia')
    expect(getThemeChoice()).toBe('light')
  })

  it('keeps the choice and applies it', () => {
    expect(setThemeChoice('dark')).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(getThemeChoice()).toBe('dark')
  })

  it('"system" follows the operating system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    mockSystem(true)
    expect(setThemeChoice('system')).toBe('dark')
    mockSystem(false)
    expect(applyTheme()).toBe('light')
  })

  it('tells the charts when the theme changes', () => {
    const listener = vi.fn()
    window.addEventListener('themechange', listener)
    setThemeChoice('dark')
    setThemeChoice('dark')
    setThemeChoice('light')
    window.removeEventListener('themechange', listener)
    expect(listener.mock.calls.map(c => c[0].detail)).toEqual(['dark', 'light'])
  })
})
