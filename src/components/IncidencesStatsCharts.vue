<template>
  <!-- Informes › Incidències: the rows of the pivot below as KPIs and charts; the
       rate per 100 orders asks the API how many orders each route had -->
  <div class="ls-charts">
    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Incidències</span>
        <b>{{ total.count }}</b>
        <small>{{ total.affected }} comandes afectades</small>
      </div>
      <div class="doc-kpi" :class="{ 'is-warn': total.open }">
        <span>Per resoldre</span>
        <b>{{ total.open }}</b>
        <small>{{ total.closed }} tancades</small>
      </div>
      <div class="doc-kpi">
        <span>Temps de resolució</span>
        <b>{{ total.medianDays === null ? '–' : days(total.medianDays) }}</b>
        <small v-if="total.solved">mediana · {{ pctOf(total.sameDayOrNext, total.solved) }} tancades el mateix dia o l'endemà</small>
      </div>
      <div class="doc-kpi">
        <span>Per cada 100 comandes</span>
        <b>{{ total.rate === null ? '–' : number(total.rate, 2) }}</b>
        <small v-if="routeOrders">{{ int(total.orders) }} comandes en el període</small>
        <small v-else-if="ordersFailed">no s'han pogut carregar les comandes</small>
        <small v-else>carregant les comandes…</small>
      </div>
    </div>

    <div class="ls-grid">
      <section class="a-box ls-wide">
        <header class="box-head">
          <h2>Incidències per {{ periodNoun }}</h2>
          <span class="box-hint">Per la data en què es van obrir</span>
        </header>
        <div class="ls-chart">
          <bar-chart v-if="rows.length" chart-id="ls-inc-periods" :chart-data="periodChart" :extra-options="periodOptions" />
          <p v-else class="box-empty">No hi ha incidències amb aquests filtres.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Rutes amb més incidències</h2>
          <span class="box-hint">Per cada 100 comandes de la ruta</span>
        </header>
        <div class="ls-chart" :style="{ height: barsHeight(routes.length) }">
          <bar-chart v-if="routes.length" chart-id="ls-inc-routes" :chart-data="routeChart" :extra-options="routeOptions" />
          <p v-else-if="!routeOrders && rows.length" class="box-empty">Carregant les comandes…</p>
          <p v-else class="box-empty">Cap incidència.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Per sòcia</h2>
          <span v-if="owners.some(g => g.other)" class="box-hint">Les {{ owners.length - 1 }} primeres</span>
        </header>
        <div class="ls-chart" :style="{ height: barsHeight(owners.length) }">
          <bar-chart v-if="owners.length" chart-id="ls-inc-owners" :chart-data="groupChart(owners, 'Incidències')" :extra-options="countOptions" />
          <p v-else class="box-empty">Cap incidència.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Quant es triga a tancar-les</h2>
          <span class="box-hint">Dies des que s'obren fins que es tanquen</span>
        </header>
        <div class="ls-chart" :style="{ height: barsHeight(buckets.length) }">
          <bar-chart v-if="total.solved" chart-id="ls-inc-days" :chart-data="groupChart(buckets, 'Incidències')" :extra-options="countOptions" />
          <p v-else class="box-empty">Cap incidència tancada.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Qui les obre</h2>
          <span v-if="creators.some(g => g.other)" class="box-hint">Les {{ creators.length - 1 }} primeres persones</span>
        </header>
        <div class="ls-chart" :style="{ height: barsHeight(creators.length) }">
          <bar-chart v-if="creators.length" chart-id="ls-inc-creators" :chart-data="groupChart(creators, 'Incidències')" :extra-options="countOptions" />
          <p v-else class="box-empty">Cap incidència.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import BarChart from '@/components/Charts/BarChart.js'
import service from '@/service/index'
import { periodMode, incidenceTotals, incidencePeriods, topGroups, resolutionBuckets, routeRates } from '@/domain/logisticsStats'
import { formatNumber } from '@/helpers/format-number'
import { chartColors, shortLabel } from '@/components/Charts/chartTheme'

const PERIOD_NOUN = { day: 'dia', month: 'mes', year: 'any', yearmonth: 'mes' }

