<template>
  <!-- Redesign A, Tasques · Llista (mockup A-Tasques-Llista): grouped table with inline
       state and due date, and actions on the selected tasks -->
  <div class="tasks-list">
    <div v-if="selected.length" class="tl-bulk" role="region" aria-label="Accions sobre les seleccionades">
      <b>{{ selected.length }} {{ selected.length === 1 ? "seleccionada" : "seleccionades" }}</b>
      <b-dropdown aria-role="list">
        <template #trigger>
          <b-button size="is-small" icon-right="menu-down">Estat</b-button>
        </template>
        <b-dropdown-item v-for="s in states" :key="s.id" aria-role="listitem" @click="bulk({ task_state: s.id })">
          {{ s.name }}
        </b-dropdown-item>
      </b-dropdown>
      <b-dropdown aria-role="list" :scrollable="true" max-height="18rem">
        <template #trigger>
          <b-button size="is-small" icon-right="menu-down">Assigna</b-button>
        </template>
        <b-dropdown-item v-for="u in users" :key="u.id" aria-role="listitem" @click="bulkAssign(u)">
          {{ u.username }}
        </b-dropdown-item>
      </b-dropdown>
      <label class="tl-bulk-date">
        <span>Data límit</span>
        <input type="date" class="input is-small" aria-label="Data límit de les seleccionades" @change="bulkDate($event)">
      </label>
      <b-button size="is-small" @click="bulkArchive">Arxiva</b-button>
      <span class="tl-spacer"></span>
      <b-button size="is-small" type="is-ghost" @click="selected = []">Desselecciona</b-button>
    </div>

    <div class="table-wrap">
      <table class="table tl-table">
        <thead>
          <tr>
            <th class="tl-ck">
              <input
                type="checkbox"
                aria-label="Selecciona-les totes"
                :checked="allSelected"
                :indeterminate.prop="selected.length > 0 && !allSelected"
                @change="toggleAll($event.target.checked)"
              >
            </th>
            <th v-for="c in columns" :key="c.key" :class="{ sorted: sortKey === c.key }" :aria-sort="ariaSort(c.key)">
              <button v-if="c.sort" type="button" class="tl-sort" @click="sortBy(c.key)">
                {{ c.title }}<span v-if="sortKey === c.key" aria-hidden="true">{{ sortDir === "asc" ? " ↑" : " ↓" }}</span>
              </button>
              <template v-else>{{ c.title }}</template>
            </th>
          </tr>
        </thead>
        <tbody v-for="g in groups" :key="g.key">
          <tr class="tl-group" :class="{ 'is-late': g.tone === 'late' }">
            <td :colspan="columns.length + 1">
              <button type="button" class="tl-group-btn" :aria-expanded="!collapsed[g.key]" @click="collapsed = { ...collapsed, [g.key]: !collapsed[g.key] }">
                <b-icon :icon="collapsed[g.key] ? 'chevron-right' : 'chevron-down'" custom-size="default" />
                <span class="tl-group-name">{{ g.title }}</span>
                <span class="tl-count">{{ g.tasks.length }}</span>
              </button>
            </td>
          </tr>
          <template v-if="!collapsed[g.key]">
            <tr
              v-for="task in shown(g)"
              :key="g.key + '-' + task.id"
              :class="{ 'is-selected': isSelected(task), 'is-archived': task.archived }"
            >
              <td class="tl-ck">
                <input type="checkbox" :aria-label="'Selecciona «' + task.name + '»'" :checked="isSelected(task)" @change="toggle(task)">
              </td>
              <td class="tl-task">
                <a href="#" class="tl-title" @click.prevent="$emit('open', task)">{{ task.name }}</a>
                <span class="tl-sub">
                  <template v-if="task.project && task.project.name">{{ task.project.name }}</template>
                  <span v-else class="has-text-muted">Sense projecte</span>
                  <template v-if="task.activity_type && task.activity_type.name"> · <b>{{ task.activity_type.name }}</b></template>
                </span>
                <span v-if="hasMeta(task)" class="tl-metas">
                  <span v-if="task.checklist && task.checklist.length" class="tl-meta" title="Checklist">
                    <b-icon icon="format-list-checks" custom-size="default" />{{ task.checklist.filter(c => c.done).length }}/{{ task.checklist.length }}
                  </span>
                  <span v-if="task.documents && task.documents.length" class="tl-meta" title="Documents">
                    <b-icon icon="paperclip" custom-size="default" />{{ task.documents.length }}
                  </span>
                  <span v-if="task.archived" class="tag">Arxivada</span>
                  <a v-if="task.archived" href="#" class="tl-restore" @click.prevent="$emit('update', { tasks: [task], patch: { archived: false } })">Recupera</a>
                </span>
              </td>
              <td>
                <b-dropdown aria-role="list" :mobile-modal="false">
                  <template #trigger>
                    <button type="button" class="tag tl-state" :class="stateClass(task)" :aria-label="'Estat: ' + stateName(task) + '. Canvia l\'estat'">
                      {{ stateName(task) }}<b-icon icon="menu-down" custom-size="default" />
                    </button>
                  </template>
                  <b-dropdown-item
                    v-for="s in states"
                    :key="s.id"
                    aria-role="listitem"
                    @click="change(task, { task_state: s.id })"
                  >
                    {{ s.name }}
                  </b-dropdown-item>
                </b-dropdown>
              </td>
              <td>
                <span class="tl-people">
                  <span v-for="u in task.users_permissions_users" :key="u.id" class="tl-avatar" :title="u.username">{{ initials(u.username) }}</span>
                </span>
              </td>
              <td class="tl-due">
                <button
                  v-if="!task.due_date && editingDate !== task.id"
                  type="button"
                  class="tl-link is-muted"
                  :aria-label="'Afegeix la data límit de «' + task.name + '»'"
                  @click="editDate(task)"
                >Afegeix data</button>
                <input
                  v-else
                  :ref="'date-' + task.id"
                  type="date"
                  class="tl-date"
                  :class="{ 'is-late': overdue(task) }"
                  :value="task.due_date || ''"
                  :aria-label="'Data límit de «' + task.name + '»'"
                  @change="change(task, { due_date: $event.target.value || null })"
                  @blur="editingDate = null"
                >
              </td>
              <td class="tl-updated">
                <span :class="{ 'is-stale': stale(task) }" :title="stale(task) ? 'Fa més de 15 dies que no es toca' : ''">{{ updated(task) }}</span>
              </td>
            </tr>
            <tr v-if="hidden(g)" class="tl-more">
              <td></td>
              <td :colspan="columns.length">
                <button type="button" class="tl-link" @click="expanded = { ...expanded, [g.key]: true }">Mostra'n {{ hidden(g) }} més</button>
              </td>
            </tr>
            <tr v-if="g.key !== 'late'" class="tl-add">
              <td></td>
              <td :colspan="columns.length">
                <button type="button" class="tl-link" @click="$emit('add', g.prefill)">
                  <b-icon icon="plus" custom-size="default" />Afegeix una tasca
                </button>
              </td>
            </tr>
          </template>
        </tbody>
        <tbody v-if="!groups.length">
          <tr>
            <td :colspan="columns.length + 1" class="tl-empty">
              Cap tasca amb aquests filtres.
              <button type="button" class="tl-link" @click="$emit('add', {})"><b-icon icon="plus" custom-size="default" />Afegeix una tasca</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import { groupTasks, sortTasks, isOverdue, isDone, isStale, updatedLabel } from "@/domain/tasks";

