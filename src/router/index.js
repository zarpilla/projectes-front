import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

const routes = [
  {
    // Document title tag
    // We combine it with defaultDocumentTitle set in `src/main.js` on router.afterEach hook
    meta: {
      title: 'Dashboard'
    },
    path: '/',
    name: 'home',
    component: Home
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
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsProjectes.vue')
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
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsDedicacio.vue')
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
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsExpenses.vue')
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
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsDedicacioEst.vue')
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
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsEstrategies.vue')
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
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsIntercoop.vue')
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
    component: () => import(/* webpackChunkName: "tables" */ '../views/Tables.vue')
  },
  {
    meta: {
      title: 'Forms'
    },
    path: '/forms',
    name: 'forms',
    component: () => import(/* webpackChunkName: "forms" */ '../views/Forms.vue')
  },
  {
    meta: {
      title: 'Profile'
    },
    path: '/profile',
    name: 'profile',
    component: () => import(/* webpackChunkName: "profile" */ '../views/Profile.vue')
  },
  {
    meta: {
      title: 'New Client'
    },
    path: '/client/new',
    name: 'client.new',
    component: () => import(/* webpackChunkName: "client-form" */ '../views/ClientForm.vue')
  },
  {
    meta: {
      title: 'Edit Client'
    },
    path: '/client/:id',
    name: 'client.edit',
    component: () => import(/* webpackChunkName: "client-form" */ '../views/ClientForm.vue'),
    props: true
  },
  {
    meta: {
      title: 'Dedicació'
    },
    path: '/dedicacio',
    name: 'dedicacio',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/Dedicacio.vue'),
    props: true
  },
  {
    meta: {
      title: 'Gràfiques Dedicació'
    },
    path: '/dedicacio-charts',
    name: 'dedicacio-charts',
    component: () => import(/* webpackChunkName: "dedicacio" */ '../views/DedicacioCharts.vue'),
    props: true
  },
  {
    meta: {
      title: 'Saldo Projectes'
    },
    path: '/dedicacio-saldo',
    name: 'stats.dedicacio.saldo',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "stats" */ '../views/DedicacioSaldo.vue')
  },
  {
    meta: {
      title: 'Pressupost'
    },
    path: '/quote/:id',
    name: 'quote.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Quote.vue'),
    props: true
  },
  {
    meta: {
      title: 'Factura'
    },
    path: '/invoice/:id',
    name: 'invoice.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Invoice.vue'),
    props: true
  },
  {
    meta: {
      title: 'Tresoreria'
    },
    path: '/tresoreria',
    name: 'tresoreria.view',
    component: () => import(/* webpackChunkName: "quote" */ '../views/Tresoreria.vue'),
    props: true
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
  }
})

export default router
