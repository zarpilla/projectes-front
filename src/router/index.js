import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'

Vue.use(VueRouter)

const routes = [
  {
    // Document title tag
    // We combine it with defaultDocumentTitle set in `src/main.js` on router.afterEach hook
    meta: {
      title: 'Accedeix'
    },
    path: '/',
    name: 'login',
    component: Login
  },
  {
    meta: {
      title: 'Recuperar clau de pas'
    },
    path: '/forgotten-password',
    name: 'forgotten.password',
    component: () => import(/* webpackChunkName: "login" */ '../views/ForgottenPassword.vue'),
  },
  {
    meta: {
      title: 'Canviar clau de pas'
    },
    path: '/reset-password',
    name: 'reset.password',
    component: () => import(/* webpackChunkName: "login" */ '../views/ResetPassword.vue'),
  },
  {
    meta: {
      title: 'Projectes'
    },
    path: '/projectes',
    name: 'projectes.view',
    component: () => import(/* webpackChunkName: "stats" */ '../views/Home.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Panell Projectes'
    },
    path: '/stats-projectes',
    name: 'stats.projectes',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsProjectes.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Panell Dedicacio'
    },
    path: '/stats-dedicacio',
    name: 'stats.dedicacio',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsDedicacio.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Panell Despeses'
    },
    path: '/stats-economic-detail',
    name: 'stats.economic-detail',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsEconomicDetail.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Panell Despeses'
    },
    path: '/stats-despeses',
    name: 'stats.despeses',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsExpenses.vue'),
    meta: {
      requiresAuth: true
    }
  },  
  {
    meta: {
      title: 'Panell Previsió Dedicacio'
    },
    path: '/stats-previsio-hores',
    name: 'stats.previsiohores',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsDedicacioEst.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Panell Previsió Dedicacio'
    },
    path: '/stats-previsio-gantt',
    name: 'stats.previsiogantt',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsDedicacioGantt.vue'),
    meta: {
      requiresAuth: true
    }
  },
  
  {
    meta: {
      title: 'Panell Estratègies'
    },
    path: '/stats-estrategies',
    name: 'stats.estrategies',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsEstrategies.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Panell Intercooperació'
    },
    path: '/stats-intercoop',
    name: 'stats.intercoop',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsIntercoop.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Edita Projecte'
    },
    path: '/project/:id',
    name: 'project.edit',
    component: () => import(/* webpackChunkName: "project-form" */ '../views/ProjectForm.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Edita document'
    },
    path: '/document/:id/:type',
    name: 'document.edit',
    component: () => import(/* webpackChunkName: "document-form" */ '../views/EmittedInvoiceForm.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Tables'
    },
    path: '/tables',
    name: 'tables',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "tables" */ '../views/Tables.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Forms'
    },
    path: '/forms',
    name: 'forms',
    component: () => import(/* webpackChunkName: "forms" */ '../views/Forms.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Profile'
    },
    path: '/profile',
    name: 'profile',
    component: () => import(/* webpackChunkName: "profile" */ '../views/Profile.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'New Client'
    },
    path: '/client/new',
    name: 'client.new',
    component: () => import(/* webpackChunkName: "client-form" */ '../views/ClientForm.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Edit Client'
    },
    path: '/client/:id',
    name: 'client.edit',
    component: () => import(/* webpackChunkName: "client-form" */ '../views/ClientForm.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Dedicació'
    },
    path: '/dedicacio',
    name: 'dedicacio',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/Dedicacio.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Gràfiques Dedicació'
    },
    path: '/dedicacio-charts',
    name: 'dedicacio-charts',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/DedicacioCharts.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Saldo Projectes'
    },
    path: '/dedicacio-saldo',
    name: 'dedicacio-saldo',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/DedicacioSaldo.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Jornada diària'
    },
    path: '/registre-jornades',
    name: 'jornada',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/Jornada.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Resum Hores'
    },
    path: '/dedicacio-summary',
    name: 'dedicacio-summary',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/DedicacioSummary.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Jornada'
    },
    path: '/working-day',
    name: 'dedicacio-working-day',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/DedicacioWorkingDay.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Bestretes'
    },
    path: '/salary',
    name: 'dedicacio-salary',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/DedicacioSalary.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Justificacions'
    },
    path: '/justifications',
    name: 'justifications',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/Justifications.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Subvencions'
    },
    path: '/grants',
    name: 'subvencions',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/Grants.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Pressupost'
    },
    path: '/quote/:id',
    name: 'quote.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Quote.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Factura'
    },
    path: '/invoice/:id/:type',
    name: 'invoice.old.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Invoice.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Document'
    },
    path: '/pdf/:id/:type',
    name: 'invoice.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Invoice.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Tresoreria'
    },
    path: '/tresoreria',
    name: 'tresoreria.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Tresoreria.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Factures emeses'
    },
    path: '/emitted-invoices',
    name: 'emitted.invoices.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/EmittedInvoices.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Factures rebudes'
    },
    path: '/received-invoices',
    name: 'received.invoices.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/ReceivedInvoices.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Pressupostos'
    },
    path: '/quotes',
    name: 'quotes.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Quotes.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },  
  {
    meta: {
      title: 'Previsió'
    },
    path: '/forecast',
    name: 'forecast.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Forecast.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },  
  {
    meta: {
      title: 'Contactes'
    },
    path: '/contacts',
    name: 'contacts.view',
    component: () => import(/* webpackChunkName: "contact" */ '../views/Contacts.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Contacte'
    },
    path: '/contact/:id',
    name: 'contacts.edit',
    component: () => import(/* webpackChunkName: "contact" */ '../views/ContactForm.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Documentació'
    },
    path: '/documentacio',
    name: 'documentation.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Documentation.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Tasques'
    },
    path: '/tasks',
    name: 'tasks.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/TasksView.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  },
  {
    meta: {
      title: 'Recàlcul'
    },
    path: '/recalculate',
    name: 'projects.recalculate',
    component: () => import(/* webpackChunkName: "project" */ '../views/Recalculate.vue'),
    props: true,
    meta: {
      requiresAuth: true
    }
  }
]

const router = new VueRouter({
  base: process.env.BASE_URL,
  routes,
  scrollBehavior (to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { x: 0, y: 0 }
    }
  },
})

router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (localStorage.getItem('jwt') == null) {
      next({
        path: '/',
        params: { nextUrl: to.fullPath }
      })
    } else {
      let user = JSON.parse(localStorage.getItem('user'))
      if (to.matched.some(record => record.meta.is_admin)) {
        if (user.is_admin == 1) {
          next()
        } else {
          next({ name: 'projectes.view' })
        }
      } else {
        next()
      }
    }
  } else if (to.matched.some(record => record.meta.guest)) {
    if (localStorage.getItem('jwt') == null) {
      next()
    } else {
      next({ name: 'projectes.view' })
    }
  } else {
    next()
  }
})

export default router
