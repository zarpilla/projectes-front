<template>
  <div>
    <b-table
      :loading="isLoading"
      :paginated="paginated"
      :per-page="perPage"
      :striped="true"
      :hoverable="true"
      :data="projectsData"
      :default-sort="['name', 'asc']"
    >
      <b-table-column label="Nom" field="name" sortable v-slot="props">
        <router-link
          :to="{ name: 'project.edit', params: { id: props.row.id } }"
        >
          <span class="project-name has-text-info">
            {{ props.row.name }}
          </span>
        </router-link>
      </b-table-column>
      
      <b-table-column
        label="Coordina"
        field="leader.username"
        sortable
        v-slot="props"
      >
        {{ props.row.leader ? props.row.leader.username : "" }}
      </b-table-column>
      
      <b-table-column
        label="Àmbit"
        field="project_scope.name"
        sortable
        v-slot="props"
      >
        {{ props.row.project_scope ? props.row.project_scope.name : "" }}
      </b-table-column>
      
      <b-table-column
        label="Hores dedicades"
        field="total_real_hours"
        sortable
        numeric
        v-slot="props"
      >
        {{
          props.row.total_real_hours
            ? props.row.total_real_hours.toFixed(2)
            : "0.00"
        }}
      </b-table-column>
      
      <b-table-column
        label="Hores previstes"
        field="total_estimated_hours"
        sortable
        numeric
        v-slot="props"
      >
        {{
          props.row.total_estimated_hours
            ? props.row.total_estimated_hours.toFixed(2)
            : "0.00"
        }}
      </b-table-column>
      
      <b-table-column
        label="Resultat executat"
        field="total_real_incomes_expenses"
        sortable
        numeric
        v-slot="props"
      >
        <span :class="getResultClass(props.row.total_real_incomes_expenses || 0)">
          {{ formatPrice(props.row.total_real_incomes_expenses || 0) }}€
        </span>
      </b-table-column>
      
      <b-table-column
        label="Resultat previst"
        field="estimated_incomes_expenses"
        sortable
        numeric
        v-slot="props"
      >
        <span :class="getResultClass(props.row.estimated_incomes_expenses || 0)">
          {{ formatPrice(props.row.estimated_incomes_expenses || 0) }}€
        </span>
      </b-table-column>
      
      <b-table-column
        label="Estat"
        v-slot="props"
        sortable
        field="project_state.name"
      >
        {{ props.row.project_state ? props.row.project_state.name : "" }}
      </b-table-column>

      <section slot="empty" class="section">
        <div class="content has-text-grey has-text-centered">
          <template v-if="isLoading">
            <p>
              <b-icon icon="dots-horizontal" size="is-large" />
            </p>
            <p>Carregant dades...</p>
          </template>
          <template v-else>
            <p>
              <b-icon icon="emoticon-sad" size="is-large" />
            </p>
            <p>No hi ha dades per mostrar</p>
          </template>
        </div>
      </section>
    </b-table>
  </div>
</template>

<script>
import moment from "moment";

export default {
  name: "MotherProjectsTable",
  props: {
    projects: {
      type: Array,
      default: null
    }
  },
  data() {
    return {
      isLoading: false,
      paginated: true,
      perPage: 25
    };
  },
  computed: {
    projectsData() {
      if (!this.projects) {
        return [];
      }
      // Filter to show only mother projects (is_mother = true)
      return this.projects.filter(p => p.is_mother === true);
    }
  },
  methods: {
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    getResultClass(value) {
      if (value > 0) {
        return 'has-text-success';
      } else if (value < 0) {
        return 'has-text-danger';
      }
      return '';
    }
  },
  filters: {
    formatDateTime(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("DD/MM/YYYY HH:mm");
    },
    formatDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("DD/MM/YYYY");
    }
  }
};
</script>

<style scoped>
.project-name {
  font-weight: bold;
}
</style>
