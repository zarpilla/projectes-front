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
          'is-primary': statusFilter.includes('pending'),
          'is-warning': !statusFilter.includes('pending')
        }"
        @click="setStatusFilter($event, 'pending')"
      >
        PENDENTS
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter.includes('in_progress'),
          'is-warning': !statusFilter.includes('in_progress')
        }"
        @click="setStatusFilter($event, 'in_progress')"
      >
        EN PROCÉS
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter.includes('completed'),
          'is-warning': !statusFilter.includes('completed')
        }"
        @click="setStatusFilter($event, 'completed')"
      >
        COMPLETADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        type="is-info"
        icon-left="qrcode-scan"
        @click="openScanner('start')"
        :disabled="!statusFilter.includes('pending')"
      >
        ESCANEJAR INICIAR
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        type="is-success"
        icon-left="qrcode-scan"
        @click="openScanner('end')"
        :disabled="!statusFilter.includes('in_progress')"
      >
        ESCANEJAR FINALITZAR
      </b-button>
    </div>

    <div class="mb-3">
      <h3 class="subtitle is-6 mb-2">Filtre per punt d'origen</h3>
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
          v-for="pickup in sourcePickups"
          :key="pickup.id"
          class="view-button mb-2 mr-2 ml-0"
          :class="{
            'is-primary': pickupFilter === pickup.id,
            'is-warning': pickupFilter !== pickup.id
          }"
          @click="setPickupFilter(pickup.id)"
        >
          {{ pickup.name }}
        </b-button>
      </div>
    </div>

    <div class="mb-3">
      <div class="columns is-multiline ml-0 mt-4">
        <div class="column is-half">
          <div class="columns zis-mobile bg-white-panel">
            <div class="column">
              <h2 class="pr-2">Total</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ total }} (PÀG {{ this.page }}/{{ Math.ceil(total / perPage) }})
                </b>
              </div>
            </div>
            <div class="column">
              <h2 class="pr-2">Pendents</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ pendingCount }}
                </b>
              </div>
            </div>
            <div class="column">
              <h2 class="pr-2">En procés</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ inProgressCount }}
                </b>
              </div>
            </div>
            <div class="column">
              <h2 class="pr-2">Completades</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ completedCount }}
                </b>
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
              <option value="50">50 per pàg.</option>
              <option value="100">100 per pàg.</option>
              <option value="250">250 per pàg.</option>
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
      detailed
      detail-key="id"
      :show-detail-icon="true"
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
        label="Origen"
        field="transfer_pickup_origin"
        sortable
        v-slot="props"
        width="150"
      >
        {{ props.row.transfer_pickup_origin.name }}
      </b-table-column>

      <b-table-column
        label="Destinació"
        field="transfer_pickup_destination"
        sortable
        v-slot="props"
        width="150"
      >
        {{ props.row.transfer_pickup_destination.name }}
      </b-table-column>

      <b-table-column
        label="Estat Trànsferència"
        v-slot="props"
        width="130"
      >
        <b-tag
          :type="getStatusTagType(props.row)"
        >
          {{ getStatusLabel(props.row) }}
        </b-tag>
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
        label="Accions"
        v-slot="props"
        width="180"
      >
        <div class="action-buttons-grid">
          <!-- Start button if not started -->
          <b-button
            v-if="!props.row.transfer_start_date"
            type="is-info"
            size="is-small"
            icon-left="play"
            @click="startTransfer(props.row)"
          >
            Iniciar
          </b-button>
          
          <!-- End button if started but not ended -->
          <b-button
            v-if="props.row.transfer_start_date && !props.row.transfer_end_date"
            type="is-success"
            size="is-small"
            icon-left="check"
            @click="endTransfer(props.row)"
          >
            Finalitzar
          </b-button>
          
          <!-- Undo button if in progress -->
          <b-button
            v-if="props.row.transfer_start_date && !props.row.transfer_end_date"
            type="is-danger"
            size="is-small"
            icon-left="undo"
            @click="removeTransferStart(props.row)"
          >
            Desfer
          </b-button>
          
          <!-- Undo button if completed -->
          <b-button
            v-if="props.row.transfer_end_date"
            type="is-danger"
            size="is-small"
            icon-left="undo"
            @click="removeTransferEnd(props.row)"
          >
            Desfer
          </b-button>
        </div>
      </b-table-column>

      <template #empty>
        <div class="has-text-centered">No hi ha transferències</div>
      </template>

      <template #detail="props">
        <div class="transfer-detail-container">
          <div class="columns">
            <div class="column is-half">
              <div class="detail-section">
                <h3 class="subtitle is-6">Informació de la comanda</h3>
                <div class="detail-row">
                  <strong>Punt d'entrega:</strong>
                  <span>{{ props.row.contact_trade_name || '-' }}</span>
                </div>
                <div class="detail-row">
                  <strong>Ciutat:</strong>
                  <span>{{ props.row.contact_city || '-' }}</span>
                </div>
                <div class="detail-row">
                  <strong>Adreça:</strong>
                  <span>{{ props.row.contact_address || '-' }}</span>
                </div>
                <div class="detail-row">
                  <strong>Telèfon:</strong>
                  <span>{{ props.row.contact_phone || '-' }}</span>
                </div>
                <div class="detail-row">
                  <strong>Comentaris:</strong>
                  <span>{{ props.row.comments || '-' }}</span>
                </div>
              </div>
            </div>
            
            <div class="column is-half">
              <div class="detail-section">
                <h3 class="subtitle is-6">Estat de la transferència</h3>
                
                <!-- Transfer Start -->
                <div class="transfer-action-box">
                  <div class="action-header">
                    <strong>Inici transferència</strong>
                  </div>
                  <div v-if="props.row.transfer_start_date && props.row.transfer_start_user" class="action-info">
                    <div class="detail-row">
                      <strong>Data:</strong>
                      <span>{{ formatDateTime(props.row.transfer_start_date) }}</span>
                    </div>
                    <div class="detail-row">
                      <strong>Usuari:</strong>
                      <span>{{ getUserName(props.row.transfer_start_user) }}</span>
                    </div>
                    <b-button
                      type="is-danger"
                      size="is-small"
                      @click="removeTransferStart(props.row)"
                    >
                      Eliminar
                    </b-button>
                  </div>
                  <div v-else class="action-buttons">
                    <b-button
                      type="is-info"
                      size="is-small"
                      icon-left="play"
                      @click="startTransfer(props.row)"
                    >
                      Iniciar transferència
                    </b-button>
                  </div>
                </div>

                <!-- Transfer End -->
                <div class="transfer-action-box mt-3">
                  <div class="action-header">
                    <strong>Fi transferència</strong>
                  </div>
                  <div v-if="props.row.transfer_end_date && props.row.transfer_end_user" class="action-info">
                    <div class="detail-row">
                      <strong>Data:</strong>
                      <span>{{ formatDateTime(props.row.transfer_end_date) }}</span>
                    </div>
                    <div class="detail-row">
                      <strong>Usuari:</strong>
                      <span>{{ getUserName(props.row.transfer_end_user) }}</span>
                    </div>
                    <b-button
                      type="is-danger"
                      size="is-small"
                      @click="removeTransferEnd(props.row)"
                    >
                      Eliminar
                    </b-button>
                  </div>
                  <div v-else-if="props.row.transfer_start_date" class="action-buttons">
                    <b-button
                      type="is-success"
                      size="is-small"
                      icon-left="check"
                      @click="endTransfer(props.row)"
                    >
                      Finalitzar transferència
                    </b-button>
                  </div>
                  <div v-else class="action-disabled">
                    <p class="has-text-grey">Cal iniciar la transferència primer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </b-table>

    <q-r-scanner-modal
      :is-active="isScannerActive"
      :action-label="scannerAction === 'start' ? 'Iniciar transferències' : 'Finalitzar transferències'"
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
  name: "TransfersTable",
  components: {
    QRScannerModal
  },
  data() {
    return {
      isLoading: false,
      orders: [],
      pickups: [],
      sourcePickups: [], // Store pickups with pickup=true
      allTransferOrders: [],
      total: 0,
      page: 1,
      perPage: 50,
      sortField: "id",
      sortOrder: "desc",
      defaultSortOrder: "desc",
      statusFilter: ['pending'],
      pickupFilter: null,
      permissions: [],
      pendingCount: 0,
      inProgressCount: 0,
      completedCount: 0,
      currentUserId: null,
      isScannerActive: false,
      scannerAction: null // 'start' or 'end'
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
    
    // Load pickups for name lookup
    this.pickups = (
      await service({ requiresAuth: true, cached: true }).get(
        "pickups?_limit=-1"
      )
    ).data;
    
    // Load source pickups (with pickup=true) for filter buttons
    const sourcePickupsResponse = await service({ requiresAuth: true, cached: true }).get(
      "pickups?_limit=-1&_where[pickup]=false"
    );
    this.sourcePickups = sourcePickupsResponse.data.sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );
    
    this.loadData();
  },
  methods: {
    async loadData() {
      this.isLoading = true;
      try {
        const params = {
          _limit: this.perPage,
          _start: (this.page - 1) * this.perPage,
          _sort: `${this.sortField}:${this.sortOrder.toUpperCase()}`,
          transfer: true // Only get orders with transfer = true
        };

        // Add status filter
        if (this.statusFilter.length > 0) {
          // We need to filter by the combination of transfer_start_date and transfer_end_date
          // This will be handled after fetching
        }

        const response = await service({ requiresAuth: true }).get("orders", { params });
        let orders = response.data;

        // Apply status filter if needed
        if (this.statusFilter.length > 0) {
          orders = orders.filter(order => {
            const status = this.getTransferStatus(order);
            return this.statusFilter.includes(status);
          });
        }

        // Apply pickup filter if needed
        if (this.pickupFilter !== null) {
          orders = orders.filter(order => {
            return order.transfer_pickup_origin && 
                   order.transfer_pickup_origin.id === this.pickupFilter;
          });
        }

        this.orders = orders;

        // Get total count
        const countParams = { transfer: true };
        const countResponse = await service({ requiresAuth: true }).get(
          "orders/count",
          { params: countParams }
        );
        this.total = countResponse.data;

        // Get counts by status
        await this.loadStatusCounts();
      } catch (error) {
        console.error("Error loading transfers:", error);
        this.$buefy.toast.open({
          message: "Error carregant transferències",
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    async loadStatusCounts() {
      try {
        // Fetch all transfer orders to count statuses
        const response = await service({ requiresAuth: true }).get("orders", {
          params: { transfer: true, _limit: -1 }
        });
        const allOrders = response.data;

        this.pendingCount = allOrders.filter(
          o => this.getTransferStatus(o) === 'pending'
        ).length;
        this.inProgressCount = allOrders.filter(
          o => this.getTransferStatus(o) === 'in_progress'
        ).length;
        this.completedCount = allOrders.filter(
          o => this.getTransferStatus(o) === 'completed'
        ).length;
      } catch (error) {
        console.error("Error loading status counts:", error);
      }
    },
    getTransferStatus(order) {
      if (order.transfer_end_date) {
        return 'completed';
      } else if (order.transfer_start_date) {
        return 'in_progress';
      } else {
        return 'pending';
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
    setStatusFilter(event, status) {
      if (status === null) {
        // Show all
        this.statusFilter = [];
      } else if (event.ctrlKey || event.metaKey) {
        // Add/remove from filter
        const index = this.statusFilter.indexOf(status);
        if (index > -1) {
          this.statusFilter.splice(index, 1);
        } else {
          this.statusFilter.push(status);
        }
      } else {
        // Replace filter
        this.statusFilter = [status];
      }
      this.page = 1;
      this.loadData();
    },
    setPickupFilter(pickupId) {
      this.pickupFilter = pickupId;
      this.page = 1;
      this.loadData();
    },
    getStatusLabel(order) {
      const status = this.getTransferStatus(order);
      const labels = {
        pending: "PENDENT",
        in_progress: "EN PROCÉS",
        completed: "COMPLETADA"
      };
      return labels[status] || status;
    },
    getStatusTagType(order) {
      const status = this.getTransferStatus(order);
      const types = {
        pending: "is-warning",
        in_progress: "is-info",
        completed: "is-success"
      };
      return types[status] || "is-light";
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
    async startTransfer(order) {
      this.$buefy.dialog.confirm({
        message: 'Vols iniciar aquesta transferència?',
        onConfirm: async () => {
          try {
            this.isLoading = true;

            const me = await service({ requiresAuth: true }).get("users/me");
            
            await service({ requiresAuth: true }).put(
              `orders/${order.id}`,
              {
                transfer_start_date: new Date().toISOString(),
                transfer_start_user: me.data.id
              }
            );

            this.$buefy.toast.open({
              message: "Transferència iniciada correctament",
              type: "is-success"
            });

            await this.loadData();
          } catch (error) {
            console.error("Error starting transfer:", error);
            this.$buefy.toast.open({
              message: "Error iniciant la transferència",
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    async removeTransferStart(order) {
      this.$buefy.dialog.confirm({
        message: "Estàs segur que vols eliminar la informació d'inici de transferència?",
        onConfirm: async () => {
          try {
            this.isLoading = true;
            
            await service({ requiresAuth: true }).put(
              `orders/${order.id}`,
              {
                transfer_start_date: null,
                transfer_start_user: null
              }
            );
            
            this.$buefy.toast.open({
              message: "Informació d'inici de transferència eliminada",
              type: "is-success"
            });
            
            await this.loadData();
          } catch (error) {
            console.error("Error removing transfer start:", error);
            this.$buefy.toast.open({
              message: "Error eliminant la informació d'inici de transferència",
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    async endTransfer(order) {
      this.$buefy.dialog.confirm({
        message: 'Vols finalitzar aquesta transferència?',
        onConfirm: async () => {
          try {
            this.isLoading = true;

            const me = await service({ requiresAuth: true }).get("users/me");
            
            await service({ requiresAuth: true }).put(
              `orders/${order.id}`,
              {
                transfer_end_date: new Date().toISOString(),
                transfer_end_user: me.data.id
              }
            );

            this.$buefy.toast.open({
              message: "Transferència finalitzada correctament",
              type: "is-success"
            });

            await this.loadData();
          } catch (error) {
            console.error("Error ending transfer:", error);
            this.$buefy.toast.open({
              message: "Error finalitzant la transferència",
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    async removeTransferEnd(order) {
      this.$buefy.dialog.confirm({
        message: "Estàs segur que vols eliminar la informació de fi de transferència?",
        onConfirm: async () => {
          try {
            this.isLoading = true;
            
            await service({ requiresAuth: true }).put(
              `orders/${order.id}`,
              {
                transfer_end_date: null,
                transfer_end_user: null
              }
            );
            
            this.$buefy.toast.open({
              message: "Informació de fi de transferència eliminada",
              type: "is-success"
            });
            
            await this.loadData();
          } catch (error) {
            console.error("Error removing transfer end:", error);
            this.$buefy.toast.open({
              message: "Error eliminant la informació de fi de transferència",
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    rowClassFn(row) {
      const status = this.getTransferStatus(row);
      if (status === "completed") {
        return "has-background-light";
      }
      return "";
    },
    openScanner(action) {
      this.scannerAction = action; // 'start' or 'end'
      this.isScannerActive = true;
    },
    closeScanner() {
      this.isScannerActive = false;
      this.scannerAction = null;
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

        // Check if order has transfer flag
        if (!order.transfer) {
          addToHistory(orderId, 'warning', 'No és una comanda de transferència');
          this.$buefy.toast.open({
            message: `Comanda #${orderId} no és una transferència`,
            type: 'is-warning',
            duration: 2000
          });
          return;
        }

        const me = await service({ requiresAuth: true }).get("users/me");

        if (this.scannerAction === 'start') {
          // Starting transfer
          if (order.transfer_start_date) {
            addToHistory(orderId, 'warning', 'Transferència ja iniciada');
            this.$buefy.toast.open({
              message: `Comanda #${orderId} ja està iniciada`,
              type: 'is-warning',
              duration: 2000
            });
            return;
          }

          // Start the transfer
          await service({ requiresAuth: true }).put(`orders/${orderId}`, {
            transfer_start_date: new Date().toISOString(),
            transfer_start_user: me.data.id
          });

          addToHistory(orderId, 'success', 'Transferència iniciada');
          this.$buefy.toast.open({
            message: `Transferència #${orderId} iniciada`,
            type: 'is-success',
            duration: 2000
          });

        } else if (this.scannerAction === 'end') {
          // Ending transfer
          if (!order.transfer_start_date) {
            addToHistory(orderId, 'warning', 'Transferència no iniciada');
            this.$buefy.toast.open({
              message: `Comanda #${orderId} no està iniciada`,
              type: 'is-warning',
              duration: 2000
            });
            return;
          }

          if (order.transfer_end_date) {
            addToHistory(orderId, 'warning', 'Transferència ja finalitzada');
            this.$buefy.toast.open({
              message: `Comanda #${orderId} ja està finalitzada`,
              type: 'is-warning',
              duration: 2000
            });
            return;
          }

          // End the transfer
          await service({ requiresAuth: true }).put(`orders/${orderId}`, {
            transfer_end_date: new Date().toISOString(),
            transfer_end_user: me.data.id
          });

          addToHistory(orderId, 'success', 'Transferència finalitzada');
          this.$buefy.toast.open({
            message: `Transferència #${orderId} finalitzada`,
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

.transfer-detail-container {
  padding: 1.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin: 1rem 0;
}

.detail-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  strong {
    color: #363636;
    min-width: 120px;
  }

  span {
    color: #4a4a4a;
    text-align: right;
    flex: 1;
  }
}

.transfer-action-box {
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 1rem;
  border: 1px solid #e0e0e0;
}

.action-header {
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #d0d0d0;

  strong {
    color: #363636;
    font-size: 0.95rem;
  }
}

.action-info {
  .detail-row {
    border-bottom: 1px solid #e0e0e0;
    padding: 0.4rem 0;
  }

  .button {
    margin-top: 0.75rem;
  }
}

.action-buttons {
  margin-top: 0.5rem;
}

.action-disabled {
  margin-top: 0.5rem;
  padding: 0.5rem;
  text-align: center;
  font-style: italic;
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
