<template>
  <aside v-show="isAsideVisible" class="aside is-placed-left" :class="{ 'is-expanded': !isCollapsed, 'is-collapsed': isCollapsed }">
    <aside-tools :is-main-menu="true">
      <span slot="label">
        <img v-if="!isCollapsed" class="main-logo" src="@/assets/esstrapis.svg" alt="ESSTRAPIS"  />
        <img v-else class="main-logo-collapsed" src="@/assets/esstrapis-collapsed.svg" alt="ESSTRAPIS" title="ESSTRAPIS" />
      </span>
      <button class="button is-primary is-small collapse-toggle" @click="toggleCollapse" :title="isCollapsed ? 'Expandir menú' : 'Contraure menú'">
        <b-icon :icon="isCollapsed ? 'chevron-right' : 'chevron-left'" custom-size="default" />
      </button>
    </aside-tools>
    <div class="aside-content-scrollable">
      <div class="menu is-menu-main">
      <template v-for="(menuGroup, index) in menu">
        <p v-if="typeof menuGroup === 'string'" :key="'label-' + index" class="menu-label" v-show="!isCollapsed">
          {{ menuGroup }}
        </p>
        <aside-menu-list
          v-else          
          :key="'menu-' + index"
          :menu="menuGroup"
          :is-collapsed="isCollapsed"
          @menu-click="menuClick"
        />
      </template>
    </div>
    <div class="user-section" v-if="!isCollapsed">
      <div class="user-info">
        <!-- <user-avatar /> -->
        <div class="user-name">
          <b-icon icon="account" custom-size="default"></b-icon>
          <span>{{ userName }}</span>
        </div>
      </div>
      <a class="logout-button" @click="logout">
        <b-icon icon="logout" custom-size="default"></b-icon>
        <span>Sortir</span>
      </a>
    </div>
    <div class="user-section-collapsed" v-if="isCollapsed" :title="userName">
      <user-avatar />
      <a class="logout-button-collapsed" @click="logout" title="Sortir">
        <b-icon icon="logout" custom-size="default"></b-icon>
      </a>
    </div>
    <div class="logos-support" v-if="logos.length && !isCollapsed">      
      Amb el suport de:
    </div>
    <div class="logos-support logos" v-if="logos.length && !isCollapsed">      
      <div v-for="logo in logos" :key="'expanded-' + logo.id" class="mt-5 mb-5 has-text-centered">
        <figure class="image is-190w is-inline-block">
          <img :src="logo.url" :alt="logo.name" />
        </figure>
      </div>
    </div>
    <div class="logos-support logos-collapsed" v-if="logos.length && isCollapsed" :title="'Amb el suport de: ' + logos.map(l => l.name).join(', ')">
      <div v-for="logo in logos" :key="'collapsed-' + logo.id" class="logo-item-collapsed">
        <figure class="image">
          <img :src="logo.url" :alt="logo.name" :title="logo.name" />
        </figure>
      </div>
    </div>
    </div>
  </aside>
</template>

<script>
import { mapState } from 'vuex'
import AsideTools from '@/components/AsideTools'
import AsideMenuList from '@/components/AsideMenuList'
import UserAvatar from '@/components/UserAvatar'
import service from "@/service/index";
import getConfig from "@/config";

