// «Poblacions i rutes» time slots as a spreadsheet (issues/320). The office
// exports every active route and its towns, fills the times in LibreOffice and
// imports the file back. A route row has no town: its times are the route's
// usual slot. A town row holds the town's own slot; empty, the town takes the
// route's. The import only changes slots, never which towns a route has.

import { routeDays, formatSlot, slotOf, timeInput, timeValue, slotError, normalizeName, indexLinks, groupByWeekday } from "./cityRoutes.js";

export const SLOT_HEADER = ["Dia", "Ruta", "Població", "Inici", "Fi", "Franja que s'aplica", "ID"];

const NONE = "per definir";

// the rows of the .ods, header first, in the order of the screen
export const slotSheetRows = (cities, routes, cityRoutes) => {
  const index = indexLinks(cities, routes, cityRoutes);
  const rows = [SLOT_HEADER];
  for (const group of groupByWeekday(routes)) {
    for (const route of group.routes) {
      const day = routeDays(route).join(", ");
      rows.push([day, route.name, "", timeInput(route.time_from), timeInput(route.time_to), formatSlot(route.time_from, route.time_to) || NONE, `r${route.id}`]);
      for (const town of index.townsByRoute.get(route.id) || []) {
        const link = index.linkOf(town.id, route.id);
        const own = !!(link && link.time_from);
        rows.push([
          day,
          route.name,
          town.name,
          own ? timeInput(link.time_from) : "",
          own ? timeInput(link.time_to) : "",
          slotOf(link, route).text || NONE,
          `l${link.id}`
        ]);
      }
    }
  }
  return rows;
};

