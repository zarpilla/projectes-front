<template>
  <div>
    <title-bar :title-stack="['Informes', 'Previsió facturació']" subtitle="Ingressos previstos als projectes que encara no tenen factura." />
    <section class="section is-main-section if-report">
      <b-loading :is-full-page="false" :model-value="isLoading" :can-cancel="false" />

      <div class="if-filters">
        <div class="segmented" role="group" aria-label="Horitzó">
          <button
            v-for="h in horizons"
            :key="h.months"
            type="button"
            :class="{ 'is-on': horizon === h.months }"
            :aria-pressed="horizon === h.months ? 'true' : 'false'"
            @click="setHorizon(h.months)"
          >{{ h.label }}</button>
        </div>
        <label class="filter-select">
          <span>Responsable</span>
          <b-select v-model="leaderId" aria-label="Responsable">
            <option :value="null">Tothom</option>
            <option v-for="l in leaders" :key="l.id" :value="l.id">{{ l.name }}</option>
          </b-select>
        </label>
        <download-excel
          class="export ml-auto"
          :data="exportRows"
          name="previsio-facturacio"
          :fields="exportFields"
        >
          <b-button icon-left="download" :disabled="!exportRows.length">Exporta</b-button>
        </download-excel>
      </div>
      <div class="if-filters">
        <div class="toggle-group" role="group" aria-label="Estats de projecte">
          <span class="toggle-label">Projectes</span>
          <button
            v-for="state in projectStates"
            :key="state.id"
            type="button"
            class="chip-toggle"
            :class="{ 'is-on': selectedStates.includes(state.id) }"
            :aria-pressed="selectedStates.includes(state.id) ? 'true' : 'false'"
            @click="toggleState(state.id)"
          >{{ state.name }}</button>
        </div>
      </div>

      <div class="doc-kpis">
        <div class="doc-kpi" :class="{ 'is-over': overdueBase }">
          <span>Endarrerit</span>
          <b>{{ money(overdueBase) }}</b>
          <small v-if="sec.overdue.length">{{ plural(overdueProjects.length, 'projecte') }} · {{ plural(sec.overdue.length, 'línia', 'línies') }} amb data passada; la més antiga, del {{ formatDate(overdueProjects[0].first) }}</small>
          <small v-else>res pendent amb data passada</small>
        </div>
        <div class="doc-kpi">
          <span>Resta de {{ currentMonthName }}</span>
          <b>{{ money(currentBase) }}</b>
          <small>{{ plural(currentProjects, 'projecte') }} fins al {{ formatDate(monthEnd) }}</small>
        </div>
        <div v-if="horizon > 1" class="doc-kpi">
          <span>{{ nextLabel }}</span>
          <b>{{ money(nextBase) }}</b>
          <small>{{ nextDetail }}</small>
        </div>
        <div class="doc-kpi">
          <span>Sense data</span>
          <b>{{ money(noDateBase) }}</b>
          <small>{{ plural(sec.noDate.length, 'línia', 'línies') }} sense «Previsió fac.» ni data de cobrament</small>
        </div>
      </div>

      <div v-if="closed.lines" class="notification is-warning if-notice">
        <b>Projectes tancats amb ingressos sense factura:</b>
        {{ plural(closed.projects, 'projecte tancat', 'projectes tancats') }} {{ closed.projects === 1 ? 'té' : 'tenen' }}
        {{ plural(closed.lines, 'línia prevista', 'línies previstes') }} ({{ money(closed.base) }}) sense factura ni cobrament.
        O falta enllaçar la factura o cal esborrar la previsió.
        <a href="#" @click.prevent="showClosed">Mostra'ls</a>
      </div>

      <div class="if-top">
        <section class="a-box if-chart-box">
          <header class="box-head">
            <h2>Facturat i previst per mes</h2>
            <span class="if-legend" aria-hidden="true">
              <span><i class="c-inv"></i>facturat</span>
              <span><i class="c-late"></i>previst i no facturat</span>
              <span><i class="c-plan"></i>previst</span>
            </span>
          </header>
          <div class="if-bars" role="img" :aria-label="chartLabel" @mouseleave="hoverYm = null">
            <div
              v-for="(m, k) in chartColumns"
              :key="m.ym"
              class="if-col"
              :class="{ 'is-now': m.ym === currentYm, 'is-hover': hoverYm === m.ym }"
              tabindex="0"
              @mouseenter="hoverYm = m.ym"
              @focus="hoverYm = m.ym"
              @blur="hoverYm = null"
            >
              <div class="if-area">
                <i v-if="m.invoiced > 0" class="c-inv" :style="{ height: pct(m.invoiced) }"></i>
                <i v-if="m.late > 0" class="c-late" :style="{ height: pct(m.late) }"></i>
                <i v-if="m.planned > 0" class="c-plan" :style="{ height: pct(m.planned) }"></i>
              </div>
              <span class="if-label">{{ m.label }}</span>
              <div v-if="hoverYm === m.ym" class="if-tip" :class="{ 'is-left': k > chartColumns.length / 2 }">
                <b>{{ m.title }}</b>
                <dl>
                  <dt v-if="m.ym !== 'before'">Facturat</dt><dd v-if="m.ym !== 'before'">{{ money(m.invoiced) }}</dd>
                  <dt>Previst i no facturat</dt><dd>{{ money(m.late) }}</dd>
                  <dt v-if="m.ym !== 'before'">Previst</dt><dd v-if="m.ym !== 'before'">{{ money(m.planned) }}</dd>
                </dl>
              </div>
            </div>
          </div>
          <p class="box-hint if-foot">Base imposable. Facturat: totes les factures emeses del mes. Cada mes passat mostra a més el que hi havia previst i encara no té factura.</p>
        </section>

        <section class="a-box list-box if-people">
          <header class="box-head">
            <h2>Endarrerit per responsable</h2>
            <span class="box-hint">{{ plural(overdueByLeader.length, 'persona', 'persones') }}</span>
          </header>
          <div class="table-wrap">
            <table class="table is-fullwidth">
              <thead><tr><th>Responsable</th><th class="has-text-right">Projectes</th><th class="has-text-right">Base</th></tr></thead>
              <tbody>
                <tr v-for="p in overdueByLeader" :key="p.name">
                  <td>{{ p.name }}</td>
                  <td class="has-text-right">{{ p.projects }}</td>
                  <td class="has-text-right if-num">{{ money(p.base) }}</td>
                </tr>
                <tr v-if="!overdueByLeader.length"><td colspan="3" class="has-text-muted">Res endarrerit.</td></tr>
              </tbody>
              <tfoot v-if="overdueByLeader.length"><tr><td>Total</td><td class="has-text-right">{{ overdueProjects.length }}</td><td class="has-text-right if-num">{{ money(overdueBase) }}</td></tr></tfoot>
            </table>
          </div>
        </section>
      </div>

      <section ref="list" class="a-box list-box">
        <header class="box-head">
          <h2>Què cal facturar</h2>
          <b-input v-model="search" type="search" icon="magnify" placeholder="Cerca projecte, client o concepte" aria-label="Cerca" class="if-search" />
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth if-table">
            <thead>
              <tr>
                <th>Projecte · client</th>
                <th>Responsable</th>
                <th>Previsió fac.</th>
                <th class="has-text-right">Base</th>
                <th class="has-text-right">Total amb IVA</th>
              </tr>
            </thead>
            <tbody v-for="g in groups" :key="g.key">
              <tr class="if-group">
                <td colspan="3">
                  <button type="button" class="if-toggle" :aria-expanded="isOpen(g.key) ? 'true' : 'false'" @click="toggleGroup(g.key)">
                    <b-icon :icon="isOpen(g.key) ? 'chevron-down' : 'chevron-right'" size="is-small" />
                    {{ g.label }}
                    <span class="has-text-muted">· {{ plural(g.projects.length, 'projecte') }} · {{ plural(g.lines, 'línia', 'línies') }}</span>
                  </button>
                </td>
                <td class="has-text-right if-num">{{ money(g.base) }}</td>
                <td class="has-text-right if-num">{{ money(g.total) }}</td>
              </tr>
              <template v-if="isOpen(g.key)">
                <template v-for="p in g.projects" :key="g.key + p.project_id">
                  <tr>
                    <td>
                      <button type="button" class="if-toggle is-row" :aria-expanded="isOpen(g.key + ':' + p.project_id) ? 'true' : 'false'" :aria-label="'Línies de ' + p.project_name" @click="toggleGroup(g.key + ':' + p.project_id)">
                        <b-icon :icon="isOpen(g.key + ':' + p.project_id) ? 'chevron-down' : 'chevron-right'" size="is-small" />
                      </button>
                      <router-link class="doc-title if-project" :to="{ name: 'project.edit', params: { id: p.project_id }, query: { tab: 'pressupost' } }">{{ p.project_name }}</router-link>
                      <span class="doc-subline">
                        {{ p.clients.length ? p.clients.join(', ') : 'sense client' }} · {{ plural(p.lines, 'línia', 'línies') }}<template v-if="p.fromPayment"> · {{ p.fromPayment }} sense «Previsió fac.»: data de cobrament</template>
                      </span>
                    </td>
                    <td class="is-nowrap">{{ p.leader_name || '—' }}</td>
                    <td class="is-nowrap">
                      <template v-if="p.first">{{ formatDate(p.first) }}</template><template v-else>—</template>
                      <span v-if="p.last && p.last !== p.first" class="doc-subline">fins al {{ formatDate(p.last) }}</span>
                      <span v-if="g.key === 'overdue'" class="doc-subline"><span class="tag" :class="'is-late-' + late(p.first).level">{{ late(p.first).text }}</span></span>
                    </td>
                    <td class="has-text-right if-num" :class="{ 'has-text-neg': p.base < 0 }">{{ money(p.base) }}</td>
                    <td class="has-text-right if-num" :class="{ 'has-text-neg': p.total < 0 }">{{ money(p.total) }}</td>
                  </tr>
                  <template v-if="isOpen(g.key + ':' + p.project_id)">
                    <tr v-for="r in linesOf(g, p.project_id)" :key="'l' + r.id" class="if-line">
                      <td>
                        {{ r.concept || 'Sense concepte' }}
                        <span class="doc-subline">{{ [r.phase_name, r.income_type_name || 'sense tipus d\'ingrés', r.client_name].filter(Boolean).join(' · ') }}</span>
                      </td>
                      <td></td>
                      <td class="is-nowrap">
                        {{ r.date ? formatDate(r.date) : '—' }}
                        <span v-if="r.date_source === 'payment'" class="doc-subline">data de cobrament</span>
                      </td>
                      <td class="has-text-right" :class="{ 'has-text-neg': r.base < 0 }">{{ money(r.base) }}</td>
                      <td class="has-text-right" :class="{ 'has-text-neg': r.total < 0 }">{{ money(r.total) }}<span class="doc-subline">IVA {{ r.vat_pct }} %</span></td>
                    </tr>
                  </template>
                </template>
              </template>
            </tbody>
            <tbody v-if="!groups.length">
              <tr><td colspan="5" class="has-text-centered has-text-muted if-empty">No hi ha res per facturar amb aquests filtres.</td></tr>
            </tbody>
            <tfoot v-if="groups.length">
              <tr>
                <td colspan="3">Total{{ horizon > 1 || sec.overdue.length ? ' fins al ' + formatDate(horizonEnd) + (sec.overdue.length ? ', endarrerit inclòs' : '') : '' }}</td>
                <td class="has-text-right if-num">{{ money(footBase) }}</td>
                <td class="has-text-right if-num">{{ money(footTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="box-hint if-foot">
          Línies de la pestanya «Pressupost i fases» de cada projecte sense factura, cobrament ni marca de pagat. Les subvencions no hi surten: es registren com a ingrés, no es facturen.
          <template v-if="sec.later.length"> Més enllà del {{ formatDate(horizonEnd) }}: {{ money(laterBase) }} en {{ plural(sec.later.length, 'línia', 'línies') }}.</template>
        </p>
      </section>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import service from '@/service/index'
import { formatMoney } from '@/helpers/format-number'
import {
  addMonths, monthName, monthShort, formatDate, ymOf, filterRows, sections, byProject,
  byLeader, monthlyChart, lateness, closedPending, sumOf, isGrant
} from '@/domain/invoicingForecast'

const STORAGE_KEY = 'InvoicingForecast.selectedStates'
const HORIZON_KEY = 'InvoicingForecast.horizon'

const readStorage = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch (e) { return null }
}
const writeStorage = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (e) { /* private mode */ }
}

const lastDay = ym => {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

export default {
  name: 'InvoicingForecast',
  components: { TitleBar },
  data () {
    return {
      isLoading: true,
      rows: [],
      invoicedByMonth: {},
      today: new Date().toISOString().slice(0, 10),
      projectStates: [],
      selectedStates: [],
      leaderId: null,
      horizon: 3,
      horizons: [
        { months: 1, label: 'Mes en curs' },
        { months: 3, label: '3 mesos' },
        { months: 6, label: '6 mesos' },
        { months: 12, label: '12 mesos' }
      ],
      search: '',
      open: { overdue: true },
      hoverYm: null
    }
  },
  computed: {
    currentYm () {
      return ymOf(this.today)
    },
    currentMonthName () {
      return monthName(this.currentYm).split(' ')[0]
    },
    monthEnd () {
      return lastDay(this.currentYm)
    },
    horizonEnd () {
      return lastDay(addMonths(this.currentYm, this.horizon - 1))
    },
    closedStateIds () {
      return this.projectStates.filter(s => /tancat/i.test(s.name)).map(s => s.id)
    },
    filtered () {
      return filterRows(this.rows, { states: this.selectedStates, leaderId: this.leaderId })
    },
    searched () {
      const q = this.search.trim().toLowerCase()
      if (!q) return this.filtered
      return this.filtered.filter(r =>
        [r.project_name, r.client_name, r.concept, r.leader_name].some(v => v && v.toLowerCase().includes(q))
      )
    },
    sec () {
      return sections(this.filtered, this.today, this.horizon)
    },
    overdueBase () {
      return sumOf(this.sec.overdue)
    },
    overdueProjects () {
      return byProject(this.sec.overdue)
    },
    overdueByLeader () {
      return byLeader(this.sec.overdue)
    },
    currentBase () {
      return sumOf(this.sec.months[0].rows)
    },
    currentProjects () {
      return new Set(this.sec.months[0].rows.map(r => r.project_id)).size
    },
    nextMonths () {
      return this.sec.months.slice(1)
    },
    nextBase () {
      return sumOf(this.nextMonths.flatMap(m => m.rows))
    },
    nextLabel () {
      const ms = this.nextMonths
      if (ms.length === 2) return `${this.cap(monthName(ms[0].ym).split(' ')[0])} i ${monthName(ms[1].ym).split(' ')[0]}`
      return `De ${monthName(ms[0].ym)} a ${monthName(ms[ms.length - 1].ym)}`
    },
    nextDetail () {
      const ms = this.nextMonths
      if (ms.length === 2) return ms.map(m => `${this.money(sumOf(m.rows))} al ${monthName(m.ym).split(' ')[0]}`).join(' · ')
      return `${ms.length} mesos · ${this.plural(new Set(ms.flatMap(m => m.rows).map(r => r.project_id)).size, 'projecte')}`
    },
    noDateBase () {
      return sumOf(this.sec.noDate)
    },
    laterBase () {
      return sumOf(this.sec.later)
    },
    closed () {
      if (this.closedStateIds.some(id => this.selectedStates.includes(id))) return { lines: 0 }
      const rows = this.leaderId === null ? this.rows : this.rows.filter(r => r.leader_id === this.leaderId)
      return closedPending(rows, this.closedStateIds)
    },
    leaders () {
      const seen = new Map()
      this.rows.filter(r => !isGrant(r) && r.leader_id).forEach(r => seen.set(r.leader_id, r.leader_name))
      return [...seen].map(([id, name]) => ({ id, name: name || '—' })).sort((a, b) => a.name.localeCompare(b.name))
    },
    chart () {
      return monthlyChart(this.filtered, this.invoicedByMonth, this.today, this.horizon)
    },
    chartColumns () {
      const cols = this.chart.months.map(m => ({
        ...m,
        label: monthShort(m.ym),
        title: this.cap(monthName(m.ym))
      }))
      if (this.chart.before) {
        cols.unshift({ ym: 'before', invoiced: 0, late: this.chart.before, planned: 0, label: 'abans', title: `Abans de ${monthName(this.chart.months[0].ym)}` })
      }
      return cols
    },
    chartMax () {
      return Math.max(1, ...this.chartColumns.map(m => m.invoiced + Math.max(0, m.late) + Math.max(0, m.planned)))
    },
    chartLabel () {
      return this.chartColumns.map(m => `${m.title}: facturat ${this.money(m.invoiced)}, previst i no facturat ${this.money(m.late)}, previst ${this.money(m.planned)}`).join('; ')
    },
    // the table follows the search; each group is one invoice-to-be per project
    groups () {
      const s = sections(this.searched, this.today, this.horizon)
      const out = []
      const add = (key, label, rows) => {
        if (!rows.length) return
        out.push({ key, label, rows, lines: rows.length, base: sumOf(rows), total: sumOf(rows, 'total'), projects: byProject(rows) })
      }
      add('overdue', 'Endarrerit', s.overdue)
      s.months.forEach((m, i) => add(m.ym, this.cap(monthName(m.ym)) + (i === 0 ? ' · mes en curs' : ''), m.rows))
      add('nodate', 'Sense data prevista', s.noDate)
      return out
    },
    footBase () {
      return sumOf(this.groups.filter(g => g.key !== 'nodate').flatMap(g => g.rows))
    },
    footTotal () {
      return sumOf(this.groups.filter(g => g.key !== 'nodate').flatMap(g => g.rows), 'total')
    },
    exportRows () {
      return this.groups.flatMap(g => g.rows.map(r => ({ ...r, group: g.label })))
    },
    exportFields () {
      return {
        Grup: 'group',
        Projecte: 'project_name',
        Estat: 'state_name',
        Responsable: 'leader_name',
        Client: 'client_name',
        Concepte: 'concept',
        Fase: 'phase_name',
        "Tipus d'ingrés": 'income_type_name',
        'Previsió fac.': { field: 'date', callback: (v, r) => (r && r.date_source === 'invoice' ? formatDate(v) : '') },
        'Data cobrament': { field: 'date', callback: (v, r) => (r && r.date_source === 'payment' ? formatDate(v) : '') },
        Base: { field: 'base', callback: v => this.excel(v) },
        'IVA %': 'vat_pct',
        Total: { field: 'total', callback: v => this.excel(v) }
      }
    }
  },
  watch: {
    selectedStates (v) {
      writeStorage(STORAGE_KEY, v)
    }
  },
  async mounted () {
    const h = readStorage(HORIZON_KEY)
    if (this.horizons.some(x => x.months === h)) this.horizon = h
    this.open[this.currentYm] = true
    try {
      const [states, data] = await Promise.all([
        service({ requiresAuth: true, cached: true }).get('project-states').then(r => r.data),
        service({ requiresAuth: true }).get('treasuries/invoicing-forecast').then(r => r.data)
      ])
      this.projectStates = states || []
      const saved = readStorage(STORAGE_KEY)
      const known = this.projectStates.map(s => s.id)
      if (Array.isArray(saved) && saved.some(id => known.includes(id))) {
        this.selectedStates = saved.filter(id => known.includes(id))
      } else {
        const active = this.projectStates.filter(s => /^actiu/i.test(s.name)).map(s => s.id)
        this.selectedStates = active.length ? active : known
      }
      this.rows = data.rows || []
      this.invoicedByMonth = data.invoiced_by_month || {}
      if (data.today) this.today = data.today
      this.open = { overdue: true, [this.currentYm]: true }
    } catch (e) {
      this.$buefy.toast.open({ message: "No s'ha pogut carregar la previsió de facturació", type: 'is-danger' })
    } finally {
      this.isLoading = false
    }
  },
  methods: {
    money (v) {
      return formatMoney(v)
    },
    excel (v) {
      return v === null || v === undefined ? '' : String(v).replace('.', ',')
    },
    formatDate,
    cap (s) {
      return s.charAt(0).toUpperCase() + s.slice(1)
    },
    plural (n, one, many) {
      return `${n} ${n === 1 ? one : (many || one + 's')}`
    },
    late (date) {
      return lateness(date, this.today)
    },
    pct (v) {
      return `${(Math.max(0, v) / this.chartMax) * 100}%`
    },
    setHorizon (m) {
      this.horizon = m
      writeStorage(HORIZON_KEY, m)
    },
    toggleState (id) {
      this.selectedStates = this.selectedStates.includes(id)
        ? this.selectedStates.filter(s => s !== id)
        : [...this.selectedStates, id]
    },
    isOpen (key) {
      return !!this.open[key]
    },
    toggleGroup (key) {
      this.open = { ...this.open, [key]: !this.open[key] }
    },
    linesOf (group, projectId) {
      return group.rows.filter(r => r.project_id === projectId).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
    },
    showClosed () {
      this.selectedStates = [...new Set([...this.selectedStates, ...this.closedStateIds])]
      this.open = { ...this.open, overdue: true }
      this.$nextTick(() => this.$refs.list && this.$refs.list.scrollIntoView({ behavior: 'smooth' }))
    }
  }
}
</script>

<style scoped>
.if-report {
  position: relative;
}
.if-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .625rem 1rem;
  margin-bottom: .75rem;
}
.if-filters + .if-filters {
  margin-bottom: 1rem;
}
.if-filters .export {
  display: inline-flex;
}
.doc-kpi.is-over b {
  color: var(--a-over);
}
.if-notice {
  font-size: .875rem;
}
.if-notice a {
  font-weight: 800;
  color: inherit;
}
.if-top {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}
@media screen and (max-width: 1023px) {
  .if-top {
    grid-template-columns: minmax(0, 1fr);
  }
}
.if-legend {
  display: inline-flex;
  flex-wrap: wrap;
  gap: .25rem 1rem;
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.if-legend span {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
}
.if-legend i {
  width: .75rem;
  height: .75rem;
  border-radius: 3px;
  display: inline-block;
}
.c-inv { background: var(--a-accent); }
.c-late { background: var(--a-over); }
.c-plan { background: var(--a-accent-soft); outline: 1px dashed var(--a-accent); outline-offset: -1px; }
.if-bars {
  position: relative;
  display: flex;
  gap: .5rem;
  height: 15rem;
  padding: .5rem 0 0;
  border-bottom: 0;
}
.if-col {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .375rem;
  outline: none;
}
.if-area {
  flex: 1;
  width: 70%;
  max-width: 3rem;
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  border-bottom: 1px solid var(--a-line);
}
.if-area i {
  display: block;
  border-radius: 3px;
  min-height: 2px;
}
.if-col.is-hover .if-area i {
  filter: brightness(.92);
}
.if-label {
  font-size: .75rem;
  color: var(--a-muted);
}
.if-col.is-now .if-label {
  color: var(--a-fg);
  font-weight: 800;
}
.if-tip {
  position: absolute;
  top: 0;
  left: calc(50% + 1.5rem);
  z-index: 5;
  min-width: 14rem;
  padding: .625rem .75rem;
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(16, 32, 30, .14);
  font-size: .8125rem;
  pointer-events: none;
}
.if-tip.is-left {
  left: auto;
  right: calc(50% + 1.5rem);
}
.if-tip dl {
  display: grid;
  grid-template-columns: auto auto;
  gap: .125rem 1rem;
  margin-top: .375rem;
  font-variant-numeric: tabular-nums;
}
.if-tip dd {
  text-align: right;
}
.if-foot {
  margin-top: .75rem;
  font-size: .8125rem;
}
.list-box > .if-foot {
  margin: 0;
  padding: .75rem 1.25rem;
  border-top: 1px solid var(--a-line-soft);
}
.if-num {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.if-search {
  flex: 0 1 20rem;
}
.if-table {
  min-width: 52rem;
}
.if-table td {
  vertical-align: middle;
}
.if-group td {
  background: var(--a-thead);
  font-weight: 800;
}
.if-toggle {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.if-toggle .has-text-muted {
  font-weight: 600;
}
.if-toggle.is-row {
  float: left;
  margin: .125rem .375rem 0 -.25rem;
  color: var(--a-muted);
}
.if-project {
  font-weight: 700;
}
.if-line td {
  font-size: .875rem;
  background: var(--a-bg);
}
.if-line td:first-child {
  padding-left: 2.5rem;
}
.tag.is-late-warn {
  background: var(--a-warn-bg);
  color: var(--a-warn-fg);
}
.tag.is-late-bad {
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
}
.if-empty {
  padding: 2rem 1rem;
}
</style>
