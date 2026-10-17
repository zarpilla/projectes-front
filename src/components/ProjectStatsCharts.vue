<template>
  <!-- Informes › Projectes: the figures of the pivot below as KPIs and charts
       (forecast against real per project, hours, per scope or leader) -->
  <div class="ps-charts">
    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Projectes</span>
        <b>{{ total.projects }}</b>
        <small>{{ withHours }} amb hores fetes</small>
      </div>
      <div class="doc-kpi">
        <span>Ingressos reals</span>
        <b>{{ money(total.incomeReal) }}</b>
        <small>previstos {{ money(total.incomePlanned) }}<template v-if="total.incomePlanned"> · {{ pct(total.incomeReal / total.incomePlanned) }}</template></small>
      </div>
      <div class="doc-kpi">
        <span>Resultat real</span>
        <b :class="total.resultReal < 0 ? 'has-text-neg' : 'has-text-pos'">{{ money(total.resultReal) }}</b>
        <small>previst {{ money(total.resultPlanned) }}</small>
      </div>
      <div class="doc-kpi">
        <span>Hores fetes</span>
        <b>{{ hours(total.hoursReal) }}</b>
        <small v-if="total.hoursPlanned">previstes {{ hours(total.hoursPlanned) }} · {{ pct(total.hoursReal / total.hoursPlanned) }}</small>
        <small v-else>cap hora planificada</small>
      </div>
    </div>

    <div class="ps-grid">
      <section class="a-box ps-wide">
        <header class="box-head">
          <h2>Resultat previst i real per projecte</h2>
          <span class="box-hint">Els {{ results.length }} amb més pes · tots dos ja resten el cost de les hores</span>
        </header>
        <div class="ps-chart" :style="{ height: barsHeight(results.length, 2) }">
          <bar-chart v-if="results.length" chart-id="ps-results" :chart-data="resultChart" :extra-options="horizontalOptions(true)" />
          <p v-else class="box-empty">Cap projecte amb resultat.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Hores fetes i previstes</h2>
          <span class="box-hint">En taronja, les que passen de la previsió</span>
        </header>
        <div class="ps-chart" :style="{ height: barsHeight(hourRows.length, 2) }">
          <bar-chart v-if="hourRows.length" chart-id="ps-hours" :chart-data="hoursChart" :extra-options="horizontalOptions(false)" />
          <p v-else class="box-empty">Cap projecte amb hores.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Resultat per {{ groupBy === 'project_scope' ? "àmbit" : "coordinació" }}</h2>
          <div class="segmented" role="group" aria-label="Agrupa per">
            <button type="button" :class="{ 'is-on': groupBy === 'project_scope' }" :aria-pressed="groupBy === 'project_scope' ? 'true' : 'false'" @click="groupBy = 'project_scope'">Àmbit</button>
            <button type="button" :class="{ 'is-on': groupBy === 'project_leader' }" :aria-pressed="groupBy === 'project_leader' ? 'true' : 'false'" @click="groupBy = 'project_leader'">Coordina</button>
          </div>
        </header>
        <div class="ps-chart" :style="{ height: barsHeight(groups.length, 2) }">
          <bar-chart v-if="groups.length" chart-id="ps-groups" :chart-data="groupChart" :extra-options="horizontalOptions(true)" />
          <p v-else class="box-empty">Cap projecte.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import BarChart from '@/components/Charts/BarChart.js'
import { chartColors, shortAmount, shortLabel } from '@/components/Charts/chartTheme'
import { totals, byResult, byHours, byGroup } from '@/domain/projectStatsCharts'
import { formatMoney, formatNumber } from '@/helpers/format-number'

export default {
  name: 'ProjectStatsCharts',
  components: { BarChart },
  props: {
    rows: { type: Array, default: () => [] }
  },
  data () {
    return {
      groupBy: 'project_scope',
      themeTick: 0
    }
  },
  computed: {
    total () {
      return totals(this.rows)
    },
    withHours () {
      return this.rows.filter(r => Number(r.hours) > 0).length
    },
    results () {
      return byResult(this.rows, 12)
    },
    hourRows () {
      return byHours(this.rows, 10)
    },
    groups () {
      return byGroup(this.rows, this.groupBy).slice(0, 10)
    },
    colors () {
      // eslint-disable-next-line no-unused-expressions
      this.themeTick
      return chartColors()
    },
    resultChart () {
      return this.plannedVsReal(this.results)
    },
    groupChart () {
      return this.plannedVsReal(this.groups)
    },
    hoursChart () {
      const c = this.colors
      return {
        labels: this.hourRows.map(p => p.label),
        datasets: [
          { label: 'Previstes', data: this.hourRows.map(p => p.hoursPlanned), backgroundColor: c.planned, borderRadius: 3 },
          { label: 'Fetes', data: this.hourRows.map(p => p.hoursReal), backgroundColor: this.hourRows.map(p => (p.over ? c.hours : c.income)), borderRadius: 3 }
        ]
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
    // the forecast in grey, the real result green or red
    plannedVsReal (list) {
      const c = this.colors
      return {
        labels: list.map(p => p.label),
        datasets: [
          { label: 'Previst', data: list.map(p => p.resultPlanned), backgroundColor: c.planned, borderRadius: 3 },
          { label: 'Real', data: list.map(p => p.resultReal), backgroundColor: list.map(p => (p.resultReal < 0 ? c.neg : c.pos)), borderRadius: 3 }
        ]
      }
    },
    horizontalOptions (isMoney) {
      const fmt = isMoney ? v => formatMoney(v) : v => `${formatNumber(v, 1, 0)} h`
      return {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', axis: 'y', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } }
        },
        scales: {
          x: { ticks: { callback: v => (isMoney ? shortAmount(v) : `${shortAmount(v)} h`) } },
          y: { grid: { display: false }, ticks: { callback (v) { return shortLabel(this.getLabelForValue(v)) } } }
        }
      }
    },
    money (v) {
      return formatMoney(v)
    },
    hours (v) {
      return `${formatNumber(v, 1, 0)} h`
    },
    pct (v) {
      return `${Math.round(v * 100)} %`
    },
    barsHeight (n, perRow = 1) {
      return `${Math.max(180, n * (18 + perRow * 10) + 70)}px`
    }
  }
}
</script>

<style scoped>
.ps-charts {
  margin-bottom: 1.5rem;
}
.ps-charts .doc-kpis {
  margin-bottom: 1rem;
}
.ps-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}
.ps-wide {
  grid-column: 1 / -1;
}
.ps-chart {
  position: relative;
}
.ps-chart > div {
  height: 100%;
}
@media screen and (max-width: 1023px) {
  .ps-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
