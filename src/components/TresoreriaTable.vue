<template>
  <div>
      <!-- <modal-box
        :is-active="isModalActive"
        :message="'El concepte es marcarà com a pagat i desapareixerà de la tresoreria'"
        :title="'Marcat com a pagat'"
        ok-button="D'acord"
        :can-undo="true"
        @confirm="trashConfirm"
        @cancel="trashCancel"
        /> -->
    <modal-box-invoicing
      :is-active="isModalActive"
      :invoicing-object="trashObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
    />
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
          <a :href="props.row.pdf" target="_blank" v-if="props.row.pdf">
            {{ props.row.concept }}
          </a>
          <span v-else>{{ props.row.concept }}</span>
        </b-table-column>
        <b-table-column label="Projecte" field="project_name" v-slot="props">
          <router-link :to="{name:'project.edit', params: {id: props.row.project_id}}">
            <span class="project-name has-text-info">
              {{ props.row.project_name }}
            </span>
            </router-link>
        </b-table-column>
        <b-table-column label="Contacte" field="contact" v-slot="props">
          {{ props.row.contact }}
        </b-table-column>
        <b-table-column label="Accions" v-slot="props">
          <button v-if="props.row.expenseId" class="button is-small is-danger" type="button" @click.prevent="trashModal(props.row)" title="Marcar com a pagat">
            <b-icon icon="cash-multiple" size="is-small"/>
          </button>
          <button v-if="props.row.incomeId" class="button is-small is-danger" type="button" @click.prevent="trashModal(props.row)" title="Marcar com a pagat">
            <b-icon icon="cash-multiple" size="is-small"/>
          </button>
        </b-table-column>
      </b-table>
    </section>
  </div>
</template>

<script>
// import ModalBox from '@/components/ModalBox'
import service from '@/service/index'
import moment from 'moment'
import sortBy from 'lodash/sortBy'
import ModalBoxInvoicing from './ModalBoxInvoicing.vue'

