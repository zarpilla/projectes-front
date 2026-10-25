<template>
  <div class="admin-entity">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <modal-box
      :is-active="isModalActive"
      :trash-object-name="trashObjectName"
      message="S'esborrarà permanentment el registre"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />

    <!-- an entity the admin screens don't list, opened by URL (/administracio/festive):
         it read «Festive», «0 festive», «Crear festive» (issues/181) -->
    <div v-if="notManaged" class="card admin-empty">
      <p>Aquesta taula no es gestiona des d'Administració.</p>
      <p v-if="entityName === 'festive'">
        Els festius es posen al calendari de
        <router-link to="/dedicacio">Hores dedicades</router-link>.
      </p>
    </div>

    <template v-else>
    <div class="admin-entity-head">
      <div>
        <h2>{{ entityDisplayName }}</h2>
        <p class="has-text-muted">{{ countText }}</p>
      </div>
      <b-button type="is-primary" icon-left="plus" @click="createNew">
        Crear {{ entityDisplayNameSingular.toLowerCase() }}
      </b-button>
    </div>

    <div v-if="items.length" class="filter-bar">
      <b-input v-model="search" class="filter-search" icon="magnify" placeholder="Cerca" aria-label="Cerca" />
      <div v-if="statusAttr" class="segmented" role="group" aria-label="Estat">
        <button type="button" :class="{ 'is-on': status === 'on' }" @click="status = 'on'">Actius · {{ activeCount }}</button>
        <button type="button" :class="{ 'is-on': status === 'off' }" @click="status = 'off'">{{ statusOffLabel }} · {{ items.length - activeCount }}</button>
        <button type="button" :class="{ 'is-on': status === 'all' }" @click="status = 'all'">Tots · {{ items.length }}</button>
      </div>
    </div>

    <!-- scrollable: the rates have 13 columns and the last ones were cut off (issues/208) -->
    <div v-if="!isLoading && items.length > 0" class="card has-table">
      <b-table
        :data="shownItems"
        :loading="isLoading"
        :paginated="shownItems.length > 50"
        :per-page="50"
        :hoverable="true"
        :scrollable="true"
        :default-sort="defaultSort"
      >
        <b-table-column
          v-for="(attrConfig, attrName, i) in displayAttributes"
          :key="attrName"
          :label="attrName === statusAttr ? 'Estat' : (attrConfig.label || formatLabel(attrName))"
          :field="attrName"
          sortable
          :numeric="['decimal', 'integer', 'float'].includes(attrConfig.type)"
          v-slot="props"
        >
          <router-link
            v-if="i === 0"
            :to="{ name: 'admin.entity.edit', params: { entityName, id: props.row.id } }"
            class="doc-title"
          >{{ cellText(props.row, attrName, attrConfig) || '—' }}</router-link>
          <span v-else-if="attrName === statusAttr" class="tag" :class="props.row[attrName] ? '' : 'is-success is-light'">
            {{ props.row[attrName] ? statusOffLabel.replace(/s$/, '') : 'Actiu' }}
          </span>
          <span v-else-if="attrConfig.type === 'boolean'">{{ props.row[attrName] ? 'Sí' : 'No' }}</span>
          <span v-else :class="{ 'has-text-muted': !cellText(props.row, attrName, attrConfig) }">{{ cellText(props.row, attrName, attrConfig) || '—' }}</span>
        </b-table-column>

        <b-table-column label="" custom-key="actions" cell-class="is-actions-cell" v-slot="props">
          <div class="row-actions">
            <router-link
              :to="{ name: 'admin.entity.edit', params: { entityName, id: props.row.id } }"
              class="row-action"
              title="Edita"
              aria-label="Edita"
            >
              <b-icon icon="pencil-outline" custom-size="default" />
            </router-link>
            <button class="row-action is-danger" type="button" title="Esborra" aria-label="Esborra" @click.prevent="trashModal(props.row)">
              <b-icon icon="trash-can-outline" custom-size="default" />
            </button>
          </div>
        </b-table-column>
      </b-table>
    </div>

    <div v-else-if="!isLoading" class="card admin-empty">
      <p>No hi ha cap {{ entityDisplayNameSingular.toLowerCase() }} encara.</p>
    </div>
    </template>
  </div>
</template>

