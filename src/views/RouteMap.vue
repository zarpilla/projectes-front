<template>
  <!-- The comarques with service, coloured by delivery day; a comarca zooms in to
       its municipalities (issues/356). The map is plain SVG drawn from
       src/data/catalunyaMap.json: no tiles, nothing is asked to a third party. -->
  <div class="route-map">
    <title-bar :title-stack="['Rutes i punts', 'Mapa']" :subtitle="headline" />

    <section class="section is-main-section">
      <routes-tabs :is-staff="canEdit" :is-office="isOffice" />
      <b-loading :is-full-page="false" :model-value="isLoading" />

      <!-- the legend is also the filter by day -->
      <div class="rm-days" role="group" aria-label="Filtra per dia de repartiment">
        <button type="button" class="rm-day" :class="{ 'is-active': !day }" :aria-pressed="!day ? 'true' : 'false'" @click="day = null">Tots els dies</button>
        <button
          v-for="d in days"
          :key="d.key"
          type="button"
          class="rm-day"
          :class="{ 'is-active': day === d.key }"
          :aria-pressed="day === d.key ? 'true' : 'false'"
          @click="day = day === d.key ? null : d.key"
        ><i class="rm-swatch" :style="{ background: dayColor(d.key) }" />{{ d.label }}</button>
        <span class="rm-note"><i class="rm-swatch is-many" /> més d'un dia</span>
      </div>

      <div class="rm-layout">
        <div class="a-box rm-canvas">
          <button v-if="comarca" type="button" class="rm-back" @click="selectComarca(null)"><b-icon icon="arrow-left" size="is-small" /> Totes les comarques</button>
          <svg
            v-if="map"
            ref="svg"
            class="rm-svg"
            :viewBox="viewBox.join(' ')"
            role="img"
            :aria-label="comarca ? `Mapa de ${comarca.name}` : 'Mapa de les comarques de Catalunya amb servei'"
            @mouseleave="tip = null"
          >
            <path
              v-for="c in map.comarques"
              :key="c.code"
              class="rm-area"
              :class="{ 'is-served': areaDays(service.comarques.get(c.code)).length, 'is-current': comarca && comarca.code === c.code, 'is-muted': comarca && comarca.code !== c.code }"
              :d="c.d"
              :style="{ fill: comarca ? (comarca.code === c.code ? 'transparent' : 'var(--map-empty)') : fillOf(service.comarques.get(c.code)) }"
              @click="selectComarca(c)"
              @mousemove="showTip($event, c.name, service.comarques.get(c.code))"
            />

            <template v-if="comarca">
              <path
                v-for="m in municipis"
                :key="m.code"
                class="rm-area rm-town"
                :class="{ 'is-served': areaDays(service.municipis.get(m.code)).length, 'is-picked': picked === m.code }"
                :d="m.d"
                :style="{ fill: fillOf(service.municipis.get(m.code)) }"
                @click="picked = picked === m.code ? null : m.code"
                @mousemove="showTip($event, m.name, service.municipis.get(m.code))"
              />
              <path class="rm-outline" :d="comarca.d" />
            </template>

            <template v-if="labelsReady">
              <g v-for="label in labels" :key="label.key" class="rm-label">
                <text :x="label.x" :y="label.y" :font-size="labelSize" text-anchor="middle">{{ label.name }}</text>
                <g v-if="label.days.length > 1">
                  <template v-for="(d, i) in label.days" :key="d">
                    <rect
                      :x="label.x + (i - label.days.length / 2) * tile"
                      :y="label.y + labelSize * .35"
                      :width="tile * .92"
                      :height="tile * .92"
                      :rx="tile * .18"
                      :style="{ fill: dayColor(d) }"
                    />
                    <text
                      class="rm-tile"
                      :x="label.x + (i - label.days.length / 2 + .46) * tile"
                      :y="label.y + labelSize * .35 + tile * .66"
                      :font-size="tile * .56"
                      :style="{ fill: dayInk(d) }"
                      text-anchor="middle"
                    >{{ dayLetter(d) }}</text>
                  </template>
                </g>
              </g>
            </template>
          </svg>
          <div v-if="tip" class="rm-tip" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">
            <b>{{ tip.name }}</b>
            <span>{{ tip.text }}</span>
          </div>
        </div>

        <aside class="rm-side">
          <!-- the same as the map, as text -->
          <section class="a-box">
            <template v-if="comarca">
              <h2 class="rm-title">{{ comarca.name }}</h2>
              <p v-if="!shownTowns.length" class="has-text-muted">{{ day ? `Cap població amb servei ${dayName(day)}.` : "Encara no hi ha servei en aquesta comarca." }}</p>
              <ul class="rm-towns">
                <li v-for="town in shownTowns" :key="town.city.id" :class="{ 'is-picked': picked === town.place.code }">
                  <b>{{ town.city.name }}</b>
                  <small v-if="isVillage(town)" class="has-text-muted"> {{ town.place.name }}</small>
                  <div v-for="route in townRoutes(town)" :key="route.id" class="rm-town-route">
                    <i class="rm-dot" :style="{ background: dayColor(firstDay(route)) }" />
                    {{ routeDaysText(route) }} · {{ route.name }}<span v-if="slotText(town, route)"> · {{ slotText(town, route) }}</span>
                  </div>
                </li>
              </ul>
            </template>
            <template v-else>
              <h2 class="rm-title">Comarques amb servei</h2>
              <ul class="rm-comarques">
                <li v-for="c in servedComarques" :key="c.code">
                  <button type="button" class="link-button" @click="selectComarca(c)">{{ c.name }}</button>
                  <span class="rm-count">{{ c.towns }} {{ c.towns === 1 ? "població" : "poblacions" }} · {{ c.daysText }}</span>
                </li>
              </ul>
              <p v-if="map && !servedComarques.length" class="has-text-muted">Cap comarca amb servei{{ day ? ` ${dayName(day)}` : "" }}.</p>
            </template>
          </section>

          <!-- towns with service the map can't draw: the office says where they are -->
          <section v-if="canEdit && service.unplaced.length" class="a-box">
            <h2 class="rm-title">Poblacions sense ubicar <small>· {{ service.unplaced.length }}</small></h2>
            <p class="field-note">Tenen ruta però no surten al mapa: tria'n el municipi, o treu-les si no són un lloc de repartiment.</p>
            <div v-for="city in service.unplaced" :key="city.id" class="rm-unplaced">
              <b>{{ city.name }}</b>
              <template v-if="isOffice">
                <b-autocomplete
                  v-model="placeText[city.id]"
                  size="is-small"
                  placeholder="Municipi"
                  field="name"
                  :data="placeMatches(city.id)"
                  :disabled="saving"
                  @select="m => m && savePlace(city, m.code)"
                />
                <button type="button" class="link-button" :disabled="saving" @click="savePlace(city, OFF_MAP)">Treu-la</button>
              </template>
            </div>
          </section>
        </aside>
      </div>
      <p class="rm-source">Límits administratius: Institut Cartogràfic i Geològic de Catalunya.</p>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import RoutesTabs from "@/components/RoutesTabs.vue";
