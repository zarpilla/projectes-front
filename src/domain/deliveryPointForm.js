// The delivery point form (Punts d'entrega → nou) (issues/360)
import { normalizeName, routeDays, slotOf, WEEKDAYS } from "@/domain/cityRoutes.js";

export const NIF_HELP =
  "Indicar el NIF correcte ens assegura que no registrem dues vegades el mateix punt d'entrega. Genera'l automàticament si és un particular";

// a private customer («Particular») is always reachable 8–19 h, one slot
export const PARTICULAR_HOURS = {
  time_slot_1_ini: 8,
  time_slot_1_end: 19,
  time_slot_2_ini: null,
  time_slot_2_end: null
};

export const isParticularSector = (sectorId, sectors) => {
  const sector = (sectors || []).find(s => s.id === sectorId);
  return !!sector && normalizeName(sector.name) === "particular";
};

const joinAnd = parts =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} i ${parts[parts.length - 1]}`;

// «Dimarts de 9 a 11 h i dijous de 13 a 15 h»: the days and slots we pass by
// a town, from its routes; "" when no route goes there
export const townDeliveryText = (routes, linkOf) => {
  const byDay = new Map();
  for (const route of routes || []) {
    const slot = slotOf(linkOf ? linkOf(route.id) : null, route).text;
    for (const day of routeDays(route)) {
      if (!byDay.has(day)) byDay.set(day, []);
      const slots = byDay.get(day);
      if (!slots.includes(slot)) slots.push(slot);
    }
  }
  const order = WEEKDAYS.map(([, name]) => name.toLowerCase());
  const parts = [...byDay.entries()]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([day, slots]) => {
      const known = slots.filter(Boolean);
      return known.length ? `${day} ${known.join(" o ")}` : day;
    });
  const text = joinAnd(parts);
  return text ? text[0].toUpperCase() + text.slice(1) : "";
};

// issues/448: what a field in red needs, shown under it, and the snackbar
// naming the fields to fix instead of a bare «camps incorrectes»
export const POINT_FIELD_LABELS = {
  owner: "Contacte de",
  city: "Població",
  postcode: "CP",
  address: "Adreça",
  trade_name: "Nom comercial",
  sector: "Sector",
  nif: "NIF",
  time_slot_1_ini: "Horari de contacte 1",
  time_slot_2_ini: "Horari de contacte 2",
  phone: "Telèfon"
};

const REQUIRED = {
  owner: "Tria de qui és el punt d'entrega",
  city: "Tria una població de la llista",
  postcode: "Indica el codi postal",
  address: "Indica l'adreça",
  sector: "Tria un sector",
  nif: "Indica el NIF, o genera'n un si és un particular",
  phone: "Necessitem un telèfon de 9 dígits com a mínim"
};

// the message of each field in error; slot errors come from validateTimeSlots
export const pointFieldErrors = (errors, slotErrors, { postcodeMessage, tradeNameMessage } = {}) => {
  const slotMessage = n => {
    const own = (slotErrors || [])
      .map(e => e[`time_slot_${n}_ini`] || e[`time_slot_${n}_end`])
      .filter(Boolean);
    if (own.length) return own.join(". ");
    const any = (slotErrors || []).find(e => e.time_slots);
    return any ? any.time_slots : "";
  };
  const out = {};
  for (const field of Object.keys(POINT_FIELD_LABELS)) {
    if (!errors || !errors[field]) continue;
    if (field === "time_slot_1_ini") out[field] = slotMessage(1);
    else if (field === "time_slot_2_ini") out[field] = slotMessage(2);
    else if (field === "trade_name") out[field] = tradeNameMessage || "Indica el nom comercial";
    else if (field === "postcode" && postcodeMessage) out[field] = postcodeMessage;
    else out[field] = REQUIRED[field];
  }
  return out;
};

// «Revisa els camps en vermell: Població, NIF i Telèfon»
export const pointErrorsSnackbar = errors => {
  const names = Object.keys(POINT_FIELD_LABELS)
    .filter(field => errors && errors[field])
    .map(field => POINT_FIELD_LABELS[field]);
  return names.length ? `Revisa els camps en vermell: ${joinAnd(names)}` : "";
};
