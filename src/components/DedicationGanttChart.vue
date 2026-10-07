<template>
  <div>
    <div class="dedication-table-container">
      <div class="table-wrapper">
        <table class="dedication-table">
          <thead>
            <tr>
              <th class="sticky-col person-col">Persona</th>
              <th v-for="period in periods" :key="period.key" class="period-col">
                {{ period.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="leader in visibleLeaders" :key="leader.id">
              <td class="sticky-col person-col">
                <strong>{{ leader.username }}</strong>
              </td>
              <td
                v-for="period in periods"
                :key="period.key"
                :class="cell(leader.id, period.key).cssClass"
                class="period-cell"
                @mouseenter="showTooltip($event, cell(leader.id, period.key))"
                @mouseleave="scheduleHide"
                @click="pinTooltip($event, cell(leader.id, period.key))"
              >
                <div class="cell-content">
                  <div class="hours">{{ cell(leader.id, period.key).hours }}h</div>
                  <div class="percentage">{{ cell(leader.id, period.key).percentage }}%</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tooltip. Content is a dedicated Vue component (DedicationTooltip);
         only this child re-renders when the active cell or grouping changes,
         the table rows above never re-render.
         Hoverable so the user can click group headers to collapse/expand;
         click a cell to PIN it (stops following the mouse), click outside to
         release the pin. -->
    <div
      ref="tooltip"
      class="custom-tooltip"
      :class="{ 'is-pinned': pinned }"
      v-show="activeCell"
      @mouseenter="cancelHide"
      @mouseleave="scheduleHide"
      @click="onTooltipClick"
    >
      <dedication-tooltip
        v-if="activeCell"
        :cell="activeCell"
        :grouping="grouping"
      />
    </div>

    <div class="help mt-4">
      <b-icon icon="circle" class="has-text-warning" custom-size="default" />
      <b>Ocupada menys del 85%</b><br />
      <b-icon icon="circle" class="has-text-blue" custom-size="default" />
      <b>Ocupada entre el 85 i el 95%</b><br />
      <b-icon icon="circle" class="has-text-success" custom-size="default" />
      <b>Ocupada entre el 95 i el 105%</b><br />
      <b-icon icon="circle" class="has-text-danger" custom-size="default" />
      <b>Ocupada més del 105%</b><br />
    </div>
  </div>
</template>

<script>
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import DedicationTooltip from "@/components/DedicationTooltip.vue";

// Default cell used when a leader has no data for a period.
const EMPTY_CELL = Object.freeze({
  hours: "0.00",
  percentage: "0",
  cssClass: "dedication-empty",
  tooltip: "Sense dedicació",
});

export default {
  name: "DedicationChartGannt",
  components: { DedicationTooltip },
  props: {
    leaders: Array,
    periods: Array,
    cells: Object,
    view: String,
    // How to group the per-project breakdown in the tooltip:
    //   "project"     -> flat project rows (default)
    //   "type"        -> rows grouped by project_type, collapsible
    //   "likelihood"  -> rows grouped by project_likelihood, collapsible
    grouping: {
      type: String,
      default: "project",
      validator: (v) => ["project", "type", "likelihood"].includes(v),
    },
  },
  data() {
    return {
      // The cell currently shown in the tooltip (drives the child component).
      // Only this field + the tooltip element's style change on hover; the
      // table rows above never re-render because they don't depend on it.
      activeCell: null,
      // When true, the tooltip is locked to its cell and no longer follows
      // the mouse or hides on mouseleave. Click outside to release.
      pinned: false,
    };
  },
  computed: {
    ...mapState(useMainStore, ["userName"]),
    ...mapState(useMainStore, ["me"]),

    visibleLeaders() {
      return this.leaders ? this.leaders.filter((l) => !l.hidden) : [];
    },
  },
  mounted() {
    // Document-level pointer handler used to release a pinned tooltip when the
    // user clicks anywhere outside the tooltip (and outside a cell).
    this._docClickHandler = (e) => this.onDocumentClick(e);
    // Most recent anchor rect (the cell the tooltip is attached to).
    this._anchor = null;
  },
  beforeUnmount() {
    clearTimeout(this._hideTimer);
    document.removeEventListener("mousedown", this._docClickHandler, true);
  },
  methods: {
    // O(1) lookup into the precomputed cells map shipped by the backend
    // (projects/dedications or projects/real-dedications). Falls back to an
    // empty cell if missing.
    cell(leaderId, periodKey) {
      const row = this.cells ? this.cells[leaderId] : null;
      const c = row ? row[periodKey] : null;
      return c || EMPTY_CELL;
    },

    // --- Tooltip visibility ------------------------------------------------
    // Two modes:
    //   - default: hover-follow — entering a cell shows the tooltip anchored
    //     to that cell; leaving hides it (with a small grace period).
    //   - pinned:  clicking a cell locks the tooltip to it so it no longer
    //     follows the mouse or auto-hides (handy for reading the grouped
    //     breakdown and clicking group headers). Clicking outside the tooltip
    //     releases the pin and returns to hover-follow.

    // A cell is worth showing if it has a breakdown or legacy tooltip text.
    _hasContent(cellObj) {
      if (!cellObj) return false;
      if (Array.isArray(cellObj.breakdown) && cellObj.breakdown.length) return true;
      return cellObj.tooltip && cellObj.tooltip !== "Sense dedicació";
    },

    showTooltip(event, cellObj) {
      // While pinned, the tooltip is locked to a cell: hover has no effect.
      if (this.pinned) return;
      if (!this._hasContent(cellObj)) return;

      this.cancelHide();

      // Anchor the tooltip to the hovered CELL (not the cursor), so it stays
      // put while the user moves the mouse inside it to click group headers.
      const target = event.target.closest(".period-cell");
      this._anchor = target ? target.getBoundingClientRect() : null;

      this.activeCell = cellObj;
      // Position after the DOM updates (so offsetWidth/Height reflect the new
      // content height).
      this.$nextTick(() => this.positionTooltip());
    },

    // Pin the tooltip to the clicked cell. Uses a capture-phase document
    // listener so the very next pointer-down outside the tooltip/cell area
    // releases it.
    pinTooltip(event, cellObj) {
      if (!this._hasContent(cellObj)) return;

      // Re-anchor to the clicked cell.
      const target = event.target.closest(".period-cell");
      this._anchor = target ? target.getBoundingClientRect() : null;

      this.activeCell = cellObj;

      this.pinned = true;
      this.cancelHide();
      document.addEventListener("mousedown", this._docClickHandler, true);

      this.$nextTick(() => this.positionTooltip());
    },

    // Internal clicks (group header toggles, scroll) must not reach the
    // document handler, otherwise the pin would release immediately.
    onTooltipClick(event) {
      event.stopPropagation();
    },

    // Release the pin when the user clicks outside the tooltip. Clicks on a
    // cell are handled by pinTooltip (which re-anchors), so they are excluded
    // here too — clicking another cell pins to that cell instead of unpinning.
    onDocumentClick(event) {
      const el = this.$refs.tooltip;
      if (el && el.contains(event.target)) return;
      if (event.target.closest && event.target.closest(".period-cell")) return;
      this.unpin();
    },

    unpin() {
      this.pinned = false;
      document.removeEventListener("mousedown", this._docClickHandler, true);
      // Return to hover-follow: if the cursor is no longer over the tooltip,
      // hide; the next mouseenter will show it again.
      if (!this._isHovered()) {
        this.activeCell = null;
      }
    },

    // True if the cursor is currently over the tooltip.
    _isHovered() {
      const el = this.$refs.tooltip;
      return !!(el && el.matches(":hover"));
    },

    scheduleHide() {
      // Pinned tooltip never auto-hides.
      if (this.pinned) return;
      clearTimeout(this._hideTimer);
      // Grace period so the cursor can cross from the cell into the tooltip
      // (and out of a collapsed header) without losing it.
      this._hideTimer = setTimeout(() => this.hideTooltip(), 250);
    },

    cancelHide() {
      clearTimeout(this._hideTimer);
    },

    hideTooltip() {
      if (this.pinned) return;
      this.activeCell = null;
    },

    positionTooltip() {
      const el = this.$refs.tooltip;
      if (!el || !this.activeCell) return;

      const anchor = this._anchor;
      if (!anchor) {
        el.style.left = "0px";
        el.style.top = "0px";
        return;
      }

      const margin = 12; // min distance from viewport edges
      const gap = 10; // distance between the cell and the tooltip
      const tw = el.offsetWidth;
      const th = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Anchor horizontally to the cell: try right side, flip to left if it
      // would overflow, then clamp.
      let left = anchor.right + gap;
      if (left + tw + margin > vw) {
        left = anchor.left - gap - tw;
      }
      left = Math.max(margin, Math.min(left, vw - tw - margin));

      // Anchor vertically to the cell: align tops, flip up if it overflows.
      let top = anchor.top;
      if (top + th + margin > vh) {
        top = anchor.bottom - th;
      }
      top = Math.max(margin, Math.min(top, vh - th - margin));

      // Direct DOM write for position only — bypasses Vue reactivity, no
      // component re-render (the child re-renders itself via activeCell).
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    },
  },
};
</script>

<style scoped>
.dedication-table-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  background: white;
  max-height: 80vh;
  /* Show scrollbar on hover for better UX */
  scrollbar-width: thin;
  scrollbar-color: #dbdbdb #f5f5f5;
}

.dedication-table-container::-webkit-scrollbar {
  height: 12px;
}

.dedication-table-container::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 6px;
}

