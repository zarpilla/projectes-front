<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Tasca</p>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body">
            <b-field label="Nom" >
              <b-input
                v-model="form.name"
                placeholder="Nom"
                name="name"
                required
              />
            </b-field>
            
            <b-field label="Data límit" class="datepickers" >
              <b-datepicker
                  v-model="form.due_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"                  
                  trap-focus>
              </b-datepicker>
            </b-field>
            <b-field label="Persones" >
              <b-autocomplete
                v-model="userNameSearch"
                placeholder="Persona"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsers"
                field="username"
                @select="option => addUser(option)"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>            
            <b-field label="">              
                <div class="list">
                  <ul class="ulist">
                    <li
                      v-for="(user, i) in form.users_permissions_users"
                      :key="i"
                      @click="removeUser(user)"
                      class="tag is-primary mr-1"
                    >
                      {{ user.username }}
                      <b-button
                        
                        class="no-button"
                        icon-left="close-circle"
                      />
                    </li>
                  </ul>
                </div>
            </b-field>

            <b-field label="Projecte">
              <b-autocomplete
                v-model="projectSearch"
                placeholder="Projecte"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProject"
                field="name"
                @select="option => (form.project = option ? option.id : null)"
                :clearable="!(taskObject && taskObject.project)"
                :disabled="taskObject && taskObject.project"
              >
              </b-autocomplete>
            </b-field>
            <b-field
                label="Descripció"
                
              >
                <b-input
                  type="textarea"
                  v-model="form.description"
                  placeholder="Descripció"
                />
              </b-field>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="cancel">Cancel·la</button>
          <button class="button" type="button" @click="trashModal(form)">Esborra</button>
          <button class="button is-primary" :disabled="!form.name" native-type="submit">D'acord</button>
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
  name: 'ModalBoxTask',
  components: { ModalBox },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    taskObject: {
      type: Object,
      default: null
    },
    users: {
      type: Array,
      default: []
    },
    projects: {
      type: Array,
      default: []
    },
    project: {
      type: Number,
      default: null
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
        name: null,
        description: null,
        due_date: null,
        task_state: null,
        users_permissions_users: [],
        project: null,
        archived: null
      },
      form0: {
        name: null,
        description: null,
        due_date: null,
        task_state: null,
        users_permissions_users: [],
        project: null,
        archived: null
      },
      trashObject: null,
      isDeleteModalActive: false,
      userNameSearch: '',
      projectSearch: '',
      initializing: true
    }
  },
  computed: {
    ...mapState(['userName']),    
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
    filteredProject () {
      return this.projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
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
      this.initializing = true

      if (!this.taskObject) {
        return
      }
      
      this.form = JSON.parse(JSON.stringify(this.taskObject))

      if (this.taskObject && this.taskObject.id) {        
        this.form.id = this.taskObject.id
        
      } else {
        // this.form = JSON.parse(JSON.stringify(this.taskObject))
      }

      if (this.form.project && this.form.project.name) {
        this.projectSearch = this.form.project.name
        this.form.project = this.form.project.id
      } else {
        this.projectSearch = ''
        this.form.project = null
      }
      if (this.form.due_date) {
        this.form.due_date = moment(this.form.due_date, 'YYYY-MM-DD').toDate()
      } else {
        this.form.due_date = null
      }

      this.initializing = false
    },
    cancel () {
      this.isModalActive = false
      this.$emit('cancel')      
    },
    submit () {
      const form = JSON.parse(JSON.stringify(this.form))
      if (this.form.due_date) {
        form.due_date = moment(this.form.due_date).format('YYYY-MM-DD')
      }
      this.$emit('submit', form)
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
    },
    addUser(user) {
      console.log('addUser', user)
      if (!user) {
        return
      }
      const existing = this.form.users_permissions_users.find(u => u.id === user.id)
      if (!existing) {
        this.form.users_permissions_users.push(user)
      }
      this.userNameSearch = '';
      setTimeout(() => { this.userNameSearch = '' }, 100)
    },
    removeUser(user) {
      this.form.users_permissions_users = this.form.users_permissions_users.filter(u => u.id !== user.id)
    }
    // fixDecimals(field, value) {
    //   if (value && value.toString().includes(",")) {
    //     this.form[field] = value.toString().replace(",", ".");
    //   }
    // },    
  }
}
</script>
<style>
.modal-card-dedication .field:not(:last-child){
  margin-bottom: 1.0rem;
}
.modal-card-dedication .datepickers .field{
  margin-bottom: 0;
}
.modal-card-dedication .modal-card-body {
  max-height: calc(100vh - 200px);
}
</style>
