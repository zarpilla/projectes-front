<template>
  <!-- Redesign A · task detail (phase 2): main column with the description,
       checklist, documents and comments; side column with the task's fields -->
  <b-modal v-model="isModalActive" has-modal-card :width="1040" @cancel="cancel">
    <div class="modal-card task-modal">
      <form class="tm-form" @submit.prevent="submit">
        <header class="modal-card-head tm-head">
          <input
            v-model="form.name"
            class="tm-name"
            name="name"
            placeholder="Nom de la tasca"
            aria-label="Nom de la tasca"
            required
          >
          <button type="button" class="delete" aria-label="Tanca" @click="cancel"></button>
        </header>

        <section class="modal-card-body tm-body">
          <div class="tm-main">
            <!-- description -->
            <section class="tm-section">
              <div class="tm-section-head">
                <h3>Descripció</h3>
                <div v-if="editingDescription" class="tm-toolbar" role="toolbar" aria-label="Format">
                  <button type="button" title="Negreta" @click="wrap('**')"><b>B</b></button>
                  <button type="button" title="Cursiva" @click="wrap('*')"><i>I</i></button>
                  <button type="button" title="Enllaç" @click="insertLink"><b-icon icon="link-variant" custom-size="default" /></button>
                  <button type="button" title="Llista" @click="prefixLines('- ')"><b-icon icon="format-list-bulleted" custom-size="default" /></button>
                  <button type="button" title="Llista numerada" @click="prefixLines('1. ')"><b-icon icon="format-list-numbered" custom-size="default" /></button>
                </div>
                <button v-else type="button" class="tm-link" @click="startEditingDescription">Edita</button>
              </div>
              <textarea
                v-if="editingDescription"
                ref="description"
                v-model="form.description"
                class="textarea tm-description"
                rows="5"
                placeholder="Què cal fer? Admet **negreta**, *cursiva*, llistes amb «- » i enllaços."
              ></textarea>
              <div
                v-else-if="form.description"
                class="tm-rendered content"
                @click="startEditingDescription"
                v-html="descriptionHtml"
              ></div>
              <button v-else type="button" class="tm-empty" @click="startEditingDescription">Afegeix una descripció…</button>
            </section>

            <!-- checklist -->
            <section class="tm-section">
              <div class="tm-section-head">
                <h3>Checklist <span v-if="form.checklist.length" class="tm-count">{{ checklistDone }}/{{ form.checklist.length }}</span></h3>
              </div>
              <div v-if="form.checklist.length" class="bar tm-check-bar"><span :style="{ width: checklistPct + '%' }"></span></div>
              <ul class="tm-checklist">
                <li v-for="(check, j) in form.checklist" :key="j" :class="{ 'is-done': check.done }">
                  <input v-model="check.done" type="checkbox" :aria-label="'Fet: ' + (check.name || '')">
                  <input v-model="check.name" class="tm-check-name" :aria-label="'Element ' + (j + 1)">
                  <date-field
                    v-model="check.due_date"
                    class="tm-check-date"
                    placeholder="Data"
                    icon=""
                    size="is-small"
                    :label="'Data de l\'element ' + (j + 1)"
                  />
                  <select v-model="check.user" class="tm-check-user" :aria-label="'Persona de l\'element ' + (j + 1)">
                    <option :value="null">Ningú</option>
                    <option v-for="u in checkUsers(check)" :key="u.id" :value="u.id">{{ u.username }}</option>
                  </select>
                  <button type="button" class="tm-icon" title="Duplica" @click="duplicatePhase(j)"><b-icon icon="content-copy" custom-size="default" /></button>
                  <button type="button" class="tm-icon" title="Elimina" @click="removePhase(j)"><b-icon icon="close" custom-size="default" /></button>
                </li>
              </ul>
              <div class="tm-check-add">
                <b-icon icon="plus" custom-size="default" />
                <input
                  v-model="checklistToAdd"
                  placeholder="Afegeix un element i prem Retorn"
                  aria-label="Nou element de la checklist"
                  @keydown.enter.prevent="addPhase"
                >
              </div>
            </section>

            <!-- documents -->
            <section class="tm-section">
              <div class="tm-section-head">
                <h3>Documents <span v-if="documentCount" class="tm-count">{{ documentCount }}</span></h3>
                <label class="tm-link">
                  <input type="file" multiple class="is-sr-only" @change="pickFiles">
                  Afegeix fitxers
                </label>
              </div>
              <div v-if="documentCount" class="tm-docs">
                <div v-for="doc in form.documents || []" :key="doc.id" class="tm-doc">
                  <a :href="apiUrl + doc.url" target="_blank" rel="noopener">
                    <img v-if="doc.mime && doc.mime.startsWith('image')" :src="apiUrl + doc.url" alt="">
                    <b-icon v-else icon="file-outline" />
                    <span>{{ doc.name }}</span>
                  </a>
                  <button type="button" class="tm-icon" :aria-label="'Treu ' + doc.name" @click="removeImage(doc)"><b-icon icon="close" custom-size="default" /></button>
                </div>
                <div v-for="(file, k) in pendingFiles" :key="'p' + k" class="tm-doc is-pending">
                  <span><b-icon icon="upload" custom-size="default" />{{ file.name }}</span>
                  <button type="button" class="tm-icon" :aria-label="'Treu ' + file.name" @click="pendingFiles.splice(k, 1)"><b-icon icon="close" custom-size="default" /></button>
                </div>
              </div>
              <p v-if="pendingFiles.length" class="tm-hint">S'adjuntaran en desar la tasca.</p>
            </section>

            <!-- comments -->
            <section class="tm-section">
              <div class="tm-section-head">
                <h3>Comentaris <span v-if="comments.length" class="tm-count">{{ comments.length }}</span></h3>
              </div>
              <p v-if="!isSaved" class="tm-hint">Desa la tasca per poder-hi comentar.</p>
              <template v-else>
                <ul class="tm-comments">
                  <li v-for="c in comments" :key="c.id">
                    <span class="tm-avatar">{{ initials(c.author && c.author.username) }}</span>
                    <div class="tm-comment">
                      <div class="tm-comment-head">
                        <b>{{ c.author ? c.author.username : "—" }}</b>
                        <span class="has-text-muted">{{ when(c.createdAt) }}</span>
                        <span v-if="isMine(c)" class="tm-comment-actions">
                          <button type="button" class="tm-link" @click="editComment(c)">Edita</button>
                          <button type="button" class="tm-link" @click="deleteComment(c)">Esborra</button>
                        </span>
                      </div>
                      <div v-if="editingComment === c.id" class="tm-comment-edit">
                        <textarea v-model="editingText" class="textarea" rows="2" aria-label="Edita el comentari"></textarea>
                        <div class="tm-comment-buttons">
                          <b-button size="is-small" @click="editingComment = null">Cancel·la</b-button>
                          <b-button size="is-small" type="is-primary" @click="saveComment(c)">Desa</b-button>
                        </div>
                      </div>
                      <div v-else class="content tm-comment-text" v-html="markdown(c.text)"></div>
                    </div>
                  </li>
                </ul>
                <div class="tm-composer">
                  <textarea
                    ref="composer"
                    v-model="newComment"
                    class="textarea"
                    rows="2"
                    placeholder="Escriu un comentari. Amb @ avises algú per correu."
                    aria-label="Nou comentari"
                    @input="onComposerInput"
                    @keydown="onComposerKey"
                  ></textarea>
                  <ul v-if="mentionOptions.length" class="tm-mentions" role="listbox" aria-label="Persones">
                    <li
                      v-for="(u, k) in mentionOptions"
                      :key="u.id"
                      role="option"
                      :aria-selected="k === mentionIndex"
                      :class="{ 'is-active': k === mentionIndex }"
                      @mousedown.prevent="pickMention(u)"
                    >{{ u.username }}</li>
                  </ul>
                  <div class="tm-comment-buttons">
                    <span class="tm-hint">Ctrl + Retorn per enviar</span>
                    <b-button size="is-small" type="is-primary" :disabled="!newComment.trim()" :loading="postingComment" @click="postComment">Comenta</b-button>
                  </div>
                </div>
              </template>
            </section>
          </div>

          <aside class="tm-side">
            <div class="field">
              <label class="label" for="tm-state">Estat</label>
              <div class="select is-fullwidth">
                <select id="tm-state" v-model="form.task_state">
                  <option v-for="s in states" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>

            <div class="field">
              <span class="label">Prioritat</span>
              <div class="segmented tm-prio" role="group" aria-label="Prioritat">
                <button
                  v-for="p in priorities"
                  :key="p.value"
                  type="button"
                  :class="['prio-' + p.value, { 'is-on': form.priority === p.value }]"
                  :aria-pressed="form.priority === p.value"
                  @click="form.priority = p.value"
                >{{ p.label }}</button>
              </div>
            </div>

            <b-field label="Persones">
              <b-taginput
                v-model="form.users_permissions_users"
                :data="filteredUsers"
                field="username"
                autocomplete
                :open-on-focus="true"
                :allow-new="false"
                placeholder="Afegeix-hi algú"
                aria-close-label="Treu"
                @typing="userNameSearch = $event"
              />
            </b-field>

            <b-field label="Projecte">
              <b-autocomplete
                v-model="projectSearch"
                placeholder="Sense projecte"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProject"
                field="name"
                :clearable="!projectLocked"
                :disabled="projectLocked"
                @select="projectSelected"
              />
            </b-field>

            <div v-if="activityTypeOptions.length" class="field">
              <label class="label" for="tm-function">Funció</label>
              <div class="select is-fullwidth">
                <select id="tm-function" v-model="form.activity_type">
                  <option :value="null">Sense funció</option>
                  <option v-for="a in activityTypeOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
                </select>
              </div>
            </div>

            <div class="tm-dates">
              <div class="field">
                <span class="label">Inici</span>
                <date-field v-model="form.start_date" label="Inici" placeholder="—" icon="" :max="form.due_date" />
              </div>
              <div class="field">
                <span class="label">Data límit</span>
                <date-field v-model="form.due_date" label="Data límit" placeholder="—" icon="" :min="form.start_date" />
              </div>
            </div>

            <div class="field">
              <label class="label" for="tm-recurrence">Es repeteix</label>
              <div class="select is-fullwidth">
                <select id="tm-recurrence" v-model="form.recurrence">
                  <option v-for="r in recurrences" :key="String(r.value)" :value="r.value">{{ r.label }}</option>
                </select>
              </div>
              <p v-if="form.recurrence" class="help">En acabar-la se'n crea la següent, amb les dates mogudes.</p>
            </div>

            <div class="field tm-hours">
              <span class="label">Hores</span>
              <div class="tm-hours-row">
                <label class="tm-estimate">
                  <span>Estimades</span>
                  <input v-model="form.estimated_hours" type="number" min="0" step="0.25" class="input" aria-label="Hores estimades">
                </label>
                <div class="tm-logged">
                  <span>Fetes</span>
                  <b :class="{ 'has-text-neg': hoursInfo.over }">{{ formatHours(hoursInfo.done) }}</b>
                </div>
              </div>
              <div v-if="hoursInfo.estimate" class="bar"><span :class="{ over: hoursInfo.over }" :style="{ width: hoursInfo.ratio * 100 + '%' }"></span></div>
              <b-button
                v-if="isSaved"
                size="is-small"
                icon-left="clock-plus-outline"
                class="tm-log"
                @click="$emit('log-hours', currentForm())"
              >Imputa hores</b-button>
            </div>

            <p v-if="isSaved && createdLabel" class="tm-meta">{{ createdLabel }}</p>
          </aside>
        </section>

        <footer class="modal-card-foot tm-foot">
          <b-button v-if="isSaved" type="is-ghost" class="tm-archive" @click="trashModal(form)">Arxiva</b-button>
          <span class="tm-spacer"></span>
          <b-button @click="cancel">Cancel·la</b-button>
          <b-button type="is-primary" native-type="submit" :disabled="!form.name">Desa</b-button>
        </footer>
      </form>
    </div>
    <modal-box
      :is-active="isDeleteModalActive"
      :trash-object-name="trashObjectName"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />
  </b-modal>
