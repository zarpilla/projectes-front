/* Styles */
import '@/scss/main.scss'

/* Core */
import { createApp } from 'vue'
import Buefy from 'buefy'

/* Router & Store */
import router from './router'
import store from './store'

/* Vue. Main component */
import App from './App.vue'

/* Menu */
import menu from "@/service/menu";

/* Progress bar */
import ProgressBar from '@/components/ProgressBar.vue'

/* Calendar */
import VCalendar from 'v-calendar'
import 'v-calendar/style.css'

/* Excel / CSV export */
import DownloadExcel from '@/components/DownloadExcel.vue'

/* Default title tag */
const defaultDocumentTitle = 'ESSTRAPIS'

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

const app = createApp(App)

app.use(router)
app.use(store)
app.use(Buefy)
app.use(VCalendar, {
  componentPrefix: 'v'
})

app.component('downloadExcel', DownloadExcel)
app.component('kk-progress', ProgressBar)

app.mount('#app')
