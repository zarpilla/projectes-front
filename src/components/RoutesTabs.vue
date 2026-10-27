<template>
  <!-- The screens about routes share these tabs (mockup A-Log-Rutes) -->
  <nav class="tabs routes-tabs" aria-label="Rutes">
    <ul>
      <li v-for="tab in visibleTabs" :key="tab.to" :class="{ 'is-active': $route.path === tab.to }">
        <router-link :to="tab.to">{{ tab.label }}</router-link>
      </li>
    </ul>
  </nav>
</template>

<script>
// the side menu has one entry, «Poblacions i rutes», for all of them (issues/353)
export const TABS = [
  { to: "/poblacions-rutes", label: "Poblacions i rutes" },
  { to: "/rutes-dies", label: "Rutes i dies" },
  // what an order would cost (issues/361)
  { to: "/simulador-logistic", label: "Simulador" },
  { to: "/poblacions-punts-entrega", label: "Poblacions i punts", staff: true },
  // the office creates and disables routes (issues/141)
  { to: "/rutes", label: "Rutes", office: true }
];

/** Whether a path is one of these screens: the menu entry stays highlighted on them. */
export const isRoutesScreenPath = path => TABS.some(tab => tab.to === path);

export default {
  name: "RoutesTabs",
  props: {
    isStaff: {
      type: Boolean,
      default: false
    },
    isOffice: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    visibleTabs() {
      return TABS.filter(tab => (!tab.staff || this.isStaff) && (!tab.office || this.isOffice));
    }
  }
};
</script>

<style scoped>
.routes-tabs {
  margin-bottom: 1.25rem;
}
</style>
