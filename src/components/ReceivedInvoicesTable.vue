<template>
  <section class="xsection">
    <download-csv class="export" :data="emittedCSV">
      <b-button
      title="Exporta dades"
      class="export-button mb-3"
      icon-left="export" />
    </download-csv>
    <b-table
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="emitted"
      :row-class="(row, index) => row.subtotal < 0 && 'has-text-danger has-text-bold' || row.type == 'Avui' && 'has-text-info' "
    >
      <b-table-column label="Codi" field="code" v-slot="props" sortable>
        {{ props.row.code }}
      </b-table-column>
      <b-table-column label="Data" field="emitted" v-slot="props" sortable>
        {{ formatDate(props.row.emitted) }}
      </b-table-column>
      <b-table-column label="Venciment" field="paybefore" v-slot="props" sortable>
        {{ formatDate(props.row.paybefore) }}
      </b-table-column>
      <b-table-column label="Contacte" field="contact.name" v-slot="props" sortable>
        {{ props.row.contact ? props.row.contact.name : '-' }}
      </b-table-column>
      <b-table-column label="NIF Contacte" field="contact.name" v-slot="props" sortable>
        {{ props.row.contact ? props.row.contact.nif : '-' }}
      </b-table-column>
      <b-table-column label="Concepte" field="lines" v-slot="props" sortable>
        {{ props.row.lines && props.row.lines.length > 0 ? props.row.lines[0].concept : '' }}
      </b-table-column>
      <b-table-column label="Projecte" field="lines" v-slot="props" sortable>
        {{ props.row.project ? props.row.project.name : '-' }}
      </b-table-column>
      <b-table-column label="Base" field="total_base" v-slot="props" sortable>
        {{ formatPrice(props.row.total_base) }} €
      </b-table-column>
      <b-table-column label="IVA" field="total_vat" v-slot="props" sortable>
        {{ formatPrice(props.row.total_vat) }} €
      </b-table-column>
      <b-table-column label="IRPF" field="total_irpf" v-slot="props" sortable>
        {{ formatPrice(-1 * props.row.total_irpf) }} €
      </b-table-column>
      <b-table-column label="Total" field="total" v-slot="props" sortable>
        {{ formatPrice(props.row.total) }} €
      </b-table-column>
    </b-table>
  </section>
</template>

<script>
import service from '@/service/index'
import moment from 'moment'
// import sortBy from 'lodash/sortBy'

export default {
  name: 'Tresoreria',
  props: {
    titleStack: {
      type: Array,
      default: () => []
    },
    year: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      isLoading: false,
      years: [],
      projects: [],
      treasury: [],
      treasuryData: [],
      emitted: [],
      emittedCSV: [],
      received: [],
      tickets: [],
      diets: [],
      emittedGrants: [],
      receivedGrants: [],
      projectIncomes: [],
      projectExpenses: []
    }
  },
  watch: {
    year: function (newVal, oldVal) {
      this.getData()
    }
  },
  async mounted () {
    this.getData()
  },
  methods: {
    formatPrice (value) {
      const val = (value / 1).toFixed(2).replace('.', ',')
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    },
    formatDate (value) {
      return moment(value, 'YYYY-MM-DD').format('DD-MM-YYYY')
    },
    async getData () {
      this.isLoading = true
      if (!this.year) {
        return
      }
      const from = moment(this.year).startOf('year').format('YYYY-MM-DD')
      const to = moment(this.year).endOf('year').format('YYYY-MM-DD')
      this.emitted = (await service({ requiresAuth: true }).get(`received-invoices?_limit=-1&_where[emitted_gte]=${from}&[emitted_lte]=${to}`)).data
      this.emittedCSV = this.emitted.map(e => {
        return {
          num: e.code,
          data: e.date,
          proveidor: e.contact ? e.contact.name : '',
          nif: e.contact ? e.contact.nif : '',
          concepte: e.lines && e.lines.length > 0 ? e.lines[0].concepte : '',
          projecte: e.project ? e.project.name : '',
          base: e.total_base,
          vat: e.total_vat,
          irpf: e.total_irpf,
          total: e.total
        }
      })

      this.isLoading = false
    }
  }
}
</script>
