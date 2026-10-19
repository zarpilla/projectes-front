<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent="submit2">
        <!-- emptied, it is «Totes» (0): everybody's hours; null (nobody picked
             on load) loads none (issues/070) -->
        <b-autocomplete
          v-if="canPickPerson"
          v-model="userNameSearch"
          class="filter-auto"
          placeholder="Totes les persones"
          aria-label="Persona"
          icon="account"
          :keep-first="false"
          :open-on-focus="true"
          :data="filteredUsers"
          field="username"
          :clearable="true"
          @select="(option) => (filters.user = option ? option.id : 0)"
        />
        <b-autocomplete
          v-model="projectNameSearch"
          class="filter-auto"
          placeholder="Projecte"
          aria-label="Projecte"
          icon="folder-outline"
          :keep-first="false"
          :open-on-focus="true"
          :data="filteredProjects"
          field="name"
          :clearable="true"
          @select="(option) => (filters.project = option ? option.id : null)"
        />
        <div class="filter-dates">
          <b-datepicker
            v-model="filters.date1"
            aria-label="Inici"
            :show-week-number="false"
            :locale="'ca-ES'"
            :first-day-of-week="1"
            icon="calendar-today"
            :disabled="filters.lastUpdated"
            :editable="true"
            trap-focus
          />
          <span aria-hidden="true">–</span>
          <b-datepicker
            v-model="filters.date2"
            aria-label="Final"
            :show-week-number="false"
            :locale="'ca-ES'"
            :first-day-of-week="1"
            icon="calendar-today"
            :disabled="filters.lastUpdated"
            :editable="true"
            trap-focus
          />
        </div>
        <b-checkbox v-model="filters.lastUpdated">Últimes modificades</b-checkbox>
      </form>
      <dedication-input
        @calendar-changed="calendarChanged"
        :users="users"
        :user="filters.user"
        :date1="filters.date1"
        :date2="filters.date2"
        :project="filters.project"
        :last="filters.lastUpdated"
        :projects="projects"
      />
    </section>
  </div>
</template>

<script>
import mapValues from "lodash/mapValues";
import TitleBar from "@/components/TitleBar.vue";
// import HeroBar from '@/components/HeroBar.vue'
import DedicationInput from "@/components/DedicationInput.vue";
import service from "@/service/index";
import { findCurrentUser, currentUserId } from "@/domain/currentUser";
import { canPickPerson, storedPermissions } from "@/domain/routeAccess";
import moment from "moment";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

export default {
  name: "Dedicacio",
  components: {
    // HeroBar,
    TitleBar,
    DedicationInput,
  },
  data() {
    return {
      isModalActive: false,
      isLoading: false,
      canPickPerson: canPickPerson(storedPermissions()),
      filters: {
        date1: null,
        date2: null,
        user: null,
        project: null,
        lastUpdated: false,
      },
      projects: [],
      projectsList: [],
      dedicationTypes: {},
      activityTypes: {},
      users: [],
      usersList: [],
      modalObjectName: "",
      userNameSearch: "",
      projectNameSearch: "",
    };
  },
  computed: {
    ...mapState(useMainStore, ["userName"]),
    titleStack() {
      return ["Projectes", "Hores dedicades"];
    },
    filteredUsers() {
      return this.users.filter((option) => {
        return (
          option.username
            .toString()
            .toLowerCase()
            .indexOf(this.userNameSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredProjects() {
      return this.projects.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectNameSearch.toLowerCase()) >= 0
        );
      });
    },
  },
  mounted() {
    this.isLoading = true;
    this.filters.date1 = moment().clone().startOf("month").toDate();
    this.filters.date2 = moment().clone().endOf("month").toDate();
    service({ requiresAuth: true })
      .get("projects/basic?_limit=-1")
      .then((r) => {
        this.projects = [...r.data];
        this.projectsList = JSON.parse(JSON.stringify([...r.data])); //.filter(p => p.project_state !== 2)))
        this.projectsList.unshift({ id: 0, name: "Tots" });
      });
    service({ requiresAuth: true, cached: true })
      .get("dedication-types")
      .then((r) => {
        for (var i in r.data) {
          this.dedicationTypes[r.data[i].id] = r.data[i].name;
        }
      });
    service({ requiresAuth: true, cached: true })
      .get("activity-types/basic?_limit=-1")
      .then((r) => {
        for (var i in r.data) {
          this.activityTypes[r.data[i].id] = r.data[i].name;
        }
      });
    service({ requiresAuth: true, cached: true })
      .get("users")
      .then((r) => {
        this.users = r.data.filter((u) => !u.hidden);
        this.usersList = JSON.parse(
          JSON.stringify(r.data.filter((u) => u.username !== "app"))
        );
        this.usersList.unshift({ id: 0, username: "Totes" });
        const user = findCurrentUser(r.data);
        if (user && user.id) {
          this.userNameSearch = user.username;
          this.filters.user = user.id;
        } else if (!this.canPickPerson) {
          this.filters.user = currentUserId();
        }
        this.isLoading = false;
      });
  },
  methods: {
    submit() {},
    submit2() {},
    reset() {
      this.form = mapValues(this.form, (item) => {
        if (item && typeof item === "object") {
          return [];
        }
        return null;
      });

      this.$buefy.snackbar.open({
        message: "Reset successfully",
        queue: false,
      });
    },
    calendarChanged(data) {
      const first = moment(
        `${data.year}/${data.month}/01`,
        "YYYY/M/DD"
      ).toDate();
      const last = moment(first).clone().endOf("month").toDate();
      if (this.filters.date1 === null || this.filters.date2 === null) {
        return;
      }
      if (
        moment(first).format("YYYYMMDD") !==
          moment(this.filters.date1).format("YYYYMMDD") ||
        moment(last).format("YYYYMMDD") !==
          moment(this.filters.date2).format("YYYYMMDD")
      ) {
        this.filters.date1 = first;
        this.filters.date2 = last;
      }
    },
  },
};
</script>
<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
  margin-bottom: 1rem;
}
.filter-auto {
  flex: 1 1 13rem;
  max-width: 18rem;
}
.filter-dates {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.filter-dates :deep(.datepicker) {
  width: 9.5rem;
}
</style>
