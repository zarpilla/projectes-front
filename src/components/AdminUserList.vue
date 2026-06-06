<template>
  <div>
    <section class="section is-main-section">
      <b-button
        class="mb-4"
        type="is-primary"
        icon-left="plus"
        @click="$router.push('/admin/users/new')"
      >
        Crear usuari
      </b-button>
      <card-component>
        <b-table
          :data="users"
          :loading="isLoading"
          paginated
          backend-pagination
          :total="total"
          :per-page="perPage"
          @page-change="onPageChange"
          striped
          hoverable
        >
          <b-table-column
            field="username"
            label="Nom d'usuari"
            v-slot="props"
            sortable
          >
            {{ props.row.username }}
          </b-table-column>

          <b-table-column
            field="fullname"
            label="Nom complet"
            v-slot="props"
            sortable
          >
            {{ props.row.fullname }}
          </b-table-column>

          <b-table-column field="email" label="Email" v-slot="props" sortable>
            {{ props.row.email }}
          </b-table-column>

          <b-table-column
            field="confirmed"
            label="Confirmat"
            v-slot="props"
            centered
          >
            <b-icon
              :icon="props.row.confirmed ? 'check-circle' : 'close-circle'"
              :type="props.row.confirmed ? 'is-success' : 'is-danger'"
            />
          </b-table-column>

          <b-table-column
            field="blocked"
            label="Bloquejat"
            v-slot="props"
            centered
          >
            <b-icon
              :icon="props.row.blocked ? 'check-circle' : 'close-circle'"
              :type="props.row.blocked ? 'is-danger' : 'is-success'"
            />
          </b-table-column>

          <b-table-column field="hidden" label="Ocult" v-slot="props" centered>
            <b-icon
              :icon="props.row.hidden ? 'check-circle' : 'close-circle'"
              :type="props.row.hidden ? 'is-warning' : 'is-success'"
            />
          </b-table-column>

          <b-table-column field="permissions" label="Permisos" v-slot="props">
            <span
              v-if="props.row.permissions && props.row.permissions.length > 0"
            >
              {{ props.row.permissions.map(p => p.permission).join(", ") }}
            </span>
            <span v-else class="has-text-grey-light">Cap</span>
          </b-table-column>

          <b-table-column
            custom-key="actions"
            label="Accions"
            v-slot="props"
            width="80"
            centered
          >
            <b-button
              size="is-small"
              type="is-primary"
              icon-left="pencil"
              @click="$router.push(`/admin/users/${props.row.id}`)"
            />
          </b-table-column>
        </b-table>
      </card-component>
    </section>
  </div>
</template>

<script>
import CardComponent from "@/components/CardComponent";
import service from "@/service/index";

export default {
  name: "AdminUserList",
  components: {
    CardComponent
  },
  data() {
    return {
      users: [],
      total: 0,
      perPage: 25,
      currentPage: 1,
      isLoading: false
    };
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        this.isLoading = true;
        const start = (this.currentPage - 1) * this.perPage;
        const response = await service({ requiresAuth: true }).get(
          `/users?_start=${start}&_limit=${this.perPage}&_sort=username:ASC`
        );

        this.users = response.data;

        // Get total count
        const countResponse = await service({ requiresAuth: true }).get(
          "/users/count"
        );
        this.total = countResponse.data;
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error carregant usuaris: ${error.message}`,
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    onPageChange(page) {
      this.currentPage = page;
      this.loadData();
    }
  }
};
</script>
