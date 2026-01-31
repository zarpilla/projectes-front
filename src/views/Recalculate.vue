<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <!-- <hero-bar :has-right-visible="false">
      General
    </hero-bar> -->
    <section class="section is-main-section">
      <b-button @click="updateAll" class="is-primary mb-3" :disabled="all == count"
        >Actualitzar tot
      </b-button>

      <h3 class="subtitle">{{ count }} / {{ all }}</h3>

      <card-component
        title="PROJECTES"
        class="has-table has-mobile-sort-spaced"
      >
        <b-table
          :loading="isLoading"
          :striped="false"
          :hoverable="false"
          :data="projects"
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
            label="Actualitzat"
            field="updated"
            sortable
            v-slot="props"
          >
            {{ props.row.updated ? "SÍ" : "NO" }}
          </b-table-column>
        </b-table>

        <!-- <pre>{{projects}}</pre> -->
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
      projects: [],
      isLoading: false,
    };
  },
  computed: {
    ...mapState(["userName"]),
    titleStack() {
      return ["Projectes", "Recàlcul"];
    },
    count() {
      return this.projects.filter((p) => p.updated).length;
    },
    all() {
      return this.projects.length;
    },
  },
  async mounted() {
    this.isLoading = true;
    const projects = (
      await service({ requiresAuth: true }).get("projects/basic?_limit=-1")
    ).data;
    this.projects = projects.map((p) => {
      return { ...p, updated: false };
    });
    this.isLoading = false;
  },
  methods: {
    async updateAll() {
      for (let i = 0; i < this.projects.length; i++) {
        const project = this.projects[i];
        await service({ requiresAuth: true }).get(
          `projects/${project.id}/calculate`
        );
        project.updated = true;
      }
      this.$buefy.toast.open({
        message: `Recalculat!`,
        type: "is-success",
      });
    },
  },
};
</script>
