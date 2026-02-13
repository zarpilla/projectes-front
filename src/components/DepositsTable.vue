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
      <b-button
        :disabled="statusFilter !== 'pending'"
        class="view-button mb-3 mr-3 ml-0"
        type="is-info"
        icon-left="qrcode-scan"
        @click="openScanner"
      >
        ESCANEJAR QR
      </b-button>
    </div>

    <div class="mb-3">
      <h3 class="subtitle is-6 mb-2">Filtre per punt de dipòsit</h3>
      <div class="is-flex is-block-mobile is-flex-wrap-wrap">
        <b-button
          class="view-button mb-2 mr-2 ml-0"
          :class="{
            'is-primary': pickupFilter === null,
            'is-warning': pickupFilter !== null
          }"
          @click="setPickupFilter(null)"
        >
          TOTS
        </b-button>
        <b-button
          v-for="pickup in nonPickupLocations"
          :key="pickup.id"
          class="view-button mb-2 mr-2 ml-0"
          :class="{
            'is-primary': pickupFilter === pickup.id,
            'is-warning': pickupFilter !== pickup.id
          }"
          @click="setPickupFilter(pickup.id)"
        >
          {{ pickup.name || pickup.trade_name }}
        </b-button>
        <b-button
          class="view-button mb-2 mr-2 ml-0"
          :class="{
            'is-primary': pickupFilter === 'finca',
            'is-warning': pickupFilter !== 'finca'
          }"
          @click="setPickupFilter('finca')"
        >
          Finca
        </b-button>
      </div>
    </div>

    <div class="mb-3">
      <div class="columns is-multiline ml-0 mt-4">
        <div class="column is-half">
          <div class="columns zis-mobile bg-white-panel">
            <div class="column">
              <h2>Pendents</h2>
              <div class="has-text-weight-bold is-size-4">
                {{ pendingCount }}
              </div>
            </div>
            <div class="column">
              <h2>Dipositades avui</h2>
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
        label="Punt d'entrega"
        field="contact.trade_name"
        sortable
        v-slot="props"
        width="110"
      >
        {{ props.row.contact ? props.row.contact.trade_name : '-' }}
      </b-table-column>

      <b-table-column
        label="Dipòsit a"
        field="collection_point.trade_name"
        sortable
        v-slot="props"
        width="150"
      >
        <span v-if="props.row.collection_point">
          {{ props.row.collection_point.trade_name || props.row.collection_point.name || '-' }}
        </span>
        <span v-else>
          {{ props.row.pickup ? (props.row.pickup.name || props.row.pickup.trade_name || '-') : '-' }}
        </span>
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

    <q-r-scanner-modal
      :is-active="isScannerActive"
      :action-label="statusFilter === 'pending' ? 'Dipositar comandes' : 'Desfer dipòsit'"
      @scanned="handleScannedOrder"
      @cancel="closeScanner"
    />
  </section>
</template>

<script>
import service from "@/service/index";
import { mapState } from "vuex";
import moment from "moment";
import QRScannerModal from "@/components/QRScannerModal";

