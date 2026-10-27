// Route closures with a reason and a substitute route (issues/354, 355). The
// office closes a route on a day by hand («Rutes i dies»; a holiday doesn't
// close anything by itself), says why and, when the route runs another day
// instead, on which route and day («DJ - Alt Empordà / Festiu 23 octubre» on
// the 22nd). The members can send orders to that substitute route, for the
// towns of the closed route, only on its day and from SUBSTITUTE_DAYS_BEFORE
// days before; the office at any time. The members' «Avisos» page shows the
// closures with their reason and substitute, and the coming holidays.
import moment from "moment";

export const SUBSTITUTE_DAYS_BEFORE = 10;

const idOf = value => (value && typeof value === "object" ? value.id : value);
const ymd = value => {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return moment(value).format("YYYY-MM-DD");
};

/** The closure's substitute, or null: { route, date } (date YYYY-MM-DD). */
export const substituteOf = closure => {
  if (!closure || !closure.substitute_route || !closure.substitute_date) return null;
  return { route: closure.substitute_route, date: ymd(closure.substitute_date) };
};

/** Whether the substitute can be chosen today (members: from N days before). */
export const substituteOpen = (date, today = moment(), { exempt = false } = {}) => {
  const day = moment(ymd(date), "YYYY-MM-DD");
  const now = moment(today).startOf("day");
  if (day.isBefore(now, "day")) return false;
  return exempt || !now.isBefore(day.clone().subtract(SUBSTITUTE_DAYS_BEFORE, "days"), "day");
};

/**
 * The substitute routes a town can send orders to now: those of the closures
 * of a route that goes through the town. Each is the substitute route object
 * with `substitute: { date, closedRoute, closedDate, reason }`. A route the
 * town already has (`known` ids) isn't repeated.
 */
export const townSubstitutes = ({ cityId, cityRoutes, closures, today = moment(), exempt = false, known = [] }) => {
  if (!cityId) return [];
  const townRoutes = new Set(
    (cityRoutes || []).filter(cr => cr && cr.city && cr.route && idOf(cr.city) === cityId).map(cr => idOf(cr.route))
  );
  const seen = new Set(known);
  const out = [];
  for (const c of closures || []) {
    const sub = substituteOf(c);
    if (!sub || !townRoutes.has(idOf(c.route))) continue;
    if (!substituteOpen(sub.date, today, { exempt })) continue;
    const key = `${idOf(sub.route)}|${sub.date}`;
    if (seen.has(idOf(sub.route)) || seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...sub.route,
      substitute: { date: sub.date, closedRoute: c.route, closedDate: ymd(c.date), reason: c.reason || "" }
    });
  }
  return out.sort((a, b) => a.substitute.date.localeCompare(b.substitute.date));
};

/** Whether `route` is a substitute route on `date` (its date is valid then). */
export const isSubstituteDay = (route, date, closures) => {
  const day = ymd(date);
  return (closures || []).some(c => {
    const sub = substituteOf(c);
    return sub && idOf(sub.route) === idOf(route) && sub.date === day;
  });
};

/** The closure of `route` on the days from today to `until` that has a reason or a substitute. */
export const closureNotice = (route, closures, { from = moment(), until } = {}) => {
  const start = moment(from).format("YYYY-MM-DD");
  const end = until ? ymd(until) : null;
  return (
    (closures || [])
      .filter(c => idOf(c.route) === idOf(route) && ymd(c.date) >= start && (!end || ymd(c.date) <= end))
      .filter(c => c.reason || substituteOf(c))
      .sort((a, b) => ymd(a.date).localeCompare(ymd(b.date)))[0] || null
  );
};

const dayText = date => moment(ymd(date), "YYYY-MM-DD").locale("ca").format("dddd D/M");
const routeName = r => (r && (r.short_name || r.name)) || "";

/** «DV - Alt Empordà no passa divendres 23/10 (Festiu). La ruta alternativa és … dijous 22/10.» */
export const closureText = closure => {
  const sub = substituteOf(closure);
  let text = `${routeName(closure.route) || "Cap ruta"} no passa ${dayText(closure.date)}`;
  if (closure.reason) text += ` (${closure.reason})`;
  text += ".";
  if (sub) text += ` Ruta alternativa: ${routeName(sub.route)}, ${dayText(sub.date)}.`;
  return text;
};

/**
 * The announcements board: the coming days with a holiday or a closure, from
 * today to `days` days ahead, each { date, holiday, closures }; a closure
 * without a route closes them all.
 */
export const boardDays = ({ closures = [], holidays = [], today = moment(), days = 60 } = {}) => {
  const from = moment(today).format("YYYY-MM-DD");
  const to = moment(today).add(days, "days").format("YYYY-MM-DD");
  const map = new Map();
  const dayOf = date => {
    if (!map.has(date)) map.set(date, { date, holiday: false, closures: [] });
    return map.get(date);
  };
  for (const h of holidays) {
    const d = ymd(h && typeof h === "object" ? h.date : h);
    if (d && d >= from && d <= to) dayOf(d).holiday = true;
  }
  for (const c of closures) {
    const d = ymd(c.date);
    if (d && d >= from && d <= to) dayOf(d).closures.push(c);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
};
