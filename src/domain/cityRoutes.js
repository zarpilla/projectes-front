// Towns and the routes that go through them ("Poblacions i rutes"). The links
// are city-route records; some point at deleted routes or towns (null), they
// are ignored.

export const WEEKDAYS = [
  ["monday", "Dilluns"],
  ["tuesday", "Dimarts"],
  ["wednesday", "Dimecres"],
  ["thursday", "Dijous"],
  ["friday", "Divendres"],
  ["saturday", "Dissabte"],
  ["sunday", "Diumenge"]
];

// lower case, without accents: "Artés" and "artes" are the same town
export const normalizeName = name =>
  String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

const idOf = value => (value && typeof value === "object" ? value.id : value);

// { townsByRoute: Map(routeId → towns), routesByTown: Map(cityId → routes), linkOf(cityId, routeId) }
export const indexLinks = (cities, routes, links) => {
  const cityById = new Map(cities.map(c => [c.id, c]));
  const routeById = new Map(routes.map(r => [r.id, r]));
  const townsByRoute = new Map(routes.map(r => [r.id, []]));
  const routesByTown = new Map(cities.map(c => [c.id, []]));
  const linkByKey = new Map();
  for (const link of links || []) {
    const city = cityById.get(idOf(link.city));
    const route = routeById.get(idOf(link.route));
    if (!city || !route) continue;
    const key = `${city.id}:${route.id}`;
    if (linkByKey.has(key)) continue;
    linkByKey.set(key, link);
    townsByRoute.get(route.id).push(city);
    routesByTown.get(city.id).push(route);
  }
  const byName = (a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name));
  townsByRoute.forEach(list => list.sort(byName));
  routesByTown.forEach(list => list.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)));
  return {
    townsByRoute,
    routesByTown,
    linkOf: (cityId, routeId) => linkByKey.get(`${cityId}:${routeId}`) || null
  };
};

// the weekdays a route runs ("dimarts, dijous")
export const routeDays = route => WEEKDAYS.filter(([key]) => route[key]).map(([, name]) => name.toLowerCase());

// routes grouped by the first weekday they run, in week order
export const groupByWeekday = routes => {
  const groups = WEEKDAYS.map(([key, label]) => ({ key, label, routes: [] }));
  const other = { key: "none", label: "Sense dia", routes: [] };
  for (const route of [...routes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))) {
    const first = WEEKDAYS.findIndex(([key]) => route[key]);
    (first >= 0 ? groups[first] : other).routes.push(route);
  }
  return [...groups, other].filter(g => g.routes.length);
};

// towns whose name contains the text (accents ignored); the ones that start
// with it first
export const searchTowns = (cities, text, limit = 8) => {
  const q = normalizeName(text);
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const city of cities) {
    const name = normalizeName(city.name);
    if (name.startsWith(q)) starts.push(city);
    else if (name.includes(q)) contains.push(city);
  }
  const byName = (a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name));
  return [...starts.sort(byName), ...contains.sort(byName)].slice(0, limit);
};

// the towns written in delivery points that are not in the towns list:
// [{ name, points, similar }] (`similar`: an existing town that is probably
// the same one, misspelled), the most used first
export const unknownPointTowns = (pointTowns, cities) => {
  const known = new Set(cities.map(c => normalizeName(c.name)));
  const byKey = new Map();
  for (const name of pointTowns) {
    const key = normalizeName(name);
    if (!key || known.has(key)) continue;
    if (!byKey.has(key)) byKey.set(key, { name: String(name).trim(), points: 0 });
    byKey.get(key).points += 1;
  }
  const similarTo = key => {
    const words = key.split(/[\s'-]+/).filter(w => w.length > 3);
    let best = null;
    for (const c of cities) {
      const name = normalizeName(c.name);
      const d = editDistance(name, key);
      const shares = words.some(w => name.includes(w));
      if ((d <= 2 || shares) && (!best || d < best.d)) best = { city: c, d };
    }
    return best ? best.city : null;
  };
  return [...byKey.entries()]
    .map(([key, v]) => ({ ...v, similar: similarTo(key) }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
};

// Levenshtein distance (short strings: town names)
export const editDistance = (a, b) => {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
};
