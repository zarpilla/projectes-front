<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <admin-entity-form :entity-name="entityName" :id="id" />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar';
import AdminEntityForm from '@/components/AdminEntityForm';
import service from '@/service/index';

export default {
  name: 'AdminEntityFormView',
  components: {
    TitleBar,
    AdminEntityForm
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
    titleStack() {
      const entityDisplay = (this.metadata && this.metadata.displayNameSingular) || 
                           (this.metadata && this.metadata.displayName) || 
                           this.formatEntityName(this.entityName);
      const action = this.id ? 'Editar' : 'Crear';
      return ['Administració', entityDisplay, action];
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
