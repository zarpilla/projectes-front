<template>
  <div id="app">
    <nav-bar v-if="userName" />
    <aside-menu v-if="userName" :menu="menu" />
    <router-view />
    <footer-bar v-if="userName" />
  </div>
</template>

<script>
// @ is an alias to /src
import NavBar from '@/components/NavBar'
import AsideMenu from '@/components/AsideMenu'
import FooterBar from '@/components/FooterBar'
import update from '@/mixins/update'
import { mapState } from 'vuex'
import service from "@/service/index";

export default {
  name: 'Home',
  components: {
    FooterBar,
    AsideMenu,
    NavBar
  },
  mixins: [update],
  mounted() {
  },
  computed: {
    ...mapState(['userName']),    
    menu () {
      return [
        'Projectes',
        [
          {
            to: '/projectes',
            icon: 'table',
            label: 'Projectes'
          },
          {
            to: '/contacts',
            icon: 'table',
            label: 'Contactes'
          },
          {
            to: '/dedicacio',
            label: 'Hores dedicades',
            icon: 'table'
          },
          {
            to: '/working-day',
            icon: 'table',
            label: 'Jornades'
          },
          {
            href: `${process.env.VUE_APP_API_URL || 'http://localhost:1337'}/admin`,
            icon: 'table',
            label: 'Strapi'
          }
        ],
        'Facturació',
        [
          {
            to: '/emitted-invoices',
            icon: 'table',
            label: 'Ingressos'
          },
          {
            to: '/received-invoices',
            icon: 'table',
            label: 'Despeses'
          },
          {
            to: '/tresoreria',
            icon: 'table',
            label: 'Tresoreria'
          }
        ],
        'Consulta dades',
        [
          {
            to: '/stats-projectes',
            icon: 'table',
            label: 'Projectes (TD)'
          },
          {
            to: '/dedicacio-charts',
            label: 'Hores dedicades',
            icon: 'table'
          },
          {
            to: '/stats-dedicacio',
            icon: 'table',
            label: 'Hores dedicades (TD)'
          },
          {
            to: '/stats-previsio-gantt',
            icon: 'table',
            label: 'Previsió (Gantt)'
          },
          {
            to: '/stats-previsio-hores',
            icon: 'table',
            label: 'Previsió (TD)'
          },
          {
            to: '/stats-despeses',
            icon: 'table',
            label: 'Despeses (TD)'
          },
          {
            to: '/stats-estrategies',
            icon: 'table',
            label: 'Estratègies (TD)'
          },
          {
            to: '/stats-intercoop',
            icon: 'table',
            label: 'Intercooperació (TD)'
          },
          {
            to: '/dedicacio-saldo',
            icon: 'table',
            label: 'Saldo hores'
          },
          {
            to: '/dedicacio-summary',
            icon: 'table',
            label: 'Hores anuals'
          },
          {
            to: '/salary',
            icon: 'table',
            label: 'Bestretes'
          }
        ],
        'Ajuda',
        [
          {
            to: '/documentacio',
            icon: 'help-circle',
            label: 'Documentació'
          }
        ]
        //,
        // 'About',
        // [
        //   {
        //     href: 'https://admin-one.justboil.me',
        //     label: 'Premium Demo',
        //     icon: 'credit-card'
        //   },
        //   {
        //     href: 'https://justboil.me/bulma-admin-template/one',
        //     label: 'About',
        //     icon: 'help-circle'
        //   }
        // ]
      ]
    }
  },
  async created () {

    if (localStorage.getItem('user') && localStorage.getItem('jwt')) {

      try {
        const me = await service({ requiresAuth: true })
        .get("users/me")

        if (me && me.data && me.data.username) {
          const user = JSON.parse(localStorage.getItem('user'))      
          user['jwt'] = localStorage.getItem('jwt')
          this.$store.commit('user', {
            name: user.username,
            jwt: sessionStorage.getItem('jwt')
          })
          if (this.$route.name === 'login') {
            this.$router.push("projectes");
          }
        }
      } catch {
        localStorage.removeItem('user')
        localStorage.removeItem('jwt')
        this.$router.push("/");
      }
      

      
    }
  }
}
</script>
