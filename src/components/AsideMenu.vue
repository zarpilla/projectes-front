<template>
  <aside v-show="isAsideVisible" class="aside is-placed-left" :class="{ 'is-expanded': !isCollapsed, 'is-collapsed': isCollapsed }">
    <div class="aside-head">
      <router-link :to="homeLink" class="aside-logo" title="ESSTRAPIS">
        <brand-logo :compact="isCollapsed" />
      </router-link>
      <button type="button" class="collapse-toggle" :title="isCollapsed ? 'Expandir menú' : 'Contraure menú'" :aria-label="isCollapsed ? 'Expandir menú' : 'Contraure menú'" @click="toggleCollapse">
        <b-icon :icon="isCollapsed ? 'chevron-right' : 'chevron-left'" custom-size="default" />
      </button>
    </div>
    <div class="aside-content-scrollable">
      <nav class="menu is-menu-main" aria-label="Menú principal">
        <template v-for="(menuGroup, index) in menu" :key="index">
          <template v-if="typeof menuGroup === 'string'">
            <button
              v-if="isCollapsible(menuGroup)"
              v-show="!isCollapsed"
              type="button"
              class="menu-label menu-group-toggle"
              :aria-expanded="isGroupOpen(index) ? 'true' : 'false'"
              @click="toggleGroup(menuGroup)"
            >
              <span>{{ menuGroup }} · {{ groupSize(index) }}</span>
              <b-icon :icon="isGroupOpen(index) ? 'chevron-up' : 'chevron-down'" custom-size="default" />
            </button>
            <!-- the Inici entry has no group label -->
            <p v-else-if="menuGroup" v-show="!isCollapsed" class="menu-label">{{ menuGroup }}</p>
          </template>
          <aside-menu-list
            v-else
            v-show="isCollapsed || !isCollapsible(menu[index - 1]) || isGroupOpen(index - 1)"
            :menu="menuGroup"
            :is-collapsed="isCollapsed"
            :class="{ 'is-submenu-group': isCollapsible(menu[index - 1]) }"
            @menu-click="menuClick"
          />
        </template>
      </nav>
      <div v-if="logos.length && !isCollapsed" class="logos-support">
        <span>Amb el suport de</span>
        <figure v-for="logo in logos" :key="'expanded-' + logo.id" class="image">
          <img :src="logo.url" :alt="logo.name" />
        </figure>
      </div>
    </div>
    <div class="aside-user" :class="{ 'is-collapsed': isCollapsed }">
      <router-link to="/profile" class="aside-me" :title="'El meu compte · ' + userName">
        <span class="aside-avatar">{{ initials }}</span>
        <span v-if="!isCollapsed" class="aside-user-name">{{ userName }}</span>
      </router-link>
      <button type="button" class="logout-button" title="Sortir" aria-label="Sortir" @click="logout">
        <b-icon icon="logout" custom-size="default" />
        <span v-if="!isCollapsed">Sortir</span>
      </button>
    </div>
  </aside>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import AsideMenuList from '@/components/AsideMenuList.vue'
import BrandLogo from '@/components/BrandLogo.vue'
import { logout } from '@/service/auth'
import service from "@/service/index";
import getConfig from "@/config";
import { openTickets, ticketsErrorMessage } from "@/service/tickets";

// Long groups start folded; they open by themselves when the current page is in them
const COLLAPSIBLE_GROUPS = ['Informes', 'Altres']

