// The supporters' logos («Amb el suport de») shown on the login page and under
// the side menu, kept at Administració › Logos (issues/159). A logo is never
// removed: trashing it hides it, and it can be brought back.

const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.id - b.id

/** All the logos, by their order. */
export const sortLogos = logos => [...(logos || [])].sort(byOrder)

/** The logos shown: not trashed, by their order. */
export const shownLogos = logos => sortLogos((logos || []).filter(l => !l.trashed))

/** The order of a logo added at the end. */
export const nextLogoOrder = logos =>
  (logos || []).filter(l => !l.trashed).reduce((max, l) => Math.max(max, Number(l.order) || 0), 0) + 10

/**
 * Moves a shown logo one place up (delta -1) or down (+1). The shown logos are
 * numbered again 10, 20, 30…; returns only the [{ id, order }] that change.
 */
export function moveLogo (logos, id, delta) {
  const list = shownLogos(logos)
  const from = list.findIndex(l => l.id === id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= list.length) return []
  const [moved] = list.splice(from, 1)
  list.splice(to, 0, moved)
  return list
    .map((l, i) => ({ id: l.id, order: (i + 1) * 10, before: l.order }))
    .filter(l => Number(l.before) !== l.order)
    .map(({ id, order }) => ({ id, order }))
}

/** The logos as the login page and the menu draw them: image src and link. */
export const logosForDisplay = (logos, apiUrl) =>
  shownLogos(logos).map(logo => ({
    ...logo,
    src: logo.logo && logo.logo.url ? (/^https?:/.test(logo.logo.url) ? '' : apiUrl || '') + logo.logo.url : '',
    href: (logo.url || '').trim() || null
  })).filter(logo => logo.src)
