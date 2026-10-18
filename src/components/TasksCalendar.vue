<template>
  <!-- Tasques · Calendari: the month with each task from its start to its due date.
       On a phone it becomes an agenda of the days that have tasks. -->
  <div class="tasks-calendar">
    <div class="tc-head">
      <div class="tc-nav">
        <button type="button" class="tc-btn" aria-label="Mes anterior" @click="move(-1)"><b-icon icon="chevron-left" /></button>
        <h2>{{ monthTitle }}</h2>
        <button type="button" class="tc-btn" aria-label="Mes següent" @click="move(1)"><b-icon icon="chevron-right" /></button>
        <b-button size="is-small" @click="month = currentMonth">Avui</b-button>
      </div>
      <span v-if="!monthHasTasks" class="tc-none has-text-muted">Cap tasca amb data aquest mes.</span>
      <span v-if="undated" class="has-text-muted">{{ undated }} {{ undated === 1 ? "tasca" : "tasques" }} sense data no hi surten</span>
    </div>

    <div class="tc-grid" role="grid" :aria-label="monthTitle">
      <div v-for="d in weekDays" :key="d" class="tc-dow" role="columnheader">{{ d }}</div>
      <template v-for="(week, w) in weeks" :key="w">
        <div
          v-for="day in week"
          :key="day.date"
          class="tc-day"
          role="gridcell"
          :class="{ 'is-out': !day.inMonth, 'is-today': day.date === today, 'has-tasks': day.tasks.length }"
        >
          <div class="tc-day-head">
            <span class="tc-date">{{ day.day }}</span>
            <span class="tc-weekday">{{ weekdayName(day.date) }}</span>
            <button type="button" class="tc-add" :aria-label="'Afegeix una tasca el ' + longDate(day.date)" @click="$emit('add', { due_date: day.date })">
              <b-icon icon="plus" custom-size="default" />
            </button>
          </div>
          <button
            v-for="t in shownTasks(day)"
            :key="t.id"
            type="button"
            class="tc-task"
            :class="taskClass(t, day.date)"
            :title="t.name + (t.project && t.project.name ? ' · ' + t.project.name : '')"
            @click="$emit('open', t)"
          >{{ t.name }}</button>
          <button v-if="hiddenCount(day)" type="button" class="tc-more" @click="expanded = { ...expanded, [day.date]: true }">
            {{ hiddenCount(day) }} més
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import { calendarWeeks, isDone, isOverdue } from "@/domain/tasks";

const PER_DAY = 3;

export default {
  name: "TasksCalendar",
  props: {
    tasks: { type: Array, default: () => [] },
    states: { type: Array, default: () => [] }
  },
  emits: ["open", "add"],
  data() {
    const currentMonth = moment().format("YYYY-MM");
    return {
      currentMonth,
      month: currentMonth,
      today: moment().format("YYYY-MM-DD"),
      expanded: {},
      weekDays: ["dl.", "dt.", "dc.", "dj.", "dv.", "ds.", "dg."]
    };
  },
  computed: {
    weeks() {
      return calendarWeeks(this.month, this.tasks);
    },
    monthTitle() {
      const t = moment(this.month, "YYYY-MM").format("MMMM [de] YYYY");
      return t.charAt(0).toUpperCase() + t.slice(1);
    },
    monthHasTasks() {
      return this.weeks.some(w => w.some(d => d.inMonth && d.tasks.length));
    },
    undated() {
      return this.tasks.filter(t => !t.due_date && !t.start_date).length;
    }
  },
  methods: {
    move(n) {
      this.month = moment(this.month, "YYYY-MM").add(n, "month").format("YYYY-MM");
      this.expanded = {};
    },
    shownTasks(day) {
      return this.expanded[day.date] ? day.tasks : day.tasks.slice(0, PER_DAY);
    },
    hiddenCount(day) {
      return this.expanded[day.date] ? 0 : Math.max(0, day.tasks.length - PER_DAY);
    },
    taskClass(t, date) {
      return {
        "is-done": isDone(t, this.states),
        "is-late": isOverdue(t, this.states, this.today),
        "is-high": t.priority === "high",
        "is-span": !!(t.start_date && t.due_date && t.start_date !== t.due_date),
        "is-due": t.due_date === date
      };
    },
    weekdayName(date) {
      return moment(date).format("dddd");
    },
    longDate(date) {
      return moment(date).format("D MMMM");
    }
  }
};
</script>

<style scoped>
.tasks-calendar {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
}
.tc-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .5rem 1rem;
  padding: .75rem 1rem;
  border-bottom: 1px solid var(--a-line);
}
.tc-nav {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.tc-nav h2 {
  min-width: 11rem;
  text-align: center;
  font-size: 1.0625rem;
  font-weight: 800;
}
.tc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--a-input);
  border-radius: 8px;
  background: var(--a-surface);
  color: var(--a-fg);
  cursor: pointer;
}
.tc-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.tc-dow {
  padding: .5rem;
  background: var(--a-thead);
  border-bottom: 1px solid var(--a-line);
  font-size: .75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--a-fg-2);
}
.tc-day {
  min-height: 7.25rem;
  padding: .375rem;
  border-right: 1px solid var(--a-line-soft);
  border-bottom: 1px solid var(--a-line-soft);
  display: flex;
  flex-direction: column;
  gap: .25rem;
  min-width: 0;
}
.tc-day:nth-child(7n) {
  border-right: 0;
}
.tc-day.is-out {
  background: var(--a-bg);
}
.tc-day.is-out .tc-date {
  color: var(--a-muted);
}
.tc-day-head {
  display: flex;
  align-items: center;
  gap: .375rem;
}
.tc-date {
  font-weight: 800;
  font-size: .8125rem;
  padding: 0 .375rem;
  border-radius: 999px;
}
.tc-day.is-today .tc-date {
  background: var(--a-accent);
  color: #fff;
}
.tc-weekday {
  display: none;
}
.tc-add {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--a-muted);
  cursor: pointer;
  opacity: 0;
}
.tc-day:hover .tc-add,
.tc-add:focus {
  opacity: 1;
}
.tc-add:hover {
  background: var(--a-chip);
  color: var(--a-accent);
}
.tc-task {
  display: block;
  width: 100%;
  padding: .125rem .375rem;
  border: 0;
  border-left: 3px solid transparent;
  border-radius: 4px;
  background: var(--a-accent-soft);
  color: var(--a-accent-hover);
  font: inherit;
  font-size: .75rem;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.tc-task.is-span:not(.is-due) {
  background: var(--a-chip);
  color: var(--a-fg-2);
  font-weight: 600;
}
.tc-task.is-high {
  border-left-color: var(--a-neg);
}
.tc-task.is-late {
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
}
.tc-task.is-done {
  background: var(--a-chip);
  color: var(--a-muted);
  text-decoration: line-through;
}
.tc-more {
  border: 0;
  padding: 0 .375rem;
  background: transparent;
  font: inherit;
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-accent);
  text-align: left;
  cursor: pointer;
}
/* phone: an agenda of the days with tasks */
@media (max-width: 720px) {
  .tc-grid {
    display: block;
  }
  .tc-dow,
  .tc-day:not(.has-tasks),
  .tc-day.is-out {
    display: none;
  }
  .tc-day {
    min-height: 0;
    border-right: 0;
    padding: .625rem 1rem;
  }
  .tc-weekday {
    display: inline;
    font-size: .8125rem;
    color: var(--a-muted);
  }
  .tc-add {
    opacity: 1;
  }
  .tc-task {
    font-size: .875rem;
    padding: .375rem .5rem;
  }
}
</style>
