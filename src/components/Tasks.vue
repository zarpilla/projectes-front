<template>
  <div>
    <modal-box-task
      :is-active="isModalActive"
      :task-object="taskObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
      @delete="modalDelete"
      :users="users"
      :projects="projects"
      :project="project"
      :states="states"
      :logged-hours="loggedHours"
      @log-hours="logHours"
    />
    <modal-box-dedication
      :is-active="isHoursModalActive"
      :dedication-object="hoursObject"
      :projects="projects"
      :users="users"
      :saving="savingHours"
      @submit="saveHours"
      @cancel="isHoursModalActive = false"
      @delete="isHoursModalActive = false"
    />
    <tasks-list
      v-if="mode === 'list'"
      :tasks="listTasks"
      :states="states"
      :users="users"
      :group-by="groupBy"
      :logged-hours="loggedHours"
      @open="showTask"
      @add="addTask(null, $event)"
      @update="updateTasks"
    />
    <!-- Redesign A: one column per state (or activity type), quiet cards; the
         drag and drop zones are the same as before -->
    <div v-else class="tasks-board">
      <div v-for="(state, i) in lists" :key="state.id" class="task-list-content">
        <div class="task-list-header">
          <span class="task-list-name">{{ state.name }}</span>
          <span class="task-count">{{ shownCount(i) }}</span>
          <button
            class="task-add"
            type="button"
            :title="'Afegeix una tasca a ' + state.name"
            :aria-label="'Afegeix una tasca a ' + state.name"
            @click.prevent="addTask(state)"
          >
            <b-icon icon="plus" custom-size="default" />
          </button>
        </div>
        <div class="task-list-body">
          <div
            v-if="maxCardsInState[i] > 0"
            class="empty-zone-no-card-first drop-zone"
            :class="{ 'drop-zone-active': dragOver === -10 && dragOverState == i }"
            @drop="onDrop(i, -10, $event, state)"
            @dragover.prevent="onDragOver(i, -10, $event, state)"
            @dragenter.prevent="onDragEnter($event, state)"
          ></div>

          <div
            v-for="{ task, j } in shownCards(i)"
            :key="task.id"
            class="card-and-drop drop-zone"
            :class="{ 'drop-zone-active': dragOver === j && dragOverState == i }"
            @drop="onDrop(i, j * 10, $event, state)"
            @dragover.prevent="onDragOver(i, j, $event, state)"
            @dragenter.prevent="onDragEnter($event, state)"
          >
            <div class="card task-card" draggable="true" @dragstart="startDrag($event, task)">
              <div class="content clickable" @click.prevent="showTask(task)">
                <img
                  v-if="task.documents && task.documents.length && task.documents[0].mime && task.documents[0].mime.startsWith('image')"
                  :src="apiUrl + task.documents[0].url"
                  class="task-img"
                  alt=""
                />
                <p class="task-title">
                  <span v-if="task.priority === 'high'" class="task-prio" title="Prioritat alta">Alta</span>
                  {{ task.name }}
                </p>
                <p v-if="!projectInfo" class="task-project">{{ task.project ? task.project.name : "Sense projecte" }}</p>
                <p v-if="task.description" class="task-desc">{{ plainText(task.description) }}</p>
                <div class="task-foot">
                  <span v-if="task.due_date" class="task-chip" :class="{ 'is-overdue': isOverdue(task) }">
                    {{ isOverdue(task) ? "Vençuda " : "" }}{{ formatShortDate(task.due_date) }}
                  </span>
                  <span
                    v-if="task.checklist && task.checklist.length"
                    class="task-chip"
                    :class="{ 'is-done': task.checklist.length === task.checklist.filter(c => c.done).length }"
                    title="Llista de comprovació"
                  >
                    <b-icon icon="check" custom-size="default" />
                    {{ task.checklist.filter(c => c.done).length }}/{{ task.checklist.length }}
                  </span>
                  <span v-if="task.task_comments && task.task_comments.length" class="task-chip" title="Comentaris">
                    <b-icon icon="comment-outline" custom-size="default" />{{ task.task_comments.length }}
                  </span>
                  <span v-if="loggedHours[task.id] || task.estimated_hours" class="task-chip" :class="{ 'is-overdue': hoursOf(task).over }" title="Hores fetes / estimades">
                    <b-icon icon="clock-outline" custom-size="default" />{{ formatHours(hoursOf(task).done) }}<template v-if="hoursOf(task).estimate !== null">/{{ formatHours(hoursOf(task).estimate) }}</template>
                  </span>
                  <span v-if="task.recurrence" class="task-chip" :title="recurrenceLabel(task.recurrence)"><b-icon icon="repeat" custom-size="default" /></span>
                  <span v-if="view === 'state' && task.activity_type && task.activity_type.name" class="task-chip is-type">{{ task.activity_type.name }}</span>
                  <span v-if="view === 'list' && task.task_state" class="task-chip is-type">{{ task.task_state.name }}</span>
                  <span class="task-people">
                    <span
                      v-for="u in task.users_permissions_users"
                      :key="u.id"
                      class="task-avatar"
                      :title="u.username"
                    >{{ initials(u.username) }}</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="empty-zone"></div>
          </div>

          <div
            class="empty-zone-no-card drop-zone"
            :class="{ 'drop-zone-active': dragOver === 99999 && dragOverState == i }"
            @drop="onDrop(i, 99999, $event, state)"
            @dragover.prevent="onDragOver(i, 99999, $event, state)"
            @dragenter.prevent="onDragEnter($event, state)"
          ></div>
          <button v-if="hiddenCount(i)" class="task-more" type="button" @click="expanded = { ...expanded, [state.id]: true }">
            Mostra'n {{ hiddenCount(i) }} més
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Notification from "@/components/Notification.vue";
import ModalBoxTask from "@/components/ModalBoxTask.vue";
import TasksList from "@/components/TasksList.vue";
import ModalBoxDedication from "@/components/ModalBoxDedication.vue";
import CardComponent from "@/components/CardComponent.vue";
import TitleBar from "@/components/TitleBar.vue";
import HeroBar from "@/components/HeroBar.vue";
// import Tiles from "@/components/Tiles.vue";
import service from "@/service/index";
import moment from "moment";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import _ from "lodash";
import getConfig from '@/config'
import { currentUserId } from "@/domain/currentUser";
import { isOverdue, isDone, filterTasks, tasksQuery, kanbanViewQuery, taskHours, formatHours, recurrenceLabel } from "@/domain/tasks";
import { markdownToText } from "@/domain/markdown";

