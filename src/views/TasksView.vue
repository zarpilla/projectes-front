<template>
  <div>
    <title-bar :title-stack="titleStack" :subtitle="subtitle">
      <b-button type="is-primary" icon-left="plus" @click="newTask">
        Nova tasca
      </b-button>
    </title-bar>
    <section class="section is-main-section" v-if="!isLoading">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <b-input
          v-model="search"
          class="filter-search"
          icon="magnify"
          placeholder="Cerca una tasca"
          aria-label="Cerca una tasca"
        />
        <label class="filter-select filter-auto-label">
          <span>Persona</span>
          <b-autocomplete
            v-model="userNameSearch"
            placeholder="Totes"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredUsers"
            field="username"
            :clearable="true"
            @select="(option) => (filters.user = option ? option.id : null)"
          />
        </label>
        <label class="filter-select filter-auto-label">
          <span>Projecte</span>
          <b-autocomplete
            v-model="projectNameSearch"
            placeholder="Tots"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredProjects"
            field="name"
            :clearable="true"
            @select="(option) => (filters.project = option ? option.id : null)"
          />
        </label>
        <span class="filter-spacer"></span>
        <div class="segmented" role="group" aria-label="Vista">
          <button type="button" :class="{ 'is-on': mode === 'board' }" :aria-pressed="mode === 'board'" @click="setMode('board')">Tauler</button>
          <button type="button" :class="{ 'is-on': mode === 'list' }" :aria-pressed="mode === 'list'" @click="setMode('list')">Llista</button>
          <button type="button" :class="{ 'is-on': mode === 'calendar' }" :aria-pressed="mode === 'calendar'" @click="setMode('calendar')">Calendari</button>
        </div>
      </form>
      <div v-if="mode !== 'board'" class="filter-bar" role="group" aria-label="Filtres de la llista">
        <label class="filter-select">
          <span>Estat</span>
          <b-select v-model="listFilters.state">
            <option value="open">Obertes</option>
            <option value="all">Totes</option>
            <option v-for="s in states" :key="s.id" :value="s.id">{{ s.name }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Venciment</span>
          <b-select v-model="listFilters.due">
            <option value="all">Tots</option>
            <option value="late">Vençudes</option>
            <option value="week">Vençudes i pròxims 7 dies</option>
            <option value="none">Sense data</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Prioritat</span>
          <b-select v-model="listFilters.priority">
            <option value="all">Totes</option>
            <option value="high">Alta</option>
            <option value="normal">Normal</option>
            <option value="low">Baixa</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Funció</span>
          <b-select v-model="listFilters.activityType">
            <option value="all">Totes</option>
            <option :value="0">Sense funció</option>
            <option v-for="a in activityTypes" :key="a.id" :value="a.id">{{ a.name }}</option>
          </b-select>
        </label>
        <b-checkbox v-model="showArchived">Mostra les arxivades</b-checkbox>
        <span class="filter-spacer"></span>
        <label v-if="mode === 'list'" class="filter-select">
          <span>Agrupa per</span>
          <b-select v-model="groupBy">
            <option value="due">Venciment</option>
            <option value="state">Estat</option>
            <option value="project">Projecte</option>
            <option value="person">Persona</option>
          </b-select>
        </label>
      </div>
      <tasks
        ref="board"
        :projects="projects"
        :users="users"
        :user="filters.user"
        :project="filters.project"
        :search="search"
        view="state"
        :mode="mode"
        :list-filters="listFilters"
        :group-by="groupBy"
        :show-archived="showArchived"
        @summary="summary = $event"
      />
    </section>
  </div>
</template>

<script>
import Notification from "@/components/Notification.vue";
import CardComponent from "@/components/CardComponent.vue";
import TitleBar from "@/components/TitleBar.vue";
import HeroBar from "@/components/HeroBar.vue";
import Tasks from "@/components/Tasks.vue";
import service from "@/service/index";
import { findCurrentUser } from "@/domain/currentUser";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

// Tauler or Llista, remembered per browser
const MODE_KEY = "tasksMode";
function savedMode() {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    return mode === "list" || mode === "calendar" ? mode : "board";
  } catch {
    return "board";
  }
}

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
      states: [],
      activityTypes: [],
      userNameSearch: "",
      projectNameSearch: "",
      users: [],
      projects: [],
      filters: {
        user: null,
        project: null
      },
      mode: savedMode(),
      listFilters: { state: "open", due: "all", priority: "all", activityType: "all" },
      groupBy: "due",
      showArchived: false,
      search: "",
      summary: null
    };
  },
  computed: {
    titleStack() {
      return ["Projectes", "Tasques"];
    },
    subtitle() {
      if (!this.summary) return "";
      const { open, done, overdue } = this.summary;
      return `${open} ${open === 1 ? "tasca oberta" : "tasques obertes"}` +
        (overdue ? ` · ${overdue} ${overdue === 1 ? "de vençuda" : "de vençudes"}` : "") +
        (done ? ` · ${done} ${done === 1 ? "acabada" : "acabades"}` : "");
    },
    ...mapState(useMainStore, ["userName"]),
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
  },
  async mounted() {
    this.isLoading = true;

    this.projects = (await service({ requiresAuth: true }).get("projects/basic?_limit=-1")).data.filter((p) => p.project_state !== 2)

    this.states = (await service({ requiresAuth: true, cached: true }).get("task-states?_sort=order")).data
    this.activityTypes = (await service({ requiresAuth: true, cached: true }).get("activity-types/basic?_limit=-1")).data
      .slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "ca"))

    const allUsers = (await service({ requiresAuth: true, cached: true }).get("users?_limit=-1")).data
    const user = findCurrentUser(allUsers);
    // hidden people are left out of the lists, but not the logged-in person: «Imputa
    // hores», the templates and the checklist preselect them
    this.users = allUsers.filter((u) => u.hidden !== true || (user && u.id === user.id))
    if (user && user.id) {
      this.userNameSearch = user.username;
      this.filters.user = user.id
    }

    this.isLoading = false;

    // link from a task email
    await this.$nextTick();
    this.openLinkedTask();
  },
  watch: {
    "$route.query.task"() {
      this.openLinkedTask();
    }
  },
  methods: {
    // #/tasks?task=12 (the link of the task emails) opens that task
    openLinkedTask() {
      const taskId = Number(this.$route && this.$route.query && this.$route.query.task);
      if (taskId && this.$refs.board) this.$refs.board.openTaskById(taskId);
    },
    setMode(mode) {
      this.mode = mode;
      try {
        localStorage.setItem(MODE_KEY, mode);
      } catch {
        // private window: the choice lasts until reload
      }
    },
    newTask() {
      const board = this.$refs.board;
      if (!board) return;
      if (this.mode !== "board") board.addTask(null);
      else board.addTask(board.lists[0]);
    }
  }
};
</script>
<style scoped>
.filter-auto-label {
  min-width: 15rem;
}
.filter-auto-label :deep(.autocomplete) {
  flex: 1;
}
.filter-auto-label :deep(.input) {
  border: 0;
  box-shadow: none;
  font-weight: 700;
}
.filter-search {
  flex: 0 1 22rem;
}
.filter-spacer {
  flex: 1;
}
/* long Funció names: the select shrinks, the option list keeps them whole */
.filter-select :deep(.select select) {
  max-width: 14rem;
  text-overflow: ellipsis;
}
</style>
