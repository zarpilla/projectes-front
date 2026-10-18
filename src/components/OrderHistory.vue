<!-- The order form's «Historial» (issues/119): who changed what on the order,
     and when, from the backend's change log. -->
<template>
  <section class="a-box">
    <header class="box-head">
      <h2>Historial</h2>
      <span v-if="entries.length" class="box-hint">{{ entries.length }} {{ entries.length === 1 ? "canvi" : "canvis" }}</span>
    </header>
    <p v-if="isLoading && !entries.length" class="box-empty">Carregant…</p>
    <p v-else-if="failed" class="box-empty">No s'ha pogut carregar l'historial.</p>
    <p v-else-if="!entries.length" class="box-empty">Encara no hi ha cap canvi registrat.</p>
    <ol v-else class="history">
      <li v-for="entry in visibleEntries" :key="entry.id">
        <div class="history-head">
          <b>{{ entry.title }}</b>
          <small>{{ entry.when }} · {{ entry.who }}</small>
        </div>
        <p v-if="entry.detail" class="history-detail">{{ entry.detail }}</p>
        <ul v-if="entry.changes.length" class="history-changes">
          <li v-for="change in entry.changes" :key="change.field">
            <span class="history-field">{{ change.label }}</span>
            <span class="history-from">{{ change.from }}</span>
            <b-icon icon="arrow-right" size="is-small" />
            <span class="history-to">{{ change.to }}</span>
          </li>
        </ul>
      </li>
    </ol>
    <b-button v-if="entries.length > limit && !showAll" size="is-small" type="is-text" @click="showAll = true">
      Mostra'ls tots ({{ entries.length }})
    </b-button>
  </section>
</template>

<script>
import service from "@/service/index";
import { historyEntries } from "@/domain/orderHistory";

export default {
  name: "OrderHistory",
  props: {
    orderId: { type: [Number, String], required: true },
    // bump it after a save to read the history again
    refreshKey: { type: [Number, String], default: 0 }
  },
  data() {
    return { entries: [], isLoading: false, failed: false, showAll: false, limit: 10 };
  },
  computed: {
    visibleEntries() {
      return this.showAll ? this.entries : this.entries.slice(0, this.limit);
    }
  },
  watch: {
    orderId: "load",
    refreshKey: "load"
  },
  mounted() {
    this.load();
  },
  methods: {
    async load() {
      if (!this.orderId) return;
      this.isLoading = true;
      this.failed = false;
      try {
        const r = await service({ requiresAuth: true }).get(`orders/${this.orderId}/history`);
        this.entries = historyEntries(r.data);
      } catch (e) {
        this.failed = true;
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.history > li + li {
  margin-top: .75rem;
  padding-top: .75rem;
  border-top: 1px solid var(--a-line-soft);
}
.history-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: .25rem .5rem;
}
.history-head small,
.history-detail {
  font-size: .75rem;
  color: var(--a-muted);
}
.history-changes {
  margin-top: .25rem;
}
.history-changes li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .25rem .375rem;
  font-size: .8125rem;
}
.history-field {
  font-weight: 700;
  color: var(--a-fg-2);
}
.history-field::after {
  content: ":";
}
.history-from {
  color: var(--a-muted);
  text-decoration: line-through;
}
.history-to {
  color: var(--a-fg);
}
</style>
