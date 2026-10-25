// The app used hash URLs until issues/158 (…/stats/#/order/view/15397). Printed
// QR labels, e-mails and bookmarks still carry them: the path after "#" is
// turned into the real path under the base before the router starts, already
// with today's Catalan names (router/paths.js, issues/343).
import { currentPath } from "./paths";

export function legacyHashTarget(location, base = "/") {
  const hash = location.hash || "";
  if (!hash.startsWith("#/")) return null;
  const root = base.endsWith("/") ? base : base + "/";
  return root + currentPath("/" + hash.slice(2)).slice(1);
}

export function redirectLegacyHash(base) {
  if (typeof window === "undefined") return;
  const target = legacyHashTarget(window.location, base);
  if (target) window.history.replaceState(null, "", target);
}
