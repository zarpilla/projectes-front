<template>
  <div id="app">
    <nav-bar />
    <aside-menu :menu="menu" />
    <router-view />
    <footer-bar />
  </div>
</template>

<script>
// @ is an alias to /src
import NavBar from '@/components/NavBar'
import AsideMenu from '@/components/AsideMenu'
import FooterBar from '@/components/FooterBar'

export default {
  name: 'Home',
  components: {
    FooterBar,
    AsideMenu,
    NavBar
  },
  computed: {
    menu () {
      return [
        'Panells',
        [
          {
            to: '/',
            icon: 'table',
            label: 'General'
          },
          {
            to: '/stats-projectes',
            icon: 'table',
            label: 'Projectes'
          },
          {
            to: '/stats-dedicacio',
            icon: 'table',
            label: 'Dedicació'
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
          }
        ],
        'Dedicació',
        [
          {
            to: '/dedicacio',
            label: 'Entrada Hores',
            icon: 'arrow-right'
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
        ]//,
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
  created () {
    // console.log('App created query', this.$route.query)
    if (this.$route.query.username && this.$route.query.jwt) {
      this.$store.commit('user', {
        name: this.$route.query.username,
        jwt: this.$route.query.jwt
      })
      const localUser = JSON.stringify(this.$route.query)
      localStorage.setItem('user', localUser)
    } else {
      const userFromStorage = localStorage.getItem('user')
      if (userFromStorage) {
        const user = JSON.parse(userFromStorage)
        this.$store.commit('user', {
          name: user.username,
          jwt: user.jwt
        })
      } else {
        location.href = process.env.API_LOGIN || 'http://localhost:1337/admin'
      }
    }
  }
}
</script>
