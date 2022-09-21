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

/* Menu */
import menu from "@/service/menu";

/* Progress bar */
import KProgress from 'k-progress'

/* JSON 2 csv */
import JsonCSV from 'vue-json-csv'

/* Calendar */
import VCalendar from 'v-calendar'

import JsonExcel from "vue-json-excel";
 
Vue.component("downloadExcel", JsonExcel);

Vue.use(VCalendar, {
  componentPrefix: 'v'
})

Vue.component('downloadCsv', JsonCSV)

Vue.component('kk-progress', KProgress)



/* Default title tag */
const defaultDocumentTitle = 'Projectes Coop'

window.$ = window.jQuery = require('jquery')

/* Collapse mobile aside menu on route change & set document title from route meta */
router.beforeEach((to, from, next)  => {
  if (window['gantt']) {
    window['gantt'] = null
  }
  next()
})
router.afterEach(to => {
  store.commit('asideMobileStateToggle', false)

  if (to.meta && to.meta.title) {
    document.title = `${to.meta.title} — ${defaultDocumentTitle}`
  } else {
    document.title = defaultDocumentTitle
  }

  for(var m in menu) {
    if (typeof(menu[m]) === 'object') {
      for(var m2 in menu[m]) {
        const item = menu[m][m2]
        if (to.path === item.to) {
          document.title = `${item.label} — ${defaultDocumentTitle}`
        }
      }
    }
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
