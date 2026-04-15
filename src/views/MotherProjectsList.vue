<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <!-- <tiles>
        <card-widget
          class="tile is-child"
          type="is-primary"
          icon="account-multiple"
          :number="projectsNumber"
          label="Projectes Mare"
        />
        <card-widget
          class="tile is-child"
          type="is-danger"
          icon="clock-outline"
          :number="dedication"
          label="Hores reals"
        />
        <card-widget
          class="tile is-child"
          type="is-success"
          icon="clock"
          :number="estimatedDedication"
          label="Hores previstes"
        />
        <card-widget
          class="tile is-child"
          type="is-info"
          icon="currency-eur"
          :number="realBalance.toFixed(2)"
          suffix="€"
          label="Resultat actual"
        />
        <card-widget
          class="tile is-child"
          type="is-info"
          icon="currency-eur"
          :number="estimatedBalance.toFixed(2)"
          suffix="€"
          label="Resultat previst"
        />
      </tiles> -->

      <card-component title="FILTRES">
        <form @submit.prevent="applyFilters">
          <b-field grouped>
            <b-field horizontal label="Estat">
              <b-select
                v-model="filters.project_state"
                placeholder="Estat"
                @change.native="onFilterChange"
              >
                <option
                  v-for="(s, index) in project_states"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </b-select>
            </b-field>
            <b-field horizontal label="Coordina">
              <b-select
                v-model="filters.user"
                placeholder="Coordina"
                @change.native="onFilterChange"
              >
                <option value="0">--</option>
                <option
                  v-for="(s, index) in users"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.username }}
                </option>
              </b-select>
            </b-field>
            <b-field horizontal label="Nom">
              <b-input
                :value="filters.q"
                @keyup.native="queryProjects($event.target.value)"
                placeholder="Nom del projecte"
              />
            </b-field>
          </b-field>
        </form>
      </card-component>

      <div class="actions is-flex mb-5" style="justify-content: space-between;">
        <div class="is-flex">
          <b-button
            class="view-button is-primary"
            @click="navNewProject"
            icon-left="plus"
          >
            Nou projecte
          </b-button>
          <download-excel :data="projectsCSV">
            <b-button
              title="Exporta dades"
              class="export-button mt-0 ml-4"
              icon-left="file-excel"
            />
          </download-excel>
        </div>
        <b-button
          class="is-info"
          @click="switchToRegularProjects"
          icon-left="folder"
        >
          Tots els Projectes
        </b-button>
      </div>

      <card-component
        title="PROJECTES MARE"
        class="has-table has-mobile-sort-spaced"
      >
        <mother-projects-table :projects="projects" />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import Tiles from "@/components/Tiles";
import CardWidget from "@/components/CardWidget";
import CardComponent from "@/components/CardComponent";
import MotherProjectsTable from "@/components/MotherProjectsTable";
import service from "@/service/index";
import sumBy from "lodash/sumBy";

export default {
  name: "MotherProjectsList",
  components: {
    MotherProjectsTable,
    CardComponent,
    CardWidget,
    Tiles,
    TitleBar
  },
  data() {
    return {
      projects: [],
      scopes: [],
      project_states: [],
      users: [],
      filters: { project_state: 0, q: "", user: "", scopeId: 0 },
      queryChanged: 0
    };
  },
  computed: {
    titleStack() {
      return ["Projectes", "Projectes Mare"];
    },
    motherProjects() {
      return this.projects.filter(p => p.is_mother === true);
    },
    projectsNumber() {
      return this.motherProjects.length;
    },
    estimatedBalance() {
      return sumBy(this.motherProjects, p => p.incomes_expenses || 0);
    },
    realBalance() {
      return sumBy(this.motherProjects, p => p.total_real_incomes_expenses || 0);
    },
    estimatedDedication() {
      return sumBy(this.motherProjects, p => p.total_estimated_hours || 0);
    },
    dedication() {
      return sumBy(this.motherProjects, p => p.total_real_hours || 0);
    },
    projectsCSV() {
      return this.motherProjects.map(p => {
        return {
          id: p.id,
          name: p.name,
          state: p.project_state && p.project_state.id ? p.project_state.name : "",
          scope: p.project_scope && p.project_scope.id ? p.project_scope.name : "",
          leader: p.leader && p.leader.id ? p.leader.username : "",
          date_start: p.date_start,
          date_end: p.date_end,
          estimated_hours: p.total_estimated_hours ? p.total_estimated_hours.toString().replace(".", ",") : "0",
          real_hours: p.total_real_hours ? p.total_real_hours.toString().replace(".", ",") : "0",
          estimated_hours_price: p.total_estimated_hours_price ? p.total_estimated_hours_price.toString().replace(".", ",") : "0",
          real_hours_price: p.total_real_hours_price ? p.total_real_hours_price.toString().replace(".", ",") : "0",
          estimated_incomes: p.total_incomes ? p.total_incomes.toString().replace(".", ",") : "0",
          estimated_expenses: p.total_expenses ? p.total_expenses.toString().replace(".", ",") : "0",
          estimated_result: p.incomes_expenses ? p.incomes_expenses.toString().replace(".", ",") : "0",
          real_incomes: p.total_real_incomes ? p.total_real_incomes.toString().replace(".", ",") : "0",
          real_expenses: p.total_real_expenses ? p.total_real_expenses.toString().replace(".", ",") : "0",
          real_result: p.total_real_incomes_expenses ? p.total_real_incomes_expenses.toString().replace(".", ",") : "0"
        };
      });
    }
  },
  mounted() {
    this.$buefy.snackbar.open({
      message: "Benvinguda",
      queue: false
    });

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
        this.scopes = r.data;
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

<style scoped>
.scope {
  width: 100%;
}
</style>
