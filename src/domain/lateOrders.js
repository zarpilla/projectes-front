import moment from "moment";

// Late orders and late pickups (issues/315). The backend decides and stores
// them (projectes-v5 src/services/late-order.js, the same rules); the form
// uses this copy to warn the member before she saves.
//
// - delivery: entered at or after «Hora límit per a l'endemà» of the day before
//   (orders_options.next_day_limit_hour) → late, with a surcharge
//   (orders_options.late_surcharge %, 15 by default since issues/363);
// - farm pickup on an afternoon route («Ruta de tarda», route.afternoon,
//   issues/346): on its own day at or after
//   orders_options.pickup_same_day_limit_hour (10 by default); on any other
//   route: at or after the next-day limit of the day before, or on its own
//   day → late, no surcharge.
//
// The limits fall on working days («Dies laborables», orders_options.working_days,
// Monday to Friday by default, 2026-10-25): the deadline of day D is the
// next-day limit of the last working day before D, so Monday's is Friday's and
// a Monday order entered on the weekend is late; one for Tuesday is on time
// until Monday's limit.
//
// Route closing (issues/363): from «Hora de tancament de la ruta»
// (orders_options.route_closing_hour, 14 h) of that working day the route is
// closed for D: the member can't order for D any more and the form offers the
// next date a route of the town runs (nextOpenDelivery). Between the limit and
// the closing the order is late: flat surcharge (15 % by default) and an
// incidence the API opens. The office can still enter it, with the surcharge.
// A morning farm pickup closes at the same hour; an afternoon one never.
// The working day before skips the holidays for everyone too (Festius without
// a person): with Monday a holiday, Tuesday closes on Friday.

export const DEFAULT_NEXT_DAY_LIMIT_HOUR = 14;
export const DEFAULT_PICKUP_SAME_DAY_LIMIT_HOUR = 10;
export const DEFAULT_ROUTE_CLOSING_HOUR = 14;
export const DEFAULT_LATE_SURCHARGE = 15;
// moment's day(): 0 Sunday … 6 Saturday; the names of the route fields
export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
export const DEFAULT_WORKING_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

// The working days set, in week order; none (or nothing valid) is Monday to Friday.
export const workingDaysOf = value => {
  const given = Array.isArray(value) ? value.map(d => String(d).toLowerCase()) : [];
  const days = WEEKDAYS.filter(d => given.includes(d));
  const week = [...days.filter(d => d !== "sunday"), ...days.filter(d => d === "sunday")];
  return week.length ? week : [...DEFAULT_WORKING_DAYS];
};

// The texts the Diligència proposed; Configuració general › Logística changes
// them. {hora}: the next-day limit, {hora_tarda}: the same-day limit of the
// afternoon pickups, {recarrec}: the surcharge %.
export const DEFAULT_LATE_ORDER_MESSAGE =
  "Estàs informant tard aquesta comanda! No estàs complint el límit horari de les {hora}h del dia laborable anterior. " +
  "Això tensiona les treballadores de la Diligència, incrementa els costos de la cooperativa i multiplica el risc d'incidències. " +
  "Segur que trobaràs la manera que no et torni a passar!\n\n" +
  "Aquest cop s'aplicarà un recàrrec del {recarrec}% automàticament i coordinació mirarà d'adreçar la comanda si encara és possible";

export const DEFAULT_LATE_PICKUP_MESSAGE =
  "Aquesta comanda implica una recollida i l'estàs informant tard. No estàs complint el límit de les {hora_tarda}h del mateix dia " +
  "per les recollides de tarda i les {hora}h del dia laborable anterior per les recollides de matí. " +
  "Això tensiona les treballadores de la Diligència, incrementa els costos de la cooperativa i multiplica el risc d'incidències.\n" +
  "Segur que trobaràs la manera que no et torni a passar!";

// Joel's text (issues/363). {data}: the next date a route of the town runs,
// {ruta}: that route.
export const DEFAULT_ROUTE_CLOSED_MESSAGE =
  "A aquesta hora aquesta ruta ja és tancada. En cas que estiguis entrant una comanda per a {data} ({ruta}), " +
  "clica «Segueix» per seguir el procediment o torna enrere.";

