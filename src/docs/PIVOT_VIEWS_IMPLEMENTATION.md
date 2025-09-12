# Pivot Views Implementation Guide

This guide explains how to implement the new pivot views functionality across all pivot grid components.

## Overview

The pivot views functionality allows users to:
- Save custom pivot grid configurations (columns, rows, measures, filters)
- Apply saved views with a single click
- Delete views they no longer need
- Always have access to the default view

## Components Involved

1. **PivotViews.vue** - UI component for managing views
2. **pivotViewsMixin.js** - Mixin with core functionality
3. **pivotViewsHelper.js** - Utility functions and constants

## Implementation Steps

### 1. Update Template

Add the PivotViews component **before** your existing pivot grid div:

```vue
<template>
  <div>
    <!-- Pivot Views Component -->
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
    
    <div id="your-pivot-container"></div>
    <!-- ... rest of your template -->
  </div>
</template>
```

### 2. Update Script Imports

Add these imports to your script section:

```javascript
import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'
```

### 3. Update Component Definition

Add the component and mixin to your export:

```javascript
export default {
  name: 'YourComponentName',
  components: { PivotViews }, // Add this
  mixins: [pivotViewsMixin],   // Add this
  // ... rest of your component
}
```

### 4. Add Pivot Identifier

Add a unique identifier for your pivot to the data section:

```javascript
data() {
  return {
    // ... existing data properties
    pivotIdentifier: 'your-unique-pivot-id', // Add this
  }
}
```

### 5. Update Pivot Initialization

Replace your existing pivot initialization code:

**From:**
```javascript
window.jQuery('#your-container').empty()
window.jQuery('#your-container').kendoPivotGrid(configPivot)
```

**To:**
```javascript
this.initializePivotWithViews('#your-container', configPivot)
```

### 6. Add Default View Method

Add this method to handle the default view:

```javascript
methods: {
  // ... existing methods
  
  applyDefaultView() {
    if (this.pivotGridInstance) {
      // Reset to default configuration
      const dataSource = this.pivotGridInstance.dataSource
      const defaultConfig = configPivot.dataSource // Use your actual config name
      
      dataSource.columns(defaultConfig.columns || [])
      dataSource.rows(defaultConfig.rows || [])
      dataSource.measures(defaultConfig.measures || [])
      dataSource.filters([])
      
      this.selectedViewId = null
    }
  },
}
```

## Pivot Identifiers

Use these predefined identifiers for consistency:

- `dedication-est-pivot` - DedicationEstPivot.vue ✅ (implemented)
- `dedication-pivot` - DedicationPivot.vue ✅ (implemented)  
- `economic-detail-pivot` - EconomicDetailPivot.vue
- `orders-pivot` - OrdersPivot.vue
- `tresoreria-pivot` - TresoreriaTable.vue
- `intercoop-pivot` - IntercoopPivot.vue
- `expenses-pivot` - ExpensesPivot.vue
- `estrategies-pivot` - EstrategiesPivot.vue
- `projectes-pivot` - ProjectesPivot.vue

## Components to Update

The following components need to be updated with pivot views functionality:

1. ✅ **DedicationEstPivot.vue** - DONE
2. ✅ **DedicationPivot.vue** - DONE
3. **EconomicDetailPivot.vue**
4. **OrdersPivot.vue**
5. **TresoreriaTable.vue**
6. **IntercoopPivot.vue**
7. **ExpensesPivot.vue**
8. **EstrategiesPivot.vue**
9. **ProjectesPivot.vue**

## Special Considerations

### Different Container IDs
Some components may use different container IDs (not `#project-stats`). Make sure to use the correct selector in `initializePivotWithViews()`.

### Different Config Objects
Some components may use different config object names. Make sure to reference the correct one in `applyDefaultView()`.

### Custom Data Loading
The mixin automatically loads views on component mount, but if you have complex initialization logic, you may need to call `this.loadPivotViews()` manually.

## Backend Support

The functionality relies on the `pivot-table-views` API endpoint which supports:
- GET `/pivot-table-views?identifier=your-pivot-id` - Load views
- POST `/pivot-table-views` - Create new view
- DELETE `/pivot-table-views/:id` - Delete view

The entity has these fields:
- `identifier` (string) - Unique identifier for the pivot
- `name` (string) - User-friendly name for the view
- `config` (text) - JSON string of the pivot configuration

## Testing

After implementation:
1. Load the component and verify views toolbar appears
2. Make changes to the pivot (move columns, add filters)
3. Click "Guardar vista" and save with a name
4. Verify the view appears in the toolbar
5. Click the view button to verify it applies correctly
6. Test the delete functionality
7. Test the default view button

## Troubleshooting

### Views not loading
- Check browser console for API errors
- Verify `pivotIdentifier` is set correctly
- Ensure user has proper permissions for `pivot-table-views` endpoint

### Views not applying
- Check that `this.pivotGridInstance` is set (should happen automatically with mixin)
- Verify the config JSON is valid
- Check for JavaScript errors in console

### UI issues
- Ensure PivotViews component is imported and registered
- Verify Bulma CSS is available for modal styling
- Check for CSS conflicts
