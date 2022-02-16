<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Assignació de documents</p>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body">
            <b-field label="Factura emesa" horizontal v-if="invoicingObject.type === 'incomes'">
              <b-autocomplete
                v-model="emittedSearch"
                placeholder="Factura"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredEmitted"
                field="display"
                @select="option => (form.emitted = option ? option : null)"
                :clearable="true"
                @input="emittedChanged"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="Ingrés" horizontal v-if="invoicingObject.type === 'incomes'">
              <b-autocomplete
                v-model="incomeSearch"
                placeholder="Ingrés"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredIncome"
                field="display"
                @select="option => (form.income = option ? option : null)"
                :clearable="true"
                @input="incomeChanged"
              >
              </b-autocomplete>
            </b-field>
            <!-- <b-field label="Subvenció rebuda" horizontal v-if="invoicingObject.type === 'incomes'">
              <b-autocomplete
                v-model="grantSearch"
                placeholder="Subvenció"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredGrant"
                field="display"
                @select="option => (form.grant = option ? option : null)"
                :clearable="true"
                @input="grantChanged"
              >
              </b-autocomplete>
            </b-field> -->
            <b-field label="Factura rebuda" horizontal v-if="invoicingObject.type === 'expenses'">
              <b-autocomplete
                v-model="receivedSearch"
                placeholder="Factura"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredReceived"
                field="display"
                @select="option => (form.received = option ? option : null)"
                :clearable="true"
                @input="receivedChanged"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="Despesa rebuda" horizontal v-if="invoicingObject.type === 'expenses'">
              <b-autocomplete
                v-model="expenseSearch"
                placeholder="Despesa"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredExpense"
                field="display"
                @select="option => (form.expense = option ? option : null)"
                :clearable="true"
                @input="expenseChanged"
              >
              </b-autocomplete>
            </b-field>
            <!-- <b-field label="Ticket rebut" horizontal v-if="invoicingObject.type === 'expenses'">
              <b-autocomplete
                v-model="ticketSearch"
                placeholder="Ticket"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredTicket"
                field="display"
                @select="option => (form.ticket = option ? option : null)"
                :clearable="true"
                @input="ticketChanged"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="Dieta rebuda" horizontal v-if="invoicingObject.type === 'expenses'">
              <b-autocomplete
                v-model="dietSearch"
                placeholder="Dieta"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredDiet"
                field="display"
                @select="option => (form.diet = option ? option : null)"
                :disabled="form.id > 0"
                :clearable="true"
                @input="dietChanged"
              >
              </b-autocomplete>
            </b-field> -->
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="cancel">Cancel·la</button>
          <button v-if="form.id > 0" class="button" type="button" @click="trashModal(form)">Esborra</button>
          <button class="button is-primary" native-type="submit">D'acord</button>
        </footer>
      </form>
    </div>
    <!-- <div>
      {{ dedicationObject }}
    </div> -->

    <modal-box
      :is-active="isDeleteModalActive"
      :trash-object-name="trashObjectName"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />
  </b-modal>
</template>

<script>
import ModalBox from '@/components/ModalBox'