export default {
  name: 'Tresoreria',
  components: {
    ModalBoxInvoicing
  },
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
      contacts: [],
      emittedGrants: [],
      receivedGrants: [],
      projectIncomes: [],
      projectExpenses: [],
      isModalActive: false,
      trashObject: null
    }
  },
  async mounted () {
    this.getData()
  },
  methods: {
    async getData () {
      this.isLoading = true
      this.treasury = []
      this.treasuryData = []
      const treasuries = (await service({ requiresAuth: true }).get('treasuries?_limit=-1')).data
      this.emitted = (await service({ requiresAuth: true }).get('emitted-invoices?_limit=-1')).data
      this.received = (await service({ requiresAuth: true }).get('received-invoices?_limit=-1')).data
      this.tickets = (await service({ requiresAuth: true }).get('tickets?_limit=-1')).data
      this.diets = (await service({ requiresAuth: true }).get('diets?_limit=-1')).data
      this.emittedGrants = (await service({ requiresAuth: true }).get('emitted-grants?_limit=-1')).data
      this.receivedGrants = (await service({ requiresAuth: true }).get('emitted-grants?_limit=-1')).data
      this.contacts = (await service({ requiresAuth: true }).get('contacts?_limit=-1')).data

      service({ requiresAuth: true }).get('projects?_limit=-1').then((r) => {
        this.projects = r.data
        this.projects.forEach(p => {
          p.expenses.forEach(e => {
            // console.log('e', e)
            if (!e.paid) {
              const expense = {
                project_name: p.name,
                project_id: p.id,
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
                project_id: p.id,
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
                  expenseId: e.id,
                  project_name: p.name,
                  project_id: p.id,
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
                  incomeId: i.id,
                  project_name: p.name,
                  project_id: p.id,
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
            project_id: 0,
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
          project_id: 0,
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
          const date = i.paid_date ? i.paid_date : moment.max([i.paybefore ? moment(i.paybefore, 'YYYY-MM-DD') : moment(), i.emitted ? moment(i.emitted, 'YYYY-MM-DD') : moment(), moment()])
          const income = {
            project_name: i.project && i.project.name ? i.project.name : '',
            project_id: i.project ? i.project.id : 0,
            type: i.paid ? 'Factura cobrada' : 'Factura emesa',
            concept: i.code,
            total_amount: i.total ? Math.abs(i.total) : 0,
            date: date,
            date_error: (i.paid_date || i.paybefore || i.emitted) === null,
            real: true,
            pdf: i.pdf,
            paid: i.paid,
            contact: i.contact && i.contact.name ? i.contact.name : '?'
          }
          this.treasury.push(income)
        })
        // received
        this.received.forEach(e => {
          const date = e.paid_date ? e.paid_date : moment.max([e.paybefore ? moment(e.paybefore, 'YYYY-MM-DD') : moment(), e.emitted ? moment(e.emitted, 'YYYY-MM-DD') : moment(), moment()])
          const expense = {
            project_name: e.project && e.project.name ? e.project.name : '',
            project_id: e.project ? e.project.id : 0,
            type: e.paid ? 'Factura pagada' : 'Factura rebuda',
            concept: e.code,
            total_amount: e.total ? -1 * Math.abs(e.total) : 0,
            date: date,
            date_error: false,
            paid: e.paid,
            real: true,
            pdf: e.pdf,
            contact: e.contact && e.contact.name ? e.contact.name : '-'
          }
          this.treasury.push(expense)
        })
        this.diets.forEach(e => {
          const date = e.paid_date ? e.paid_date : moment.max([e.paybefore ? moment(e.paybefore, 'YYYY-MM-DD') : moment(), e.emitted ? moment(e.emitted, 'YYYY-MM-DD') : moment(), moment()])
          const expense = {
            project_name: e.project && e.project.name ? e.project.name : '',
            project_id: e.project ? e.project.id : 0,
            type: 'Dieta',
            concept: e.code,
            total_amount: e.total ? -1 * Math.abs(e.total) : 0,
            date: date,
            date_error: (e.paid_date || e.paybefore || e.emitted) === null,
            paid: e.paid,
            contact: e.contact && e.contact.name ? e.contact.name : '-'
          }
          this.treasury.push(expense)
        })
        this.tickets.forEach(e => {
          const date = e.paid_date ? e.paid_date : moment.max([e.paybefore ? moment(e.paybefore, 'YYYY-MM-DD') : moment(), e.emitted ? moment(e.emitted, 'YYYY-MM-DD') : moment(), moment()])
          const expense = {
            project_name: e.project && e.project.name ? e.project.name : '',
            project_id: e.project ? e.project.id : 0,
            type: 'Ticket',
            concept: e.code,
            total_amount: e.total ? -1 * Math.abs(e.total) : 0,
            date: date,
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

      this.isLoading = false
    },
    formatPrice (value) {
      const val = (value / 1).toFixed(2).replace('.', ',')
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    },
    formatDate (value) {
      return moment(value, 'YYYY-MM-DD').format('DD-MM-YYYY')
    },
    trashModal (trashObject) {
      // console.log('trashObject', trashObject)

      const invoicingObject = {
        origin: 'treasury',
        ...trashObject,
        type: trashObject.expenseId ? 'expenses' : 'incomes',
        emitted_invoices: this.emitted.filter(i => i.project && i.project.id === trashObject.project_id),
        received_invoices: this.received.filter(i => i.project && i.project.id === trashObject.project_id),
        diets: this.diets.filter(i => i.project && i.project.id === trashObject.project_id),
        tickets: this.tickets.filter(i => i.project && i.project.id === trashObject.project_id),
        grants: trashObject.expenseId ? this.receivedGrants.filter(i => i.project && i.project.id === trashObject.project_id) : this.emittedGrants.filter(i => i.project && i.project.id === trashObject.project_id),
        contacts: this.contacts
      }

      console.log('invoicingObject', invoicingObject)

      // this.invoicingObject = {
      //   type,
      //   phase,
      //   subphase,
      //   i,
      //   j,
      //   emitted_invoices: this.form.emitted_invoices,
      //   received_invoices: this.form.received_invoices,
      //   diets: this.form.diets,
      //   tickets: this.form.tickets
      // }
      this.trashObject = invoicingObject
      this.isModalActive = true
    },
    async modalSubmit (invoicing) {
      console.log('invoicing', invoicing)
      this.isModalActive = false
      if (this.trashObject.expenseId) {
        await service({ requiresAuth: true }).put(`projects/${this.trashObject.project_id}/pay-expense/${this.trashObject.expenseId}`, invoicing)
      } else if (this.trashObject.incomeId) {
        await service({ requiresAuth: true }).put(`projects/${this.trashObject.project_id}/pay-income/${this.trashObject.incomeId}`, invoicing)
      }
      // await service({ requiresAuth: true }).delete(`projects/${this.trashObject.id}`)
      // this.projectsData = this.projectsData.filter(p => p.id !== this.trashObject.id)
      this.$buefy.snackbar.open({
        message: 'Fet',
        queue: false
      })
      this.getData()
    },
    modalCancel () {
      this.isModalActive = false
    }
  }
}
</script>
