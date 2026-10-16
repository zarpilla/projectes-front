// "Rutes i dies": for each route, the days it runs in a few weeks, whether it
// is closed that day (a route-festive record), whether the day is a holiday of
// the entity, and how many orders are expected.
import moment from "moment";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const idOf = value => (value && typeof value === "object" ? value.id : value);

// the Monday of the week of `date`, plus `offset` weeks (YYYY-MM-DD)
export const weekStart = (date, offset = 0) =>
  moment(date).startOf("isoWeek").add(offset, "weeks").format("YYYY-MM-DD");

// [{ start, number }] for `count` weeks from the Monday `start`
export const weeksFrom = (start, count) =>
  Array.from({ length: count }, (_, i) => {
    const m = moment(start, "YYYY-MM-DD").add(i, "weeks");
    return { start: m.format("YYYY-MM-DD"), number: m.isoWeek() };
  });

// the dates (YYYY-MM-DD) a route runs in the week starting on Monday `start`
export const routeDatesInWeek = (route, start) => {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const m = moment(start, "YYYY-MM-DD").add(i, "days");
    if (route[DAY_KEYS[m.day()]]) out.push(m.format("YYYY-MM-DD"));
  }
  return out;
};

// the cell of a route on a date
export const dayCell = ({ route, date, closures, holidays, orderCounts, today }) => {
  const closure = (closures || []).find(c => idOf(c.route) === route.id && c.date === date) || null;
  const holiday = (holidays || []).includes(date);
  return {
    date,
    closure,
    open: !closure,
    holiday,
    past: date < today,
    orders: (orderCounts && orderCounts[`${route.id}:${date}`]) || 0
  };
};

// "route:date" → number of orders (cancelled ones don't count)
export const countOrders = orders => {
  const counts = {};
  for (const o of orders || []) {
    if (o.status === "cancelled" || !o.estimated_delivery_date) continue;
    const key = `${idOf(o.route)}:${o.estimated_delivery_date}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
};

// holidays in the window with routes still open: [{ date, routes: [route], orders }]
export const openOnHolidays = ({ routes, holidays, closures, orderCounts, from, to }) =>
  (holidays || [])
    .filter(date => date >= from && date <= to)
    .sort()
    .map(date => {
      const day = DAY_KEYS[moment(date, "YYYY-MM-DD").day()];
      const open = routes.filter(r => r[day] && !(closures || []).some(c => idOf(c.route) === r.id && c.date === date));
      return {
        date,
        routes: open,
        orders: open.reduce((acc, r) => acc + ((orderCounts && orderCounts[`${r.id}:${date}`]) || 0), 0)
      };
    })
    .filter(h => h.routes.length);
