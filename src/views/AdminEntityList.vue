<template>
  <div>
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <div :class="{ 'admin-tables': isTable }">
        <!-- Redesign A: the auxiliary tables share one screen with this list -->
        <nav v-if="isTable" class="admin-tables-nav" aria-label="Taules auxiliars">
          <template v-for="group in groups" :key="group.title">
            <p class="admin-tables-group">{{ group.title }}</p>
            <router-link
              v-for="t in group.items"
              :key="t.entity"
              :to="'/admin/' + t.entity"
              class="admin-tables-link"
              :class="{ 'is-active': t.entity === entityName }"
            >{{ t.label }}</router-link>
          </template>
        </nav>
        <admin-entity-list :entity-name="entityName" />
      </div>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import AdminEntityList from '@/components/AdminEntityList.vue';
import service from '@/service/index';
import { ADMIN_TABLE_GROUPS, ADMIN_TABLES } from '@/service/adminTables';

export default {
  name: 'AdminEntityListView',
  components: {
    TitleBar,
    AdminEntityList
  },
  props: {
    entityName: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      metadata: null
    };
  },
  computed: {
    isTable() {
      return ADMIN_TABLES.some(t => t.entity === this.entityName);
    },
    groups() {
      return ADMIN_TABLE_GROUPS;
    },
    titleStack() {
      if (this.isTable) return ['Administració', 'Taules auxiliars'];
      const displayName = (this.metadata && this.metadata.displayName) || this.formatEntityName(this.entityName);
      return ['Administració', displayName];
    },
    subtitle() {
      return this.isTable ? `${ADMIN_TABLES.length} llistes que alimenten els desplegables de l'aplicació. Tria'n una per veure-la i editar-la.` : '';
    }
  },
  async mounted() {
    await this.loadMetadata();
  },
  watch: {
    async entityName(newEntityName, oldEntityName) {
      if (newEntityName !== oldEntityName) {
        await this.loadMetadata();
      }
    }
  },
  methods: {
    async loadMetadata() {
      try {
        const response = await service({ requiresAuth: true }).get('/entity-metadata/admin-entities');
        const { entities } = response.data;
        this.metadata = entities.find(m => m.name === this.entityName);
      } catch (error) {
        console.error('Error loading metadata:', error);
      }
    },
    formatEntityName(name) {
      return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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
