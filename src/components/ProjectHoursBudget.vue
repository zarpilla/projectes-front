<template>
  <!-- issues/371: the budget of a project billed by the hour. Instead of the
       phases editor: the price/hour and who works how many hours. The lines
       live in the phases underneath (domain/hoursBudget). -->
  <div class="project-hours-budget">
    <b-field label="Preu/hora" horizontal message="El que es factura per cada hora. L'ingrés previst és hores × preu/hora.">
      <b-input
        :model-value="price"
        type="number"
        step="0.01"
        min="0"
        :disabled="!editable"
        class="price-input"
        aria-label="Preu/hora"
        @update:model-value="$emit('update:price', $event)"
      />
    </b-field>

    <div class="table-wrap">
      <table class="table is-fullwidth is-narrow">
        <thead>
          <tr>
            <th scope="col">Persona</th>
            <th scope="col" class="has-text-right">Hores</th>
            <th scope="col">Des de</th>
            <th scope="col">Fins a</th>
            <th v-if="editable" scope="col"><span class="is-sr-only">Accions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="r.hour.id || r.hour._uuid || i">
            <td>
              <b-select :model-value="userId(r.hour)" :disabled="!editable" size="is-small" placeholder="Persona" @update:model-value="setUser(r, $event)">
                <option v-for="u in userOptions" :key="u.id" :value="u.id">{{ u.username }}</option>
              </b-select>
            </td>
            <td class="has-text-right">
              <b-input
                :model-value="r.hour.quantity"
                type="number"
                step="0.25"
                min="0"
                size="is-small"
                class="hours-input"
                :disabled="!editable"
                :aria-label="'Hores de ' + userName(r.hour)"
                @update:model-value="set(r, 'quantity', $event)"
              />
              <small v-if="r.hour.quantity_type === 'week' || r.hour.quantity_type === 'month'" class="per">
                {{ r.hour.quantity_type === 'week' ? 'a la setmana' : 'al mes' }} · {{ hoursText(hoursOfRow(r.hour)) }}
              </small>
            </td>
            <td><b-input :model-value="r.hour.from" type="date" size="is-small" :disabled="!editable" aria-label="Des de" @update:model-value="set(r, 'from', $event)" /></td>
            <td><b-input :model-value="r.hour.to" type="date" size="is-small" :disabled="!editable" aria-label="Fins a" @update:model-value="set(r, 'to', $event)" /></td>
            <td v-if="editable" class="has-text-right">
              <b-button size="is-small" icon-left="delete" type="is-danger is-light" :aria-label="'Treu les hores de ' + userName(r.hour)" @click="remove(r)" />
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="editable ? 5 : 4" class="has-text-grey">Encara no hi ha hores previstes.</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <th class="has-text-right">{{ hoursText(totalHours) }}</th>
            <th colspan="2" class="has-text-right">Ingrés previst: {{ money(totalAmount) }}</th>
            <th v-if="editable"></th>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="actions">
      <b-button v-if="editable" icon-left="plus" size="is-small" @click="add">Afegeix hores</b-button>
      <b-button type="is-text" size="is-small" @click="$emit('show-phases')">Mostra les fases</b-button>
    </div>
    <p v-if="invoicedLines" class="help invoiced-note">
      {{ invoicedLines === 1 ? 'Una línia d\'hores ja està facturada i conserva' : invoicedLines + ' línies d\'hores ja estan facturades i conserven' }} l'import de la factura.
    </p>
    <p v-if="others" class="help">
      El pressupost té {{ others }} {{ others === 1 ? 'línia' : 'línies' }} més (ingressos sense hores o despeses): es veuen i s'editen a «Mostra les fases».
    </p>
  </div>
</template>

<script>
import service from '@/service/index'
import { formatMoney, formatNumber } from '@/helpers/format-number'
import { hoursLines, hoursOfLine, hoursOfRow, ensureHoursLine, priceHoursLines, otherLinesCount, hoursLinesTotal, invoicedHoursLinesCount } from '@/domain/hoursBudget.js'

