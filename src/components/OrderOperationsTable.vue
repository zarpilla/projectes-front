<template>
  <!-- Redesign A (mockup A-Log-Repartiment): a driver's day as cards, made for
       the phone: farm pickups, deliveries (load them) and transfers grouped by
       origin (tick them as they are loaded). -->
  <div class="operations-page">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false" />

    <modal-box-incidence
      :is-active="isIncidenceModalActive"
      :order-id="selectedOrderForIncidence"
      :predefined-description="predefinedIncidenceText"
      @confirm="onIncidenceCreated"
      @cancel="onIncidenceCancelled"
    ></modal-box-incidence>

    <title-bar :title-stack="['Logística', 'Operacions']" :subtitle="headline" />

    <section class="section is-main-section">
      <div class="ops-controls">
        <div class="ops-date">
          <b-button icon-left="chevron-left" aria-label="Dia anterior" @click="goToPreviousDay" />
          <b-datepicker
            v-model="selectedDate"
            class="ops-date-picker"
            :show-week-number="false"
            locale="ca-ES"
            :first-day-of-week="1"
            placeholder="Tots els dies"
            :date-formatter="formatDayLong"
            trap-focus
            @update:model-value="onDateChange"
          >
            <b-button size="is-small" @click="selectedDate = new Date(); onDateChange()">Avui</b-button>
            <b-button size="is-small" @click="clearDateFilter">Tots els dies</b-button>
          </b-datepicker>
          <b-button icon-left="chevron-right" aria-label="Dia següent" @click="goToNextDay" />
        </div>
        <label v-if="deliveryUsers.length > 1" class="filter-select">
          <span>Repartidora</span>
          <b-select v-model="selectedDeliveryUser" @update:model-value="onDeliveryUserChange">
            <option v-for="user in deliveryUsers" :key="user.id" :value="user.id">{{ user.fullname || user.username }}</option>
          </b-select>
        </label>
      </div>

      <div class="segmented ops-tabs" role="group" aria-label="Tipus d'operació">
        <button type="button" :class="{ 'is-on': typeTab === 'all' }" @click="typeTab = 'all'">Totes <span class="count">{{ allOps.length }}</span></button>
        <button type="button" :class="{ 'is-on': typeTab === 'recollida' }" @click="typeTab = 'recollida'">Recollides <span class="count">{{ pickups.length }}</span></button>
        <button type="button" :class="{ 'is-on': typeTab === 'entrega' }" @click="typeTab = 'entrega'">Entregues <span class="count">{{ deliveries.length }}</span></button>
        <button type="button" :class="{ 'is-on': typeTab === 'transferencia' }" @click="typeTab = 'transferencia'">Transf. <span class="count">{{ transfers.length }}</span></button>
      </div>

      <div class="ops-progress">
        <div class="ops-progress-text">
          <b>{{ doneCount }} de {{ allOps.length }} fetes</b>
          <span>{{ sumUnits === 1 ? "1 caixa" : `${formatNum(sumUnits)} caixes` }} · {{ formatNum(sumKg) }} kg</span>
        </div>
        <progress class="progress is-small" :value="doneCount" :max="allOps.length || 1"></progress>
      </div>

      <p v-if="!isLoading && !allOps.length" class="a-box box-empty">
        {{ selectedDeliveryUser ? "No hi ha operacions per a aquest dia." : "No tens cap ruta assignada." }}
      </p>

      <!-- farm pickups and deliveries: one card per stop -->
      <template v-for="section in cardSections" :key="section.key">
        <section v-if="section.items.length" class="ops-section">
          <h2 class="ops-section-title">{{ section.title }} <span>{{ section.items.length }}</span></h2>
          <div class="ops-cards">
            <article v-for="(op, i) in section.items" :key="op.id" class="a-box op-card" :class="{ 'is-done': !!op.pickup_date }">
              <header class="op-head">
                <span class="op-num">{{ section.offset + i + 1 }}</span>
                <div class="op-title">
                  <b>{{ stopName(op) }}</b>
                  <small>{{ [op.contact_city || (op.contact && op.contact.city), timeSlots(op)].filter(Boolean).join(" · ") }}</small>
                </div>
              </header>
              <div class="op-load">
                <b>{{ plural(op.units || 0, "caixa") }} · {{ formatNum(op.kilograms) }} kg</b>
                <span v-if="op.refrigerated" class="tag is-info is-light">Refrigerada</span>
                <span v-if="op.fragile" class="tag is-warning is-light">Fràgil</span>
                <span v-if="op.status === 'pending'" class="tag is-warning">Pendent</span>
                <span v-if="op.deposit_date" class="tag is-success is-light">Dipositada</span>
                <span v-if="op.incidences && op.incidences.length" class="tag is-danger is-light">Incidència</span>
              </div>
              <p class="op-ref">
                <router-link :to="{ name: 'orders.view.detail', params: { id: op.id } }">#{{ op.id }}</router-link>
                · {{ op.owner ? op.owner.fullname || op.owner.username : "" }}
                <template v-if="op.operation_date && !selectedDate"> · {{ formatDayShort(op.operation_date) }}</template>
              </p>
              <div class="op-actions">
                <b-button
                  v-if="!op.pickup_date"
                  type="is-primary"
                  icon-left="check"
                  class="op-main"
                  @click="pickupOrder(op)"
                >{{ op.is_collection_order ? "Recollit" : "Carregat" }}</b-button>
                <span v-else class="op-done">
                  <b-icon icon="check-circle" size="is-small" />
                  {{ op.is_collection_order ? "Recollit" : "Carregat" }} {{ formatTime(op.pickup_date) }}
                  <button type="button" class="undo-link" @click="removePickup(op)">Desfés</button>
                </span>
                <a v-if="phoneOf(op)" :href="`tel:${phoneOf(op)}`" class="button op-icon" title="Truca" aria-label="Truca"><b-icon icon="phone-outline" size="is-small" /></a>
                <a v-if="addressOf(op)" :href="mapUrl(op)" target="_blank" rel="noopener" class="button op-icon" title="Obre el mapa" aria-label="Obre el mapa"><b-icon icon="map-outline" size="is-small" /></a>
                <b-button class="op-icon" icon-left="alert-outline" title="Crea una incidència" aria-label="Crea una incidència" @click="openIncidenceModal(op)" />
              </div>
            </article>
          </div>
        </section>
      </template>

      <!-- transfers: a checklist by origin, ticked as they are loaded -->
      <section v-if="(typeTab === 'all' || typeTab === 'transferencia') && transfers.length" class="ops-section">
        <h2 class="ops-section-title">Transferències <span>{{ transfers.length }}</span></h2>
        <p class="ops-hint">Marca-les quan les carreguis; un cop descarregades al destí, prem «Descarregada».</p>
        <section v-for="group in transferGroups" :key="group.key" class="a-box transfer-group">
          <header class="transfer-head">
            <div>
              <b>Des de {{ group.origin }}</b>
              <span> · {{ plural(group.items.length, "comanda") }} · {{ plural(group.units, "caixa") }}</span>
            </div>
            <b-button v-if="group.items.some(o => !o.transfer_start_date)" size="is-small" @click="loadAll(group)">Carrega-les totes</b-button>
          </header>
          <ul class="transfer-list">
            <li v-for="op in group.items" :key="op.id" :class="{ 'is-loaded': op.transfer_start_date, 'is-done': op.transfer_end_date }">
              <b-checkbox
                :model-value="!!op.transfer_start_date"
                :disabled="!!op.transfer_end_date"
                :aria-label="`Carregada ${stopName(op)}`"
                @update:model-value="on => setLoaded(op, on)"
              />
              <div class="transfer-text">
                <b>{{ stopName(op) }}</b>
                <small>{{ [op.contact_city, routeShort(op)].filter(Boolean).join(" · ") }}</small>
              </div>
              <div class="transfer-load">
                <b>{{ op.units || 0 }} c.</b>
                <small>{{ formatNum(op.kilograms) }} kg</small>
              </div>
              <span v-if="op.refrigerated" class="cold" title="Refrigerada" aria-label="Refrigerada">*</span>
              <div class="transfer-actions">
                <b-button v-if="op.transfer_start_date && !op.transfer_end_date" size="is-small" @click="endTransfer(op)">Descarregada</b-button>
                <template v-if="op.transfer_end_date">
                  <span class="tag is-success is-light">Descarregada</span>
                  <button type="button" class="undo-link" @click="removeTransferEnd(op)">Desfés</button>
                </template>
              </div>
            </li>
          </ul>
        </section>
      </section>
    </section>
  </div>