export default {
  name: 'AsideMenu',
  components: { AsideMenuList, BrandLogo },
  props: {
    menu: {
      type: Array,
      default: []
    }
  },
  computed: {
    ...mapState(useMainStore, ['isAsideVisible', 'userName']),
    // the first screen this user's menu offers (an hours-only user has no projects list)
    homeLink () {
      for (const group of this.menu) {
        if (Array.isArray(group)) {
          const item = group.find(i => i && i.to)
          if (item) return item.to
        }
      }
      return '/projectes'
    },
    initials () {
      const words = (this.userName || '').split(/[\s._@-]+/).filter(Boolean)
      return words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'
    }
  },
  data() {
    return {
      logos: [],
      isCollapsed: false,
      openGroups: {}
    }
  },
  created() {
    this.fetchLogos();
    this.loadCollapsedState();
  },
  beforeUnmount() {
    document.documentElement.classList.remove('has-aside-collapsed');
  },
  methods: {
    isCollapsible (label) {
      return typeof label === 'string' && COLLAPSIBLE_GROUPS.includes(label)
    },
    groupItems (labelIndex) {
      const items = this.menu[labelIndex + 1]
      return Array.isArray(items) ? items.filter(item => item && item.label) : []
    },
    groupSize (labelIndex) {
      return this.groupItems(labelIndex).length
    },
    isGroupOpen (labelIndex) {
      const label = this.menu[labelIndex]
      if (this.openGroups[label] !== undefined) {
        return this.openGroups[label]
      }
      return this.groupItems(labelIndex).some(item => item.to && item.to === this.$route.path)
    },
    toggleGroup (label) {
      const labelIndex = this.menu.indexOf(label)
      this.openGroups = { ...this.openGroups, [label]: !this.isGroupOpen(labelIndex) }
    },
    async menuClick (item) {
      if (item.action === 'tickets') {
        try {
          await openTickets()
        } catch (error) {
          this.$buefy.snackbar.open({ message: ticketsErrorMessage(error), type: 'is-danger', queue: false })
        }
      }
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
    async logout () {
      await logout()
      this.$buefy.snackbar.open({
        message: 'Log out',
        queue: false
      })
      location.href = import.meta.env.VUE_APP_PATH || '/'
    }
  }
}
</script>

<style>
aside.aside {
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  background: var(--a-surface);
  border-right: 1px solid var(--a-line);
}
.aside-head {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 4rem;
  padding: 0 1.25rem;
}
.aside-logo {
  display: inline-flex;
  align-items: center;
  color: var(--a-fg);
}
.aside-logo:hover {
  color: var(--a-fg);
}
.collapse-toggle {
  position: absolute;
  right: .5rem;
  top: 1.125rem;
  width: 1.75rem;
  height: 1.75rem;
  display: none;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--a-muted);
  cursor: pointer;
}
.collapse-toggle:hover {
  background: var(--a-chip);
}
.aside:hover .collapse-toggle,
.collapse-toggle:focus-visible {
  display: inline-flex;
}
.aside-content-scrollable {
  flex: 1;
  /* a flex item won't shrink below its content without this, so the menu
     overflowed the window (clipped) instead of scrolling */
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 .75rem 1rem;
  scrollbar-width: thin;
  scrollbar-color: var(--a-line) transparent;
}
aside.aside .menu-label {
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--a-muted);
  margin: 1.125rem 0 .375rem;
  padding: 0 .625rem;
}
aside.aside .menu-label:first-child {
  margin-top: .25rem;
}
aside.aside .menu-group-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  border: 0;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  height: 2.25rem;
  border-radius: 8px;
}
aside.aside .menu-group-toggle:hover {
  background: var(--a-chip);
}
aside.aside .menu-list li + li {
  margin-top: 2px;
}
aside.aside .menu-list a {
  display: flex;
  align-items: center;
  gap: .625rem;
  min-height: 2.25rem;
  padding: 0 .625rem;
  border-radius: 8px;
  font-size: .875rem;
  font-weight: 600;
  color: var(--a-fg-2);
}
aside.aside .menu-list a .icon {
  color: inherit;
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
}
/* line icons at the size of the mockups (MDI defaults to 24px glyphs in a small box) */
aside.aside .menu-list a .icon .mdi::before {
  font-size: 1.125rem;
}
aside.aside .menu-list a {
  gap: .75rem;
}
aside.aside .menu-list a:not(.is-active) .icon {
  color: var(--a-muted);
}
aside.aside .menu-list a:hover .icon {
  color: inherit;
}
/* reports and other long groups: compact rows, smaller icons (mockup) */
aside.aside .is-submenu-group a {
  min-height: 2rem;
  font-weight: 600;
}
aside.aside .is-submenu-group a .icon .mdi::before {
  font-size: 1rem;
}
aside.aside .menu-list a:hover {
  background: var(--a-chip);
  color: var(--a-fg);
}
aside.aside .menu-list a.is-active {
  background: var(--a-accent-soft);
  color: var(--a-accent);
  font-weight: 800;
}
aside.aside .is-submenu-group a {
  font-size: .84rem;
}
.logos-support {
  margin-top: 1.5rem;
  padding: 1rem .625rem 0;
  border-top: 1px solid var(--a-line);
  display: flex;
  flex-direction: column;
  gap: .75rem;
  color: var(--a-muted);
  font-size: .75rem;
  font-weight: 600;
}
.logos-support img {
  max-height: 3rem;
  width: auto;
  object-fit: contain;
}
.aside-user {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: .625rem;
  padding: .75rem 1rem;
  border-top: 1px solid var(--a-line);
}
.aside-user.is-collapsed {
  flex-direction: column;
  padding: .75rem 0;
}
.aside-me {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: .625rem;
  color: var(--a-fg);
  border-radius: 8px;
}
.aside-me:hover .aside-user-name {
  color: var(--a-accent);
}
.aside-user.is-collapsed .aside-me {
  flex: none;
}
.aside-avatar {
  flex: none;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--a-accent-soft);
  color: var(--a-accent);
  font-weight: 800;
  font-size: .75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.aside-user-name {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.logout-button {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: .8125rem;
  font-weight: 600;
  color: var(--a-muted);
  cursor: pointer;
  padding: .25rem .375rem;
  border-radius: 6px;
}
.logout-button:hover {
  background: var(--a-chip);
  color: var(--a-fg);
}
@media screen and (min-width: 1024px) {
  aside.aside.is-collapsed {
    width: 64px !important;
  }
  aside.aside.is-collapsed .aside-head {
    justify-content: center;
    padding: 0;
  }
  aside.aside.is-collapsed .collapse-toggle {
    position: static;
    display: none;
  }
  /* collapsed: the 64px rail has no room for logo + toggle side by side (and
     the aside clips overflow), so on hover the toggle takes the logo's place */
  aside.aside.is-collapsed:hover .aside-logo {
    display: none;
  }
  aside.aside.is-collapsed:hover .collapse-toggle,
  aside.aside.is-collapsed .collapse-toggle:focus-visible {
    display: inline-flex;
    width: 2.25rem;
    height: 2.25rem;
    color: var(--a-fg);
    background: var(--a-chip);
  }
  aside.aside.is-collapsed .aside-content-scrollable {
    padding: 0 .5rem 1rem;
  }
  aside.aside.is-collapsed .menu-item-label,
  aside.aside.is-collapsed .dropdown-icon {
    display: none;
  }
  aside.aside.is-collapsed .menu-list a {
    justify-content: center;
    padding: 0;
  }
}
</style>
