<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <tresoreria-table />
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
      isLoading: true,
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
  },
  async mounted () {
    
    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        await this.addScript((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.all.min.js', 'kendo-all-min-js')
        await this.addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.common.min.css', 'kendo-common-min-css')
        await this.addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.custom.css', 'kendo-custom-css')
        await this.addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/custom.css', 'custom-css')
        this.isLoading = false
      }
    }, 100)

  },
  methods: {
    async addScript (src) {
      return new Promise((resolve, reject) => {
        const head = document.head || document.getElementsByTagName('head')[0]
        const script = document.createElement('script')
        script.src = src
        script.addEventListener('load', resolve)
        script.addEventListener('error', (e) => reject(e))
        script.addEventListener('abort', (e) => reject(e))
        head.appendChild(script)
      })
    },
    async addStyle (src) {
      return new Promise((resolve, reject) => {
        const head = document.head || document.getElementsByTagName('head')[0]
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = src
        link.addEventListener('load', resolve)
        link.addEventListener('error', (e) => reject(e))
        link.addEventListener('abort', (e) => reject(e))
        head.appendChild(link)
      })
    },
  },
}
</script>
