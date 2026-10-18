<template>
  <!-- The messages sent with the members' «Contacta» form (issues/159), read only.
       Only admins read them (isAdmin on the API). -->
  <div>
    <title-bar :title-stack="['Administració', 'Missatges']" :subtitle="headline" />
    <section class="section is-main-section">
      <div v-if="items.length" class="filter-bar">
        <b-input v-model="search" class="filter-search" icon="magnify" placeholder="Cerca" aria-label="Cerca" />
      </div>
      <div class="card has-table">
        <b-table
          :data="shown"
          :loading="isLoading"
          :paginated="shown.length > 50"
          :per-page="50"
          default-sort="createdAt"
          default-sort-direction="desc"
        >
          <b-table-column field="createdAt" label="Data" sortable v-slot="props">
            <span class="is-nowrap">{{ formatDate(props.row.createdAt) }}</span>
          </b-table-column>
          <b-table-column field="name" label="Nom" sortable v-slot="props">
            {{ props.row.name || "—" }}
          </b-table-column>
          <b-table-column field="email" label="Correu electrònic" sortable v-slot="props">
            <a v-if="props.row.email" :href="`mailto:${props.row.email}`">{{ props.row.email }}</a>
            <span v-else>—</span>
          </b-table-column>
          <b-table-column field="user" label="Usuària" v-slot="props">
            {{ userName(props.row.user) }}
          </b-table-column>
          <b-table-column field="message" label="Missatge" v-slot="props">
            <span class="fs-message">{{ props.row.message || "—" }}</span>
          </b-table-column>
          <template #empty>
            <p v-if="!isLoading" class="has-text-centered has-text-muted fs-empty">No ha arribat cap missatge.</p>
          </template>
        </b-table>
      </div>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import service from "@/service/index";
import moment from "moment";

export default {
  name: "AdminFormSubmissions",
  components: { TitleBar },
  data() {
    return { isLoading: false, items: [], search: "" };
  },
  computed: {
    shown() {
      const q = this.search.trim().toLowerCase();
      if (!q) return this.items;
      return this.items.filter(i =>
        [i.name, i.email, i.message, this.userName(i.user)].some(v => String(v || "").toLowerCase().includes(q)));
    },
    headline() {
      if (this.isLoading) return "";
      const n = this.items.length;
      return `${n} ${n === 1 ? "missatge" : "missatges"} del formulari «Contacta»`;
    }
  },
  async mounted() {
    this.isLoading = true;
    try {
      this.items = (await service({ requiresAuth: true }).get("form-submissions?_limit=-1&_sort=id:DESC")).data || [];
    } catch (e) {
      this.$buefy.toast.open({ message: "No s'han pogut carregar els missatges", type: "is-danger" });
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    userName(user) {
      return (user && (user.fullname || user.username)) || "—";
    },
    formatDate(value) {
      return value ? moment(value).format("DD/MM/YYYY HH:mm") : "—";
    }
  }
};
</script>

<style scoped>
.fs-message {
  white-space: pre-line;
}
.fs-empty {
  padding: 2rem;
}
.is-nowrap {
  white-space: nowrap;
}
</style>
