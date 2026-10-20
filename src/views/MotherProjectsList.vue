<template>
  <div>
    <title-bar :title-stack="titleStack" :subtitle="subtitle">
      <download-excel name="projectes-mare" :data="projectsCSV" :fields="projectsExportFields">
        <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
      </download-excel>
      <b-button icon-left="folder" @click="switchToRegularProjects">Tots els projectes</b-button>
      <b-button type="is-primary" icon-left="plus" @click="navNewProject">Nou projecte</b-button>
    </title-bar>
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent="applyFilters">
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
          <b-select v-model="filters.project_state" @change="onFilterChange">
            <option v-for="(s, index) in project_states" :key="index" :value="s.id">
              {{ s.name }}
            </option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Coordina</span>
          <b-select v-model="filters.user" @change="onFilterChange">
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

      <!-- the same table as Projectes (issues/134): name with client, tags,
           hours bar, coloured results and a totals row -->
      <div class="card has-table projects-card">
        <header class="card-header">
          <p class="card-header-title">Projectes mare</p>
        </header>
        <projects-table
          :project_state="filters.project_state"
          :projects="motherProjects"
          sum-mothers
          :users="users"
          :project-states="project_states"
          :scopes="scopes"
        />
      </div>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import ProjectsTable from "@/components/ProjectsTable.vue";
import service from "@/service/index";
import { projectsExportFields, exportDate } from "@/domain/projectsExport";
import sortBy from "lodash/sortBy";

export default {
  name: "MotherProjectsList",
  components: {
    ProjectsTable,
    TitleBar
  },
  data() {
    return {
      projects: [],
      scopes: [],
      project_states: [],
      users: [],
      filters: { project_state: 0, q: "", user: "0", scopeId: 0 },
      queryChanged: 0
    };
  },
  computed: {
    titleStack() {
      return ["Projectes", "Projectes Mare"];
    },
    motherProjects() {
      return sortBy(this.projects.filter(p => p.is_mother === true), "name");
    },
    projectsNumber() {
      return this.motherProjects.length;
    },
    subtitle() {
      const state = this.project_states.find(s => s.id === this.filters.project_state);
      const count = `${this.projectsNumber} ${this.projectsNumber === 1 ? "projecte mare" : "projectes mare"}`;
      return state && state.id ? `${count} · ${state.name.toLowerCase()}` : count;
    },
    // Catalan headers for the export (issues/212)
    projectsExportFields() {
      return projectsExportFields(Object.keys(this.projectsCSV[0] || {}));
    },
    projectsCSV() {
      return this.motherProjects.map(p => {
        return {
          id: p.id,
          name: p.name,
          state: p.project_state && p.project_state.id ? p.project_state.name : "",
          scope: p.project_scope && p.project_scope.id ? p.project_scope.name : "",
          leader: p.leader && p.leader.id ? p.leader.username : "",
          date_start: exportDate(p.date_start),
          date_end: exportDate(p.date_end),
          real_hours: p.total_real_hours || 0,
          estimated_hours: p.total_estimated_hours || 0,
          real_result: p.total_real_incomes_expenses || 0,
          estimated_result: p.incomes_expenses || 0
        };
      });
    }
  },
  mounted() {
    service({ requiresAuth: true, cached: true })
      .get("project-states")
      .then(r => {
        this.project_states = [...r.data];
        this.project_states.unshift({ id: 0, name: "Tots" });
      });

    service({ requiresAuth: true, cached: true })
      .get("users?_limit=-1")
      .then(r => {
        const users = r.data.filter(u => !u.hidden);
        this.users = users;
      });

    service({ requiresAuth: true, cached: true })
      .get("project-scopes?_limit=-1&_sort=code:ASC")
      .then(r => {
        this.scopes = r.data.filter(s => !s.disabled);
      });

    this.loadProjects();
  },
  methods: {
    navNewProject() {
      this.$router.push("/project/0");
    },
    switchToRegularProjects() {
      localStorage.setItem("projectsDefaultView", "regular");
      this.$router.push("/projectes");
    },
    onFilterChange() {
      this.doFilteredQuery(this.filters.q);
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
    loadProjects() {
      // Use full projects endpoint to get all economic data, not projects/basic
      const query = "projects?_limit=-1&is_mother=true";
      service({ requiresAuth: true })
        .get(query)
        .then(r => {
          this.projects = r.data;
        });
    },
    doFilteredQuery(q) {
      const where1 = this.filters.project_state && this.filters.project_state > 0
        ? `&_where[project_state_eq]=${this.filters.project_state}`
        : "";
      const where2 = this.filters.scopeId
        ? "&project_scope=" + this.filters.scopeId
        : "";
      const where3 =
        this.filters.user && this.filters.user > 0
          ? "&leader=" + this.filters.user
          : "";

      if (q) {
        service({ requiresAuth: true })
          .get(
            `projects?_limit=-1&is_mother=true&_sort=name:ASC&_q=${this.filters.q}${where1}${where2}${where3}`
          )
          .then(r => {
            this.projects = r.data;
          });
      } else {
        service({ requiresAuth: true })
          .get(`projects?_limit=-1&is_mother=true${where1}${where2}${where3}`)
          .then(r => {
            this.projects = r.data;
          });
      }
    },
    setScope(scopeId) {
      this.filters.scopeId = scopeId;
      this.doFilteredQuery(this.filters.q);
    },
    applyFilters() {
      this.doFilteredQuery(this.filters.q);
    }
  }
};
</script>
