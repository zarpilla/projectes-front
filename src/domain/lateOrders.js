import moment from "moment";

// Late orders and late pickups (issues/315). The backend decides and stores
// them (projectes-v5 src/services/late-order.js, the same rules); the form
// uses this copy to warn the member before she saves.
//
// - delivery: for tomorrow, entered at or after «Hora límit per a l'endemà»
//   (orders_options.next_day_limit_hour) → late, with a surcharge
//   (orders_options.late_surcharge %, 25 by default);
// - farm pickup in the afternoon (its slot starts at 13 h or later): on its own
//   day at or after orders_options.pickup_same_day_limit_hour (10 by default);
//   in the morning: on the day before at or after the next-day limit, or on its
//   own day → late, no surcharge.

export const DEFAULT_NEXT_DAY_LIMIT_HOUR = 14;
export const DEFAULT_PICKUP_SAME_DAY_LIMIT_HOUR = 10;
export const DEFAULT_LATE_SURCHARGE = 25;
export const AFTERNOON_FROM = "13:00";

// The texts the Diligència proposed; Configuració general › Logística changes
// them. {hora}: the next-day limit, {hora_tarda}: the same-day limit of the
// afternoon pickups, {recarrec}: the surcharge %.
export const DEFAULT_LATE_ORDER_MESSAGE =
  "Estàs informant tard aquesta comanda! No estàs complint el límit horari de les {hora}h del dia anterior. " +
  "Això tensiona les treballadores de la Diligència, incrementa els costos de la cooperativa i multiplica el risc d'incidències. " +
  "Segur que trobaràs la manera que no et torni a passar!\n\n" +
  "Aquest cop s'aplicarà un recàrrec del {recarrec}% automàticament i coordinació mirarà d'adreçar la comanda si encara és possible";

export const DEFAULT_LATE_PICKUP_MESSAGE =
  "Aquesta comanda implica una recollida i l'estàs informant tard. No estàs complint el límit de les {hora_tarda}h del mateix dia " +
  "per les recollides de tarda i les {hora}h del dia anterior per les recollides de matí. " +
  "Això tensiona les treballadores de la Diligència, incrementa els costos de la cooperativa i multiplica el risc d'incidències.\n" +
  "Segur que trobaràs la manera que no et torni a passar!";

const numberOr = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const lateRules = ordersOptions => {
  const o = ordersOptions || {};
  return {
    nextDayLimitHour: numberOr(o.next_day_limit_hour, DEFAULT_NEXT_DAY_LIMIT_HOUR),
    pickupSameDayLimitHour: numberOr(o.pickup_same_day_limit_hour, DEFAULT_PICKUP_SAME_DAY_LIMIT_HOUR),
    lateSurcharge: numberOr(o.late_surcharge, DEFAULT_LATE_SURCHARGE)
  };
};

const dayOf = value => {
  if (!value) return null;
  const day = moment(value instanceof Date ? value : moment(value, ["YYYY-MM-DD", moment.ISO_8601]));
  return day.isValid() ? day.clone().startOf("day") : null;
};

export const isLateDelivery = (date, now, rules) => {
  const day = dayOf(date);
  if (!day) return false;
  const current = moment(now);
  return day.isSame(current.clone().startOf("day").add(1, "day"), "day") && current.hour() >= rules.nextDayLimitHour;
};

export const isAfternoonSlot = timeFrom => Boolean(timeFrom) && String(timeFrom).slice(0, 5) >= AFTERNOON_FROM;

export const isLatePickup = (date, now, rules, { afternoon = false } = {}) => {
  const day = dayOf(date);
  if (!day) return false;
  const current = moment(now);
  const today = current.clone().startOf("day");
  if (day.isBefore(today, "day")) return false;
  if (day.isSame(today, "day")) return afternoon ? current.hour() >= rules.pickupSameDayLimitHour : true;
  if (afternoon) return false;
  return day.isSame(today.clone().add(1, "day"), "day") && current.hour() >= rules.nextDayLimitHour;
};

const formatNumber = n => String(Math.round(Number(n) * 100) / 100).replace(".", ",");

// The popup text, from the setting (or the default) with its placeholders filled.
export const lateMessage = (template, rules) =>
  String(template || "")
    .replace(/\{hora\}/g, String(rules.nextDayLimitHour))
    .replace(/\{hora_tarda\}/g, String(rules.pickupSameDayLimitHour))
    .replace(/\{recarrec\}/g, formatNumber(rules.lateSurcharge));

// What to tell the member before saving: [] when she is on time. `stored` is
// the order as loaded (a date that doesn't move is not judged again, as the
// backend does); `afternoon` whether its farm pickup is an afternoon one.
export const lateWarnings = (form, stored, ordersOptions, { now = new Date(), afternoon = false } = {}) => {
  const rules = lateRules(ordersOptions);
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
