<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section" v-if="!isLoading">
      <card-component>
        <form @submit.prevent="submit2">
          <b-field horizontal>
            <b-field label="Persona">
              <b-autocomplete
                v-model="userNameSearch"
                placeholder="Persona"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsers"
                field="username"
                @select="(option) => (filters.user = option ? option.id : null)"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="Projecte">
              <b-autocomplete
                v-model="projectNameSearch"
                placeholder="Projecte"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProjects"
                field="name"
                @select="
                  (option) => (filters.project = option ? option.id : null)
                "
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
          </b-field>
        </form>
      </card-component>
      <tasks :projects="projects" :users="users" :user="filters.user" :project="filters.project" />
    </section>
  </div>
</template>

<script>
import Notification from "@/components/Notification";
import CardComponent from "@/components/CardComponent";
import TitleBar from "@/components/TitleBar";
import HeroBar from "@/components/HeroBar";
import Tasks from "@/components/Tasks";
import service from "@/service/index";
import moment from "moment";
import { mapState } from "vuex";
import _ from "lodash";

export default {
  name: "TasksView",
  components: {
    HeroBar,
    TitleBar,
    CardComponent,
    Notification,
    Tasks
  },
  data() {
    return {
      isLoading: false,
      tasks: [],
      states: [],
      userNameSearch: "",
      projectNameSearch: "",
      users: [],
      projects: [],
      filters: {
        user: null,
        project: null
      },
      dragOver: -1,
      dragOverState: -1,
      cardOrder: []
    };
  },
  computed: {
    titleStack() {
      return ["Projectes", "Tasques"];
    },
    ...mapState(["userName"]),
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
      const max = this.states.map(s => 0)
      this.states.forEach((s, i) => {
        max[i] = this.tasks.filter(t => t.task_state && t.task_state.id === s.id).length
      });
      return max
    },
    maxCards() {
      return _.max(this.maxCardsInState)
    },
    cardOrderView() {

    }
  },
  async mounted() {
    this.isLoading = true;

    // this.states = (
    //   await service({ requiresAuth: true }).get("task-states?_sort=order")
    // ).data;

    // this.tasks = (await service({ requiresAuth: true }).get("tasks")).data;

    // const cardOrder = []
    // this.states.forEach(s => {        
    //     const tasks = this.tasks.filter(t => t.task_state && t.task_state.id === s.id) // .map((t, i) => { return { id: t.id, name: t.name }})
    //     cardOrder.push(tasks)
    // })
    // this.cardOrder = cardOrder

    

    this.projects = (await service({ requiresAuth: true }).get("projects/basic?_limit=-1")).data.filter((p) => p.project_state !== 2)

    this.users = (await service({ requiresAuth: true }).get("users?_limit=-1")).data.filter((u) => u.hidden !== true)
    const user = this.users.find(
      (u) => u.username.toLowerCase() === this.userName.toLowerCase()
    );
    if (user && user.id) {
      this.userNameSearch = user.username;
      this.filters.user = user.id
    }

    this.isLoading = false;
  },
  methods: {
    startDrag(evt, item) {
      evt.dataTransfer.dropEffect = "move";
      evt.dataTransfer.effectAllowed = "move";
      evt.dataTransfer.setData("itemID", item.id);
    },
    async onDrop(i, j, evt, state) {
      const itemID = evt.dataTransfer.getData("itemID");
      const item = this.tasks.find((item) => item.id == itemID);
      if (!item) {
        return
      }
      this.removeFromOrder(item)
      item.task_state = state;
      this.addToOrder(item, j)
      this.dragOver = -1
      this.dragOverState = -1
      try {
        await service({ requiresAuth: true }).put(`tasks/${item.id}`, item)
      }
      catch (e) {
        this.$buefy.snackbar.open({
          message: "Error",
          queue: false,
        });
      }
      
      // this.$buefy.snackbar.open({
      //   message: "Tasca guardada",
      //   queue: false,
      // });
      // console.log('onDrop', j)
    },
    onDragEnter(evt, state) {
    },
    onDragOver(i, j, evt, state) {
      this.dragOverState = i
      this.dragOver = j
    },
    removeFromOrder(item) {
      this.cardOrder[item.task_state.order] = this.cardOrder[item.task_state.order].filter(o => o.id !== item.id)
    },
    addToOrder(item, position) {      
      // if (position < 0) {
      //   this.cardOrder[item.task_state.order] = [item]
      // } else {
      //   const stateCardOrder = JSON.parse(JSON.stringify(this.cardOrder[item.task_state.order]))
      //   this.cardOrder[item.task_state.order] = _.concat(_.concat(stateCardOrder.filter((it, i) => i <= position), item), stateCardOrder.filter((it, i) => i > position) )
      // }

      const stateCardOrder = JSON.parse(JSON.stringify(this.cardOrder[item.task_state.order]))
      this.cardOrder[item.task_state.order] = _.concat(_.concat(stateCardOrder.filter((it, i) => i <= position), item), stateCardOrder.filter((it, i) => i > position) )

    }
  }
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
.empty-card{
  min-height: 200px;
}
.drop-zone {
  margin-bottom: 1.5rem;
  padding-bottom: 0rem;
}
.drop-zone-active .empty-zone, .drop-zone-active.empty-zone-no-card {
  margin-top: 1rem;
  background: #ddd;
  padding-bottom: 10rem;
  border-radius: 4px;
}
.empty-zone-no-card{
  min-height: 160px;
}
.empty-zone-no-card-first{
  min-height: 1rem;
  margin-top: 0rem;
  margin-bottom: 0rem;
}
.empty-zone-no-card-first.drop-zone-active{
  margin-top: 1rem;
  margin-bottom: 1rem;
}
</style>