moment.locale("ca");

const CARD_LIMIT = 12;

export default {
  name: "Tasks",
  components: {
    HeroBar,
    TitleBar,
    CardComponent,
    ModalBoxTask,
    Notification,
    TasksList,
    ModalBoxDedication,
  },
  data() {
    return {
      isLoading: false,
      tasks: [],
      states: [],
      userNameSearch: "",
      projectNameSearch: "",
      // users: [],
      filters: {
        user: null,
        project: null,
      },
      dragOver: -1,
      dragOverState: -1,
      cardOrder: [],
      taskObject: null,
      isModalActive: false,
      cardOrderViewSorted: [],
      today: moment().format('YYYY-MM-DD'),
      kanbanViewId: null,
      kanbanViewDb: null,
      // columns showing all their cards (the others show the first CARD_LIMIT)
      expanded: {},
      apiUrl: import.meta.env.VUE_APP_API_URL,
      // hours logged per task (GET tasks/hours), and the "Imputa hores" modal
      loggedHours: {},
      isHoursModalActive: false,
      hoursObject: null,
      savingHours: false
    };
  },
  props: {
    user: {
      type: Number,
      default: null,
    },
    project: {
      type: Number,
      default: null,
    },
    projectInfo: {
      type: Object,
      default: null,
    },
    projects: {
      type: Array,
      default: [],
    },
    users: {
      type: Array,
      default: [],
    },
    view: {
      type: String,
      default: 'list'
    },
    // text filter of the board (name, description, project)
    search: {
      type: String,
      default: ''
    },
    // 'board' (columns) or 'list' (grouped table, TasksList)
    mode: {
      type: String,
      default: 'board'
    },
    // list only: { state, due, activityType } (see filterTasks) and its grouping
    listFilters: {
      type: Object,
      default: () => ({})
    },
    groupBy: {
      type: String,
      default: 'due'
    },
    // list only: archived tasks too, to restore them
    showArchived: {
      type: Boolean,
      default: false
    }
  },
  emits: ["summary"],
  watch: {
    user: function (newVal, oldVal) {
      this.getData();
    },
    project: function (newVal, oldVal) {
      this.getData();
    },
    view: function (newVal, oldVal) {
      this.getData();
    },
    showArchived() {
      this.getData();
    },
    mode() {
      if (this.showArchived) this.getData();
    },
    summary: {
      handler(value) {
        this.$emit("summary", value);
      },
      immediate: true
    },
  },
  computed: {
    summary() {
      const tasks = this.activeTasks;
      const done = tasks.filter(t => isDone(t, this.states)).length;
      return {
        total: tasks.length,
        open: tasks.length - done,
        done,
        overdue: tasks.filter(t => this.isOverdue(t)).length
      };
    },
    listTasks() {
      const tasks = this.showArchived
        ? this.tasks.map(t => ({ ...t, activity_type: t.activity_type && t.activity_type.id ? t.activity_type : { id: 0 } }))
        : this.activeTasks;
      return filterTasks(tasks, { ...this.listFilters, search: this.search }, this.states, this.today);
    },
    titleStack() {
      return ["Projectes", "Tasques"];
    },
    ...mapState(useMainStore, ["userName"]),
    lists() {
      if (this.view === 'list') {
        const cap = { id: 0, name: '---' }
        if (this.projectInfo.global_activity_types.length > 0) {
          return _.concat(this.projectInfo.global_activity_types, cap)
        } else {
          return [cap]
        }        
      }
      else {
        return this.states
      }
    },
    listKey() {
      if (this.view === 'list') {
        return 'activity_type'
      }
      else {
        return 'task_state'
      }
    },
    filteredUsers() {
      return this.users.filter((option) => {
        return (
          option.username
            .toString()
            .toLowerCase()
            .indexOf(this.userNameSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredProjects() {
      return this.projects.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectNameSearch.toLowerCase()) >= 0
        );
      });
    },
    maxCardsInState() {
      const max = this.lists.map((s) => 0);
      this.lists.forEach((s, i) => {
        max[i] = this.activeTasks.filter(
          (t) => t[this.listKey] && t[this.listKey].id === s.id
        ).length;
      });
      return max;
    },
    maxCards() {
      return _.max(this.maxCardsInState);
    },
    activeTasks() {
      return this.tasks.filter(t => t.archived === false).map(t => { return { ...t, activity_type: t.activity_type && t.activity_type.id ? t.activity_type : { id: 0 } } })
    },
    cardOrderView() {
      const cardOrder = [];
      this.lists.forEach((s) => {
        const tasks = this.activeTasks.filter(
          (t) => t[this.listKey] && t[this.listKey].id === s.id
        ) // .map((t, i) => { return { ...t, order: t.order != null ? t.order : i*10 }})
        cardOrder.push(tasks);
      });
      return cardOrder;
    },
    kanbanView() {      
      let cardView = []
      this.cardOrderViewSorted.forEach(state => {
        const tasks = state.map(t => { return { taskId: t.id, order: t.order }})
        cardView = _.concat(tasks, cardView)
      });
      const view = { id: this.kanbanViewId, projectId: this.project | 0, userId: this.user | 0, cardView: cardView, cardViewJSON: JSON.stringify(cardView), view: this.view }
      return view
    }
  },
  async mounted() {
    const config = getConfig();
    this.apiUrl = config.VUE_APP_API_URL;
    await this.getData();
  },
  methods: {
    async getData() {
      this.isLoading = true;

      this.states = (
        await service({ requiresAuth: true, cached: true }).get("task-states?_sort=order")
      ).data;

      // the person filter runs on the server (it loaded every task and filtered here)
      const query = tasksQuery({ project: this.project, user: this.user, archived: this.mode === 'list' && this.showArchived })
      const tasks = (await service({ requiresAuth: true }).get(query)).data

      const kanbanQuery = kanbanViewQuery({ project: this.project, user: this.user, view: this.view })

      this.kanbanViewDb = (await service({ requiresAuth: true }).get(kanbanQuery)).data

      if (this.kanbanViewDb.length) {
        this.kanbanViewId = this.kanbanViewDb[0].id
      } else {
        this.kanbanViewId = null
      }

      let tasksWithDatabaseOrder = []
      if (this.kanbanViewId) {
        try {
          tasksWithDatabaseOrder = JSON.parse(this.kanbanViewDb[0].cardViewJSON)   
          // init tasks order
          tasksWithDatabaseOrder.forEach(sit => {
            const theTask = tasks.find(tk => tk.id === sit.taskId)
            if (theTask) {
              theTask.order = sit.order
            }
          })
          this.reOrderCards()
        }
        catch (e)
        {
          console.error('JSON view parse', e)
        }          
      }
      
      // go
      this.tasks = tasks
      this.loadLoggedHours()

      this.cardOrderViewSorted = this.cardOrderView.map(c => [])
      this.reOrderCards()

      this.isLoading = false;
    },
    async loadLoggedHours() {
      const ids = this.tasks.map(t => t.id)
      if (!ids.length) {
        this.loggedHours = {}
        return
      }
      try {
        const totals = {}
        for (let i = 0; i < ids.length; i += 300) {
          const part = (await service({ requiresAuth: true }).get(`tasks/hours?ids=${ids.slice(i, i + 300).join(',')}`)).data
          Object.assign(totals, part || {})
        }
        this.loggedHours = totals
      } catch (e) {
        this.loggedHours = {}
      }
    },
    // "Imputa hores" in a task: the Hores dedicades modal with the task's project,
    // Funció and the task itself, for the logged-in person, today
    logHours(task) {
      const project = this.projects.find(p => p.id === task.project) || null
      const me = this.users.find(u => u.id === currentUserId()) || null
      this.hoursObject = {
        date: moment().format('YYYY-MM-DD'),
        project: project ? { id: project.id, name: project.name } : null,
        activity_type: task.activity_type ? { id: task.activity_type } : null,
        task: { id: task.id },
        users_permissions_user: me ? { id: me.id, username: me.username } : null,
        hours: null,
        description: task.name
      }
      this.isHoursModalActive = true
    },
    async saveHours(activity) {
      if (this.savingHours) return
      this.savingHours = true
      try {
        const data = { ...activity, counter: undefined }
        delete data.id
        data.date = moment(activity.date).format('YYYY-MM-DD')
        data.hours = activity.hours ? activity.hours.toString().replace(',', '.') : activity.hours
        data.task = activity.task || null
        await service({ requiresAuth: true }).post('activities', data)
        this.isHoursModalActive = false
        await this.loadLoggedHours()
        this.$buefy.snackbar.open({ message: 'Hores imputades', queue: false })
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'han pogut desar les hores", type: 'is-danger', queue: false })
      } finally {
        this.savingHours = false
      }
    },
    // files added in the modal before the task existed
    async uploadFiles(taskId, files) {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f, f.name))
      formData.append('ref', 'task')
      formData.append('refId', taskId)
      formData.append('field', 'documents')
      await service({ requiresAuth: true, multipart: true }).post('upload', formData)
      return (await service({ requiresAuth: true }).get(`tasks/${taskId}`)).data
    },
    startDrag(evt, item) {
      evt.dataTransfer.dropEffect = "move";
      evt.dataTransfer.effectAllowed = "move";
      evt.dataTransfer.setData("itemID", item.id);
    },
    async onDrop(i, j, evt, state) {
      const itemID = evt.dataTransfer.getData("itemID");
      const item = this.tasks.find((item) => item.id == itemID);
      if (!item) {
        return;
      }
      
      item[this.listKey] = state;
      if (item && item.activity_type && !item.activity_type.id) {
        item.activity_type = null
      }
      
      item.order = j + 5
      this.reOrderCards()
      this.dragOver = -1;
      this.dragOverState = -1;
      try {
        await service({ requiresAuth: true }).put(`tasks/${item.id}`, item);
        await this.saveKanbanView()
        if (item.recurrence && this.listKey === 'task_state') await this.getData()

        this.$buefy.snackbar.open({
          message: "Tasca guardada",
          queue: false,
        });
      } catch (e) {
        // console.error('e', e)
        this.$buefy.snackbar.open({
          message: "Error",
          queue: false,
        });
      }
      
    },
    onDragEnter(evt, state) {},
    onDragOver(i, j, evt, state) {
      this.dragOverState = i;
      this.dragOver = j;
    },
    reOrderCards() {
      const cards = this.cardOrderView.map(c => [])      
      const cardOrderView = JSON.parse(JSON.stringify(this.cardOrderView))
      cardOrderView.forEach((c, i) => {
        let sorted = _.orderBy(c, ['order'], ['asc'])
        sorted = sorted.map((s, j) => { return { ...s, order: j*10 } }) // .map((s, j) => { return { ...s, orderAux: s.order } })
        cards[i] = sorted
        sorted.forEach(s => {
          this.tasks.find(t => t.id === s.id).order = s.order
        })
      })
      this.cardOrderViewSorted = cards
    },
    async saveKanbanView() {
      if (this.kanbanViewId) {
        await service({ requiresAuth: true }).put(`kanban-views/${this.kanbanViewId}`, this.kanbanView);
      }
      else {
        await service({ requiresAuth: true }).post(`kanban-views`, this.kanbanView);
      }
    },
    // state: the board column; prefill: what the list group gives (state, project, person)
    addTask(state, prefill = {}) {
      const initial = !state
        ? { activity_type: 0, task_state: this.states[0] }
        : this.view === 'state' ? { activity_type: 0, task_state: state } : { activity_type: state, task_state: this.states[0] }
      const filterUser = this.user ? this.users.find(u => u.id === this.user) : null
      this.taskObject = {
        ...initial,
        project: this.projects.find(p => p.id === this.project),
        users_permissions_users: filterUser ? [filterUser] : [],
        ...prefill
      };
      this.isModalActive = true;
    },
    // changes from the list (one task or the selected ones); patch is an object or a
    // function of the task
    async updateTasks({ tasks, patch }) {
      if (!tasks.length) return;
      let failed = 0;
      for (const task of tasks) {
        try {
          const data = typeof patch === 'function' ? patch(task) : patch;
          const updated = (await service({ requiresAuth: true }).put(`tasks/${task.id}`, data)).data;
          const item = this.tasks.find(t => t.id === task.id);
          if (item && updated) {
            Object.assign(item, updated);
            if (!this.showArchived && item.archived) this.tasks = this.tasks.filter(t => t.id !== item.id);
          }
        } catch (e) {
          failed++;
        }
      }
      // a recurring task finished here has its next occurrence on the server
      const p = typeof patch === 'function' ? null : patch
      if (p && p.task_state && tasks.some(t => t.recurrence)) await this.getData();
      this.$buefy.snackbar.open({
        message: failed
          ? `No s'han pogut desar ${failed} de ${tasks.length} tasques`
          : tasks.length === 1 ? "Tasca guardada" : `${tasks.length} tasques guardades`,
        type: failed ? "is-danger" : undefined,
        queue: false,
      });
    },
    showTask(task) {
      this.taskObject = task;
      this.isModalActive = true;
    },
    async modalSubmit (task) {
      const files = task._files || []
      delete task._files
      if (task.id && task.id > 0) {
        let updatedTask = (await service({ requiresAuth: true }).put(`tasks/${task.id}`, task)).data;
        if (files.length) updatedTask = await this.uploadFiles(task.id, files)
        let item = this.tasks.find(t => t.id === task.id)
        if (item) {
          for (var i in updatedTask) {
            item[i] = updatedTask[i]
          }
          item.order++
        }
        this.reOrderCards()
        await this.saveKanbanView()
      } else {
        delete task.id
        // the person who creates it (it was the Persona filter, or nobody on a project)
        task.created = currentUserId()
        task.archived = false
        task.order = -10
        task = (await service({ requiresAuth: true }).post(`tasks`, task)).data;
        if (files.length) task = await this.uploadFiles(task.id, files)
        this.tasks.push(task)
        this.reOrderCards()
        await this.saveKanbanView()
      }
      // a recurring task finished on this save has a new occurrence on the server
      if (task.recurrence) await this.getData()

      this.$buefy.snackbar.open({
        message: "Tasca guardada",
        queue: false,
      });

      this.isModalActive = false;
      
    },
    async modalDelete(task) {
      task.archived = true

      await service({ requiresAuth: true }).put(`tasks/${task.id}`, task);
      
      // await service({ requiresAuth: true }).put(`tasks/${task.id}`, task)

      const theTask = this.tasks.find(t => t.id === task.id)      
      theTask.archived = true

      this.reOrderCards()
      await this.saveKanbanView()

      // const task = this.tasks.data.find(t => t._dedication && t._dedication.id && t._dedication.id.toString() === activity.id.toString())
      // this.tasks.data = this.tasks.data.filter(t => t.id.toString() !== task.id.toString())
      // gantt.deleteTask(task.id)

      this.$buefy.snackbar.open({
          message: 'Esborrada',
          queue: false
      })

      this.isModalActive = false;
    },
    modalCancel() {
      this.isModalActive = false;
    },
    trashCancel() {
      this.isModalActive = false;
    },
    // cards of column i to draw: { task, j } with j its place in the column (drop
    // positions use it), filtered by the search and capped until expanded
    shownCards(i) {
      const cards = (this.cardOrderViewSorted[i] || []).map((task, j) => ({ task, j }));
      const q = this.search.trim().toLowerCase();
      const matching = q
        ? cards.filter(({ task }) =>
            [task.name, task.description, task.project && task.project.name]
              .some(text => text && String(text).toLowerCase().includes(q)))
        : cards;
      const state = this.lists[i];
      return q || (state && this.expanded[state.id]) ? matching : matching.slice(0, CARD_LIMIT);
    },
    shownCount(i) {
      const q = this.search.trim();
      if (!q) return (this.cardOrderViewSorted[i] || []).length;
      return this.shownCards(i).length;
    },
    hiddenCount(i) {
      if (this.search.trim()) return 0;
      return Math.max(0, (this.cardOrderViewSorted[i] || []).length - this.shownCards(i).length);
    },
    // the last state counts as "done" (no overdue warning for finished tasks)
    isOverdue(task) {
      return isOverdue(task, this.states, this.today);
    },
    plainText: markdownToText,
    formatHours,
    recurrenceLabel,
    hoursOf(task) {
      return taskHours(task, this.loggedHours);
    },
    initials(name) {
      const words = String(name || "").split(/[\s._@-]+/).filter(Boolean);
      return words.slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
    },
    formatShortDate(val) {
      return val ? moment(val).format("DD/MM/YYYY") : "";
    },
    formatDescription(val) {
      if (!val) {
        return "";
      }
      return val.length > 215 ? val.substring(0, 215) + ' ...' : val;
    },
    formatDMYDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("dddd DD/MM/YYYY");
    }
  },
};
</script>
<style scoped>
.tasks-board {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(17rem, 1fr);
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: .5rem;
  align-items: stretch;
}
.task-list-content {
  display: flex;
  flex-direction: column;
  background: var(--a-chip);
  border-radius: 12px;
  padding: .75rem;
  min-width: 0;
}
.task-list-header {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .25rem .25rem .75rem;
}
.task-list-name {
  font-weight: 800;
}
.task-count {
  padding: 0 .5rem;
  border-radius: 999px;
  background: var(--a-surface);
  font-size: .75rem;
  font-weight: 800;
  color: var(--a-fg-2);
}
.task-add {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--a-fg-2);
  cursor: pointer;
}
.task-add:hover {
  background: var(--a-surface);
  color: var(--a-accent);
}
.task-list-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.drop-zone {
  margin-bottom: .5rem;
  border-radius: 10px;
}
.empty-zone-no-card-first {
  min-height: .25rem;
  margin-bottom: .25rem;
}
.empty-zone-no-card {
  flex: 1;
  min-height: 4rem;
  margin-bottom: 0;
}
.drop-zone-active .empty-zone,
.drop-zone-active.empty-zone-no-card,
.drop-zone-active.empty-zone-no-card-first {
  min-height: 4rem;
  margin-top: .5rem;
  background: var(--a-accent-soft);
  border: 2px dashed var(--a-accent);
  border-radius: 10px;
}
.task-card {
  margin: 0;
  border: 1px solid var(--a-line);
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
  background: var(--a-surface);
}
.task-card:hover {
  border-color: var(--a-input);
  box-shadow: 0 2px 6px rgba(0, 0, 0, .08);
}
.task-card .content {
  padding: .75rem .875rem;
  margin: 0;
}
.task-card .content p {
  margin: 0;
}
.task-img {
  display: block;
  width: 100%;
  max-height: 8rem;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: .5rem;
}
.task-title {
  font-weight: 800;
  font-size: .9375rem;
  line-height: 1.3;
  color: var(--a-fg);
}
.task-prio {
  display: inline-block;
  margin-right: .25rem;
  padding: 0 .375rem;
  border-radius: 4px;
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
  font-size: .6875rem;
  font-weight: 800;
  vertical-align: 2px;
}
.task-project {
  margin-top: .25rem !important;
  font-size: .8125rem;
  color: var(--a-muted);
}
.task-desc {
  margin-top: .375rem !important;
  font-size: .8125rem;
  color: var(--a-fg-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-line;
}
.task-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .375rem;
  margin-top: .625rem;
  min-height: 1.5rem;
}
.task-chip {
  display: inline-flex;
  align-items: center;
  gap: .125rem;
  padding: .0625rem .5rem;
  border-radius: 999px;
  background: var(--a-chip);
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-fg-2);
}
.task-chip.is-overdue {
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
}
.task-chip.is-done {
  background: var(--a-accent-soft);
  color: var(--a-accent-hover);
}
.task-chip.is-type {
  background: var(--a-info-bg);
  color: var(--a-info-fg);
}
.task-people {
  margin-left: auto;
  display: inline-flex;
  gap: .25rem;
}
.task-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 .25rem;
  border-radius: 999px;
  background: var(--a-chip);
  font-size: .625rem;
  font-weight: 800;
  color: var(--a-fg);
}
.task-more {
  margin-top: .5rem;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: .8125rem;
  font-weight: 800;
  color: var(--a-accent);
  cursor: pointer;
}
.clickable {
  cursor: pointer !important;
}
</style>
