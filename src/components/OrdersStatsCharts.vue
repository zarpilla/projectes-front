<template>
  <!-- Informes › Comandes: the rows of the pivot below as KPIs and charts (per day,
       month or year, per route, member and pickup point) -->
  <div class="ls-charts">
    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Comandes</span>
        <b>{{ int(total.count) }}</b>
        <small>{{ int(total.units) }} bultos · {{ total.owners }} sòcies</small>
      </div>
      <div class="doc-kpi">
        <span>Import</span>
        <b>{{ money(total.amount) }}</b>
        <small>{{ money(total.averageAmount) }} per comanda, amb els descomptes</small>
      </div>
      <div class="doc-kpi">
        <span>Quilos</span>
        <b>{{ int(total.kilograms) }} kg</b>
        <small v-if="total.count">{{ number(total.kilograms / total.count) }} kg per comanda</small>
      </div>
      <div class="doc-kpi">
        <span>Refrigerades</span>
        <b>{{ pct(total.refrigerated) }}</b>
        <small>{{ int(total.refrigerated) }} comandes · última milla {{ pct(total.lastmile) }}</small>
      </div>
    </div>

    <div class="ls-grid">
      <section class="a-box ls-wide">
        <header class="box-head">
          <h2>{{ measureLabel }} per {{ periodNoun }}</h2>
          <div class="segmented" role="group" aria-label="Mesura">
            <button v-for="(m, key) in measures" :key="key" type="button" :class="{ 'is-on': measure === key }" :aria-pressed="measure === key ? 'true' : 'false'" @click="measure = key">{{ m.label }}</button>
          </div>
        </header>
        <div class="ls-chart is-tall">
          <bar-chart v-if="rows.length" chart-id="ls-orders-periods" :chart-data="periodChart" :extra-options="periodOptions" />
          <p v-else class="box-empty">No hi ha comandes amb aquests filtres.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Per ruta</h2>
          <span class="box-hint">{{ measureLabel }}{{ firstOf(routes) }}</span>
        </header>
        <div class="ls-chart" :style="{ height: barsHeight(routes.length) }">
          <bar-chart v-if="routes.length" chart-id="ls-orders-routes" :chart-data="groupChart(routes)" :extra-options="horizontalOptions" />
          <p v-else class="box-empty">Cap comanda.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Per sòcia</h2>
          <span class="box-hint">{{ measureLabel }}{{ firstOf(owners) }}</span>
        </header>
        <div class="ls-chart" :style="{ height: barsHeight(owners.length) }">
          <bar-chart v-if="owners.length" chart-id="ls-orders-owners" :chart-data="groupChart(owners)" :extra-options="horizontalOptions" />
          <p v-else class="box-empty">Cap comanda.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Per punt de recollida</h2>
          <span class="box-hint">{{ measureLabel }}</span>
        </header>
        <div class="ls-chart" :style="{ height: barsHeight(pickups.length) }">
          <bar-chart v-if="pickups.length" chart-id="ls-orders-pickups" :chart-data="groupChart(pickups)" :extra-options="horizontalOptions" />
          <p v-else class="box-empty">Cap comanda.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Per tarifa</h2>
          <span class="box-hint">{{ measureLabel }}</span>
        </header>
        <div class="ls-chart" :style="{ height: barsHeight(rates.length) }">
          <bar-chart v-if="rates.length" chart-id="ls-orders-rates" :chart-data="groupChart(rates)" :extra-options="horizontalOptions" />
          <p v-else class="box-empty">Cap comanda.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import BarChart from '@/components/Charts/BarChart.js'
import { ORDER_MEASURES, orderTotals, periodMode, orderPeriods, topGroups } from '@/domain/logisticsStats'
import { formatMoney, formatNumber } from '@/helpers/format-number'
import { chartColors, shortAmount, shortLabel } from '@/components/Charts/chartTheme'

const PERIOD_NOUN = { day: 'dia', month: 'mes', year: 'any', yearmonth: 'mes' }

