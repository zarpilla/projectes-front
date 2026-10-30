<template>
  <!-- Project summary of the redesign: four figure cards (executed value first, then
       forecast and original) and the full table below. Figures: domain/projectSummary. -->
  <section class="project-summary-cards" aria-label="Resum financer">
    <div class="summary-head">
      <h2>Resum financer</h2>
      <div v-if="years.length" class="segmented" role="group" aria-label="Període">
        <button type="button" :class="{ 'is-on': year === 'TOTS' }" :aria-pressed="year === 'TOTS' ? 'true' : 'false'" @click="$emit('update:year', 'TOTS')">Total</button>
        <button
          v-for="y in years"
          :key="y.value"
          type="button"
          :class="{ 'is-on': year === y.value }"
          :aria-pressed="year === y.value ? 'true' : 'false'"
          @click="$emit('update:year', y.value)"
        >
          {{ y.label }}
        </button>
      </div>
    </div>

    <div class="kpis">
      <article class="kpi">
        <h3>Resultat</h3>
        <span class="kpi-label">Executat</span>
        <span class="kpi-value" :class="'has-text-' + sign(s.real.result)">{{ money(s.real.result) }}</span>
        <dl>
          <dt>Previst</dt><dd :class="'has-text-' + sign(s.estimated.result)">{{ money(s.estimated.result) }}</dd>
          <dt>Original</dt><dd :class="'has-text-' + sign(s.original.result)">{{ money(s.original.result) }}</dd>
          <dt>Desviació</dt><dd :class="'has-text-' + sign(s.real.result - s.estimated.result)">{{ money(s.real.result - s.estimated.result) }}</dd>
        </dl>
      </article>
      <article class="kpi">
        <h3>Ingressos</h3>
        <span class="kpi-label">Executats</span>
        <span class="kpi-value">{{ money(s.real.incomes) }}</span>
        <dl>
          <dt>Previstos</dt><dd>{{ money(s.estimated.incomes) }}</dd>
          <dt>Originals</dt><dd>{{ money(s.original.incomes) }}</dd>
          <dt>Del previst</dt><dd>{{ percent(s.real.incomes, s.estimated.incomes) }}</dd>
          <template v-if="billingMode === 'hours'">
            <dt title="Hores fetes × preu/hora, menys el que ja s'ha facturat">Per facturar</dt><dd class="pending-invoice">{{ money(pending) }}</dd>
          </template>
        </dl>
      </article>
      <article class="kpi">
        <h3>Despeses</h3>
        <span class="kpi-label">Executades</span>
        <span class="kpi-value">{{ money(s.real.expenses) }}</span>
        <dl>
          <dt>Previstes</dt><dd>{{ money(s.estimated.expenses) }}</dd>
          <dt>Originals</dt><dd>{{ money(s.original.expenses) }}</dd>
          <dt>Del previst</dt><dd>{{ percent(s.real.expenses, s.estimated.expenses) }}</dd>
        </dl>
      </article>
      <article class="kpi">
        <h3>Hores</h3>
        <span class="kpi-label">Executades</span>
        <span class="kpi-value">{{ hours(s.real.hours) }}</span>
        <div v-if="s.estimated.hours" class="kpi-bar" :title="percent(s.real.hours, s.estimated.hours) + ' de les previstes'">
          <span :class="{ over: s.real.hours > s.estimated.hours }" :style="{ width: Math.min(100, (s.real.hours / s.estimated.hours) * 100) + '%' }"></span>
        </div>
        <dl>
          <dt>Previstes</dt><dd>{{ hours(s.estimated.hours) }}</dd>
          <dt>Originals</dt><dd>{{ hours(s.original.hours) }}</dd>
          <dt>Cost/hora</dt><dd>{{ money(s.real.costPerHour) }}</dd>
          <!-- issues/371: (ingressos − factures de despesa) / hores -->
          <dt title="(Ingressos − despeses) / hores">Preu/hora</dt><dd class="effective-price">{{ money(s.real.pricePerHour) }}</dd>
          <dt title="(Ingressos − despeses) / hores previstes">Preu/hora previst</dt><dd class="effective-price-estimated">{{ money(s.estimated.pricePerHour) }}</dd>
        </dl>
      </article>
    </div>

    <div class="card summary-table">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Concepte</th>
              <th scope="col" class="has-text-right">Original</th>
              <th scope="col" class="has-text-right">Previst</th>
              <th scope="col" class="has-text-right">Executat</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.label" :class="{ 'is-sub': row.sub }">
              <th scope="row">{{ row.label }}</th>
              <td v-for="kind in kinds" :key="kind" class="has-text-right" :class="row.signed ? 'has-text-' + sign(s[kind][row.key]) : ''">
                {{ row.hours ? hours(s[kind][row.key]) : money(s[kind][row.key]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script>
import { projectSummary } from '@/domain/projectSummary.js'
import { pendingToInvoice } from '@/domain/hoursBudget.js'
import { formatMoney, formatNumber, sign } from '@/helpers/format-number'

export default {
  name: 'ProjectSummaryCards',
  emits: ['update:year'],
  props: {
    // the project (or one year of allByYear): the totals the summary card used
    totals: {
      type: Object,
      default: null
    },
    // [{ value, label }] for the year selector; empty hides it
    years: {
      type: Array,
      default: () => []
    },
    year: {
      type: [String, Number],
      default: 'TOTS'
    },
    // issues/371: «Per hores» shows what is left to invoice
    billingMode: {
      type: String,
      default: 'project'
    },
    pricePerHour: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      kinds: ['original', 'estimated', 'real'],
      rows: [
        { label: 'Resultat', key: 'result', signed: true },
        { label: 'Ingressos', key: 'incomes' },
        { label: 'Despeses totals', key: 'expenses' },
        { label: 'Factures', key: 'invoices', sub: true },
        { label: 'IVA no deduïble (prorrata)', key: 'prorata', sub: true },
        { label: 'Cost de les hores', key: 'hoursCost', sub: true },
        { label: 'Hores', key: 'hours', hours: true },
        { label: 'Cost/hora', key: 'costPerHour' },
        { label: 'Preu/hora', key: 'pricePerHour' }
      ]
    }
  },
  computed: {
    s () {
      return projectSummary(this.totals)
    },
    pending () {
      return pendingToInvoice(this.s.real.hours, this.pricePerHour, this.s.real.incomes)
    }
  },
  methods: {
    sign,
    money: formatMoney,
    // always two decimals: «3.307,60 h» next to «3.574,33 h» (issues/127)
    hours: value => formatNumber(value, 2, 2) + ' h',
    percent (value, of) {
      return of ? formatNumber((value / of) * 100, 0) + ' %' : '—'
    }
  }
}
</script>

<style scoped>
.project-summary-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.summary-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: .75rem;
}
.summary-head h2 {
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--a-fg);
}
.segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--a-seg);
}
.segmented button {
  height: 2rem;
  padding: 0 .75rem;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font: inherit;
  font-size: .875rem;
  font-weight: 600;
  color: var(--a-fg-2);
  cursor: pointer;
}
.segmented button.is-on {
  background: var(--a-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
  font-weight: 800;
  color: var(--a-fg);
}
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 1rem;
}
.kpi {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: .25rem;
  font-variant-numeric: tabular-nums;
}
.kpi h3 {
  font-size: .9375rem;
  font-weight: 800;
  color: var(--a-fg-2);
  margin-bottom: .25rem;
}
.kpi-label {
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-muted);
}
.kpi-value {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--a-fg);
}
.kpi-bar {
  height: 6px;
  margin: .25rem 0 .125rem;
  border-radius: 3px;
  background: var(--a-seg);
  overflow: hidden;
}
.kpi-bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--a-accent);
}
.kpi-bar span.over {
  background: var(--a-over);
}
.kpi dl {
  margin: .5rem 0 0;
  padding-top: .5rem;
  border-top: 1px solid var(--a-line-soft);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .25rem .75rem;
  font-size: .875rem;
}
.kpi dt {
  color: var(--a-muted);
}
.kpi dd {
  margin: 0;
  text-align: right;
  font-weight: 700;
}
.summary-table {
  overflow: hidden;
}
.summary-table .table {
  width: 100%;
  margin: 0;
}
.summary-table tbody th {
  font-weight: 700;
  color: var(--a-fg);
}
.summary-table tr.is-sub th {
  font-weight: 600;
  color: var(--a-fg-2);
  padding-left: 2rem;
}
.summary-table td {
  font-weight: 700;
  white-space: nowrap;
}
.summary-table tr.is-sub td {
  font-weight: 600;
  color: var(--a-fg-2);
}
</style>
