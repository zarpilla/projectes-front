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
        income_esti: {
          field: 'income_esti',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        income_real: {
          field: 'income_real',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        expense_esti: {
          field: 'income_real',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        expense_real: {
          field: 'income_real',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        total_estimated_hours_price: {
          field: 'total_estimated_hours_price',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        total_real_hours_price: {
          field: 'total_real_hours_price',
          callback: (value) => {
            return excelFormat(value);
          },
        },
      }"
      name="detall-ingressos-despeses"
    >
      <b-button
        title="Exporta dades"
        class="export-button"
        icon-left="file-excel"
        label="Descarrega detall"
      />
    </download-excel>
    <download-excel
      class="export"
      :data="pivotDataGroupped"
      :fields="{
        id: 'id',
        project_name: 'project_name',        
        'Resultat prev': {
          field: 'esti',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        'Resultat exec': {
          field: 'real',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        'Ingressos prev': {
          field: 'income_esti',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        'Ingressos exec': {
          field: 'income_real',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        'Despeses tot prev': {
          field: 'total_expense_esti',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        'Despeses tot exec': {
          field: 'total_expense_real',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        'Despeses prev': {
          field: 'expense_esti',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        'Despeses exec': {
          field: 'expense_real',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        'Hores prev': {
          field: 'total_estimated_hours_price',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        'Hores exec': {
          field: 'total_real_hours_price',
          callback: (value) => {
            return excelFormat(value);
          }          
        }
      }"
      name="detall-ingressos-despeses"
    >
      <b-button
        title="Exporta dades"
        class="export-button"
        icon-left="file-excel"
        label="Descarrega totals per projecte"
      />
    </download-excel>    
    <!-- <pre>
      {{ pivotDataGroupped }}
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
import { mapState } from "vuex";
import { format } from "@/helpers/excelFormatter";
import _ from "lodash";

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
  computed: {
    ...mapState(["userName", "user"]),
    pivotDataGroupped() {
      return _(this.pivotData)
        .groupBy("id")
        .map((rows, id) => ({
          id: id,
          project_name: rows[0].project_name,          
          esti: (_.sumBy(rows, "income_esti") || 0) + (_.sumBy(rows, "expense_esti") || 0) + (_.sumBy(rows, "total_estimated_hours_price") || 0),
          real: (_.sumBy(rows, "income_real") || 0) + (_.sumBy(rows, "expense_real") || 0) + (_.sumBy(rows, "total_real_hours_price") || 0),
          income_esti: _.sumBy(rows, "income_esti") || 0,
          income_real: _.sumBy(rows, "income_real") || 0,
          total_expense_esti: (_.sumBy(rows, "expense_esti") || 0) + (_.sumBy(rows, "total_estimated_hours_price") || 0),
          total_expense_real: (_.sumBy(rows, "expense_real") || 0) + (_.sumBy(rows, "total_real_hours_price") || 0),
          expense_esti: _.sumBy(rows, "expense_esti") || 0,
          expense_real: _.sumBy(rows, "expense_real") || 0,
          total_estimated_hours_price:
            _.sumBy(rows, "total_estimated_hours_price") || 0,
          total_real_hours_price: _.sumBy(rows, "total_real_hours_price") || 0,

        }))
        .value();
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
    excelFormat(value) {
      return format(this.user, value);
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
