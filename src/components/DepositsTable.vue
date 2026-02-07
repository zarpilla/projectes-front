<template>
  <section class="xsection">
    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <div class="is-flex is-block-mobile is-flex-wrap-wrap mb-3">
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === 'pending',
          'is-warning': statusFilter !== 'pending'
        }"
        @click="setStatusFilter('pending')"
      >
        PENDENTS ({{ pendingCount }})
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === 'deposited',
          'is-warning': statusFilter !== 'deposited'
        }"
        @click="setStatusFilter('deposited')"
      >
        DIPOSITADES ({{ todayCount }})
      </b-button>
    </div>

    <div class="mb-3">
      <div class="columns is-multiline ml-0 mt-4">
        <div class="column is-half">
          <div class="columns is-mobile bg-white-panel">
            <div class="column">
              <h2>Total comandes</h2>
              <div class="has-text-weight-bold is-size-4">
                {{ total }}
              </div>
            </div>
            <div class="column">
              <h2>Pendents</h2>
              <div class="has-text-weight-bold is-size-4">
                {{ pendingCount }}
              </div>
            </div>
            <div class="column">
              <h2>Avui</h2>
              <div class="has-text-weight-bold is-size-4">
                {{ todayCount }}
              </div>
            </div>
          </div>
        </div>
        <div class="column is-flex">
          <div class="ml-auto mt-2">
            <b-select
              v-model="perPage"
              @input="loadData"
              v-if="total > 50"
            >
              <option value="50">50 per pàgina</option>
              <option value="100">100 per pàgina</option>
              <option value="200">200 per pàgina</option>
            </b-select>
          </div>
        </div>
      </div>
    </div>

    <b-table
      class="small-table"
      ref="table"
      :loading="isLoading"
      paginated
      backend-pagination
      :total="total"
      :per-page="perPage"
      @page-change="onPageChange"
      pagination-position="both"
      backend-sorting
      :default-sort-direction="defaultSortOrder"
      :default-sort="[sortField, sortOrder]"
      @sort="onSort"
      :striped="true"
      :data="orders"
      :debounce-search="500"
      :row-class="rowClassFn"
    >
      <b-table-column label="Comanda" field="id" sortable v-slot="props" width="100">
        <router-link
          :to="{ name: 'orders.edit', params: { id: props.row.id } }"
        >
          #{{ props.row.id.toString().padStart(4, "0") }}
        </router-link>
      </b-table-column>

      <b-table-column
        label="Sòcia"
        field="owner.fullname"
        sortable
        v-slot="props"
        width="150"
      >
        {{ props.row.owner ? props.row.owner.fullname || props.row.owner.username : '-' }}
      </b-table-column>

      <b-table-column
        label="Ruta"
        field="route.name"
        sortable
        v-slot="props"
        width="150"
      >
        {{ props.row.route ? props.row.route.name : '-' }}
      </b-table-column>

      <b-table-column
        label="Data entrega"
        field="estimated_delivery_date"
        sortable
        v-slot="props"
        width="110"
      >
        {{ formatDate(props.row.estimated_delivery_date) }}
      </b-table-column>

      <b-table-column
        label="Caixes"
        field="units"
        sortable
        v-slot="props"
        width="80"
      >
        {{ props.row.units }}
      </b-table-column>

      <b-table-column
        label="Kg"
        field="kilograms"
        sortable
        v-slot="props"
        width="80"
      >
        {{ props.row.kilograms }}
      </b-table-column>

      <b-table-column
        label="Estat"
        field="status"
        sortable
        v-slot="props"
        width="130"
      >
        <b-tag
          :type="props.row.status === 'deposited' ? 'is-success' : 'is-warning'"
        >
          {{ props.row.status === 'deposited' ? 'DIPOSITAT' : 'PENDENT' }}
        </b-tag>
      </b-table-column>

      <b-table-column
        label="Accions"
        v-slot="props"
        width="180"
      >
        <div class="action-buttons-grid">
          <!-- Mark as deposited button if not deposited -->
          <b-button
            v-if="props.row.status !== 'deposited'"
            type="is-success"
            size="is-small"
            icon-left="check"
            @click="markAsDeposited(props.row)"
          >
            Dipositar
          </b-button>
          
          <!-- Unmark as deposited button if deposited -->
          <b-button
            v-if="props.row.status === 'deposited'"
            type="is-warning"
            size="is-small"
            icon-left="undo"
            @click="unmarkAsDeposited(props.row)"
          >
            Desfer
          </b-button>
        </div>
      </b-table-column>

      <template #empty>
        <div class="has-text-centered">No hi ha dipòsits</div>
      </template>
    </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import { mapState } from "vuex";
import moment from "moment";

