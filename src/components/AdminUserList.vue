<template>
  <div>
    <title-bar :title-stack="['Administració', 'Usuàries']" :subtitle="summaryText">
      <download-excel class="export" name="usuaries" :fields="excelFields" :fetch="fetchExcel">
        <b-button icon-left="download">Exporta</b-button>
      </download-excel>
      <b-button type="is-primary" icon-left="plus" @click="$router.push('/admin/users/new')">Nova usuària</b-button>
    </title-bar>
    <section class="section is-main-section">
      <!-- Redesign A: all accounts filtered here (a few dozen) -->
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <b-input v-model="search" class="filter-search" icon="magnify" placeholder="Cerca per nom o correu" aria-label="Cerca per nom o correu" />
        <div class="segmented" role="group" aria-label="Estat">
          <button v-for="f in stateFilters" :key="f.id" type="button" :class="{ 'is-on': state === f.id }" @click="state = f.id; page = 1">{{ f.label }} · {{ f.count }}</button>
        </div>
        <label class="filter-select">
          <span>Permís</span>
          <b-select v-model="permission" aria-label="Permís" @update:model-value="page = 1">
            <option value="">Tots</option>
            <option v-for="p in permissionCodes" :key="p" :value="p">{{ permissionLabel(p) }}</option>
          </b-select>
        </label>
      </form>

      <div class="card has-table">
        <b-table
          :data="shownUsers"
          :loading="isLoading"
          paginated
          :per-page="perPage"
          v-model:current-page="page"
          default-sort="name"
          hoverable
        >
          <b-table-column field="name" label="Persona" sortable v-slot="props">
            <div class="user-cell">
              <span class="user-avatar" aria-hidden="true">{{ initials(props.row) }}</span>
              <div>
                <router-link :to="`/admin/users/${props.row.id}`" class="doc-title">{{ props.row.name }}</router-link>
                <div class="doc-subline">{{ props.row.email }}<template v-if="props.row.fullname && props.row.fullname !== props.row.username"> · {{ props.row.username }}</template></div>
              </div>
            </div>
          </b-table-column>
          <b-table-column field="permissions" label="Permisos" v-slot="props">
            <span v-if="!props.row.codes.length" class="has-text-muted">Cap permís</span>
            <span v-for="c in props.row.codes" :key="c" class="tag" :class="{ 'is-success is-light': c === 'admin' }">{{ permissionLabel(c) }}</span>
          </b-table-column>
          <b-table-column field="state" label="Estat" v-slot="props">
            <span v-if="props.row.blocked" class="tag is-danger is-light">Bloquejat</span>
            <span v-else-if="!props.row.confirmed" class="tag is-warning is-light">Sense confirmar</span>
            <span v-else class="tag is-success is-light">Actiu</span>
            <span v-if="props.row.hidden" class="tag">Ocult</span>
          </b-table-column>
          <b-table-column custom-key="actions" label="" v-slot="props" cell-class="is-actions-cell">
            <router-link :to="`/admin/users/${props.row.id}`" class="row-action" title="Edita" aria-label="Edita">
              <b-icon icon="pencil-outline" custom-size="default" />
            </router-link>
          </b-table-column>
          <template #empty>
            <p class="has-text-centered has-text-muted py-5">Cap usuària amb aquests filtres.</p>
          </template>
        </b-table>
      </div>
      <p class="users-note">
        <b>Ocult</b>: no surt a les llistes de persones (informes, jornades, dedicació); per a qui ja no treballa a l'entitat.
        <b>Sense confirmar</b>: encara no ha confirmat el correu.
      </p>
    </section>
  </div>
</template>

<script>
import CardComponent from "@/components/CardComponent.vue";
import TitleBar from "@/components/TitleBar.vue";
import service from "@/service/index";
import { permissionLabel, permissionCodes as codesOf } from "@/domain/permissions";

export default {
  name: "AdminUserList",
  components: {
    CardComponent,
    TitleBar
  },
  data() {
    return {
      users: [],
      perPage: 15,
      page: 1,
      search: "",
      state: "all",
      permission: "",
      isLoading: false,
      // the columns of the table (issues/029)
      excelFields: {
        "Nom d'usuari": "username",
        "Nom complet": "fullname",
        "Email": "email",
        "Confirmat": "confirmed",
        "Bloquejat": "blocked",
        "Ocult": "hidden",
        "Permisos": "permissions"
      }
    };
  },
  computed: {
    rows() {
      return this.users.map(u => ({
        ...u,
        name: u.fullname || u.username,
        codes: codesOf(u.permissions)
      }));
    },
    permissionCodes() {
      return [...new Set(this.rows.flatMap(r => r.codes))].sort();
    },
    stateFilters() {
      const count = fn => this.rows.filter(fn).length;
      return [
        { id: "all", label: "Tots", count: this.rows.length },
        { id: "visible", label: "Visibles", count: count(r => !r.hidden) },
        { id: "hidden", label: "Ocults", count: count(r => r.hidden) },
        { id: "blocked", label: "Bloquejats", count: count(r => r.blocked) }
      ];
    },
    shownUsers() {
      const q = this.search.trim().toLowerCase();
      return this.rows.filter(r => {
        if (this.state === "visible" && r.hidden) return false;
        if (this.state === "hidden" && !r.hidden) return false;
        if (this.state === "blocked" && !r.blocked) return false;
        if (this.permission && !r.codes.includes(this.permission)) return false;
        return !q || [r.username, r.fullname, r.email].some(v => v && v.toLowerCase().includes(q));
      });
    },
    summaryText() {
      if (!this.rows.length) return "";
      const visible = this.rows.filter(r => !r.hidden).length;
      const blocked = this.rows.filter(r => r.blocked).length;
      const admins = this.rows.filter(r => r.codes.includes("admin")).length;
      return `${this.rows.length} comptes · ${visible} visibles a les llistes de persones · ${blocked} ${blocked === 1 ? "bloquejat" : "bloquejats"} · ${admins} amb permís d'administració`;
    }
  },
  watch: {
    search() {
      this.page = 1;
    }
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get(
          "/users?_limit=-1&_sort=username:ASC"
        );
        this.users = response.data;
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error carregant usuàries: ${error.message}`,
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    // Every user, not only the page on screen
    async fetchExcel() {
      const yesNo = value => (value ? "Sí" : "No");
      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get(
          "/users?_limit=-1&_sort=username:ASC"
        );
        return response.data.map(user => ({
          ...user,
          confirmed: yesNo(user.confirmed),
          blocked: yesNo(user.blocked),
          hidden: yesNo(user.hidden),
          permissions: codesOf(user.permissions).map(permissionLabel).join(", ")
        }));
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error exportant usuàries: ${error.message}`,
          type: "is-danger"
        });
        return [];
      } finally {
        this.isLoading = false;
      }
    },
    permissionLabel,
    initials(row) {
      const words = String(row.name || "").split(/[\s._@-]+/).filter(Boolean);
      return words.slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
    }
  }
};
</script>
<style scoped>
.user-cell {
  display: flex;
  align-items: center;
  gap: .75rem;
}
.user-avatar {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--a-chip);
  font-size: .6875rem;
  font-weight: 800;
}
.tag {
  margin: .125rem .25rem .125rem 0;
}
.row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  color: var(--a-fg-2);
}
.row-action:hover {
  background: var(--a-chip);
  color: var(--a-fg);
}
.users-note {
  margin-top: .75rem;
  font-size: .8125rem;
  color: var(--a-fg-2);
}
</style>