.dedication-table-container::-webkit-scrollbar-thumb {
  background: #dbdbdb;
  border-radius: 6px;
}

.dedication-table-container::-webkit-scrollbar-thumb:hover {
  background: #b5b5b5;
}

.table-wrapper {
  display: inline-block;
  min-width: 100%;
  position: relative;
}

.dedication-table {
  width: auto;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.875rem;
  table-layout: fixed;
}

.dedication-table thead {
  background: linear-gradient(to bottom, #fafafa, #f5f5f5);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.dedication-table th {
  padding: 0.75rem 0.5rem;
  text-align: center;
  font-weight: 600;
  border-bottom: 2px solid #dbdbdb;
  white-space: nowrap;
  background: transparent;
  min-width: 90px;
  color: #363636;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.dedication-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
  text-align: center;
  white-space: nowrap;
  min-width: 90px;
}

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 5;
  background: white;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  min-width: 150px !important;
  max-width: 150px !important;
}

.dedication-table tbody tr:nth-child(even) .sticky-col {
  background: #fafafa;
}

.dedication-table tbody tr:hover .sticky-col {
  background: #f5f5f5;
}

.dedication-table tbody tr:hover {
  background: #f9f9f9;
}

.dedication-table thead .sticky-col {
  z-index: 15;
  background: linear-gradient(to bottom, #fafafa, #f5f5f5);
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05);
}

