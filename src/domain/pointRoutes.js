// The routes of a delivery point (issues/351, La Diligència). A point takes
// the routes of its town («Poblacions i rutes»), and the office changes that
// for one point (point-route rows, «Rutes del punt» in the point's form):
//   - an extraordinary route (`extra`): it doesn't go to the town but stops at
//     this point, with its own time slot there if given;
//   - a cancelled route (`cancelled`): a route of the town not offered there;
//   - the main route (`main`, one at most): listed first and preselected.
// The backend's copy is projectes-v5 src/services/point-routes.js, which
// refuses a member's order on any other route.

const idOf = value => (value && typeof value === "object" ? value.id : value || null);

/** The point-route rows of a point, from the list of all of them. */
export const rowsOfPoint = (rows, pointId) => (rows || []).filter(r => r && idOf(r.contact) === pointId);

/**
 * The routes a point is offered, in order: the main one first, then the
 * town's, then the extraordinary ones (in the routes' order).
 * `townRoutes`: the town's active routes; `rows`: the point's rows;
 * `allRoutes`: every route. → [{ route, extra, main, row }]
 */
export const effectiveRoutes = ({ townRoutes = [], rows = [], allRoutes = [] }) => {
  const rowOf = new Map();
  for (const row of rows || []) {
    const id = idOf(row && row.route);
    if (id) rowOf.set(id, row);
  }
  const cancelled = id => Boolean(rowOf.get(id) && rowOf.get(id).cancelled);
  const list = [];
  const seen = new Set();
  for (const route of townRoutes || []) {
    if (!route || seen.has(route.id) || cancelled(route.id)) continue;
    seen.add(route.id);
    list.push({ route, extra: false });
  }
  for (const route of allRoutes || []) {
    const row = route && rowOf.get(route.id);
    if (!row || !row.extra || row.cancelled || seen.has(route.id) || route.active === false) continue;
    seen.add(route.id);
    list.push({ route, extra: true });
  }
  const result = list.map(item => {
    const row = rowOf.get(item.route.id) || null;
    return { ...item, main: Boolean(row && row.main), row };
  });
  const main = result.findIndex(r => r.main);
  if (main > 0) result.unshift(...result.splice(main, 1));
  return result;
};

/** The route of an extraordinary setting with its own time slot, as a town-route link (for slotOf). */
export const extraSlotLink = item =>
  item && item.extra && item.row && item.row.time_from
    ? {
        time_from: item.row.time_from,
        time_to: item.row.time_to,
        time_from_2: item.row.time_from_2,
        time_to_2: item.row.time_to_2
      }
    : null;

/** Whether a point has any route setting (the Punts d'entrega mark and filter). */
export const hasRouteSettings = (rows, pointId) => rowsOfPoint(rows, pointId).length > 0;

/** «Principal», «Extraordinària»: what the order form says next to a route. */
export const routeTags = item => [item && item.main ? "principal" : null, item && item.extra ? "extraordinària" : null].filter(Boolean);

/** A short summary of a point's settings: «Extraordinària: X · Anul·lada: Y · Principal: Z». */
export const settingsSummary = (rows, routeName) => {
  const names = filter => (rows || []).filter(filter).map(r => routeName(idOf(r.route))).filter(Boolean);
  const parts = [];
  const extra = names(r => r.extra);
  const cancelled = names(r => r.cancelled);
  const main = names(r => r.main);
  if (main.length) parts.push(`Principal: ${main.join(", ")}`);
  if (extra.length) parts.push(`Extraordinària: ${extra.join(", ")}`);
  if (cancelled.length) parts.push(`Anul·lada: ${cancelled.join(", ")}`);
  return parts.join(" · ");
};

const norm = value =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * The routes of a delivery point from the lists a screen has loaded: its
 * town (by name, as the backend matches it) from `cities` and `cityRoutes`
 * (city-routes/basic), its rows from `rows` (all point-routes).
 * → { known, routes: effectiveRoutes(…) }; `known` false when the town isn't
 * in «Poblacions» (the backend doesn't judge those).
 */
export const pointRoutesFor = ({ contact, cities = [], cityRoutes = [], rows = [], allRoutes = [] }) => {
  const cityIds = new Set((cities || []).filter(c => contact && norm(c.name) === norm(contact.city)).map(c => c.id));
  const townRoutes = [];
  for (const cr of cityRoutes || []) {
    if (!cr || !cr.route || !cityIds.has(idOf(cr.city)) || !cr.route.active) continue;
    if (!townRoutes.some(r => r.id === cr.route.id)) townRoutes.push(cr.route);
  }
  return {
    known: cityIds.size > 0,
    routes: effectiveRoutes({ townRoutes, rows: rowsOfPoint(rows, contact && contact.id), allRoutes })
  };
};

/**
 * Why a member can't send an order to `contact` on `route` on `date` (a CSV
 * row), or null: the same rule as the backend's pointRouteRefusal. A route
 * that is the substitute of a closure that day (`isSubstitute`) passes.
 */
export const pointRouteError = ({ contact, route, isSubstitute = false, ...lists }) => {
  if (!contact || !route) return null;
  const { known, routes } = pointRoutesFor({ contact, ...lists });
  if (routes.some(r => r.route.id === route.id) || isSubstitute) return null;
  const cancelled = rowsOfPoint(lists.rows, contact.id).some(r => r.cancelled && idOf(r.route) === route.id);
  if (!known && !cancelled) return null;
  return `La ruta «${route.name}» no passa pel punt d'entrega${contact.city ? ` (${contact.city})` : ""}.`;
};
