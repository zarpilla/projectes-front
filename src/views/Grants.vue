<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <b-loading
        :is-full-page="true"
        v-model="loading"
        :can-cancel="false"
      ></b-loading>

      <card-component title="Filtres">
        
          <b-field horizontal label="Estat projecte">
            <b-select
              v-model="filters.project_state"
              placeholder="Estat"
              required
              @input="getData"
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
      </card-component>

      <card-component
        title="SUBVENCIONS"
        class="has-table has-mobile-sort-spaced"
      >
        <b-table :striped="true" :data="projects">
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
            label="Òrgan convocant"
            field="contact.name"
            sortable
            v-slot="props"
          >
            {{
              props.row.clients && props.row.clients.length
                ? props.row.clients[0].name
                : ""
            }}
          </b-table-column>
          <b-table-column
            label="Inici"
            field="date_start"
            sortable
            v-slot="props"
          >
            {{ props.row.date_start }}
          </b-table-column>
          <b-table-column
            label="Final"
            field="date_end"
            sortable
            v-slot="props"
          >
            {{ props.row.date_end }}
          </b-table-column>
          <b-table-column
            label="Expedient"
            field="grantable_reference"
            sortable
            v-slot="props"
          >
            {{ props.row.grantable_reference }}
          </b-table-column>
          <b-table-column
            label="Import total"
            field="grantable_amount_total"
            sortable
            numeric
            v-slot="props"
          >
            {{ formatPrice(props.row.grantable_amount_total) }}
          </b-table-column>

          <b-table-column
            label="Import cofinançament"
            field="grantable_cofinancing"
            sortable
            v-slot="props"
            numeric
          >
            {{ formatPrice(props.row.grantable_cofinancing) }}
          </b-table-column>

          <b-table-column
            label="Sol·licitud"
            field="grantable_date"
            sortable
            date
            v-slot="props"
          >
            {{ props.row.grantable_date }}
          </b-table-column>
          <b-table-column
            label="Justificació"
            field="grantable_date"
            date
            sortable
            v-slot="props"
          >
            {{ props.row.justification_date }}
          </b-table-column>

          <b-table-column
            label="Estat"
            field="project_state"
            sortable
            v-slot="props"
          >
            {{ props.row.project_state ? props.row.project_state.name : "" }}
          </b-table-column>
        </b-table>
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
import sortBy from "lodash/sortBy";
import { mapState } from "vuex";
import moment from "moment";
import formatPrice from "@/helpers/format-price";

export default {
  name: "Home",
  components: {
    CardComponent,
    CardWidget,
    Tiles,
    TitleBar
  },
  data() {
    return {
      loading: false,
      projects: [],
      filters: {
        project_state: 1
      },
      project_states: []
    };
  },
  computed: {
    ...mapState(["userName"]),
    titleStack() {
      return ["Subvencions"];
    }
  },
  async mounted() {
    this.loading = true;

    this.project_states = await service({ requiresAuth: true })
      .get("project-states")
      .then(r => r.data);
    this.project_states.unshift({ id: 0, name: "Tots" });

    this.filters.project_state = 1;

    await this.getData();
    this.loading = false;
  },
  methods: {
    async getData() {
      const query = `projects/basic?_limit=-1&grantable=true`;
      const queryState =
        this.filters.project_state > 0
          ? `&project_state=${this.filters.project_state}`
          : "";
      const projects = (
        await service({ requiresAuth: true }).get(query + queryState)
      ).data;

      this.projects = sortBy(projects, "name");
    },
    formatPrice(amount) {
      return formatPrice(amount);
    }
  }
};
</script>
