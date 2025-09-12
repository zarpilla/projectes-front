import service from '@/service/index'

export default {
  data() {
    return {
      pivotViews: [],
      showSaveViewModal: false,
      newViewName: '',
      selectedViewId: null,
      pivotGridInstance: null
    }
  },
  
  async mounted() {
    await this.loadPivotViews()
  },

  methods: {
    /**
     * Load all saved views for the current pivot identifier
     */
    async loadPivotViews() {
      if (!this.pivotIdentifier) {
        console.warn('pivotIdentifier not defined in component')
        return
      }
      
      try {
        const response = await service({ requiresAuth: true }).get(`pivot-table-views?identifier=${this.pivotIdentifier}`)
        this.pivotViews = response.data
      } catch (error) {
        console.error('Error loading pivot views:', error)
      }
    },

    /**
     * Initialize Kendo Pivot Grid with view management
     * @param {string} selector - jQuery selector for the pivot grid container
     * @param {Object} config - Kendo Pivot Grid configuration
     */
    initializePivotWithViews(selector, config) {
      // Clear existing grid
      window.jQuery(selector).empty()
      
      // Initialize the pivot grid
      window.jQuery(selector).kendoPivotGrid(config)
      
      // Store reference to the grid instance
      this.pivotGridInstance = window.jQuery(selector).data('kendoPivotGrid')
    },

    /**
     * Get current pivot grid configuration
     */
    getCurrentPivotConfig() {
      if (!this.pivotGridInstance) {
        return null
      }

      const dataSource = this.pivotGridInstance.dataSource
      
      try {
        return {
          columns: dataSource.columns(),
          rows: dataSource.rows(),
          measures: dataSource.measures()
          // Note: Kendo Pivot Grid doesn't have filters() method like regular DataSource
          // filters: dataSource.filters()
        }
      } catch (error) {
        console.error('Error getting pivot config:', error)
        return {
          columns: [],
          rows: [],
          measures: []
        }
      }
    },

    /**
     * Apply a saved view configuration to the pivot grid
     * @param {Object} view - The saved view object
     */
    async applyPivotView(view) {
      if (!this.pivotGridInstance || !view.config) {
        return
      }

      try {
        const config = JSON.parse(view.config)
        const dataSource = this.pivotGridInstance.dataSource
        
        // Apply the configuration
        dataSource.columns(config.columns || [])
        dataSource.rows(config.rows || [])
        dataSource.measures(config.measures || [])
        // Note: Kendo Pivot Grid doesn't support filters() method
        // if (config.filters && dataSource.filters) {
        //   dataSource.filters(config.filters || [])
        // }
        
        this.selectedViewId = view.id
      } catch (error) {
        console.error('Error applying pivot view:', error)
        this.$toast.open({
          message: 'Error aplicant la vista',
          type: 'is-danger'
        })
      }
    },

    /**
     * Show the save view modal
     */
    showSaveView() {
      this.newViewName = ''
      this.showSaveViewModal = true
    },

    /**
     * Save current pivot configuration as a new view
     */
    async saveCurrentView() {
      if (!this.newViewName.trim()) {
        this.$toast.open({
          message: 'Has d\'introduir un nom per la vista',
          type: 'is-warning'
        })
        return
      }

      const config = this.getCurrentPivotConfig()
      if (!config) {
        this.$toast.open({
          message: 'No s\'ha pogut obtenir la configuració actual',
          type: 'is-danger'
        })
        return
      }

      try {
        const viewData = {
          identifier: this.pivotIdentifier,
          name: this.newViewName.trim(),
          config: JSON.stringify(config)
        }

        const response = await service({ requiresAuth: true }).post('pivot-table-views', viewData)
        
        // Set the newly created view as selected
        this.selectedViewId = response.data.id
        
        await this.loadPivotViews()
        this.showSaveViewModal = false
        this.newViewName = ''
        
        this.$toast.open({
          message: 'Vista guardada correctament',
          type: 'is-success'
        })
      } catch (error) {
        console.error('Error saving pivot view:', error)
        this.$toast.open({
          message: 'Error guardant la vista',
          type: 'is-danger'
        })
      }
    },

    /**
     * Delete a saved view
     * @param {Object} view - The view to delete
     */
    async deletePivotView(view) {
      if (!confirm(`Estàs segur que vols eliminar la vista "${view.name}"?`)) {
        return
      }

      try {
        await service({ requiresAuth: true }).delete(`pivot-table-views/${view.id}`)
        await this.loadPivotViews()
        
        if (this.selectedViewId === view.id) {
          this.selectedViewId = null
        }
        
        this.$toast.open({
          message: 'Vista eliminada correctament',
          type: 'is-success'
        })
      } catch (error) {
        console.error('Error deleting pivot view:', error)
        this.$toast.open({
          message: 'Error eliminant la vista',
          type: 'is-danger'
        })
      }
    }
  }
}
