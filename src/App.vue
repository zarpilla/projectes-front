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
            to: '/stats-projectes',
            icon: 'table',
            label: 'Taula dinàmica'
          },
          {
            to: '/stats-despeses',
            icon: 'table',
            label: 'Despeses'
          },
          {
            to: '/stats-estrategies',
            icon: 'table',
            label: 'Estratègies'
          },
          {
            to: '/stats-intercoop',
            icon: 'table',
            label: 'Intercooperació'
          },
          {
            href: `${process.env.VUE_APP_API_URL || 'http://localhost:1337'}/admin`,
            icon: 'table',
            label: 'Strapi'
          }
        ],
        'Dedicació',
        [
          {
            to: '/dedicacio',
            label: 'Entrada Hores',
            icon: 'table'
          },
          {
            to: '/dedicacio-charts',
            label: 'Gràfiques',
            icon: 'table'
          },
          {
            to: '/stats-dedicacio',
            icon: 'table',
            label: 'Taula dinàmica'
          },
          {
            to: '/stats-previsio-hores',
            icon: 'table',
            label: 'Previsió (TD)'
          },
          {
            to: '/stats-previsio-gantt',
            icon: 'table',
            label: 'Previsió (Gantt)'
          },
          {
            to: '/dedicacio-saldo',
            icon: 'table',
            label: 'Saldo hores'
          },
          {
            to: '/salary',
            icon: 'table',
            label: 'Bestretes'
          }
        ],
        'Facturació',
        [
          {
            to: '/emitted-invoices',
            icon: 'table',
            label: 'Factures emeses'
          },
          {
            to: '/received-invoices',
            icon: 'table',
            label: 'Factures rebudes'
          },
          {
            to: '/tresoreria',
            icon: 'table',
            label: 'Tresoreria'
          }
          // {
          //   to: '/tables',
          //   label: 'Tables',
          //   icon: 'table',
          //   updateMark: true
          // },
          // {
          //   to: '/forms',
          //   label: 'Forms',
          //   icon: 'square-edit-outline'
          // },
          // {
          //   to: '/profile',
          //   label: 'Profile',
          //   icon: 'account-circle'
          // },
          // {
          //   label: 'Submenus',
          //   subLabel: 'Submenus Example',
          //   icon: 'view-list',
          //   menu: [
          //     {
          //       href: '#void',
          //       label: 'Sub-item One'
          //     },
          //     {
          //       href: '#void',
          //       label: 'Sub-item Two'
          //     }
          //   ]
          // }
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
