<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <b-loading
        :is-full-page="true"
        v-model="loading"
        :can-cancel="false"
      ></b-loading>

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
            label="Termini"
            field="grantable_date"
            sortable
            v-slot="props"
          >
            {{ props.row.grantable_date }}
          </b-table-column>
          <b-table-column
            label="Import"
            field="grantable_amount_total"
            sortable
            v-slot="props"
          >
            {{ props.row.grantable_amount_total }}
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

export default {
  name: "Home",
  components: {
    CardComponent,
    CardWidget,
    Tiles,
    TitleBar,
  },
  data() {
    return {
      loading: false,
      projects: [],
    };
  },
  computed: {
    ...mapState(["userName"]),
    titleStack() {
      return ["Subvencions"];
    },
  },
  async mounted() {
    this.loading = true;
    const query = `projects/basic?_limit=-1&grantable=true`;
    const projects = (
      await service({ requiresAuth: true }).get(query)
    ).data.filter((p) => p.project_state && p.project_state.id !== 2);
    this.projects = sortBy(
      projects.filter(
        (p) => p.project_state !== null && p.project_state.id === 1
      ),
      "name"
    );

    this.loading = false;
  },
  methods: {},
};
</script>