.person-col {
  text-align: left !important;
  font-weight: 600;
  padding-left: 1rem !important;
}

.period-col {
  min-width: 90px;
}

.period-cell {
  min-width: 90px;
  transition: opacity 0.15s ease;
  position: relative;
  border: 1px solid transparent;
}

.period-cell:hover {
  opacity: 0.75;
  z-index: 10;
}

/* Custom tooltip — hoverable so group headers can be clicked. */
.custom-tooltip {
  /* Visibility is toggled via v-show (display), so the base value is block. */
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  background: #2c3e50;
  opacity: 0.97;
  color: #ffffff;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 400;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  max-width: 380px;
  min-width: 250px;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
  pointer-events: auto;
}

/* Pinned state: locked to its cell, no longer follows the mouse. A subtle
   highlight tells the user it's fixed and a click outside will release it. */
.custom-tooltip.is-pinned {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35), 0 0 0 2px #3273dc;
}

.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.hours {
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
}

.percentage {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

/* Improve percentage visibility on colored backgrounds */
.dedication-good .percentage,
.dedication-optimal .percentage,
.dedication-high .percentage {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

/* Color coding for dedication levels */
.dedication-empty {
  background-color: #fafafa;
  color: #999;
}

.dedication-low {
  background-color: #ffdd57;
  color: #333;
  font-weight: 500;
}

.dedication-low .percentage {
  color: #555;
  font-weight: 600;
}

.dedication-good {
  background: linear-gradient(135deg, #299cb4 0%, #2aacc4 100%);
  color: white;
  font-weight: 500;
}

.dedication-good .percentage {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

.dedication-optimal {
  background: linear-gradient(135deg, #48c774 0%, #58d784 100%);
  color: white;
  font-weight: 500;
}

.dedication-optimal .percentage {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

.dedication-high {
  background: linear-gradient(135deg, #f14668 0%, #f15678 100%);
  color: white;
  font-weight: 500;
}

.dedication-high .percentage {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

.help {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 0.875rem;
}

.has-text-blue {
  color: #299cb4 !important;
}

/* Responsive adjustments */
@media screen and (max-width: 768px) {
  .period-col,
  .period-cell {
    min-width: 70px;
  }

  .hours {
    font-size: 0.8rem;
  }

  .percentage {
    font-size: 0.7rem;
  }
}
</style>
