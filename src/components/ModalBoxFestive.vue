<template>
  <b-modal v-model="isModalActive" has-modal-card @cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Entrada festiu</p>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body modal-card-body-festive">
            <b-field label="Data" horizontal>
              <b-datepicker
                  v-model="form.date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"                  
                  :editable="true"
                  trap-focus>
              </b-datepicker>
            </b-field>
            <b-field label="Data Final" horizontal message="Només és necessaria per dies consecutius">
              <b-datepicker
                  v-model="form.endDate"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"                  
                  :editable="true"
                  trap-focus>
              </b-datepicker>
            </b-field>
            <p v-if="readOnlyCommon" class="notification is-info is-light">
              Aquest festiu és per a tothom: només el pot canviar o esborrar una persona administradora.
            </p>
            <b-field v-if="selectedPersonal" label="Persona" horizontal>
              <b-autocomplete
                v-model="userNameSearch"
                placeholder="Persona"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsers"
                field="username"
                @select="option => (form.users_permissions_user = option ? option.id : null)"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field v-else label="Persona" horizontal>
              <span class="festive-everyone">Tothom</span>
            </b-field>
            <b-field label="Tipus de festiu" class="has-check" horizontal v-if="hasTypes">
              <radio-picker
                v-model="form.festive_type"
                :options="festiveTypesObj"
              ></radio-picker>
            </b-field>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="cancel">Cancel·la</button>
          <button v-if="form.id > 0 && !readOnlyCommon" class="button is-danger" type="button" @click="trashModal(form)">Esborra</button>
          <button v-if="!readOnlyCommon" class="button is-primary" :disabled="!enabled" native-type="submit">D'acord</button>          
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
import { findCurrentUser } from '@/domain/currentUser'
import RadioPicker from '@/components/RadioPicker.vue'
import moment from 'moment'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import ModalBox from '@/components/ModalBox.vue'

export default {
  name: 'ModalBoxDedication',
  emits: ["cancel", "delete", "submit"],
  components: { RadioPicker, ModalBox },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    festiveObject: {
      type: Object,
      default: null
    },
    // admins also enter the holidays for everyone (non-personal types, issues/140)
    canEditCommon: {
      type: Boolean,
      default: false
    },
    festiveTypes: {
      type: Array,
      default: []
    },
    users: {
      type: Array,
      default: []
    }
  },
  data () {
    return {
      isModalActive: false,
      isLoading1: false,
      isLoading2: false,
      hasTypes: false,
      form: {
        date: null,
        endDate: null,
        festive_type: null,
        users_permissions_user: null,
      },
      festiveTypesObj: {},
      userNameSearch: '',
      trashObject: null,
      isDeleteModalActive: false,
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    enabled () {
      return this.form.date // && this.form.festive_type
    },
    selectedType () {
      return this.festiveTypes.find(f => f.id == this.form.festive_type) || null
    },
    // a type for everyone has no person
    selectedPersonal () {
      return !this.selectedType || this.selectedType.personal !== false
    },
    // someone who isn't an admin looking at a holiday for everyone
    readOnlyCommon () {
      return !this.canEditCommon && !this.selectedPersonal
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
    'form.festive_type' () {
      if (!this.selectedPersonal) {
        this.form.users_permissions_user = null
        this.userNameSearch = ''
      }
    },
    isActive (newValue) {
      this.isModalActive = newValue
      if (newValue) {
        this.show()
      } else {
        this.cancel()
      }
    }
  },
  methods: {    
    show () {
      // personal types first; the ones for everyone only for admins, or to show
      // the holiday for everyone being looked at (issues/140)
      const editingType = this.festiveObject && this.festiveObject.festive_type ? this.festiveObject.festive_type.id : null
      const offered = [
        ...this.festiveTypes.filter(f => f.personal !== false),
        ...this.festiveTypes.filter(f => f.personal === false && (this.canEditCommon || f.id === editingType))
      ]
      this.festiveTypesObj = {}
      for (const f of offered) {
        this.festiveTypesObj[f.id] = f.personal === false ? `${f.name} (tothom)` : f.name
      }
      this.hasTypes = offered.length > 0

      if (this.festiveObject) {
        this.form.date = this.festiveObject.date ? moment(this.festiveObject.date, 'YYYY-MM-DD').toDate() : null
        this.form.endDate = null
        this.form.festive_type = editingType
        this.form.users_permissions_user = this.festiveObject.users_permissions_user ? this.festiveObject.users_permissions_user.id : null
        this.userNameSearch = this.festiveObject.users_permissions_user ? this.festiveObject.users_permissions_user.username : ''
        this.form.id = this.festiveObject.id
      } else {
        this.form.date = moment(moment().format('YYYY-MM-DD'), 'YYYY-MM-DD').toDate()
        this.form.endDate = null
        // the first offered type (it used to be the first of all, a type for everyone not offered)
        this.form.festive_type = offered.length ? offered[0].id : null
        this.form.users_permissions_user = null
        this.userNameSearch = ''
        this.form.id = 0
      }

      const user = findCurrentUser(this.users)
      if (this.selectedPersonal && user && user.id && this.form.users_permissions_user === null) {
        this.userNameSearch = user.username
        this.form.users_permissions_user = user.id
      }
    },
    cancel () {
      this.$emit('cancel')
    },
    submit () {   
      const festiveType = this.festiveTypes.find(f => f.id == this.form.festive_type)
      if (festiveType.personal && this.form.users_permissions_user === null) {
        this.$buefy.snackbar.open({
          message: 'Ha d\'haver una persona als festius personals',
          queue: false
        })
      }
      else if (festiveType.personal === false && this.form.users_permissions_user !== null) {
        this.$buefy.snackbar.open({
          message: 'Has de marcar un tipus de festiu',
          queue: false
        })
      }
      else if (this.form.endDate && moment(this.form.date).isAfter(this.form.endDate)) {
        this.$buefy.snackbar.open({
          message: 'La data final ha de ser més gran que la inicial',
          queue: false
        })
      }
      else if (this.form.endDate) {
        const diff = moment(this.form.endDate).diff(this.form.date, 'days') + 1
        this.$buefy.dialog.confirm({
            message: `Atenció, estàs a punt de crear ${diff} festius. Vols continuar?`,
            onConfirm: async () => {
              this.$emit('submit', this.form)
            },
            onCancel: () => { return false }
        })
      }
      else {
        this.$emit('submit', this.form)
      }
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
.modal-card-body-festive {
  min-height: 450px;
}
.festive-everyone {
  display: inline-block;
  padding-top: .375rem;
  font-weight: 600;
}
</style>
