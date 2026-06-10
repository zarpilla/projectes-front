<template>
  <section class="section">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <modal-box
      :is-active="isModalActive"
      :trash-object-name="trashObjectName"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />

    <div class="mt-5 mb-4">
      <b-button
        type="is-primary"
        icon-left="plus"
        @click="createNew"
      >
        Crear {{ entityDisplayNameSingular }}
      </b-button>
    </div>

    <card-component v-if="!isLoading && items.length > 0">
      <b-table
        :data="items"
        :loading="isLoading"
        :paginated="items.length > 50"
        :per-page="50"
        :striped="true"
        :hoverable="true"
      >
        <!-- ID Column -->
        <b-table-column
          label="ID"
          field="id"
          sortable
          numeric
          width="80"
          v-slot="props"
        >
          <router-link :to="{ name: 'admin.entity.edit', params: { entityName, id: props.row.id } }">
            {{ props.row.id }}
          </router-link>
        </b-table-column>

        <!-- Dynamic columns based on attributes -->
        <b-table-column
          v-for="(attrConfig, attrName) in displayAttributes"
          :key="attrName"
          :label="formatLabel(attrName)"
          :field="attrName"
          sortable
          v-slot="props"
        >
          <span v-if="attrConfig.type === 'boolean'">
            {{ props.row[attrName] ? 'Sí' : 'No' }}
          </span>
          <span v-else-if="attrConfig.type === 'decimal' || attrConfig.type === 'integer' || attrConfig.type === 'float'">
            {{ formatNumber(props.row[attrName]) }}
          </span>
          <span v-else-if="attrConfig.type === 'date' || attrConfig.type === 'datetime'">
            {{ formatDate(props.row[attrName]) }}
          </span>
          <span v-else-if="attrConfig.model && props.row[attrName]">
            {{ props.row[attrName].name || props.row[attrName].username || props.row[attrName].year || props.row[attrName].id }}
          </span>
          <span v-else>
            {{ props.row[attrName] }}
          </span>
        </b-table-column>

        <!-- Actions Column -->
        <b-table-column
          label="Accions"
          custom-key="actions"
          cell-class="is-actions-cell"
          v-slot="props"
        >
          <div class="buttons is-right">
            <router-link
              :to="{ name: 'admin.entity.edit', params: { entityName, id: props.row.id } }"
              class="button is-small is-primary"
            >
              <b-icon icon="pencil" size="is-small" />
            </router-link>
            <button
              class="button is-small is-danger"
              type="button"
              @click.prevent="trashModal(props.row)"
            >
              <b-icon icon="trash-can" size="is-small" />
            </button>
          </div>
        </b-table-column>
      </b-table>
    </card-component>

    <card-component v-else-if="!isLoading">
      <p class="has-text-centered has-text-grey">
        No hi ha cap {{ entityDisplayNameSingular }} encara. Crea'n un nou!
      </p>
    </card-component>
  </section>
</template>

<script>
import service from '@/service/index';
import CardComponent from '@/components/CardComponent';
import ModalBox from '@/components/ModalBox';
import moment from 'moment';

export default {
  name: 'AdminEntityList',
  components: {
    CardComponent,
    ModalBox
  },
  props: {
    entityName: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isLoading: false,
      items: [],
      metadata: null,
      entityToApiPath: {},
      isModalActive: false,
      trashObject: null
    };
  },
  computed: {
    entityDisplayName() {
      return (this.metadata && this.metadata.displayName) || this.entityName;
    },
    entityDisplayNameSingular() {
      return (this.metadata && this.metadata.displayNameSingular) || this.entityDisplayName;
    },
    displayAttributes() {
      if (!this.metadata || !this.metadata.attributes) return {};
      
      // Filter out attributes that shouldn't be displayed in list
      const filtered = {};
      for (const [name, config] of Object.entries(this.metadata.attributes)) {
        // Skip richtext and text fields in list view
        if (config.type === 'richtext' || config.type === 'text') continue;
        filtered[name] = config;
      }
      return filtered;
    },
    trashObjectName() {
      if (!this.trashObject) return null;
      // Try to find a name field
      return this.trashObject.name || this.trashObject.username || `ID ${this.trashObject.id}`;
    }
  },
  async mounted() {
    await this.loadMetadata();
    await this.loadData();
  },
  watch: {
    async entityName(newEntityName, oldEntityName) {
      if (newEntityName !== oldEntityName) {
        await this.loadMetadata();
        await this.loadData();
      }
    }
  },
  methods: {
    async loadMetadata() {
      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get('/entity-metadata/admin-entities');
        const { entities, entityToApiPath } = response.data;
        this.entityToApiPath = entityToApiPath || {};
        this.metadata = entities.find(m => m.name === this.entityName);
        
        if (!this.metadata) {
          throw new Error(`Metadata not found for entity: ${this.entityName}`);
        }
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error carregant metadades: ${error.message}`,
          type: 'is-danger'
        });
      } finally {
        this.isLoading = false;
      }
    },
    async loadData() {
      try {
        this.isLoading = true;
        const apiPath = this.metadata.apiPath || this.entityName;
        const response = await service({ requiresAuth: true }).get(
          `/${apiPath}?_limit=-1&_sort=id`
        );
        this.items = response.data;
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error carregant dades: ${error.message}`,
          type: 'is-danger'
        });
      } finally {
        this.isLoading = false;
      }
    },
    createNew() {
      this.$router.push({ 
        name: 'admin.entity.new', 
        params: { entityName: this.entityName } 
      });
    },
    trashModal(trashObject) {
      this.trashObject = trashObject;
      this.isModalActive = true;
    },
    trashCancel() {
      this.isModalActive = false;
      this.trashObject = null;
    },
    async trashConfirm() {
      try {
        const apiPath = this.metadata.apiPath || this.entityName;
        await service({ requiresAuth: true }).delete(
          `/${apiPath}/${this.trashObject.id}`
        );
        
        this.$buefy.snackbar.open({
          message: 'Eliminat correctament',
          queue: false
        });
        
        this.isModalActive = false;
        this.trashObject = null;
        await this.loadData();
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error eliminant: ${error.message}`,
          type: 'is-danger'
        });
      }
    },
    formatLabel(name) {
      // Convert snake_case or camelCase to Title Case
      return name
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    },
    formatNumber(value) {
      if (value === null || value === undefined) return '';
      return parseFloat(value).toLocaleString('ca-ES');
    },
    formatDate(value) {
      if (!value) return '';
      return moment(value).format('DD/MM/YYYY');
    }
  }
};
</script>
