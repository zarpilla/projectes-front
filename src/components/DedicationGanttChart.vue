<template>
  <div>
    <!-- Redesign A: quiet heat map, hours and occupation of each person and period -->
    <section class="report-card">
      <header class="report-card-head">
        <h2>{{ title }}</h2>
        <span class="has-text-muted">{{ withHours.length }} {{ withHours.length === 1 ? "persona" : "persones" }} · {{ hoursText(grandTotal) }} h</span>
      </header>
      <div class="heat-legend" aria-hidden="true">
        <span><i class="dedication-low"></i>Menys del 85 %</span>
        <span><i class="dedication-good"></i>Del 85 al 95 %</span>
        <span><i class="dedication-optimal"></i>Del 95 al 105 %</span>
        <span><i class="dedication-high"></i>Més del 105 %</span>
        <span><i class="dedication-nojornada"></i>s/j: sense jornada definida</span>
        <span><i class="dedication-empty">—</i>Sense hores</span>
      </div>
      <div class="dedication-table-container">
        <table class="dedication-table">
          <thead>
            <tr>
              <th class="sticky-col person-col">Persona</th>
              <th v-for="period in periods" :key="period.key" class="period-col">
                {{ shortLabel(period.label) }}
              </th>
              <th class="total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="leader in shownLeaders" :key="leader.id">
              <th scope="row" class="sticky-col person-col">{{ leader.username }}</th>
              <td
                v-for="period in periods"
                :key="period.key"
                :class="cellClass(cell(leader.id, period.key))"
                class="period-cell"
                @mouseenter="showTooltip($event, cell(leader.id, period.key))"
                @mouseleave="scheduleHide"
                @click="pinTooltip($event, cell(leader.id, period.key))"
              >
                <div v-if="Number(cell(leader.id, period.key).hours)" class="cell-content">
                  <div class="hours">{{ hoursText(cell(leader.id, period.key).hours) }}</div>
                  <div class="percentage">{{ percentText(cell(leader.id, period.key).percentage, cell(leader.id, period.key).hours) }}</div>
                </div>
                <div v-else class="cell-content is-none">—</div>
              </td>
              <td class="total-col">{{ hoursText(totalOf(leader.id)) }} h</td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer class="report-card-foot">
        <p v-if="withoutHours.length">
          {{ withoutHours.length }} {{ withoutHours.length === 1 ? "persona" : "persones" }} sense hores:
          {{ withoutHours.map(l => l.username).join(", ") }}.
          <button type="button" class="link-button" @click="showAll = !showAll">{{ showAll ? "Amaga-les" : "Mostra-les" }}</button>
        </p>
        <p class="has-text-muted">Passa per sobre d'una cel·la per veure'n el detall per projecte; clica-la per fixar-lo.</p>
      </footer>
    </section>

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

  </div>
</template>