const numberOr = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// `holidays`: the holidays for everyone, YYYY-MM-DD (never working days).
export const lateRules = (ordersOptions, { holidays = [] } = {}) => {
  const o = ordersOptions || {};
  const nextDayLimitHour = numberOr(o.next_day_limit_hour, DEFAULT_NEXT_DAY_LIMIT_HOUR);
  return {
    nextDayLimitHour,
    // never before the next-day limit: the late window is limit → closing
    routeClosingHour: Math.max(nextDayLimitHour, numberOr(o.route_closing_hour, DEFAULT_ROUTE_CLOSING_HOUR)),
    pickupSameDayLimitHour: numberOr(o.pickup_same_day_limit_hour, DEFAULT_PICKUP_SAME_DAY_LIMIT_HOUR),
    lateSurcharge: numberOr(o.late_surcharge, DEFAULT_LATE_SURCHARGE),
    workingDays: workingDaysOf(o.working_days),
    holidays: [...new Set((holidays || []).map(d => String(d).slice(0, 10)))]
  };
};

const dayOf = value => {
  if (!value) return null;
  const day = moment(value instanceof Date ? value : moment(value, ["YYYY-MM-DD", moment.ISO_8601]));
  return day.isValid() ? day.clone().startOf("day") : null;
};

// The last working day before `date`: not a day off of the week nor a holiday.
export const previousWorkingDay = (date, rules) => {
  const working = workingDaysOf(rules && rules.workingDays);
  const holidays = new Set((rules && rules.holidays) || []);
  const isOff = d => !working.includes(WEEKDAYS[d.day()]) || holidays.has(d.format("YYYY-MM-DD"));
  const previous = dayOf(date).subtract(1, "day");
  for (let i = 0; i < 60 && isOff(previous); i++) previous.subtract(1, "day");
  return previous;
};

// The moment the orders for `date` stop being on time: the next-day limit of
// the last working day before it.
export const deadlineOf = (date, rules) => previousWorkingDay(date, rules).hour(rules.nextDayLimitHour);

// The moment the routes of `date` close: the closing hour of that same day (issues/363).
export const closingOf = (date, rules) =>
  previousWorkingDay(date, rules).hour(rules.routeClosingHour ?? DEFAULT_ROUTE_CLOSING_HOUR);

// A delivery after today asked at or after its closing.
export const isClosedDelivery = (date, now, rules) => {
  const day = dayOf(date);
  if (!day) return false;
  const current = moment(now);
  if (!day.isAfter(current, "day")) return false;
  return !current.isBefore(closingOf(day, rules));
};

// A morning farm pickup asked at or after its closing, or for today; an
// afternoon one never closes.
export const isClosedPickup = (date, now, rules, { afternoon = false } = {}) => {
  if (afternoon) return false;
  const day = dayOf(date);
  if (!day) return false;
  const current = moment(now);
  if (day.isBefore(current, "day")) return false;
  if (day.isSame(current, "day")) return true;
  return !current.isBefore(closingOf(day, rules));
};

// An afternoon pickup («Ruta de tarda») asked on its own day from the
// same-day limit (10 h) on: it can only join a collection order (-R) already
// pending for that point, route and day, never create one (issues/363).
export const isAfternoonPickupCutoff = (date, now, rules) => {
  const day = dayOf(date);
  if (!day) return false;
  const current = moment(now);
  return day.isSame(current, "day") && current.hour() >= rules.pickupSameDayLimitHour;
};

const idOf = value => (value && typeof value === "object" ? value.id : value);
const ROUTE_DAY_FLAGS = WEEKDAYS;

// Whether `route` runs on `day` (a moment): one of its weekdays and not closed
// that day (a closure without a route closes them all), or the day it stands
// in for a closed route (route.substitute, routeClosures.js townSubstitutes).
const routeRunsOn = (route, day, closures) => {
  const date = day.format("YYYY-MM-DD");
  if (route.substitute) return route.substitute.date === date;
  if (!route[ROUTE_DAY_FLAGS[day.day()]]) return false;
  return !(closures || []).some(
    c => String(c.date).slice(0, 10) === date && (!c.route || idOf(c.route) === route.id)
  );
};

