<template>
  <!-- Informes › Dedicació: each person's working hours of the year (her jornada at
       Persones, minus holidays, vacations and free days) against the agreement, next
       to her planned and worked hours (issues/446). Same figures as «Resum hores». -->
  <section class="a-box da-box">
    <header class="box-head">
      <h2>Jornada i conveni per persona</h2>
      <span class="box-hint">Laborables: la jornada de Persones menys festius, vacances i lliure elecció. Previstes i fetes, amb els filtres de dalt.</span>
    </header>
    <p v-if="loading && !list.length" class="box-empty">Calculant les jornades…</p>
    <p v-else-if="failed" class="box-empty">No s'han pogut carregar les jornades.</p>
    <p v-else-if="!list.length" class="box-empty">Cap persona amb jornada a {{ year }}.</p>
    <div v-else class="table-wrap">
      <table class="table is-fullwidth da-table">
        <thead>
          <tr>
            <th v-for="c in columns" :key="c.key" :class="{ 'has-text-right': c.numeric }">
              <button type="button" class="da-sort" :title="c.title" @click="sortBy(c.key)">
                {{ c.label }}<span v-if="sort.key === c.key" aria-hidden="true">{{ sort.asc ? " ▲" : " ▼" }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in sorted" :key="p.key">
            <th scope="row">{{ p.name }}</th>
            <template v-if="p.hasJornada">
              <td class="has-text-right" :title="pct(p.ratio) + ' d\'una jornada completa'">{{ hours(p.dayHours, 2) }}/dia</td>
              <td class="has-text-right" :title="days(p.laborableDays)"><b>{{ hours(p.laborable) }}</b></td>
              <td class="has-text-right" :title="days(p.agreementDays)">{{ hours(p.agreement) }}</td>
              <td class="has-text-right" :class="'has-text-' + sign(p.balance)">{{ signed(p.balance) }}</td>
            </template>
            <td v-else colspan="4" class="has-text-muted">
              Sense jornada a <router-link to="/jornada">Persones</router-link> per a {{ year }}
            </td>
            <td class="has-text-right">{{ hours(p.planned) }}</td>
            <td class="has-text-right">{{ hours(p.worked) }}</td>
            <td class="has-text-right">
              <span v-if="p.hasJornada && p.laborable > 0" :class="{ 'has-text-neg': p.worked > p.laborable }">{{ pct(p.worked / p.laborable) }}</span>
              <span v-else class="has-text-muted">—</span>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="sorted.length > 1">
          <tr>
            <th>Total</th>
            <th></th>
            <th class="has-text-right">{{ hours(total.laborable) }}</th>
            <th class="has-text-right">{{ hours(total.agreement) }}</th>
            <th class="has-text-right" :class="'has-text-' + sign(total.balance)">{{ signed(total.balance) }}</th>
            <th class="has-text-right">{{ hours(total.planned) }}</th>
            <th class="has-text-right">{{ hours(total.worked) }}</th>
            <th class="has-text-right">{{ total.laborable > 0 ? pct(total.worked / total.laborable) : "—" }}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>

<script>
import moment from 'moment'
import service from '@/service/index'
import { startLoad } from '@/domain/latestLoad'
import { festivesBetween } from '@/domain/workdayLog'
import { agreementYearByPerson } from '@/domain/agreementHours'
import { formatNumber, sign } from '@/helpers/format-number'

const COLUMNS = [
  { key: 'name', label: 'Persona' },
  { key: 'dayHours', label: 'Jornada', numeric: true, title: 'Hores d\'un dia amb jornada' },
  { key: 'laborable', label: 'Laborables', numeric: true, title: 'Hores de jornada de l\'any, menys festius, vacances i lliure elecció (també els dies que falten per gastar)' },
  { key: 'agreement', label: 'Conveni', numeric: true, title: 'Màxim d\'hores del conveni, a l\'escala de la seva jornada' },
  { key: 'balance', label: 'Saldo', numeric: true, title: 'Laborables − conveni' },
  { key: 'planned', label: 'Previstes', numeric: true },
  { key: 'worked', label: 'Fetes', numeric: true },
  { key: 'share', label: '% fetes', numeric: true, title: 'Hores fetes sobre les laborables' }
]

export default {
  name: 'DedicationAgreement',
  props: {
    year: { type: Number, default: 0 },
    // one person (id), or 0 for everyone
    person: { type: Number, default: 0 },
    // [{ id, username, hidden }]
    users: { type: Array, default: () => [] },
    // the rows of the pivot (planned and worked hours), as the charts get them
    rows: { type: Array, default: () => [] }
  },
  data () {
    return {
      loading: false,
      failed: false,
      // user id → figures of the year; loaded only when the year or the person
      // change, not with the other filters (they don't change a jornada)
      figures: new Map(),
      columns: COLUMNS,
      sort: { key: 'name', asc: true }
    }
  },
  computed: {
    // planned and worked hours by person, from the pivot rows
    hoursByName () {
      const byName = new Map()
      for (const r of this.rows || []) {
        const name = r.username
        if (!name || name === '-') continue
        const h = byName.get(name) || { planned: 0, worked: 0 }
        h.planned += Number(r.estimated_hours) || 0
        h.worked += Number(r.hours) || 0
        byName.set(name, h)
      }
      return byName
    },
    list () {
      const usersById = new Map(this.users.filter(u => u.id).map(u => [u.id, u]))
      const seen = new Set()
      const list = []
      for (const [id, f] of this.figures) {
        if (this.person && id !== this.person) continue
        const user = usersById.get(id)
        if (!user) continue
        seen.add(user.username)
        const h = this.hoursByName.get(user.username) || { planned: 0, worked: 0 }
        if (user.hidden && !h.planned && !h.worked) continue
        list.push({
          key: id,
          name: user.username,
          hasJornada: true,
          dayHours: f.calc.dayHours,
          ratio: f.calc.ratio,
          laborable: f.laborable.hours,
          laborableDays: f.laborable.days,
          agreement: f.agreement.hours,
          agreementDays: f.agreement.days,
          balance: f.balance.hours,
          ...h,
          share: f.laborable.hours > 0 ? h.worked / f.laborable.hours : -1
        })
      }
      // hours of someone without a jornada that year: shown, so nothing is lost
      if (!this.loading) {
        const picked = this.person && usersById.get(this.person)
        for (const [name, h] of this.hoursByName) {
          if (seen.has(name) || (!h.planned && !h.worked)) continue
          if (this.person && (!picked || picked.username !== name)) continue
          list.push({ key: 'n-' + name, name, hasJornada: false, dayHours: -1, laborable: -1, agreement: -1, balance: -Infinity, share: -1, ...h })
        }
      }
      return list
    },
    sorted () {
      const { key, asc } = this.sort
      const dir = asc ? 1 : -1
      return [...this.list].sort((a, b) => {
        const x = a[key]
        const y = b[key]
        const c = key === 'name' ? String(x).localeCompare(String(y)) : x - y
        return c * dir || a.name.localeCompare(b.name)
      })
    },
    total () {
      const t = { laborable: 0, agreement: 0, balance: 0, planned: 0, worked: 0 }
      for (const p of this.list) {
        t.planned += p.planned
        t.worked += p.worked
        if (!p.hasJornada) continue
        t.laborable += p.laborable
        t.agreement += p.agreement
        t.balance += p.balance
      }
      return t
    },
    loadKey () {
      return `${this.year}|${this.person}`
    }
  },
  watch: {
    loadKey () {
      this.load()
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    sign,
    async load () {
      const isStale = startLoad(this)
      if (!this.year) {
        this.figures = new Map()
        return
      }
      this.loading = true
      this.failed = false
      const year = this.year
      const from = `${year}-01-01`
      const to = `${year}-12-31`
      const get = (url, opts = {}) => service({ requiresAuth: true, ...opts }).get(url)
      try {
        // five requests for everyone, side by side (not one per person)
        const own = this.person ? `&_where[users_permissions_user.id]=${this.person}` : ''
        const [years, types, festives, periods, userFestives] = await Promise.all([
          get(`years?_where[year_eq]=${year}`, { cached: true }),
          get('festive-types?_limit=-1', { cached: true }),
          get(festivesBetween(from, to)),
          get(`daily-dedications?_limit=-1${own}`),
          get('user-festives?_limit=-1&_where[festive_type_null]=false')
        ])
        if (isStale()) return
        const yearDetails = years.data[0] || {}
        this.figures = agreementYearByPerson({
          year,
          periods: periods.data,
          festives: festives.data,
          festiveTypes: types.data,
          userFestives: userFestives.data,
          workingHours: yearDetails.working_hours,
          today: moment().format('YYYY-MM-DD')
        })
      } catch (e) {
        if (isStale()) return
        this.figures = new Map()
        this.failed = true
      }
      this.loading = false
    },
    sortBy (key) {
      this.sort = this.sort.key === key ? { key, asc: !this.sort.asc } : { key, asc: key === 'name' }
    },
    hours (v, decimals = 0) {
      return `${formatNumber(Number(v) || 0, decimals, 0)} h`
    },
    days (v) {
      return `${formatNumber(Number(v) || 0, 1, 0)} dies`
    },
    signed (v) {
      const n = Math.round(Number(v) || 0)
      return `${n > 0 ? '+' : ''}${formatNumber(n, 0, 0)} h`
    },
    pct (v) {
      return `${Math.round((Number(v) || 0) * 100)} %`
    }
  }
}
</script>

<style scoped>
.da-box {
  margin-bottom: 1.5rem;
}
.table-wrap {
  overflow-x: auto;
}
.da-table {
  font-size: .875rem;
  font-variant-numeric: tabular-nums;
}
.da-table td,
.da-table th {
  white-space: nowrap;
}
.da-sort {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: inherit;
  cursor: pointer;
}
</style>