export default {
  name: "DepositsTable",
  data() {
    return {
      isLoading: false,
      orders: [],
      total: 0,
      page: 1,
      perPage: 50,
      sortField: "id",
      sortOrder: "desc",
      defaultSortOrder: "desc",
      statusFilter: 'pending',
      permissions: [],
      pendingCount: 0,
      todayCount: 0,
      currentUserId: null,
      isAdmin: false
    };
  },
  computed: {
    ...mapState(["me"])
  },
  async mounted() {
    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    this.permissions = me.data.permissions.map(p => p.permission);
    this.currentUserId = me.data.id;
    this.isAdmin = this.permissions.includes('orders_admin');
    
    this.loadData();
  },
  methods: {
    async loadData() {
      this.isLoading = true;
      try {
        const params = {
          _limit: this.perPage,
          _start: (this.page - 1) * this.perPage,
          _sort: `${this.sortField}:${this.sortOrder.toUpperCase()}`
        };

        // Filter based on permission
        if (!this.isAdmin) {
          // Regular users only see their own orders
          params['owner.id'] = this.currentUserId;
        }

        // Apply status filter
        if (this.statusFilter === 'pending') {
          params['status'] = 'pending';
        } else if (this.statusFilter === 'today') {
          // Get today's date range
          const today = moment().startOf('day').toISOString();
          const tomorrow = moment().add(1, 'day').startOf('day').toISOString();
          params['status'] = 'deposited';
          params['_where[deposit_date_gte]'] = today;
          params['_where[deposit_date_lt]'] = tomorrow;
        }

        params['_where[is_collection_order_null]'] = true;

        const response = await service({ requiresAuth: true }).get("orders", { params });
        this.orders = response.data;

        // Get total count with same filters
        const countParams = { ...params };
        delete countParams._limit;
        delete countParams._start;
        delete countParams._sort;
        
        const countResponse = await service({ requiresAuth: true }).get(
          "orders/count",
          { params: countParams }
        );
        this.total = countResponse.data;

        // Get counts for different statuses
        await this.loadStatusCounts();
      } catch (error) {
        console.error("Error loading deposits:", error);
        this.$buefy.toast.open({
          message: "Error carregant dipòsits",
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    async loadStatusCounts() {
      try {
        const baseParams = {};
        
        // Filter based on permission
        if (!this.isAdmin) {
          baseParams['owner.id'] = this.currentUserId;
        }

        // Count pending
        const pendingResponse = await service({ requiresAuth: true }).get("orders/count", {
          params: { ...baseParams, status: 'pending' }
        });
        this.pendingCount = pendingResponse.data;

        // Count deposited today
        const today = moment().startOf('day').toISOString();
        const tomorrow = moment().add(1, 'day').startOf('day').toISOString();
        const todayResponse = await service({ requiresAuth: true }).get("orders/count", {
          params: {
            ...baseParams,
            status: 'deposited',
            '_where[deposit_date_gte]': today,
            '_where[deposit_date_lt]': tomorrow
          }
        });
        this.todayCount = todayResponse.data;
      } catch (error) {
        console.error("Error loading status counts:", error);
      }
    },
    onPageChange(page) {
      this.page = page;
      this.loadData();
    },
    onSort(field, order) {
      this.sortField = field;
      this.sortOrder = order;
      this.loadData();
    },
    setStatusFilter(status) {
      this.statusFilter = status;
      this.page = 1;
      this.loadData();
    },
    formatDate(date) {
      if (!date) return "-";
      return moment(date).format("DD/MM/YYYY");
    },
    formatDateTime(date) {
      if (!date) return "-";
      return moment(date).format("DD/MM/YYYY HH:mm");
    },
    getUserName(user) {
      if (!user) return '-';
      if (typeof user === 'object') {
        return user.fullname || user.username || '-';
      }
      return user;
    },
    async markAsDeposited(order) {
      this.$buefy.dialog.confirm({
        message: 'Vols marcar aquesta comanda com a dipositada?',
        onConfirm: async () => {
          this.isLoading = true;
          try {
            await service({ requiresAuth: true }).put(`orders/${order.id}`, {
              status: 'deposited',
              deposit_date: new Date().toISOString(),
              deposit_user: this.currentUserId
            });
            
            this.$buefy.toast.open({
              message: 'Comanda marcada com a dipositada',
              type: 'is-success'
            });
            
            await this.loadData();
          } catch (error) {
            console.error('Error marking as deposited:', error);
            this.$buefy.toast.open({
              message: 'Error al marcar com a dipositat',
              type: 'is-danger'
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    async unmarkAsDeposited(order) {
      this.$buefy.dialog.confirm({
        message: "Estàs segur que vols desfer el dipòsit d'aquesta comanda?",
        onConfirm: async () => {
          this.isLoading = true;
          try {
            await service({ requiresAuth: true }).put(`orders/${order.id}`, {
              status: 'pending',
              deposit_date: null,
              deposit_user: null
            });
            
            this.$buefy.toast.open({
              message: 'Dipòsit desfet correctament',
              type: 'is-success'
            });
            
            await this.loadData();
          } catch (error) {
            console.error('Error unmarking deposit:', error);
            this.$buefy.toast.open({
              message: 'Error al desfer el dipòsit',
              type: 'is-danger'
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    rowClassFn(row) {
      if (row.status === 'deposited') {
        return "has-background-light";
      }
      return "";
    }
  }
};
</script>

<style lang="scss" scoped>
.bg-white-panel {
  background-color: white;
  border-radius: 4px;
  padding: 1rem;
}

.view-button {
  margin-right: 0.5rem;
}

h2 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #7a7a7a;
  margin-bottom: 0.25rem;
}

.action-buttons-grid {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}
</style>

<style lang="scss">
.small-table {
  font-size: 0.875rem;

  .table {
    font-size: 0.875rem;
  }

  td {
    padding: 0.5rem 0.75rem;
  }

  th {
    padding: 0.5rem 0.75rem;
  }
}
</style>
