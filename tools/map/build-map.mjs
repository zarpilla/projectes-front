// Builds src/data/catalunyaMap.json (issues/356): the municipalities and comarques
// of Catalonia as SVG paths, simplified and already projected, so the app needs
// neither a map library nor tiles from a third party.
//
//   curl -o /tmp/mun.geojson 'https://analisi.transparenciacatalunya.cat/api/geospatial/5ryy-c5zw?method=export&format=GeoJSON'
//   node tools/map/build-map.mjs /tmp/mun.geojson
//
// Source: «Límits administratius municipals de Catalunya», ICGC. mapshaper is
// only needed here: `npx --package=mapshaper` fetches it, it is not a dependency.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WIDTH = 1000;
const SIMPLIFY = "1.5%";
const MID_LAT = (41.7 * Math.PI) / 180;

const source = process.argv[2];
if (!source) throw new Error("Usage: node tools/map/build-map.mjs <municipalities.geojson>");
const dir = mkdtempSync(join(tmpdir(), "map-"));
const mapshaper = process.env.MAPSHAPER ? [process.env.MAPSHAPER] : ["npx", "--yes", "--package=mapshaper", "mapshaper"];
const run = args => execFileSync(mapshaper[0], [...mapshaper.slice(1), ...args], { stdio: "pipe" });

run([source, "-filter-fields", "codimuni,nommuni,codicomar,nomcomar", "-simplify", SIMPLIFY, "keep-shapes", "-o", join(dir, "mun.json"), "format=geojson", "precision=0.0001",
  "-points", "inner", "-o", join(dir, "munp.json"), "format=geojson"]);
run([join(dir, "mun.json"), "-dissolve", "codicomar", "copy-fields=nomcomar", "-o", join(dir, "com.json"), "format=geojson",
  "-points", "inner", "-o", join(dir, "comp.json"), "format=geojson"]);
const read = name => JSON.parse(readFileSync(join(dir, name), "utf8")).features;
const [mun, munPoints, com, comPoints] = ["mun.json", "munp.json", "com.json", "comp.json"].map(read);

const rings = geometry => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates).flat();
const all = mun.flatMap(f => rings(f.geometry)).flat();
const extent = values => values.reduce(([min, max], v) => [Math.min(min, v), Math.max(max, v)], [Infinity, -Infinity]);
const lonX = lon => lon * Math.cos(MID_LAT);
const [minX, maxX] = extent(all.map(p => lonX(p[0])));
const [minY, maxY] = extent(all.map(p => p[1]));
const scale = WIDTH / (maxX - minX);
const round = n => Math.round(n * 10) / 10;
const project = ([lon, lat]) => [round((lonX(lon) - minX) * scale), round((maxY - lat) * scale)];

const pathOf = geometry =>
  rings(geometry)
    .map(ring => {
      const points = ring.map(project);
      const steps = points.slice(1, -1).map((p, i) => `${round(p[0] - points[i][0])} ${round(p[1] - points[i][1])}`);
      return `M${points[0][0]} ${points[0][1]}l${steps.join(" ")}z`;
    })
    .join("");

const boxOf = geometry => {
  const points = rings(geometry).flat().map(project);
  const [x, right] = extent(points.map(p => p[0]));
  const [y, bottom] = extent(points.map(p => p[1]));
  return [x, y, round(right - x), round(bottom - y)];
};

const pointOf = (points, key, value) => project(points.find(p => p.properties[key] === value).geometry.coordinates);

const byName = (a, b) => a.name.localeCompare(b.name, "ca");
const map = {
  size: [WIDTH, round((maxY - minY) * scale)],
  comarques: com
    .map(f => ({
      code: f.properties.codicomar,
      name: f.properties.nomcomar,
      d: pathOf(f.geometry),
      box: boxOf(f.geometry),
      label: pointOf(comPoints, "codicomar", f.properties.codicomar)
    }))
    .sort(byName),
  municipis: mun
    .map(f => ({
      // the 5-digit INE code: the ICGC one plus its check digit
      code: f.properties.codimuni.slice(0, 5),
      name: f.properties.nommuni,
      comarca: f.properties.codicomar,
      d: pathOf(f.geometry),
      label: pointOf(munPoints, "codimuni", f.properties.codimuni)
    }))
    .sort(byName)
};
writeFileSync(new URL("../../src/data/catalunyaMap.json", import.meta.url), JSON.stringify(map));
console.log(`${map.comarques.length} comarques, ${map.municipis.length} municipis`);
