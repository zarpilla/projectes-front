<template>
  <div>
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <admin-tables-layout v-if="isTable" :entity-name="entityName">
        <admin-entity-list :entity-name="entityName" />
      </admin-tables-layout>
      <admin-entity-list v-else :entity-name="entityName" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import AdminEntityList from '@/components/AdminEntityList.vue';
import AdminTablesLayout from '@/components/AdminTablesLayout.vue';
import service from '@/service/index';
import { ADMIN_TABLES } from '@/service/adminTables';

export default {
  name: 'AdminEntityListView',
  components: {
    TitleBar,
    AdminEntityList,
    AdminTablesLayout
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
    titleStack() {
      if (this.isTable) return ['Administració', 'Taules auxiliars'];
      const displayName = (this.metadata && this.metadata.displayName) || this.formatEntityName(this.entityName);
      return ['Administració', displayName];
    },
    subtitle() {
      return this.isTable ? `Les llistes que alimenten els desplegables de l'aplicació. Tria'n una per veure-la i editar-la.` : '';
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