import service from "@/service/index";
import { WEEKDAYS, normalizeName, routeDays, slotOf } from "@/domain/cityRoutes.js";
import { OFF_MAP, boxOfBoxes, placeKey, serviceMap, shownDays, zoomBox } from "@/domain/routeMap.js";

const ZOOM_MS = 380;
const EMPTY = { municipis: new Map(), comarques: new Map(), unplaced: [] };
const dayShort = { monday: "Dl", tuesday: "Dt", wednesday: "Dc", thursday: "Dj", friday: "Dv", saturday: "Ds", sunday: "Dg" };
const dayLetters = { monday: "L", tuesday: "M", wednesday: "X", thursday: "J", friday: "V", saturday: "S", sunday: "G" };
const dayIndex = key => WEEKDAYS.findIndex(([k]) => k === key);

export default {
  name: "RouteMap",
  components: { TitleBar, RoutesTabs },
  data() {
    return {
      OFF_MAP,
      isLoading: true,
      saving: false,
      canEdit: false,
      isOffice: false,
      map: null,
      cities: [],
      routes: [],
      cityRoutes: [],
      day: null,
      comarca: null,
      picked: null,
      viewBox: [0, 0, 1000, 1000],
      svgSize: [700, 700],
      zooming: false,
      tip: null,
      placeText: {}
    };
  },
  computed: {
    service() {
      return this.map ? serviceMap(this.map, this.cities, this.routes, this.cityRoutes) : EMPTY;
    },
    days() {
      const used = new Set(this.routes.flatMap(r => WEEKDAYS.filter(([key]) => r[key]).map(([key]) => key)));
      return WEEKDAYS.filter(([key]) => used.has(key)).map(([key, label]) => ({ key, label }));
    },
    headline() {
      if (!this.map) return "";
      const towns = [...this.service.comarques.values()].reduce((sum, c) => sum + c.towns.length, 0);
      return `${this.service.comarques.size} comarques · ${towns} poblacions amb servei`;
    },
    // the first view frames the comarques with service: the rest of the country
    // would leave them small and their names on top of each other
    homeBox() {
      const boxes = this.map.comarques.filter(c => this.service.comarques.has(c.code)).map(c => c.box);
      return boxes.length ? zoomBox(boxOfBoxes(boxes), this.map.size, 0.03) : [0, 0, ...this.map.size];
    },
    // labels keep their size on screen whatever the zoom or the width of the map
    labelSize() {
      const [width, height] = this.svgSize;
      const units = Math.max(this.viewBox[2] / width, this.viewBox[3] / height);
      return units * (width < 500 ? 8.5 : 11);
    },
    tile() {
      return this.labelSize * 1.25;
    },
    labelsReady() {
      return this.map && !this.zooming;
    },
    municipis() {
      return this.comarca ? this.map.municipis.filter(m => m.comarca === this.comarca.code) : [];
    },
    labels() {
      const label = (place, area, name) => ({ key: place.code, x: place.label[0], y: place.label[1], name, days: this.areaDays(area) });
      if (this.comarca) {
        return this.municipis
          .filter(m => this.areaDays(this.service.municipis.get(m.code)).length)
          .map(m => label(m, this.service.municipis.get(m.code), m.name.replace(/^(el|la|els|les) /, "")));
      }
      return this.map.comarques
        .filter(c => this.areaDays(this.service.comarques.get(c.code)).length)
        .map(c => label(c, this.service.comarques.get(c.code), c.name));
    },
    servedComarques() {
      if (!this.map) return [];
      return this.map.comarques
        .map(c => ({ ...c, area: this.service.comarques.get(c.code) }))
        .filter(c => this.areaDays(c.area).length)
        .map(c => ({
          ...c,
          towns: c.area.towns.filter(t => !this.day || t.days.includes(this.day)).length,
          daysText: this.daysText(this.areaDays(c.area))
        }));
    },
    shownTowns() {
      const area = this.comarca && this.service.comarques.get(this.comarca.code);
      if (!area) return [];
      return area.towns
        .filter(t => !this.day || t.days.includes(this.day))
        .sort((a, b) => normalizeName(a.city.name).localeCompare(normalizeName(b.city.name)));
    }
  },
  async mounted() {
    const me = await service({ requiresAuth: true, cached: true }).get("users/me");
    const permissions = me.data.permissions.map(p => p.permission);
    this.canEdit = permissions.includes("orders_admin") || permissions.includes("orders_delivery");
    this.isOffice = permissions.includes("orders_admin");
    const [map] = await Promise.all([import("@/data/catalunyaMap.json"), this.getData()]);
    this.map = map.default;
    this.viewBox = this.homeBox;
    this.isLoading = false;
    await this.$nextTick();
    this.measure();
    window.addEventListener("resize", this.measure);
  },
  beforeUnmount() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.measure);
  },
  methods: {
    async getData() {
      const [cities, routes, cityRoutes] = await Promise.all([
        service({ requiresAuth: true, cached: false }).get("cities?_sort=name&_limit=-1").then(r => r.data),
        service({ requiresAuth: true, cached: true }).get("routes?_sort=order&_where[active]=true&_limit=-1").then(r => r.data),
        service({ requiresAuth: true, cached: false }).get("city-routes/basic").then(r => r.data)
      ]);
      this.cities = cities.map(c => ({ id: c.id, name: c.name, municipality_code: c.municipality_code }));
      this.routes = routes;
      this.cityRoutes = cityRoutes;
    },
    measure() {
      const svg = this.$refs.svg;
      if (svg?.clientWidth) this.svgSize = [svg.clientWidth, svg.clientHeight];
    },
    dayColor(key) {
      return `var(--map-day-${dayIndex(key) + 1})`;
    },
    dayInk(key) {
      return `var(--map-ink-${dayIndex(key) + 1}, #fff)`;
    },
    dayLetter: key => dayLetters[key],
    dayName(key) {
      return WEEKDAYS.find(([k]) => k === key)[1].toLowerCase();
    },
    daysText(keys) {
      return keys.map(key => dayShort[key]).join(" ");
    },
    areaDays(area) {
      return shownDays(area, this.day);
    },
    fillOf(area) {
      const days = this.areaDays(area);
      if (!days.length) return "var(--map-empty)";
      return days.length === 1 ? this.dayColor(days[0]) : "var(--map-many)";
    },
    isVillage: town => placeKey(town.place.name) !== placeKey(town.city.name),
    firstDay(route) {
      return WEEKDAYS.find(([key]) => route[key])[0];
    },
    routeDaysText: route => routeDays(route).join(", "),
    townRoutes(town) {
      return town.routes.filter(r => !this.day || r[this.day]);
    },
    slotText(town, route) {
      return slotOf(town.linkOf(route), route).text;
    },
    showTip(event, name, area) {
      const days = this.areaDays(area);
      const box = this.$el.querySelector(".rm-canvas").getBoundingClientRect();
      this.tip = {
        name,
        text: days.length ? days.map(this.dayName).join(", ") : "Sense servei",
        x: event.clientX - box.left + 12,
        y: event.clientY - box.top + 12
      };
    },
    selectComarca(comarca) {
      this.comarca = comarca;
      this.picked = null;
      this.tip = null;
      this.zoomTo(comarca ? zoomBox(comarca.box, this.map.size) : this.homeBox);
    },
    zoomTo(target) {
      cancelAnimationFrame(this.frame);
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        this.viewBox = target;
        return;
      }
      const from = [...this.viewBox];
      const start = performance.now();
      this.zooming = true;
      const step = now => {
        const t = Math.min(1, (now - start) / ZOOM_MS);
        const eased = 1 - (1 - t) ** 3;
        this.viewBox = from.map((v, i) => v + (target[i] - v) * eased);
        if (t < 1) this.frame = requestAnimationFrame(step);
        else this.zooming = false;
      };
      this.frame = requestAnimationFrame(step);
    },
    placeMatches(cityId) {
      const q = normalizeName(this.placeText[cityId]);
      if (q.length < 2) return [];
      return this.map.municipis.filter(m => normalizeName(m.name).includes(q)).slice(0, 8);
    },
    async savePlace(city, code) {
      this.saving = true;
      try {
        await service({ requiresAuth: true }).put(`cities/${city.id}`, { municipality_code: code });
        await this.getData();
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar", type: "is-danger", queue: false });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.route-map {
  --map-day-1: #2274d1;
  --map-day-2: #e0561f;
  --map-day-3: #17a673;
  --map-day-4: #dc9f00;
  --map-day-5: #9c2f94;
  --map-day-6: #008300;
  --map-day-7: #e34948;
  --map-ink-4: #1b1b1b;
  --map-empty: var(--a-chip);
  --map-many: #a9bcc0;
}
:global([data-theme="dark"] .route-map) {
  --map-day-1: #3987e5;
  --map-day-2: #e5533d;
  --map-day-3: #17a673;
  --map-day-4: #b58a00;
  --map-day-5: #b05cbc;
  --map-day-7: #e66767;
  --map-many: #4a5f62;
}
.rm-days {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .4rem;
  margin-bottom: 1rem;
}
.rm-day {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  padding: .25rem .7rem;
  border: 1px solid var(--a-line);
  border-radius: 999px;
  background: var(--a-surface);
  color: var(--a-fg-2);
  font: inherit;
  font-size: .85rem;
  cursor: pointer;
}
.rm-day.is-active {
  border-color: var(--a-accent);
  background: var(--a-accent-soft);
  color: var(--a-fg);
  font-weight: 600;
}
.rm-swatch,
.rm-dot {
  display: inline-block;
  flex: none;
  width: .7rem;
  height: .7rem;
  border-radius: 3px;
}
.rm-swatch.is-many {
  background: var(--map-many);
  vertical-align: -1px;
}
.rm-note {
  margin-left: .5rem;
  color: var(--a-muted);
  font-size: .8rem;
}
.rm-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24rem;
  gap: 1rem;
  align-items: start;
}
.rm-canvas {
  position: relative;
  padding: .75rem;
}
.rm-svg {
  display: block;
  width: 100%;
  height: calc(100vh - 17rem);
  min-height: 24rem;
}
.rm-back {
  position: absolute;
  z-index: 1;
  top: .75rem;
  left: .75rem;
  padding: .2rem .6rem;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  background: var(--a-surface);
  color: var(--a-fg-2);
  font: inherit;
  font-size: .85rem;
  cursor: pointer;
}
.rm-area {
  stroke: var(--a-surface);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  cursor: pointer;
  transition: opacity .2s;
}
.rm-area.is-muted {
  opacity: .35;
}
.rm-area:hover {
  stroke: var(--a-fg);
}
.rm-town {
  stroke-width: .75;
}
.rm-town.is-picked {
  stroke: var(--a-fg);
  stroke-width: 2;
}
.rm-outline {
  fill: none;
  stroke: var(--a-fg);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.rm-label {
  pointer-events: none;
}
.rm-label > text {
  fill: var(--a-fg);
  stroke: var(--a-surface);
  stroke-width: 3px;
  stroke-linejoin: round;
  paint-order: stroke;
  font-weight: 600;
}
.rm-tile {
  font-weight: 700;
}
.rm-tip {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  padding: .3rem .6rem;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  background: var(--a-surface);
  color: var(--a-fg-2);
  font-size: .8rem;
  pointer-events: none;
}
.rm-tip b {
  color: var(--a-fg);
}
.rm-side {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}
.rm-title {
  margin-bottom: .6rem;
  color: var(--a-fg);
  font-size: 1rem;
  font-weight: 600;
}
.rm-title small {
  color: var(--a-muted);
  font-weight: 400;
}
.rm-comarques li {
  display: flex;
  justify-content: space-between;
  gap: .75rem;
  padding: .25rem 0;
}
.rm-count {
  color: var(--a-muted);
  font-size: .8rem;
  text-align: right;
}
.rm-towns li {
  padding: .4rem .5rem;
  border-bottom: 1px solid var(--a-line-soft);
  border-radius: 6px;
}
.rm-towns li.is-picked {
  background: var(--a-accent-soft);
}
.rm-town-route {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .3rem;
  color: var(--a-fg-2);
  font-size: .8rem;
}
.rm-dot {
  width: .6rem;
  height: .6rem;
  border-radius: 50%;
}
.rm-unplaced {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 9rem auto;
  align-items: center;
  gap: .5rem;
  padding: .25rem 0;
}
.rm-source {
  margin-top: .5rem;
  color: var(--a-muted);
  font-size: .75rem;
}
@media (max-width: 1100px) {
  .rm-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .rm-side {
    position: static;
    max-height: none;
  }
  .rm-svg {
    height: 80vw;
    min-height: 20rem;
  }
}
</style>