export default {
  name: 'OrdersStatsCharts',
  components: { BarChart },
  props: {
    rows: { type: Array, default: () => [] },
    // the filters' values: a number or «Tots»
    year: { type: [String, Number], default: null },
    month: { type: [String, Number], default: null }
  },
  data () {
    return {
      measure: 'count',
      measures: ORDER_MEASURES,
      themeTick: 0
    }
  },
  computed: {
    total () {
      return orderTotals(this.rows)
    },
    mode () {
      return periodMode(this.year, this.month)
    },
    periodNoun () {
      return PERIOD_NOUN[this.mode]
    },
    measureLabel () {
      return ORDER_MEASURES[this.measure].label
    },
    value () {
      return ORDER_MEASURES[this.measure].value
    },
    periods () {
      return orderPeriods(this.rows, { mode: this.mode, year: this.year, month: this.month, measure: this.measure })
    },
    routes () {
      return topGroups(this.rows, 'route', { value: this.value, limit: 14, missing: 'Sense ruta' })
    },
    owners () {
      return topGroups(this.rows, 'owner', { value: this.value, missing: 'Sense sòcia' })
    },
    pickups () {
      return topGroups(this.rows, 'pickup', { value: this.value, limit: 6, missing: 'Sense punt de recollida' })
    },
    rates () {
      return topGroups(this.rows, 'route_rate', { value: this.value, limit: 6, missing: 'Sense tarifa' })
    },
    colors () {
      // eslint-disable-next-line no-unused-expressions
      this.themeTick
      return chartColors()
    },
    periodChart () {
      const c = this.colors
      return {
        labels: this.periods.map(p => p.label),
        datasets: [
          { label: 'Normal', data: this.periods.map(p => p.normal), backgroundColor: c.first, borderColor: this.surface(), borderWidth: { top: 2 }, borderSkipped: 'bottom', borderRadius: 3, maxBarThickness: 40 },
          { label: 'Refrigerada', data: this.periods.map(p => p.refrigerated), backgroundColor: c.second, borderColor: this.surface(), borderWidth: { top: 2 }, borderSkipped: 'bottom', borderRadius: 3, maxBarThickness: 40 }
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
          tooltip: {
            callbacks: {
              title: items => this.periodTitle(items[0]),
              label: ctx => `${ctx.dataset.label}: ${this.format(ctx.raw)}`,
              footer: items => `Total: ${this.format(this.periods[items[0].dataIndex].total)}`
            }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0, callback: (v, i, ticks) => this.short(v, ticks[ticks.length - 1].value) } }
        }
      }
    },
    horizontalOptions () {
      return {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => this.format(ctx.raw) } }
        },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0, maxRotation: 0, callback: (v, i, ticks) => this.short(v, ticks[ticks.length - 1].value) } },
          y: { grid: { display: false }, ticks: { callback (v) { return shortLabel(this.getLabelForValue(v), this.chart.width < 420 ? 16 : 28) } } }
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
    surface () {
      // eslint-disable-next-line no-unused-expressions
      this.themeTick
      return getComputedStyle(document.documentElement).getPropertyValue('--a-surface').trim() || '#fff'
    },
    // «Altres» in the muted grey: it is not one more route or member
    groupChart (groups) {
      const c = this.colors
      return {
        labels: groups.map(g => g.label),
        datasets: [{ label: this.measureLabel, data: groups.map(g => g.value), backgroundColor: groups.map(g => (g.other ? c.planned : c.first)), borderRadius: 3, maxBarThickness: 22 }]
      }
    },
    // «, les 9 primeres» when the rest went to «Altres»
    firstOf (groups) {
      return groups.some(g => g.other) ? `, les ${groups.length - 1} primeres` : ''
    },
    periodTitle (item) {
      const p = this.periods[item.dataIndex]
      if (this.mode === 'day') return `${p.label}/${this.month}/${this.year}`
      if (this.mode === 'month') return `${p.label} ${this.year}`
      return p.label
    },
    format (v) {
      if (this.measure === 'amount') return formatMoney(v)
      if (this.measure === 'kilograms') return `${formatNumber(v, 1)} kg`
      return this.int(v)
    },
    money (v) {
      return formatMoney(v)
    },
    int (v) {
      return formatNumber(v, 0)
    },
    number (v) {
      return formatNumber(v, 1)
    },
    pct (n) {
      return this.total.count ? `${formatNumber(n / this.total.count * 100, 1)} %` : '–'
    },
    // the whole axis in one format: 8.000 next to 10k read as different units
    short (v, max) {
      return this.measure === 'count' && Math.abs(max) < 10000 ? this.int(v) : shortAmount(v)
    },
    barsHeight (n) {
      return `${Math.max(140, n * 28 + 40)}px`
    }
  }
}
</script>

<style scoped>
.ls-charts {
  margin-bottom: 1.5rem;
}
.ls-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}
.ls-wide {
  grid-column: 1 / -1;
}
.ls-chart {
  position: relative;
  height: 260px;
}
.ls-chart.is-tall {
  height: 320px;
}
.ls-chart > div {
  height: 100%;
}
@media screen and (max-width: 1023px) {
  .ls-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