export default {
  name: 'ModalBoxInvoicing',
  components: { ModalBox },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    invoicingObject: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      isModalActive: false,
      form: {
        emitted: null,
        received: null,
        diet: null,
        ticket: null
      },
      emittedSearch: '',
      incomeSearch: '',
      receivedSearch: '',
      ticketSearch: '',
      expenseSearch: '',
      dietSearch: '',
      trashObject: null,
      isDeleteModalActive: false,
      emitted_invoices: [],
      received_invoices: [],
      received_incomes: [],
      received_expenses: [],
      grants: [],
      tickets: [],
      diets: [],
      contacts: []
    }
  },
  computed: {
    filteredEmitted () {
      return this.emitted_invoices.filter(option => {
        return (
          option.display
            .toString()
            .toLowerCase()
            .indexOf(this.emittedSearch.toLowerCase()) >= 0
        )
      })
    },
    filteredIncome () {
      return this.received_incomes.filter(option => {
        return (
          option.display
            .toString()
            .toLowerCase()
            .indexOf(this.incomeSearch.toLowerCase()) >= 0
        )
      })
    },
    filteredReceived () {
      return this.received_invoices.filter(option => {
        return (
          option.display
            .toString()
            .toLowerCase()
            .indexOf(this.receivedSearch.toLowerCase()) >= 0
        )
      })
    },
    filteredDiet () {
      return this.diets.filter(option => {
        return (
          option.display
            .toString()
            .toLowerCase()
            .indexOf(this.dietSearch.toLowerCase()) >= 0
        )
      })
    },
    filteredExpense () {
      return this.received_expenses .filter(option => {
        return (
          option.display
            .toString()
            .toLowerCase()
            .indexOf(this.expenseSearch.toLowerCase()) >= 0
        )
      })
    },
    trashObjectName () {
      if (this.trashObject) {
        return this.trashObject.name
      }

      return null
    }
  },
  watch: {
    isActive (newValue) {
      this.isModalActive = newValue
      if (newValue) {
        this.show()
      } else {
        this.cancel()
      }
    },
    dedicationObject (newValue) {
      // console.log('dedicationObject', newValue)
      // console.log('dedicationObject this', this.dedicationObject)
    }
  },
  methods: {
    show () {
      //console.log('invoicingObject', this.invoicingObject)
      this.form.type = this.invoicingObject.type
      this.emittedSearch = ''
      this.grantSearch = ''
      this.receivedSearch = ''
      this.ticketSearch = ''
      this.dietSearch = ''
      this.incomeSearch = ''
      this.expenseSearch = ''

      this.contacts = this.invoicingObject.contacts

      if (this.invoicingObject.emitted_invoices) {
        this.emitted_invoices = this.invoicingObject.emitted_invoices.map(i => { return { ...i, display: `${i.code} - ${this.getContactName(i)} - ${i.total_base} €` } })
      }
      if (this.invoicingObject.received_invoices) {
        this.received_invoices = this.invoicingObject.received_invoices.map(i => { return { ...i, display: `${i.code} - ${this.getContactName(i)} - ${i.total_base} €` } })
      }
      if (this.invoicingObject.received_grants) {
        this.grants = this.invoicingObject.received_grants.map(i => { return { ...i, display: `${i.code} - ${this.getContactName(i)} - ${i.total_base} €` } })
      }
      if (this.invoicingObject.diets) {
        this.diets = this.invoicingObject.diets.map(i => { return { ...i, display: `${i.code} - ${this.getContactName(i)} - ${i.total_base} €` } })
      }
      if (this.invoicingObject.tickets) {
        this.tickets = this.invoicingObject.tickets.map(i => { return { ...i, display: `${i.code} - ${this.getContactName(i)} - ${i.total_base} €` } })
      }

      if (this.invoicingObject.received_incomes) {
        this.received_incomes = this.invoicingObject.received_incomes.map(i => { return { ...i, display: `${i.code} - ${this.getContactName(i)} - ${i.total_base} €` } })
      }

      if (this.invoicingObject.received_expenses) {
        this.received_expenses = this.invoicingObject.received_expenses.map(i => { return { ...i, display: `${i.code} - ${this.getContactName(i)} - ${i.total_base} €` } })
      }

      if (this.invoicingObject.type === 'incomes' && this.invoicingObject.subphase && this.invoicingObject.subphase.paid && this.invoicingObject.subphase.invoice) {
        this.form.emitted = this.invoicingObject.subphase.invoice
        const i = this.invoicingObject.subphase.invoice
        this.emittedSearch = `${i.code} - ${this.getContactName(i)} - ${i.total_base} €`
      }
      if (this.invoicingObject.type === 'incomes' && this.invoicingObject.subphase && this.invoicingObject.subphase.paid && this.invoicingObject.subphase.grant) {
        this.form.grant = this.invoicingObject.subphase.grant
        const i = this.invoicingObject.subphase.grant
        this.grantSearch = `${i.code} - ${this.getContactName(i)} - ${i.total_base} €`
      }

      if (this.invoicingObject.type === 'incomes' && this.invoicingObject.subphase && this.invoicingObject.subphase.paid && this.invoicingObject.subphase.income) {
        this.form.grant = this.invoicingObject.subphase.income
        const i = this.invoicingObject.subphase.income
        this.incomeSearch = `${i.code} - ${this.getContactName(i)} - ${i.total_base} €`
      }

      if (this.invoicingObject.type === 'expenses' && this.invoicingObject.subphase && this.invoicingObject.subphase.paid && this.invoicingObject.subphase.invoice) {
        this.form.received = this.invoicingObject.subphase.invoice
        const i = this.invoicingObject.subphase.invoice
        this.receivedSearch = `${i.code} - ${this.getContactName(i)} - ${i.total_base} €`
      }
      if (this.invoicingObject.type === 'expenses' && this.invoicingObject.subphase && this.invoicingObject.subphase.paid && this.invoicingObject.subphase.ticket) {
        this.form.ticket = this.invoicingObject.subphase.ticket
        // this.ticketSearch = this.invoicingObject.subphase.ticket.code
        const i = this.invoicingObject.subphase.ticket
        this.ticketSearch = `${i.code} - ${this.getContactName(i)} - ${i.total_base} €`
      }
      if (this.invoicingObject.type === 'expenses' && this.invoicingObject.subphase && this.invoicingObject.subphase.paid && this.invoicingObject.subphase.diet) {
        this.form.diet = this.invoicingObject.subphase.diet
        // this.dietSearch = this.invoicingObject.subphase.diet.code
        const i = this.invoicingObject.subphase.diet
        this.dietSearch = `${i.code} - ${this.getContactName(i)} - ${i.total_base} €`
      }

      if (this.invoicingObject.type === 'expenses' && this.invoicingObject.subphase && this.invoicingObject.subphase.paid && this.invoicingObject.subphase.expense) {
        this.form.expense = this.invoicingObject.subphase.expense
        // this.dietSearch = this.invoicingObject.subphase.diet.code
        const i = this.invoicingObject.subphase.expense
        this.expenseSearch = `${i.code} - ${this.getContactName(i)} - ${i.total_base} €`
      }
    },
    cancel () {
      this.$emit('cancel')
    },
    submit () {
      this.$emit('submit', this.form)
    },
    trashModal (trashObject) {
      this.trashObject = trashObject
      this.isDeleteModalActive = true
    },
    trashCancel () {
      this.isDeleteModalActive = false
    },
    async trashConfirm () {
      this.isDeleteModalActive = false
      this.$emit('delete', this.form)
    },
    receivedChanged () {
      if (this.form.received) {
        this.form.ticket = null
        this.form.diet = null
        this.form.expense = null
        this.ticketSearch = ''
        this.dietSearch = ''
        this.expenseSearch = ''
      }
    },
    expenseChanged () {
      if (this.form.expense) {
        this.form.received = null
        this.form.diet = null
        this.receivedSearch = ''
        this.dietSearch = ''
      }
    },
    dietChanged () {
      if (this.form.diet) {
        this.form.received = null
        this.form.ticket = null
        this.receivedSearch = ''
        this.ticketSearch = ''
      }
    },
    emittedChanged () {
      if (this.form.emitted) {
        this.form.income = null
        this.incomeSearch = ''
      }
    },
    incomeChanged () {
      if (this.form.income) {
        this.form.emitted = null
        this.emittedSearch = ''
      }
    },
    getContactName (invoice) {
      console.log('invoice contacts', this.contacts)
      const contact = invoice.contact && invoice.contact.id ? invoice.contact.id : invoice.contact
      if (!contact) {
        return '-'
      }
      return invoice && invoice.contact && this.contacts.find(c => c.id === contact) ? this.contacts.find(c => c.id === contact).name : ''
    }
  }
}
</script>
<style>
.modal-card-dedication .field:not(:last-child){
  margin-bottom: 1.5rem;
}
.modal-card-dedication .modal-card-body {
  max-height: calc(100vh - 200px);
}
</style>
<style scoped>
.modal-card-body{
  min-height: 150px;
}
</style>
