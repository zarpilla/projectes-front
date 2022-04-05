<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Entrada hores</p>
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
            <b-field label="Hores" v-if="counter === null" horizontal>
              <b-field>
                <b-input
                  v-if="counter === null"
                  v-model="form.hours"
                  placeholder="Hores"
                  name="hours"
                  :disabled="counter !== null"
                />
              </b-field>
            </b-field>            
            <b-field label="Començament" v-if="counter != null" horizontal>
              <b-field>
                <b-input
                  v-model="counterDisplayStartTime"
                  placeholder="Hores"
                  name="hours"
                  :disabled="counter !== null"
                />
              </b-field>
            </b-field>
            <b-field label="Temps dedicat" v-if="counter != null" horizontal>
              <b-field>
                <b-input
                  v-model="counterDisplayTime"
                  placeholder="Hores"
                  name="hours"
                  :disabled="counter !== null"
                />                
              </b-field>
            </b-field>
            <b-field label="Projecte" horizontal>
              <b-autocomplete
                v-model="projectNameSearch"
                placeholder="Projecte"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProjects"
                field="name"
                @select="option => (form.project = option ? option.id : null)"
                @input="projectChanged"
                :disabled="form.id > 0"
                :clearable="true"
              >
              </b-autocomplete>
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
                :disabled="counter !== null"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="Descripció" horizontal>
              <b-field>
                <b-input
                  v-model="form.description"
                  placeholder="Descripció"
                  name="description"
                />
              </b-field>
            </b-field>
            <b-field label="Tipus dedicació" class="has-check" horizontal v-if="!isLoading1 && dedicationTypes && hasDedications">
              <radio-picker
                v-model="form.dedication_type"
                :options="dedicationTypes"
              ></radio-picker>
            </b-field>
            <b-field label="Funció" class="has-check" horizontal v-if="!isLoading2 && activityTypes && hasActivities">
              <radio-picker
                v-model="form.activity_type"
                :options="activityTypes"
              ></radio-picker>
            </b-field>
            <!-- <hr />
            <b-field horizontal>
              <b-field grouped>
                <div class="control">
                  <b-button native-type="submit" type="is-primary"
                    >Guardar</b-button
                  >
                </div>
              </b-field>
            </b-field> -->
        </section>
        <footer class="modal-card-foot">
          <button v-if="counter == null" class="button" type="button" @click="cancel">Cancel·la</button>
          <button v-if="form.id > 0" class="button is-danger" type="button" @click="trashModal(form)">Esborra</button>
          <button v-if="counter == null" class="button is-primary" :disabled="!enabled" native-type="submit">D'acord</button>
          
          <button v-if="counter !== null" class="button is-danger" type="button" @click="trashModal(form)">Elimina Comptador</button>
          <button v-if="counter !== null" class="button" type="button" @click="counterContinue">Continua</button>          
          <button v-if="counter !== null" class="button is-primary" :disabled="!enabled" native-type="submit">Fi de l'activitat</button>
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
import TimeCounter from '@/components/TimeCounter'

