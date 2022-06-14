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
    />
    <div class="tasks-content" :class="lists.length <= 4 ? 'no-scroll' : 'z'">
    <div class="columns">
      <div class="column zis-4" :class="lists.length <= 3 ? 'is-4' : ( lists.length <= 4 ? 'is-3' : 'is-2') " v-for="(state, i) in lists" :key="state.id">
        <div class="task-list-content has-background-light card">
          <div
            class="
              zcard-header
              task-list-header
              has-background-white
              zhas-background-grey-lighter
            "
          >
            <span>
              {{ state.name }}
            </span>

            <button
              class="button is-small is-primary is-pulled-right"
              type="button"
              @click.prevent="addTask(state)"
            >
              <b-icon icon="plus" size="is-small" />
            </button>
          </div>
          <div class="task-list-body">
            <div
              class="empty-zone-no-card-first empty-zone-no-card drop-zone"
              v-if="maxCardsInState[i] > 0"
              :class="
                dragOver === -10 && dragOverState == i ? 'drop-zone-active' : 'z'
              "
              @drop="onDrop(i, -10, $event, state)"
              @dragover.prevent="onDragOver(i, -10, $event, state)"
              @dragenter.prevent="onDragEnter($event, state)"
            ></div>

            <div
              class="card-and-drop drop-zone"
              :class="
                dragOver === j && dragOverState == i ? 'drop-zone-active' : 'z'
              "
              v-for="(task, j) in cardOrderViewSorted[i]"
              :key="task.id"
              @drop="onDrop(i, j*10, $event, state)"
              @dragover.prevent="onDragOver(i, j, $event, state)"
              @dragenter.prevent="onDragEnter($event, state)"
            >
              <div class="card" draggable @dragstart="startDrag($event, task)">
                <div class="content clickable" @click.prevent="showTask(task)">
                  <div class="card-header title is-size-5">
                    {{ task.name }}
                  </div>
                  
                  <div v-if="task.documents && task.documents.length" class="task-img">
                    <img v-if="task.documents[0].mime.startsWith('image')" :src="apiUrl + task.documents[0].url" class="mb-3" />
                    <div class="task-img-overlay">
                    </div>
                  </div>
                  <div v-if="task.description">{{ formatDescription(task.description) }}</div>
                  <div
                    class="mt-3"
                  >
                    <span v-if="task.project" class="tag is-primary mr-1">{{
                      task.project.name
                    }}</span>                    
                    <span class="tag mr-1" v-if="task.due_date" :class="task.due_date < today ? 'is-danger' : 'is-warning'">{{
                      task.due_date | formatDMYDate
                    }}                    
                    </span>
                    
                    <span
                      class="tag zis-success mr-1 mb-1"
                      v-for="user in task.users_permissions_users"
                      :key="user.id"
                      >{{ user.username }}</span
                    >
                    <span class="tag mr-1 mb-1" v-if="task.checklist.length" :class="task.checklist.length === task.checklist.filter(c => c.done).length ? 'is-success' : 'is-warning'">
                      {{ task.checklist.filter(c => c.done).length }} / {{ task.checklist.length }}
                    </span>
                    <span class="tag mr-1 mb-1 is-info" v-if="view === 'state' && task.activity_type && task.activity_type.name">{{
                      task.activity_type.name
                    }}
                    </span>
                    <span class="tag mr-1 mb-1 is-info" v-if="view === 'list'">{{
                      task.task_state.name
                    }}                    
                    </span>
                  </div>
                </div>
              </div>
              <div class="empty-zone"></div>
            </div>

            <div
              class="empty-zone-no-card drop-zone"
              :style="`height: ${
                (maxCards -
                  activeTasks.filter(
                    (t) => t[listKey] && t[listKey].id === state.id
                  ).length) *
                180
              }px`"
              :class="
                dragOver === 99999 && dragOverState == i ? 'drop-zone-active' : 'z'
              "
              @drop="onDrop(i, 99999, $event, state)"
              @dragover.prevent="onDragOver(i, 99999, $event, state)"
              @dragenter.prevent="onDragEnter($event, state)"
            ></div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script>
import Notification from "@/components/Notification";
import ModalBoxTask from "@/components/ModalBoxTask";
import CardComponent from "@/components/CardComponent";
import TitleBar from "@/components/TitleBar";
import HeroBar from "@/components/HeroBar";
// import Tiles from "@/components/Tiles";
import service from "@/service/index";
import moment from "moment";
import { mapState } from "vuex";
import _ from "lodash";

moment.locale("ca");

export default {
  name: "Tasks",
  components: {
    HeroBar,
    TitleBar,
    CardComponent,
    ModalBoxTask,
    Notification,
    ModalBoxTask,
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
      apiUrl: process.env.VUE_APP_API_URL
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
    }
  },
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
  },
  computed: {
    titleStack() {
      return ["Projectes", "Tasques"];
    },
    ...mapState(["userName"]),
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
    await this.getData();
  },
  methods: {
    async getData() {
      this.isLoading = true;

      this.states = (
        await service({ requiresAuth: true }).get("task-states?_sort=order")
      ).data;

      let query = "tasks?_limit=-1&_where[archived_eq]=false";
      
      if (this.project) {
        query += "&_where[project_eq]=" + this.project;
      }

      let tasks = (await service({ requiresAuth: true }).get(query)).data
      if (this.user) {
        tasks = tasks.filter(t => t.users_permissions_users && t.users_permissions_users.filter(u => u.id === this.user).length > 0)
      } else {
        // tasks = tasks
      }

      let kanbanQuery = `kanban-views?_limit=1&_where[projectId_eq]=${this.project ? this.project : 0}&[userId_eq]=${this.user ? this.user : 0}&[view_eq]=${this.view}`

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
            // console.log('theTask', theTask)
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

      this.cardOrderViewSorted = this.cardOrderView.map(c => [])
      this.reOrderCards()

      this.isLoading = false;
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

        this.$buefy.snackbar.open({
          message: "Tasca guardada",
          queue: false,
        });
      } catch (e) {
        console.error('e', e)
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
    addTask(state) {
      const initial = this.view === 'state' ? { activity_type: 0, task_state: state } : { activity_type: state, task_state: this.states[0] }
      this.taskObject = { ...initial, project: this.projects.find(p => p.id === this.project), users_permissions_users: this.user ? [this.users.find(u => u.id === this.user)] : [] };
      // console.log('this.taskObject', this.taskObject)
      this.isModalActive = true;
    },
    showTask(task) {
      this.taskObject = task;
      // console.log('showTask', task)
      this.isModalActive = true;
    },
    async modalSubmit (task) {
      if (task.id && task.id > 0) {
        const updatedTask = (await service({ requiresAuth: true }).put(`tasks/${task.id}`, task)).data;
        let item = this.tasks.find(t => t.id === task.id)
        for(var i in updatedTask) {
          item[i] = updatedTask[i]
        }        
        item.order++
        this.reOrderCards()
        await this.saveKanbanView()
      } else {
        task.archived = false
        task.order = -10
        task = (await service({ requiresAuth: true }).post(`tasks`, task)).data;        
        this.tasks.push(task)
        this.reOrderCards()
        await this.saveKanbanView()
      }

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
    formatDescription(val) {
      if (!val) {
        return "";
      }
      return val.length > 215 ? val.substring(0, 215) + ' ...' : val;
    }
  },
  filters: {
    formatDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).fromNow();
    },
    formatDMYDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("dddd DD/MM/YYYY");
    },
    formatTitle(val) {
      if (!val) {
        return "-";
      }
      return (
        moment(val).format("dddd DD/MM/YYYY") +
        " (" +
        moment(val).fromNow() +
        ")"
      );
    }    
  },
};
</script>
<style scoped>
.task-list-content {
  border-radius: 4px;
}
.task-list-header {
  padding: 1rem 0.5rem;
  font-weight: bold;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}
.task-list-body {
  padding: 0rem 0.5rem 1rem;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}
.task-list-body .content {
  padding: 1rem 0.5rem;
}
.empty-card {
  min-height: 200px;
}
.drop-zone {
  margin-bottom: 1.5rem;
  padding-bottom: 0rem;
}
.drop-zone-active .empty-zone,
.drop-zone-active.empty-zone-no-card {
  margin-top: 1rem;
  background: #ddd;
  padding-bottom: 10rem;
  border-radius: 4px;
  border: 2px dashed #bbb
}
.empty-zone-no-card {
  min-height: 160px;
}
.empty-zone-no-card-first {
  min-height: 1rem;
  margin-top: 0rem;
  margin-bottom: 0rem;
}
.empty-zone-no-card-first.drop-zone-active {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.clickable{
  cursor: pointer!important;
}
.tasks-content{
  width: auto;
  overflow-x: scroll;
  padding: 0.8rem 0;
}
.no-scroll{
  overflow: inherit!important;
}
.over-image{
  background: red;
  position: absolute;
  top: 0;
  height: 100%;
  z-index: 10;
}
.task-img{
    width: 100%;
  position: relative;
}
.task-img-overlay{
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
}
</style>