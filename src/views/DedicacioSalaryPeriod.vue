<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="Filtres">
        <form @submit.prevent="submit2">
          <b-field horizontal>
            <b-field label="Persona">
              <b-autocomplete
                v-model="userNameSearch"
                placeholder="Persona"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsers"
                field="username"
                @select="option => (filters.user = option ? option.id : null)"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="Període">
              <b-select
                v-model="filters.months"
                required
              >
                <option
                  v-for="(m, index) in months"
                  :key="index"
                  :value="m.value"
                >
                  {{ m.text }}
                </option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>
      <dedication-salary :user="filters.user" :months="filters.months" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import DedicationSalary from '@/components/DedicationSalary'
import service from '@/service/index'
import { mapState } from 'vuex'

export default {
  name: 'DedicacioSalary',
  components: {
    CardComponent,
    TitleBar,
    DedicationSalary
  },
  data () {
    return {
      isLoading: false,
      filters: {
        user: null,
        months: 6
      },
      users: [],
      usersList: [],
      userNameSearch: '',
      months: [{ value: 6, text: '6 mesos'},{ value: 12, text: '12 mesos'}]
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Dedicació', 'Bestretes']
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
    }
  },
  mounted () {
    this.isLoading = true

    service({ requiresAuth: true }).get('users').then((r) => {
      this.users = r.data.filter(u => u.username !== 'app')
      this.usersList = JSON.parse(JSON.stringify(r.data.filter(u => u.username !== 'app')))
      this.usersList.unshift({ id: 0, username: 'Totes' })
      const user = this.users.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
      if (user && user.id) {
        this.userNameSearch = user.username
        this.filters.user = user.id
      }
    })

    this.isLoading = false
  },
  methods: {
  }
}
</script>
