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
