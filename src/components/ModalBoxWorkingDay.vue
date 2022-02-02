<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Jornada</p>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body">            
            <b-field label="Inici" horizontal>
              <b-datepicker
                  v-model="form.from"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"                  
                  trap-focus>
              </b-datepicker>
            </b-field>            
            <b-field label="Final" horizontal>
              <b-datepicker
                  v-model="form.to"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"                  
                  trap-focus>
              </b-datepicker>
            </b-field>
            <b-field label="Persona" horizontal>
              <b-autocomplete
                v-model="userNameSearch"
                placeholder="Persona"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsers"
                field="username"
                @select="option => (form.users_permissions_user = option ? option.id : null)"
                :clearable="true"
                :disabled="true"
              >
              </b-autocomplete>
            </b-field>

            <b-field label="Hores" horizontal>
              <b-input
                v-model="form.hours"
                placeholder="Hores"
                name="hours"
                required
              />
            </b-field>

            <b-field label="Cost/hora (€)" horizontal>
              <b-input
                v-model="form.costByHour"
                placeholder="Cost"
                name="cost"                
              />
            </b-field>


            <b-field label="Salari mensual (€)" horizontal>
              <b-input
                v-model="form.monthly_salary"
                placeholder="Salari mensual (€)"
                name="monthly_salary"
              />
            </b-field>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="cancel">Cancel·la</button>
          <button class="button" type="button" @click="trashModal(form)">Esborra</button>
          <button class="button is-primary" :disabled="!enabled" native-type="submit">D'acord</button>
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
import service from '@/service/index'
import { mapState } from 'vuex'
import ModalBox from '@/components/ModalBox'
import moment from 'moment'

export default {
  name: 'ModalBoxEstimatedHours',
  components: { ModalBox },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    dedicationObject: {
      type: Object,
      default: null
    },
    users: {
      type: Array,
      default: []
    },
  },
  data () {
    return {
      isModalActive: false,
      isLoading1: false,
      isLoading2: false,
      hasDedications: false,
      hasActivities: false,
      form: {
        from: null,
        to: null,
        users_permissions_user: null,
        hours: null,
        costByHour: null,
        monthly_salary: null
      },      
      trashObject: null,
      isDeleteModalActive: false,
      userNameSearch: ''
    }
  },
  computed: {
    ...mapState(['userName']),
    enabled () {
      return this.form.hours && this.form.from && this.form.to
    },
    filteredUsers () {
      return this.users.filter(option => {
        return (
          option.username
            .toString()
            .toLowerCase()
            .indexOf(this.userNameSearch.toLowerCase()) >= 0
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
      if (newValue && !this.isModalActive) {        
        this.isModalActive = newValue
        this.show()
      } else if (!newValue && !this.isModalActive) {
        this.isModalActive = newValue
        this.cancel()
      } else  {
        this.isModalActive = newValue
      }
    },
    dedicationObject (newValue) {
    }
  },
  methods: {
    show () {
      this.isLoading1 = true
      this.isLoading2 = true

      
      console.log('show this.dedicationObject', this.dedicationObject)
      console.log('show this.users', this.users)
      
      if (this.dedicationObject) {
        // this.form = this.dedicationObject._dedication
        this.form.id = this.dedicationObject._dedication.id
        this.form.from = this.dedicationObject._dedication.from ? moment(this.dedicationObject._dedication.from, 'YYYY-MM-DD').toDate() : null
        this.form.to = this.dedicationObject._dedication.to ? moment(this.dedicationObject._dedication.to, 'YYYY-MM-DD').toDate() : null
        this.form.costByHour = this.dedicationObject._dedication.costByHour
        this.form.monthly_salary = this.dedicationObject._dedication.monthly_salary
        this.form.hours = this.dedicationObject._dedication.hours
        this.form.users_permissions_user = this.dedicationObject._dedication.users_permissions_user ? this.dedicationObject._dedication.users_permissions_user.id : null
        this.userNameSearch = this.dedicationObject._dedication.users_permissions_user ? this.dedicationObject._dedication.users_permissions_user.username : ''
      } else {
        this.form.from = null
        this.form.to = null
        this.form.users_permissions_user = null
        this.form.hours = 0
        this.form.costByHour = 0
        this.form.monthly_salary = 0
        this.form.id = 0
      }

    },
    cancel () {
      this.isModalActive = false
      this.$emit('cancel')      
    },
    submit () {
      // this.form.id = this.dedicationObject.id
      this.form._dedication = this.dedicationObject._dedication
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
      this.isModalActive = true
      this.$emit('delete', this.form)
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