<script>
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import DedicationTooltip from "@/components/DedicationTooltip.vue";
import { formatNumber } from "@/helpers/format-number";

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
    // card heading, e.g. "Hores fetes i ocupació per persona · 2026"
    title: {
      type: String,
      default: "",
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
      // also list the people without hours in the period
      showAll: false,
    };
  },
  computed: {
    ...mapState(useMainStore, ["userName"]),
    ...mapState(useMainStore, ["me"]),

    visibleLeaders() {
      return this.leaders ? this.leaders.filter((l) => !l.hidden) : [];
    },
    withHours() {
      return this.visibleLeaders.filter((l) => this.totalOf(l.id) > 0);
    },
    withoutHours() {
      return this.visibleLeaders.filter((l) => !(this.totalOf(l.id) > 0));
    },
    shownLeaders() {
      return this.showAll ? this.visibleLeaders : this.withHours;
    },
    // the year most periods belong to
    mainYear() {
      const counts = {};
      (this.periods || []).forEach((p) => {
        const y = (String(p.label || "").match(/(\d{4})$/) || [])[1];
        if (y) counts[y] = (counts[y] || 0) + 1;
      });
      return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "";
    },
    grandTotal() {
      return this.visibleLeaders.reduce((acc, l) => acc + this.totalOf(l.id), 0);
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
    totalOf(leaderId) {
      const row = this.cells ? this.cells[leaderId] : null;
      if (!row) return 0;
      return (this.periods || []).reduce((acc, p) => acc + (Number(row[p.key] && row[p.key].hours) || 0), 0);
    },
    // "GEN 2026" -> "GEN"; months of a neighbouring year keep it short: "DES '25"
    shortLabel(label) {
      const m = String(label || "").match(/^(.*?)\s*(\d{4})$/);
      if (!m) return label;
      return m[2] === this.mainYear ? m[1] : `${m[1]} '${m[2].slice(2)}`;
    },
    hoursText(value) {
      return formatNumber(Number(value) || 0, 1, 1);
    },
    // "↓ 56 %" under 85 %, "↑ 172 %" over 105 %
    percentText(value, hours) {
      const n = Math.round(Number(value) || 0);
      // hours but no working day to compare with
      if (!n && Number(hours)) return "s/j";
      return (n < 85 ? "↓ " : n > 105 ? "↑ " : "") + n + " %";
    },
    cellClass(c) {
      if (!Number(c.hours)) return "dedication-empty";
      return Math.round(Number(c.percentage) || 0) ? c.cssClass : "dedication-nojornada";
    },
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
.report-card {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
}
.report-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: .5rem 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--a-line);
}
.report-card-head h2 {
  font-size: 1rem;
  font-weight: 800;
}
.heat-legend {
  display: flex;
  flex-wrap: wrap;
  gap: .375rem 1.25rem;
  padding: .75rem 1.25rem;
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.heat-legend span {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
}
.heat-legend i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1rem;
  border-radius: 4px;
  font-style: normal;
  color: var(--a-muted);
}
.dedication-table-container {
  overflow-x: auto;
  max-height: 80vh;
  scrollbar-width: thin;
}
.dedication-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-variant-numeric: tabular-nums;
}
.dedication-table th,
.dedication-table td {
  padding: 0;
  text-align: center;
  vertical-align: middle;
}
.dedication-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--a-thead);
  padding: .625rem .375rem;
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--a-muted);
  border-bottom: 1px solid var(--a-line);
  white-space: nowrap;
}
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--a-surface);
}
.dedication-table thead .sticky-col {
  z-index: 3;
  background: var(--a-thead);
}
.person-col {
  min-width: 9rem;
  padding: .5rem 1rem !important;
  text-align: left !important;
  font-weight: 700;
  font-size: .875rem;
  border-right: 1px solid var(--a-line);
  white-space: nowrap;
}
.dedication-table tbody tr + tr > * {
  border-top: 1px solid var(--a-surface);
}
.period-cell {
  min-width: 4.5rem;
  border-left: 1px solid var(--a-surface);
  cursor: pointer;
}
.period-cell:hover {
  box-shadow: inset 0 0 0 2px var(--a-fg);
}
.cell-content {
  padding: .375rem .25rem;
  line-height: 1.2;
}
.cell-content .hours {
  font-weight: 800;
  font-size: .8125rem;
}
.cell-content .percentage {
  font-size: .6875rem;
  font-weight: 700;
}
.cell-content.is-none {
  color: var(--a-line);
}
.total-col {
  padding: .5rem 1rem !important;
  text-align: right !important;
  font-weight: 800;
  font-size: .8125rem;
  white-space: nowrap;
  border-left: 1px solid var(--a-line);
}
.dedication-empty {
  background: var(--a-surface);
}
.dedication-low {
  background: #FCEFC7;
  color: #7A5A00;
}
.dedication-good {
  background: #DCE9F8;
  color: #1E4E86;
}
.dedication-optimal {
  background: #CDEBE3;
  color: #0B5B4C;
}
.dedication-high {
  background: #F6C3A7;
  color: #8A3A12;
}
.dedication-nojornada {
  background: repeating-linear-gradient(135deg, var(--a-chip) 0 5px, var(--a-surface) 5px 10px);
  color: var(--a-fg-2);
}
.report-card-foot {
  padding: .75rem 1.25rem;
  border-top: 1px solid var(--a-line);
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.report-card-foot p + p {
  margin-top: .375rem;
}
/* hover / pinned breakdown of a cell (DedicationTooltip) */
.custom-tooltip {
  /* toggled with v-show */
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  background: #1F2A2E;
  color: #fff;
  padding: .875rem 1rem;
  border-radius: 10px;
  font-size: .875rem;
  max-width: 380px;
  min-width: 250px;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .25);
  pointer-events: auto;
}
.custom-tooltip.is-pinned {
  box-shadow: 0 8px 24px rgba(0, 0, 0, .3), 0 0 0 2px var(--a-accent);
}
.link-button {
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  font-weight: 800;
  color: var(--a-accent);
  cursor: pointer;
}
</style>
