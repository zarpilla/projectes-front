<template>
  <div>
    <!-- <title-bar :title-stack="titleStack" /> -->

    <modal-box-incidence
      :is-active="isIncidenceModalActive"
      :order-id="order ? order.id : 0"
      @confirm="onIncidenceCreated"
      @cancel="onIncidenceCancelled"
    ></modal-box-incidence>

    <section class="section is-main-section section-adapted">
      <card-component
        :title="formCardTitle"
        icon="package-variant"
        :close-icon="false"
      >
        <div v-if="isLoading" class="has-text-centered">
          <b-loading :active="isLoading"></b-loading>
        </div>

        <div v-else-if="order">
          <!-- Action Buttons (Top) -->
          <div class="buttons mb-5">
            <b-button
              v-for="(button, index) in actionButtons"
              :key="'top-' + index"
              :type="button.type"
              :icon-left="button.icon"
              :size="button.size"
              @click="button.action"
              v-if="button.visible"
              :loading="button.loading"
            >
              {{ button.label }}
            </b-button>
          </div>

          <!-- BLOC ZERO: Sòcia -->
          <div class="info-section mb-4">
            <h3 class="section-title">Sòcia</h3>
            <div class="info-field">
              <!-- <span class="field-label">Sòcia:</span> -->
              <span class="field-value">{{ ownerName }}</span>
            </div>
          </div>

          <hr />

          <!-- PRIMER BLOC: A ON VA I QUIN DIA? -->
          <div class="info-section mb-4">
            <h3 class="section-title">A on va i quin dia?</h3>

            <div class="info-field">
              <span class="field-label">{{
                isPickupPoint ? "Punt de consum:" : "Punt d'entrega:"
              }}</span>
              <span class="field-value">{{ contactName }}</span>
            </div>

            <div class="info-field" v-if="contactAddress">
              <span class="field-label">Adreça:</span>
              <span class="field-value">{{ contactAddress }}</span>
            </div>

            <div class="info-field" v-if="contactPhone">
              <span class="field-label">Telèfon:</span>
              <span class="field-value">{{ contactPhone }}</span>
            </div>

            <div class="info-field" v-if="contactTimeSlots">
              <span class="field-label">Horari:</span>
              <span class="field-value">{{ contactTimeSlots }}</span>
            </div>

            <div class="info-field">
              <span class="field-label">Ruta:</span>
              <span class="field-value">{{ routeName }}</span>
            </div>

            <div class="info-field" v-if="order.estimated_delivery_date">
              <span class="field-label">Data prevista d'entrega:</span>
              <span class="field-value">{{
                formatDate(order.estimated_delivery_date)
              }}</span>
            </div>
          </div>

          <hr />

          <!-- SEGON BLOC: QUÈ HEM DE PORTAR? -->
          <div class="info-section mb-4">
            <h3 class="section-title">Què hem de portar?</h3>

            <div class="info-field">
              <span class="field-label">Tipus de servei:</span>
              <span class="field-value">{{ deliveryTypeName }}</span>
            </div>

            <!-- Pickup Point Lines -->
            <div
              v-if="isPickupPoint && order.lines && order.lines.length > 0"
              class="mt-3"
            >
              <div class="info-field">
                <span class="field-label">Línies:</span>
              </div>
              <b-table
                :data="order.lines"
                :striped="true"
                :hoverable="true"
                :mobile-cards="false"
                class="mt-2"
              >
                <b-table-column
                  field="units"
                  label="Caixes"
                  width="100"
                  numeric
                  v-slot="props"
                >
                  {{ props.row.units || 0 }}
                </b-table-column>
                <b-table-column
                  field="kilograms"
                  label="Kilograms"
                  width="100"
                  numeric
                  v-slot="props"
                >
                  {{ props.row.kilograms || 0 }}
                </b-table-column>
                <b-table-column field="name" label="Nom" v-slot="props">
                  {{ props.row.name || "-" }}
                </b-table-column>
                <b-table-column
                  field="nif"
                  label="NIF"
                  width="150"
                  v-slot="props"
                >
                  {{ props.row.nif || "-" }}
                </b-table-column>
              </b-table>
            </div>

            <div class="info-field">
              <span class="field-label">Número de caixes:</span>
              <span class="field-value">{{ order.units || 0 }}</span>
            </div>

            <div class="info-field">
              <span class="field-label">Kilograms:</span>
              <span class="field-value">{{ order.kilograms || 0 }}</span>
            </div>

            <div class="info-field">
              <span class="field-label">Fràgil:</span>
              <span class="field-value">{{ order.fragile ? "Sí" : "No" }}</span>
            </div>
          </div>

          <hr />

          <!-- ON HO DEIXARÀS? -->
          <div class="info-section mb-4">
            <h3 class="section-title">On ho deixaràs?</h3>

            <div class="info-field" v-if="pickupName">
              <span class="field-label">Recollida comanda:</span>
              <span class="field-value">{{ pickupName }}</span>
            </div>

            <div class="info-field" v-if="collectionPointName">
              <span class="field-label">Punt de recollida en finca:</span>
              <span class="field-value">{{ collectionPointName }}</span>
            </div>

            <div class="info-field" v-if="collectionPointAddress">
              <span class="field-label">Adreça punt recollida:</span>
              <span class="field-value">{{ collectionPointAddress }}</span>
            </div>

            <div class="info-field" v-if="collectionPointPhone">
              <span class="field-label">Telèfon punt recollida:</span>
              <span class="field-value">{{ collectionPointPhone }}</span>
            </div>

            <div class="info-field" v-if="collectionPointTimeSlots">
              <span class="field-label">Horari punt recollida:</span>
              <span class="field-value">{{ collectionPointTimeSlots }}</span>
            </div>

            <div class="info-field" v-if="order.comments">
              <span class="field-label">Informació important:</span>
              <span class="field-value">{{ order.comments }}</span>
            </div>
          </div>

          <hr />

          <!-- HI HA INCIDÈNCIES? -->
          <div
            class="info-section mb-4"
            v-if="order.incidences && order.incidences.length > 0"
          >
            <h3 class="section-title">
              Hi ha incidències?
              <b-tag
                v-if="openIncidencesCount > 0"
                type="is-warning"
                class="ml-2"
              >
                {{ openIncidencesCount }}
                {{ openIncidencesCount === 1 ? "oberta" : "obertes" }}
              </b-tag>
            </h3>
            <div
              v-for="(incidence, index) in order.incidences"
              :key="index"
              class="incidence-item"
            >
              <div class="is-flex is-align-items-center mb-2">
                <b-tag
                  :type="
                    incidence.state === 'closed' ? 'is-success' : 'is-warning'
                  "
                >
                  {{ getIncidenceState(incidence.state) }}
                </b-tag>
                <span class="ml-2 is-size-7 has-text-grey">
                  {{ formatDateTime(incidence.created_at) }}
                </span>
              </div>
              <p class="ml-0">{{ incidence.description }}</p>
            </div>
          </div>

          <hr v-if="order.incidences && order.incidences.length > 0" />

          <!-- COLLECTION ORDERS SECTION -->
          <div
            v-if="
              order.is_collection_order &&
                order.collection_orders &&
                order.collection_orders.length > 0
            "
            class="info-section mb-4"
          >
            <h3 class="section-title">
              Comandes a recollir ({{ order.collection_orders.length }})
            </h3>
            <b-table
              :data="order.collection_orders"
              :striped="true"
              :hoverable="true"
              :mobile-cards="false"
              class="mt-3"
            >
              <b-table-column
                field="id"
                label="Comanda"
                width="120"
                v-slot="props"
              >
                <router-link v-if="permissions.includes('orders_admin')" :to="`/order/${props.row.id}`">
                  <strong>#{{ String(props.row.id).padStart(4, "0") }}</strong>
                </router-link>
                <router-link v-else :to="`/order/view/${props.row.id}`">
                  <strong>#{{ String(props.row.id).padStart(4, "0") }}</strong>
                </router-link>
              </b-table-column>
              <b-table-column field="contact" label="Entrega" v-slot="props">
                {{ getContactTradeName(props.row) }}
              </b-table-column>
              <b-table-column
                field="units"
                label="Caixes"
                width="100"
                numeric
                v-slot="props"
              >
                {{ props.row.units || 0 }}
              </b-table-column>
              <b-table-column
                field="kilograms"
                label="Kg"
                width="100"
                numeric
                v-slot="props"
              >
                {{ props.row.kilograms || 0 }}
              </b-table-column>
              <b-table-column
                field="status"
                label="Estat"
                width="150"
                v-slot="props"
              >
                <b-tag :type="getStatusColor(props.row.status)">
                  {{ getStatusName(props.row.status) }}
                </b-tag>
              </b-table-column>
            </b-table>
          </div>

          <div v-else-if="order.collection_order" class="info-section mb-4">
            <h3 class="section-title">Comanda de recollida</h3>
            <div class="info-field">
              <span class="field-label">Comanda:</span>
              <span class="field-value">
                <router-link
                  v-if="permissions.includes('orders') || permissions.includes('orders_delivery') || permissions.includes('orders_admin')"
                  :to="
                    `/order/view/${
                      typeof order.collection_order === 'object'
                        ? order.collection_order.id
                        : order.collection_order
                    }`
                  "
                >
                  #{{
                    String(
                      typeof order.collection_order === "object"
                        ? order.collection_order.id
                        : order.collection_order
                    ).padStart(4, "0")
                  }}-R
                </router-link>
                <router-link
                  v-else
                  :to="
                    `/order/${
                      typeof order.collection_order === 'object'
                        ? order.collection_order.id
                        : order.collection_order
                    }`
                  "
                >
                  #{{
                    String(
                      typeof order.collection_order === "object"
                        ? order.collection_order.id
                        : order.collection_order
                    ).padStart(4, "0")
                  }}-R
                </router-link>

              </span>
            </div>
            <div
              class="info-field"
              v-if="
                typeof order.collection_order === 'object' &&
                  order.collection_order.estimated_delivery_date
              "
            >
              <span class="field-label">Data prevista:</span>
              <span class="field-value">{{
                formatDate(order.collection_order.estimated_delivery_date)
              }}</span>
            </div>
          </div>

          <hr v-if="order.is_collection_order || order.collection_order" />

          <!-- ALTRES DADES -->
          <div class="info-section mb-4">
            <h3 class="section-title">Altres dades</h3>

            <div class="info-field">
              <span class="field-label">Estat:</span>
              <span class="field-value">
                <b-tag :type="getStatusColor(order.status)">
                  {{ getStatusName(order.status) }}
                </b-tag>
              </span>
            </div>

            <div class="info-field" v-if="order.last_mile">
              <span class="field-label">Última milla:</span>
              <span class="field-value">{{
                order.last_mile ? "Sí" : "No"
              }}</span>
            </div>

            <div class="info-field" v-if="order.transfer">
              <span class="field-label">Transferència:</span>
              <span class="field-value">
                <b-tag :type="transferStatusType">
                  {{ transferStatus }}
                </b-tag>
              </span>
            </div>

            <div class="info-field" v-if="transferPickupText">
              <span class="field-label">{{ routeLabel }}</span>              
              <span class="field-value">{{ transferPickupText }}</span>
            </div>

            <div class="info-field">
              <span class="field-label">Data comanda:</span>
              <span class="field-value">{{
                formatDate(order.route_date)
              }}</span>
            </div>

            <div class="info-field" v-if="order.delivery_date">
              <span class="field-label">Data lliurament:</span>
              <span class="field-value">{{
                formatDate(order.delivery_date)
              }}</span>
            </div>

            <div class="info-field" v-if="order.deposit_date">
              <span class="field-label">Data dipòsit:</span>
              <span class="field-value">{{
                formatDateTime(order.deposit_date)
              }}</span>
            </div>

            <div class="info-field" v-if="order.pickup_date">
              <span class="field-label">Data recollida:</span>
              <span class="field-value">{{
                formatDateTime(order.pickup_date)
              }}</span>
            </div>

            <div class="info-field" v-if="order.transfer_start_date">
              <span class="field-label">Inici transferència:</span>
              <span class="field-value">{{
                formatDateTime(order.transfer_start_date)
              }}</span>
            </div>

            <div class="info-field" v-if="order.transfer_end_date">
              <span class="field-label">Fi transferència:</span>
              <span class="field-value">{{
                formatDateTime(order.transfer_end_date)
              }}</span>
            </div>
          </div>
          <hr />

          <!-- Action Buttons (Bottom) -->
          <div class="buttons mt-5">
            <b-button
              v-for="(button, index) in actionButtons"
              :key="'bottom-' + index"
              :type="button.type"
              :icon-left="button.icon"
              :size="button.size"
              @click="button.action"
              v-if="button.visible"
              :loading="button.loading"
            >
              {{ button.label }}
            </b-button>
          </div>
        </div>

        <div v-else class="notification is-warning">
          No s'ha trobat la comanda
        </div>
      </card-component>
    </section>
  </div>
