<template>
  <div class="home-page">
    <!-- Inici (mockup docs/redisseny-v2/screens/A-Inici.html): the menu entries the
         person pins with a star, in their order; saved in this browser (domain/home.js) -->
    <title-bar :title-stack="[greeting]" :subtitle="today">
      <span v-if="pins.saveFailed" class="home-saved is-failed" role="status">No s'ha pogut desar: queda només en aquest navegador</span>
      <span v-else-if="justSaved" class="home-saved" role="status">Desat</span>
      <b-button
        v-if="tiles.length > 1"
        :type="editing ? 'is-primary' : ''"
        :icon-left="editing ? 'check' : 'pencil-outline'"
        :aria-pressed="editing ? 'true' : 'false'"
        @click="editing = !editing"
      >
        {{ editing ? "Fet" : "Ordena els accessos" }}
      </b-button>
    </title-bar>

    <section class="section is-main-section">
      <section class="home-card" aria-labelledby="home-pins-title">
        <header class="home-card-head">
          <h2 id="home-pins-title">Els meus accessos</h2>
          <span v-if="tiles.length" class="has-text-muted">{{ tiles.length }} {{ tiles.length === 1 ? "fixat" : "fixats" }}</span>
        </header>
        <div class="home-tiles" :class="{ 'is-editing': editing }">
          <div
            v-for="(tile, index) in tiles"
            :key="tile.to"
            class="home-tile"
            :class="{ 'is-dragging': dragging === tile.to, 'is-drop-target': dropBefore === tile.to }"
            :data-to="tile.to"
            :draggable="editing ? 'true' : 'false'"
            @dragstart="dragStart(tile.to, $event)"
            @dragover.prevent="dragOver(tile.to)"
            @drop.prevent="dropOn(tile.to)"
            @dragend="dragEnd"
          >
            <span class="home-tile-icon"><b-icon :icon="tile.icon" custom-size="default" /></span>
            <router-link class="home-tile-link" :to="tile.to" :tabindex="editing ? -1 : null" @click="editing && $event.preventDefault()">
              <small>{{ tile.group }}</small>
              <b>{{ tile.label }}</b>
            </router-link>
            <span v-if="tile.tags.length" class="home-tile-tags">
              <span v-for="tag in tile.tags" :key="tag.text" class="tag" :class="tag.type">{{ tag.text }}</span>
            </span>
            <button
              type="button"
              class="home-star is-pinned"
              aria-pressed="true"
              :aria-label="`Treu de l'inici: ${tile.label}`"
              title="Treu de l'inici"
              @click="pins.toggle(tile.to)"
            >
              <b-icon icon="star" custom-size="default" />
            </button>
            <span v-if="editing" class="home-tile-move">
              <button type="button" :disabled="index === 0" :aria-label="`Mou ${tile.label} enrere`" @click="move(tile.to, -1)">
                <b-icon icon="arrow-left" custom-size="default" />
              </button>
              <button type="button" :disabled="index === tiles.length - 1" :aria-label="`Mou ${tile.label} endavant`" @click="move(tile.to, 1)">
                <b-icon icon="arrow-right" custom-size="default" />
              </button>
            </span>
          </div>
          <button type="button" class="home-tile home-tile-add" @click="focusSearch">
            <template v-if="tiles.length">+ Afegeix un accés</template>
            <template v-else>Encara no tens cap accés fixat.<br>Marca'n amb ★ a «Tot el menú».</template>
          </button>
        </div>
      </section>

      <section ref="all" class="home-card" aria-labelledby="home-all-title">
        <header class="home-card-head">
          <div>
            <h2 id="home-all-title">Tot el menú</h2>
            <p class="has-text-muted">Marca amb ★ el que vulguis tenir a l'inici. Al menú lateral, l'estrella només mostra què hi tens.</p>
          </div>
          <b-input
            ref="search"
            v-model="query"
            class="home-search"
            type="search"
            icon="magnify"
            placeholder="Cerca al menú…"
            aria-label="Cerca al menú"
          />
        </header>
        <div class="home-catalog">
          <section v-for="group in filteredGroups" :key="group.label">
            <h3>{{ group.label }}</h3>
            <ul>
              <li v-for="item in group.items" :key="item.to">
                <router-link :to="item.to"><b-icon :icon="item.icon" custom-size="default" />{{ item.label }}</router-link>
                <button
                  type="button"
                  class="home-star"
                  :class="{ 'is-pinned': pins.isPinned(item.to) }"
                  :aria-pressed="pins.isPinned(item.to) ? 'true' : 'false'"
                  :aria-label="(pins.isPinned(item.to) ? `Treu de l'inici: ` : `Fixa a l'inici: `) + item.label"
                  :title="pins.isPinned(item.to) ? `Treu de l'inici` : `Fixa a l'inici`"
                  @click="pins.toggle(item.to)"
                >
                  <b-icon :icon="pins.isPinned(item.to) ? 'star' : 'star-outline'" custom-size="default" />
                </button>
              </li>
            </ul>
          </section>
          <p v-if="!filteredGroups.length" class="has-text-muted">Cap entrada del menú conté «{{ query }}».</p>
        </div>
        <footer class="home-card-foot">
          <b id="home-landing">En entrar, obre</b>
          <div class="home-landing" role="radiogroup" aria-labelledby="home-landing">
            <label v-for="option in landingOptions" :key="option.value" class="radio">
              <input type="radio" name="home-landing" :value="option.value" :checked="pins.landing === option.value" @change="pins.setLanding(option.value)">
              {{ option.label }}
            </label>
          </div>
          <b-button size="is-small" type="is-text" @click="pins.reset()">Restableix els accessos</b-button>
        </footer>
      </section>
    </section>
  </div>
