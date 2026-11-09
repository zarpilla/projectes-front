<template>
  <!-- «Salda» of IVA and IRPF (issues/418, issues/419): the sum of the
       documents ticked, whatever the filter shows, the payment date and the
       button -->
  <section class="a-box settle-bar" aria-label="Saldar">
    <div class="settle-sum" aria-live="polite">
      <b class="settle-count">{{ countLabel }}</b>
      <dl v-if="count" class="settle-figures">
        <div v-for="f in figures" :key="f.label" :class="{ 'is-total': f.total }">
          <dt>{{ f.label }}</dt>
          <dd>{{ f.value }}</dd>
        </div>
      </dl>
      <span v-else class="settle-hint">{{ hint }}</span>
      <small v-if="outside" class="settle-outside">{{ outside }} fora del filtre</small>
    </div>
    <div class="settle-actions">
      <b-button size="is-small" type="is-text" :disabled="!pendingInView" @click="$emit('check-view')">
        Marca els pendents de la llista
      </b-button>
      <b-button v-if="count" size="is-small" type="is-text" @click="$emit('clear')">Desmarca-ho tot</b-button>
      <b-datepicker
        v-model="date"
        aria-label="Data de pagament"
        placeholder="Data de pagament"
        icon="calendar-today"
        :locale="'ca-ES'"
        :first-day-of-week="1"
        class="settle-date"
      />
      <b-button type="is-primary" :loading="loading" :disabled="!count || loading || !date" @click="$emit('settle', date)">
        Salda{{ count ? ` ${countLabel}` : "" }}
      </b-button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'SettleBar',
  props: {
    count: { type: Number, default: 0 },
    // [{ label, value, total }]
    figures: { type: Array, default: () => [] },
    // ticked but hidden by the filter
    outside: { type: Number, default: 0 },
    // pending rows in the list as filtered
    pendingInView: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    hint: { type: String, default: 'Marca els documents pendents per saldar-los.' }
  },
  emits: ['settle', 'check-view', 'clear'],
  data () {
    return { date: new Date() }
  },
  computed: {
    countLabel () {
      return `${this.count} ${this.count === 1 ? 'document' : 'documents'}`
    }
  }
}
</script>

<style scoped>
.settle-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .75rem 1.5rem;
  margin-bottom: 1rem;
  padding: .875rem 1.25rem;
}
.settle-sum {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: .375rem 1.25rem;
  font-variant-numeric: tabular-nums;
}
.settle-figures {
  display: flex;
  flex-wrap: wrap;
  gap: .25rem 1.25rem;
  margin: 0;
}
.settle-figures div {
  display: flex;
  gap: .375rem;
  align-items: baseline;
}
.settle-figures dt {
  font-size: .8125rem;
  color: var(--a-muted);
}
.settle-figures dd {
  margin: 0;
  font-weight: 700;
}
.settle-figures .is-total dd {
  font-weight: 800;
  font-size: 1.0625rem;
}
.settle-hint,
.settle-outside {
  color: var(--a-muted);
  font-size: .875rem;
}
.settle-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
}
.settle-date {
  width: 10rem;
}
</style>