// A cell of Inici / Fi as "HH:MM", "" when empty, or null when it can't be read.
// Takes time cells ("09:30"), numbers (9 = 9 h; 0.375 = a day fraction, as a
// time typed in a number cell) and text: «9», «9:30», «09:30:00», «9h», «9 h»,
// «9h30», «9.30», «9,30».
export const parseHour = value => {
  if (value === null || value === undefined || value === "") return "";
  let h;
  let m;
  if (typeof value === "number") {
    if (value > 0 && value < 1) {
      const minutes = Math.round(value * 24 * 60);
      h = Math.floor(minutes / 60);
      m = minutes % 60;
    } else if (Number.isInteger(value)) {
      h = value;
      m = 0;
    } else {
      return null;
    }
  } else {
    const text = String(value).trim().toLowerCase();
    if (!text) return "";
    const match =
      /^(\d{1,2})(?::(\d{2})(?::\d{2}(?:[.,]\d+)?)?)?\s*h?$/.exec(text) ||
      /^(\d{1,2})\s*h\s*(\d{2})$/.exec(text) ||
      /^(\d{1,2})[.,](\d{2})\s*h?$/.exec(text);
    if (!match) return null;
    h = Number(match[1]);
    m = Number(match[2] || 0);
  }
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const COLUMNS = { ruta: "route", poblacio: "town", inici: "from", fi: "to", id: "id" };

// the column of each field, from the header row
const headerOf = row => {
  const columns = {};
  row.forEach((cell, i) => {
    const key = COLUMNS[normalizeName(String(cell || "")).replace(/[^a-z]/g, "")];
    if (key && columns[key] === undefined) columns[key] = i;
  });
  return columns.route !== undefined && columns.from !== undefined && columns.to !== undefined ? columns : null;
};

const cellText = value => (value === null || value === undefined ? "" : String(value).trim());

// What importing the sheet would change. rows: from readOds. Returns
// { changes, errors, unchanged }: changes = [{ kind, id, url, row, label,
// before, after, data }], errors = [{ row, message }] (row numbers as the
// spreadsheet shows them).
export const planSlotImport = (rows, { cities, routes, cityRoutes }) => {
  const headerRow = rows.findIndex(row => headerOf(row || []));
  if (headerRow < 0) {
    return { changes: [], errors: [{ row: null, message: "No s'ha trobat la fila de títols (Ruta, Població, Inici, Fi)" }], unchanged: 0 };
  }
  const col = headerOf(rows[headerRow]);
  const index = indexLinks(cities, routes, cityRoutes);
  const routeById = new Map(routes.map(r => [r.id, r]));
  const routesByName = new Map();
  for (const r of routes) routesByName.set(normalizeName(r.name), r);
  const linkById = new Map();
  for (const route of routes) {
    for (const town of index.townsByRoute.get(route.id) || []) {
      const link = index.linkOf(town.id, route.id);
      linkById.set(link.id, { link, route, town });
    }
  }

  const changes = [];
  const errors = [];
  const seen = new Map();
  let unchanged = 0;

  rows.slice(headerRow + 1).forEach((row, i) => {
    const rowNumber = headerRow + i + 2;
    const get = key => (col[key] === undefined ? "" : row[col[key]]);
    const routeName = cellText(get("route"));
    const townName = cellText(get("town"));
    const id = cellText(get("id")).toLowerCase();
    if (!routeName && !townName && !id && cellText(get("from")) === "" && cellText(get("to")) === "") return;
    const fail = message => errors.push({ row: rowNumber, message });

    // the route or town the row is about: by ID, else by names
    let target = null;
    const byId = /^([rl])(\d+)$/.exec(id);
    if (id && !byId) return fail(`ID no vàlid: «${id}»`);
    if (byId && byId[1] === "r") {
      const route = routeById.get(Number(byId[2]));
      if (!route) return fail(`La ruta ${id} no existeix o no és activa`);
      target = { kind: "route", route };
    } else if (byId) {
      const found = linkById.get(Number(byId[2]));
      if (!found) return fail(`La població de la ruta ${id} ja no hi és`);
      target = { kind: "link", ...found };
    } else {
      const route = routesByName.get(normalizeName(routeName));
      if (!route) return fail(`No hi ha cap ruta activa «${routeName}»`);
      if (!townName) {
        target = { kind: "route", route };
      } else {
        const town = (index.townsByRoute.get(route.id) || []).find(t => normalizeName(t.name) === normalizeName(townName));
        if (!town) return fail(`«${townName}» no és a la ruta ${route.name}`);
        target = { kind: "link", route, town, link: index.linkOf(town.id, route.id) };
      }
    }

    const from = parseHour(get("from"));
    const to = parseHour(get("to"));
    if (from === null) return fail(`No s'entén l'hora d'inici «${cellText(get("from"))}»`);
    if (to === null) return fail(`No s'entén l'hora final «${cellText(get("to"))}»`);
    const invalid = slotError(from, to);
    if (invalid) return fail(invalid);

    const key = target.kind === "route" ? `r${target.route.id}` : `l${target.link.id}`;
    if (seen.has(key)) return fail(`Repetida: ja surt a la fila ${seen.get(key)}`);
    seen.set(key, rowNumber);

    const stored = target.kind === "route" ? target.route : target.link.time_from ? target.link : {};
    const before = { from: timeInput(stored.time_from), to: timeInput(stored.time_to) };
    const after = { from, to: from ? to : "" };
    if (before.from === after.from && before.to === after.to) {
      unchanged++;
      return;
    }
    const empty = target.kind === "route" ? NONE : "la de la ruta";
    changes.push({
      kind: target.kind,
      id: target.kind === "route" ? target.route.id : target.link.id,
      url: target.kind === "route" ? `routes/${target.route.id}` : `city-routes/${target.link.id}`,
      row: rowNumber,
      label: target.kind === "route" ? target.route.name : `${target.route.name} › ${target.town.name}`,
      before: formatSlot(before.from, before.to) || empty,
      after: formatSlot(after.from, after.to) || empty,
      data: { time_from: timeValue(after.from), time_to: after.from ? timeValue(after.to) : null }
    });
  });

  return { changes, errors, unchanged };
};
