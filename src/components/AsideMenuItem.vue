<template>
  <li :class="[item.itemClassName, { 'is-dropdown-active': isDropdownActive }]">
    <component
      :is="componentIs"
      v-bind="item"
      exact-active-class="is-active"
      :class="{ 'has-icon': !!item.icon, 'has-dropdown-icon': hasDropdown, 'is-active': isActiveGroup }"
      :title="isCollapsed && item.label ? item.label : null"
      @click="menuClick"
    >
      <b-icon
        v-if="item.icon"
        :icon="item.icon"
        :class="{ 'has-update-mark': item.updateMark || (isCollapsed && badge), 'is-late-mark': isCollapsed && badge && badge.late }"
        custom-size="default"
      />
      <span v-if="item.label" :class="{ 'menu-item-label': !!item.icon }">{{
        item.label
      }}</span>
      <span
        v-if="badge && !isCollapsed"
        class="menu-badge"
        :class="{ 'is-late': badge.late }"
        :title="badge.title"
      ><span aria-hidden="true">{{ badge.count }}</span><span class="is-sr-only">{{ badge.title }}</span></span>
      <!-- pinned to Inici: shown only; the stars are set on Inici itself, where a
           slip of the mouse in the menu can't change them -->
      <span v-if="isPinned" class="menu-pin" title="Fixat a l'inici">
        <b-icon icon="star" custom-size="default" aria-hidden="true" /><span class="is-sr-only">(fixat a l'inici)</span>
      </span>
      <div v-if="hasDropdown" class="dropdown-icon">
        <b-icon :icon="dropdownIcon" custom-size="default" />
      </div>
    </component>
    <aside-menu-list
      v-if="hasDropdown"
      :menu="item.menu"
      :is-submenu-list="true"
      :is-collapsed="isCollapsed"
    />
  </li>
</template>

<script>
import { isAdminTablePath, isOfficeTablePath } from '@/service/adminTables'
import { useTaskAlerts } from '@/stores/taskAlerts'
import { useHomePins } from '@/stores/homePins'
import { HOME_PATH } from '@/domain/home'
export default {
  name: 'AsideMenuItem',
  emits: ["menu-click"],
  components: {
    AsideMenuList: () => import('@/components/AsideMenuList.vue')
  },
  props: {
    item: {
      type: Object,
      default: null
    },
    isCollapsed: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      isDropdownActive: false
    }
  },
  computed: {
    pins () {
      return useHomePins()
    },
    // a star after the entries pinned to Inici (not on the collapsed rail)
    isPinned () {
      return !!this.item.to && this.item.to !== HOME_PATH && !this.isCollapsed && this.pins.isPinned(this.item.to)
    },
    // an entry that stands for a group of screens (e.g. the auxiliary tables)
    isActiveGroup () {
      if (!this.item.activeWhen || !this.$route) return false
      const path = this.$route.path
      if (this.item.activeWhen === 'admin-tables') return isAdminTablePath(path)
      if (this.item.activeWhen === 'logistics-tables') return isOfficeTablePath(path)
      if (this.item.activeWhen === 'energy-partners') return /^\/energia\/soci/.test(path)
      if (this.item.activeWhen === 'verifactu') return /^\/administracio\/(verifactu|verifactu-chain|face-queue)(\/|$)/.test(path)
      return false
    },
    // a count next to the label (the Tasques entry: overdue and new tasks)
    badge () {
      if (this.item.badge !== 'tasks') return null
      const alerts = useTaskAlerts()
      if (!alerts.count) return null
      return { count: alerts.count, late: alerts.overdue > 0, title: alerts.title }
    },
    componentIs () {
      return this.item.to ? 'router-link' : 'a'
    },
    hasDropdown () {
      return !!this.item.menu
    },
    dropdownIcon () {
      return this.isDropdownActive ? 'minus' : 'plus'
    },
    itemTo () {
      return this.item.to ? this.item.to : null
    },
    itemHref () {
      return this.item.href ? this.item.href : null
    }
  },
  methods: {
    menuClick (event) {
      // Items with an `action` run code instead of navigating.
      if (this.item.action && event) {
        event.preventDefault()
      }
      this.$emit('menu-click', this.item)

      if (this.hasDropdown) {
        this.isDropdownActive = !this.isDropdownActive
      }
    }
  }
}
</script>

<style scoped>
.menu-pin {
  margin-left: auto;
  display: inline-flex;
  color: var(--a-star);
}
.menu-badge + .menu-pin {
  margin-left: .375rem;
}
.menu-pin :deep(.mdi::before) {
  font-size: .875rem;
}
/* the menu greys its icons (AsideMenu.vue); the star keeps its colour */
.menu-pin :deep(.icon) {
  color: var(--a-star) !important;
}
.menu-badge {
  margin-left: auto;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 .375rem;
  border-radius: 999px;
  background: var(--a-accent);
  color: #fff;
  font-size: .6875rem;
  font-weight: 800;
  line-height: 1.25rem;
  text-align: center;
}
.menu-badge.is-late {
  background: var(--a-neg);
}
.is-late-mark:after {
  background-color: var(--a-neg) !important;
}
</style>
