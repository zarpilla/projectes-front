<template>
  <div>
    <b-loading
        :is-full-page="true"
        v-model="isLoading"
        :can-cancel="false"
      ></b-loading>
    <div id="project-stats"></div>
    <dedication-gantt-chart
      :leaders="leaders"
      :view="view"
      :periods="periods"
      :cells="cells"
      v-if="!isLoading"
    ></dedication-gantt-chart>
    <download-excel :data="pivotData">
      <b-button
        title="Exporta dades"
        class="export-button mt-0"
        icon-left="file-excel"
      />
    </download-excel>
  </div>
</template>

<script>
import service from "@/service/index";
import moment from "moment";
import DedicationGanttChart from "@/components/DedicationGanttChart";


moment.locale("ca");

export default {
  name: "DedicationPivot",
  components: { DedicationGanttChart },
  props: {
    projectStates: {
      type: Array[Number],
      default: [],
    },
    view: {
      type: String,
      default: "month",
    },
    hoursType: {
      type: String,
      default: "previstes",
    },
  },
  data() {
    return {
      leaders: [],
      periods: [],
      cells: {},
      pivotData: [],
      isLoading: true,
      year: parseInt(moment().format("YYYY")),
    };
  },
  watch: {
    projectStates: function () {
      this.getActivities();
    },
    view: function () {
      this.getActivities();
    },
    hoursType: function () {
      this.getActivities();
    },
  },
  mounted() {
    this.getActivities();
  },
  methods: {
    async getActivities() {
      this.isLoading = true;

      if (this.projectStates.length === 0) {
        return;
      }

      const projectStates = this.projectStates.join(",");
      const query = `projects/dedications?_where[project_state_in]=${projectStates}&hoursType=${this.hoursType}&year=${this.year}&view=${this.view}`;

      try {
        const response = await service({ requiresAuth: true }).get(query);
        this.leaders = response.data.leaders || [];
        this.periods = response.data.periods || [];
        this.cells = response.data.cells || {};
        this.pivotData = response.data.dedications || [];
      } catch (error) {
        console.error("Error loading dedications:", error);
        this.leaders = [];
        this.periods = [];
        this.cells = {};
        this.pivotData = [];
      } finally {
        this.isLoading = false;
      }
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