</template>

<script>
import dayjs from "dayjs";
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import ModalBoxIncidence from "@/components/ModalBoxIncidence";
import service from "@/service/index";
import { mapState } from "vuex";
import { hr } from "date-fns/locale";

export default {
  name: "OrderView",
  components: {
    TitleBar,
    CardComponent,
    ModalBoxIncidence
  },
  props: {
    id: {
      type: [String, Number],
      default: null
    }
  },
  data() {
    return {
      isLoading: false,
      isDepositingOrPickingUp: false,
      order: null,
      permissions: [],
      isIncidenceModalActive: false
    };
  },
  computed: {
    ...mapState(["me"]),
    titleStack() {
      return ["Comandes", this.formCardTitle];
    },
    formCardTitle() {
      if (this.order && this.order.id) {
        const collection = this.order.pickup_point ? " (Punt Recollida)" : "";
        return `Comanda #${this.order.id
          .toString()
          .padStart(4, "0")}${collection}`;
      }
      return "Veure Comanda";
    },
    isPickupPoint() {
      return this.order && this.order.pickup_point;
    },
    ownerName() {
      if (this.order && this.order.owner) {
        return this.order.owner.fullname || this.order.owner.username;
      }
      return "-";
    },
    contactName() {
      if (this.order && this.order.contact) {
        return this.order.contact.trade_name || this.order.contact.name || "-";
      }
      return "-";
    },
    contactAddress() {
      if (this.order) {
        const parts = [];
        if (this.order.contact_address) parts.push(this.order.contact_address);
        if (this.order.contact_postcode || this.order.contact_city) {
          const cityPart = [
            this.order.contact_postcode,
            this.order.contact_city
          ]
            .filter(Boolean)
            .join(" ");
          if (cityPart) parts.push(cityPart);
        }
        return parts.join(", ") || "";
      }
      return "";
    },
    contactPhone() {
      return this.order && this.order.contact_phone
        ? this.order.contact_phone
        : "";
    },
    contactTimeSlots() {
      if (!this.order) return "";

      const slots = [];

      if (
        this.order.contact_time_slot_1_ini != null &&
        this.order.contact_time_slot_1_end != null
      ) {
        const ini1 = this.formatTimeSlot(this.order.contact_time_slot_1_ini);
        const end1 = this.formatTimeSlot(this.order.contact_time_slot_1_end);
        slots.push(`${ini1} - ${end1}`);
      }

      if (
        this.order.contact_time_slot_2_ini != null &&
        this.order.contact_time_slot_2_end != null
      ) {
        const ini2 = this.formatTimeSlot(this.order.contact_time_slot_2_ini);
        const end2 = this.formatTimeSlot(this.order.contact_time_slot_2_end);
        slots.push(`${ini2} - ${end2}`);
      }

      return slots.join(" i ") || "";
    },
    routeName() {
      if (this.order && this.order.route) {
        return this.order.route.name || "-";
      }
      return "-";
    },
    deliveryTypeName() {
      if (this.order && this.order.delivery_type) {
        return this.order.delivery_type.name || "-";
      }
      return "-";
    },
    pickupName() {
      if (this.order && this.order.pickup) {
        return this.order.pickup.name || "";
      }
      return "";
    },
    collectionPointName() {
      if (this.order && this.order.collection_point) {
        return this.order.collection_point.name || "";
      }
      return "";
    },
    collectionPointAddress() {
      if (this.order && this.order.collection_point) {
        const parts = [];
        if (this.order.collection_point.address)
          parts.push(this.order.collection_point.address);
        if (
          this.order.collection_point.postcode ||
          this.order.collection_point.city
        ) {
          const cityPart = [
            this.order.collection_point.postcode,
            this.order.collection_point.city
          ]
            .filter(Boolean)
            .join(" ");
          if (cityPart) parts.push(cityPart);
        }
        return parts.join(", ") || "";
      }
      return "";
    },
    collectionPointPhone() {
      return this.order &&
        this.order.collection_point &&
        this.order.collection_point.phone
        ? this.order.collection_point.phone
        : "";
    },
    collectionPointTimeSlots() {
      if (!this.order || !this.order.collection_point) return "";

      const cp = this.order.collection_point;
      const slots = [];

      if (cp.time_slot_1_ini != null && cp.time_slot_1_end != null) {
        const ini1 = this.formatTimeSlot(cp.time_slot_1_ini);
        const end1 = this.formatTimeSlot(cp.time_slot_1_end);
        slots.push(`${ini1} - ${end1}`);
      }

      if (cp.time_slot_2_ini != null && cp.time_slot_2_end != null) {
        const ini2 = this.formatTimeSlot(cp.time_slot_2_ini);
        const end2 = this.formatTimeSlot(cp.time_slot_2_end);
        slots.push(`${ini2} - ${end2}`);
      }

      return slots.join(" i ") || "";
    },
    transferPickupText() {
      if (!this.order) return "";

      // Build movement chain showing all steps from pickup to delivery
      const movements = [];

      // Add pickup if exists
      if (this.order.pickup) {
        const pickupAlias = this.order.pickup.alias || this.order.pickup.name;
        if (pickupAlias) {
          movements.push(pickupAlias);
        }
      }

      // Add transfer origin if exists (and different from pickup)
      if (this.order.transfer_pickup_origin) {
        const originAlias =
          this.order.transfer_pickup_origin.alias ||
          this.order.transfer_pickup_origin.name;
        // Only add if it's not empty and not already the last item
        if (
          originAlias &&
          (movements.length === 0 ||
            movements[movements.length - 1] !== originAlias)
        ) {
          movements.push(originAlias);
        }
      }

      // Add transfer destination if exists
      if (this.order.transfer_pickup_destination) {
        const destinationAlias =
          this.order.transfer_pickup_destination.alias ||
          this.order.transfer_pickup_destination.name;
        // Only add if it's not empty and not already the last item
        if (
          destinationAlias &&
          (movements.length === 0 ||
            movements[movements.length - 1] !== destinationAlias)
        ) {
          movements.push(destinationAlias);
        }
      }

      // Add route name at the end
      if (this.order.route) {
        const routeName =
          this.order.route.short_name || this.order.route.name;
        if (routeName) {
          movements.push(routeName);
        }
      }

      // Create the transfer text if there are multiple movements
      if (movements.length > 1) {
        return movements.join(" -> ");
      }

      return "";
    },
    routeLabel() {
      if (!this.order) return "Ruta completa:";
      
      // Determine label based on whether there's a transfer involved
      const isTransfer =
        this.order.transfer_pickup_origin ||
        this.order.transfer_pickup_destination;
      
      if (!this.order) return "Ruta completa:";
      return isTransfer ? "Ruta completa (Transfer):" : "Ruta completa:";
    },
    canEdit() {
      // User can edit if they are admin or the order owner
      return (
        this.permissions.includes("orders_admin") ||
        (this.order && this.me && this.order.owner === this.me.id)
      );
    },
    canDeposit() {
      // Can deposit if order is pending or doesn't have deposit_date
      return (
        this.order &&
        !this.order.deposit_date &&
        ["pending", "deposited"].includes(this.order.status) &&
        (this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery"))
      );
    },
    canPickup() {
      // Can pickup if order is deposited and has deposit_date but no pickup_date
      return (
        this.order &&
        this.order.deposit_date &&
        !this.order.pickup_date &&
        !this.order.is_collection_order &&
        ["deposited", "delivered"].includes(this.order.status) &&
        (this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery"))
      );
    },
    canStartTransfer() {
      // Can start transfer if order has transfer flag, doesn't have transfer_start_date
      return (
        this.order &&
        this.order.transfer &&
        !this.order.transfer_start_date &&
        (this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery"))
      );
    },
    canEndTransfer() {
      // Can end transfer if order has transfer flag, has transfer_start_date but no transfer_end_date
      return (
        this.order &&
        this.order.transfer &&
        this.order.transfer_start_date &&
        !this.order.transfer_end_date &&
        (this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery"))
      );
    },
    canRemoveDeposit() {
      // Can remove deposit if order has deposit_date and user has admin/delivery permissions
      return (
        this.order &&
        this.order.deposit_date &&
        (this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery"))
      );
    },
    canRemovePickup() {
      // Can remove pickup if order has pickup_date and user has admin/delivery permissions
      return (
        this.order &&
        this.order.pickup_date &&
        (this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery"))
      );
    },
    canRemoveTransferStart() {
      // Can remove transfer start if order has transfer_start_date and user has admin/delivery permissions
      return (
        this.order &&
        this.order.transfer_start_date &&
        (this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery"))
      );
    },
    canRemoveTransferEnd() {
      // Can remove transfer end if order has transfer_end_date and user has admin/delivery permissions
      return (
        this.order &&
        this.order.transfer_end_date &&
        (this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery"))
      );
    },
    canCreateIncidence() {
      // Can create incidence if order exists and user has orders permissions
      return (
        this.order &&
        (this.permissions.includes("orders_admin") ||
         this.permissions.includes("orders_delivery") ||
         this.permissions.includes("orders"))
      );
    },
    openIncidencesCount() {
      if (
        !this.order ||
        !this.order.incidences ||
        !Array.isArray(this.order.incidences)
      ) {
        return 0;
      }
      return this.order.incidences.filter(inc => inc.state !== "closed").length;
    },
    transferStatus() {
      if (!this.order || !this.order.transfer) return "";
      
      if (this.order.transfer_end_date) {
        return "FINALITZADA";
      } else if (this.order.transfer_start_date) {
        return "EN TRANSFER";
      } else {
        return "NO INICIADA";
      }
    },
    transferStatusType() {
      if (!this.order || !this.order.transfer) return "";
      
      if (this.order.transfer_end_date) {
        return "is-success";
      } else if (this.order.transfer_start_date) {
        return "is-warning";
      } else {
        return "is-light";
      }
    },
    actionButtons() {
      return [
        {
          type: "is-primary",
          icon: "pencil",
          label: "Editar",
          action: this.editOrder,
          visible: this.canEdit,
          loading: false,
          size: undefined
        },
        {
          type: "is-info",
          icon: "package-down",
          label: "Depositar",
          action: this.depositOrder,
          visible: this.canDeposit,
          loading: this.isDepositingOrPickingUp,
          size: undefined
        },
        {
          type: "is-danger",
          icon: "undo",
          label: "Desfer dipòsit",
          action: this.removeDeposit,
          visible: this.canRemoveDeposit,
          loading: this.isDepositingOrPickingUp,
          size: "is-small"
        },
        {
          type: "is-success",
          icon: "package-up",
          label: "Recollir",
          action: this.pickupOrder,
          visible: this.canPickup,
          loading: this.isDepositingOrPickingUp,
          size: undefined
        },
        {
          type: "is-danger",
          icon: "undo",
          label: "Desfer recollida",
          action: this.removePickup,
          visible: this.canRemovePickup,
          loading: this.isDepositingOrPickingUp,
          size: "is-small"
        },
        {
          type: "is-info",
          icon: "truck-fast",
          label: "Iniciar transferència",
          action: this.startTransfer,
          visible: this.canStartTransfer,
          loading: this.isDepositingOrPickingUp,
          size: undefined
        },
        {
          type: "is-danger",
          icon: "undo",
          label: "Desfer inici",
          action: this.removeTransferStart,
          visible: this.canRemoveTransferStart,
          loading: this.isDepositingOrPickingUp,
          size: "is-small"
        },
        {
          type: "is-info",
          icon: "truck-check",
          label: "Finalitzar transferència",
          action: this.endTransfer,
          visible: this.canEndTransfer,
          loading: this.isDepositingOrPickingUp,
          size: undefined
        },
        {
          type: "is-danger",
          icon: "undo",
          label: "Desfer fi",
          action: this.removeTransferEnd,
          visible: this.canRemoveTransferEnd,
          loading: this.isDepositingOrPickingUp,
          size: "is-small"
        },
        {
          type: "is-warning",
          icon: "alert-circle",
          label: "Crear Incidència",
          action: this.createIncidence,
          visible: this.canCreateIncidence,
          loading: false,
          size: undefined
        }
      ];
    }
  },
  async created() {
    await this.getPermissions();
    await this.loadOrder();
  },
  watch: {
    id: {
      immediate: false,
      handler(newId, oldId) {
        if (newId !== oldId) {
          this.loadOrder();
        }
      }
    }
  },
  methods: {
    async getPermissions() {
      try {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        this.permissions = me.data.permissions.map(p => p.permission);
      } catch (err) {
        console.error("Error loading permissions:", err);
      }
    },
    async loadOrder() {
      if (!this.id || this.id === 0) {
        return;
      }

      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get(
          `orders/${this.id}`
        );
        this.order = response.data;
      } catch (err) {
        console.error("Error loading order:", err);
        this.$buefy.snackbar.open({
          message: "Error al carregar la comanda",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    editOrder() {
      this.$router.push({
        name: "orders.edit",
        params: { id: this.order.id }
      });
    },
    async depositOrder() {
      try {
        this.isDepositingOrPickingUp = true;

        // Get current user
        const currentUser = await service({ requiresAuth: true }).get(
          "users/me"
        );

        // Prepare update data
        const updateData = {
          deposit_date: new Date().toISOString(),
          deposit_user: currentUser.data.id
        };

        // If status is pending, change it to deposited
        if (this.order.status === "pending") {
          updateData.status = "deposited";
        }

        // Update with deposit information
        await service({ requiresAuth: true }).put(
          `orders/${this.order.id}`,
          updateData
        );

        this.$buefy.snackbar.open({
          message: "Comanda depositada correctament",
          queue: false,
          type: "is-success"
        });

        // Reload order data
        await this.loadOrder();
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al depositar la comanda",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isDepositingOrPickingUp = false;
      }
    },
    async pickupOrder() {
      try {
        this.isDepositingOrPickingUp = true;

        // Get current user
        const currentUser = await service({ requiresAuth: true }).get(
          "users/me"
        );

        // Update with pickup information
        await service({ requiresAuth: true }).put(`orders/${this.order.id}`, {
          pickup_date: new Date().toISOString(),
          pickup_user: currentUser.data.id
        });

        this.$buefy.snackbar.open({
          message: "Comanda recollida correctament",
          queue: false,
          type: "is-success"
        });

        // Reload order data
        await this.loadOrder();
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al recollir la comanda",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isDepositingOrPickingUp = false;
      }
    },
    async startTransfer() {
      try {
        this.isDepositingOrPickingUp = true;

        // Get current user
        const currentUser = await service({ requiresAuth: true }).get(
          "users/me"
        );

        // Update with transfer start information
        await service({ requiresAuth: true }).put(`orders/${this.order.id}`, {
          transfer_start_date: new Date().toISOString(),
          transfer_start_user: currentUser.data.id
        });

        this.$buefy.snackbar.open({
          message: "Transferència iniciada correctament",
          queue: false,
          type: "is-success"
        });

        // Reload order data
        await this.loadOrder();
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al iniciar la transferència",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isDepositingOrPickingUp = false;
      }
    },
    async endTransfer() {
      try {
        this.isDepositingOrPickingUp = true;

        // Get current user
        const currentUser = await service({ requiresAuth: true }).get(
          "users/me"
        );

        // Update with transfer end information
        await service({ requiresAuth: true }).put(`orders/${this.order.id}`, {
          transfer_end_date: new Date().toISOString(),
          transfer_end_user: currentUser.data.id
        });

        this.$buefy.snackbar.open({
          message: "Transferència finalitzada correctament",
          queue: false,
          type: "is-success"
        });

        // Reload order data
        await this.loadOrder();
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al finalitzar la transferència",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isDepositingOrPickingUp = false;
      }
    },
    async removeDeposit() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols eliminar la informació de dipòsit?",
        onConfirm: async () => {
          try {
            this.isDepositingOrPickingUp = true;

            await service({ requiresAuth: true }).put(
              `orders/${this.order.id}`,
              {
                deposit_date: null,
                deposit_user: null
              }
            );

            this.$buefy.snackbar.open({
              message: "Informació de dipòsit eliminada",
              queue: false,
              type: "is-success"
            });

            await this.loadOrder();
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error al eliminar la informació de dipòsit",
              queue: false,
              type: "is-danger"
            });
          } finally {
            this.isDepositingOrPickingUp = false;
          }
        }
      });
    },
    async removePickup() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols eliminar la informació de recollida?",
        onConfirm: async () => {
          try {
            this.isDepositingOrPickingUp = true;

            await service({ requiresAuth: true }).put(
              `orders/${this.order.id}`,
              {
                pickup_date: null,
                pickup_user: null
              }
            );

            this.$buefy.snackbar.open({
              message: "Informació de recollida eliminada",
              queue: false,
              type: "is-success"
            });

            await this.loadOrder();
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error al eliminar la informació de recollida",
              queue: false,
              type: "is-danger"
            });
          } finally {
            this.isDepositingOrPickingUp = false;
          }
        }
      });
    },
    async removeTransferStart() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols eliminar la informació d'inici de transferència?",
        onConfirm: async () => {
          try {
            this.isDepositingOrPickingUp = true;

            await service({ requiresAuth: true }).put(
              `orders/${this.order.id}`,
              {
                transfer_start_date: null,
                transfer_start_user: null
              }
            );

            this.$buefy.snackbar.open({
              message: "Informació d'inici de transferència eliminada",
              queue: false,
              type: "is-success"
            });

            await this.loadOrder();
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error al eliminar la informació d'inici de transferència",
              queue: false,
              type: "is-danger"
            });
          } finally {
            this.isDepositingOrPickingUp = false;
          }
        }
      });
    },
    async removeTransferEnd() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols eliminar la informació de fi de transferència?",
        onConfirm: async () => {
          try {
            this.isDepositingOrPickingUp = true;

            await service({ requiresAuth: true }).put(
              `orders/${this.order.id}`,
              {
                transfer_end_date: null,
                transfer_end_user: null
              }
            );

            this.$buefy.snackbar.open({
              message: "Informació de fi de transferència eliminada",
              queue: false,
              type: "is-success"
            });

            await this.loadOrder();
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error al eliminar la informació de fi de transferència",
              queue: false,
              type: "is-danger"
            });
          } finally {
            this.isDepositingOrPickingUp = false;
          }
        }
      });
    },
    createIncidence() {
      // Open modal to create incidence
      this.isIncidenceModalActive = true;
    },
    async onIncidenceCreated() {
      // Reload order data after incidence is created
      this.isIncidenceModalActive = false;
      await this.loadOrder();
    },
    onIncidenceCancelled() {
      // Close modal
      this.isIncidenceModalActive = false;
    },
    formatDate(date) {
      if (!date) return "";
      return dayjs(date).format("DD/MM/YYYY");
    },
    formatDateTime(dateTime) {
      if (!dateTime) return "";
      return dayjs(dateTime).format("DD/MM/YYYY HH:mm");
    },
    formatTimeSlot(time) {
      if (time == null) return "";
      const hours = Math.floor(time);
      const minutes = Math.round((time - hours) * 60);
      return `${hours
        .toString()
        .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    },
    getIncidenceState(state) {
      const states = {
        open: "Oberta",
        wip: "En procés",
        closed: "Tancada"
      };
      return states[state] || state;
    },
    getStatusColor(status) {
      const colors = {
        pending: "is-warning",
        deposited: "is-info",
        delivered: "is-success",
        cancelled: "is-danger",
        collected: "is-success"
      };
      return colors[status] || "";
    },
    getStatusName(status) {
      const names = {
        pending: "Pendent",
        deposited: "Depositada",
        delivered: "Entregada",
        cancelled: "Cancel·lada",
        collected: "Recollida"
      };
      return names[status] || status;
    },
    getContactTradeName(row) {
      return (
        (row.contact && row.contact.trade_name) || row.contact_trade_name || "-"
      );
    }
  }
};
</script>

<style scoped>
.info-section {
  padding: 0;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #363636;
  margin-bottom: 1rem;
}

.info-field {
  display: flex;
  padding: 0.5rem 0;
  align-items: flex-start;
}

.field-label {
  font-weight: 600;
  min-width: 200px;
  color: #4a4a4a;
  flex-shrink: 0;
}

.field-value {
  color: #363636;
  flex: 1;
}

.incidence-item {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

hr {
  margin: 1.5rem 0;
  background-color: #dbdbdb;
}

@media screen and (max-width: 768px) {
  .info-field {
    flex-direction: column;
  }

  .field-label {
    min-width: auto;
    margin-bottom: 0.25rem;
  }
}

@media screen and (max-width: 768px) {
  .section-adapted {
    padding: 1rem 0.75rem;
  }
}
</style>