</template>

<script>
import service from "@/service/index";
import ModalBox from "@/components/ModalBox.vue";
import DateField from "@/components/DateField.vue";
import moment from "moment";
import getConfig from "@/config";
import { currentUserId } from "@/domain/currentUser";
import { renderMarkdown } from "@/domain/markdown";
import {
  PRIORITIES, RECURRENCES, priorityOf, taskHours, formatHours, mentionQuery, insertMention, mentionedIds, updatedLabel
} from "@/domain/tasks";

const idOf = value => (value && typeof value === "object" ? value.id || null : value || null);

const emptyForm = () => ({
  id: -1,
  name: "",
  description: "",
  due_date: null,
  start_date: null,
  task_state: null,
  users_permissions_users: [],
  project: null,
  activity_type: null,
  priority: "normal",
  recurrence: null,
  estimated_hours: null,
  checklist: [],
  documents: []
});

export default {
  name: "ModalBoxTask",
  emits: ["cancel", "delete", "submit", "log-hours"],
  components: { ModalBox, DateField },
  props: {
    isActive: { type: Boolean, default: false },
    taskObject: { type: Object, default: null },
    users: { type: Array, default: () => [] },
    projects: { type: Array, default: () => [] },
    project: { type: Number, default: null },
    states: { type: Array, default: () => [] },
    // hours logged per task id (GET tasks/hours)
    loggedHours: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      isModalActive: false,
      form: emptyForm(),
      projectSearch: "",
      userNameSearch: "",
      projectGlobalTypes: [],
      trashObject: null,
      isDeleteModalActive: false,
      apiUrl: "",
      checklistToAdd: "",
      editingDescription: false,
      checklistPeople: [],
      pendingFiles: [],
      comments: [],
      newComment: "",
      postingComment: false,
      mention: null,
      mentionIndex: 0,
      editingComment: null,
      editingText: "",
      priorities: PRIORITIES,
      recurrences: RECURRENCES
    };
  },
  created() {
    this.apiUrl = getConfig().VUE_APP_API_URL;
  },
  computed: {
    isSaved() {
      return !!this.form.id && this.form.id > 0;
    },
    projectLocked() {
      return !!(this.taskObject && this.taskObject.project && this.project);
    },
    filteredUsers() {
      const q = (this.userNameSearch || "").toLowerCase();
      const chosen = new Set((this.form.users_permissions_users || []).map(u => u.id));
      return this.users.filter(u => !chosen.has(u.id) && String(u.username).toLowerCase().includes(q));
    },
    filteredProject() {
      const q = (this.projectSearch || "").toLowerCase();
      return this.projects.filter(p => String(p.name).toLowerCase().includes(q));
    },
    activityTypeOptions() {
      return this.projectGlobalTypes || [];
    },
    descriptionHtml() {
      return renderMarkdown(this.form.description);
    },
    checklistDone() {
      return this.form.checklist.filter(c => c.done).length;
    },
    checklistPct() {
      return this.form.checklist.length ? (this.checklistDone / this.form.checklist.length) * 100 : 0;
    },
    documentCount() {
      return (this.form.documents || []).length + this.pendingFiles.length;
    },
    hoursInfo() {
      return taskHours({ id: this.form.id, estimated_hours: this.form.estimated_hours }, this.loggedHours);
    },
    mentionOptions() {
      if (this.mention === null) return [];
      const q = this.mention.toLowerCase();
      return this.users.filter(u => String(u.username).toLowerCase().startsWith(q)).slice(0, 6);
    },
    createdLabel() {
      const t = this.taskObject || {};
      const by = t.created && t.created.username ? ` per ${t.created.username}` : "";
      return t.createdAt ? `Creada ${updatedLabel(t.createdAt)}${by}` : "";
    },
    trashObjectName() {
      return this.trashObject ? this.trashObject.name : null;
    }
  },
  watch: {
    isActive(value) {
      this.isModalActive = value;
      if (value) this.show();
    }
  },
  methods: {
    formatHours,
    markdown: renderMarkdown,
    checkUsers(check) {
      if (!check.user || this.users.some(u => u.id === check.user)) return this.users;
      const person = this.checklistPeople.find(u => u.id === check.user);
      return person ? [...this.users, person] : this.users;
    },
    initials(name) {
      const words = String(name || "").split(/[\s._@-]+/).filter(Boolean);
      return words.slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
    },
    when(date) {
      return date ? moment(date).format("DD/MM/YYYY HH:mm") : "";
    },
    show() {
      if (!this.taskObject) return;
      const t = JSON.parse(JSON.stringify(this.taskObject));
      const form = { ...emptyForm(), ...t };
      form.id = t.id && t.id > 0 ? t.id : -1;
      form.task_state = idOf(t.task_state) || (this.states[0] && this.states[0].id) || null;
      form.priority = priorityOf(t);
      form.recurrence = t.recurrence || null;
      form.description = t.description || "";
      form.users_permissions_users = (t.users_permissions_users || []).filter(Boolean);
      // people of the checklist that are not in the list (hidden ones), so the select shows them
      this.checklistPeople = (t.checklist || []).map(c => c.user).filter(u => u && typeof u === "object" && u.id);
      form.checklist = (t.checklist || []).map(c => ({ ...c, user: idOf(c.user), due_date: c.due_date || null }));
      form.documents = t.documents || [];
      const project = t.project && typeof t.project === "object" ? t.project : this.projects.find(p => p.id === t.project);
      form.project = project ? project.id : null;
      this.projectSearch = project ? project.name : "";
      this.loadActivityTypes(project);
      form.activity_type = idOf(t.activity_type);
      this.form = form;
      this.pendingFiles = [];
      this.checklistToAdd = "";
      this.editingDescription = !form.description;
      this.comments = [];
      this.newComment = "";
      this.mention = null;
      this.editingComment = null;
      if (this.isSaved) this.loadComments();
    },
    loadActivityTypes(project) {
      const full = project && (project.global_activity_types ? project : this.projects.find(p => p.id === project.id));
      this.projectGlobalTypes = (full && full.global_activity_types) || [];
      if (this.form.activity_type && !this.projectGlobalTypes.some(a => a.id === this.form.activity_type)) {
        this.form.activity_type = null;
      }
    },
    projectSelected(option) {
      this.form.project = option ? option.id : null;
      this.loadActivityTypes(option);
    },
    // the form as it is sent: ids for relations, dates as YYYY-MM-DD or null
    currentForm() {
      const form = JSON.parse(JSON.stringify(this.form));
      form.task_state = idOf(form.task_state);
      form.project = idOf(form.project);
      // no Funció: null (it sent 0 or { id: 0 })
      form.activity_type = idOf(form.activity_type);
      form.due_date = form.due_date || null;
      form.start_date = form.start_date || null;
      form.estimated_hours = form.estimated_hours === "" || form.estimated_hours === null ? null : Number(form.estimated_hours);
      form.checklist = (form.checklist || []).map(c => ({ ...c, user: idOf(c.user), due_date: c.due_date || null }));
      return form;
    },
    submit() {
      if (!this.form.name) return;
      const form = this.currentForm();
      if (this.pendingFiles.length) form._files = this.pendingFiles.slice();
      this.$emit("submit", form);
    },
    cancel() {
      this.isModalActive = false;
      this.$emit("cancel");
    },
    trashModal(trashObject) {
      this.trashObject = trashObject;
      this.isDeleteModalActive = true;
    },
    trashCancel() {
      this.isDeleteModalActive = false;
    },
    trashConfirm() {
      this.isDeleteModalActive = false;
      this.$emit("delete", this.form);
    },
    // ---- description
    async startEditingDescription() {
      this.editingDescription = true;
      await this.$nextTick();
      if (this.$refs.description) this.$refs.description.focus();
    },
    edit(fn) {
      const el = this.$refs.description;
      const text = this.form.description || "";
      const start = el ? el.selectionStart : text.length;
      const end = el ? el.selectionEnd : text.length;
      const { value, caretStart, caretEnd } = fn(text, start, end);
      this.form.description = value;
      this.$nextTick(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(caretStart, caretEnd);
      });
    },
    wrap(mark) {
      this.edit((text, start, end) => {
        const selected = text.slice(start, end) || "text";
        return {
          value: text.slice(0, start) + mark + selected + mark + text.slice(end),
          caretStart: start + mark.length,
          caretEnd: start + mark.length + selected.length
        };
      });
    },
    insertLink() {
      this.edit((text, start, end) => {
        const label = text.slice(start, end) || "enllaç";
        const link = `[${label}](https://)`;
        const urlAt = start + label.length + 3;
        return { value: text.slice(0, start) + link + text.slice(end), caretStart: urlAt, caretEnd: urlAt + 8 };
      });
    },
    prefixLines(prefix) {
      this.edit((text, start, end) => {
        const lineStart = text.lastIndexOf("\n", start - 1) + 1;
        const block = text.slice(lineStart, end) || "";
        const numbered = prefix !== "- ";
        const lines = block.split("\n").map((l, i) => (numbered ? `${i + 1}. ` : prefix) + l);
        const value = text.slice(0, lineStart) + lines.join("\n") + text.slice(end);
        const caret = lineStart + lines.join("\n").length;
        return { value, caretStart: caret, caretEnd: caret };
      });
    },
    // ---- checklist
    addPhase() {
      const name = this.checklistToAdd.trim();
      if (!name) return;
      this.form.checklist.push({
        name,
        done: false,
        user: null,
        due_date: null,
        // who adds it (the `user` prop it read was the board's Persona filter, an id
        // in a prop declared as an object, and empty on a project's board)
        created: currentUserId(),
        created_date: new Date()
      });
      this.checklistToAdd = "";
    },
    removePhase(i) {
      this.form.checklist = this.form.checklist.filter((p, j) => i !== j);
    },
    duplicatePhase(i) {
      const elem = { ...this.form.checklist[i], done: false };
      delete elem.id;
      this.form.checklist.splice(i + 1, 0, elem);
    },
    // ---- documents: kept until the task is saved (a new task has no id yet)
    pickFiles(event) {
      this.pendingFiles.push(...Array.from(event.target.files || []));
      event.target.value = "";
    },
    removeImage(doc) {
      this.form.documents = this.form.documents.filter(d => d.id !== doc.id);
    },
    // ---- comments
    isMine(comment) {
      return comment.author && comment.author.id === currentUserId();
    },
    async loadComments() {
      try {
        this.comments = (await service({ requiresAuth: true }).get(`task-comments?_limit=-1&_where[task.id_eq]=${this.form.id}&_sort=createdAt:ASC`)).data || [];
      } catch {
        this.comments = [];
      }
    },
    onComposerInput(event) {
      this.mention = mentionQuery(this.newComment, event.target.selectionStart);
      this.mentionIndex = 0;
    },
    onComposerKey(event) {
      if (this.mentionOptions.length) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          this.mentionIndex = (this.mentionIndex + 1) % this.mentionOptions.length;
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          this.mentionIndex = (this.mentionIndex + this.mentionOptions.length - 1) % this.mentionOptions.length;
          return;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          this.pickMention(this.mentionOptions[this.mentionIndex]);
          return;
        }
        if (event.key === "Escape") {
          event.stopPropagation();
          this.mention = null;
          return;
        }
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.postComment();
      }
    },
    pickMention(user) {
      const el = this.$refs.composer;
      const caret = el ? el.selectionStart : this.newComment.length;
      const r = insertMention(this.newComment, caret, user.username);
      this.newComment = r.text;
      this.mention = null;
      this.$nextTick(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(r.caret, r.caret);
      });
    },
    async postComment() {
      const text = this.newComment.trim();
      if (!text || !this.isSaved || this.postingComment) return;
      this.postingComment = true;
      try {
        await service({ requiresAuth: true }).post("task-comments", {
          text,
          task: this.form.id,
          mentions: mentionedIds(text, this.users)
        });
        this.newComment = "";
        await this.loadComments();
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar el comentari", type: "is-danger", queue: false });
      } finally {
        this.postingComment = false;
      }
    },
    editComment(c) {
      this.editingComment = c.id;
      this.editingText = c.text;
    },
    async saveComment(c) {
      try {
        await service({ requiresAuth: true }).put(`task-comments/${c.id}`, { text: this.editingText });
        this.editingComment = null;
        await this.loadComments();
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar el comentari", type: "is-danger", queue: false });
      }
    },
    deleteComment(c) {
      this.$buefy.dialog.confirm({
        message: "Esborrar el comentari?",
        confirmText: "Esborra",
        cancelText: "Cancel·la",
        type: "is-danger",
        onConfirm: async () => {
          await service({ requiresAuth: true }).delete(`task-comments/${c.id}`);
          await this.loadComments();
        }
      });
    }
  }
};
</script>

