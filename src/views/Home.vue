<template>
  <div>
    <title-bar :title-stack="titleStack" :subtitle="subtitle">
      <download-excel name="projectes" :data="projectsCSV">
        <b-button icon-left="download">Exporta</b-button>
      </download-excel>
      <b-button @click="switchToMotherProjects">Projectes mare</b-button>
      <b-button type="is-primary" icon-left="plus" @click="navNewProject">
        Nou projecte
      </b-button>
    </title-bar>
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <b-input
          class="filter-search"
          :model-value="filters.q"
          icon="magnify"
          placeholder="Cerca per nom"
          aria-label="Cerca per nom"
          @keyup="queryProjects($event.target.value)"
        />
        <label class="filter-select">
          <span>Estat</span>
          <b-select v-model="filters.project_state" @change="onChange($event)">
            <option v-for="(s, index) in project_states" :key="index" :value="s.id">
              {{ s.name }}
            </option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Coordina</span>
          <b-select v-model="filters.user" @change="onUserChange($event)">
            <option value="0">Totes</option>
            <option v-for="(s, index) in users" :key="index" :value="s.id">
              {{ s.username }}
            </option>
          </b-select>
        </label>
        <div v-if="scopes && scopes.length" class="segmented" role="group" aria-label="Àmbit">
          <button type="button" :class="{ 'is-on': 0 === filters.scopeId }" :aria-pressed="0 === filters.scopeId ? 'true' : 'false'" @click="setScope(0)">
            Tots
          </button>
          <button
            v-for="(scope, i) in scopes"
            :key="i"
            type="button"
            :class="{ 'is-on': scope.id === filters.scopeId }"
            :aria-pressed="scope.id === filters.scopeId ? 'true' : 'false'"
            @click="setScope(scope.id)"
          >
            {{ scope.name }}{{ scope.group ? ` - ${scope.group}` : "" }}
          </button>
        </div>
      </form>

      <b-loading
        :is-full-page="true"
        v-model="loading"
        :can-cancel="false"
      ></b-loading>

      <div class="card has-table projects-card">
        <header class="card-header">
          <p class="card-header-title">{{ projectsEditMode ? "Edició ràpida" : "Projectes" }}</p>
          <div class="card-header-actions">
            <b-button size="is-small" :icon-left="projectsEditMode ? 'table' : 'pencil'" @click="toggleProjectsEditMode">
              {{ projectsEditMode ? "Torna al llistat" : "Edició ràpida" }}
            </b-button>
          </div>
        </header>
        <projects-table
          :project_state="filters.project_state"
          :projects="projects"
          :users="users"
          :project-states="project_states"
          :project-types="project_types"
          :scopes="scopes"
          :project-likelihoods="project_likelihoods"
          :edit-mode="projectsEditMode"
        />
      </div>
    </section>
  </div>
</template>

<script>
// @ is an alias to /src
import * as chartConfig from "@/components/Charts/chart.config";
import TitleBar from "@/components/TitleBar.vue";
import Tiles from "@/components/Tiles.vue";
import CardWidget from "@/components/CardWidget.vue";
import ProjectsTable from "@/components/ProjectsTable.vue";
import service from "@/service/index";
import sumBy from "lodash/sumBy";
import sortBy from "lodash/sortBy";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import moment from "moment";
import { isDone } from "@/domain/tasks";

