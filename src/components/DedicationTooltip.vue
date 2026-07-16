<template>
  <div class="dedication-tooltip">
    <!-- Header: total worked/estimated for the period -->
    <div class="dt-header">
      <span class="dt-header-label">Total hores</span>
      <span class="dt-header-hours">{{ totalHoursFormatted }}h</span>
    </div>

    <!-- Breakdown: flat project rows, or collapsible groups -->
    <div class="dt-body">
      <template v-if="hasBreakdown">
        <!-- Flat: one row per project -->
        <template v-if="grouping === 'project'">
          <div
            v-for="item in breakdown"
            :key="item.project"
            class="dt-row dt-project"
          >
            <span class="dt-row-label" :title="item.project">{{ item.project }}</span>
            <span class="dt-row-hours">{{ formatHours(item.hours) }}h</span>
          </div>
        </template>

        <!-- Grouped: one collapsible header per type/likelihood, with its sum -->
        <template v-else>
          <div
            v-for="group in groupedBreakdown"
            :key="group.key"
            class="dt-group"
          >
            <button
              type="button"
              class="dt-group-header"
              :class="{ 'is-expanded': expandedGroups[group.key] }"
              :aria-expanded="expandedGroups[group.key] ? 'true' : 'false'"
              @click="toggleGroup(group.key)"
            >
              <span class="dt-toggle">{{ expandedGroups[group.key] ? '▾' : '▸' }}</span>
              <span class="dt-group-label">
                <span class="dt-group-dimension">{{ dimensionLabel }}:</span>
                <span class="dt-group-name">{{ group.key }}</span>
              </span>
              <span class="dt-group-hours">{{ formatHours(group.total) }}h</span>
            </button>

            <div v-show="expandedGroups[group.key]" class="dt-group-body">
              <div
                v-for="item in group.items"
                :key="item.project"
                class="dt-row dt-project"
              >
                <span class="dt-row-label" :title="item.project">{{ item.project }}</span>
                <span class="dt-row-hours">{{ formatHours(item.hours) }}h</span>
              </div>
            </div>
          </div>
        </template>
      </template>

      <div v-else class="dt-empty">{{ emptyText }}</div>
    </div>

    <!-- Footer: capacity + excedent -->
    <template v-if="hasBreakdown">
      <div class="dt-divider"></div>
      <div class="dt-footer">
        <div class="dt-row dt-capacity">
          <span class="dt-row-label">Hores període</span>
          <span class="dt-row-hours">{{ formatHours(cell.expected) }}h</span>
        </div>
        <div v-if="diff !== null && diff > 0" class="dt-row dt-excedent dt-falten">
          <span class="dt-row-label">Falten</span>
          <span class="dt-row-hours">{{ formatHours(diff) }}h</span>
        </div>
        <div v-else-if="diff !== null && diff < 0" class="dt-row dt-excedent dt-sobren">
          <span class="dt-row-label">Sobren</span>
          <span class="dt-row-hours">{{ formatHours(Math.abs(diff)) }}h</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
const GROUP_LABELS = {
  type: "Tipus de projecte",
  likelihood: "Probabilitat",
  project: "Projecte",
};

