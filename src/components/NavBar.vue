<template>
  <nav v-show="isNavBarVisible" id="navbar-main" class="navbar is-fixed-top">
    <div class="navbar-brand">
      <a
        class="navbar-item is-hidden-desktop"
        aria-label="Menú"
        @click.prevent="menuToggleMobile"
      >
        <b-icon :icon="menuToggleMobileIcon" />
      </a>
      <router-link
        :to="{ name: 'inici' }"
        class="navbar-item navbar-logo is-hidden-desktop"
        aria-label="Inici"
      >
        <brand-logo />
      </router-link>
      <!-- <div class="navbar-item has-control no-left-space-touch">
        <div class="control">
          <input class="input" placeholder="Search everywhere..." />
        </div>
      </div> -->
    </div>
    <div class="navbar-brand is-right">
      <a
        class="navbar-item navbar-item-menu-toggle is-hidden-desktop"
        :aria-label="userName || 'Usuari'"
        @click.prevent="menuNavBarToggle"
      >
        <b-icon :icon="menuNavBarToggleIcon" />
      </a>
    </div>
    <!-- User section visible only on mobile; desktop users see it in AsideMenu -->
    <div
      class="navbar-menu fadeIn animated faster is-hidden-desktop"
      :class="{ 'is-active': isMenuNavBarActive }"
    >
      <div class="navbar-end">
        <nav-bar-menu class="has-divider zhas-user-avatar">
          <user-avatar />
          <div class="is-user-name">
            <span>{{ userName }}</span>
          </div>

          <template #dropdown>
            <div class="navbar-dropdown">
              <hr class="navbar-divider" />
              <a class="navbar-item" @click="logout">
                <b-icon icon="logout" custom-size="default"></b-icon>
                <span>Sortir</span>
              </a>
            </div>
          </template>
        </nav-bar-menu>
      </div>
    </div>
  </nav>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import NavBarMenu from '@/components/NavBarMenu.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import BrandLogo from '@/components/BrandLogo.vue'
import { logout } from '@/service/auth'

export default {
  name: 'NavBar',
  components: {
    UserAvatar,
    NavBarMenu,
    BrandLogo
  },
  data () {
    return {
      isMenuNavBarActive: false
    }
  },
  computed: {
    menuNavBarToggleIcon () {
      return this.isMenuNavBarActive ? 'close' : 'account-circle-outline'
    },
    menuToggleMobileIcon () {
      return this.isAsideMobileExpanded ? 'close' : 'menu'
    },
    ...mapState(useMainStore, ['isNavBarVisible', 'isAsideMobileExpanded', 'userName'])
  },
  mounted () {
    this.$router.afterEach(() => {
      this.isMenuNavBarActive = false
    })
  },
  methods: {
    menuToggleMobile () {
      useMainStore().asideMobileStateToggle()
    },
    menuNavBarToggle () {
      this.isMenuNavBarActive = !this.isMenuNavBarActive
    },
    async logout () {
      await logout()
      this.$buefy.snackbar.open({
        message: 'Log out',
        queue: false
      })
      location.href = import.meta.env.BASE_URL
    }
  }
}
</script>
<style scoped>
.navbar.is-fixed-top {
  @media screen and (min-width: 1024px) {
    display: none;
  }
}
/* centred on the bar, whatever the width of the side buttons */
.navbar-logo {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  transform: translateX(-50%);
  color: inherit;
}
.navbar-logo:hover,
.navbar-logo:focus {
  background: transparent;
}
.navbar-logo :deep(.brand-logo) {
  height: 1.5rem;
}
</style>