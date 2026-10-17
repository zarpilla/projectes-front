<template>
  <!-- Task templates of a project's board/list: save its open tasks as a template
       (dates as days from the first one) or create a template's tasks here -->
  <div class="task-templates">
    <b-dropdown aria-role="list" position="is-bottom-left">
      <template #trigger>
        <b-button size="is-small" icon-left="content-duplicate" icon-right="menu-down">Plantilles</b-button>
      </template>
      <b-dropdown-item aria-role="listitem" @click="openApply">Aplica una plantilla…</b-dropdown-item>
      <b-dropdown-item aria-role="listitem" :disabled="!tasks.length" @click="openSave">
        Desa aquestes {{ tasks.length }} tasques com a plantilla…
      </b-dropdown-item>
    </b-dropdown>

    <b-modal v-model="applyOpen" has-modal-card :width="560">
      <div class="modal-card tt-modal">
        <header class="modal-card-head"><p class="modal-card-title">Aplica una plantilla</p></header>
        <section class="modal-card-body">
          <p v-if="!templates.length" class="has-text-muted">
            Encara no hi ha cap plantilla. Desa les tasques d'un projecte com a plantilla per reutilitzar-les.
          </p>
          <template v-else>
            <div class="field">
              <label class="label" for="tt-template">Plantilla</label>
              <div class="select is-fullwidth">
                <select id="tt-template" v-model="chosenId">
                  <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }} ({{ (t.items || []).length }})</option>
                </select>
              </div>
            </div>
            <div class="field">
              <span class="label">Comença el</span>
              <date-field v-model="from" label="Comença el" class="tt-date" />
              <p class="help">Les dates de les tasques es compten a partir d'aquest dia.</p>
            </div>
            <div class="field">
              <label class="label" for="tt-person">Assigna-les a</label>
              <div class="select is-fullwidth">
                <select id="tt-person" v-model="assignTo">
                  <option :value="null">Ningú</option>
                  <option v-for="u in users" :key="u.id" :value="u.id">{{ u.username }}</option>
                </select>
              </div>
            </div>
            <ul v-if="preview.length" class="tt-preview">
              <li v-for="(t, i) in preview" :key="i">
                <span>{{ t.name }}</span>
                <span class="has-text-muted">{{ t.due_date ? formatDate(t.due_date) : "sense data" }}</span>
              </li>
            </ul>
          </template>
        </section>
        <footer class="modal-card-foot tt-foot">
          <b-button v-if="chosen" type="is-ghost" class="tt-delete" @click="deleteTemplate">Esborra la plantilla</b-button>
          <span class="tt-spacer"></span>
          <b-button @click="applyOpen = false">Cancel·la</b-button>
          <b-button type="is-primary" :disabled="!chosen || !from" :loading="busy" @click="apply">
            Crea {{ preview.length }} tasques
          </b-button>
        </footer>
      </div>
    </b-modal>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import DateField from "@/components/DateField.vue";
import { currentUserId } from "@/domain/currentUser";
import { templateItems, tasksFromTemplate } from "@/domain/tasks";

export default {
  name: "TaskTemplates",
  components: { DateField },
  props: {
    project: { type: Number, required: true },
    // the project's open tasks, saved by "Desa…"
    tasks: { type: Array, default: () => [] },
    states: { type: Array, default: () => [] },
    users: { type: Array, default: () => [] }
  },
  emits: ["applied"],
  data() {
    return {
      applyOpen: false,
      templates: [],
      chosenId: null,
      from: moment().format("YYYY-MM-DD"),
      // the logged-in person by default: tasks without anyone would not show
      // under the Persona filter
      assignTo: currentUserId(),
      busy: false
    };
  },
  computed: {
    chosen() {
      return this.templates.find(t => t.id === this.chosenId) || null;
    },
    firstStateId() {
      const first = this.states.length && this.states.reduce((a, b) => ((b.order ?? 0) < (a.order ?? 0) ? b : a));
      return first ? first.id : null;
    },
    preview() {
      if (!this.chosen || !this.from) return [];
      return tasksFromTemplate(this.chosen.items, { project: this.project, from: this.from, stateId: this.firstStateId });
    }
  },
  methods: {
    formatDate(d) {
      return moment(d).format("DD/MM/YYYY");
    },
    async loadTemplates() {
      this.templates = (await service({ requiresAuth: true }).get("task-templates?_limit=-1&_sort=name:ASC")).data || [];
      if (!this.chosen) this.chosenId = this.templates.length ? this.templates[0].id : null;
    },
    async openApply() {
      await this.loadTemplates();
      this.applyOpen = true;
    },
    openSave() {
      this.$buefy.dialog.prompt({
        title: "Desa com a plantilla",
        message: `Les ${this.tasks.length} tasques, amb les dates comptades des de la primera, la Funció, la prioritat, les hores estimades i la checklist. No s'hi guarden les persones.`,
        inputAttrs: { placeholder: "Nom de la plantilla", maxlength: 120 },
        confirmText: "Desa",
        cancelText: "Cancel·la",
        trapFocus: true,
        onConfirm: async name => {
          await service({ requiresAuth: true }).post("task-templates", { name, items: templateItems(this.tasks) });
          this.$buefy.snackbar.open({ message: `Plantilla «${name}» desada`, queue: false });
        }
      });
    },
    async apply() {
      if (!this.chosen || this.busy) return;
      this.busy = true;
      try {
        const tasks = tasksFromTemplate(this.chosen.items, {
          project: this.project,
          from: this.from,
          stateId: this.firstStateId,
          createdBy: currentUserId(),
          users: this.assignTo ? [this.assignTo] : []
        });
        for (const t of tasks) {
          await service({ requiresAuth: true }).post("tasks", t);
        }
        this.applyOpen = false;
        this.$buefy.snackbar.open({ message: `${tasks.length} tasques creades`, queue: false });
        this.$emit("applied");
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'han pogut crear totes les tasques", type: "is-danger", queue: false });
        this.$emit("applied");
      } finally {
        this.busy = false;
      }
    },
    deleteTemplate() {
      const t = this.chosen;
      this.$buefy.dialog.confirm({
        message: `Esborrar la plantilla «${t.name}»? Les tasques ja creades no canvien.`,
        confirmText: "Esborra",
        cancelText: "Cancel·la",
        type: "is-danger",
        onConfirm: async () => {
          await service({ requiresAuth: true }).delete(`task-templates/${t.id}`);
          this.chosenId = null;
          await this.loadTemplates();
        }
      });
    }
  }
};
</script>

<style scoped>
.tt-date {
  max-width: 11rem;
}
.tt-preview {
  margin-top: .75rem;
  border-top: 1px solid var(--a-line);
}
.tt-preview li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: .375rem 0;
  border-bottom: 1px solid var(--a-line-soft);
  font-size: .875rem;
}
.tt-foot {
  gap: .5rem;
}
.tt-spacer {
  flex: 1;
}
.tt-delete {
  color: var(--a-danger-fg);
}
</style>
