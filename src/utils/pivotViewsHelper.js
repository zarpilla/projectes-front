/**
 * Utility to help implement pivot views functionality in existing components
 * 
 * Usage:
 * 1. Import this utility
 * 2. Add the mixin and component imports
 * 3. Replace the pivot initialization code
 * 4. Add the pivot views component to template
 */

export const PIVOT_IDENTIFIERS = {
  DEDICATION_EST: 'dedication-est-pivot',
  DEDICATION: 'dedication-pivot',
  ECONOMIC_DETAIL: 'economic-detail-pivot',
  ORDERS: 'orders-pivot',
  TRESORERIA: 'tresoreria-pivot',
  INTERCOOP: 'intercoop-pivot',
  EXPENSES: 'expenses-pivot',
  ESTRATEGIES: 'estrategies-pivot',
  PROJECTES: 'projectes-pivot'
}

/**
 * Template code to add before existing pivot grid div
 */
export const PIVOT_VIEWS_TEMPLATE = `    <!-- Pivot Views Component -->
    <pivot-views
      :pivot-views="pivotViews"
      :selected-view-id="selectedViewId"
      :show-save-modal="showSaveViewModal"
      :view-name="newViewName"
      @apply-view="applyPivotView"
      @apply-default="applyDefaultView"
      @save-view="showSaveView"
      @delete-view="deletePivotView"
      @close-save-modal="showSaveViewModal = false"
      @confirm-save="saveCurrentView"
      @update:viewName="newViewName = $event"
    />
    
`

/**
 * Imports to add to script section
 */
export const REQUIRED_IMPORTS = `import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'`

/**
 * Component registration
 */
export const COMPONENT_REGISTRATION = `  components: { PivotViews },
  mixins: [pivotViewsMixin],`

/**
 * Data property to add
 */
export const DATA_PROPERTY = (identifier) => `      pivotIdentifier: '${identifier}'`

/**
 * Method to add for applying default view
 */
export const DEFAULT_VIEW_METHOD = (defaultConfig) => `    applyDefaultView() {
      if (this.pivotGridInstance) {
        // Reset to default configuration
        const dataSource = this.pivotGridInstance.dataSource
        const defaultConfig = ${defaultConfig}
        
        dataSource.columns(defaultConfig.columns || [])
        dataSource.rows(defaultConfig.rows || [])
        dataSource.measures(defaultConfig.measures || [])
        dataSource.filters([])
        
        this.selectedViewId = null
      }
    },`

/**
 * Replace pivot initialization code
 */
export const PIVOT_INIT_REPLACEMENT = {
  from: `window.jQuery('#project-stats').empty()
        window.jQuery('#project-stats').kendoPivotGrid(configPivot)`,
  to: `this.initializePivotWithViews('#project-stats', configPivot)`
}

/**
 * Instructions for manual implementation
 */
export const IMPLEMENTATION_STEPS = `
Steps to implement pivot views in a component:

1. Add imports to script section:
   ${REQUIRED_IMPORTS}

2. Add to component definition:
   ${COMPONENT_REGISTRATION}

3. Add pivotIdentifier to data():
   ${DATA_PROPERTY('your-pivot-identifier')}

4. Add pivot views component to template before the pivot grid div:
   ${PIVOT_VIEWS_TEMPLATE}

5. Replace pivot initialization code:
   FROM: window.jQuery('#selector').empty()
         window.jQuery('#selector').kendoPivotGrid(config)
   TO:   this.initializePivotWithViews('#selector', config)

6. Add applyDefaultView method:
   ${DEFAULT_VIEW_METHOD('configPivot.dataSource')}
`
