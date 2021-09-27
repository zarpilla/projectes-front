<template>
  <section class="section">
    <b-table
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="treasuryData"
      :row-class="(row, index) => row.subtotal < 0 && 'has-text-danger has-text-bold' || row.type == 'Avui' && 'has-text-info' "
    >
      <b-table-column label="Data" field="date" v-slot="props">
        {{ formatDate(props.row.date) }}
        <b-icon
          v-if="props.row.date_error"
          class="has-text-danger"
          icon="alert-circle"
          title="No hi ha data"
          size="is-small">
        </b-icon>
      </b-table-column>
      <b-table-column label="Saldo" field="subtotal" v-slot="props">
        {{ formatPrice(props.row.subtotal) }} €
      </b-table-column>
      <b-table-column label="Import" field="total_amount" v-slot="props">
        {{ formatPrice(props.row.total_amount) }} €
      </b-table-column>
      <b-table-column label="Moviment" field="type" v-slot="props">
        <span :class="props.row.paid ? 'has-text-success' : 'zhas-text-success'">
        {{ props.row.type }}
        </span>
      </b-table-column>
      <b-table-column label="Concepte" field="concept" v-slot="props">
        {{ props.row.concept }}
      </b-table-column>
      <b-table-column label="Projecte" field="project_name" v-slot="props">
        {{ props.row.project_name }}
      </b-table-column>
      <b-table-column label="Contacte" field="contact" v-slot="props">
        {{ props.row.contact }}
      </b-table-column>
    </b-table>
  </section>
</template>

<script>
import service from '@/service/index'
import moment from 'moment'
import sortBy from 'lodash/sortBy'

