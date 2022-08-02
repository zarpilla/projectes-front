<template>
  <div>
    <div id="project-despeses"></div>
    <download-excel
      class="export"
      :data="pivotData"
      :fields="{
        id: 'id',
        project_name: 'project_name',
        project_scope: 'project_scope',
        project_state: 'project_state',
        project_type: 'project_type',
        project_leader: 'project_leader',
        mother: 'mother',
        type: 'type',
        date: 'date',
        year: 'year',
        month: 'month',
        paid: 'paid',
        row_type: 'row_type',
        income_esti: 'income_esti',
        income_real: 'income_real',
        expense_esti: 'expense_esti',
        expense_real: 'expense_real',
        total_estimated_hours_price: 'total_estimated_hours_price',
        total_real_hours_price: 'total_real_hours_price',
      }"
      name="detall-ingressos-despeses"
    >
      <b-button
        title="Exporta dades"
        class="export-button"
        icon-left="file-excel"
      />
    </download-excel>
    <!-- <pre>
      {{ pivotData }}
    </pre> -->
  </div>
</template>

<script>
import service from "@/service/index";
import sumBy from "lodash/sumBy";
import sortBy from "lodash/sortBy";
import omit from "lodash/omit";
import moment from "moment";
import configPivot from "@/service/configStatsEconomicDetail";

moment.locale("ca");

export default {
  name: "ProjectesPivot",
  components: {},
  props: {
    projectState: {
      type: Number,
      default: 0,
    },
    date1: {
      type: Date,
      default: null,
    },
    date2: {
      type: Date,
      default: null,
    },
  },
  data() {
    return {
      projects: [],
      projectsList: [],
      dedicationTypes: {},
      activityTypes: {},
      users: [],
      usersList: [],
      modalObjectName: "",
      userNameSearch: "",
      projectNameSearch: "",
      scopes: [],
      states: [],
      leaders: [],
      contacts: [],
      pivotData: [],
    };
  },
  watch: {
    // user: function (newVal, oldVal) {
    //   console.log('user newVal', newVal)
    //   this.getActivities()
    // },
    date1: function (newVal, oldVal) {
      this.getActivities();
    },
    date2: function (newVal, oldVal) {
      this.getActivities();
    },
    // project: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    projectState: function (newVal, oldVal) {
      this.getActivities();
    },
  },
  mounted() {
    // console.log('mounted')
    this.getActivities();
  },
  methods: {
    async getActivities() {
      this.isLoading = true;
      const projectState = this.projectState !== null ? this.projectState : 1;
      let query = `projects/economic-detail?_where[project_state_eq]=${projectState}&_limit=-1`;
      if (projectState === 0 || projectState === "0") {
        query = "projects/economic-detail?_limit=-1";
      }
      const { data } = await service({ requiresAuth: true }).get(query);
      const data2 = data.map((c) => {
        return omit(c, ["document"]);
      });
      this.pivotData = Object.freeze(sortBy(data2, ["project_name"]));
      configPivot.dataSource.data = this.pivotData;
      window.jQuery("#project-despeses").empty();
      window.jQuery("#project-despeses").kendoPivotGrid(configPivot);
      this.isLoading = false;
    },
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
    },
  },
};
</script>
<style>
.card-body {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}
.card-header-title {
  text-transform: capitalize;
}
.is-activity {
  cursor: pointer;
}
.is-total {
  background: #eee;
  text-transform: capitalize;
}
.auxiliar {
  color: #999;
}
.projects-bars {
  margin-bottom: 2rem;
}
.projects-bars progress {
  margin-top: 1rem;
}
.view-button {
  margin-left: 0.5rem;
}
.export-button {
  margin-top: 1rem;
}
</style>
