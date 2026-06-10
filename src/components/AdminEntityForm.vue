<template>
  <div>
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <section class="section is-main-section">
      <card-component :title="formTitle">
        <form @submit.prevent="submit" v-if="metadata && metadata.attributes">
          <!-- Dynamic form fields based on attributes -->
          <b-field
            v-for="(attrConfig, attrName) in metadata.attributes"
            :key="attrName"
            :label="formatLabel(attrName) + (attrConfig.required ? ' *' : '')"
            horizontal
            :type="{ 'is-danger': errors[attrName] }"
            :message="errors[attrName]"
          >
            <!-- String input -->
            <b-input
              v-if="attrConfig.type === 'string' && !attrConfig.enum"
              v-model="form[attrName]"
              :required="attrConfig.required"
              :maxlength="attrConfig.maxLength"
            />

            <!-- Text area -->
            <b-input
              v-else-if="attrConfig.type === 'text'"
              v-model="form[attrName]"
              type="textarea"
              :required="attrConfig.required"
              :maxlength="attrConfig.maxLength"
            />

            <!-- Rich text (using textarea) -->
            <b-input
              v-else-if="attrConfig.type === 'richtext'"
              v-model="form[attrName]"
              type="textarea"
              :required="attrConfig.required"
              rows="10"
            />

            <!-- Enumeration select -->
            <b-select
              v-else-if="attrConfig.type === 'enumeration'"
              v-model="form[attrName]"
              :required="attrConfig.required"
            >
              <option :value="null">Selecciona...</option>
              <option
                v-for="option in attrConfig.enum"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </b-select>

            <!-- Boolean switch -->
            <b-switch
              v-else-if="attrConfig.type === 'boolean'"
              v-model="form[attrName]"
            />

            <!-- Integer input -->
            <b-input
              v-else-if="attrConfig.type === 'integer'"
              v-model.number="form[attrName]"
              type="number"
              step="1"
              :required="attrConfig.required"
              :min="attrConfig.min"
              :max="attrConfig.max"
            />

            <!-- Decimal input -->
            <b-input
              v-else-if="attrConfig.type === 'decimal' || attrConfig.type === 'float'"
              v-model.number="form[attrName]"
              type="number"
              step="0.01"
              :required="attrConfig.required"
              :min="attrConfig.min"
              :max="attrConfig.max"
            />

            <!-- Date picker -->
            <b-datepicker
              v-else-if="attrConfig.type === 'date'"
              v-model="form[attrName]"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              :required="attrConfig.required"
            />

            <!-- Datetime picker -->
            <b-datetimepicker
              v-else-if="attrConfig.type === 'datetime'"
              v-model="form[attrName]"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              :required="attrConfig.required"
            />

            <!-- Relation select -->
            <b-select
              v-else-if="attrConfig.model"
              v-model="form[attrName]"
              :key="`${attrName}-${relationOptions[attrName] ? relationOptions[attrName].length : 0}`"
              :loading="loadingRelations[attrName]"
              :required="attrConfig.required"
            >
              <option :value="null">Selecciona...</option>
              <option
                v-for="item in relationOptions[attrName]"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name || item.username || item.year || `ID ${item.id}` }}
              </option>
            </b-select>

            <!-- Fallback: string input -->
            <b-input
              v-else
              v-model="form[attrName]"
              :required="attrConfig.required"
            />
          </b-field>

          <hr />
          
          <b-field horizontal>
            <b-field grouped>
              <div class="control">
                <b-button
                  type="is-primary"
                  native-type="submit"
                  :loading="submitting"
                >
                  Guardar
                </b-button>
              </div>
              <div class="control">
                <b-button
                  type="is-light"
                  @click="cancel"
                >
                  Cancel·lar
                </b-button>
              </div>
            </b-field>
          </b-field>
        </form>
      </card-component>
    </section>
  </div>
</template>

<script>
import service from '@/service/index';
import CardComponent from '@/components/CardComponent';