export default {
  name: 'ModalBoxDedication',
  components: { RadioPicker, ModalBox, TimeCounter },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    dedicationObject: {
      type: Object,
      default: null
    },
    projects: {
      type: Array,
      default: []
    },
    counter: {
      type: Object,
      default: null
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
      hasDedications: false,
      hasActivities: false,
      form: {
        description: null,
        hours: null,
        date: null,
        project: null,
        users_permissions_user: null,
        dedication_type: null,
        activity_type: null,
        counter: null
      },
      // projects: [],
      dedicationTypes: {},
      activityTypes: {},
      // users: [],
      userNameSearch: '',
      projectNameSearch: '',
      trashObject: null,
      isDeleteModalActive: false,
      counterDisplayTime: '',
      counterDisplayStartTime: '',
      counterDisplayTimeInHours: '',
      counterInterval: 0
    }
  },
  computed: {
    ...mapState(['userName']),
    enabled () {
      return this.form.project && this.form.hours && this.form.date && this.form.users_permissions_user
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
    filteredProjects () {
      return this.projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectNameSearch.toLowerCase()) >= 0
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
      this.isLoading1 = true
      this.isLoading2 = true

      if (this.dedicationObject) {
        this.form.description = this.dedicationObject.description ? this.dedicationObject.description : null
        this.form.date = this.dedicationObject.date ? moment(this.dedicationObject.date, 'YYYY-MM-DD').toDate() : null
        this.form.activity_type = this.dedicationObject.activity_type ? this.dedicationObject.activity_type.id : null
        this.form.dedication_type = this.dedicationObject.dedication_type ? this.dedicationObject.dedication_type.id : null
        this.form.hours = this.dedicationObject.hours
        this.form.project = this.dedicationObject.project ? this.dedicationObject.project.id : null
        this.form.users_permissions_user = this.dedicationObject.users_permissions_user ? this.dedicationObject.users_permissions_user.id : null
        this.form.id = this.dedicationObject.id
        this.userNameSearch = this.dedicationObject.users_permissions_user ? this.dedicationObject.users_permissions_user.username : ''
        this.projectNameSearch = this.dedicationObject.project ? this.dedicationObject.project.name : ''
        this.form.counter = null
        this.projectChanged()
      } else {
        this.form.description = null
        this.form.date = moment().toDate()
        this.form.activity_type = null
        this.form.dedication_type = null
        this.form.hours = null
        this.form.project = null
        this.form.users_permissions_user = null
        this.userNameSearch = ''
        this.projectNameSearch = ''
        this.form.id = 0

        this.form.counter = null

        if (this.counter) {
          this.form.counter = this.counter
          if (this.counter.project && this.counter.project.id) {
            this.form.project = this.counter.project.id
            this.projectNameSearch = this.counter.project.name
            this.projectChanged()
          }
          if (this.counter.description) {
            this.form.description = this.counter.description
          }
        }
        
      }
      service({ requiresAuth: true }).get('dedication-types').then((r) => {
        this.hasDedications = false
        for (var i in r.data) {
          this.dedicationTypes[r.data[i].id] = r.data[i].name
          this.hasDedications = true
        }
        this.isLoading1 = false
      })
      
      const user = this.users.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
      if (user && user.id && this.form.users_permissions_user === null) {
        this.userNameSearch = user.username
        this.form.users_permissions_user = user.id
      }
      
      // service({ requiresAuth: true }).get('users').then((r) => {
      //   this.users = r.data.filter(u => u.username !== 'app')
      //   const user = this.users.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
      //   if (user && user.id && this.form.users_permissions_user === null) {
      //     this.userNameSearch = user.username
      //     this.form.users_permissions_user = user.id
      //   }
      // })

      if (this.counter) {
        this.doCounter()
      }
    },
    doCounter() {
      this.counterInterval = setInterval(() => {
        const startTime = moment(this.counter.created_at, 'YYYY-MM-DDTHH:mm:ss.000Z')
        const endTime = moment()
        const duration = moment.duration(endTime.diff(startTime));
        const hours = parseInt(duration.asHours());
        const minutes = parseInt(duration.asMinutes())%60;

        const secondsDiff = endTime.diff(startTime, 'seconds') - hours*60*60 - minutes*60;          
        
        const counterDisplayTimeInHours = hours + (minutes/60) + (secondsDiff/3600)        
        this.counterDisplayTime = `${hours}h ${minutes}m ${secondsDiff}s (${counterDisplayTimeInHours.toFixed(3)}h)`        
        this.counterDisplayStartTime = startTime.format('DD/MM/YYYY HH:mm:ss')
        this.form.hours = counterDisplayTimeInHours.toFixed(3)

      }, 1000)
    },
    cancel () {
      clearInterval(this.counterInterval)
      this.$emit('cancel')
    },
    submit () {
      // console.log('this.form.date', this.form)
      // if (typeof this.form.date.getMonth === 'function') {
      //   this.form.date = moment(this.form.date).format('YYYY-MM-DD')
      // }
      clearInterval(this.counterInterval)      
      this.$emit('submit', this.form)
    },
    projectChanged () {
      if (this.form.project) {        
        this.isLoading2 = true
        const project = this.projects.find(p => p.id === this.form.project)        
        this.activityTypes = {}
        this.hasActivities = false
        project.activity_types.forEach(a => {
          this.activityTypes[a.id] = a.name
          this.hasActivities = true
        })
        if (project.default_dedication_type && project.default_dedication_type.id && this.form.dedication_type == null) {
          this.form.dedication_type = project.default_dedication_type.id
        } else if (project.default_dedication_type === null && this.form.dedication_type == null){
          this.form.dedication_type = null
        }

        this.isLoading2 = false
      }
      if (this.counter !== null) {
        
      }
    },
    counterContinue() {
      this.$emit('counter-continue', { counter: this.counter, project: this.form.project, description: this.form.description })      
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
      if (this.counter) {
        this.$emit('delete', { counter: this.counter})
      }
      else {
        this.$emit('delete', this.form)
      }
      clearInterval(this.counterInterval)
    },
    updateCounter(info) {
      console.log('updateCounter', info)
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
