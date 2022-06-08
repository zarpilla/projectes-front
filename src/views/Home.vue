<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <!-- <hero-bar :has-right-visible="false">
      General
    </hero-bar> -->
    <section class="section is-main-section">
      <tiles>
        <card-widget
          class="tile is-child"
          type="is-primary"
          icon="account-multiple"
          :number="projectsNumber"
          label="Projectes"
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
        /><card-widget
          class="tile is-child"
          type="is-info"
          icon="currency-eur"
          :number="(realIncomes - realExpenses).toFixed(2)"
          suffix="€"
          label="Resultat actual"
        />
        <card-widget
          class="tile is-child"
          type="is-info"
          icon="currency-eur"
          :number="balance.toFixed(2)"
          suffix="€"
          label="Resultat previst"
        />
      </tiles>
      <!-- <card-component
        title="Performance"
        icon="finance"
        header-icon="reload"
        @header-icon-click="fillChartData"
      >
        <div v-if="defaultChart.chartData" class="chart-area">
          <bar-chart
            ref="bigChart"
            style="height: 100%;"
            chart-id="big-line-chart"
            :chart-data="defaultChart.chartData"
            :extra-options="defaultChart.extraOptions"
          >
          </bar-chart>
        </div>
      </card-component> -->

      <card-component title="FILTRES">
        <form @submit.prevent="submit2">
          <b-field grouped>
            <b-field horizontal label="Estat">
              <b-select
                v-model="filters.project_state"
                placeholder="Estat"
                @change.native="onChange($event)"
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
                @change.native="onUserChange($event)"
              >
                <option value="0">--</option>
                <option v-for="(s, index) in users" :key="index" :value="s.id">
                  {{ s.username }}
                </option>
              </b-select>
            </b-field>
            <b-field horizontal label="Nom">
              <b-input
                :value="filters.q"
                @keyup.native="queryProjects($event.target.value)"
                placeholder="Nom del projecte"
              >
              </b-input>
            </b-field>
          </b-field>
          <b-field grouped v-if="scopes && scopes.length">
            <div class="columns is-multiline mt-5">
              <div class="column">
                <b-button
                  class="zis-warning scope"
                  @click="setScope(0)"
                  :class="0 === filters.scopeId ? 'is-warning' : 'is-light'"
                >
                  Tots
                </b-button>
              </div>
              <div class="column" v-for="(scope, i) in scopes" :key="i">
                <b-button
                  class="scope"
                  @click="setScope(scope.id)"
                  :class="
                    scope.id === filters.scopeId ? 'is-warning' : 'is-light'
                  "
                >
                  {{ scope.name }}{{ scope.group ? ` - ${scope.group}` : "" }}
                </b-button>
              </div>
            </div>
          </b-field>
        </form>
      </card-component>

      <div class="actions is-flex mb-5">
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
            class="export-button ml-4"
            icon-left="file-excel"
          />
        </download-excel>
      </div>

      <b-loading
        :is-full-page="true"
        v-model="loading"
        :can-cancel="false"
      ></b-loading>

      <card-component
        title="PROJECTES"
        class="has-table has-mobile-sort-spaced"
      >
        <projects-table
          :project_state="filters.project_state"
          :projects="projects"
        />
      </card-component>
    </section>
  </div>
</template>

<script>
// @ is an alias to /src
import * as chartConfig from "@/components/Charts/chart.config";
import TitleBar from "@/components/TitleBar";
import Tiles from "@/components/Tiles";
import CardWidget from "@/components/CardWidget";
import CardComponent from "@/components/CardComponent";
import ProjectsTable from "@/components/ProjectsTable";
import service from "@/service/index";
import sumBy from "lodash/sumBy";
import { mapState } from 'vuex'
import moment from 'moment';

