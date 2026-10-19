// Overlapping loads (issues/219): a screen that reloads on every filter change
// can have two loads running at once when the filters change quickly, and the
// older one may finish last. Each load asks for a token; once a newer load has
// started for the same owner (usually the component), the older one is stale
// and must not write anything.

const latest = new WeakMap()

/**
 * Starts a load for `owner` and returns `isStale()`, true as soon as a newer
 * load has started for the same owner.
 */
export function startLoad (owner) {
  const token = (latest.get(owner) || 0) + 1
  latest.set(owner, token)
  return () => latest.get(owner) !== token
}
