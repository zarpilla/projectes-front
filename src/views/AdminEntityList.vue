<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <admin-entity-list :entity-name="entityName" />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar';
import AdminEntityList from '@/components/AdminEntityList';
import service from '@/service/index';

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
    titleStack() {
      const displayName = (this.metadata && this.metadata.displayName) || this.formatEntityName(this.entityName);
      return ['Administració', displayName];
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