const GROUP_LIMIT = 25;

export default {
  name: "TasksList",
  props: {
    tasks: { type: Array, default: () => [] },
    states: { type: Array, default: () => [] },
    users: { type: Array, default: () => [] },
    groupBy: { type: String, default: "due" }
  },
  emits: ["open", "update", "add"],
  data() {
    return {
      sortKey: "due",
      sortDir: "asc",
      selected: [],
      // the row whose empty date is being set (the others show "Afegeix data")
      editingDate: null,
      collapsed: {},
      expanded: {},
      today: moment().format("YYYY-MM-DD"),
      columns: [
        { key: "name", title: "Tasca", sort: true },
        { key: "state", title: "Estat", sort: true },
        { key: "people", title: "Persones" },
        { key: "due", title: "Data límit", sort: true },
        { key: "updated", title: "Actualitzada", sort: true }
      ]
    };
  },
  computed: {
    groups() {
      const sorted = sortTasks(this.tasks, this.sortKey, this.sortDir, this.states);
      return groupTasks(sorted, this.groupBy, this.states, this.today);
    },
    allSelected() {
      return this.tasks.length > 0 && this.tasks.every(t => this.selected.includes(t.id));
    },
    selectedTasks() {
      return this.tasks.filter(t => this.selected.includes(t.id));
    }
  },
  watch: {
    // tasks that leave the list (a filter, an archive) leave the selection too
    tasks(list) {
      const ids = new Set(list.map(t => t.id));
      if (this.selected.some(id => !ids.has(id))) this.selected = this.selected.filter(id => ids.has(id));
    }
  },
  methods: {
    shown(g) {
      return this.expanded[g.key] ? g.tasks : g.tasks.slice(0, GROUP_LIMIT);
    },
    hidden(g) {
      return this.expanded[g.key] ? 0 : Math.max(0, g.tasks.length - GROUP_LIMIT);
    },
    sortBy(key) {
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      } else {
        this.sortKey = key;
        this.sortDir = key === "updated" ? "desc" : "asc";
      }
    },
    ariaSort(key) {
      if (this.sortKey !== key) return null;
      return this.sortDir === "asc" ? "ascending" : "descending";
    },
    isSelected(task) {
      return this.selected.includes(task.id);
    },
    toggle(task) {
      this.selected = this.isSelected(task)
        ? this.selected.filter(id => id !== task.id)
        : [...this.selected, task.id];
    },
    toggleAll(on) {
      this.selected = on ? this.tasks.map(t => t.id) : [];
    },
    async editDate(task) {
      this.editingDate = task.id;
      await this.$nextTick();
      const ref = this.$refs['date-' + task.id];
      const input = Array.isArray(ref) ? ref[0] : ref;
      if (!input) return;
      input.focus();
      try {
        input.showPicker();
      } catch {
        // browsers without showPicker: the focused field is typed in
      }
    },
    change(task, patch) {
      this.$emit("update", { tasks: [task], patch });
    },
    bulk(patch) {
      this.$emit("update", { tasks: this.selectedTasks, patch });
    },
    bulkAssign(user) {
      this.$emit("update", {
        tasks: this.selectedTasks.filter(t => !(t.users_permissions_users || []).some(u => u.id === user.id)),
        patch: t => ({ users_permissions_users: [...(t.users_permissions_users || []).map(u => u.id), user.id] })
      });
    },
    bulkDate(event) {
      const value = event.target.value;
      if (value) this.bulk({ due_date: value });
      event.target.value = "";
    },
    bulkArchive() {
      const n = this.selected.length;
      this.$buefy.dialog.confirm({
        title: "Arxiva",
        message: `Arxivar ${n === 1 ? "la tasca seleccionada" : `les ${n} tasques seleccionades`}? Les podràs recuperar amb «Mostra les arxivades».`,
        confirmText: "Arxiva",
        cancelText: "Cancel·la",
        onConfirm: () => {
          this.bulk({ archived: true });
          this.selected = [];
        }
      });
    },
    hasMeta(task) {
      return (task.checklist && task.checklist.length) || (task.documents && task.documents.length) || task.archived;
    },
    stateName(task) {
      const id = task.task_state && task.task_state.id;
      const s = this.states.find(s => s.id === id);
      return s ? s.name : "—";
    },
    stateClass(task) {
      if (isDone(task, this.states)) return "is-success is-light";
      const first = this.states.length && this.states.reduce((a, b) => ((b.order ?? 0) < (a.order ?? 0) ? b : a));
      return task.task_state && first && task.task_state.id === first.id ? "" : "is-info is-light";
    },
    overdue(task) {
      return isOverdue(task, this.states, this.today);
    },
    stale(task) {
      return !isDone(task, this.states) && isStale(task);
    },
    updated(task) {
      return updatedLabel(task.updatedAt || task.updated_at);
    },
    initials(name) {
      const words = String(name || "").split(/[\s._@-]+/).filter(Boolean);
      return words.slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
    }
  }
};
</script>

