<template>
  <div class="pivot-views-container">
    <!-- Views Selection -->
    <div class="pivot-views-toolbar mb-4" v-if="pivotViews.length > 0 || true">
      <div class="buttons has-addons">
        <button 
          class="button is-small"
          :class="{ 'is-primary': selectedViewId === null }"
          @click="selectedViewId = null; $emit('apply-default')"
          title="Vista per defecte"
        >
          <span>Per defecte</span>
        </button>
        
        <button 
          v-for="view in pivotViews" 
          :key="view.id"
          class="button is-small"
          :class="{ 'is-primary': selectedViewId === view.id }"
          @click="$emit('apply-view', view)"
          :title="view.name"
        >
          <span>{{ view.name }}</span>
          <span class="icon is-small ml-1" @click.stop="$emit('delete-view', view)">
            <b-icon icon="trash-can" size="is-small" aria-label="Eliminar vista"></b-icon>
          </span>
        </button>

        <button 
        class="button is-small is-warning ml-2" 
        @click="$emit('save-view')"
        title="Guardar vista actual"
      >
        <span>Guardar vista</span>
      </button>
      </div>
      
      
    </div>

    <!-- Save View Modal -->
    <div class="modal" :class="{ 'is-active': showSaveModal }">
      <div class="modal-background" @click="$emit('close-save-modal')"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Guardar nova vista</p>
          <button class="delete" @click="$emit('close-save-modal')"></button>
        </header>
        <section class="modal-card-body">
          <div class="field">
            <label class="label">Nom de la vista</label>
            <div class="control">
              <input 
                class="input" 
                type="text" 
                placeholder="Introdueix un nom descriptiu per la vista"
                :value="viewName"
                @input="$emit('update:viewName', $event.target.value)"
                @keyup.enter="$emit('confirm-save')"
              >
            </div>
          </div>
        </section>
        <footer class="modal-card-foot">
          <button class="button is-success" @click="$emit('confirm-save')" :disabled="!viewName.trim()">
            Guardar
          </button>
          <button class="button" @click="$emit('close-save-modal')">Cancel·lar</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PivotViews',
  props: {
    pivotViews: {
      type: Array,
      default: () => []
    },
    selectedViewId: {
      type: Number,
      default: null
    },
    showSaveModal: {
      type: Boolean,
      default: false
    },
    viewName: {
      type: String,
      default: ''
    }
  },
  emits: ['apply-view', 'apply-default', 'save-view', 'delete-view', 'close-save-modal', 'confirm-save', 'update:viewName']
}
</script>

<style scoped>
.pivot-views-container {
  margin-bottom: 1rem;
}

.pivot-views-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.buttons.has-addons .button:not(:first-child):not(:last-child) {
  border-radius: 0;
}

.button .icon.is-small.ml-1 {
  margin-left: 0.25rem !important;
}

.button .icon.is-small.ml-1:hover {
  background-color: rgba(255, 56, 96, 0.1);
  border-radius: 50%;
}
</style>
