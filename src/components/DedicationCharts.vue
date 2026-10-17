<template>
  <!-- Informes › Dedicació: the figures of the pivot below as KPIs and charts
       (planned against worked per month, person and project; worked hours by type and role) -->
  <div class="dc-charts">
    <div class="dc-head">
      <span class="has-text-muted">{{ people }} {{ people === 1 ? "persona" : "persones" }} · {{ projects }} {{ projects === 1 ? "projecte" : "projectes" }}</span>
    </div>

    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Hores fetes</span>
        <b>{{ hours(total.worked) }}</b>
        <small v-if="monthlyAverage">mitjana de {{ hours(monthlyAverage) }} al mes</small>
      </div>
      <div class="doc-kpi">
        <span>Previstes fins avui</span>
        <b>{{ hours(total.plannedToday) }}</b>
        <small v-if="total.plannedToday" :class="total.deviation > 0 ? 'has-text-neg' : ''">
          {{ total.deviation > 0 ? "+" : "" }}{{ hours(total.deviation) }} fetes ({{ pct(total.worked / total.plannedToday) }})
        </small>
        <small v-else>cap hora planificada fins avui</small>
      </div>
      <div class="doc-kpi">
        <span>Previstes en total</span>
        <b>{{ hours(total.planned) }}</b>
        <small v-if="total.original">originals {{ hours(total.original) }}</small>
      </div>
      <div v-if="showCost" class="doc-kpi">
        <span>Cost real</span>
        <b>{{ money(total.cost) }}</b>
        <small v-if="total.worked">{{ money(total.cost / total.worked) }}/h de mitjana</small>
      </div>
    </div>

    <div class="dc-grid">
      <section class="a-box dc-wide">
        <header class="box-head">
          <h2>Hores previstes i fetes per {{ byYear ? "any" : "mes" }}</h2>
          <span class="box-hint">Les línies són els acumulats (discontínua: el previst)</span>
        </header>
        <div class="dc-chart is-tall">
          <bar-chart v-if="rows.length" chart-id="dc-periods" :chart-data="periodChart" :extra-options="periodOptions" />
          <p v-else class="box-empty">No hi ha hores amb aquests filtres.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Per persona</h2>
          <span class="box-hint">En taronja, qui passa de la previsió</span>
        </header>
        <div class="dc-chart" :style="{ height: barsHeight(byPerson.length) }">
          <bar-chart v-if="byPerson.length" chart-id="dc-people" :chart-data="plannedVsWorked(byPerson)" :extra-options="horizontalOptions" />
          <p v-else class="box-empty">Cap persona amb hores.</p>
        </div>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>Per projecte</h2>
          <span class="box-hint">Els {{ byProject.length }} amb més hores</span>
        </header>
        <div class="dc-chart" :style="{ height: barsHeight(byProject.length) }">
          <bar-chart v-if="byProject.length" chart-id="dc-projects" :chart-data="plannedVsWorked(byProject)" :extra-options="horizontalOptions" />
          <p v-else class="box-empty">Cap projecte amb hores.</p>
        </div>
      </section>

      <section v-for="split in splits" :key="split.field" class="a-box">
        <header class="box-head">
          <h2>{{ split.title }}</h2>
          <span class="box-hint">Hores fetes</span>
        </header>
        <p v-if="split.list.length === 1 && split.list[0].label === 'Sense assignar'" class="box-empty">
          Cap hora feta té {{ split.noun }}: s'indica en registrar les hores, a «Hores dedicades».
        </p>
        <ul v-else-if="split.list.length" class="share-list">
          <li v-for="g in split.list" :key="g.label" :class="{ 'is-none': g.label === 'Sense assignar' }">
            <span class="share-name" :title="g.label">{{ g.label }}</span>
            <span class="share-bar"><i :style="{ width: (g.share * 100) + '%' }"></i></span>
            <b>{{ hours(g.worked) }}</b>
            <span class="share-pct">{{ pct(g.share) }}</span>
          </li>
        </ul>
        <p v-else class="box-empty">Cap hora feta.</p>
      </section>
    </div>
  </div>
</template>

<script>
import BarChart from '@/components/Charts/BarChart.js'
import { chartColors, shortAmount, shortLabel } from '@/components/Charts/chartTheme'
import { totals, byPeriod, byGroup, workedShare } from '@/domain/dedicationEstCharts'
import { formatMoney, formatNumber } from '@/helpers/format-number'

