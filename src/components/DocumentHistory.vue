<!-- A document's «Historial» (issues/161): the statuses it went through and
     who changed what, and when, from the backend's change log. Read only when
     opened, a page at a time, so a 1000-line invoice's form stays light. -->
<template>
  <card-component class="tile is-child" title="Historial">
    <p v-if="!opened" class="box-empty">
      <b-button size="is-small" @click="open">Mostra l'historial</b-button>
    </p>
    <p v-else-if="isLoading && !rows.length" class="box-empty">Carregant…</p>
    <p v-else-if="failed" class="box-empty">No s'ha pogut carregar l'historial.</p>
    <p v-else-if="!rows.length" class="box-empty">Encara no hi ha cap canvi registrat.</p>
    <template v-else>
      <h3 class="history-title">Estats</h3>
      <ol class="history-steps">
        <li v-for="(step, i) in steps" :key="i">
          <b>{{ step.label }}</b>
          <small>{{ step.when }}<template v-if="step.who"> · {{ step.who }}</template></small>
        </li>
      </ol>

      <h3 class="history-title">Canvis <span class="box-hint">{{ total }}</span></h3>
      <ol class="history">
        <li v-for="entry in entries" :key="entry.id">
          <div class="history-head">
            <b>{{ entry.title }}</b>
            <small>{{ entry.when }} · {{ entry.who }}</small>
          </div>
          <p v-if="entry.detail" class="history-detail">{{ entry.detail }}</p>
          <ul v-if="entry.changes.length" class="history-changes">
            <history-change v-for="change in entry.changes" :key="change.field" :change="change" />
          </ul>
        </li>
      </ol>
      <b-button v-if="rows.length < total" size="is-small" type="is-text" :loading="isLoading" @click="loadMore">
        Carrega'n més ({{ total - rows.length }})
      </b-button>
    </template>
  </card-component>
</template>

<script>
import service from "@/service/index";
import CardComponent from "@/components/CardComponent.vue";
import HistoryChange from "@/components/HistoryChange.vue";
import { historyEntries, timeline } from "@/domain/documentHistory";

// a page: an invoice seldom has more, so the statuses come whole
const PAGE = 200;

export default {
  name: "DocumentHistory",
  components: { CardComponent, HistoryChange },
  props: {
    // emitted-invoice, received-invoice, received-income, received-expense, quote
    entity: { type: String, required: true },
    documentId: { type: [Number, String], required: true },
    // bump it after a save to read the history again
    refreshKey: { type: [Number, String], default: 0 }
  },
  data() {
    return { opened: false, rows: [], total: 0, rectifiedBy: [], isLoading: false, failed: false };
  },
  computed: {
    entries() {
      return historyEntries(this.entity, this.rows);
    },
    steps() {
      return timeline(this.entity, this.rows, this.rectifiedBy);
    }
  },
  watch: {
    documentId() {
      if (this.opened) this.load();
    },
    refreshKey() {
      if (this.opened) this.load();
    }
  },
  methods: {
    open() {
      this.opened = true;
      this.load();
    },
    async fetchPage(start) {
      const r = await service({ requiresAuth: true }).get(
        `document-change-logs/history/${this.entity}/${this.documentId}?start=${start}&limit=${PAGE}`
      );
      return r.data || {};
    },
    async load() {
      if (!this.documentId) return;
      this.isLoading = true;
      this.failed = false;
      try {
        const page = await this.fetchPage(0);
        this.rows = page.entries || [];
        this.total = page.total || 0;
        this.rectifiedBy = page.rectifiedBy || [];
      } catch (e) {
        this.failed = true;
      } finally {
        this.isLoading = false;
      }
    },
    async loadMore() {
      this.isLoading = true;
      try {
        const page = await this.fetchPage(this.rows.length);
        this.rows = [...this.rows, ...(page.entries || [])];
        this.total = page.total || this.total;
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
.history-title {
  margin: .75rem 0 .375rem;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .02em;
  text-transform: uppercase;
  color: var(--a-muted);
}
.history-title:first-child {
  margin-top: 0;
}
/* lists without numbers: they sat in the box padding */
.history,
.history-steps {
  list-style: none;
  margin: 0;
  padding: 0;
}
.history-steps li {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 .5rem;
  padding: 0 0 .5rem 1rem;
  font-size: .8125rem;
}
.history-steps li::before {
  content: "";
  position: absolute;
  left: .125rem;
  top: .4rem;
  width: .4rem;
  height: .4rem;
  border-radius: 50%;
  background: var(--a-accent, var(--a-fg-2));
}
.history-steps li:not(:last-child)::after {
  content: "";
  position: absolute;
  left: .29rem;
  top: .9rem;
  bottom: 0;
  border-left: 1px solid var(--a-line-soft);
}
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
.history-head b {
  font-size: .875rem;
}
.history-head small,
.history-steps small,
.history-detail {
  font-size: .75rem;
  color: var(--a-muted);
}
.history-changes {
  margin-top: .25rem;
}
</style>