<script>
import { normalizeEntity, listQueryOf } from '@/service/adminMetadata';
import service from '@/service/index';
import CardComponent from '@/components/CardComponent.vue';
import ModalBox from '@/components/ModalBox.vue';
import moment from 'moment';
import { formatNumber } from '@/helpers/format-number';

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
      notManaged: false,
      entityToApiPath: {},
      isModalActive: false,
      trashObject: null,
      search: '',
      status: 'all'
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
        // Skip collection relations (one-to-many, many-to-many)
        if (config.collection) continue;
        filtered[name] = config;
      }
      return filtered;
    },
    firstAttr() {
      return Object.keys(this.displayAttributes)[0] || null;
    },
    // the backend may give the first order, e.g. holidays newest first (issues/310)
    defaultSort() {
      return (this.metadata && this.metadata.listSort) || this.firstAttr || 'id';
    },
    // a "switched off" flag (disabled, trashed) gives the Actius / Desactivats filter
    statusAttr() {
      return ['disabled', 'trashed'].find(a => this.displayAttributes[a] && this.displayAttributes[a].type === 'boolean') || null;
    },
    statusOffLabel() {
      return this.statusAttr === 'trashed' ? 'Esborrats' : 'Desactivats';
    },
    activeCount() {
      return this.statusAttr ? this.items.filter(i => !i[this.statusAttr]).length : this.items.length;
    },
    shownItems() {
      const q = this.search.trim().toLowerCase();
      return this.items.filter(item => {
        if (this.statusAttr && this.status === 'on' && item[this.statusAttr]) return false;
        if (this.statusAttr && this.status === 'off' && !item[this.statusAttr]) return false;
        if (!q) return true;
        return Object.entries(this.displayAttributes).some(([name, config]) =>
          String(this.cellText(item, name, config) || '').toLowerCase().includes(q));
      });
    },
    countText() {
      const n = this.items.length;
      const name = n === 1 ? this.entityDisplayNameSingular : this.entityDisplayName;
      let text = `${n} ${name.toLowerCase()}`;
      if (this.statusAttr) text += ` · ${this.activeCount} actius`;
      return text;
    },
    trashObjectName() {
      if (!this.trashObject) return null;
      // Try to find a name field
      if (this.trashObject.name || this.trashObject.username) return this.trashObject.name || this.trashObject.username;
      // a holiday has no name: its date (issues/310)
      if (this.trashObject.date) return this.formatDate(this.trashObject.date);
      return `ID ${this.trashObject.id}`;
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
        const response = await service({ requiresAuth: true, cached: true }).get('/entity-metadata/admin-entities');
        const { entities, entityToApiPath } = response.data;
        this.entityToApiPath = entityToApiPath || {};
        // Strapi 5 relations read as the Strapi 3 model / collection (service/adminMetadata)
        this.metadata = normalizeEntity(entities.find(m => m.name === this.entityName));
        this.notManaged = !this.metadata;
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
      if (!this.metadata) return;
      try {
        this.isLoading = true;
        const apiPath = this.metadata.apiPath || this.entityName;
        const response = await service({ requiresAuth: true }).get(
          `/${apiPath}?_limit=-1&_sort=id${listQueryOf(this.metadata)}`
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
        // the backend says why (a town in use can't be deleted, issues/159)
        const reason = (error.response && error.response.data && error.response.data.message) || error.message;
        this.$buefy.toast.open({
          message: `Error eliminant: ${reason}`,
          type: 'is-danger',
          duration: 6000
        });
      }
    },
    cellText(row, name, config) {
      const value = row[name];
      if (value === null || value === undefined || value === '') return '';
      // a year is not a quantity: «2019», not «2.019» (issues/103)
      if (name === 'year' && typeof value !== 'object') return String(value);
      // route rates are prices: «11,30», not «11,3» (issues/208)
      if (config.type === 'decimal' && this.entityName === 'route-rate') return formatNumber(value, 2, 2);
      if (['decimal', 'integer', 'float'].includes(config.type)) return this.formatNumber(value);
      if (config.type === 'date' || config.type === 'datetime') return this.formatDate(value);
      if (config.enumLabels && config.enumLabels[value]) return config.enumLabels[value];
      if (config.model || typeof value === 'object') {
        return value.name || value.username || value.year || value.id || '';
      }
      return String(value);
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
<style scoped>
.admin-entity-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
.admin-entity-head h2 {
  font-size: 1.25rem;
  font-weight: 800;
}
.admin-entity-head p {
  font-size: .875rem;
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: .25rem;
}
.row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--a-fg-2);
  cursor: pointer;
}
.row-action:hover {
  background: var(--a-chip);
  color: var(--a-fg);
}
.row-action.is-danger:hover {
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
}
.admin-empty {
  padding: 2rem;
  text-align: center;
  color: var(--a-muted);
}
</style>
