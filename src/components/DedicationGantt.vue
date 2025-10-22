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
      :dedications="pivotData"
      :festives="festives"
      v-if="!isLoading"
    ></dedication-gantt-chart>
    <download-excel :data="pivotData">
      <b-button
        title="Exporta dades"
        class="export-button mt-0"
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
import moment from "moment";
import DedicationGanttChart from "@/components/DedicationGanttChart";
import sortBy from "lodash/sortBy";


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
      scopes: [],
      states: [],
      leaders: [],
      pivotData: [],
      isLoading: true,
      festives: [],
      year: parseInt(moment().format("YYYY")),
    };
  },
  watch: {
    projectStates: function (newVal, oldVal) {
      this.getActivities();
    },
    view: function (newVal, oldVal) {
      this.getActivities();
    },
  },
  mounted() {
    // console.log('mounted')
    console.log("gantt dg", gantt);

    this.getActivities();
  },
  methods: {
    async getActivities() {
      this.isLoading = true;

      if (
        this.projectStates.length === 0 ||
        this.year === null ||
        this.month === null
      ) {
        return;
      }

      this.scopes = (
        await service({ requiresAuth: true, cached: true }).get("project-scopes")
      ).data;
      this.states = (
        await service({ requiresAuth: true, cached: true }).get("project-states")
      ).data;
      this.leaders = (await service({ requiresAuth: true }).get("users")).data //.filter(u => u.username === 'Ariadna');
      
      const projectStates = this.projectStates.join(',')
      let query = `projects/phases?_where[project_state_in]=${projectStates}&_limit=-1`;
      
      const from = moment().startOf("year").format("YYYY-MM-DD");
      this.festives = (
        await service({ requiresAuth: true }).get(
          `festives?_where[date_gt]=${from}&_limit=-1`
        )
      ).data;

      // Convert festives to a Map for O(1) lookup performance
      const festivesMap = new Map();
      this.festives.forEach(f => {
        const userId = f.users_permissions_user && f.users_permissions_user.id ? f.users_permissions_user.id : 'all';
        const key = `${f.date}-${userId}`;
        festivesMap.set(key, f);
      });

      try {
        const response = await service({ requiresAuth: true }).get(query);
        
        // Use requestIdleCallback to avoid blocking the UI thread
        const processData = () => {
          return new Promise((resolve) => {
            const activities = [];
            
            // Process data in chunks to avoid blocking the UI
            const processChunk = (projects, startIndex = 0, chunkSize = 10) => {
              const endIndex = Math.min(startIndex + chunkSize, projects.length);
              
              for (let projectIndex = startIndex; projectIndex < endIndex; projectIndex++) {
                const p = projects[projectIndex];
                this.processProject(p, activities, festivesMap);
              }
              
              if (endIndex < projects.length) {
                // Use requestIdleCallback for better performance
                if (window.requestIdleCallback) {
                  requestIdleCallback(() => processChunk(projects, endIndex, chunkSize));
                } else {
                  setTimeout(() => processChunk(projects, endIndex, chunkSize), 0);
                }
              } else {
                // Processing complete
                this.projects = projects;
                this.pivotData = sortBy(
                  activities,
                  ["year", "month", "project_name"],
                  ["asc", "asc", "asc"]
                );
                this.isLoading = false;
                resolve();
              }
            };
            
            processChunk(response.data);
          });
        };
        
        await processData();
      } catch (error) {
        console.error('Error processing activities:', error);
        this.isLoading = false;
      }
    },

    processProject(p, activities, festivesMap) {
      if (p.project_original_phases && p.project_original_phases.length > 0) {
        p.project_original_phases.forEach((ph) => {
          if (ph.incomes && ph.incomes.length > 0) {
            ph.incomes.forEach((sph) => {
              if (sph.estimated_hours && sph.estimated_hours.length > 0) {
                sph.estimated_hours.forEach((h) => {
                  this.processEstimatedHours(p, h, activities, festivesMap);
                });
              }
            });
          }
        });
      } else if (p.estimated_hours && p.estimated_hours.length > 0) {
        p.estimated_hours.forEach((a) => {
          this.processLegacyEstimatedHours(p, a, activities);
        });
      }
    },

    processEstimatedHours(p, h, activities, festivesMap) {
      const fromMoment = moment(h.from, "YYYY-MM-DD");
      const toMoment = moment(h.to, "YYYY-MM-DD");
      const diff = moment.duration(toMoment.diff(fromMoment));
      const mdiff = Math.round(diff.asDays());
      
      let estimated_hours = h.quantity && mdiff > 0 ? h.quantity / mdiff : 0;

      if (h.quantity_type === "month") {
        estimated_hours = h.quantity / 30;
      }
      if (h.quantity_type === "week") {
        estimated_hours = h.quantity / 5;
      }

      // Pre-calculate common project properties
      const projectBase = {
        project_name: p.name,
        project_leader: p.leader && p.leader.username ? p.leader.username : "-",
        project_state: p.project_state && p.project_state.name ? p.project_state.name : "-",
        project_scope: p.project_scope && p.project_scope.short_name ? p.project_scope.short_name : "-",
        project_scope_name: p.project_scope && p.project_scope.name ? p.project_scope.name : "-",
        project_client: p.client && p.client.name ? p.client.name : "-",
        total_estimated_hours: p.total_estimated_hours || 0,
        total_real_hours: p.total_real_hours || 0,
        count: 1,
        day: 0,
        date: "-",
        hours: 0,
        estimated_hours: estimated_hours,
        dedication_type: "-",
        username: h.users_permissions_user && h.users_permissions_user.username ? h.users_permissions_user.username : "-",
      };

      const weekendCount = (h.quantity_type === "month" || h.quantity_type === "week");
      const userId = h.users_permissions_user && h.users_permissions_user.id ? h.users_permissions_user.id : null;

      for (let i = 0; i < mdiff; i++) {
        const currentDay = fromMoment.clone().add(i, "days");
        const dayFormat = currentDay.format("YYYY-MM-DD");
        
        // Fast festive lookup using Map
        const festiveKey = `${dayFormat}-${userId || 'all'}`;
        const festiveKeyAll = `${dayFormat}-all`;
        const festive = festivesMap.get(festiveKey) || festivesMap.get(festiveKeyAll);

        const dayOfWeek = currentDay.day();
        
        if ((![0, 6].includes(dayOfWeek) && !festive && weekendCount) || !weekendCount) {
          const year = currentDay.isoWeekYear();
          
          if (year >= this.year) {
            const activity = {
              ...projectBase,
              from: dayFormat,
              to: currentDay.clone().add(1, "day").format("YYYY-MM-DD"),
              week: currentDay.isoWeek(),
              month: currentDay.format("MM"),
              year: year,
            };
            activities.push(activity);
          }
        }
      }
    },

    processLegacyEstimatedHours(p, a, activities) {
      if (
        (this.year === 0 ||
          (this.year > 0 &&
            a.year &&
            a.year.year &&
            a.year.year === this.year)) &&
        (this.month === 0 ||
          (this.month > 0 &&
            a.month &&
            a.month.month &&
            a.month.month === this.month))
      ) {
        const activity = {
          project_name: p.name,
          project_leader: p.leader && p.leader.username ? p.leader.username : "-",
          project_state: p.project_state && p.project_state.name ? p.project_state.name : "-",
          project_scope: p.project_scope && p.project_scope.short_name ? p.project_scope.short_name : "-",
          project_scope_name: p.project_scope && p.project_scope.name ? p.project_scope.name : "-",
          project_client: p.client && p.client.name ? p.client.name : "-",
          total_estimated_hours: p.total_estimated_hours || 0,
          total_real_hours: p.total_real_hours || 0,
          count: 1,
          month: a.month && a.month.month_number ? a.month.month_number.toString() : "0",
          year: a.year && a.year.year ? a.year.year.toString() : "0",
          day: 0,
          date: "-",
          hours: 0,
          estimated_hours: a.quantity || 0,
          dedication_type: "-",
          username: a.users_permissions_user && a.users_permissions_user.username ? a.users_permissions_user.username : "-",
        };
        activities.push(activity);
      }
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
