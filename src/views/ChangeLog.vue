<template>
  <div>
    <title-bar :title-stack="['Altres', 'Novetats']" :subtitle="subtitle">
      <b-button icon-left="message-alert-outline" @click="report">Comunica un error o una idea</b-button>
    </title-bar>
    <section class="section is-main-section">
      <!-- Redesign A: search, filter by type, dates as cards and an index by year -->
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <b-input v-model="search" class="filter-search" icon="magnify" placeholder="Cerca (p. ex. tresoreria, factures…)" aria-label="Cerca" />
        <div class="segmented" role="group" aria-label="Tipus">
          <button v-for="t in types" :key="t.id" type="button" :class="{ 'is-on': type === t.id }" @click="type = t.id">{{ t.label }} · {{ t.count }}</button>
        </div>
      </form>

      <div class="news-layout">
        <div class="news-days">
          <section v-for="entry in shownEntries" :key="entry.date" :id="'d-' + entry.date" class="news-day">
            <header>
              <h2>{{ dateLabel(entry.date) }}</h2>
              <span class="has-text-muted">{{ entry.items.length }} {{ entry.items.length === 1 ? "canvi" : "canvis" }}</span>
            </header>
            <ul>
              <li v-for="(item, index) in entry.items" :key="index">
                <span class="tag" :class="tagClass(item.type)">{{ item.type }}</span>
                <p>
                  <template v-if="typeof item.text === 'string'">{{ item.text }}</template>
                  <template v-else>
                    <template v-for="(segment, segIndex) in item.text" :key="segIndex">
                      <template v-if="typeof segment === 'string'">{{ segment }}</template>
                      <router-link v-else-if="segment.to" :to="segment.to">{{ segment.label }}</router-link>
                      <b v-else-if="segment.tag === 'b'">{{ segment.text }}</b>
                    </template>
                  </template>
                </p>
              </li>
            </ul>
          </section>
          <p v-if="!filtered.length" class="has-text-muted">Cap canvi amb aquests filtres.</p>
          <div v-if="filtered.length > shownEntries.length" class="news-more">
            <b-button @click="limit += 10">Mostra canvis anteriors</b-button>
          </div>
        </div>

        <nav class="news-years" aria-label="Per any">
          <p class="news-years-title">Per any</p>
          <button
            v-for="y in years"
            :key="y.year"
            type="button"
            :class="{ 'is-on': year === y.year }"
            @click="year = year === y.year ? null : y.year"
          >
            <span>{{ y.year }}</span><span class="has-text-muted">{{ y.count }}</span>
          </button>
        </nav>
      </div>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import { CHANGELOG, changelogDate } from "@/service/changelog";
import { openTickets, ticketsErrorMessage } from "@/service/tickets";

const textOf = item =>
  typeof item.text === "string"
    ? item.text
    : (item.text || []).map(s => (typeof s === "string" ? s : s.label || s.text || "")).join("");

export default {
  name: "ChangeLog",
  components: { TitleBar },
  data() {
    return {
      changeLog: CHANGELOG,
      search: "",
      type: "all",
      year: null,
      limit: 10
    };
  },
  computed: {
    allItems() {
      return this.changeLog.flatMap(e => e.items);
    },
    types() {
      const count = t => this.allItems.filter(i => i.type === t).length;
      return [
        { id: "all", label: "Tots", count: this.allItems.length },
        { id: "Novetats", label: "Novetats", count: count("Novetats") },
        { id: "Millores", label: "Millores", count: count("Millores") },
        { id: "Correccions", label: "Correccions", count: count("Correccions") }
      ];
    },
    years() {
      const counts = {};
      this.changeLog.forEach(e => {
        const y = e.date.slice(0, 4);
        counts[y] = (counts[y] || 0) + e.items.length;
      });
      return Object.keys(counts).sort().reverse().map(year => ({ year, count: counts[year] }));
    },
    filtered() {
      const q = this.search.trim().toLowerCase();
      return this.changeLog
        .filter(e => !this.year || e.date.startsWith(this.year))
        .map(e => ({
          ...e,
          items: e.items.filter(i =>
            (this.type === "all" || i.type === this.type) && (!q || textOf(i).toLowerCase().includes(q)))
        }))
        .filter(e => e.items.length);
    },
    shownEntries() {
      return this.filtered.slice(0, this.limit);
    },
    subtitle() {
      const last = this.changeLog[0];
      const first = this.changeLog[this.changeLog.length - 1];
      return `Què ha canviat a l'aplicació · darrera actualització ${last ? this.dateLabel(last.date) : "—"} · ${this.allItems.length} canvis des de ${first ? first.date.slice(0, 4) : ""}`;
    }
  },
  watch: {
    search() { this.limit = 10; },
    type() { this.limit = 10; },
    year() { this.limit = 10; }
  },
  methods: {
    dateLabel: changelogDate,
    tagClass(type) {
      return { Novetats: "is-success is-light", Millores: "is-info is-light", Correccions: "is-warning is-light" }[type] || "";
    },
    async report() {
      try {
        await openTickets();
      } catch (error) {
        this.$buefy.snackbar.open({ message: ticketsErrorMessage(error), type: "is-danger", queue: false });
      }
    }
  }
};
</script>

<style scoped>
.news-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 12rem;
  gap: 1.5rem;
  align-items: start;
}
.news-days {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 52rem;
}
.news-day {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
}
.news-day header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: .875rem 1.25rem;
  border-bottom: 1px solid var(--a-line);
}
.news-day h2 {
  font-size: 1rem;
  font-weight: 800;
}
.news-day header span {
  font-size: .8125rem;
}
.news-day ul {
  padding: 0 1.25rem;
}
.news-day li {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 1rem;
  padding: .75rem 0;
  border-bottom: 1px solid var(--a-line-soft);
  font-size: .875rem;
}
.news-day li:last-child {
  border-bottom: 0;
}
.news-day li .tag {
  justify-self: start;
  font-size: .6875rem;
}
.news-day a {
  font-weight: 700;
  text-decoration: underline;
}
.news-more {
  text-align: center;
}
.news-years {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.news-years-title {
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--a-muted);
  padding: 0 .625rem .375rem;
}
.news-years button {
  display: flex;
  justify-content: space-between;
  padding: .375rem .625rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: .875rem;
  font-weight: 600;
  color: var(--a-fg-2);
  cursor: pointer;
}
.news-years button:hover {
  background: var(--a-chip);
}
.news-years button.is-on {
  background: var(--a-accent-soft);
  color: var(--a-accent);
  font-weight: 800;
}
@media screen and (max-width: 1023px) {
  .news-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .news-years {
    display: none;
  }
  .news-day li {
    grid-template-columns: minmax(0, 1fr);
    gap: .375rem;
  }
}
</style>