export default {
  name: 'AdminEntityForm',
  components: {
    CardComponent
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
      isLoading: false,
      submitting: false,
      metadata: null,
      entityToApiPath: {},
      form: {},
      errors: {},
      relationOptions: {},
      loadingRelations: {}
    };
  },
  computed: {
    isEdit() {
      return this.id !== null && this.id !== undefined;
    },
    formTitle() {
      const displayName = (this.metadata && this.metadata.displayNameSingular) || 
                         (this.metadata && this.metadata.displayName) || 
                         this.entityName;
      return this.isEdit ? `Editar ${displayName}` : `Crear ${displayName}`;
    }
  },
  async mounted() {
    await this.loadMetadata();
    await this.loadRelationOptions(); // Load options first
    if (this.isEdit) {
      await this.loadData(); // Then load data so it can match with options
    } else {
      this.initializeForm();
    }
  },
  watch: {
    async entityName(newEntityName, oldEntityName) {
      if (newEntityName !== oldEntityName) {
        await this.loadMetadata();
        await this.loadRelationOptions(); // Load options first
        if (this.isEdit) {
          await this.loadData(); // Then load data
        } else {
          this.initializeForm();
        }
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
          `/${apiPath}/${this.id}`
        );
        
        // Initialize form with data
        const formData = { ...response.data };
        
        // Convert relation objects to IDs
        if (this.metadata && this.metadata.attributes) {
          for (const [attrName, attrConfig] of Object.entries(this.metadata.attributes)) {
            if (attrConfig.model && formData[attrName]) {
              // If it's an object, extract the ID
              if (typeof formData[attrName] === 'object' && formData[attrName] !== null) {
                formData[attrName] = formData[attrName].id;
              }
            }
          }
        }
        
        // Set the form data reactively
        this.form = formData;
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error carregant dades: ${error.message}`,
          type: 'is-danger'
        });
      } finally {
        this.isLoading = false;
      }
    },
    initializeForm() {
      this.form = {};
      if (this.metadata && this.metadata.attributes) {
        for (const [attrName, attrConfig] of Object.entries(this.metadata.attributes)) {
          // Set default values
          if (attrConfig.default !== undefined) {
            this.form[attrName] = attrConfig.default;
          } else if (attrConfig.type === 'boolean') {
            this.form[attrName] = false;
          } else {
            this.form[attrName] = null;
          }
        }
      }
    },
    async loadRelationOptions() {
      if (!this.metadata || !this.metadata.attributes) {
        return;
      }
      
      // Reset relation options
      this.relationOptions = {};
      this.loadingRelations = {};
      
      for (const [attrName, attrConfig] of Object.entries(this.metadata.attributes)) {
        if (attrConfig.model) {
          try {
            this.$set(this.loadingRelations, attrName, true);
            
            // Handle plugin relations (e.g., users-permissions)
            let apiPath;
            if (attrConfig.plugin === 'users-permissions') {
              // Special case for users-permissions plugin
              apiPath = attrConfig.model === 'user' ? 'users' : attrConfig.model;
            } else {
              // Use entityToApiPath mapping to get correct API endpoint
              apiPath = this.entityToApiPath[attrConfig.model] || attrConfig.model;
            }
            
            // Determine sort field based on the model
            let sortField = 'name:ASC';
            if (attrConfig.model === 'user') {
              sortField = 'username:ASC';
            } else if (attrConfig.model === 'year') {
              sortField = 'year:DESC';
            }
            
            const response = await service({ requiresAuth: true }).get(
              `/${apiPath}?_limit=-1&_sort=${sortField}`
            );
            
            this.$set(this.relationOptions, attrName, response.data);
          } catch (error) {
            console.error(`Error loading relation options for ${attrName} (model: ${attrConfig.model}):`, error);
            this.$buefy.toast.open({
              message: `Error carregant opcions per ${attrName}: ${error.message}`,
              type: 'is-warning',
              duration: 3000
            });
            // Set empty array so the select still renders
            this.$set(this.relationOptions, attrName, []);
          } finally {
            this.$set(this.loadingRelations, attrName, false);
          }
        }
      }
    },
    async submit() {
      try {
        this.submitting = true;
        this.errors = {};
        
        // Prepare data
        const data = { ...this.form };
        
        // Clean up empty values
        for (const key in data) {
          if (data[key] === '' || data[key] === null || data[key] === undefined) {
            delete data[key];
          }
        }
        
        const apiPath = this.metadata.apiPath || this.entityName;
        
        if (this.isEdit) {
          await service({ requiresAuth: true }).put(
            `/${apiPath}/${this.id}`,
            data
          );
        } else {
          await service({ requiresAuth: true }).post(
            `/${apiPath}`,
            data
          );
        }
        
        this.$buefy.snackbar.open({
          message: 'Guardat correctament',
          queue: false
        });
        
        // Navigate back to list
        this.$router.push({ 
          name: 'admin.entity.list', 
          params: { entityName: this.entityName } 
        });
      } catch (error) {
        // Handle validation errors
        if (error.response?.data?.message) {
          const messages = Array.isArray(error.response.data.message)
            ? error.response.data.message
            : [error.response.data.message];
          
          messages.forEach(msg => {
            if (msg.messages) {
              msg.messages.forEach(m => {
                if (m.id && m.id.includes('.')) {
                  const field = m.id.split('.').pop();
                  this.errors[field] = m.message;
                }
              });
            }
          });
        }
        
        this.$buefy.toast.open({
          message: `Error guardant: ${(error.response && error.response.data && error.response.data.message) || error.message}`,
          type: 'is-danger',
          duration: 5000
        });
      } finally {
        this.submitting = false;
      }
    },
    cancel() {
      this.$router.push({ 
        name: 'admin.entity.list', 
        params: { entityName: this.entityName } 
      });
    },
    formatLabel(name) {
      return name
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    }
  }
};
</script>
