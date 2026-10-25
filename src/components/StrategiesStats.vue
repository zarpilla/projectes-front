<template>
  <!-- Informes › Estratègies (mockup A-Informe-Estrategies): the projects of the
       pivot below as KPIs, a table per strategic line and a strategy × àmbit map -->
  <div class="st-stats">
    <div v-if="fewTagged" class="notification is-info st-notice" role="status">
      <span>
        <b>{{ fewTaggedText }}</b>
        Amb aquest estat l'informe queda gairebé buit: la majoria de projectes amb estratègia tenen un altre estat.
      </span>
      <button type="button" class="button is-small" @click="$emit('show-all')">Mostra tots els estats</button>
    </div>

    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Projectes amb estratègia</span>
        <b>{{ int(stats.projects) }}</b>
        <small>de {{ int(stats.total) }} {{ stats.total === 1 ? 'projecte' : 'projectes' }}</small>
      </div>
      <div class="doc-kpi">
        <span>Estratègies en ús</span>
        <b>{{ int(stats.used) }} de {{ int(stats.available) }}</b>
        <small v-if="stats.unused.length" :title="stats.unused.map(s => s.code).join(', ')">{{ stats.unused.length }} no {{ stats.unused.length === 1 ? 'té' : 'tenen' }} cap projecte</small>
        <small v-else>Totes tenen algun projecte</small>
      </div>
      <div class="doc-kpi">
        <span>Hores previstes</span>
        <b>{{ int(stats.hours) }} h</b>
        <small>Dels projectes amb estratègia</small>
      </div>
      <div class="doc-kpi">
        <span>Balanç</span>
        <b :class="{ 'has-text-neg': stats.balance < 0 }">{{ money(stats.balance) }}</b>
        <small>Ingressos − despeses dels mateixos projectes</small>
      </div>
    </div>

    <section class="a-box st-box" aria-labelledby="st-h-table">
      <header class="box-head">
        <div>
          <h2 id="st-h-table">{{ byProject ? 'Per projecte' : 'Per estratègia' }}</h2>
          <span class="box-hint">{{ byProject ? 'Els projectes amb estratègia, amb més hores previstes primer' : 'Agrupades per línia estratègica' }}</span>
        </div>
        <div class="segmented" role="group" aria-label="Files">
          <button type="button" :class="{ 'is-on': !byProject }" :aria-pressed="String(!byProject)" @click="byProject = false">Estratègia</button>
          <button type="button" :class="{ 'is-on': byProject }" :aria-pressed="String(byProject)" @click="byProject = true">Projecte</button>
        </div>
      </header>

      <p v-if="!stats.projects" class="box-empty">Cap projecte amb aquest estat té estratègies.</p>

      <div v-else-if="!byProject" class="table-wrap st-flush">
        <table class="table is-fullwidth is-narrow st-table">
          <thead>
            <tr>
              <th>Codi</th>
              <th>Estratègia</th>
              <th class="has-text-right">Projectes</th>
              <th><span class="is-sr-only">Proporció</span></th>
              <th class="has-text-right">Hores previstes</th>
              <th class="has-text-right">Balanç</th>
            </tr>
          </thead>
          <tbody v-for="line in stats.lines" :key="line.key">
            <tr class="st-line">
              <td colspan="2">
                <button
                  type="button"
                  class="st-tog"
                  :aria-expanded="String(!collapsed[line.key])"
                  :aria-label="(collapsed[line.key] ? 'Desplega ' : 'Plega ') + line.label"
                  @click="toggle(line.key)"
                >{{ collapsed[line.key] ? '▸' : '▾' }}</button>
                {{ line.label }}
                <span class="has-text-muted">· {{ line.strategies.length }} {{ line.strategies.length === 1 ? 'estratègia' : 'estratègies' }}</span>
              </td>
              <td class="has-text-right">{{ int(line.projects) }}</td>
              <td></td>
              <td class="has-text-right">{{ int(line.hours) }} h</td>
              <td class="has-text-right" :class="{ 'has-text-neg': line.balance < 0 }">{{ money(line.balance) }}</td>
            </tr>
            <template v-if="!collapsed[line.key]">
              <tr v-for="s in line.strategies" :key="s.id">
                <td class="st-lvl2"><span class="tag">{{ s.code }}</span></td>
                <td class="st-name">{{ s.name }}</td>
                <td class="has-text-right">{{ int(s.projects) }}</td>
                <td class="st-bar-cell"><div class="st-bar"><span :style="{ width: pct(s.share) }"></span></div></td>
                <td class="has-text-right">{{ int(s.hours) }} h</td>
                <td class="has-text-right" :class="{ 'has-text-neg': s.balance < 0 }">{{ money(s.balance) }}</td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">Total (projectes únics)</td>
              <td class="has-text-right">{{ int(stats.projects) }}</td>
              <td></td>
              <td class="has-text-right">{{ int(stats.hours) }} h</td>
              <td class="has-text-right" :class="{ 'has-text-neg': stats.balance < 0 }">{{ money(stats.balance) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div v-else class="table-wrap st-flush">
        <table class="table is-fullwidth is-narrow st-table">
          <thead>
            <tr>
              <th>Projecte</th>
              <th>Estratègies</th>
              <th>Àmbit</th>
              <th class="has-text-right">Hores previstes</th>
              <th class="has-text-right">Balanç</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in projectRows" :key="p.id">
              <td class="st-name">
                <router-link :to="`/projecte/${p.id}`">{{ p.name }}</router-link>
                <small v-if="p.state" class="st-sub">{{ p.state }}</small>
              </td>
              <td class="st-tags"><span v-for="s in p.strategies" :key="s.id" class="tag" :title="s.name">{{ s.code }}</span></td>
              <td>{{ p.scope || '–' }}</td>
              <td class="has-text-right">{{ int(p.hours) }} h</td>
              <td class="has-text-right" :class="{ 'has-text-neg': p.balance < 0 }">{{ money(p.balance) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Total · {{ int(stats.projects) }} {{ stats.projects === 1 ? 'projecte' : 'projectes' }}</td>
              <td class="has-text-right">{{ int(stats.hours) }} h</td>
              <td class="has-text-right" :class="{ 'has-text-neg': stats.balance < 0 }">{{ money(stats.balance) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p v-if="stats.projects && !byProject" class="st-foot">Un projecte pot tenir diverses estratègies: les files no se sumen. Els subtotals de línia i el total compten cada projecte un sol cop.</p>
    </section>

    <section v-if="matrix.rows.length" class="a-box st-box" aria-labelledby="st-h-matrix">
      <header class="box-head">
        <div>
          <h2 id="st-h-matrix">Estratègia × àmbit</h2>
          <span class="box-hint">Nombre de projectes</span>
        </div>
        <ul class="st-legend" aria-label="Escala">
          <li><i class="st-h1"></i>1</li>
          <li><i class="st-h2"></i>2–3</li>
          <li><i class="st-h3"></i>4–6</li>
          <li><i class="st-h4"></i>7 o més</li>
        </ul>
      </header>
      <div class="table-wrap st-flush">
        <table class="table is-fullwidth is-narrow st-matrix">
          <thead>
            <tr>
              <th>Codi</th>
              <th v-for="scope in matrix.scopes" :key="String(scope.key)" class="has-text-centered" :title="scope.name">{{ scope.name }}</th>
              <th class="has-text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in matrix.rows" :key="row.id">
              <th scope="row"><span class="tag" :title="row.name">{{ row.code }}</span></th>
              <td
                v-for="(n, i) in row.cells"
                :key="i"
                class="st-hm"
                :class="n ? `st-h${level(n)}` : ''"
                :title="n ? `${row.code} · ${matrix.scopes[i].name}: ${n} ${n === 1 ? 'projecte' : 'projectes'}` : null"
              >
                <template v-if="n">{{ n }}</template>
                <span v-else class="is-sr-only">0</span>
              </td>
              <td class="has-text-right">{{ row.total }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import { strategyStats, strategyProjects, strategyMatrix, heatLevel } from '@/domain/strategyStats'
import { formatNumber, formatMoney } from '@/helpers/format-number'

export default {
  name: 'StrategiesStats',
  props: {
    projects: { type: Array, default: () => [] },
    strategies: { type: Array, default: () => [] },
    // the «Estat projecte» filter: its name, or null for «Tots»
    stateName: { type: String, default: null }
  },
  emits: ['show-all'],
  data () {
    return {
      byProject: false,
      collapsed: {}
    }
  },
  computed: {
    stats () {
      return strategyStats(this.projects, this.strategies)
    },
    projectRows () {
      return strategyProjects(this.projects)
    },
    matrix () {
      return strategyMatrix(this.projects)
    },
    // a state where (almost) no project has strategies: offer «Tots»
    fewTagged () {
      return !!this.stateName && this.stats.total > 0 && this.stats.projects * 4 < this.stats.total
    },
    fewTaggedText () {
      const { projects, total } = this.stats
      const state = (this.stateName || '').toLowerCase()
      if (!projects) return `Cap dels ${this.int(total)} projectes en estat «${state}» té estratègies assignades.`
      return `Només ${this.int(projects)} dels ${this.int(total)} projectes en estat «${state}» ${projects === 1 ? 'té' : 'tenen'} estratègies assignades.`
    }
  },
  methods: {
    int (value) {
      return formatNumber(value, 0)
    },
    money (value) {
      return formatMoney(value)
    },
    pct (share) {
      return `${Math.round(share * 1000) / 10}%`
    },
    level (n) {
      return heatLevel(n)
    },
    toggle (key) {
      this.collapsed = { ...this.collapsed, [key]: !this.collapsed[key] }
    }
  }
}
</script>

<style scoped>
.st-stats {
  margin-bottom: 1.5rem;
}
.st-notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
}
.st-box {
  margin-bottom: 1rem;
}
/* the tables run edge to edge inside the box */
.st-flush {
  margin: -1rem -1.25rem 0;
}
.st-box > .st-flush:last-child {
  margin-bottom: -1rem;
}
.st-table td,
.st-table th,
.st-matrix td,
.st-matrix th {
  font-variant-numeric: tabular-nums;
}
.st-table td:first-child,
.st-table th:first-child,
.st-matrix td:first-child,
.st-matrix th:first-child {
  padding-left: 1.25rem;
}
.st-table td:last-child,
.st-table th:last-child,
.st-matrix td:last-child,
.st-matrix th:last-child {
  padding-right: 1.25rem;
}
.st-table td.has-text-right,
.st-table th.has-text-right {
  white-space: nowrap;
}
.st-line td {
  font-weight: 800;
  border-top: 1px solid var(--a-line);
}
.st-tog {
  width: 1.375rem;
  height: 1.375rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--a-muted);
  font: inherit;
  cursor: pointer;
}
.st-lvl2 {
  padding-left: 2.25rem !important;
  white-space: nowrap;
}
.st-name {
  min-width: 15rem;
  font-weight: 600;
}
.st-sub {
  display: block;
  font-weight: 400;
  color: var(--a-muted);
}
.st-tags .tag {
  margin: 0 .25rem .125rem 0;
}
.st-bar-cell {
  width: 140px;
  min-width: 80px;
}
.st-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--a-line-soft);
  overflow: hidden;
}
.st-bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--a-accent);
}
.st-foot {
  margin: 0 -1.25rem -1rem;
  padding: .625rem 1.25rem;
  border-top: 1px solid var(--a-line);
  font-size: .8125rem;
  color: var(--a-muted);
}
.st-legend {
  display: flex;
  flex-wrap: wrap;
  gap: .375rem 1.125rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: .8125rem;
  font-weight: 600;
  color: var(--a-fg-2);
}
.st-legend li {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
}
.st-legend i {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
.st-matrix thead th:not(:first-child):not(:last-child) {
  max-width: 9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.st-matrix th[scope=row] {
  background: transparent;
}
.st-hm {
  width: 9%;
  text-align: center !important;
  font-weight: 800;
  border-left: 2px solid var(--a-surface);
}
</style>

<style>
/* sequential teal of the heat map (not scoped: the dark theme sets it on <html>;
   the cells name the table so they win over Bulma's cell background) */
.st-h1, .table.st-matrix td.st-h1 { background: #E3F4F1; color: #0E3B35; }
.st-h2, .table.st-matrix td.st-h2 { background: #BFE3DC; color: #0E3B35; }
.st-h3, .table.st-matrix td.st-h3 { background: #7CC4B8; color: #0E3B35; }
.st-h4, .table.st-matrix td.st-h4 { background: #0B7A6C; color: #fff; }
[data-theme=dark] .st-h1, [data-theme=dark] .table.st-matrix td.st-h1 { background: #15403A; color: #C9EDE6; }
[data-theme=dark] .st-h2, [data-theme=dark] .table.st-matrix td.st-h2 { background: #1D6157; color: #E3F4F1; }
[data-theme=dark] .st-h3, [data-theme=dark] .table.st-matrix td.st-h3 { background: #2C8F80; color: #fff; }
[data-theme=dark] .st-h4, [data-theme=dark] .table.st-matrix td.st-h4 { background: #3DC2AC; color: #0E1516; }
</style>