export default {
  name: "DepositsTable",
  components: {
    QRScannerModal
  },
  data() {
    return {
      isLoading: false,
      orders: [],
      nonPickupLocations: [], // Pickups with pickup=false (Girona, Artés, etc.)
      fincaPickupIds: [], // IDs of pickups with pickup=true
      total: 0,
      page: 1,
      perPage: 50,
      sortField: "id",
      sortOrder: "desc",
      defaultSortOrder: "desc",
      statusFilter: 'pending',
      pickupFilter: null,
      permissions: [],
      pendingCount: 0,
      todayCount: 0,
      currentUserId: null,
      isAdmin: false,
      isScannerActive: false
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
    this.isAdmin = (this.permissions.includes('orders_admin') || this.permissions.includes('orders_delivery'));
    
    // Load all pickups
    const pickupsResponse = await service({ requiresAuth: true, cached: true }).get(
      "pickups?_limit=-1&_sort=name:ASC"
    );
    
    // Separate pickups: those with pickup=false show individually, those with pickup=true group as "Finca"
    this.nonPickupLocations = pickupsResponse.data.filter(p => p.pickup === false);
    this.fincaPickupIds = pickupsResponse.data.filter(p => p.pickup === true).map(p => p.id);
    
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
        } else if (this.statusFilter === 'deposited') {
          // Get today's date range
          const today = moment().startOf('day').toISOString();
          const tomorrow = moment().add(1, 'day').startOf('day').toISOString();
          params['status'] = 'deposited';
          params['_where[deposit_date_gte]'] = today;
          params['_where[deposit_date_lt]'] = tomorrow;
        }

        params['_where[is_collection_order_null]'] = true;

        const response = await service({ requiresAuth: true }).get("orders", { params });
        let orders = response.data;
        
        // Apply pickup filter if needed
        if (this.pickupFilter !== null) {
          if (this.pickupFilter === 'finca') {
            // Filter for Finca: orders with collection_point OR pickup with pickup=true
            orders = orders.filter(order => {
              // Has a collection point
              if (order.collection_point) {
                return true;
              }
              // Has a pickup with pickup=true
              if (order.pickup && this.fincaPickupIds.includes(order.pickup.id)) {
                return true;
              }
              return false;
            });
          } else {
            // Filter for specific non-pickup location
            orders = orders.filter(order => {
              return order.pickup && order.pickup.id === this.pickupFilter && !order.collection_point;
            });
          }
        }
        
        this.orders = orders;
        this.total = response.data.length;

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
        const baseParams = {
          '_where[is_collection_order_null]': true
        };
        
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
    setPickupFilter(pickupId) {
      this.pickupFilter = pickupId;
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
    },
    openScanner() {
      this.isScannerActive = true;
    },
    closeScanner() {
      this.isScannerActive = false;
      // Reload data to show updated orders
      this.loadData();
    },
    async handleScannedOrder(orderId, addToHistory) {
      try {
        // Fetch the order
        const response = await service({ requiresAuth: true }).get(`orders/${orderId}`);
        const order = response.data;

        // Validate order exists
        if (!order) {
          addToHistory(orderId, 'error', 'Comanda no trobada');
          this.$buefy.toast.open({
            message: `Comanda #${orderId} no trobada`,
            type: 'is-danger',
            duration: 2000
          });
          return;
        }

        // Check if order is a collection order (should be excluded)
        if (order.is_collection_order) {
          addToHistory(orderId, 'warning', 'No és una comanda de dipòsit');
          this.$buefy.toast.open({
            message: `Comanda #${orderId} no és una comanda de dipòsit`,
            type: 'is-warning',
            duration: 2000
          });
          return;
        }

        // Check if not admin and order doesn't belong to current user
        if (!this.isAdmin && order.owner && order.owner.id !== this.currentUserId) {
          addToHistory(orderId, 'error', 'No tens permís per modificar aquesta comanda');
          this.$buefy.toast.open({
            message: `No tens permís per modificar la comanda #${orderId}`,
            type: 'is-danger',
            duration: 2000
          });
          return;
        }

        // Handle based on current filter mode
        if (this.statusFilter === 'pending') {
          // Depositing mode
          if (order.status === 'deposited') {
            addToHistory(orderId, 'warning', 'Ja estava dipositada');
            this.$buefy.toast.open({
              message: `Comanda #${orderId} ja està dipositada`,
              type: 'is-warning',
              duration: 2000
            });
            return;
          }

          if (order.status !== 'pending') {
            addToHistory(orderId, 'warning', `Estat actual: ${order.status}`);
            this.$buefy.toast.open({
              message: `Comanda #${orderId} no està pendent`,
              type: 'is-warning',
              duration: 2000
            });
            return;
          }

          // Mark as deposited
          await service({ requiresAuth: true }).put(`orders/${orderId}`, {
            status: 'deposited',
            deposit_date: new Date().toISOString(),
            deposit_user: this.currentUserId
          });

          addToHistory(orderId, 'success', 'Dipositada correctament');
          this.$buefy.toast.open({
            message: `Comanda #${orderId} dipositada`,
            type: 'is-success',
            duration: 2000
          });
        } else {
          // Undo deposit mode
          if (order.status !== 'deposited') {
            addToHistory(orderId, 'warning', 'No està dipositada');
            this.$buefy.toast.open({
              message: `Comanda #${orderId} no està dipositada`,
              type: 'is-warning',
              duration: 2000
            });
            return;
          }

          // Unmark as deposited
          await service({ requiresAuth: true }).put(`orders/${orderId}`, {
            status: 'pending',
            deposit_date: null,
            deposit_user: null
          });

          addToHistory(orderId, 'success', 'Dipòsit desfet');
          this.$buefy.toast.open({
            message: `Dipòsit de comanda #${orderId} desfet`,
            type: 'is-success',
            duration: 2000
          });
        }

      } catch (error) {
        console.error('Error processing scanned order:', error);
        const errorMsg = error.response?.data?.message || 'Error al processar';
        addToHistory(orderId, 'error', errorMsg);
        this.$buefy.toast.open({
          message: `Error amb comanda #${orderId}`,
          type: 'is-danger',
          duration: 2000
        });
      }
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