export default {
  name: 'IncidencesStatsCharts',
  components: { BarChart },
  props: {
    rows: { type: Array, default: () => [] },
    // the filters' values: a number or «Tots»
    year: { type: [String, Number], default: null },
    month: { type: [String, Number], default: null }
  },
  data () {
    return {
      routeOrders: null,
      ordersFailed: false,
      themeTick: 0
    }
  },
  computed: {
    total () {
      return incidenceTotals(this.rows, this.routeOrders)
    },
    mode () {
      return periodMode(this.year, this.month)
    },
    periodNoun () {
      return PERIOD_NOUN[this.mode]
    },
    periods () {
      return incidencePeriods(this.rows, { mode: this.mode, year: this.year, month: this.month })
    },
    routes () {
      return this.routeOrders ? routeRates(this.rows, this.routeOrders) : []
    },
    owners () {
      return topGroups(this.rows, 'owner_name')
    },
    creators () {
      return topGroups(this.rows, 'created_user', { limit: 8 })
    },
    buckets () {
      return resolutionBuckets(this.rows)
    },
    colors () {
      // eslint-disable-next-line no-unused-expressions
      this.themeTick
      return chartColors()
    },
    periodChart () {
      const c = this.colors
      const bar = { borderWidth: { top: 2 }, borderSkipped: 'bottom', borderRadius: 3, maxBarThickness: 40 }
      return {
        labels: this.periods.map(p => p.label),
        datasets: [
          { label: 'Tancades', data: this.periods.map(p => p.closed), backgroundColor: c.first, borderColor: this.surface(), ...bar },
          { label: 'Per resoldre', data: this.periods.map(p => p.open), backgroundColor: c.warn, borderColor: this.surface(), ...bar }
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
              footer: items => `Total: ${this.periods[items[0].dataIndex].total}`
            }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    },
    routeChart () {
      return {
        labels: this.routes.map(r => r.label),
        datasets: [{ label: 'Per cada 100 comandes', data: this.routes.map(r => r.value), backgroundColor: this.colors.first, borderRadius: 3, maxBarThickness: 22 }]
      }
    },
    routeOptions () {
      return this.horizontal({
        label: ctx => {
          const r = this.routes[ctx.dataIndex]
          return [`${this.number(r.value, 2)} per cada 100 comandes`, `${r.count} incidències · ${this.int(r.orders)} comandes`]
        }
      })
    },
    countOptions () {
      return this.horizontal({ label: ctx => `${ctx.raw} incidències` }, { precision: 0 })
    }
  },
  watch: {
    year () {
      this.loadOrders()
    },
    month () {
      this.loadOrders()
    }
  },
  mounted () {
    window.addEventListener('themechange', this.onTheme)
    this.loadOrders()
  },
  beforeUnmount () {
    window.removeEventListener('themechange', this.onTheme)
  },
  methods: {
    // how many orders the routes had in the same year / month (by delivery date),
    // for the rate: counted by the API, not cached (orders change every day)
    async loadOrders () {
      const ticket = (this.ordersTicket = (this.ordersTicket || 0) + 1)
      this.routeOrders = null
      this.ordersFailed = false
      const qYear = this.year && this.year !== 'Tots' ? `&year=${this.year}` : ''
      const qMonth = this.month && this.month !== 'Tots' ? `&month=${this.month}` : ''
      try {
        const { data } = await service({ requiresAuth: true }).get(`orders/infoall?_group=route${qYear}${qMonth}`)
        if (ticket === this.ordersTicket) this.routeOrders = Object.freeze(data)
      } catch (e) {
        if (ticket === this.ordersTicket) this.ordersFailed = true
      }
    },
    onTheme () {
      this.themeTick++
    },
    surface () {
      // eslint-disable-next-line no-unused-expressions
      this.themeTick
      return getComputedStyle(document.documentElement).getPropertyValue('--a-surface').trim() || '#fff'
    },
    horizontal (callbacks, ticks = {}) {
      return {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks }
        },
        scales: {
          x: { beginAtZero: true, ticks },
          y: { grid: { display: false }, ticks: { callback (v) { return shortLabel(this.getLabelForValue(v), this.chart.width < 420 ? 16 : 28) } } }
        }
      }
    },
    groupChart (groups, label) {
      const c = this.colors
      return {
        labels: groups.map(g => g.label),
        datasets: [{ label, data: groups.map(g => g.value), backgroundColor: groups.map(g => (g.other ? c.planned : c.first)), borderRadius: 3, maxBarThickness: 22 }]
      }
    },
    periodTitle (item) {
      const p = this.periods[item.dataIndex]
      if (this.mode === 'day') return `${p.label}/${this.month}/${this.year}`
      if (this.mode === 'month') return `${p.label} ${this.year}`
      return p.label
    },
    days (d) {
      return d === 1 ? '1 dia' : `${formatNumber(d, 1)} dies`
    },
    pctOf (n, of) {
      return `${formatNumber(n / of * 100, 0)} %`
    },
    int (v) {
      return formatNumber(v, 0)
    },
    number (v, d = 1) {
      return formatNumber(v, d)
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
  height: 240px;
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
