/* Styles */
import '@/scss/main.scss'

/* Core */
import jQuery from 'jquery'
// webpack bundled every moment locale automatically (moment loads them with a
// dynamic require); with Vite the ones moment.locale() switches to must be imported
import 'moment/dist/locale/ca'
import { createApp } from 'vue'
import Buefy from 'buefy'

/* Router & Store */
import router from './router'
import { createPinia } from 'pinia'
import { useMainStore } from '@/stores/main.js'

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

window.$ = window.jQuery = jQuery

/* Collapse mobile aside menu on route change & set document title from route meta */
router.beforeEach((to, from, next)  => {
  if (window['gantt']) {
    window['gantt'] = null
  }
  next()
})
router.afterEach(to => {
  useMainStore().asideMobileStateToggle(false)

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

app.use(createPinia())
app.use(router)
app.use(Buefy)
app.use(VCalendar, {
  componentPrefix: 'v'
})

app.component('downloadExcel', DownloadExcel)
app.component('kk-progress', ProgressBar)

app.mount('#app')