export default {
  name: "DedicationTooltip",
  props: {
    // Cell object from the backend: { hours, percentage, breakdown, expected, diff, tooltip }
    cell: {
      type: Object,
      required: true,
    },
    grouping: {
      type: String,
      default: "project",
      validator: (v) => ["project", "type", "likelihood"].includes(v),
    },
  },
  data() {
    return {
      // Expanded state per group key (allowlist). Empty by default, so all
      // groups start COLLAPSED when grouping is type/likelihood; the user
      // expands a group by clicking its header.
      expandedGroups: {},
    };
  },
  computed: {
    breakdown() {
      return Array.isArray(this.cell.breakdown) ? this.cell.breakdown : [];
    },
    hasBreakdown() {
      return this.breakdown.length > 0;
    },
    emptyText() {
      return this.cell.tooltip || "Sense dedicació";
    },
    totalHoursFormatted() {
      // breakdown is the source of truth when present; otherwise fall back to
      // the cell's formatted hours string (e.g. legacy cells).
      if (this.hasBreakdown) {
        return this.formatHours(this.totalHours);
      }
      return this.cell.hours != null ? this.cell.hours : "0.00";
    },
    totalHours() {
      return this.breakdown.reduce((s, r) => s + (r.hours || 0), 0);
    },
    diff() {
      return typeof this.cell.diff === "number" ? this.cell.diff : null;
    },
    dimensionLabel() {
      return GROUP_LABELS[this.grouping] || this.grouping;
    },
    // Bucket the flat breakdown by the selected dimension, keeping groups
    // sorted by total hours desc and items within a group in breakdown order.
    groupedBreakdown() {
      const groups = Object.create(null);
      const totals = Object.create(null);
      for (let i = 0; i < this.breakdown.length; i++) {
        const r = this.breakdown[i];
        const key = r[this.grouping] || "-";
        if (!groups[key]) {
          groups[key] = [];
          totals[key] = 0;
        }
        groups[key].push(r);
        totals[key] += r.hours || 0;
      }
      return Object.keys(groups)
        .sort((a, b) => totals[b] - totals[a])
        .map((key) => ({ key, items: groups[key], total: totals[key] }));
    },
  },
  watch: {
    // Reset expand state when the grouping dimension changes, so switching
    // from "Tipus" to "Probabilitat" starts from a clean collapsed-by-default
    // view rather than carrying over unrelated state.
    grouping() {
      this.expandedGroups = {};
    },
  },
  methods: {
    formatHours(h) {
      const n = Number(h);
      if (isNaN(n)) return "0.00";
      return n.toFixed(2);
    },
    toggleGroup(key) {
      // Use $set so adding a new key is reactive.
      this.$set(this.expandedGroups, key, !this.expandedGroups[key]);
    },
  },
};
</script>

<style scoped>
.dedication-tooltip {
  color: #ffffff;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Header */
.dt-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1.25rem;
  font-weight: 700;
  padding-bottom: 0.4rem;
  margin-bottom: 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.dt-header-label {
  color: #f5f5f5;
}

.dt-header-hours {
  color: #ffffff;
  font-variant-numeric: tabular-nums;
}

/* Body rows */
.dt-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.dt-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1.25rem;
  white-space: normal;
}

.dt-row-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.dt-row-hours {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  flex-shrink: 0;
}

.dt-project {
  padding-left: 0.5rem;
  color: rgba(255, 255, 255, 0.88);
}

.dt-project .dt-row-label::before {
  content: "• ";
  color: rgba(255, 255, 255, 0.45);
}

.dt-empty {
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
}

/* Collapsible group header */
.dt-group {
  margin-top: 0.35rem;
}

.dt-group-header {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  width: 100%;
  text-align: left;
  cursor: pointer;
  padding: 0.3rem 0.35rem;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font: inherit;
  font-weight: 600;
  user-select: none;
}

.dt-group-header:hover {
  background: rgba(255, 255, 255, 0.16);
}

.dt-toggle {
  flex-shrink: 0;
  width: 0.9em;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.dt-group-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.dt-group-dimension {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.dt-group-name {
  font-weight: 700;
}

.dt-group-hours {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  flex-shrink: 0;
}

.dt-group-body {
  padding-left: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 0.15rem;
}

/* Divider + footer */
.dt-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
  margin: 0.5rem 0;
}

.dt-footer {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.dt-capacity {
  color: rgba(255, 255, 255, 0.92);
}

.dt-excedent {
  font-weight: 700;
}

.dt-falten .dt-row-hours {
  color: #ffdd57;
}

.dt-sobren .dt-row-hours {
  color: #ff8a9b;
}
</style>
