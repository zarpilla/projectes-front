<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Entrada festiu</p>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body">
            <b-field label="Data" horizontal>
              <b-datepicker
                  v-model="form.date"
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
              >
              </b-autocomplete>
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
          <button v-if="form.id > 0" class="button is-danger" type="button" @click="trashModal(form)">Esborra</button>
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
import RadioPicker from '@/components/RadioPicker'
import moment from 'moment'
import { mapState } from 'vuex'
import ModalBox from '@/components/ModalBox'

export default {
  name: 'ModalBoxDedication',
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
    ...mapState(['userName']),
    enabled () {
      return this.form.date // && this.form.festive_type
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
      this.isLoading1 = true
      this.isLoading2 = true

      for (var i in this.festiveTypes) {
        const f = this.festiveTypes[i]
        this.festiveTypesObj[f.id] = f.name
        this.hasTypes = true
      }

      if (this.festiveObject) {
        this.form.date = this.festiveObject.date ? moment(this.festiveObject.date, 'YYYY-MM-DD').toDate() : null
        this.form.festive_type = this.festiveObject.festive_type ? this.festiveObject.festive_type.id : null
        this.form.users_permissions_user = this.festiveObject.users_permissions_user ? this.festiveObject.users_permissions_user.id : null
        this.userNameSearch = this.festiveObject.users_permissions_user ? this.festiveObject.users_permissions_user.username : ''
        this.form.id = this.festiveObject.id
      } else {
        this.form.date = moment().toDate()
        this.form.festive_type = this.festiveTypes[0].id
        this.form.users_permissions_user = null
        this.userNameSearch = ''
        this.form.id = 0
      }

      // service({ requiresAuth: true }).get('festive-types').then((r) => {
      //   this.hasDedications = false
      //   for (var i in r.data) {
      //     this.festiveTypesObj[r.data[i].id] = r.data[i].name
      //     this.hasTypes = true
      //   }
      //   this.isLoading1 = false
      // })

      const user = this.users.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
      if (user && user.id && this.form.users_permissions_user === null) {
          this.userNameSearch = user.username
          this.form.users_permissions_user = user.id
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