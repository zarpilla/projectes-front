<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <!-- <card-component title="Filtres">
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
            <b-field label="Any">
              <b-select
                v-model="filters.year"
                required
              >
                <option
                  v-for="(year, index) in years"
                  :key="index"
                  :value="year"
                >
                  {{ year.name }}
                </option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component> -->

      <tresoreria-table />
      <!-- <card-component class="has-table has-mobile-sort-spaced" v-if="!isLoading">
        <div class="columns card-body">
          <div class="column has-text-weight-bold">
            Data
          </div>
          <div class="column has-text-weight-bold zhas-text-right is-1">
            Saldo
          </div>
          <div class="column has-text-weight-bold zhas-text-right is-1">
            Import
          </div>
          <div class="column has-text-weight-bold">
            Moviment
          </div>
          <div class="column has-text-weight-bold">
            Concepte
          </div>
          <div class="column has-text-weight-bold">
            Projecte
          </div>
        </div>
        <div v-for="(t, i) in treasuryData" v-bind:key="i" class="card-body">
          <div class="columns">
            <div class="column">
              {{ formatDate(t.date) }}
              <b-icon
                v-if="t.date_error"
                class="has-text-danger"
                icon="alert-circle"
                title="No hi ha data"
                size="is-small">
              </b-icon>
            </div>
            <div class="column zhas-text-right is-1">
              {{ formatPrice(t.subtotal) }}
            </div>
            <div class="column zhas-text-right is-1">
              {{ formatPrice(t.total_amount) }}
            </div>
            <div class="column">
              {{ t.type }}
            </div>

            <div class="column">
              {{ t.concept }}
            </div>
            <div class="column">
              {{ t.project_name }}
            </div>
          </div>
        </div>
      </card-component> -->

      <!-- <pre>
        {{projects}}
      </pre> -->
      <!-- <pre>
        {{projects}}
      </pre> -->
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import TresoreriaTable from '@/components/TresoreriaTable'
// import CardComponent from '@/components/CardComponent'
// import DedicationSaldo from '@/components/DedicationSaldo'
// import service from '@/service/index'
import { mapState } from 'vuex'
// import moment from 'moment'
// import sortBy from 'lodash/sortBy'

export default {
  name: 'DedicacioSaldo',
  components: {
    // CardComponent,
    TitleBar,
    TresoreriaTable
    // DedicationSaldo
  },
  data () {
    return {
      isLoading: false,
      filters: {
        user: null,
        year: null
      },
      users: [],
      usersList: [],
      userNameSearch: '',
      years: [],
      projects: [],
      treasury: [],
      treasuryData: []
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Facturació', 'Tresoreria']
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
  }
}
</script>