<style scoped>
.task-modal {
  width: min(1040px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
}
.tm-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: inherit;
}
.tm-head {
  gap: .75rem;
}
.tm-name {
  flex: 1;
  min-width: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: .25rem .5rem;
  margin-left: -.5rem;
  background: transparent;
  font: inherit;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--a-fg);
}
.tm-name:hover,
.tm-name:focus {
  border-color: var(--a-input);
  background: var(--a-surface);
  outline: none;
}
.tm-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18.5rem;
  gap: 1.5rem;
  overflow: auto;
}
@media (max-width: 820px) {
  .tm-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .tm-side {
    order: -1;
  }
}
.tm-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}
.tm-section-head {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .5rem;
}
.tm-section-head h3 {
  font-size: .9375rem;
  font-weight: 800;
  margin-right: auto;
}
.tm-count {
  padding: 0 .4375rem;
  margin-left: .25rem;
  border-radius: 999px;
  background: var(--a-chip);
  font-size: .75rem;
  color: var(--a-fg-2);
}
.tm-toolbar {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--a-line);
  border-radius: 8px;
}
.tm-toolbar button,
.tm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.875rem;
  height: 1.875rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--a-fg-2);
  font: inherit;
  cursor: pointer;
}
.tm-toolbar button:hover,
.tm-icon:hover {
  background: var(--a-chip);
  color: var(--a-fg);
}
.tm-link {
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  font-size: .8125rem;
  font-weight: 700;
  color: var(--a-accent);
  cursor: pointer;
}
.tm-rendered {
  padding: .5rem .75rem;
  margin: 0 -.75rem;
  border-radius: 8px;
  cursor: text;
}
.tm-rendered:hover {
  background: var(--a-thead);
}
.tm-rendered :deep(p),
.tm-comment-text :deep(p) {
  margin-bottom: .5rem;
}
.tm-empty {
  width: 100%;
  padding: .75rem;
  border: 1px dashed var(--a-input);
  border-radius: 8px;
  background: transparent;
  font: inherit;
  color: var(--a-muted);
  text-align: left;
  cursor: text;
}
.tm-check-bar {
  margin-bottom: .5rem;
}
.tm-checklist li {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .25rem 0;
  border-bottom: 1px solid var(--a-line-soft);
}
.tm-checklist input[type=checkbox] {
  width: 1.0625rem;
  height: 1.0625rem;
  accent-color: var(--a-accent);
  flex: none;
}
.tm-check-name {
  flex: 1;
  min-width: 6rem;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: .25rem .375rem;
  background: transparent;
  font: inherit;
  color: var(--a-fg);
}
.tm-checklist li.is-done .tm-check-name {
  text-decoration: line-through;
  color: var(--a-muted);
}
.tm-check-date {
  width: 7.5rem;
  flex: none;
}
.tm-check-date :deep(.input) {
  height: 1.875rem;
  padding: 0 .375rem;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.tm-check-date :deep(.input:hover),
.tm-check-date :deep(.input:focus) {
  border-color: var(--a-input);
  background: var(--a-surface);
}
.tm-check-user {
  height: 1.875rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: .8125rem;
  color: var(--a-fg-2);
  max-width: 9rem;
}
.tm-check-name:hover,
.tm-check-name:focus,
.tm-check-user:hover,
.tm-check-user:focus {
  border-color: var(--a-input);
  background: var(--a-surface);
}
.tm-check-add {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .375rem 0;
  color: var(--a-muted);
}
.tm-check-add input {
  flex: 1;
  border: 0;
  background: transparent;
  font: inherit;
  color: var(--a-fg);
  outline: none;
}
.tm-docs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: .5rem;
}
.tm-doc {
  position: relative;
  display: flex;
  align-items: flex-start;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  padding: .375rem;
  font-size: .8125rem;
  min-width: 0;
}
.tm-doc a,
.tm-doc > span {
  display: flex;
  flex-direction: column;
  gap: .25rem;
  min-width: 0;
  flex: 1;
  color: var(--a-fg-2);
}
.tm-doc img {
  width: 100%;
  height: 5rem;
  object-fit: cover;
  border-radius: 6px;
}
.tm-doc a span,
.tm-doc > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tm-doc.is-pending {
  border-style: dashed;
}
.tm-hint {
  margin-top: .375rem;
  font-size: .8125rem;
  color: var(--a-muted);
}
.tm-comments li {
  display: flex;
  gap: .625rem;
  padding: .625rem 0;
  border-bottom: 1px solid var(--a-line-soft);
}
.tm-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--a-accent-soft);
  color: var(--a-accent);
  font-size: .6875rem;
  font-weight: 800;
}
.tm-comment {
  flex: 1;
  min-width: 0;
}
.tm-comment-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: .25rem .5rem;
  font-size: .8125rem;
}
.tm-comment-actions {
  margin-left: auto;
  display: inline-flex;
  gap: .75rem;
}
.tm-comment-text {
  margin-top: .125rem;
  font-size: .875rem;
}
.tm-composer {
  position: relative;
  margin-top: .75rem;
}
.tm-comment-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: .5rem;
  margin-top: .375rem;
}
.tm-comment-buttons .tm-hint {
  margin: 0 auto 0 0;
}
.tm-mentions {
  position: absolute;
  z-index: 5;
  left: .5rem;
  top: 100%;
  margin-top: -2.25rem;
  min-width: 12rem;
  padding: .25rem;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  background: var(--a-surface);
  box-shadow: 0 8px 24px rgba(16, 32, 30, .12);
}
.tm-mentions li {
  padding: .375rem .5rem;
  border-radius: 6px;
  cursor: pointer;
}
.tm-mentions li.is-active,
.tm-mentions li:hover {
  background: var(--a-accent-soft);
  color: var(--a-accent-hover);
}
.tm-side {
  display: flex;
  flex-direction: column;
  gap: .875rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--a-thead);
  align-self: start;
}
.tm-side .field {
  margin: 0;
}
.tm-side .label,
.tm-side :deep(.label) {
  font-size: .8125rem;
  margin-bottom: .25rem;
}
.tm-prio {
  display: flex;
}
.tm-prio button {
  flex: 1;
}
.tm-prio .prio-high.is-on {
  color: var(--a-neg);
}
.tm-dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .5rem;
}
.tm-dates :deep(.input) {
  padding: 0 .5rem;
  font-size: .875rem;
}
.tm-hours-row {
  display: flex;
  gap: .75rem;
  align-items: flex-end;
  margin-bottom: .375rem;
}
.tm-estimate,
.tm-logged {
  display: flex;
  flex-direction: column;
  gap: .125rem;
  font-size: .75rem;
  color: var(--a-muted);
}
.tm-estimate .input {
  width: 5.5rem;
  height: 2.25rem;
}
.tm-logged b {
  font-size: 1rem;
  line-height: 2.25rem;
  color: var(--a-fg);
}
.tm-log {
  margin-top: .5rem;
}
.tm-meta {
  font-size: .75rem;
  color: var(--a-muted);
}
.tm-foot {
  gap: .5rem;
}
.bar {
  height: 6px;
  border-radius: 3px;
  background: var(--a-seg);
  overflow: hidden;
}
.bar > span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--a-accent);
}
.bar > span.over {
  background: var(--a-over);
}
.tm-spacer {
  flex: 1;
}
.tm-archive {
  color: var(--a-danger-fg);
}
</style>
