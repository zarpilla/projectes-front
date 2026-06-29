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
                :class="cellData[leader.id][period.key].cssClass"
                class="period-cell"
                @mouseenter="showTooltip($event, cellData[leader.id][period.key].tooltip)"
                @mousemove="updateTooltipPosition($event)"
                @mouseleave="hideTooltip"
              >
                <div class="cell-content">
                  <div class="hours">{{ cellData[leader.id][period.key].hours }}h</div>
                  <div class="percentage">{{ cellData[leader.id][period.key].percentage }}%</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Tooltip (managed via direct DOM manipulation for performance) -->
    <div ref="tooltip" class="custom-tooltip">
      <div ref="tooltipContent" class="tooltip-content"></div>
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
import { mapState } from "vuex";
import moment from "moment";
import _ from "lodash";

export default {
  name: "DedicationChartGannt",
  props: {
    project: Object,
    leaders: Array,
    dedications: Array,
    festives: Array,
    view: String
  },
  data() {
    return {};
  },
  computed: {
    ...mapState(["userName"]),
    ...mapState(["me"]),
    
    visibleLeaders() {
      return this.leaders ? this.leaders.filter(l => !l.hidden) : [];
    },
    
    periods() {
      if (!this.dedications || this.dedications.length === 0) {
        return [];
      }
      
      // Collect all unique period keys that have actual data
      const periodKeysSet = new Set();
      
      this.dedications.forEach(d => {
        if (d.from && d.estimated_hours) {
          const fromDate = moment(d.from, 'YYYY-MM-DD');
          const actualYear = fromDate.year();
          const actualMonth = fromDate.format('MM');
          const actualWeek = fromDate.isoWeek();
          
          const key = this.view === "week"
            ? `${actualYear}-W${String(actualWeek).padStart(2, '0')}`
            : `${actualYear}-${actualMonth}`;
          
          periodKeysSet.add(key);
        }
      });
      
      // Also include festive periods if they have dedications
      if (this.festives && this.visibleLeaders) {
        this.festives.forEach(f => {
          if (f.date) {
            const festiveDate = moment(f.date, "YYYY-MM-DD");
            const actualYear = festiveDate.year();
            const actualMonth = festiveDate.format('MM');
            const actualWeek = festiveDate.isoWeek();

            const key = this.view === "week"
              ? `${actualYear}-W${String(actualWeek).padStart(2, '0')}`
              : `${actualYear}-${actualMonth}`;
            
            periodKeysSet.add(key);
          }
        });
      }
      
      // Convert to sorted array
      const sortedKeys = Array.from(periodKeysSet).sort();
      
      // Generate period objects
      const periods = sortedKeys.map(key => {
        if (this.view === 'month') {
          const [year, month] = key.split('-');
          const date = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
          return {
            key: key,
            label: date.format('MMM YYYY'),
            year: parseInt(year),
            month: month
          };
        } else {
          // Week view
          const [year, weekPart] = key.split('-W');
          const week = parseInt(weekPart);
          return {
            key: key,
            label: `W${week}`,
            year: parseInt(year),
            week: week
          };
        }
      });
      
      return periods;
    },
    
    dedicationsByLeaderAndPeriod() {
      const map = {};
      
      if (!this.visibleLeaders || !this.dedications) {
        return map;
      }
      
      this.visibleLeaders.forEach(leader => {
        map[leader.id] = {};
        
        // Process regular dedications
        const processedDedications = this.dedications
          .filter(d => d.username === leader.username && d.estimated_hours)
          .map(d => {
            const fromDate = moment(d.from, 'YYYY-MM-DD');
            const actualYear = fromDate.year();
            const actualMonth = fromDate.format('MM');
            const actualWeek = fromDate.isoWeek();
            
            const key = this.view === "week"
              ? `${actualYear}-W${String(actualWeek).padStart(2, '0')}`
              : `${actualYear}-${actualMonth}`;
            
            return {
              ...d,
              periodKey: key,
              _actualYear: actualYear,
              _actualMonth: actualMonth,
              _actualWeek: actualWeek
            };
          });
        
        // Process festive dedications
        const festiveDedications = [];
        if (this.festives && leader.daily_dedications) {
          this.festives.forEach(f => {
            if (
              (f.users_permissions_user &&
                f.users_permissions_user.username === leader.username) ||
              f.users_permissions_user === null
            ) {
              let dailyHours = 0;
              leader.daily_dedications.forEach(dd => {
                if (dd.from <= f.date && dd.to >= f.date) {
                  dailyHours = dd.hours;
                }
              });

              if (dailyHours > 0) {
                const festiveDate = moment(f.date, "YYYY-MM-DD");
                const actualYear = festiveDate.year();
                const actualMonth = festiveDate.format('MM');
                const actualWeek = festiveDate.isoWeek();

                const key = this.view === "week"
                  ? `${actualYear}-W${String(actualWeek).padStart(2, '0')}`
                  : `${actualYear}-${actualMonth}`;

                festiveDedications.push({
                  project_name: f.festive_type.name,
                  periodKey: key,
                  estimated_hours: dailyHours,
                  from: f.date,
                  username: leader.username,
                  _actualYear: actualYear,
                  _actualMonth: actualMonth,
                  _actualWeek: actualWeek
                });
              }
            }
          });
        }
        
        // Merge all dedications
        const allDedications = [...processedDedications, ...festiveDedications];
        
        // Group by period
        const byPeriod = _(allDedications)
          .groupBy('periodKey')
          .map((dedications, periodKey) => {
            const total = _.sumBy(dedications, 'estimated_hours');
            const byProject = _(dedications)
              .groupBy('project_name')
              .map((projectDeds, projectName) => ({
                project_name: projectName,
                estimated_hours: _.sumBy(projectDeds, 'estimated_hours')
              }))
              .value();
            
            return {
              periodKey,
              total,
              projects: byProject,
              dedications
            };
          })
          .value();
        
        byPeriod.forEach(p => {
          map[leader.id][p.periodKey] = p;
        });
      });
      
      return map;
    },
    
    // Pre-compute all cell display data to avoid recalculation on every render
    cellData() {
      const cells = {};
      
      this.visibleLeaders.forEach(leader => {
        cells[leader.id] = {};
        
        this.periods.forEach(period => {
          const data = this.dedicationsByLeaderAndPeriod[leader.id];
          const periodData = data ? data[period.key] : null;
          
          let hours = '0.00';
          let percentage = '0';
          let cssClass = 'dedication-empty';
          let tooltip = 'Sense dedicació';
          
          if (periodData) {
            hours = periodData.total.toFixed(2);
            
            // Calculate percentage
            const firstDedication = periodData.dedications[0];
            const startDate = firstDedication ? firstDedication.from : period.key + '-01';
            
            let dailyHours = 8;
            if (leader.daily_dedications) {
              for (let dd of leader.daily_dedications) {
                if (dd.from <= startDate && dd.to >= startDate) {
                  dailyHours = dd.hours;
                  break;
                }
              }
            }
            
            const expectedHours = (this.view === 'month' 
              ? this.numberOfWorkingDays(startDate)
              : 5) * dailyHours;
            
            if (expectedHours > 0) {
              const pct = (periodData.total / expectedHours) * 100;
              percentage = pct.toFixed(0);
              
              // Determine CSS class
              if (pct < 85) {
                cssClass = 'dedication-low';
              } else if (pct > 105) {
                cssClass = 'dedication-high';
              } else if (pct >= 95 && pct <= 105) {
                cssClass = 'dedication-optimal';
              } else {
                cssClass = 'dedication-good';
              }
            }
            
            // Build tooltip content (pre-computed, no performance hit)
            const tooltipLines = [];
            
            // Show all projects
            periodData.projects.forEach(p => {
              if (p.estimated_hours) {
                tooltipLines.push(`${p.project_name}: ${p.estimated_hours.toFixed(2)}h`);
              }
            });
            
            tooltipLines.push('');
            tooltipLines.push(`Hores període: ${expectedHours.toFixed(2)}h`);
            
            const diff = expectedHours - periodData.total;
            if (diff > 0) {
              tooltipLines.push(`Falten: ${diff.toFixed(2)}h`);
            } else if (diff < 0) {
              tooltipLines.push(`Sobren: ${Math.abs(diff).toFixed(2)}h`);
            }
            
            tooltip = tooltipLines.join('\n');
          }
          
          cells[leader.id][period.key] = {
            hours,
            percentage,
            cssClass,
            tooltip
          };
        });
      });
      
      return cells;
    }
  },
  mounted() {
    // No longer needed since we're using template-based tooltip
  },
  methods: {
    showTooltip(event, text) {
      if (!text || text === 'Sense dedicació') {
        return;
      }
      
      const el = this.$refs.tooltip;
      const content = this.$refs.tooltipContent;
      if (!el || !content) {
        return;
      }
      
      // Update content directly (no Vue re-render of the table).
      content.textContent = text;
      el.style.display = 'block';
      this._tooltipVisible = true;
      
      this.positionTooltip(event.clientX, event.clientY);
    },
    
    updateTooltipPosition(event) {
      if (!this._tooltipVisible) {
        return;
      }
      
      // Throttle to one update per animation frame to avoid layout thrashing.
      this._cursorX = event.clientX;
      this._cursorY = event.clientY;
      
      if (this._rafId) {
        return;
      }
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        this.positionTooltip(this._cursorX, this._cursorY);
      });
    },
    
    positionTooltip(x, y) {
      const el = this.$refs.tooltip;
      if (!el) {
        return;
      }
      
      const margin = 12;        // min distance from viewport edges
      const cursorGap = 16;     // distance between cursor and tooltip
      const tw = el.offsetWidth;
      const th = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // Horizontal: prefer the right of the cursor, flip to the left if it
      // would overflow, then clamp so it never leaves the viewport.
      let left = x + cursorGap;
      if (left + tw + margin > vw) {
        left = x - cursorGap - tw;
      }
      left = Math.max(margin, Math.min(left, vw - tw - margin));
      
      // Vertical: prefer below the cursor, flip above if it would overflow,
      // then clamp.
      let top = y + cursorGap;
      if (top + th + margin > vh) {
        top = y - cursorGap - th;
      }
      top = Math.max(margin, Math.min(top, vh - th - margin));
      
      // Direct DOM write — bypasses Vue reactivity, no component re-render.
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    },
    
    hideTooltip() {
      this._tooltipVisible = false;
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      const el = this.$refs.tooltip;
      if (el) {
        el.style.display = 'none';
      }
    },
    
    numberOfWorkingDays(day) {
      let n = 0;
      const initOfMonth = moment(day, "YYYY-MM-DD");
      const endOfMonth = initOfMonth.clone().endOf("month");
      const days = Math.round(
        moment.duration(endOfMonth.diff(initOfMonth)).asDays()
      );
      for (var i = 0; i < days; i++) {
        const currentDay = initOfMonth.clone().add(i, "day");
        if (![0, 6].includes(currentDay.day())) {
          n++;
        }
      }
      return n;
    }
  }
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

/* Custom tooltip */
.custom-tooltip {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  background: #2c3e50;
  opacity: 0.9;
  color: #ffffff;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 400;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  max-width: 350px;
  min-width: 250px;
  max-height: 400px;
  overflow-y: auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.tooltip-content {
  white-space: pre-line;
  line-height: 1.6;
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
