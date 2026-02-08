<template>
  <div class="financial-diff-wrapper">
    <div 
      class="readonly subphase-detail-input"
      :class="tooltipClass"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
    >
      <slot></slot>
    </div>
    
    <transition name="fade">
      <div 
        v-if="showTooltip && column > 1" 
        class="financial-diff-tooltip"
        :class="tooltipPositionClass"
      >
        <div class="tooltip-content">
          <template v-if="column === 2">
            <!-- Second column: show difference with first -->
            <div class="diff-item">
              <span class="diff-label">Dif. vs Original:</span>
              <span class="diff-value" :class="getDiffClass(diffVsOriginal)">
                <!-- <span v-if="diffVsOriginal > 0">+</span> -->
                <money-format
                  v-if="showAsCurrency"
                  :value="diffVsOriginal"
                  :locale="'es'"
                  :currency-code="currencyCode"
                  :subunits-value="false"
                  :hide-subunits="false"
                />
                <span v-else>
                  {{ diffVsOriginal > 0 ? '+' : '' }}{{ diffVsOriginal.toFixed(2) }}{{ unit }}
                </span>
              </span>
            </div>
          </template>
          
          <template v-else-if="column === 3">
            <!-- Third column: show both differences -->
            <div class="diff-item">
              <span class="diff-label">Dif. vs Previst:</span>
              <span class="diff-value" :class="getDiffClass(diffVsEstimated)">
                <!-- <span v-if="diffVsEstimated > 0">+</span> -->
                <money-format
                  v-if="showAsCurrency"
                  :value="diffVsEstimated"
                  :locale="'es'"
                  :currency-code="currencyCode"
                  :subunits-value="false"
                  :hide-subunits="false"
                />
                <span v-else>
                  {{ diffVsEstimated > 0 ? '+' : '' }}{{ diffVsEstimated.toFixed(2) }}{{ unit }}
                </span>
              </span>
            </div>
            <div class="diff-item">
              <span class="diff-label">Dif. vs Original:</span>
              <span class="diff-value" :class="getDiffClass(diffVsOriginal)">
                <!-- <span v-if="diffVsOriginal > 0">+</span> -->
                <money-format
                  v-if="showAsCurrency"
                  :value="diffVsOriginal"
                  :locale="'es'"
                  :currency-code="currencyCode"
                  :subunits-value="false"
                  :hide-subunits="false"
                />
                <span v-else>
                  {{ diffVsOriginal > 0 ? '+' : '' }}{{ diffVsOriginal.toFixed(2) }}{{ unit }}
                </span>
              </span>
            </div>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import MoneyFormat from '@/components/MoneyFormat.vue';

export default {
  name: 'FinancialDiffTooltip',
  components: {
    MoneyFormat
  },
  props: {
    // Column number: 1 (original), 2 (estimated), 3 (executed)
    column: {
      type: Number,
      required: true,
      validator: (value) => [1, 2, 3].includes(value)
    },
    // Value for the first column (original)
    originalValue: {
      type: Number,
      default: 0
    },
    // Value for the second column (estimated)
    estimatedValue: {
      type: Number,
      default: 0
    },
    // Value for the third column (executed)
    executedValue: {
      type: Number,
      default: 0
    },
    // Currency code (default EUR)
    currencyCode: {
      type: String,
      default: 'EUR'
    },
    // Position of the tooltip (top, bottom, left, right)
    tooltipPosition: {
      type: String,
      default: 'bottom',
      validator: (value) => ['top', 'bottom', 'left', 'right'].includes(value)
    },
    // If true, positive differences are considered "good" (green)
    positiveIsGood: {
      type: Boolean,
      default: true
    },
    // If false, shows as plain number with unit suffix instead of currency
    showAsCurrency: {
      type: Boolean,
      default: true
    },
    // Unit suffix for non-currency values (e.g., 'h', 'kg', etc.)
    unit: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      showTooltip: false
    };
  },
  computed: {
    diffVsOriginal() {
      if (this.column === 2) {
        return this.estimatedValue - this.originalValue;
      } else if (this.column === 3) {
        return this.executedValue - this.originalValue;
      }
      return 0;
    },
    diffVsEstimated() {
      if (this.column === 3) {
        return this.executedValue - this.estimatedValue;
      }
      return 0;
    },
    tooltipClass() {
      return this.column > 1 ? 'has-tooltip' : '';
    },
    tooltipPositionClass() {
      return `tooltip-${this.tooltipPosition}`;
    }
  },
  methods: {
    getDiffClass(diff) {
      if (diff === 0) return 'diff-neutral';
      if (this.positiveIsGood) {
        return diff > 0 ? 'diff-positive' : 'diff-negative';
      } else {
        return diff > 0 ? 'diff-negative' : 'diff-positive';
      }
    }
  }
};
</script>

<style scoped lang="scss">
.financial-diff-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.has-tooltip {
  cursor: help;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #f5f5f5;
  }
}

.financial-diff-tooltip {
  position: absolute;
  z-index: 1000;
  background: #363636;
  color: white;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
  min-width: 220px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  white-space: nowrap;
  
  &.tooltip-top {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    
    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: #363636;
    }
  }
  
  &.tooltip-bottom {
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-bottom-color: #363636;
    }
  }
  
  &.tooltip-left {
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-right: 8px;
    
    &::after {
      content: '';
      position: absolute;
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 6px solid transparent;
      border-left-color: #363636;
    }
  }
  
  &.tooltip-right {
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 8px;
    
    &::after {
      content: '';
      position: absolute;
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 6px solid transparent;
      border-right-color: #363636;
    }
  }
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diff-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.diff-label {
  font-weight: 500;
  opacity: 0.9;
}

.diff-value {
  font-weight: 600;
  font-family: monospace;
  
  &.diff-positive {
    color: #48c774;
  }
  
  &.diff-negative {
    color: #f14668;
  }
  
  &.diff-neutral {
    color: #b5b5b5;
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
