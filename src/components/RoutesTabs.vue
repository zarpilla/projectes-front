<template>
  <!-- The three screens about routes share these tabs (mockup A-Log-Rutes) -->
  <nav class="tabs routes-tabs" aria-label="Rutes">
    <ul>
      <li v-for="tab in visibleTabs" :key="tab.to" :class="{ 'is-active': $route.path === tab.to }">
        <router-link :to="tab.to">{{ tab.label }}</router-link>
      </li>
    </ul>
  </nav>
</template>

<script>
const TABS = [
  { to: "/route-days", label: "Rutes i dies" },
  { to: "/city-route", label: "Poblacions i rutes" },
  { to: "/city-route-delivery", label: "Poblacions i punts", staff: true }
];

export default {
  name: "RoutesTabs",
  props: {
    isStaff: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    visibleTabs() {
      return TABS.filter(tab => !tab.staff || this.isStaff);
    }
  }
};
</script>

<style scoped>
.routes-tabs {
  margin-bottom: 1.25rem;
}
</style>