export default {
  name: "Home",
  components: {
    ProjectsTable,
    // BarChart,
    CardComponent,
    CardWidget,
    Tiles,
    // HeroBar,
    TitleBar,
  },
  data() {
    return {
      defaultChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsMain,
      },
      projectsNumber: 0,
      // contactsNumber: 0,
      projects: [],
      activities: [],
      scopes: [],
      balance: 0,
      realIncomes: 0,
      realExpenses: 0,
      dedication: 0,
      estimatedDedication: 0,
      project_states: [],
      filters: { project_state: 1, q: "", user: "", scopeId: 0 },
      queryChanged: 0,
      users: [],
      loading: false,
    };
  },
  computed: {
    ...mapState(['userName']),
    titleStack() {
      return ["Projectes", "General"];
    },
    projectsCSV() {
      // return this.projects
      // console.log('this.projects', this.projects)
      const projectsCSV = this.projects.map((p) => {
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
          mother: p.mother ? p.mother.name : '',
          estimated_hours: p.total_estimated_hours
            ? p.total_estimated_hours.toString().replace(".", ",")
            : "",
          real_hours: p.total_real_hours
            ? p.total_real_hours.toString().replace(".", ",")
            : "",

          estimated_incomes: p.total_incomes
            ? p.total_incomes.toString().replace(".", ",")
            : "",
          estimated_expenses: p.total_expenses
            ? p.total_expenses.toString().replace(".", ",")
            : "",
          estimated_hours_price: p.total_estimated_hours_price
            ? p.total_estimated_hours_price.toString().replace(".", ",")
            : "",
          estimated_result: p.incomes_expenses
            ? p.incomes_expenses.toString().replace(".", ",")
            : "",

          real_incomes: p.total_real_incomes
            ? p.total_real_incomes.toString().replace(".", ",")
            : "",
          real_expenses: p.total_real_expenses
            ? p.total_real_expenses.toString().replace(".", ",")
            : "",
          real_hours_price: p.total_real_hours_price
            ? p.total_real_hours_price.toString().replace(".", ",")
            : "",
          real_result: p.total_real_incomes_expenses
            ? p.total_real_incomes_expenses.toString().replace(".", ",")
            : "",
        };
      });
      return projectsCSV;
    },
  },
  mounted() {
    this.fillChartData();

    this.$buefy.snackbar.open({
      message: "Benvinguda",
      queue: false,
    });

    service({ requiresAuth: true })
      .get("project-states")
      .then((r) => {
        this.project_states = r.data;
        this.project_states.unshift({ id: 0, name: "Tots" });
        // this.filters.project_state = defaultProjectState
      });

    service({ requiresAuth: true })
      .get("users?_limit=-1")
      .then((r) => {
        const users = r.data.filter((u) => !u.hidden);
        this.users = users;
      });

    // service({ requiresAuth: true })
    //   .get("contacts/count")
    //   .then((r) => {
    //     // console.log('contacts', r.data)
    //     this.contactsNumber = r.data;
    //   });

    service({ requiresAuth: true })
      .get("project-scopes?_limit=-1&_sort=code:ASC")
      .then((r) => {
        this.scopes = r.data;
        // this.applyProjects();
      });
    this.loading = true;
    const query = `projects/basic?_limit=-1&project_state=1`;
    service({ requiresAuth: true })
      .get(query)
      .then((r) => {
        this.projects = r.data.filter(
          (p) => p.project_state !== null && p.project_state.id === 1
        );
        this.loading = false;
        this.applyProjects();
      });

    service({ requiresAuth: true })
      .get("tasks?_limit=-1&_where[archived_eq]=false")
      .then((r) => {
        const allTasks = r.data;
        const myTasks = allTasks.filter(t => t.users_permissions_users && t.users_permissions_users.length && t.task_state && t.task_state.id !== 3 && t.users_permissions_users.find(u => u.username === this.userName) && t.due_date && t.due_date <= moment().format('YYYY-MM-DD'))
        const myChecklists = allTasks.filter(t => t.checklist && t.checklist.length && t.checklist.find(c => c.user && c.user.username === this.userName && c.done === false && c.due_date && c.due_date <= moment().format('YYYY-MM-DD')))
        if (myTasks.length || myChecklists.length) {
          this.$buefy.snackbar.open({
            message: "Atenció, tens tasques amb la data límit superada!",
            queue: false,
            indefinite: true
          });
        }
      });
  },
  methods: {
    navNewProject() {
      this.$router.push("/project/0");
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
          .then((r) => {
            this.projects = r.data;
            this.loading = false;
            this.applyProjects();
          });
      } else {
        service({ requiresAuth: true })
          .get(`projects/basic?_limit=-1${where1}${where2}${where3}`)
          .then((r) => {
            this.projects = r.data;
            this.loading = false;
            this.applyProjects();
          });
      }
      // page=1&pageSize=10&_sort=name:ASC&_q=c00
    },
    applyProjects() {
      this.projectsNumber = this.projects.length;
      this.balance = sumBy(this.projects, (p) => {
        return p.incomes_expenses;
      });
      this.realIncomes = sumBy(this.projects, "total_real_incomes_expenses");
      this.realExpenses = sumBy(this.projects, (p) => {
        return 0;
      });
      this.estimatedDedication = sumBy(this.projects, (p) => {
        return p.total_estimated_hours ? p.total_estimated_hours : 0;
      });
      this.dedication = sumBy(this.projects, (p) => {
        return p.total_real_hours ? p.total_real_hours : 0;
      });

      // service({ requiresAuth: true }).get('activities?_limit=-1').then((r) => {
      //   this.activities = r.data.filter(a => a.project !== null && this.projects.find(p => p.id === a.project.id))
      //   this.dedication = sumBy(this.activities, p => {
      //     return p.hours
      //   })
      // })
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
            data: this.randomChartData(9),
          },
        ],
        labels: ["01", "02", "03", "04", "05", "06", "07", "08", "09"],
      };
    },
    setScope(scopeId) {
      this.filters.scopeId = scopeId;
      this.doFilteredQuery(this.filters.q);
    },
  },
};
</script>