<style scoped>
.tasks-list {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
}
.tl-bulk {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  padding: .625rem 1rem;
  background: var(--a-accent-soft);
  border-bottom: 1px solid var(--a-line);
}
.tl-bulk > b {
  color: var(--a-accent);
  margin-right: .5rem;
}
.tl-bulk-date {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
  font-size: .8125rem;
  font-weight: 700;
}
.tl-bulk-date .input {
  width: 9.5rem;
}
.tl-spacer {
  flex: 1;
}
.tl-table {
  width: 100%;
  min-width: 760px;
  margin: 0;
}
.tl-table td {
  vertical-align: top;
}
.tl-ck {
  width: 2.75rem;
  padding-right: 0 !important;
}
.tl-ck input {
  width: 1.0625rem;
  height: 1.0625rem;
  margin-top: .125rem;
  accent-color: var(--a-accent);
  cursor: pointer;
}
.tl-sort {
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}
th.sorted {
  color: var(--a-accent) !important;
}
.tl-task {
  max-width: 28rem;
}
.tl-title {
  display: block;
  font-weight: 700;
  color: var(--a-fg) !important;
  text-decoration: none !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tl-title:hover {
  color: var(--a-accent) !important;
}
.tl-sub {
  display: block;
  font-size: .8125rem;
  color: var(--a-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tl-sub b {
  color: var(--a-fg-2);
}
.tl-metas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .25rem .75rem;
  margin-top: .25rem;
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-muted);
}
.tl-meta {
  display: inline-flex;
  align-items: center;
  gap: .125rem;
}
.tl-restore {
  font-weight: 800;
}
.tl-state {
  border: 0;
  cursor: pointer;
  font-weight: 700;
  gap: .125rem;
}
.tl-people {
  display: inline-flex;
}
.tl-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.625rem;
  height: 1.625rem;
  padding: 0 .25rem;
  margin-left: -3px;
  border: 2px solid var(--a-surface);
  border-radius: 999px;
  background: var(--a-chip);
  font-size: .6875rem;
  font-weight: 800;
  color: var(--a-fg);
}
.tl-avatar:first-child {
  margin-left: 0;
}
.tl-due {
  white-space: nowrap;
}
.tl-date {
  height: 1.875rem;
  width: 8.75rem;
  padding: 0 .375rem;
  margin: -.25rem 0 0 -.375rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-weight: 700;
  color: var(--a-fg);
  cursor: pointer;
}
.tl-date:hover,
.tl-date:focus {
  border-color: var(--a-input);
  background: var(--a-surface);
}
.tl-date.is-late {
  color: var(--a-danger-fg);
}
.tl-link.is-muted {
  color: var(--a-muted);
  font-weight: 600;
}
.tl-updated {
  white-space: nowrap;
}
.is-stale {
  color: var(--a-over);
  font-weight: 700;
}
tr.is-archived .tl-title,
tr.is-archived .tl-sub {
  opacity: .65;
}
.tl-group td {
  padding: 1.125rem 1rem .375rem !important;
  border-bottom: 1px solid var(--a-line) !important;
  background: var(--a-surface) !important;
}
tbody:first-of-type .tl-group td {
  padding-top: .625rem !important;
}
.tl-group-btn {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  font-size: .9375rem;
  font-weight: 800;
  color: var(--a-fg);
  cursor: pointer;
}
.tl-count {
  padding: 0 .4375rem;
  border-radius: 999px;
  background: var(--a-chip);
  font-size: .75rem;
  color: var(--a-fg-2);
}
.tl-group.is-late .tl-group-name {
  color: var(--a-danger-fg);
}
.tl-group.is-late .tl-count {
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
}
.tl-add td,
.tl-more td {
  border-bottom: 0 !important;
  padding-top: .25rem !important;
  padding-bottom: .25rem !important;
}
.tl-link {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
  height: 1.875rem;
  padding: 0 .5rem;
  margin-left: -.5rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: .875rem;
  font-weight: 700;
  color: var(--a-accent);
  cursor: pointer;
}
.tl-link:hover {
  background: var(--a-chip);
}
.tl-empty {
  padding: 2.5rem 1rem !important;
  text-align: center;
  color: var(--a-muted);
}
.tl-empty .tl-link {
  margin-left: .5rem;
}
</style>