</template>

<script>
import { mapState } from "pinia";
import TitleBar from "@/components/TitleBar.vue";
import menu from "@/service/menu";
import { useMainStore } from "@/stores/main.js";
import { useHomePins } from "@/stores/homePins";
import { useTaskAlerts } from "@/stores/taskAlerts";
import { menuGroups, visiblePins } from "@/domain/home";
import { landingPath, storedPermissions, userPermissions } from "@/domain/routeAccess";

export default {
  name: "Inici",
  components: { TitleBar },
  data() {
    return {
      editing: false,
      query: "",
      dragging: null,
      dropBefore: null,
      justSaved: false,
      now: new Date()
    };
  },
  computed: {
    ...mapState(useMainStore, ["user", "userName"]),
    pins() {
      return useHomePins();
    },
    // App.vue's fresh /users/me, or the one saved at login until it comes
    permissions() {
      if (this.user && Array.isArray(this.user.permissions)) return userPermissions(this.user);
      return storedPermissions() || [];
    },
    groups() {
      return menuGroups(menu, this.permissions);
    },
    entries() {
      const byPath = {};
      this.groups.forEach(g => g.items.forEach(item => { byPath[item.to] = { ...item, group: g.label }; }));
      return byPath;
    },
    tiles() {
      return visiblePins(this.pins.pins, this.permissions)
        .filter(to => this.entries[to])
        .map(to => ({ ...this.entries[to], tags: this.tagsFor(to) }));
    },
    filteredGroups() {
      const q = this.query.trim().toLowerCase();
      if (!q) return this.groups;
      return this.groups
        .map(g => ({ ...g, items: g.label.toLowerCase().includes(q) ? g.items : g.items.filter(i => i.label.toLowerCase().includes(q)) }))
        .filter(g => g.items.length);
    },
    landingOptions() {
      const usual = this.entries[landingPath(this.permissions)];
      return [
        { value: "home", label: "L'inici" },
        { value: "usual", label: usual ? `${usual.label} (com fins ara)` : "La pàgina de sempre" },
        { value: "first", label: "El primer accés fixat" }
      ];
    },
    greeting() {
      const hour = this.now.getHours();
      const hello = hour < 14 ? "Bon dia" : hour < 21 ? "Bona tarda" : "Bona nit";
      const full = (this.user && this.user.fullname) || this.userName || "";
      const name = full.trim().split(/\s+/)[0];
      return name ? `${hello}, ${name}` : hello;
    },
    today() {
      const text = this.now.toLocaleDateString("ca-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  },
  watch: {
    "pins.savedAt"() {
      this.justSaved = true;
      clearTimeout(this.savedTimer);
      this.savedTimer = setTimeout(() => { this.justSaved = false; }, 1800);
    },
    tiles(list) {
      if (list.length < 2) this.editing = false;
    }
  },
  created() {
    this.pins.ensureLoaded();
  },
  beforeUnmount() {
    clearTimeout(this.savedTimer);
  },
  methods: {
    // the counts the menu already has (the Tasques dot)
    tagsFor(to) {
      if (to !== "/tasques") return [];
      const alerts = useTaskAlerts();
      const tags = [];
      if (alerts.overdue) tags.push({ text: `${alerts.overdue} ${alerts.overdue === 1 ? "vençuda" : "vençudes"}`, type: "is-danger" });
      if (alerts.fresh) tags.push({ text: `${alerts.fresh} ${alerts.fresh === 1 ? "novetat" : "novetats"}`, type: "is-info" });
      return tags;
    },
    move(to, delta) {
      this.pins.move(to, delta);
      this.$nextTick(() => {
        const button = this.$el.querySelector(`.home-tile[data-to="${to}"] .home-tile-move button:${delta < 0 ? "first-child" : "last-child"}`);
        if (button && !button.disabled) button.focus();
      });
    },
    dragStart(to, event) {
      if (!this.editing) return;
      this.dragging = to;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", to);
    },
    dragOver(to) {
      if (this.dragging) this.dropBefore = to === this.dragging ? null : to;
    },
    dropOn(to) {
      if (this.dragging) this.pins.drop(this.dragging, to);
      this.dragEnd();
    },
    dragEnd() {
      this.dragging = null;
      this.dropBefore = null;
    },
    focusSearch() {
      this.$refs.all.scrollIntoView({ behavior: "smooth", block: "start" });
      const input = this.$refs.search && this.$refs.search.$el.querySelector("input");
      if (input) input.focus({ preventScroll: true });
    }
  }
};
</script>

<style scoped>
.home-page :deep(.is-main-section) {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.home-saved {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
  font-size: .8125rem;
  color: var(--a-muted);
}
.home-saved::before {
  content: "";
  width: .4375rem;
  height: .4375rem;
  border-radius: 50%;
  background: var(--a-pos);
}
.home-saved.is-failed {
  color: var(--a-danger-fg);
}
.home-saved.is-failed::before {
  background: var(--a-neg);
}
.home-card {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
}
.home-card-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: .5rem 1rem;
  padding: .875rem 1.125rem;
  border-bottom: 1px solid var(--a-line);
}
.home-card-head h2 {
  font-size: 1rem;
  font-weight: 800;
}
.home-card-head p {
  font-size: .875rem;
}
.home-search {
  flex: 0 1 21rem;
}
.home-card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .625rem 1.25rem;
  padding: .75rem 1.125rem;
  border-top: 1px solid var(--a-line);
}
.home-landing {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem 1.25rem;
}
.home-landing .radio {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
  font-weight: 600;
}
.home-landing input {
  accent-color: var(--a-accent);
}
.home-card-foot > .button {
  margin-left: auto;
}

/* pinned tiles */
.home-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11.875rem, 1fr));
  gap: .75rem;
  padding: 1rem;
}
.home-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: .625rem;
  min-height: 7rem;
  padding: .875rem .875rem .875rem 1rem;
  border: 1px solid var(--a-line);
  border-radius: 12px;
  background: var(--a-surface);
  transition: border-color .12s, box-shadow .12s;
}
.home-tile:hover {
  border-color: var(--a-accent);
  box-shadow: 0 1px 2px rgba(16, 32, 30, .04), 0 8px 24px rgba(16, 32, 30, .06);
}
.home-tile:focus-within {
  outline: 3px solid var(--a-focus);
}
.home-tile-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9px;
  background: var(--a-accent-soft);
  color: var(--a-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.home-tile-icon :deep(.mdi::before) {
  font-size: 1.25rem;
}
.home-tile-link {
  display: flex;
  flex-direction: column;
  color: var(--a-fg);
}
/* the whole tile opens the page; the star and the arrows sit above it */
.home-tile-link::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
}
.home-tile-link:focus-visible {
  outline: none;
}
.home-tile-link small {
  color: var(--a-muted);
  font-size: .75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.home-tile-link b {
  color: var(--a-fg);
  font-size: .9375rem;
  font-weight: 800;
  line-height: 1.25;
}
.home-tile-tags {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: .25rem;
}
.home-tile > .home-star {
  position: absolute;
  top: .5rem;
  right: .5rem;
  z-index: 1;
}
.home-tile-move {
  position: absolute;
  bottom: .5rem;
  right: .5rem;
  z-index: 1;
  display: inline-flex;
  gap: .125rem;
}
.home-tile-move button {
  width: 1.625rem;
  height: 1.625rem;
  padding: 0;
  border: 1px solid var(--a-line);
  border-radius: 6px;
  background: var(--a-surface);
  color: var(--a-fg-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.home-tile-move button:disabled {
  opacity: .4;
  cursor: default;
}
.is-editing .home-tile:not(.home-tile-add) {
  cursor: grab;
  border-style: dashed;
  /* room for the arrows (.5rem + 1.625rem) so they don't cover a long label */
  padding-bottom: 2.5rem;
}
.is-editing .home-tile-link::after {
  display: none;
}
.home-tile.is-dragging {
  opacity: .4;
}
.home-tile.is-drop-target {
  box-shadow: -4px 0 0 var(--a-accent);
}
.home-tile-add {
  align-items: center;
  justify-content: center;
  text-align: center;
  border-style: dashed;
  background: transparent;
  color: var(--a-muted);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.home-tile-add:hover {
  color: var(--a-accent);
}
/* phones: two tiles a row */
@media screen and (max-width: 768px) {
  .home-tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: .5rem;
    padding: .75rem;
  }
  .home-tile {
    min-height: 6.25rem;
    padding: .75rem;
  }
}

/* the whole menu */
.home-catalog {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: .5rem 1.5rem;
  padding: 1rem 1.125rem 1.25rem;
}
.home-catalog h3 {
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--a-muted);
  padding: .5rem .375rem .375rem;
}
.home-catalog li {
  display: flex;
  align-items: center;
  gap: .5rem;
  min-height: 2.125rem;
  padding: 0 .25rem 0 .375rem;
  border-radius: 8px;
}
.home-catalog li:hover {
  background: var(--a-thead);
}
.home-catalog li a {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: .5rem;
  color: var(--a-fg-2);
  font-weight: 600;
}
.home-catalog li a .icon {
  color: var(--a-muted);
}
.home-catalog li a :deep(.mdi::before) {
  font-size: 1rem;
}

.home-star {
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--a-placeholder);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.home-star:hover {
  background: var(--a-chip);
  color: var(--a-fg-2);
}
.home-star.is-pinned {
  color: var(--a-star);
}
.home-star :deep(.mdi::before) {
  font-size: 1.0625rem;
}
</style>
