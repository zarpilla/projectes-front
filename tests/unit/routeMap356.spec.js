// The map of routes (issues/356): towns land on their municipality and comarca,
// coloured by the days of their routes.
import { describe, it, expect } from "vitest";
import { OFF_MAP, boxOfBoxes, placeIndex, placeKey, serviceMap, shownDays, townPlace, zoomBox } from "@/domain/routeMap.js";
import realMap from "@/data/catalunyaMap.json";

const map = {
  size: [1000, 900],
  comarques: [],
  municipis: [
    { code: "17062", name: "Castelló d'Empúries", comarca: "02" },
    { code: "08279", name: "Sant Cugat del Vallès", comarca: "40" },
    { code: "25907", name: "la Floresta", comarca: "16" },
    { code: "17079", name: "Girona", comarca: "20" },
    { code: "08019", name: "Barcelona", comarca: "13" }
  ]
};
const index = placeIndex(map);
const place = (name, extra = {}) => townPlace({ name, ...extra }, index);

describe("towns on the map (issues/356)", () => {
  it("ignores case, accents, articles and notes in a town's name", () => {
    expect(placeKey("L'Escala")).toBe(placeKey("l'Escala"));
    expect(placeKey("Sant Gregori (7h - 8h / 13h - 15h)")).toBe("sant gregori");
    expect(place("GIRONA").code).toBe("17079");
  });

  it("puts a village in its municipality", () => {
    expect(place("Empuriabrava").code).toBe("17062");
  });

  it("doesn't take a village for the municipality with the same name elsewhere", () => {
    expect(place("La Floresta").code).toBe("08279");
  });

  it("the office's choice wins over the name", () => {
    expect(place("La Floresta", { municipality_code: "25907" }).code).toBe("25907");
    expect(place("Girona", { municipality_code: OFF_MAP })).toBe(OFF_MAP);
  });

  it("keeps out what isn't a town and doesn't place what it doesn't know", () => {
    expect(place("Magatzem Girona")).toBe(OFF_MAP);
    expect(place("Ochtrup")).toBeNull();
  });

  it("every village resolves to a real municipality of the map", () => {
    const real = placeIndex(realMap);
    for (const name of ["Peratallada", "Gaüses", "Corró d'Avall", "Sant Sadurní de L'Heura", "Camallera", "Ginestar (Sant Gregori) [DC - 7h a 8h]", "Santa Coloma de Gramanet"]) {
      expect(townPlace({ name }, real), name).toBeTruthy();
    }
    expect(realMap.comarques).toHaveLength(43);
    expect(realMap.municipis).toHaveLength(947);
  });
});

describe("service per day (issues/356)", () => {
  const cities = [
    { id: 1, name: "Girona" },
    { id: 2, name: "Barcelona" },
    { id: 3, name: "Ochtrup" },
    { id: 4, name: "Empuriabrava" },
    { id: 5, name: "Sense ruta" }
  ];
  const routes = [
    { id: 10, name: "DT", tuesday: true },
    { id: 11, name: "DC", wednesday: true },
    { id: 12, name: "Població no disponible" }
  ];
  const links = [
    { city: 1, route: 10 },
    { city: 1, route: 11 },
    { city: 2, route: 12 },
    { city: 3, route: 10 },
    { city: 4, route: 10 }
  ];
  const result = serviceMap(map, cities, routes, links);

  it("colours a comarca with the days of its towns' routes", () => {
    expect(result.comarques.get("20").days).toEqual(["tuesday", "wednesday"]);
    expect(result.municipis.get("17062").days).toEqual(["tuesday"]);
  });

  it("a route without weekdays is no service", () => {
    expect(result.comarques.has("13")).toBe(false);
  });

  it("lists towns with service it can't draw, not the ones without routes", () => {
    expect(result.unplaced.map(c => c.name)).toEqual(["Ochtrup"]);
  });

  it("the day filter leaves only that day", () => {
    const area = result.comarques.get("20");
    expect(shownDays(area, null)).toEqual(["tuesday", "wednesday"]);
    expect(shownDays(area, "wednesday")).toEqual(["wednesday"]);
    expect(shownDays(area, "friday")).toEqual([]);
    expect(shownDays(undefined, null)).toEqual([]);
  });
});

describe("zoom (issues/356)", () => {
  it("the first view holds every comarca with service", () => {
    expect(boxOfBoxes([[10, 20, 5, 5], [100, 0, 10, 10]])).toEqual([10, 0, 100, 25]);
  });

  it("frames a comarca centred, with the map's proportions", () => {
    const [x, y, w, h] = zoomBox([100, 100, 100, 50], [1000, 500]);
    expect(w / h).toBeCloseTo(2);
    expect(x + w / 2).toBeCloseTo(150);
    expect(y + h / 2).toBeCloseTo(125);
    expect(h).toBeGreaterThan(50);
  });
});
