<template>
  <li :class="[item.itemClassName, { 'is-dropdown-active': isDropdownActive, 'has-pin': isPinnable }]">
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
      <div v-if="hasDropdown" class="dropdown-icon">
        <b-icon :icon="dropdownIcon" custom-size="default" />
      </div>
    </component>
    <!-- star: pins the entry to Inici (stores/homePins.js) -->
    <button
      v-if="isPinnable"
      type="button"
      class="menu-pin"
      :class="{ 'is-pinned': isPinned }"
      :aria-pressed="isPinned ? 'true' : 'false'"
      :aria-label="(isPinned ? 'Treu de l\'inici: ' : 'Fixa a l\'inici: ') + item.label"
      :title="isPinned ? 'Treu de l\'inici' : 'Fixa a l\'inici'"
      @click="pins.toggle(item.to)"
    >
      <b-icon :icon="isPinned ? 'star' : 'star-outline'" custom-size="default" />
    </button>
    <aside-menu-list
      v-if="hasDropdown"
      :menu="item.menu"
      :is-submenu-list="true"
      :is-collapsed="isCollapsed"
    />
  </li>
</template>

<script>
import { isAdminTablePath } from '@/service/adminTables'
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
    // entries that open a page (not Tiquets, not Inici itself) can be pinned
    isPinnable () {
      return !!this.item.to && this.item.to !== HOME_PATH && !this.isCollapsed
    },
    isPinned () {
      return this.pins.isPinned(this.item.to)
    },
    // an entry that stands for a group of screens (e.g. the auxiliary tables)
    isActiveGroup () {
      if (!this.item.activeWhen || !this.$route) return false
      const path = this.$route.path
      if (this.item.activeWhen === 'admin-tables') return isAdminTablePath(path)
      if (this.item.activeWhen === 'verifactu') return /^\/admin\/(verifactu|verifactu-chain|face-queue)(\/|$)/.test(path)
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
.has-pin {
  position: relative;
}
.has-pin > a {
  padding-right: 2rem !important;
}
.menu-pin {
  position: absolute;
  top: 50%;
  right: .25rem;
  transform: translateY(-50%);
  width: 1.625rem;
  height: 1.625rem;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--a-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
}
.menu-pin :deep(.mdi::before) {
  font-size: 1rem;
}
.has-pin:hover .menu-pin,
.menu-pin:focus-visible,
.menu-pin.is-pinned {
  opacity: 1;
}
.menu-pin:hover {
  background: var(--a-chip);
  color: var(--a-fg);
}
.menu-pin.is-pinned {
  color: var(--a-star);
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
