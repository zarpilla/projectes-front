<template>
  <!-- Informes › Ingressos i despeses: the figures of the pivot below as KPIs and
       charts (per month or year, per project, per kind of expense) -->
  <div class="ed-charts">
    <div class="ed-head">
      <div v-if="dataType === 'Totes'" class="segmented" role="group" aria-label="Escenari dels gràfics">
        <button
          v-for="s in scenarioOptions"
          :key="s.id"
          type="button"
          :class="{ 'is-on': scenario === s.id }"
          :aria-pressed="scenario === s.id ? 'true' : 'false'"
          @click="chosen = s.id"
        >{{ s.label }}</button>
      </div>
      <span v-else class="ed-scenario">{{ scenarioLabel }}</span>
      <span class="has-text-muted ed-count">{{ rows.length }} línies · {{ projectCount }} projectes</span>
    </div>

    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Ingressos</span>
        <b>{{ money(total.income) }}</b>
        <small v-if="compare">{{ compareLabel }} {{ money(compare.income) }}</small>
      </div>
      <div class="doc-kpi">
        <span>Despeses</span>
        <b>{{ money(total.expenses) }}</b>
        <small>factures i altres, amb l'IVA no deduïble</small>
      </div>
      <div class="doc-kpi">
        <span>Cost de les hores</span>
        <b>{{ money(total.hours) }}</b>
        <small v-if="total.income">{{ pct(total.hours / total.income) }} dels ingressos</small>
      </div>
      <div class="doc-kpi">
        <span>Resultat</span>
        <b :class="total.result < 0 ? 'has-text-neg' : 'has-text-pos'">{{ money(total.result) }}</b>
        <small v-if="compare">{{ compareLabel }} {{ money(compare.result) }}</small>
        <small v-else-if="total.income">marge del {{ pct(total.result / total.income) }}</small>
      </div>
    </div>

    <div class="ed-grid">
      <section class="a-box ed-wide">
        <header class="box-head">
          <h2>Ingressos i despeses per {{ byYear ? "any" : "mes" }}</h2>
          <span class="box-hint">Les despeses inclouen el cost de les hores · la línia és el resultat acumulat</span>
        </header>
        <div class="ed-chart is-tall">
          <bar-chart v-if="rows.length" chart-id="ed-periods" :chart-data="periodChart" :extra-options="periodOptions" />
          <p v-else class="box-empty">No hi ha dades amb aquests filtres.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Resultat per projecte</h2>
          <span class="box-hint">Els {{ projects.length }} amb més pes</span>
        </header>
        <div class="ed-chart" :style="{ height: barsHeight(projects.length) }">
          <bar-chart v-if="projects.length" chart-id="ed-projects" :chart-data="projectChart" :extra-options="horizontalOptions" />
          <p v-else class="box-empty">Cap projecte amb imports.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>On van les despeses</h2>
          <span class="box-hint">Per tipus de despesa, amb les hores</span>
        </header>
        <div class="ed-chart" :style="{ height: barsHeight(expenseTypes.length) }">
          <bar-chart v-if="expenseTypes.length" chart-id="ed-expenses" :chart-data="expenseChart" :extra-options="horizontalOptions" />
          <p v-else class="box-empty">Cap despesa.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import BarChart from '@/components/Charts/BarChart.js'
import { SCENARIOS, totals, byPeriod, byProject, byExpenseType } from '@/domain/economicDetailCharts'
import { formatMoney } from '@/helpers/format-number'

const SCENARIO_OF = { Previsió: 'prev', Execució: 'exec' }