export default {
  name: 'DedicationCharts',
  components: { BarChart },
  props: {
    rows: { type: Array, default: () => [] },
    year: { type: [String, Number], default: null },
    showCost: { type: Boolean, default: true }
  },
  data () {
    return { themeTick: 0 }
  },
  computed: {
    total () {
      return totals(this.rows)
    },
    people () {
      return new Set(this.rows.filter(r => r.username && r.username !== '-').map(r => r.username)).size
    },
    projects () {
      return new Set(this.rows.map(r => r.project_name)).size
    },
    byYear () {
      return !this.year || new Set(this.rows.map(r => r.year)).size > 1
    },
    periods () {
      return byPeriod(this.rows, { byYear: this.byYear })
    },
    monthlyAverage () {
      if (this.byYear) return 0
      const withHours = this.periods.filter(p => p.worked > 0).length
      return withHours ? this.total.worked / withHours : 0
    },
    byPerson () {
      return byGroup(this.rows, 'username', 12)
    },
    byProject () {
      return byGroup(this.rows, 'project_name', 10)
    },
    splits () {
      return [
        { field: 'dedication_type', title: 'Per tipus de dedicació', noun: 'tipus de dedicació', list: workedShare(this.rows, 'dedication_type', 6) },
        { field: 'activity_type', title: 'Per funció', noun: 'funció', list: workedShare(this.rows, 'activity_type', 6) }
      ]
    },
    colors () {
      // eslint-disable-next-line no-unused-expressions
      this.themeTick
      return chartColors()
    },
    // the worked accumulation stops at the last period with hours (not flat to December)
    workedLine () {
      const last = this.periods.reduce((l, p, i) => (p.worked ? i : l), -1)
      return this.periods.map((p, i) => (i <= last ? p.workedAccumulated : null))
    },
    periodChart () {
      const c = this.colors
      return {
        labels: this.periods.map(p => p.label),
        datasets: [
          { type: 'line', label: 'Fetes acumulades', data: this.workedLine, borderColor: c.line, backgroundColor: c.line, borderWidth: 2, pointRadius: 2, tension: 0.25, yAxisID: 'y1', order: 0 },
          { type: 'line', label: 'Previstes acumulades', data: this.periods.map(p => p.plannedAccumulated), borderColor: c.line, backgroundColor: 'transparent', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, tension: 0.25, yAxisID: 'y1', order: 0 },
          { label: 'Previstes', data: this.periods.map(p => p.planned), backgroundColor: c.planned, borderRadius: 3, order: 1 },
          { label: 'Fetes', data: this.periods.map(p => p.worked), backgroundColor: c.income, borderRadius: 3, order: 1 }
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
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${this.hours(ctx.raw)}` } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, title: { display: true, text: 'hores' }, ticks: { callback: v => shortAmount(v) } },
          y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'acumulat' }, ticks: { callback: v => shortAmount(v) } }
        }
      }
    },
    horizontalOptions () {
      return {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', axis: 'y', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${this.hours(ctx.raw)}` } }
        },
        scales: {
          x: { ticks: { callback: v => `${shortAmount(v)} h` } },
          y: { grid: { display: false }, ticks: { callback (v) { return shortLabel(this.getLabelForValue(v)) } } }
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
    // planned in grey, worked green, orange past the plan
    plannedVsWorked (list) {
      const c = this.colors
      return {
        labels: list.map(g => g.label),
        datasets: [
          { label: 'Previstes', data: list.map(g => g.planned), backgroundColor: c.planned, borderRadius: 3 },
          { label: 'Fetes', data: list.map(g => g.worked), backgroundColor: list.map(g => (g.over ? c.hours : c.income)), borderRadius: 3 }
        ]
      }
    },
    hours (v) {
      return `${formatNumber(v, 1, 0)} h`
    },
    money (v) {
      return formatMoney(v)
    },
    pct (v) {
      return `${Math.round(v * 100)} %`
    },
    barsHeight (n) {
      return `${Math.max(180, n * 38 + 70)}px`
    }
  }
}
</script>

<style scoped>
.dc-charts {
  margin-bottom: 1.5rem;
}
.dc-head {
  display: flex;
  justify-content: flex-end;
  margin-bottom: .5rem;
  font-size: .875rem;
}
.dc-charts .doc-kpis {
  margin-bottom: 1rem;
}
.dc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}
.dc-wide {
  grid-column: 1 / -1;
}
.dc-chart {
  position: relative;
  height: 260px;
}
.dc-chart.is-tall {
  height: 320px;
}
.dc-chart > div {
  height: 100%;
}
.share-list {
  display: grid;
  gap: .375rem;
}
.share-list li {
  display: grid;
  grid-template-columns: minmax(0, 11rem) minmax(0, 1fr) 5.5rem 3rem;
  align-items: center;
  gap: .75rem;
  font-size: .875rem;
}
.share-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.share-bar {
  height: .5rem;
  border-radius: 999px;
  background: var(--a-chip);
  overflow: hidden;
}
.share-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--a-accent);
}
.share-list li.is-none .share-bar i {
  background: var(--a-muted);
}
.share-list b,
.share-pct {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.share-pct {
  color: var(--a-muted);
}
@media screen and (max-width: 1023px) {
  .dc-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media screen and (max-width: 768px) {
  .share-list li {
    grid-template-columns: minmax(0, 1fr) 4.5rem 2.75rem;
  }
  .share-bar {
    display: none;
  }
}
</style>