</template>

<script>
import service from "@/service/index";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import moment from "moment";
import ModalBoxIncidence from "@/components/ModalBoxIncidence.vue";
import TitleBar from "@/components/TitleBar.vue";
import { formatNumber } from "@/helpers/format-number";
import { plural } from "@/helpers/catalan";
import { operationsQueries, mergeOrders, orderOperations } from "@/domain/orderOperations";

const relId = value => (value && typeof value === "object" ? value.id : value);

export default {
  name: "OrderOperationsTable",
  components: {
    ModalBoxIncidence,
    TitleBar
  },
  data() {
    return {
      isLoading: false,
      operations: [],
      routes: [],
      deliveryUsers: [],
      selectedDeliveryUser: null,
      // a driver's day: today first
      selectedDate: new Date(),
      typeTab: "all",
      allOps: [],
      statusFilter: ["pending", "processed"],
      operationTypeFilter: ["entrega", "recollida", "transferencia"],
      total: 0,
      page: 1,
      perPage: 50,
      sortField: "estimated_delivery_date",
      sortOrder: "asc",
      defaultSortOrder: "asc",
      mobileSortOption: "operation_date-asc",
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
    ...mapState(useMainStore, ["me"]),
    pickups() {
      return this.allOps.filter(o => o.operationType === "direct" && o.is_collection_order);
    },
    deliveries() {
      return this.allOps.filter(o => o.operationType === "direct" && !o.is_collection_order);
    },
    transfers() {
      return this.allOps.filter(o => o.operationType === "transfer");
    },
    cardSections() {
      const show = type => this.typeTab === "all" || this.typeTab === type;
      return [
        { key: "pickups", title: "Recollides a finca", items: show("recollida") ? this.pickups : [], offset: 0 },
        { key: "deliveries", title: "Entregues", items: show("entrega") ? this.deliveries : [], offset: show("recollida") ? this.pickups.length : 0 }
      ];
    },
    transferGroups() {
      const map = new Map();
      for (const op of this.transfers) {
        const point = op.transfer_pickup_origin || op.pickup;
        const origin = (point && typeof point === "object" && (point.alias || point.name)) || this.getPickupPointName(op) || "origen sense definir";
        if (!map.has(origin)) map.set(origin, { key: origin, origin, items: [], units: 0 });
        const g = map.get(origin);
        g.items.push(op);
        g.units += Number(op.units) || 0;
      }
      return [...map.values()];
    },
    doneCount() {
      return this.allOps.filter(o => (o.operationType === "transfer" ? !!o.transfer_end_date : !!o.pickup_date)).length;
    },
    sumUnits() {
      return this.allOps.reduce((a, o) => a + (Number(o.units) || 0), 0);
    },
    sumKg() {
      return this.allOps.reduce((a, o) => a + (Number(o.kilograms) || 0), 0);
    },
    headline() {
      const user = this.deliveryUsers.find(u => u.id === this.selectedDeliveryUser);
      const routes = this.routes.filter(r => r.delivery_user && r.delivery_user.id === this.selectedDeliveryUser);
      const names = routes.length === 1 ? routes[0].name : user ? user.fullname || user.username : "";
      return [names, `${this.allOps.length} ${this.allOps.length === 1 ? "operació" : "operacions"}`].filter(Boolean).join(" · ");
    }
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
    plural,
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
          this.allOps = [];
          this.total = 0;
          this.entreguesCount = 0;
          this.transfersCount = 0;
          this.recollidesCount = 0;
          this.isLoading = false;
          return;
        }

        // Only this driver's routes (and the day, when one is picked): the
        // date of a transfer is its transfer_route_date (issues/081)
        const date = this.selectedDate ? moment(this.selectedDate).format("YYYY-MM-DD") : null;
        const answers = await Promise.all(
          operationsQueries({ routeIds, statuses: this.statusFilter, date }).map(params =>
            service({ requiresAuth: true }).get("orders", { params })
          )
        );
        let allOrders = mergeOrders(...answers.map(r => r.data || []));

        // Each order gives its delivery or collection when its route is the
        // driver's and its transfer when its transfer route is, each on its
        // own day: both when the driver has the two routes (issues/175)
        const operations = [];

        allOrders.forEach(order => {
          orderOperations(order, { routeIds, date }).forEach(op => {
            const isTransfer = op.operationType === "transfer";
            const isDirect = !isTransfer;

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
              operationType: op.operationType,
              operationTypeSort: operationTypeSort,
              pickupPointSort: pickupPointSort,
              deliveryPointSort: deliveryPointSort,
              logisticsStatus: logisticsStatus,
              operation_date: op.operation_date
            });
          });
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
        this.allOps = operations;
        this.operations = operations;
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
      if (!this.selectedDate) this.selectedDate = moment().add(1, "days").toDate();
      if (this.selectedDate) {
        this.selectedDate = moment(this.selectedDate)
          .subtract(1, "days")
          .toDate();
        this.page = 1;
        this.loadData();
      }
    },
    goToNextDay() {
      if (!this.selectedDate) this.selectedDate = moment().subtract(1, "days").toDate();
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
      // Update mobile sort option to match
      this.mobileSortOption = `${field}-${order}`;
      this.loadData();
    },
    onMobileSortChange() {
      const [field, order] = this.mobileSortOption.split('-');
      this.sortField = field;
      this.sortOrder = order;
      this.page = 1;
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
    stopName(op) {
      return op.contact_trade_name || (op.contact && (op.contact.trade_name || op.contact.name)) || op.contact_name || `Comanda #${op.id}`;
    },
    timeSlots(op) {
      const slot = (a, b) => (a !== null && a !== undefined && b !== null && b !== undefined ? `${this.formatTimeSlot(a)}–${this.formatTimeSlot(b)}` : "");
      return [slot(op.contact_time_slot_1_ini, op.contact_time_slot_1_end), slot(op.contact_time_slot_2_ini, op.contact_time_slot_2_end)].filter(Boolean).join(" i ");
    },
    phoneOf(op) {
      return op.contact_phone || (op.contact && op.contact.phone) || "";
    },
    addressOf(op) {
      return [op.contact_address, op.contact_postcode, op.contact_city].filter(Boolean).join(", ");
    },
    mapUrl(op) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.addressOf(op))}`;
    },
    routeShort(op) {
      const route = this.routes.find(r => r.id === relId(op.route));
      return route ? route.short_name || route.name : (op.route && op.route.name) || "";
    },
    formatNum(value) {
      return formatNumber(Number(value) || 0, 2);
    },
    formatTime(date) {
      return date ? moment(date).format("HH:mm") : "";
    },
    formatDayLong(date) {
      const text = date ? moment(date).locale("ca").format("dddd DD/MM/YYYY") : "";
      return text.charAt(0).toUpperCase() + text.slice(1);
    },
    formatDayShort(date) {
      return date ? moment(date).locale("ca").format("dd DD/MM") : "";
    },
    // the transfer checklist: a tick loads (or unloads) the order at once
    async setLoaded(op, on) {
      try {
        const me = await service({ requiresAuth: true, cached: true }).get("users/me");
        await service({ requiresAuth: true }).put(`orders/${op.id}`, on
          ? { transfer_start_date: new Date().toISOString(), transfer_start_user: me.data.id }
          : { transfer_start_date: null, transfer_start_user: null });
        await this.loadData();
      } catch (error) {
        this.$buefy.toast.open({ message: "No s'ha pogut desar", type: "is-danger" });
        await this.loadData();
      }
    },
    loadAll(group) {
      const pending = group.items.filter(o => !o.transfer_start_date);
      this.$buefy.dialog.confirm({
        message: `Vols marcar com a carregades les ${pending.length} comandes des de ${group.origin}?`,
        onConfirm: async () => {
          this.isLoading = true;
          try {
            const me = await service({ requiresAuth: true, cached: true }).get("users/me");
            for (const op of pending) {
              await service({ requiresAuth: true }).put(`orders/${op.id}`, { transfer_start_date: new Date().toISOString(), transfer_start_user: me.data.id });
            }
            this.$buefy.toast.open({ message: `${pending.length} comandes carregades`, type: "is-success" });
          } finally {
            this.isLoading = false;
            await this.loadData();
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
.ops-controls {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
  align-items: center;
  margin-bottom: 1rem;
}
.ops-date {
  display: flex;
  gap: .5rem;
  align-items: center;
  flex: 1 1 22rem;
  max-width: 30rem;
}
.ops-date-picker {
  flex: 1;
}
.ops-date-picker :deep(.input) {
  text-align: center;
  font-weight: 800;
}
.ops-tabs {
  margin-bottom: 1rem;
}
.ops-tabs .count {
  margin-left: .25rem;
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-muted);
}
.ops-progress {
  margin-bottom: 1.25rem;
}
.ops-progress-text {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: .375rem;
  font-size: .875rem;
  color: var(--a-fg-2);
}
.ops-progress-text b {
  color: var(--a-fg);
}
.ops-section {
  margin-bottom: 1.5rem;
}
.ops-section-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: .75rem;
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--a-fg);
}
.ops-section-title span {
  font-size: .875rem;
  font-weight: 600;
  color: var(--a-muted);
}
.ops-hint {
  margin: -.5rem 0 .75rem;
  font-size: .8125rem;
  color: var(--a-muted);
}
.ops-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  gap: .75rem;
}
.op-card {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.op-card.is-done {
  background: var(--a-thead);
}
.op-head {
  display: flex;
  gap: .75rem;
  align-items: flex-start;
}
.op-num {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--a-fg);
  color: var(--a-surface);
  font-size: .8125rem;
  font-weight: 800;
}
.op-card.is-done .op-num {
  background: var(--a-accent);
}
.op-title b,
.op-title small {
  display: block;
}
.op-title b {
  font-size: 1.0625rem;
  color: var(--a-fg);
}
.op-title small,
.op-ref {
  font-size: .8125rem;
  color: var(--a-muted);
}
.op-load {
  display: flex;
  flex-wrap: wrap;
  gap: .375rem;
  align-items: center;
}
.op-load .tag {
  height: 1.375rem;
  font-size: .6875rem;
}
.op-actions {
  display: flex;
  gap: .5rem;
  align-items: center;
}
.op-main {
  flex: 1;
  height: 3rem;
}
.op-icon.button {
  width: 3rem;
  height: 3rem;
}
.op-done {
  display: inline-flex;
  flex: 1;
  align-items: center;
  gap: .375rem;
  font-weight: 700;
  color: var(--a-pos);
}
.undo-link {
  margin-left: .25rem;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: .8125rem;
  color: var(--a-fg-2);
  text-decoration: underline;
  cursor: pointer;
}
.transfer-group {
  margin-bottom: .75rem;
  padding: 0;
  overflow: hidden;
}
.transfer-head {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
  justify-content: space-between;
  padding: .875rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.transfer-head span {
  color: var(--a-muted);
}
.transfer-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  gap: .75rem;
  align-items: center;
  padding: .625rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.transfer-list li.is-loaded {
  background: var(--a-accent-soft);
}
.transfer-list li.is-done {
  background: var(--a-thead);
}
.transfer-text b,
.transfer-text small,
.transfer-load b,
.transfer-load small {
  display: block;
}
.transfer-text small,
.transfer-load small {
  font-size: .75rem;
  color: var(--a-muted);
}
.transfer-load {
  text-align: right;
}
.cold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: var(--a-info-bg);
  color: var(--a-info-fg);
  font-weight: 800;
}
.transfer-actions {
  display: flex;
  gap: .375rem;
  align-items: center;
}
.box-empty {
  padding: 2rem !important;
  text-align: center;
  color: var(--a-muted);
}
@media screen and (max-width: 768px) {
  .ops-cards {
    grid-template-columns: minmax(0, 1fr);
  }
  .transfer-list li {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .cold {
    display: none;
  }
  .transfer-actions {
    grid-column: 2 / -1;
  }
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
      padding: 1rem 1.5rem;
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
        border: 1px solid var(--a-line);
        border-radius: 6px;
        background-color: var(--a-surface);
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
        // color: var(--a-muted);
      }

      // Show labels inline on mobile
      .mobile-label {
        font-weight: 600;
        color: var(--a-fg);
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
    .ml-5-md {
      margin-left: 3rem!important;
    }
  }
}
</style>
