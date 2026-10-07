import { defineStore } from 'pinia'

// Ported from the Vuex store. Pinia puts state and actions on the same object,
// so the former `user` / `me` / `basic` mutations are setUser / setMe / setBasic.
export const useMainStore = defineStore('main', {
  state: () => ({
    /* User */
    user: null,
    userName: null,
    userEmail: null,
    userAvatar: null,
    userJwt: null,

    /* NavBar */
    isNavBarVisible: true,

    /* FooterBar */
    isFooterBarVisible: true,

    /* Aside */
    isAsideVisible: true,
    isAsideMobileExpanded: false,

    /* Options */
    me: null
  }),
  actions: {
    /* A fit-them-all setter */
    setBasic (payload) {
      this[payload.key] = payload.value
    },

    /* User */
    setUser (payload) {
      if (payload.user) {
        this.user = payload.user
      }
      if (payload.name) {
        this.userName = payload.name
      }
      if (payload.email) {
        this.userEmail = payload.email
      }
      if (payload.avatar) {
        this.userAvatar = payload.avatar
      }
      if (payload.jwt) {
        this.userJwt = payload.jwt
      }
    },

    /* Aside Mobile */
    asideMobileStateToggle (payload = null) {
      const htmlClassName = 'has-aside-mobile-expanded'

      let isShow

      if (payload !== null) {
        isShow = payload
      } else {
        isShow = !this.isAsideMobileExpanded
      }

      if (isShow) {
        document.documentElement.classList.add(htmlClassName)
      } else {
        document.documentElement.classList.remove(htmlClassName)
      }

      this.isAsideMobileExpanded = isShow
    },

    setMe (payload) {
      if (payload.me) {
        this.me = payload.me
      }
    }
  }
})
