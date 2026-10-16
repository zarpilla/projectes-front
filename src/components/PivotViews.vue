<template>
  <div class="pivot-views-container">
    <!-- Views of the pivot table and the switch for its field settings (redesign A) -->
    <div class="pivot-views-toolbar">
      <span class="toggle-label">Vista</span>
      <div class="segmented" role="group" aria-label="Vistes desades">
        <button
          type="button"
          :class="{ 'is-on': selectedViewId === null }"
          title="Vista per defecte"
          @click="$emit('apply-default')"
        >
          Per defecte
        </button>
        <button
          v-for="view in pivotViews"
          :key="view.id"
          type="button"
          class="saved-view"
          :class="{ 'is-on': selectedViewId === view.id }"
          :title="view.name"
          @click="$emit('apply-view', view)"
        >
          {{ view.name }}
          <span
            class="view-delete"
            role="button"
            :aria-label="'Elimina la vista ' + view.name"
            title="Elimina la vista"
            @click.stop="$emit('delete-view', view)"
          >
            <b-icon icon="close" custom-size="default" />
          </span>
        </button>
      </div>
      <button type="button" class="button is-small" title="Desa la configuració actual com a vista" @click="$emit('save-view')">
        Desa la vista
      </button>
      <button
        type="button"
        class="button is-small config-toggle"
        :class="{ 'is-on': configOpen }"
        :aria-pressed="configOpen ? 'true' : 'false'"
        @click="toggleConfig"
      >
        <b-icon icon="tune" custom-size="default" />
        <span>{{ configOpen ? "Amaga la configuració" : "Configura la taula dinàmica" }}</span>
      </button>
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
  emits: ['apply-view', 'apply-default', 'save-view', 'delete-view', 'close-save-modal', 'confirm-save', 'update:viewName'],
  data () {
    return { configOpen: readConfigOpen() }
  },
  mounted () {
    applyConfigOpen(this.configOpen)
  },
  methods: {
    // the field chips (measures, rows, columns) of every pivot on the page are
    // shown only while configuring; remembered in this browser
    toggleConfig () {
      this.configOpen = !this.configOpen
      applyConfigOpen(this.configOpen)
      // Kendo measured its layout with the chips shown or hidden: draw it again
      this.$nextTick(refreshPivots)
      try {
        localStorage.setItem(CONFIG_KEY, this.configOpen ? '1' : '0')
      } catch (e) {
        // private mode: just not remembered
      }
    }
  }
}

const CONFIG_KEY = 'pivotConfigOpen'
function readConfigOpen () {
  try {
    return localStorage.getItem(CONFIG_KEY) === '1'
  } catch (e) {
    return false
  }
}
function refreshPivots () {
  const $ = window.jQuery
  if (!$ || !window.kendo) return
  $('.k-pivot').each((i, el) => {
    const grid = $(el).data('kendoPivotGrid')
    if (grid && grid.refresh) grid.refresh()
    else window.kendo.resize(el)
  })
}
function applyConfigOpen (open) {
  document.documentElement.classList.toggle('pivot-config-open', open)
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
  gap: .5rem .75rem;
}
.saved-view {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
}
.view-delete {
  display: inline-flex;
  border-radius: 999px;
  color: var(--a-muted);
}
.view-delete:hover {
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
}
.config-toggle {
  margin-left: auto;
}
.config-toggle.is-on {
  background: var(--a-accent-soft);
  border-color: var(--a-accent);
  color: var(--a-accent-hover);
}
</style>