export default {
  name: 'Tresoreria',
  props: {
    titleStack: {
      type: Array,
      default: () => []
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
      received: [],
      tickets: [],
      diets: [],
      emittedGrants: [],
      receivedGrants: [],
      projectIncomes: [],
      projectExpenses: []
    }
  },
  async mounted () {
    this.isLoading = true

    const treasuries = (await service({ requiresAuth: true }).get('treasuries?_limit=-1')).data
    this.emitted = (await service({ requiresAuth: true }).get('emitted-invoices?_limit=-1')).data
    this.received = (await service({ requiresAuth: true }).get('received-invoices?_limit=-1')).data
    this.tickets = (await service({ requiresAuth: true }).get('tickets?_limit=-1')).data
    this.diets = (await service({ requiresAuth: true }).get('diets?_limit=-1')).data
    this.emittedGrants = (await service({ requiresAuth: true }).get('emitted-grants?_limit=-1')).data
    this.receivedGrants = (await service({ requiresAuth: true }).get('emitted-grants?_limit=-1')).data

    service({ requiresAuth: true }).get('projects?_limit=-1').then((r) => {
      this.projects = r.data
      this.projects.forEach(p => {
        p.expenses.forEach(e => {
          // console.log('e', e)
          if (!e.paid) {
            const expense = {
              project_name: p.name,
              type: 'Despesa esperada',
              concept: e.concept,
              total_amount: e.total_amount ? -1 * Math.abs(e.total_amount) : 0,
              date: e.date || moment().format('YYYY-MM-DD'),
              date_error: e.date === null,
              paid: false,
              contact: e.provider && e.provider.name ? e.provider.name : '-'
            }
            this.treasury.push(expense)
          }
          if (e.invoice && e.invoice.id) {
            this.projectExpenses.push({ type: 'invoice', id: e.invoice.id, code: e.invoice.code })
          }
          if (e.grant && e.grant.id) {
            this.projectExpenses.push({ type: 'grant', id: e.grant.id, code: e.grant.code })
          }
          if (e.ticket && e.ticket.id) {
            this.projectExpenses.push({ type: 'ticket', id: e.ticket.id, code: e.ticket.code })
          }
          if (e.diet && e.diet.id) {
            this.projectExpenses.push({ type: 'diet', id: e.diet.id, code: e.diet.code })
          }
        })
        p.incomes.forEach(i => {
          if (!i.paid) {
            const income = {
              project_name: p.name,
              type: 'Ingrés esperat',
              concept: i.concept,
              total_amount: i.total_amount ? Math.abs(i.total_amount) : 0,
              date: i.date || moment().format('YYYY-MM-DD'),
              date_error: i.date === null,
              paid: false,
              contact: i.client && i.client.name ? i.client.name : '-'
            }
            this.treasury.push(income)
          }
          if (i.invoice && i.invoice.id) {
            this.projectIncomes.push({ type: 'invoice', id: i.invoice.id, code: i.invoice.code })
          }
          if (i.grant && i.grant.id) {
            this.projectIncomes.push({ type: 'grant', id: i.grant.id, code: i.grant.code })
          }
        })

        p.phases.forEach(ph => {
          ph.expenses.forEach(e => {
            // console.log('e', e)
            if (!e.paid) {
              const expense = {
                project_name: p.name,
                type: 'Despesa esperada',
                concept: e.concept,
                total_amount: e.total_amount ? -1 * Math.abs(e.total_amount) : 0,
                date: e.date || moment().format('YYYY-MM-DD'),
                date_error: e.date === null,
                paid: false,
                contact: e.provider && e.provider.name ? e.provider.name : '-'
              }
              this.treasury.push(expense)
            }
            if (e.invoice && e.invoice.id) {
              this.projectExpenses.push({ type: 'invoice', id: e.invoice.id, code: e.invoice.code })
            }
            if (e.grant && e.grant.id) {
              this.projectExpenses.push({ type: 'grant', id: e.grant.id, code: e.grant.code })
            }
            if (e.ticket && e.ticket.id) {
              this.projectExpenses.push({ type: 'ticket', id: e.ticket.id, code: e.ticket.code })
            }
            if (e.diet && e.diet.id) {
              this.projectExpenses.push({ type: 'diet', id: e.diet.id, code: e.diet.code })
            }
          })
          ph.subphases.forEach(i => {
            if (!i.paid) {
              const income = {
                project_name: p.name,
                type: 'Ingrés esperat',
                concept: i.concept,
                total_amount: i.total_amount ? Math.abs(i.total_amount) : 0,
                date: i.date || moment().format('YYYY-MM-DD'),
                date_error: i.date === null,
                paid: false,
                contact: i.client && i.client.name ? i.client.name : '-'
              }
              this.treasury.push(income)
            }
            if (i.invoice && i.invoice.id) {
              this.projectIncomes.push({ type: 'invoice', id: i.invoice.id, code: i.invoice.code })
            }
            if (i.grant && i.grant.id) {
              this.projectIncomes.push({ type: 'grant', id: i.grant.id, code: i.grant.code })
            }
          })
        })
      })
      // console.log('treasuries', treasuries)
      treasuries.forEach(e => {
        const expense = {
          project_name: '-',
          type: 'Entrada manual',
          concept: e.comment,
          total_amount: e.total,
          date: e.date || moment().format('YYYY-MM-DD'),
          date_error: e.date === null,
          paid: true,
          contact: '-'
        }
        this.treasury.push(expense)
      })
      // today
      const today = {
        project_name: '-',
        type: 'Avui',
        concept: '-',
        total_amount: 0,
        date: moment().format('YYYY-MM-DD'),
        date_error: false,
        paid: null,
        contact: '-'
      }
      this.treasury.push(today)
      // emitted
      this.emitted.forEach(i => {
        const income = {
          project_name: i.project && i.project.name ? i.project.name : '',
          type: i.paid ? 'Factura cobrada' : 'Factura emesa',
          concept: i.code,
          total_amount: i.total ? Math.abs(i.total) : 0,
          date: i.paid_date || i.paybefore || i.emitted || moment().format('YYYY-MM-DD'),
          date_error: (i.paid_date || i.paybefore || i.emitted) === null,
          real: true,
          paid: i.paid,
          contact: i.contact && i.contact.name ? i.contact.name : '?'
        }
        this.treasury.push(income)
      })
      // received
      this.received.forEach(e => {
        const expense = {
          project_name: e.project && e.project.name ? e.project.name : '',
          type: e.paid ? 'Factura pagada' : 'Factura rebuda',
          concept: e.code,
          total_amount: e.total ? -1 * Math.abs(e.total) : 0,
          date: e.paid_date || e.paybefore || e.emitted,
          date_error: false,
          paid: e.paid,
          contact: e.contact && e.contact.name ? e.contact.name : '-'
        }
        this.treasury.push(expense)
      })
      this.diets.forEach(e => {
        const expense = {
          project_name: e.project && e.project.name ? e.project.name : '',
          type: 'Dieta',
          concept: e.code,
          total_amount: e.total ? -1 * Math.abs(e.total) : 0,
          date: e.paid_date || e.paybefore || e.emitted || moment().format('YYYY-MM-DD'),
          date_error: (e.paid_date || e.paybefore || e.emitted) === null,
          paid: e.paid,
          contact: e.contact && e.contact.name ? e.contact.name : '-'
        }
        this.treasury.push(expense)
      })
      this.tickets.forEach(e => {
        const expense = {
          project_name: e.project && e.project.name ? e.project.name : '',
          type: 'Ticket',
          concept: e.code,
          total_amount: e.total ? -1 * Math.abs(e.total) : 0,
          date: e.paid_date || e.emitted || moment().format('YYYY-MM-DD'),
          date_error: (e.paid_date || e.emitted) === null,
          paid: e.paid,
          contact: e.provider && e.provider.name ? e.provider.name : '-'
        }
        this.treasury.push(expense)
      })
      // sort and show
      const treasuryData = sortBy(this.treasury, 'date')
      let subtotal = 0
      for (let i = 0; i < treasuryData.length; i++) {
        const t = treasuryData[i]
        subtotal += t.total_amount
        this.treasuryData.push({ ...t, subtotal })
      }
    })

    // service({ requiresAuth: true }).get('series').then((r) => {
    //   this.years = r.data
    //   this.filters.year = this.years[this.years.length - 1]
    // })

    // service({ requiresAuth: true }).get('users').then((r) => {
    //   this.users = r.data.filter(u => u.username !== 'app')
    //   this.usersList = JSON.parse(JSON.stringify(r.data.filter(u => u.username !== 'app')))
    //   this.usersList.unshift({ id: 0, username: 'Totes' })
    //   const user = this.users.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
    //   if (user && user.id) {
    //     this.userNameSearch = user.username
    //     this.filters.user = user.id
    //   }
    // })

    this.isLoading = false
  },
  methods: {
    formatPrice (value) {
      const val = (value / 1).toFixed(2).replace('.', ',')
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    },
    formatDate (value) {
      return moment(value, 'YYYY-MM-DD').format('DD-MM-YYYY')
    }
  }
}
</script>
