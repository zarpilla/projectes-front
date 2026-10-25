<template>
  <!-- Redesign A: the auxiliary tables share one screen; this is their side list,
       next to a table's list or its form (issues/114) -->
  <div class="admin-tables">
    <nav class="admin-tables-nav" aria-label="Taules auxiliars">
      <template v-for="group in groups" :key="group.title">
        <p class="admin-tables-group">{{ group.title }}</p>
        <router-link
          v-for="t in group.items"
          :key="t.entity"
          :to="'/administracio/' + t.entity"
          class="admin-tables-link"
          :class="{ 'is-active': t.entity === entityName }"
        >{{ t.label }}</router-link>
      </template>
    </nav>
    <div class="admin-tables-main">
      <slot />
    </div>
  </div>
</template>

<script>
import { adminTableGroupsFor } from '@/service/adminTables';
import service from '@/service/index';

export default {
  name: 'AdminTablesLayout',
  props: {
    entityName: {
      type: String,
      required: true
    }
  },
  data() {
    return { permissions: [] };
  },
  computed: {
    groups() {
      return adminTableGroupsFor(this.permissions);
    }
  },
  async mounted() {
    try {
      const me = (await service({ requiresAuth: true, cached: true }).get('users/me')).data;
      this.permissions = ((me && me.permissions) || []).map(p => p.permission);
    } catch (e) {
      this.permissions = [];
    }
  }
};
</script>

<style scoped>
.admin-tables {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}
.admin-tables-nav {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  padding: .75rem .5rem;
  position: sticky;
  top: 1rem;
}
.admin-tables-group {
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--a-muted);
  padding: .75rem .625rem .375rem;
}
.admin-tables-group:first-child {
  padding-top: .25rem;
}
.admin-tables-link {
  display: block;
  padding: .375rem .625rem;
  border-radius: 8px;
  font-size: .875rem;
  font-weight: 600;
  color: var(--a-fg-2);
}
.admin-tables-link:hover {
  background: var(--a-chip);
  color: var(--a-fg);
}
.admin-tables-link.is-active {
  background: var(--a-accent-soft);
  color: var(--a-accent);
  font-weight: 800;
}
@media screen and (max-width: 1023px) {
  .admin-tables {
    grid-template-columns: minmax(0, 1fr);
  }
  .admin-tables-nav {
    position: static;
  }
}
</style>