// The next date a route of the town runs whose closing hasn't passed
// (issues/363): `{ route, date }` (date a moment) or null. `routes` are the
// town's (with its substitutes); `prefer` the route chosen, first on a tie.
export const nextOpenDelivery = ({ routes, closures = [], rules, now = new Date(), prefer = null, days = 60 }) => {
  const list = [...(routes || [])].filter(Boolean);
  list.sort((a, b) => (a.id === prefer ? -1 : b.id === prefer ? 1 : 0));
  const day = moment(now).startOf("day");
  for (let i = 0; i < days; i++) {
    day.add(1, "day");
    if (isClosedDelivery(day, now, rules)) continue;
    const route = list.find(r => routeRunsOn(r, day, closures));
    if (route) return { route, date: day.clone() };
  }
  return null;
};

export const isLateDelivery = (date, now, rules) => {
  const day = dayOf(date);
  if (!day) return false;
  const current = moment(now);
  if (!day.isAfter(current, "day")) return false;
  return !current.isBefore(deadlineOf(day, rules));
};


export const isLatePickup = (date, now, rules, { afternoon = false } = {}) => {
  const day = dayOf(date);
  if (!day) return false;
  const current = moment(now);
  const today = current.clone().startOf("day");
  if (day.isBefore(today, "day")) return false;
  if (day.isSame(today, "day")) return afternoon ? current.hour() >= rules.pickupSameDayLimitHour : true;
  if (afternoon) return false;
  return !current.isBefore(deadlineOf(day, rules));
};

const formatNumber = n => String(Math.round(Number(n) * 100) / 100).replace(".", ",");

// The closed route's text, with the next date and its route filled.
export const routeClosedMessage = (template, next) =>
  String(template || DEFAULT_ROUTE_CLOSED_MESSAGE)
    .replace(/\{data\}/g, next ? moment(next.date).locale("ca").format("dddd D/M") : "")
    .replace(/\{ruta\}/g, next ? next.route.short_name || next.route.name || "" : "");

// The popup text, from the setting (or the default) with its placeholders filled.
export const lateMessage = (template, rules) =>
  String(template || "")
    .replace(/\{hora\}/g, String(rules.nextDayLimitHour))
    .replace(/\{hora_tarda\}/g, String(rules.pickupSameDayLimitHour))
    .replace(/\{recarrec\}/g, formatNumber(rules.lateSurcharge));

// What to tell the member before saving: [] when she is on time. `stored` is
// the order as loaded (a date that doesn't move is not judged again, as the
// backend does); `afternoon` whether its farm pickup is an afternoon one.
export const lateWarnings = (form, stored, ordersOptions, { now = new Date(), afternoon = false, holidays = [] } = {}) => {
  const rules = lateRules(ordersOptions, { holidays });
  const o = ordersOptions || {};
  const moved = (field) => !stored || !stored[field] || !moment(stored[field]).isSame(moment(form[field]), "day");
  const out = [];
  if (form.estimated_delivery_date && moved("estimated_delivery_date") && isLateDelivery(form.estimated_delivery_date, now, rules)) {
    out.push({ key: "order", text: lateMessage(o.late_order_message || DEFAULT_LATE_ORDER_MESSAGE, rules) });
  }
  if (
    form.collection_point &&
    form.collection_pickup_date &&
    moved("collection_pickup_date") &&
    isLatePickup(form.collection_pickup_date, now, rules, { afternoon })
  ) {
    out.push({ key: "pickup", text: lateMessage(o.late_pickup_message || DEFAULT_LATE_PICKUP_MESSAGE, rules) });
  }
  return out;
};

// The surcharge % an order pays: only while it is marked late.
export const lateSurchargeOf = o => (o && o.late_order ? Number(o.late_surcharge) || 0 : 0);
