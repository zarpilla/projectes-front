<template>
  <b-modal :active.sync="isModalActive" has-modal-card>
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Planificació</p>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body">
            <b-field label="Hores" horizontal>
              <b-input
                v-model="form.quantity"
                placeholder="Hores"
                name="hours"
                required
              />
            </b-field>
            <b-field label="Persona" horizontal>
              <b-select
                v-model="form.users_permissions_user"
                placeholder="Persona"
              >
                <option
                  v-for="(s, index) in users"
                  :key="index"
                  :value="s"
                >
                  {{ s.username }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Cost/hora" horizontal v-if="me.options && me.options.userHasCostByHour">
              <b-input
                v-model="form.amount"
                placeholder="Cost/hora"
                name="hours"
              />
            </b-field>
            <b-field label="Descripció" horizontal>
              <b-field>
                <b-input
                  v-model="form.comment"
                  placeholder="Descripció"
                  name="comment"
                />
              </b-field>
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
        comment: null,
        quantity: null,
        users_permissions_user: null
      },
      users: [],
      userNameSearch: '',
      trashObject: null,
      isDeleteModalActive: false
    }
  },
  computed: {
    ...mapState(['userName']),
    ...mapState(['me']),
    enabled () {
      return this.form.quantity && this.form.users_permissions_user
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
      console.log('this.dedicationObject', this.dedicationObject)
      if (this.dedicationObject) {
        this.form._hours = this.dedicationObject._hours
        this.form._phase = this.dedicationObject._phase
        this.form._subphase = this.dedicationObject._subphase
        this.form.comment = this.dedicationObject._hours.comment ? this.dedicationObject._hours.comment : null
        this.form.quantity = this.dedicationObject.quantity
        this.form.amount = this.dedicationObject.amount
        // console.log('this.dedicationObject.users_permissions_user', this.dedicationObject.users_permissions_user)
        this.form.users_permissions_user = null // this.dedicationObject.users_permissions_user ? this.dedicationObject.users_permissions_user : null
        this.form.id = this.dedicationObject._hours.id
        this.form._uuid = this.dedicationObject._uuid
        // this.userNameSearch = this.dedicationObject.users_permissions_user ? this.dedicationObject.users_permissions_user.username : ''
      } else {
        this.form.comment = null
        this.form.quantity = null
        this.form.users_permissions_user = null
        this.userNameSearch = ''
        this.form.id = 0
      }
      service({ requiresAuth: true }).get('users').then((r) => {
        this.users = r.data.filter(u => u.username !== 'app')
        console.log('this.dedicationObject', this.dedicationObject)
        if (this.dedicationObject && this.dedicationObject.users_permissions_user) {
          const user = this.users.find(u => u.username.toLowerCase() === this.dedicationObject.users_permissions_user.username.toLowerCase())
          this.form.users_permissions_user = user
          console.log('this.form.amount', this.form.amount, user)
          if (this.form.amount === undefined && user.cost_by_hour) {
            this.form.amount = user.cost_by_hour
          }
          return
        }
        const user = this.users.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
        if (user && user.id && this.form.users_permissions_user === null) {
          // this.userNameSearch = user.username
          this.form.users_permissions_user = user
          console.log('this.form.amount 2', this.form.amount, user.cost_by_hour)
          if (this.form.amount === undefined && user.cost_by_hour) {
            this.form.amount = user.cost_by_hour
          }
        }
      })
    },
    cancel () {
      this.$emit('cancel')
    },
    submit () {
      this.form.id = this.dedicationObject.id
      this.form._uuid = this.dedicationObject._uuid
      this.form._hours = this.dedicationObject._hours
      this.form._phase = this.dedicationObject._phase
      this.form._subphase = this.dedicationObject._subphase
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
