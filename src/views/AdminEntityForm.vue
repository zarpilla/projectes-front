<template>
  <div>
    <title-bar :title-stack="titleStack" :subtitle="id ? 'Edita aquest registre de la llista.' : 'Afegeix un registre nou a la llista.'" />
    <section class="section is-main-section">
      <admin-tables-layout v-if="isTable" :entity-name="entityName">
        <admin-entity-form :entity-name="entityName" :id="id" />
      </admin-tables-layout>
      <admin-entity-form v-else :entity-name="entityName" :id="id" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import { ADMIN_TABLES } from '@/service/adminTables';
import AdminEntityForm from '@/components/AdminEntityForm.vue';
import AdminTablesLayout from '@/components/AdminTablesLayout.vue';
import service from '@/service/index';

export default {
  name: 'AdminEntityFormView',
  components: {
    TitleBar,
    AdminEntityForm,
    AdminTablesLayout
  },
  props: {
    entityName: {
      type: String,
      required: true
    },
    id: {
      type: [String, Number],
      default: null
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
      const entityDisplay = (this.metadata && this.metadata.displayNameSingular) || 
                           (this.metadata && this.metadata.displayName) || 
                           this.formatEntityName(this.entityName);
      return this.isTable
        ? ['Administració', 'Taules auxiliars', entityDisplay]
        : ['Administració', entityDisplay];
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
        const response = await service({ requiresAuth: true, cached: true }).get('/entity-metadata/admin-entities');
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
