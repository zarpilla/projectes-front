<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="Filtres">
        <form @submit.prevent="submit2">
          <b-field horizontal>
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
                  {{ year.year  }}
                </option>
              </b-select>
            </b-field>

            <b-field label="Hores">
              <b-select
                v-model="filters.type"
                required
              >                
                <option
                  value="Previstes"
                >
                Previstes
                </option>
                <option
                  value="Reals"
                >
                Reals
                </option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>
      <justification :type="filters.type" :year="filters.year ? filters.year.year : null" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import Justification from '@/components/Justification'
import service from '@/service/index'
import { mapState } from 'vuex'

export default {
  name: 'Justifications',
  components: {
    CardComponent,
    TitleBar,
    Justification
  },
  data () {
    return {
      isLoading: false,
      filters: {
        type: 'Previstes',
        year: null
      },
      projects: [],
      usersList: [],
      projectSearch: '',
      years: []
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Justificacions de projectes subvencionables']
    },    
  },
  mounted () {
    this.isLoading = true

    service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
      const years = r.data
      // add All option
      years.unshift({ id: -1, year: 'Tots' })
      this.filters.year = years[0]

      this.years = years
    })

    this.isLoading = false
  },
  methods: {
  }
}
</script>