export default {
  name: 'AsideMenu',
  components: { AsideTools, AsideMenuList, UserAvatar },
  props: {
    menu: {
      type: Array,
      default: []
    }
  },
  computed: {
    ...mapState(['isAsideVisible', 'userName'])
  },
  data() {
    return {
      logos: [],
      isCollapsed: false
    }
  },
  created() {
    this.fetchLogos();
    this.loadCollapsedState();
  },
  beforeDestroy() {
    document.documentElement.classList.remove('has-aside-collapsed');
  },
  methods: {
    menuClick (item) {
      
      //
    },
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
      localStorage.setItem('asideMenuCollapsed', JSON.stringify(this.isCollapsed));
      this.updateHtmlClass();
    },
    loadCollapsedState() {
      const saved = localStorage.getItem('asideMenuCollapsed');
      if (saved !== null) {
        this.isCollapsed = JSON.parse(saved);
      }
      this.updateHtmlClass();
    },
    updateHtmlClass() {
      const htmlClassName = 'has-aside-collapsed';
      if (this.isCollapsed) {
        document.documentElement.classList.add(htmlClassName);
      } else {
        document.documentElement.classList.remove(htmlClassName);
      }
    },
    fetchLogos() {
      service({ cached: true }).get("logos?_sort=order:ASC").then(response => {
        const config = getConfig();
        const apiUrl = config.VUE_APP_API_URL;
        this.logos = response.data.map(logo => {
          return {
            ...logo,
            url: logo.logo ? apiUrl + logo.logo.url : ""
          };
        });
      }).catch(error => {
        console.error("Error fetching logos:", error);
      });
    },
    logout () {
      localStorage.removeItem('user')
      localStorage.removeItem('jwt')
      this.$buefy.snackbar.open({
        message: 'Log out',
        queue: false
      })
      location.href = process.env.VUE_APP_PATH || '/'
    }
  }
}
</script>
<style>
.menu-list a{
  padding: 0.3rem 0;
}
aside.aside{
    overflow-y: hidden;
    display: flex;
    flex-direction: column;
    transition: width 0.3s ease;
}
.aside-content-scrollable {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    height: calc(100vh - 3.25rem);
}
/* Custom scrollbar styling */
.aside-content-scrollable::-webkit-scrollbar {
    width: 8px;
}
.aside-content-scrollable::-webkit-scrollbar-track {
    background: transparent;
}
.aside-content-scrollable::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
}
.aside-content-scrollable::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}
/* Firefox scrollbar */
.aside-content-scrollable {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}
@media screen and (min-width: 1024px) {
  aside.aside.is-collapsed {
    width: 60px !important;
  }
}
@media screen and (min-width: 1024px) {
  aside.aside.is-collapsed .aside-tools-label {
    justify-content: center;
  }
  aside.aside.is-collapsed .menu-item-label {
    display: none;
  }
  aside.aside.is-collapsed .dropdown-icon {
    display: none;
  }
  aside.aside.is-collapsed .menu-list {
    text-align: center;
  }
  aside.aside.is-collapsed .menu-list a {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
  }
}
.logos-support {
  padding: 0 1rem;
  color: #bbbbbb;
}
.logos-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0;
}
.logo-item-collapsed {
  width: 40px;
  height: 40px;
  margin: 0.25rem 0;
}
.logo-item-collapsed .image {
  width: 100%;
  height: 100%;
}
.logo-item-collapsed img {
  object-fit: contain;
  width: 100%;
  height: 100%;
}
.is-190w {
    width: 100%;
}
.user-section {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 1rem;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.user-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ffffff;
  font-weight: 500;
}
.logout-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
  color: #bbbbbb;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.logout-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}
.user-section-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 1rem;
}
.logout-button-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: #bbbbbb;
  cursor: pointer;
  margin-top: 0.5rem;
}
.logout-button-collapsed:hover {
  color: #ffffff;
}
.main-logo {
  height: 1.75rem;
  margin-top: 0.75rem;
}
.main-logo-collapsed {
  width: 30px;
  height: 30px;
  object-fit: contain;
  margin-top: 0.5rem;
}
.collapse-toggle {
  position: absolute;
  right: 0.5rem;
  top: 0.675rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  padding: 0.25rem;
  display: none;
}
aside.aside.is-collapsed .collapse-toggle {
  top: 0.5rem;
}
.collapse-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
.aside:hover .collapse-toggle {
  display: block;
}
.aside-tools {
  position: relative;
  flex-shrink: 0;
}
</style>