export default {
  name: 'ProjectHoursBudget',
  emits: ['update:price', 'phases-updated', 'hour-deleted', 'show-phases'],
  props: {
    // the plan it edits (the original while creating the project, else the execution)
    phases: { type: Array, required: true },
    price: { type: [Number, String], default: 0 },
    editable: { type: Boolean, default: true },
    // new hours take the project's dates
    dateStart: { type: String, default: null },
    dateEnd: { type: String, default: null },
    // tests pass them; otherwise loaded
    usersList: { type: Array, default: null }
  },
  data () {
    return { users: this.usersList || [], version: 0 }
  },
  computed: {
    rows () {
      // eslint-disable-next-line no-unused-expressions
      this.version
      return hoursLines(this.phases).flatMap(({ line }) => line.estimated_hours.map(hour => ({ line, hour })))
    },
    totalHours () {
      // eslint-disable-next-line no-unused-expressions
      this.version
      return hoursLines(this.phases).reduce((s, { line }) => s + hoursOfLine(line), 0)
    },
    totalAmount () {
      // eslint-disable-next-line no-unused-expressions
      this.version
      return hoursLinesTotal(this.phases)
    },
    invoicedLines () {
      return invoicedHoursLinesCount(this.phases)
    },
    // the visible people, plus a hidden one (who left) that already has hours here
    userOptions () {
      const used = new Set(this.rows.map(r => this.userId(r.hour)))
      return this.users.filter(u => !u.hidden || used.has(u.id))
    },
    others () {
      return otherLinesCount(this.phases)
    }
  },
  watch: {
    price () {
      if (priceHoursLines(this.phases, this.price)) this.changed()
    }
  },
  created () {
    if (!this.usersList) {
      service({ requiresAuth: true, cached: true }).get('users').then(r => {
        this.users = r.data || []
      })
    }
  },
  methods: {
    hoursOfRow,
    money: formatMoney,
    hoursText: v => formatNumber(v, 2) + ' h',
    userId (hour) {
      const u = hour.users_permissions_user
      return u && typeof u === 'object' ? u.id : u || null
    },
    userName (hour) {
      const u = this.users.find(x => x.id === this.userId(hour))
      return u ? u.username : ''
    },
    changed () {
      priceHoursLines(this.phases, this.price)
      this.version++
      this.$emit('phases-updated', { phases: this.phases })
    },
    set (r, field, value) {
      r.hour[field] = field === 'quantity' ? (value === '' ? 0 : Number(value)) : value
      r.hour.dirty = true
      r.line.dirty = true
      this.changed()
    },
    setUser (r, id) {
      const u = this.users.find(x => x.id === id)
      r.hour.users_permissions_user = u ? { id: u.id, username: u.username } : null
      r.hour.dirty = true
      r.line.dirty = true
      this.changed()
    },
    add () {
      const line = ensureHoursLine(this.phases, this.price)
      line.estimated_hours.push({
        users_permissions_user: null,
        quantity: 0,
        quantity_type: 'total',
        from: this.dateStart || this.dateEnd || null,
        to: this.dateEnd || this.dateStart || null,
        monthly_quantity: null,
        _uuid: 'h' + Date.now() + Math.random().toString(36).slice(2, 6),
        dirty: true
      })
      line.dirty = true
      this.changed()
    },
    remove (r) {
      r.line.estimated_hours = r.line.estimated_hours.filter(h => h !== r.hour)
      r.line.dirty = true
      if (r.hour.id) this.$emit('hour-deleted', r.hour.id)
      this.changed()
    }
  }
}
</script>

<style scoped>
.project-hours-budget {
  display: flex;
  flex-direction: column;
  gap: .75rem;
}
.table-wrap {
  overflow-x: auto;
}
.price-input {
  max-width: 10rem;
}
.hours-input {
  max-width: 7rem;
  margin-left: auto;
}
.per {
  display: block;
  color: var(--a-fg-2, #666);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}
</style>
