<template>
  <section class="xsection">
    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <div class="filters-container mb-4">
      <div
        class="is-flex is-block-mobile is-align-items-center is-flex-wrap-wrap"
      >
        <!-- Delivery User Filter -->
        <div class="mb-3 mr-4">
          <h3 class="subtitle is-6 mb-2">Usuari</h3>
          <b-field>
            <b-select
              v-model="selectedDeliveryUser"
              placeholder="Selecciona usuari"
              @input="onDeliveryUserChange"
            >
              <option
                v-for="user in deliveryUsers"
                :key="user.id"
                :value="user.id"
              >
                {{ user.fullname || user.username }}
              </option>
            </b-select>
          </b-field>
        </div>

        <!-- Date Filter -->
        <div class="mb-3">
          <h3 class="subtitle is-6 mb-2">Filtre per data d'entrega</h3>
          <b-field class="is-flex">
            <b-datepicker
              v-model="selectedDate"
              placeholder="Selecciona una data"
              icon="calendar-today"
              :date-formatter="formatDatePicker"
              :date-parser="parseDatePicker"
              editable
              @input="onDateChange"
            >
              <template v-slot:trigger>
                <b-button
                  icon-left="calendar-today"
                  outlined
                  :type="selectedDate ? 'is-primary' : ''"
                >
                  {{
                    selectedDate ? formatDate(selectedDate) : "Totes les dates"
                  }}
                </b-button>
              </template>
            </b-datepicker>
            <b-button
                class="ml-2"
              v-if="selectedDate"
              @click="clearDateFilter"
              icon-left="close"
              type="is-danger"
              
            >
            </b-button>
          </b-field>
        </div>

        <!-- Summary -->
      <div class="mb-3 is-full-width">
        <div class="columns is-multiline ml-0 mt-4">
          <div class="column is-half">
            <div class="columns zis-mobile bg-white-panel">
              <div class="column is-3">
                <h2>Comandes directes</h2>
                <h3 class="title is-3 mb-0">{{ directOrdersCount }}</h3>
              </div>
              <div class="column is-3">
                <h2>Transferències</h2>
                <h3 class="title is-3 mb-0">{{ transfersCount }}</h3>
              </div>
              <div class="column is-3">
                <h2>Total operacions</h2>
                <h3 class="title is-3 mb-0">{{ totalOperationsCount }}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>
      <!-- Status Filter -->
      <!-- <div class="mb-3">
        <h3 class="subtitle is-6 mb-2">Estat de comanda</h3>
        <div class="is-flex is-block-mobile is-flex-wrap-wrap">
          <b-button
            class="view-button mb-2 mr-2 ml-0"
            :class="{
              'is-primary': statusFilter.includes('pending'),
              'is-warning': !statusFilter.includes('pending')
            }"
            @click="setStatusFilter($event, 'pending')"
          >
            PENDENTS
          </b-button>
          <b-button
            class="view-button mb-2 mr-2 ml-0"
            :class="{
              'is-primary': statusFilter.includes('processed'),
              'is-warning': !statusFilter.includes('processed')
            }"
            @click="setStatusFilter($event, 'processed')"
          >
            PROCESSADES
          </b-button>
        </div>
      </div> -->

      
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
      :data="operations"
      :debounce-search="500"
      detailed
      detail-key="id"
      :show-detail-icon="true"
    >
      <b-table-column
        label="Comanda"
        field="id"
        sortable
        v-slot="props"
        width="100"
      >
        <router-link
          :to="{ name: 'orders.edit', params: { id: props.row.id } }"
        >
          #{{ props.row.id.toString().padStart(4, "0")
          }}{{ props.row.is_collection_order ? "-R" : "" }}
        </router-link>
      </b-table-column>

      <b-table-column
        label="Tipus"
        field="operationTypeSort"
        sortable
        v-slot="props"
        width="120"
      >
        <b-tag :type="getOperationTypeColor(props.row)">
          {{ getOperationTypeLabel(props.row) }}
        </b-tag>
      </b-table-column>

      <b-table-column
        label="Sòcia"
        field="owner.fullname"
        sortable
        v-slot="props"
        width="150"
      >
        {{
          props.row.owner
            ? props.row.owner.fullname || props.row.owner.username
            : "-"
        }}
      </b-table-column>

      <b-table-column
        label="Ruta"
        field="route.name"
        sortable
        v-slot="props"
        width="150"
      >
        {{ getRouteName(props.row) }}
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
        label="Recollida"
        field="pickupPointSort"
        sortable
        v-slot="props"
        width="150"
      >
        {{ getPickupPointName(props.row) }}
      </b-table-column>

      <b-table-column
        label="Entrega"
        field="deliveryPointSort"
        sortable
        v-slot="props"
        width="200"
      >
        {{ getDeliveryPointName(props.row) }}
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
        width="120"
      >
        <b-tag :type="getStatusTagType(props.row.status)">
          {{ getStatusLabel(props.row.status) }}
        </b-tag>
      </b-table-column>

      <b-table-column label="Accions" v-slot="props" width="180">
        <div class="action-buttons-grid">
          <!-- Transfer actions -->
          <template v-if="props.row.operationType === 'transfer'">
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
              v-if="
                props.row.transfer_start_date && !props.row.transfer_end_date
              "
              type="is-success"
              size="is-small"
              icon-left="check"
              @click="endTransfer(props.row)"
            >
              Finalitzar
            </b-button>

            <!-- Undo button if in progress -->
            <b-button
              v-if="
                props.row.transfer_start_date && !props.row.transfer_end_date
              "
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
          </template>

          <!-- Direct order actions -->
          <template v-else>
            <!-- Pickup button if not picked up -->
            <b-button
              v-if="!props.row.picked_up_date"
              type="is-success"
              size="is-small"
              icon-left="check-circle"
              @click="pickupOrder(props.row)"
            >
              Recollit
            </b-button>

            <!-- Undo button if picked up -->
            <b-button
              v-if="props.row.picked_up_date"
              type="is-danger"
              size="is-small"
              icon-left="undo"
              @click="removePickup(props.row)"
            >
              Desfer
            </b-button>
          </template>
        </div>
      </b-table-column>

      <template #empty>
        <div class="has-text-centered">
          No hi ha operacions per aquest usuari
        </div>
      </template>

      <template #detail="props">
        <div class="order-detail-container">
          <div class="columns">
            <div class="column is-half">
              <div class="detail-section">
                <h3 class="subtitle is-6 mb-3">Informació de la comanda</h3>
                <div class="detail-row">
                  <strong>Tipus d'operació:</strong>
                  <span>{{ getOperationTypeDetailLabel(props.row) }}</span>
                </div>
                <div
                  class="detail-row"
                  v-if="props.row.operationType === 'transfer'"
                >
                  <strong>Ruta de transferència:</strong>
                  <span>{{
                    props.row.transfer_route
                      ? props.row.transfer_route.name
                      : "-"
                  }}</span>
                </div>
                <div
                  class="detail-row"
                  v-if="props.row.operationType === 'transfer'"
                >
                  <strong>Data transferència:</strong>
                  <span>{{ formatDate(props.row.transfer_route_date) }}</span>
                </div>
                <div
                  class="detail-row"
                  v-if="props.row.operationType === 'transfer'"
                >
                  <strong>Origen:</strong>
                  <span>{{
                    props.row.transfer_pickup_origin
                      ? props.row.transfer_pickup_origin.name
                      : "-"
                  }}</span>
                </div>
                <div
                  class="detail-row"
                  v-if="props.row.operationType === 'transfer'"
                >
                  <strong>Destinació:</strong>
                  <span>{{
                    props.row.transfer_pickup_destination
                      ? props.row.transfer_pickup_destination.name
                      : "-"
                  }}</span>
                </div>
                <div class="detail-row">
                  <strong>Punt de recollida:</strong>
                  <span>{{
                    props.row.pickup ? props.row.pickup.name : "-"
                  }}</span>
                </div>
                <div class="detail-row">
                  <strong>Refrigerada:</strong>
                  <span>{{ props.row.refrigerated ? "Sí" : "No" }}</span>
                </div>
                <div class="detail-row">
                  <strong>Fràgil:</strong>
                  <span>{{ props.row.fragile ? "Sí" : "No" }}</span>
                </div>
                <div class="detail-row" v-if="props.row.comments">
                  <strong>Comentaris:</strong>
                  <span>{{ props.row.comments }}</span>
                </div>
              </div>
            </div>
            <div class="column is-half">
              <div class="detail-section">
                <h3 class="subtitle is-6 mb-3">
                  Informació del punt d'entrega
                </h3>
                <div class="detail-row">
                  <strong>Nom:</strong>
                  <span>{{ props.row.contact_name }}</span>
                </div>
                <div class="detail-row">
                  <strong>Adreça:</strong>
                  <span>{{ props.row.contact_address }}</span>
                </div>
                <div class="detail-row">
                  <strong>Codi postal:</strong>
                  <span>{{ props.row.contact_postcode }}</span>
                </div>
                <div class="detail-row">
                  <strong>Telèfon:</strong>
                  <span>{{ props.row.contact_phone }}</span>
                </div>
                <div
                  class="detail-row"
                  v-if="props.row.contact_time_slot_1_ini"
                >
                  <strong>Horari 1:</strong>
                  <span
                    >{{ formatTimeSlot(props.row.contact_time_slot_1_ini) }} -
                    {{
                      formatTimeSlot(props.row.contact_time_slot_1_end)
                    }}</span
                  >
                </div>
                <div
                  class="detail-row"
                  v-if="props.row.contact_time_slot_2_ini"
                >
                  <strong>Horari 2:</strong>
                  <span
                    >{{ formatTimeSlot(props.row.contact_time_slot_2_ini) }} -
                    {{
                      formatTimeSlot(props.row.contact_time_slot_2_end)
                    }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import { mapState } from "vuex";
import moment from "moment";

export default {
  name: "OrderOperationsTable",
  data() {
    return {
      isLoading: false,
      operations: [],
      routes: [],
      deliveryUsers: [],
      selectedDeliveryUser: null,
      selectedDate: null,
      statusFilter: ["pending", "processed"],
      total: 0,
      page: 1,
      perPage: 50,
      sortField: "estimated_delivery_date",
      sortOrder: "asc",
      defaultSortOrder: "asc",
      permissions: [],
      currentUserId: null,
      directOrdersCount: 0,
      transfersCount: 0,
      totalOperationsCount: 0
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

    // Load routes to get delivery users
    await this.loadRoutes();

    // Set default delivery user to current user if they are a delivery user
    const currentUserAsDelivery = this.deliveryUsers.find(
      u => u.id === this.currentUserId
    );
    if (currentUserAsDelivery) {
      this.selectedDeliveryUser = this.currentUserId;
    } else if (this.deliveryUsers.length > 0) {
      // Default to first delivery user
      this.selectedDeliveryUser = this.deliveryUsers[0].id;
    }

    if (this.selectedDeliveryUser) {
      this.loadData();
    }
  },
  methods: {
    async loadRoutes() {
      try {
        const response = await service({
          requiresAuth: true,
          cached: true
        }).get("routes?_limit=-1&active=true");
        this.routes = response.data || [];

        // Extract unique delivery users from routes
        const usersMap = new Map();
        this.routes.forEach(route => {
          if (route.delivery_user) {
            const user = route.delivery_user;
            if (!usersMap.has(user.id)) {
              usersMap.set(user.id, user);
            }
          }
        });

        this.deliveryUsers = Array.from(usersMap.values()).sort((a, b) => {
          const nameA = a.fullname || a.username || "";
          const nameB = b.fullname || b.username || "";
          return nameA.localeCompare(nameB);
        });
      } catch (error) {
        console.error("Error loading routes:", error);
        this.$buefy.toast.open({
          message: "Error carregant les rutes",
          type: "is-danger"
        });
      }
    },
    async loadData() {
      if (!this.selectedDeliveryUser) {
        this.operations = [];
        this.total = 0;
        return;
      }

      this.isLoading = true;
      try {
        // Find routes where this user is the delivery_user
        const userRoutes = this.routes.filter(
          r =>
            r.delivery_user && r.delivery_user.id === this.selectedDeliveryUser
        );
        const routeIds = userRoutes.map(r => r.id);

        if (routeIds.length === 0) {
          this.operations = [];
          this.total = 0;
          this.directOrdersCount = 0;
          this.transfersCount = 0;
          this.totalOperationsCount = 0;
          this.isLoading = false;
          return;
        }

        // Build query parameters
        let params = {
          _limit: -1
        };

        // Add status filter
        if (this.statusFilter.length > 0) {
          this.statusFilter.forEach((status, index) => {
            params[`_where[_or][${index}][status]`] = status;
          });
        }

        // Add date filter if selected
        if (this.selectedDate) {
          const dateStr = moment(this.selectedDate).format("YYYY-MM-DD");
          params["estimated_delivery_date"] = dateStr;
        }

        // Fetch all orders
        const response = await service({ requiresAuth: true }).get("orders", {
          params
        });
        let allOrders = response.data || [];

        // Filter orders that match our criteria:
        // 1. Direct orders: route is in routeIds
        // 2. Transfer orders: transfer_route is in routeIds
        const operations = [];

        allOrders.forEach(order => {
          // Check if it's a direct order (route matches)
          const orderRouteId = order.route
            ? typeof order.route === "object"
              ? order.route.id
              : order.route
            : null;
          const isDirect = routeIds.includes(orderRouteId);

          // Check if it's a transfer order (transfer_route matches)
          const transferRouteId = order.transfer_route
            ? typeof order.transfer_route === "object"
              ? order.transfer_route.id
              : order.transfer_route
            : null;
          const isTransfer =
            order.transfer &&
            transferRouteId &&
            routeIds.includes(transferRouteId);

          if (isDirect || isTransfer) {
            // Determine operation type sort order: 0=Normal, 1=Recollida, 2=Transferència
            let operationTypeSort = 0; // Normal by default
            if (isDirect && !isTransfer) {
              operationTypeSort = order.is_collection_order ? 1 : 0;
            } else if (isTransfer) {
              operationTypeSort = 2;
            }

            // Compute sort values for pickup and delivery points
            let pickupPointSort = "";
            let deliveryPointSort = "";

            // Pickup point sort value
            if (order.is_collection_order) {
              pickupPointSort = order.contact
                ? (order.contact.trade_name || order.contact_trade_name || "").toLowerCase()
                : "";
            } else {
              pickupPointSort = order.pickup
                ? (order.pickup.name || "").toLowerCase()
                : "";
            }

            // Delivery point sort value
            if (order.is_collection_order) {
              deliveryPointSort = order.pickup
                ? (order.pickup.name || "").toLowerCase()
                : "";
            } else if (isTransfer && order.transfer_pickup_destination) {
              deliveryPointSort = (
                order.transfer_pickup_destination.name || ""
              ).toLowerCase();
            } else if (order.contact) {
              deliveryPointSort = (
                order.contact.trade_name ||
                order.contact_trade_name ||
                ""
              ).toLowerCase();
            }

            operations.push({
              ...order,
              operationType: isDirect && !isTransfer ? "direct" : "transfer",
              operationTypeSort: operationTypeSort,
              pickupPointSort: pickupPointSort,
              deliveryPointSort: deliveryPointSort
            });
          }
        });

        // Calculate counts
        this.directOrdersCount = operations.filter(
          o => o.operationType === "direct"
        ).length;
        this.transfersCount = operations.filter(
          o => o.operationType === "transfer"
        ).length;
        this.totalOperationsCount = operations.length;

        // Sort operations
        operations.sort((a, b) => {
          let aValue = a[this.sortField];
          let bValue = b[this.sortField];

          // Handle nested fields (like owner.fullname)
          if (this.sortField.includes(".")) {
            const fields = this.sortField.split(".");
            aValue = fields.reduce((obj, field) => obj?.[field], a);
            bValue = fields.reduce((obj, field) => obj?.[field], b);
          }

          if (aValue === bValue) return 0;
          if (aValue === null || aValue === undefined) return 1;
          if (bValue === null || bValue === undefined) return -1;

          const comparison = aValue < bValue ? -1 : 1;
          return this.sortOrder === "asc" ? comparison : -comparison;
        });

        this.total = operations.length;

        // Apply pagination
        const maxPage = Math.max(1, Math.ceil(this.total / this.perPage));
        if (this.page > maxPage) {
          this.page = maxPage;
        }

        const start = (this.page - 1) * this.perPage;
        const end = start + this.perPage;
        this.operations = operations.slice(start, end);
      } catch (error) {
        console.error("Error loading operations:", error);
        this.$buefy.toast.open({
          message: "Error carregant les operacions",
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    onDeliveryUserChange() {
      this.page = 1;
      this.loadData();
    },
    onDateChange() {
      this.page = 1;
      this.loadData();
    },
    clearDateFilter() {
      this.selectedDate = null;
      this.page = 1;
      this.loadData();
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
      if (event.ctrlKey || event.metaKey) {
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
    getRouteName(order) {
      if (order.operationType === "transfer" && order.transfer_route) {
        return (
          order.transfer_route.name || order.transfer_route.short_name || "-"
        );
      }
      if (order.route) {
        return order.route.name || order.route.short_name || "-";
      }
      return "-";
    },
    getStatusLabel(status) {
      const labels = {
        pending: "PENDENT",
        processed: "PROCESSADA",
        deposited: "DEPOSITADA",
        delivered: "LLIURADA",
        invoiced: "FACTURADA",
        cancelled: "ANUL·LADA",
        lastmile: "ÚLTIMA MILLA"
      };
      return labels[status] || status;
    },
    getStatusTagType(status) {
      const types = {
        pending: "is-warning",
        processed: "is-info",
        deposited: "is-primary",
        delivered: "is-success",
        invoiced: "is-dark",
        cancelled: "is-danger",
        lastmile: "is-link"
      };
      return types[status] || "is-light";
    },
    formatDate(date) {
      if (!date) return "-";
      return moment(date).format("DD/MM/YYYY");
    },
    formatDatePicker(date) {
      return moment(date).format("DD/MM/YYYY");
    },
    parseDatePicker(dateString) {
      return moment(dateString, "DD/MM/YYYY").toDate();
    },
    formatTimeSlot(slot) {
      if (slot === null || slot === undefined) return "-";
      const hours = Math.floor(slot);
      const minutes = (slot - hours) * 60;
      return `${hours
        .toString()
        .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    },
    getOperationTypeLabel(order) {
      if (order.operationType === "transfer") {
        return "Transferència";
      }
      if (order.is_collection_order) {
        return "Recollida";
      }
      return "Normal";
    },
    getOperationTypeColor(order) {
      if (order.operationType === "transfer") {
        return "is-warning"; // Yellow for transfers
      }
      if (order.is_collection_order) {
        return "is-success"; // Green for collection orders
      }
      return "is-info"; // Blue for normal orders
    },
    getOperationTypeDetailLabel(order) {
      if (order.operationType === "transfer") {
        return "Transferència";
      }
      if (order.is_collection_order) {
        return "Comanda de recollida";
      }
      return "Comanda normal";
    },
    getPickupPointName(order) {
      // For collection orders, pickup point is the contact (where we pick up from customer)
      if (order.is_collection_order) {
        if (order.contact) {
          return order.contact.trade_name || order.contact_trade_name || "-";
        }
        return "-";
      }
      // For regular orders, pickup point is the warehouse/farm
      if (order.pickup) {
        return order.pickup.name || "-";
      }
      return "-";
    },
    getDeliveryPointName(order) {
      // For collection orders, delivery is to the warehouse/pickup point
      if (order.is_collection_order) {
        if (order.pickup) {
          return order.pickup.name || "-";
        }
        return "-";
      }
      // For transfers, show the destination warehouse
      if (
        order.operationType === "transfer" &&
        order.transfer_pickup_destination
      ) {
        return order.transfer_pickup_destination.name || "-";
      }
      // For direct orders, show the contact (place)
      if (order.contact) {
        return order.contact.trade_name || order.contact_trade_name || "-";
      }
      return "-";
    },
    async startTransfer(order) {
      this.$buefy.dialog.confirm({
        message: "Vols iniciar aquesta transferència?",
        onConfirm: async () => {
          try {
            this.isLoading = true;

            const me = await service({ requiresAuth: true }).get("users/me");

            await service({ requiresAuth: true }).put(`orders/${order.id}`, {
              transfer_start_date: new Date().toISOString(),
              transfer_start_user: me.data.id
            });

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
    async endTransfer(order) {
      this.$buefy.dialog.confirm({
        message: "Vols finalitzar aquesta transferència?",
        onConfirm: async () => {
          try {
            this.isLoading = true;

            const me = await service({ requiresAuth: true }).get("users/me");

            await service({ requiresAuth: true }).put(`orders/${order.id}`, {
              transfer_end_date: new Date().toISOString(),
              transfer_end_user: me.data.id
            });

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
    async removeTransferStart(order) {
      this.$buefy.dialog.confirm({
        message:
          "Estàs segur que vols eliminar la informació d'inici de transferència?",
        onConfirm: async () => {
          try {
            this.isLoading = true;

            await service({ requiresAuth: true }).put(`orders/${order.id}`, {
              transfer_start_date: null,
              transfer_start_user: null
            });

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
    async removeTransferEnd(order) {
      this.$buefy.dialog.confirm({
        message:
          "Estàs segur que vols eliminar la informació de fi de transferència?",
        onConfirm: async () => {
          try {
            this.isLoading = true;

            await service({ requiresAuth: true }).put(`orders/${order.id}`, {
              transfer_end_date: null,
              transfer_end_user: null
            });

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
    async pickupOrder(order) {
      this.$buefy.dialog.confirm({
        message: "Vols marcar aquesta comanda com a recollida?",
        onConfirm: async () => {
          try {
            this.isLoading = true;

            const me = await service({ requiresAuth: true }).get("users/me");

            await service({ requiresAuth: true }).put(`orders/${order.id}`, {
              picked_up_date: new Date().toISOString(),
              picked_up_user: me.data.id
            });

            this.$buefy.toast.open({
              message: "Comanda marcada com a recollida",
              type: "is-success"
            });

            await this.loadData();
          } catch (error) {
            console.error("Error marking order as picked up:", error);
            this.$buefy.toast.open({
              message: "Error marcant la comanda com a recollida",
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    async removePickup(order) {
      this.$buefy.dialog.confirm({
        message: "Estàs segur que vols eliminar la informació de recollida?",
        onConfirm: async () => {
          try {
            this.isLoading = true;

            await service({ requiresAuth: true }).put(`orders/${order.id}`, {
              picked_up_date: null,
              picked_up_user: null
            });

            this.$buefy.toast.open({
              message: "Informació de recollida eliminada",
              type: "is-success"
            });

            await this.loadData();
          } catch (error) {
            console.error("Error removing pickup:", error);
            this.$buefy.toast.open({
              message: "Error eliminant la informació de recollida",
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.filters-container {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

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

.order-detail-container {
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
    min-width: 150px;
  }

  span {
    color: #4a4a4a;
    text-align: right;
    flex: 1;
  }
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
.is-full-width {
  flex-grow: 1;
}
</style>
