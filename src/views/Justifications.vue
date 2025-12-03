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

            <b-field label="Visualització">
              <b-select
                v-model="filters.view"
                required
              >                
                <option
                  value="Bestretes"
                >
                Bestretes
                </option>
                <option
                  value="Factures"
                >
                Factures
                </option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>
      <justification :type="filters.type" :year="filters.year ? filters.year.year : null" :view="filters.view" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import Justification from '@/components/Justification'
import service from '@/service/index'
import { mapState } from 'vuex'
import { addScript, addStyle } from '@/helpers/addScript'

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
        year: null,
        view: 'Bestretes'
      },
      projects: [],
      usersList: [],
      projectSearch: '',
      years: [],
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

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        await addScript((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + 'vendor/kendo/kendo.all.min.js', 'kendo-all-min-js')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + 'vendor/kendo/kendo.common.min.css', 'kendo-common-min-css')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + 'vendor/kendo/kendo.custom.css', 'kendo-custom-css')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + 'vendor/kendo/custom.css', 'custom-css')

        const r = await service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC')
        const years = r.data
        years.unshift({ id: -1, year: 'Tots' })
        this.filters.year = years[0]
        this.years = years
        this.isLoading = false        
      }
    }, 100)   
  },
  methods: {
  }
}
</script>
