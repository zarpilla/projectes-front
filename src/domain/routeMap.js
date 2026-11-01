// What the routes map shows (issues/356): which municipalities and comarques
// have service, and on which weekdays. A town of the list is a free name, not a
// municipality: it can be a village inside one (Empuriabrava), be misspelled or
// be nothing on a map (a warehouse). So a town lands on the map through the code
// the office gave it (city.municipality_code), else through its name.

import { WEEKDAYS, indexLinks, normalizeName } from "./cityRoutes.js";

// city.municipality_code of a town the office keeps off the map
export const OFF_MAP = "none";

// lower case, no accents, no article, no notes: "L'Escala" = "l'Escala",
// "Sant Gregori (7h - 8h)" = "Sant Gregori"
export const placeKey = name =>
  normalizeName(String(name || "").replace(/[([].*$/, ""))
    .replace(/^(el|la|els|les)\s+/, "")
    .replace(/^l'\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

// towns that are not named as their municipality. Checked one by one against the
// ICGC limits and OpenStreetMap: some names are also a municipality elsewhere
// (La Floresta and Ginestar, in Lleida and Tarragona).
const VILLAGES = {
  "can blanc": "Santa Pau",
  calonge: "Calonge i Sant Antoni",
  "sant antoni de calonge": "Calonge i Sant Antoni",
  camallera: "Saus, Camallera i Llampaies",
  cogolls: "les Planes d'Hostoles",
  "corro d'avall": "les Franqueses del Vallès",
  llerona: "les Franqueses del Vallès",
  cruilles: "Cruïlles, Monells i Sant Sadurní de l'Heura",
  monells: "Cruïlles, Monells i Sant Sadurní de l'Heura",
  "sant sadurni de l'heura": "Cruïlles, Monells i Sant Sadurní de l'Heura",
  empuriabrava: "Castelló d'Empúries",
  esparraguera: "Esparreguera",
  fellines: "Viladasens",
  floresta: "Sant Cugat del Vallès",
  valldoreix: "Sant Cugat del Vallès",
  fontclara: "Palau-sator",
  fonteta: "Forallac",
  peratallada: "Forallac",
  vulpellac: "Forallac",
  gauses: "Vilopriu",
  ginestar: "Sant Gregori",
  estartit: "Torroella de Montgrí",
  canya: "la Vall de Bianya",
  llabia: "Fontanilles",
  marza: "Pedret i Marzà",
  mata: "Porqueres",
  montagut: "Montagut i Oix",
  "platja d'aro": "Castell-Platja d'Aro",
  riudellots: "Riudellots de la Selva",
  riuderenes: "Riudarenes",
  "sant miquel de balanya": "Seva",
  "sant vicencs de torello": "Sant Vicenç de Torelló",
  "sant vicens dels horts": "Sant Vicenç dels Horts",
  "santa coloma de gramanet": "Santa Coloma de Gramenet",
  terradelles: "Vilademuls",
  vilafreser: "Vilademuls",
  ullestret: "Ullastret",
  "vila-robau": "Ventalló",
  vilavenut: "Fontcoberta"
};

// a warehouse is linked to the routes that leave it: it isn't served by them
const isWarehouse = city => /^magatzem\b/i.test(city.name);

/** Looks municipalities up by code and by name. */
export const placeIndex = map => {
  const byCode = new Map(map.municipis.map(m => [m.code, m]));
  const byKey = new Map(map.municipis.map(m => [placeKey(m.name), m]));
  return { byCode, byKey };
};

/** The municipality of a town; null when it is unknown; OFF_MAP when it doesn't belong on the map. */
export const townPlace = (city, { byCode, byKey }) => {
  const code = city.municipality_code;
  if (code === OFF_MAP) return OFF_MAP;
  if (code && byCode.has(code)) return byCode.get(code);
  const key = placeKey(city.name);
  if (VILLAGES[key]) return byKey.get(placeKey(VILLAGES[key])) || null;
  if (isWarehouse(city)) return OFF_MAP;
  return byKey.get(key) || null;
};

// the weekdays (keys, in week order) a set of routes runs
const daysOf = routes => WEEKDAYS.map(([key]) => key).filter(key => routes.some(route => route[key]));

const newArea = () => ({ days: [], towns: [] });

const addTown = (area, town) => {
  area.towns.push(town);
  area.days = WEEKDAYS.map(([key]) => key).filter(key => area.days.includes(key) || town.days.includes(key));
};

/**
 * { municipis: Map(code → area), comarques: Map(code → area), unplaced: towns } where an area
 * is { days, towns } and a town { city, place, routes, days }. Only routes that
 * run some weekday give service: «Població no disponible» is an active route
 * without days. `unplaced`: towns with service that can't be drawn.
 */
export const serviceMap = (map, cities, routes, links) => {
  const index = placeIndex(map);
  const { routesByTown, linkOf } = indexLinks(cities, routes, links);
  const municipis = new Map();
  const comarques = new Map();
  const unplaced = [];
  for (const city of cities) {
    const served = (routesByTown.get(city.id) || []).filter(route => WEEKDAYS.some(([key]) => route[key]));
    if (!served.length) continue;
    const place = townPlace(city, index);
    if (place === OFF_MAP) continue;
    if (!place) {
      unplaced.push(city);
      continue;
    }
    const town = { city, place, routes: served, days: daysOf(served), linkOf: route => linkOf(city.id, route.id) };
    if (!municipis.has(place.code)) municipis.set(place.code, newArea());
    if (!comarques.has(place.comarca)) comarques.set(place.comarca, newArea());
    addTown(municipis.get(place.code), town);
    addTown(comarques.get(place.comarca), town);
  }
  return { municipis, comarques, unplaced };
};

// the days to paint on the map: an area's own ones, or the chosen day if it has it
export const shownDays = (area, day) => {
  if (!area) return [];
  if (!day) return area.days;
  return area.days.includes(day) ? [day] : [];
};

// [x, y, width, height] of a box with a margin, widened to the proportions of
// the map so that the zoom doesn't distort the frame
export const zoomBox = ([x, y, w, h], [mapW, mapH], margin = 0.12) => {
  const aspect = mapW / mapH;
  const height = Math.max(h, w / aspect) * (1 + margin * 2);
  const width = height * aspect;
  return [x + w / 2 - width / 2, y + h / 2 - height / 2, width, height];
};

// the box [x, y, width, height] that holds some boxes
export const boxOfBoxes = boxes => {
  const left = Math.min(...boxes.map(b => b[0]));
  const top = Math.min(...boxes.map(b => b[1]));
  const right = Math.max(...boxes.map(b => b[0] + b[2]));
  const bottom = Math.max(...boxes.map(b => b[1] + b[3]));
  return [left, top, right - left, bottom - top];
};

// Where the names go, so that none covers another one (issues/356). Each label
// { key, x, y, name, days } gets the free spot closest to its place, looking
// further and further away; the longest names choose first because they fit in
// fewer spots. `at: null`: no room, the name stays in the list and the tooltip.
export const placeLabels = (labels, { fontSize, tile, view }) => {
  const [viewX, viewY, viewW, viewH] = view;
  const taken = [];
  const boxAt = (x, y, label) => {
    const halfW = Math.max(label.name.length * fontSize * 0.3, (label.days.length * tile) / 2) + fontSize * 0.3;
    const bottom = y + fontSize * 0.45 + (label.days.length > 1 ? tile : 0);
    return { left: x - halfW, right: x + halfW, top: y - fontSize * 1.05, bottom };
  };
  const fits = box =>
    box.left >= viewX && box.right <= viewX + viewW && box.top >= viewY && box.bottom <= viewY + viewH &&
    !taken.some(o => box.left < o.right && o.left < box.right && box.top < o.bottom && o.top < box.bottom);
  const spots = [[0, 0]];
  for (let ring = 1; ring <= 6; ring++) {
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      spots.push([Math.cos(angle) * ring * fontSize * 2.2, Math.sin(angle) * ring * fontSize * 1.1]);
    }
  }
  const placed = new Map();
  for (const label of [...labels].sort((a, b) => b.name.length - a.name.length)) {
    const spot = spots.find(([dx, dy]) => fits(boxAt(label.x + dx, label.y + dy, label)));
    if (!spot) {
      placed.set(label.key, null);
      continue;
    }
    const at = [label.x + spot[0], label.y + spot[1]];
    taken.push(boxAt(at[0], at[1], label));
    placed.set(label.key, at);
  }
  return labels.map(label => ({ ...label, at: placed.get(label.key) }));
};