// chart colours from the theme tokens (they change with the dark theme)
const token = (name, fallback) => {
  const v = typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export default {
  name: 'EconomicDetailCharts',
  components: { BarChart },
  props: {
    rows: { type: Array, default: () => [] },
    year: { type: [String, Number], default: null },
    dataType: { type: String, default: 'Totes' }
  },
  data () {
    return {
      chosen: 'exec',
      themeTick: 0
    }
  },
  computed: {
    scenario () {
      return SCENARIO_OF[this.dataType] || this.chosen
    },
    scenarioLabel () {
      return SCENARIOS[this.scenario].label
    },
    scenarioOptions () {
      return [{ id: 'exec', label: 'Executat' }, { id: 'prev', label: 'Previst' }]
    },
    byYear () {
      return this.year === 'Tots' || new Set(this.rows.map(r => r.year)).size > 1
    },
    projectCount () {
      return new Set(this.rows.map(r => r.project_name)).size
    },
    total () {
      return totals(this.rows, this.scenario)
    },
    // with «Totes», the other scenario next to the KPIs
    compare () {
      if (this.dataType !== 'Totes') return null
      return totals(this.rows, this.scenario === 'exec' ? 'prev' : 'exec')
    },
    compareLabel () {
      return this.scenario === 'exec' ? 'previst' : 'executat'
    },
    periods () {
      return byPeriod(this.rows, this.scenario, { byYear: this.byYear })
    },
    projects () {
      return byProject(this.rows, this.scenario, 10)
    },
    expenseTypes () {
      return byExpenseType(this.rows, this.scenario, 8)
    },
    colors () {
      // eslint-disable-next-line no-unused-expressions
      this.themeTick
      return {
        income: token('--a-accent', '#0F7B6C'),
        expense: '#C2410C',
        hours: '#F2B8A0',
        line: token('--a-fg', '#1F2A2E'),
        pos: token('--a-pos', '#15803D'),
        neg: token('--a-neg', '#C2410C')
      }
    },
    // the accumulated result stops at the last period with figures (not flat to December)
    accumulatedLine () {
      const has = p => p.income || p.expenses || p.hours
      const last = this.periods.reduce((l, p, i) => (has(p) ? i : l), -1)
      return this.periods.map((p, i) => (i <= last ? p.accumulated : null))
    },
    periodChart () {
      const c = this.colors
      return {
        labels: this.periods.map(p => p.label),
        datasets: [
          { type: 'line', label: 'Resultat acumulat', data: this.accumulatedLine, borderColor: c.line, backgroundColor: c.line, borderWidth: 2, pointRadius: 2, tension: 0.25, yAxisID: 'y', order: 0 },
          { label: 'Ingressos', data: this.periods.map(p => p.income), backgroundColor: c.income, stack: 'income', borderRadius: 3, order: 1 },
          { label: 'Despeses', data: this.periods.map(p => -p.expenses), backgroundColor: c.expense, stack: 'expenses', borderRadius: 3, order: 1 },
          { label: 'Hores', data: this.periods.map(p => -p.hours), backgroundColor: c.hours, stack: 'expenses', borderRadius: 3, order: 1 }
        ]
      }
    },
    periodOptions () {
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatMoney(Math.abs(ctx.raw))}` } }
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, ticks: { callback: v => this.short(v) } }
        }
      }
    },
    projectChart () {
      const c = this.colors
      return {
        labels: this.projects.map(p => p.label),
        datasets: [{ label: 'Resultat', data: this.projects.map(p => p.result), backgroundColor: this.projects.map(p => (p.result < 0 ? c.neg : c.pos)), borderRadius: 3 }]
      }
    },
    expenseChart () {
      return {
        labels: this.expenseTypes.map(t => t.label),
        datasets: [{ label: 'Despeses', data: this.expenseTypes.map(t => t.amount), backgroundColor: this.expenseTypes.map(t => (t.label === 'Hores' ? this.colors.hours : this.colors.expense)), borderRadius: 3 }]
      }
    },
    horizontalOptions () {
      return {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => formatMoney(ctx.raw) } }
        },
        scales: {
          x: { ticks: { callback: v => this.short(v) } },
          y: { grid: { display: false }, ticks: { callback (v) { const l = this.getLabelForValue(v); return l.length > 28 ? l.slice(0, 27) + '…' : l } } }
        }
      }
    }
  },
  mounted () {
    window.addEventListener('themechange', this.onTheme)
  },
  beforeUnmount () {
    window.removeEventListener('themechange', this.onTheme)
  },
  methods: {
    onTheme () {
      this.themeTick++
    },
    money (v) {
      return formatMoney(v)
    },
    pct (v) {
      return `${Math.round(v * 1000) / 10} %`.replace('.', ',')
    },
    // axis ticks: 12.500 → 12,5k
    short (v) {
      const a = Math.abs(v)
      if (a >= 1000000) return `${(v / 1000000).toFixed(1).replace('.', ',')}M`
      if (a >= 1000) return `${(v / 1000).toFixed(a >= 10000 ? 0 : 1).replace('.', ',')}k`
      return String(v)
    },
    barsHeight (n) {
      return `${Math.max(160, n * 30 + 40)}px`
    }
  }
}
</script>

<style scoped>
.ed-charts {
  margin-bottom: 1.5rem;
}
.ed-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .5rem 1rem;
  margin-bottom: .75rem;
}
.ed-scenario {
  font-weight: 800;
}
.ed-count {
  font-size: .875rem;
}
.ed-charts .doc-kpis {
  margin-bottom: 1rem;
}
.ed-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}
.ed-wide {
  grid-column: 1 / -1;
}
.ed-chart {
  position: relative;
  height: 260px;
}
.ed-chart.is-tall {
  height: 320px;
}
.ed-chart > div {
  height: 100%;
}
@media screen and (max-width: 1023px) {
  .ed-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