export default {
  name: "Home",
  components: {
    ProjectsTable,
    // BarChart,
    CardWidget,
    Tiles,
    // HeroBar,
    TitleBar
  },
  data() {
    return {
      defaultChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsMain
      },
      projectsNumber: 0,
      // contactsNumber: 0,
      projects: [],
      activities: [],
      scopes: [],
      project_likelihoods: [],
      balance: 0,
      realIncomes: 0,
      realExpenses: 0,
      dedication: 0,
      estimatedDedication: 0,
      project_states: [],
      project_types: [],
      filters: { project_state: 1, q: "", user: "0", scopeId: 0 },
      queryChanged: 0,
      users: [],
      loading: false,
      projectsEditMode: false
    };
  },
  computed: {
    ...mapState(useMainStore, ["userName"]),
    titleStack() {
      return ["Projectes", "Projectes"];
    },
    subtitle() {
      const state = this.project_states.find(s => s.id === this.filters.project_state);
      const count = `${this.projectsNumber} ${this.projectsNumber === 1 ? "projecte" : "projectes"}`;
      return state && state.id ? `${count} · ${state.name.toLowerCase()}` : count;
    },
    projectsCSV() {
      // return this.projects
      const projectsCSV = this.projects.map(p => {
        return {
          id: p.id,
          name: p.name,
          state:
            p.project_state && p.project_state.id ? p.project_state.name : "",
          scope:
            p.project_scope && p.project_scope.id ? p.project_scope.name : "",
          leader: p.leader && p.leader.id ? p.leader.username : "",
          date_start: p.date_start,
          date_end: p.date_end,
          mother: p.mother ? p.mother.name : "",
          estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : "",
          real_hours: p.total_real_hours ? p.total_real_hours : "",

          estimated_incomes: p.total_incomes ? p.total_incomes : "",
          estimated_expenses: p.total_expenses ? p.total_expenses : "",
          estimated_hours_price: p.total_estimated_hours_price ? p.total_estimated_hours_price : "",
          estimated_result: p.incomes_expenses ? p.incomes_expenses : "",

          real_incomes: p.total_real_incomes ? p.total_real_incomes : "",
          real_expenses: p.total_real_expenses ? p.total_real_expenses : "",
          real_hours_price: p.total_real_hours_price ? p.total_real_hours_price : "",
          real_result: p.total_real_incomes_expenses ? p.total_real_incomes_expenses : ""
        };
      });
      return projectsCSV;
    }
  },
  async mounted() {
    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    const permissions = me.data.permissions.map(p => p.permission);
    if (!permissions.includes("projects")) {
      if (permissions.includes("orders")) {
        this.$router.push("/orders");
      } else if (!permissions.includes("projects")) {
        this.$router.push("/dedicacio");
      } else {
        return;
      }
    }

    this.fillChartData();

    if (!localStorage.getItem("welcome")) {
      this.$buefy.snackbar.open({
        message: "Benvinguda",
        queue: false
      });
      localStorage.setItem("welcome", "true");
    }

    service({ requiresAuth: true, cached: true })
      .get("project-states")
      .then(r => {
        this.project_states = [...r.data];
        this.project_states.unshift({ id: 0, name: "Tots" });
        // this.filters.project_state = defaultProjectState
      });

    service({ requiresAuth: true, cached: true })
      .get("users?_limit=-1")
      .then(r => {
        const users = r.data.filter(u => !u.hidden);
        this.users = users;
      });

    service({ requiresAuth: true, cached: true })
      .get("project-types?_limit=-1")
      .then(r => {
        this.project_types = r.data;
      });

    // service({ requiresAuth: true })
    //   .get("contacts/count")
    //   .then((r) => {
    //     this.contactsNumber = r.data;
    //   });

    service({ requiresAuth: true, cached: true })
      .get("project-scopes?_limit=-1&_sort=code:ASC")
      .then(r => {
        this.scopes = r.data.filter(s => !s.disabled);
      });
    service({ requiresAuth: true, cached: true })
      .get("project-likelihoods?_limit=-1")
      .then(r => {
        this.project_likelihoods = r.data.filter(s => !s.disabled);
      });
    this.loading = true;
    const query = `projects/basic?_limit=-1&project_state=1`;
    service({ requiresAuth: true })
      .get(query)
      .then(r => {
        this.projects = sortBy(
          r.data.filter(
            p => p.project_state !== null
          ),
          "name"
        );
        this.loading = false;
        this.applyProjects();
      });

    // "done" is the last state by order, as on the Tasques board (it was the id 3)
    Promise.all([
      service({ requiresAuth: true }).get("tasks?_limit=-1&_where[archived_eq]=false"),
      service({ requiresAuth: true, cached: true }).get("task-states?_sort=order")
    ])
      .then(([r, statesResponse]) => {
        const allTasks = r.data;
        const states = statesResponse.data || [];
        const myTasks = allTasks.filter(
          t =>
            t.users_permissions_users &&
            t.users_permissions_users.length &&
            t.task_state &&
            !isDone(t, states) &&
            t.users_permissions_users.find(u => u.username === this.userName) &&
            t.due_date &&
            t.due_date <= moment().format("YYYY-MM-DD")
        );
        const myChecklists = allTasks.filter(
          t =>
            t.checklist &&
            t.checklist.length &&
            t.checklist.find(
              c =>
                c.user &&
                c.user.username === this.userName &&
                c.done === false &&
                c.due_date &&
                c.due_date <= moment().format("YYYY-MM-DD")
            )
        );
        if (myTasks.length || myChecklists.length) {
          // a notice of this list: closed when leaving it (it covered the project's save bar)
          this.overdueNotice = this.$buefy.snackbar.open({
            message: "Atenció, tens tasques amb la data límit superada!",
            queue: false,
            indefinite: true
          });
        }
      });
  },
  beforeUnmount() {
    if (this.overdueNotice) this.overdueNotice.close();
  },
  methods: {
    toggleProjectsEditMode() {
      this.projectsEditMode = !this.projectsEditMode;
    },
    navNewProject() {
      this.$router.push("/project/0");
    },
    switchToMotherProjects() {
      localStorage.setItem("projectsDefaultView", "mother");
      this.$router.push("/mother-projects");
    },
    onChange(event) {
      this.doFilteredQuery(this.filters.q);
    },
    onUserChange(event) {
      this.doFilteredQuery(this.filters.q);
    },
    randomChartData(n) {
      const data = [];

      for (let i = 0; i < n; i++) {
        data.push(Math.round(Math.random() * 200));
      }

      return data;
    },
    queryProjects(q) {
      if (this.queryChanged) {
        clearTimeout(this.queryChanged);
      }
      this.queryChanged = setTimeout(() => {
        this.filters.q = q;
        this.doFilteredQuery(q);
      }, 400);
    },
    doFilteredQuery(q) {
      const where1 = this.filters.project_state
        ? `&project_state=${this.filters.project_state}`
        : "";
      const where2 = this.filters.scopeId
        ? "&project_scope=" + this.filters.scopeId
        : "";
      const where3 =
        this.filters.user && this.filters.user > 0
          ? "&leader=" + this.filters.user
          : "";
      this.loading = true;
      if (q) {
        service({ requiresAuth: true })
          .get(
            `projects/basic?_limit=-1&_sort=name:ASC&_q=${this.filters.q}${where1}${where2}${where3}`
          )
          .then(r => {
            this.projects = r.data;
            this.loading = false;
            this.applyProjects();
          });
      } else {
        service({ requiresAuth: true })
          .get(`projects/basic?_limit=-1${where1}${where2}${where3}`)
          .then(r => {
            this.projects = r.data;
            this.loading = false;
            this.applyProjects();
          });
      }
      // page=1&pageSize=10&_sort=name:ASC&_q=c00
    },
    applyProjects() {
      this.projectsNumber = this.projects.length;
      this.balance = sumBy(this.projects, p => {
        return p.incomes_expenses;
      });
      this.realIncomes = sumBy(this.projects, "total_real_incomes_expenses");
      this.realExpenses = sumBy(this.projects, p => {
        return 0;
      });
      this.estimatedDedication = sumBy(this.projects, p => {
        return p.total_estimated_hours ? p.total_estimated_hours : 0;
      });
      this.dedication = sumBy(this.projects, p => {
        return p.total_real_hours ? p.total_real_hours : 0;
      });
    },
    fillChartData() {
      this.defaultChart.chartData = {
        datasets: [
          {
            fill: false,
            borderColor: chartConfig.chartColors.default.primary,
            borderWidth: 2,
            borderDash: [],
            borderDashOffset: 0.0,
            pointBackgroundColor: chartConfig.chartColors.default.primary,
            pointBorderColor: "rgba(255,255,255,0)",
            pointHoverBackgroundColor: chartConfig.chartColors.default.primary,
            pointBorderWidth: 20,
            pointHoverRadius: 4,
            pointHoverBorderWidth: 15,
            pointRadius: 4,
            data: this.randomChartData(9)
          }
        ],
        labels: ["01", "02", "03", "04", "05", "06", "07", "08", "09"]
      };
    },
    setScope(scopeId) {
      this.filters.scopeId = scopeId;
      this.doFilteredQuery(this.filters.q);
    }
  }
};
</script>
<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
  margin-bottom: 1.25rem;
}
.filter-bar .field {
  margin: 0;
}
.filter-search {
  flex: 1 1 16rem;
  max-width: 21rem;
}
.filter-select {
  display: inline-flex;
  align-items: center;
  height: 2.5rem;
  padding-left: .75rem;
  border: 1px solid var(--a-input);
  border-radius: 8px;
  background: var(--a-surface);
}
.filter-select > span {
  color: var(--a-muted);
  font-weight: 600;
  font-size: .875rem;
}
.filter-select :deep(.select select) {
  border: 0;
  box-shadow: none;
  height: 2.375rem;
  font-weight: 700;
  background: transparent;
}
.filter-select:focus-within {
  border-color: var(--a-accent);
  box-shadow: 0 0 0 3px var(--a-focus);
}
.segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--a-seg);
}
.segmented button {
  height: 2.125rem;
  padding: 0 .75rem;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font: inherit;
  font-size: .875rem;
  font-weight: 600;
  color: var(--a-fg-2);
  cursor: pointer;
}
.segmented button.is-on {
  background: var(--a-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
  font-weight: 800;
  color: var(--a-fg);
}
.card-header-actions {
  display: flex;
  align-items: center;
  padding-right: 1rem;
}
</style>
