<template>
  <div>
    <title-bar :title-stack="titleStack" subtitle="Torna a calcular els totals de tots els projectes, un per un.">
      <b-button type="is-primary" icon-left="refresh" :disabled="all == count" @click="updateAll">Actualitza tot</b-button>
    </title-bar>
    <section class="section is-main-section">
      <section class="a-box list-box">
        <header class="box-head">
          <h2>Projectes</h2>
          <span class="recalc-count">{{ count }} de {{ all }} actualitzats</span>
        </header>
        <progress class="progress is-small recalc-progress" :value="count" :max="all || 1">{{ count }} / {{ all }}</progress>
        <b-table
          :loading="isLoading"
          :striped="false"
          :hoverable="false"
          :data="projects"
        >
          <b-table-column label="Nom" field="name" sortable v-slot="props">
            <router-link :to="{ name: 'project.edit', params: { id: props.row.id } }">
              {{ props.row.name }}
            </router-link>
          </b-table-column>
          <b-table-column label="Estat" field="updated" sortable v-slot="props">
            <span v-if="props.row.updated" class="tag is-success is-light">Actualitzat</span>
            <span v-else class="tag">Pendent</span>
          </b-table-column>
        </b-table>
      </section>
    </section>
  </div>
</template>

<script>
// @ is an alias to /src
import * as chartConfig from "@/components/Charts/chart.config";
import TitleBar from "@/components/TitleBar.vue";
import Tiles from "@/components/Tiles.vue";
import CardWidget from "@/components/CardWidget.vue";
import ProjectsTable from "@/components/ProjectsTable.vue";
import service from "@/service/index";
import sumBy from "lodash/sumBy";
import sortBy from "lodash/sortBy";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import moment from "moment";

export default {
  name: "Home",
  components: {
    ProjectsTable,
    // BarChart,
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
    ...mapState(useMainStore, ["userName"]),
    titleStack() {
      return ["Altres", "Recàlcul"];
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

<style scoped>
.recalc-count {
  font-size: .875rem;
  font-weight: 700;
  color: var(--a-muted);
}
.recalc-progress {
  margin: 0 !important;
  border-radius: 0;
  height: 4px;
}
</style>
