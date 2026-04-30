<template>
  <section class="xsection operations-table-section">
    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <modal-box-incidence
      :is-active="isIncidenceModalActive"
      :order-id="selectedOrderForIncidence"
      :predefined-description="predefinedIncidenceText"
      @confirm="onIncidenceCreated"
      @cancel="onIncidenceCancelled"
    ></modal-box-incidence>

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

        <!-- Operation Type Filter -->
        <div class="mb-3 mr-4">
          <h3 class="subtitle is-6 mb-2 is-hidden-mobile">Tipus d'operació (Ctrl+click per múltiples)</h3>
          <div class="is-flex is-block-mobile is-flex-wrap-wrap">
            <b-button
              class="view-button mb-2 mr-2 ml-0"
              :class="{
                'is-primary': operationTypeFilter.includes('entrega'),
                'is-light': !operationTypeFilter.includes('entrega')
              }"
              @click="setOperationTypeFilter($event, 'entrega')"
            >
              Entrega
            </b-button>
            <b-button
              class="view-button mb-2 mr-2 ml-0"
              :class="{
                'is-primary': operationTypeFilter.includes('recollida'),
                'is-light': !operationTypeFilter.includes('recollida')
              }"
              @click="setOperationTypeFilter($event, 'recollida')"
            >
              Recollida
            </b-button>
            <b-button
              class="view-button mb-2 mr-2 ml-0"
              :class="{
                'is-primary': operationTypeFilter.includes('transferencia'),
                'is-light': !operationTypeFilter.includes('transferencia')
              }"
              @click="setOperationTypeFilter($event, 'transferencia')"
            >
              Transferència
            </b-button>
          </div>
        </div>

        <!-- Date Filter -->
        <div class="mb-3">
          <h3 class="subtitle is-6 mb-2">Filtre per data operació</h3>
          <b-field class="is-flex">
            <b-button
              v-if="selectedDate"
              @click="goToPreviousDay"
              icon-left="chevron-left"
              type="is-light"
              title="Dia anterior"
            >
            </b-button>
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
                  :class="{ 'ml-2': selectedDate }"
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
              @click="goToNextDay"
              icon-left="chevron-right"
              type="is-light"
              title="Dia següent"
            >
            </b-button>
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
          <div class="ml-0 mt-0 ml-md-4 mt-md-4">
            <div class="ml-0 mt-0 ml-md-4 mt-md-4">
              <div class="columns is-mobile bg-white-panel">
                <div class="column is-4">
                  <h2>Entregues</h2>
                  <h3 class="title is-3 mb-0">{{ entreguesCount }}</h3>
                </div>
                <div class="column is-4">
                  <h2>Transferències</h2>
                  <h3 class="title is-3 mb-0">{{ transfersCount }}</h3>
                </div>
                <div class="column is-4">
                  <h2>Recollides</h2>
                  <h3 class="title is-3 mb-0">{{ recollidesCount }}</h3>
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
      class="small-table operations-table"
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
      :mobile-cards="false"
    >
      <b-table-column
        label="Tipus"
        field="operationTypeSort"
        sortable
        v-slot="props"
        width="120"
        cell-class="mobile-type-cell"
      >
        <b-tag :type="getOperationTypeColor(props.row)" size="is-small">
          {{ getOperationTypeLabel(props.row) }}
        </b-tag>
      </b-table-column>

      <b-table-column
        label="Comanda"
        field="id"
        sortable
        v-slot="props"
        width="100"
        cell-class="mobile-id-cell"
      >
        <router-link
          :to="{ name: 'orders.edit', params: { id: props.row.id } }"
        >
          #{{ props.row.id.toString().padStart(4, "0")
          }}{{ props.row.is_collection_order ? "-R" : "" }}
        </router-link>
      </b-table-column>

      <b-table-column
        label="Data Operació"
        field="operation_date"
        sortable
        v-slot="props"
        width="110"
        cell-class="mobile-date-cell"
      >
        {{ formatDate(props.row.operationType === 'transfer' ? props.row.transfer_route_date : props.row.estimated_delivery_date) }}
      </b-table-column>

      <b-table-column
        label="Sòcia"
        field="owner.fullname"
        sortable
        v-slot="props"
        width="150"
        cell-class="mobile-socia-cell"
      >
        <span class="mobile-label">Sòcia:</span>
        {{
          props.row.owner
            ? props.row.owner.fullname || props.row.owner.username
            : "-"
        }}
      </b-table-column>

      <b-table-column
        label="Punt"
        field="contact_trade_name"
        sortable
        v-slot="props"
        width="150"
        cell-class="mobile-punt-cell"
      >
        <span class="mobile-label">Punt:</span>
        {{
          props.row.contact_trade_name
        }}
      </b-table-column>

      

      <b-table-column
        label="Ruta"
        field="route.name"
        sortable
        v-slot="props"
        width="150"
        cell-class="hide-mobile"
      >
        {{ getRouteName(props.row) }}
      </b-table-column>

      <b-table-column
        label="Data entrega"
        field="estimated_delivery_date"
        sortable
        v-slot="props"
        width="110"
        cell-class="hide-mobile"
      >
        {{ formatDate(props.row.estimated_delivery_date) }}
      </b-table-column>

      <b-table-column
        label="Origen"
        field="pickupPointSort"
        sortable
        v-slot="props"
        width="150"
        cell-class="mobile-route-cell"
      >
        <span class="mobile-route-display">{{ getPickupPointName(props.row) }} → {{ getDeliveryPointName(props.row) }}</span>
        <span class="desktop-route-display">{{ getPickupPointName(props.row) }}</span>
      </b-table-column>

      <b-table-column
        label="Destí"
        field="deliveryPointSort"
        sortable
        v-slot="props"
        width="200"
        cell-class="hide-mobile"
      >
        {{ getDeliveryPointName(props.row) }}
      </b-table-column>

      <b-table-column
        label="Caixes"
        field="units"
        sortable
        v-slot="props"
        width="80"
        cell-class="mobile-caixes-cell"
      >
        <div class="mobile-caixes-wrapper">
          <span><span class="mobile-label">Caixes:</span> {{ props.row.units }}</span>
          <div class="mobile-incidence-button">
            <b-button
              v-if="!props.row.deposit_date && props.row.incidences && props.row.incidences.length > 0"
              type="is-primary"
              size="is-small"
              icon-left="bell"
              @click="openIncidenceLink(props.row.incidences[0].id)"
              title="Veure incidència"
            >
            </b-button>
            <b-button
              v-else-if="!props.row.deposit_date"
              type="is-warning"
              size="is-small"
              icon-left="bell"
              @click="openIncidenceModal(props.row)"
              title="Crear incidència"
            >
            </b-button>
          </div>
        </div>
        <span class="desktop-caixes-display">{{ props.row.units }}</span>
      </b-table-column>

      <b-table-column
        label="Kg"
        field="kilograms"
        sortable
        v-slot="props"
        width="80"
        cell-class="hide-mobile"
      >
        {{ props.row.kilograms }}
      </b-table-column>

      <b-table-column
        label="Estat comanda"
        field="status"
        sortable
        v-slot="props"
        width="120"
        cell-class="hide-mobile"
      >
        <b-tag :type="getStatusTagType(props.row.status)">
          {{ getStatusLabel(props.row.status) }}
        </b-tag>
      </b-table-column>

      <b-table-column
        label="Dipositat"
        field="deposit_date"
        sortable
        v-slot="props"
        width="100"
        cell-class="hide-mobile"
      >
        <b-tag type="is-success" v-if="props.row.deposit_date">
          Sí
        </b-tag>
        <template v-else>
          <b-button
            v-if="props.row.incidences && props.row.incidences.length > 0"
            type="is-primary"
            size="is-small"
            icon-left="bell"
            @click="openIncidenceLink(props.row.incidences[0].id)"
            title="Veure incidència"
          >
          </b-button>
          <b-button
            v-else
            type="is-warning"
            size="is-small"
            icon-left="bell"
            @click="openIncidenceModal(props.row)"
            title="Crear incidència"
          >
          </b-button>
        </template>
      </b-table-column>

      <b-table-column
        label="Estat Logístic"
        field="logisticsStatus"
        sortable
        v-slot="props"
        width="130"
        cell-class="hide-mobile"
      >
        <b-tag
          :type="getLogisticsStatusType(props.row)"
          v-if="getLogisticsStatusLabel(props.row)"
        >
          {{ getLogisticsStatusLabel(props.row) }}
        </b-tag>
        <span v-else>-</span>
      </b-table-column>

      <b-table-column label="Accions" v-slot="props" width="180" cell-class="mobile-actions-cell">
        <div class="action-buttons-grid">
          <!-- Transfer actions -->
          <template v-if="props.row.operationType === 'transfer'">
            <!-- Start button if not started -->
            <b-button
              v-if="!props.row.transfer_start_date"
              type="is-primary"
              size="is-small"
              icon-left="play"
              @click="startTransfer(props.row)"
            >
              Carregar
            </b-button>

            <!-- End button if started but not ended -->
            <b-button
              v-if="
                props.row.transfer_start_date && !props.row.transfer_end_date
              "
              type="is-primary"
              size="is-small"
              icon-left="play"
              @click="endTransfer(props.row)"
            >
              Descarregar
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

          <!-- Direct order actions (all non-transfer orders) -->
          <template v-else>
            <!-- Pickup button if not picked up -->
            <b-button
              v-if="!props.row.pickup_date"
              type="is-primary"
              size="is-small"
              icon-left="play"
              @click="pickupOrder(props.row)"
            >
              {{ props.row.is_collection_order ? "Recollir" : "Carregar" }}
            </b-button>

            <!-- Undo button if picked up -->
            <b-button
              v-if="props.row.pickup_date"
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
                  <span>{{ props.row.contact_trade_name }}</span>
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
import ModalBoxIncidence from "@/components/ModalBoxIncidence";

