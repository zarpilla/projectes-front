<!-- One change of a history entry (issues/119, issues/161): field: from → to,
     or, for the lines, a summary that opens on the changed lines. -->
<template>
  <li class="history-change">
    <span class="history-field">{{ change.label }}</span>
    <template v-if="change.summary">
      <span class="history-to">{{ change.summary }}</span>
      <b-button v-if="change.details && change.details.length" size="is-small" type="is-text" class="history-toggle" @click="open = !open">
        {{ open ? "Amaga" : "Detall" }}
      </b-button>
      <ul v-if="open" class="history-lines">
        <li v-for="(text, i) in change.details" :key="i">{{ text }}</li>
        <li v-if="change.hidden" class="history-more">i {{ change.hidden }} més</li>
      </ul>
    </template>
    <template v-else>
      <span class="history-from">{{ change.from }}</span>
      <b-icon icon="arrow-right" size="is-small" />
      <span class="history-to">{{ change.to }}</span>
    </template>
  </li>
</template>

<script>
export default {
  name: "HistoryChange",
  props: {
    change: { type: Object, required: true }
  },
  data() {
    return { open: false };
  }
};
</script>

<style scoped>
.history-change {
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
.history-toggle {
  height: auto;
  padding: 0 .25rem;
  font-size: .75rem;
}
.history-lines {
  flex-basis: 100%;
  margin: .125rem 0 0 .75rem;
  font-size: .75rem;
  color: var(--a-fg-2);
}
.history-more {
  color: var(--a-muted);
}
</style>
