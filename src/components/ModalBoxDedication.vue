<template>
  <b-modal :active.sync="isModalActive" has-modal-card>
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
            <b-field label="Hores" horizontal>
              <b-field>
                <b-input
                  v-model="form.hours"
                  placeholder="Hores"
                  name="hours"
                  required
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
            <b-field label="Tipus dedicació" class="has-check" horizontal v-if="!isLoading1">
              <radio-picker
                v-model="form.dedication_type"
                :options="dedicationTypes"
              ></radio-picker>
            </b-field>
            <b-field label="Tipus activitat" class="has-check" horizontal v-if="!isLoading2">
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
          <button class="button" type="button" @click="cancel">Cancel·la</button>
          <button class="button is-primary" :disabled="!enabled" native-type="submit">D'acord</button>
        </footer>
      </form>
    </div>
    <!-- <div>
      {{ dedicationObject }}
    </div> -->
  </b-modal>
</template>

<script>
import service from '@/service/index'
import RadioPicker from '@/components/RadioPicker'
import moment from 'moment'
import { mapState } from 'vuex'

export default {
  name: 'ModalBox',
  components: { RadioPicker },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    dedicationObject: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      isModalActive: false,
      isLoading1: false,
      isLoading2: false,
      form: {
        description: null,
        hours: null,
        date: null,
        project: null,
        users_permissions_user: null,
        dedication_type: null,
        activity_type: null
      },
      projects: [],
      dedicationTypes: {},
      activityTypes: {},
      users: [],
      userNameSearch: '',
      projectNameSearch: ''
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
      console.log('dedicationObject', newValue)
      console.log('dedicationObject this', this.dedicationObject)
    }
  },
  methods: {
    show () {
      this.isLoading1 = true
      this.isLoading2 = true
      service({ requiresAuth: true }).get('projects?project_state=1').then((r) => {
        this.projects = r.data
      })
      service({ requiresAuth: true }).get('dedication-types').then((r) => {
        for (var i in r.data) {
          this.dedicationTypes[r.data[i].id] = r.data[i].name
        }
        this.isLoading1 = false
      })
      service({ requiresAuth: true }).get('activity-types').then((r) => {
        for (var i in r.data) {
          this.activityTypes[r.data[i].id] = r.data[i].name
        }
        this.isLoading2 = false
      })
      service({ requiresAuth: true }).get('users').then((r) => {
        this.users = r.data.filter(u => u.username !== 'app')
        const user = this.users.find(u => u.username.toLowerCase() === this.userName)
        if (user && user.id) {
          this.userNameSearch = user.username
          this.form.users_permissions_user = user.id
        }
      })
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
      }
    },
    cancel () {
      this.$emit('cancel')
    },
    submit () {
      // console.log('this.form.date', this.form)
      // if (typeof this.form.date.getMonth === 'function') {
      //   this.form.date = moment(this.form.date).format('YYYY-MM-DD')
      // }
      this.$emit('submit', this.form)
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
