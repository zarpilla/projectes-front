/* Styles */
import '@/scss/main.scss'

/* Core */
import Vue from 'vue'
import Buefy from 'buefy'

/* Router & Store */
import router from './router'
import store from './store'

/* Service Worker */
import './registerServiceWorker'

/* Vue. Main component */
import App from './App.vue'

/* Progress bar */
import KProgress from 'k-progress'

/* JSON 2 csv */
import JsonCSV from 'vue-json-csv'

/* Calendar */
import VCalendar from 'v-calendar'

Vue.use(VCalendar, {
  componentPrefix: 'v'
})

Vue.component('downloadCsv', JsonCSV)

Vue.component('kk-progress', KProgress)

/* Default title tag */
const defaultDocumentTitle = 'Projectes'

window.$ = window.jQuery = require('jquery')

/* Collapse mobile aside menu on route change & set document title from route meta */
router.afterEach(to => {
  store.commit('asideMobileStateToggle', false)

  if (to.meta && to.meta.title) {
    document.title = `${to.meta.title} — ${defaultDocumentTitle}`
  } else {
    document.title = defaultDocumentTitle
  }
})

Vue.config.productionTip = false

Vue.use(Buefy)

// Vue.use(require('vue-moment'))

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