export default {
  name: "OrderOperationsTable",
  components: {
    ModalBoxIncidence
  },
  data() {
    return {
      isLoading: false,
      operations: [],
      routes: [],
      deliveryUsers: [],
      selectedDeliveryUser: null,
      selectedDate: null,
      statusFilter: ["pending", "processed"],
      operationTypeFilter: ["entrega", "recollida", "transferencia"],
      total: 0,
      page: 1,
      perPage: 50,
      sortField: "estimated_delivery_date",
      sortOrder: "asc",
      defaultSortOrder: "asc",
      permissions: [],
      currentUserId: null,
      entreguesCount: 0,
      transfersCount: 0,
      recollidesCount: 0,
      isIncidenceModalActive: false,
      selectedOrderForIncidence: null,
      predefinedIncidenceText: ""
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
          this.entreguesCount = 0;
          this.transfersCount = 0;
          this.recollidesCount = 0;
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

        // Note: Date filter is applied client-side after fetching orders
        // because we need to filter by different fields (estimated_delivery_date or transfer_route_date)

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
            // Apply date filter if selected
            if (this.selectedDate) {
              const dateStr = moment(this.selectedDate).format("YYYY-MM-DD");
              const operationDate = isTransfer 
                ? moment(order.transfer_route_date).format("YYYY-MM-DD")
                : moment(order.estimated_delivery_date).format("YYYY-MM-DD");
              
              if (operationDate !== dateStr) {
                return; // Skip this order if date doesn't match
              }
            }

            // Apply operation type filter
            let operationType = '';
            if (isTransfer) {
              operationType = 'transferencia';
            } else if (order.is_collection_order) {
              operationType = 'recollida';
            } else {
              operationType = 'entrega';
            }
            
            if (!this.operationTypeFilter.includes(operationType)) {
              return; // Skip this order
            }
            // Determine operation type sort order: 0=Normal, 1=Recollida, 2=Transferència
            let operationTypeSort = 0; // Normal by default
            if (isDirect && !isTransfer) {
              operationTypeSort = order.is_collection_order ? 1 : 0;
            } else if (isTransfer) {
              operationTypeSort = 2;
            }

            // Compute logistics status for sorting
            let logisticsStatus = "";
            if (isTransfer) {
              // For transfers, only check transfer dates
              if (order.transfer_end_date) {
                logisticsStatus = "transferred";
              } else if (order.transfer_start_date) {
                logisticsStatus = "loaded";
              }
            } else {
              // For non-transfers, check pickup_date
              if (order.pickup_date) {
                logisticsStatus = "picked_up";
              }
            }

            // Compute sort values for pickup and delivery points
            let pickupPointSort = "";
            let deliveryPointSort = "";

            // Pickup point sort value
            if (order.is_collection_order) {
              pickupPointSort = order.contact
                ? (
                    order.contact.trade_name ||
                    order.contact_trade_name ||
                    ""
                  ).toLowerCase()
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
              deliveryPointSort: deliveryPointSort,
              logisticsStatus: logisticsStatus,
              operation_date: isTransfer ? order.transfer_route_date : order.estimated_delivery_date
            });
          }
        });

        // Calculate counts
        this.entreguesCount = operations.filter(
          o => o.operationType === "direct" && !o.is_collection_order
        ).length;
        this.transfersCount = operations.filter(
          o => o.operationType === "transfer"
        ).length;
        this.recollidesCount = operations.filter(
          o => o.operationType === "direct" && o.is_collection_order
        ).length;

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
    goToPreviousDay() {
      if (this.selectedDate) {
        this.selectedDate = moment(this.selectedDate)
          .subtract(1, "days")
          .toDate();
        this.page = 1;
        this.loadData();
      }
    },
    goToNextDay() {
      if (this.selectedDate) {
        this.selectedDate = moment(this.selectedDate)
          .add(1, "days")
          .toDate();
        this.page = 1;
        this.loadData();
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
    setOperationTypeFilter(event, type) {
      if (event.ctrlKey || event.metaKey) {
        // Add/remove from filter
        const index = this.operationTypeFilter.indexOf(type);
        if (index > -1) {
          this.operationTypeFilter.splice(index, 1);
        } else {
          this.operationTypeFilter.push(type);
        }
      } else {
        // Replace filter
        this.operationTypeFilter = [type];
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
    getLogisticsStatusLabel(order) {
      // For transfers, only check transfer-specific fields
      if (order.operationType === "transfer") {
        if (order.transfer_end_date) {
          return "Completada";
        }
        if (order.transfer_start_date) {
          return "Carregada";
        }
        return null;
      }
      // For non-transfers, check pickup_date
      if (order.pickup_date) {
        return order.is_collection_order ? "Recollida" : "Carregada";
      }
      return null;
    },
    getLogisticsStatusType(order) {
      // For transfers, only check transfer-specific fields
      if (order.operationType === "transfer") {
        if (order.transfer_end_date) {
          return "is-success";
        }
        if (order.transfer_start_date) {
          return "is-info";
        }
        return "is-light";
      }
      // For non-transfers, check pickup_date
      if (order.pickup_date) {
        return "is-success";
      }
      return "is-light";
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
      return "Entrega";
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
              pickup_date: new Date().toISOString(),
              pickup_user: me.data.id
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
              pickup_date: null,
              pickup_user: null
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
    },
    openIncidenceLink(incidenceId) {
      const route = this.$router.resolve({
        path: `/incidences?id=${incidenceId}`
      });
      window.open(route.href, "_blank");
    },
    openIncidenceModal(order) {
      this.selectedOrderForIncidence = order.id;
      this.predefinedIncidenceText = "Comanda no dipositada";
      this.isIncidenceModalActive = true;
    },
    onIncidenceCreated() {
      this.isIncidenceModalActive = false;
      this.selectedOrderForIncidence = null;
      this.$buefy.toast.open({
        message: "Incidència creada correctament",
        type: "is-success"
      });
      // Optionally reload data to reflect changes
      this.loadData();
    },
    onIncidenceCancelled() {
      this.isIncidenceModalActive = false;
      this.selectedOrderForIncidence = null;
      this.predefinedIncidenceText = "";
    }
  }
};
</script>

<style lang="scss" scoped>
.filters-container {
  background-color: white;
  border-radius: 8px;
  padding: 1rem 1.5rem;
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
.operations-table-section {
  table {
    font-size: 0.75rem;

  .table {
    font-size: 0.75rem;
  }

  td {
    padding: 0.375rem 0.375rem;
    font-size: 0.75rem;
  }

  th {
    padding: 0.375rem 0.375rem;
    font-size: 0.75rem;
  }
}
.is-full-width {
  flex-grow: 1;
}
  
  @media screen and (min-width: 769px) {
    .filters-container {
      padding: 0 1.5rem;
    }
  .ml-md-4 {
    margin-left: 1.5rem!important;
  }
  .mt-md-4 {
    margin-top: 1.5rem!important;
  }  
  }

  // Mobile-specific styles
  @media screen and (max-width: 768px) {
    .operations-table {
      // Hide columns on mobile
      .hide-mobile {
        display: none !important;
      }

      // Hide table headers on mobile
      thead {
        display: none;
      }

      // Make table rows appear as cards
      tbody tr {
        display: block;
        margin-bottom: 1rem;
        border: 1px solid #dbdbdb;
        border-radius: 6px;
        background-color: white;
        box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1);
      }

      tbody td {
        display: block;
        border: none !important;
        padding: 0.25rem 0.5rem !important;
        text-align: left !important;
      }

      // First row: ID, Tipus, Date in one line
      .mobile-id-cell {
        display: inline-block !important;
        width: auto !important;
        font-weight: 600;
        padding-right: 0.5rem !important;
        font-size: 0.85rem;
        margin-top: 10px;
      }

      .mobile-type-cell {
        display: inline-block !important;
        width: auto !important;
        padding-right: 0.5rem !important;
        margin-top: 8px;
      }

      .mobile-date-cell {
        display: inline-block !important;
        width: auto !important;
        font-size: 0.85rem;
        margin-top: 10px;
        // color: #7a7a7a;
      }

      // Show labels inline on mobile
      .mobile-label {
        font-weight: 600;
        color: #363636;
        margin-right: 0.25rem;
      }

      // Punt and Sòcia rows
      .mobile-punt-cell,
      .mobile-socia-cell {
        font-size: 0.85rem;
      }

      // Route display
      .mobile-route-cell {
        .mobile-route-display {
          display: inline !important;
          font-size: 0.85rem;
        }
        .desktop-route-display {
          display: none !important;
        }
      }

      // Caixes with incidence button
      .mobile-caixes-cell {
        .mobile-caixes-wrapper {
          display: flex !important;
          align-items: center;
          justify-content: space-between;
          
          .mobile-incidence-button {
            margin-left: 0.5rem;
          }
        }
        .desktop-caixes-display {
          display: none !important;
        }
      }

      // Actions cell on mobile
      .mobile-actions-cell {
        padding-top: 0.5rem !important;
        padding-bottom: 0.5rem !important;
        
        .action-buttons-grid {
          justify-content: center;
        }
      }

      // Detail icon - keep it visible
      .chevron-cell {
        text-align: right !important;
        padding-top: 0.5rem !important;
        position: absolute;
        right: 0;
        top: 4px;
      }
    }
  }

  // Desktop-specific styles
  @media screen and (min-width: 769px) {
    .operations-table {
      .mobile-label {
        display: none;
      }

      .mobile-route-display {
        display: none;
      }

      .desktop-route-display {
        display: inline;
      }

      .mobile-caixes-wrapper {
        display: none;
      }

      .desktop-caixes-display {
        display: inline;
      }
    }
  }
}
</style>
