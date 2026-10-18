<template>
  <!-- Redesign A (mockup A-Log-Comanda-vista): where the order is on its way,
       its tracking with the next step as the main action, and its data. -->
  <div class="order-view">
    <modal-box-incidence
      :is-active="isIncidenceModalActive"
      :order-id="order ? order.id : 0"
      @confirm="onIncidenceCreated"
      @cancel="onIncidenceCancelled"
    ></modal-box-incidence>

    <title-bar :title-stack="titleStack" :subtitle="headSubtitle">
      <template #badges>
        <template v-if="order">
          <span class="tag" :class="statusTag(order.status)">{{ statusLabel(order.status) }}</span>
          <span v-if="order.refrigerated" class="tag is-info is-light">Refrigerada</span>
          <span v-if="order.fragile" class="tag is-warning is-light">Fràgil</span>
          <span v-if="order.is_collection_order" class="tag">Comanda de recollida</span>
          <span v-if="order.last_mile" class="tag is-link is-light">Última milla</span>
        </template>
      </template>
      <template v-if="order">
        <b-button v-if="canCreateIncidence" icon-left="alert-outline" @click="createIncidence">Crea incidència</b-button>
        <b-button v-if="!order.is_collection_order" icon-left="printer" :loading="printing" @click="printOrder">Albarà</b-button>
        <b-button v-if="canEdit" icon-left="pencil-outline" @click="editOrder">Edita</b-button>
        <b-button
          v-if="nextAction"
          type="is-primary"
          :icon-left="nextAction.icon"
          :loading="isDepositingOrPickingUp"
          @click="nextAction.action"
        >{{ nextAction.label }}</b-button>
      </template>
    </title-bar>

    <section class="section is-main-section">
      <b-loading :is-full-page="false" :model-value="isLoading" />

      <div v-if="!isLoading && !order" class="notification is-warning">No s'ha trobat la comanda</div>

      <template v-if="order">
        <div v-if="order.status === 'cancelled'" class="notification is-danger is-light">
          <b>Comanda anul·lada.</b> No es repartirà ni es facturarà.
        </div>

        <!-- the way of the order: pickup, transfer, delivery route, delivery point -->
        <section v-if="!order.is_collection_order" class="a-box journey">
          <header class="box-head">
            <h2>Recorregut</h2>
            <span class="box-hint">Pas actual: {{ journey[currentStep] ? journey[currentStep].current : "entregada" }}</span>
          </header>
          <ol class="journey-steps">
            <li
              v-for="(step, i) in journey"
              :key="step.key"
              :class="{ 'is-done': i < currentStep, 'is-current': i === currentStep, 'is-skipped': step.skipped }"
            >
              <span class="journey-bar"></span>
              <small class="journey-label">{{ i + 1 }} · {{ step.label }}</small>
              <b>{{ step.title }}</b>
              <span v-for="(line, j) in step.lines" :key="j" class="journey-line">
                <router-link v-if="line.to" :to="line.to">{{ line.text }}</router-link>
                <template v-else>{{ line.text }}</template>
              </span>
            </li>
          </ol>
        </section>

        <div class="order-columns">
          <div class="order-main">
            <section class="a-box">
              <header class="box-head">
                <h2>Seguiment</h2>
                <span class="box-hint">Moviments registrats i pendents</span>
              </header>
              <ol class="timeline">
                <li v-for="step in timeline" :key="step.key" :class="{ 'is-done': step.done }">
                  <span class="timeline-dot" aria-hidden="true"><b-icon v-if="step.done" icon="check" size="is-small" /></span>
                  <div class="timeline-body">
                    <b>{{ step.title }}</b>
                    <span class="timeline-detail">{{ step.detail }}</span>
                  </div>
                  <div class="timeline-actions">
                    <template v-for="a in step.actions.filter(a => a.visible)" :key="a.label">
                      <b-button
                        v-if="a.kind === 'do'"
                        size="is-small"
                        :icon-left="a.icon"
                        :loading="isDepositingOrPickingUp"
                        @click="a.action"
                      >{{ a.label }}</b-button>
                      <button v-else type="button" class="undo-link" :disabled="isDepositingOrPickingUp" @click="a.action">
                        <b-icon icon="undo-variant" size="is-small" />{{ a.label }}
                      </button>
                    </template>
                  </div>
                </li>
              </ol>
            </section>

            <section class="a-box">
              <header class="box-head">
                <h2>
                  Incidències
                  <span v-if="openIncidencesCount" class="tag is-warning">{{ openIncidencesCount }} {{ openIncidencesCount === 1 ? "oberta" : "obertes" }}</span>
                </h2>
                <b-button v-if="canCreateIncidence" size="is-small" icon-left="plus" @click="createIncidence">Crea incidència</b-button>
              </header>
              <p v-if="!order.incidences || !order.incidences.length" class="box-empty">Cap incidència en aquesta comanda.</p>
              <ul v-else class="incidence-list">
                <li v-for="(incidence, index) in order.incidences" :key="index">
                  <div class="incidence-head">
                    <span class="tag" :class="incidence.state === 'closed' ? 'is-success is-light' : incidence.state === 'open' ? 'is-danger is-light' : 'is-warning is-light'">{{ getIncidenceState(incidence.state) }}</span>
                    <small>{{ formatDateTime(incidence.created_at || incidence.createdAt) }}</small>
                  </div>
                  <p>{{ incidence.description }}</p>
                </li>
              </ul>
            </section>

            <section v-if="order.is_collection_order && order.collection_orders && order.collection_orders.length" class="a-box">
              <header class="box-head">
                <h2>Comandes a recollir</h2>
                <span class="box-hint">{{ order.collection_orders.length }} {{ order.collection_orders.length === 1 ? "comanda" : "comandes" }}</span>
              </header>
              <div class="table-container">
                <table class="table is-fullwidth">
                  <thead>
                    <tr>
                      <th>Comanda</th>
                      <th>Entrega</th>
                      <th class="has-text-right">Caixes</th>
                      <th class="has-text-right">Kg</th>
                      <th>Dipòsit</th>
                      <th>Recollida</th>
                      <th>Estat</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in order.collection_orders" :key="row.id">
                      <td><router-link :to="`/order/view/${row.id}`"><b>#{{ String(row.id).padStart(4, "0") }}</b></router-link></td>
                      <td>{{ getContactTradeName(row) }}</td>
                      <td class="has-text-right">{{ row.units || 0 }}</td>
                      <td class="has-text-right">{{ row.kilograms || 0 }}</td>
                      <td><span class="tag" :class="row.deposit_date ? 'is-success is-light' : ''">{{ row.deposit_date ? "Sí" : "No" }}</span></td>
                      <td><span class="tag" :class="row.pickup_date ? 'is-success is-light' : ''">{{ row.pickup_date ? "Sí" : "No" }}</span></td>
                      <td><span class="tag" :class="statusTag(row.status)">{{ statusLabel(row.status) }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside class="order-side">
            <section class="a-box">
              <header class="box-head"><h2>{{ order.is_collection_order ? "A on i quin dia s'ha de recollir?" : "A on va i quin dia?" }}</h2></header>
              <dl class="facts">
                <dt>{{ isPickupPoint ? "Punt de consum" : "Punt d'entrega" }}</dt><dd>{{ contactName || "—" }}</dd>
                <template v-if="contactAddress"><dt>Adreça</dt><dd>{{ contactAddress }}</dd></template>
                <template v-if="contactPhone"><dt>Telèfon</dt><dd>{{ contactPhone }}</dd></template>
                <template v-if="contactTimeSlots"><dt>Horari</dt><dd>{{ contactTimeSlots }}</dd></template>
                <dt>Ruta</dt><dd>{{ routeName || "—" }}</dd>
                <template v-if="order.estimated_delivery_date"><dt>Data prevista</dt><dd>{{ formatDate(order.estimated_delivery_date) }}</dd></template>
              </dl>
            </section>

            <section class="a-box">
              <header class="box-head"><h2>{{ order.is_collection_order ? "Què hem de recollir?" : "Què hem de portar?" }}</h2></header>
              <dl class="facts">
                <dt>Tipus de servei</dt><dd>{{ deliveryTypeName || "—" }}</dd>
                <dt>Caixes</dt><dd>{{ order.units || 0 }}</dd>
                <dt>Kilograms</dt><dd>{{ formatNumber(order.kilograms || 0, 2) }} kg</dd>
                <dt>Fràgil</dt><dd>{{ order.fragile ? "Sí" : "No" }}</dd>
              </dl>
              <div v-if="isPickupPoint && order.lines && order.lines.length" class="table-container lines-table">
                <table class="table is-fullwidth">
                  <thead><tr><th class="has-text-right">Caixes</th><th class="has-text-right">Kg</th><th>Nom</th><th>NIF</th></tr></thead>
                  <tbody>
                    <tr v-for="(line, i) in order.lines" :key="i">
                      <td class="has-text-right">{{ line.units || 0 }}</td>
                      <td class="has-text-right">{{ line.kilograms || 0 }}</td>
                      <td>{{ line.name || "—" }}</td>
                      <td>{{ line.nif || "—" }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section v-if="!order.is_collection_order" class="a-box">
              <header class="box-head"><h2>On ho deixaràs?</h2></header>
              <dl class="facts">
                <dt>Recollida</dt><dd>{{ pickupName || "—" }}</dd>
                <template v-if="collectionPointName"><dt>Punt en finca</dt><dd>{{ collectionPointName }}</dd></template>
                <template v-if="collectionPointAddress"><dt>Adreça</dt><dd>{{ collectionPointAddress }}</dd></template>
                <template v-if="collectionPointPhone"><dt>Telèfon</dt><dd>{{ collectionPointPhone }}</dd></template>
                <template v-if="collectionPointTimeSlots"><dt>Horari</dt><dd>{{ collectionPointTimeSlots }}</dd></template>
              </dl>
              <p v-if="order.comments" class="important"><b>Informació important:</b> {{ order.comments }}</p>
            </section>

            <section v-if="!order.is_collection_order" class="a-box">
              <header class="box-head"><h2>Preu</h2></header>
              <dl class="facts">
                <template v-if="order.route_rate && order.route_rate.name"><dt>Tarifa</dt><dd>{{ order.route_rate.name }}</dd></template>
                <dt>Preu</dt><dd>{{ money(order.price) }}</dd>
                <template v-if="Number(order.multidelivery_discount)"><dt>Multientrega</dt><dd>−{{ order.multidelivery_discount }} %</dd></template>
                <template v-if="Number(order.contact_pickup_discount)"><dt>Descompte recollida</dt><dd>−{{ order.contact_pickup_discount }} %</dd></template>
                <template v-if="Number(order.volume_discount)"><dt>Descompte volum</dt><dd>−{{ money(order.volume_discount) }}</dd></template>
                <dt>Amb descompte</dt><dd class="is-total">{{ order.finalPrice !== undefined && order.finalPrice !== null ? money(order.finalPrice) : money(order.price) }}</dd>
              </dl>
            </section>

            <section class="a-box">
              <header class="box-head"><h2>Altres dades</h2></header>
              <dl class="facts">
                <dt>Sòcia</dt><dd>{{ ownerName || "—" }}</dd>
                <dt>Data comanda</dt><dd>{{ formatDate(order.route_date) }}</dd>
                <template v-if="order.provider_order_number"><dt>Referència</dt><dd>{{ order.provider_order_number }}</dd></template>
                <template v-if="transferPickupText"><dt>{{ routeLabel.replace(":", "") }}</dt><dd>{{ transferPickupText }}</dd></template>
                <template v-if="order.collection_order">
                  <dt>Comanda de recollida</dt>
                  <dd><router-link :to="`/order/view/${collectionOrderId}`">#{{ String(collectionOrderId).padStart(4, "0") }}-R</router-link></dd>
                </template>
              </dl>
            </section>
          </aside>
        </div>
      </template>
    </section>
  </div>
</template>

<script>
import moment from "moment";
import TitleBar from "@/components/TitleBar.vue";
import CardComponent from "@/components/CardComponent.vue";
import ModalBoxIncidence from "@/components/ModalBoxIncidence.vue";
import service from "@/service/index";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import getConfig from "@/config";
import { formatMoney, formatNumber } from "@/helpers/format-number";
import { orderStatusLabel, orderStatusTag, canDeposit as canDepositOrder } from "@/domain/orderStatus";

const relId = value => (value && typeof value === "object" ? value.id : value);
const myId = () => {
  try {
    return (JSON.parse(localStorage.getItem("user") || "{}") || {}).id || null;
  } catch (e) {
    return null;
  }
};

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
      isIncidenceModalActive: false,
      printing: false
    };
  },
  computed: {
    ...mapState(useMainStore, ["me"]),
    titleStack() {
      return ["Comandes", this.formCardTitle];
    },
    isStaff() {
      return this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery");
    },
    headSubtitle() {
      if (!this.order) return "";
      const parts = [this.ownerName];
      if (this.order.estimated_delivery_date) {
        const day = moment(this.order.estimated_delivery_date).locale("ca").format("dddd DD/MM/YYYY");
        parts.push(`${this.order.is_collection_order ? "recollida prevista" : "entrega prevista"} ${day}`);
      }
      const point = this.contactName ? `a ${this.contactName}${this.order.contact_city ? ` (${this.order.contact_city})` : ""}` : "";
      return parts.join(" · ") + (point ? ` ${point}` : "");
    },
    collectionOrderId() {
      return relId(this.order && this.order.collection_order);
    },
    isFarmPickup() {
      return !!(this.order && this.order.pickup && this.order.pickup.pickup);
    },
    // the way of the order, for the "Recorregut" card
    journey() {
      const o = this.order;
      if (!o) return [];
      const pickup = this.isFarmPickup
        ? {
            title: this.collectionPointName || "Recollida en finca",
            lines: [
              { text: [this.order.collection_point && this.order.collection_point.city, o.collection_pickup_route && o.collection_pickup_route.name, o.collection_pickup_date && this.shortDay(o.collection_pickup_date)].filter(Boolean).join(" · ") },
              this.collectionOrderId ? { text: `Comanda de recollida #${this.collectionOrderId}`, to: `/order/view/${this.collectionOrderId}` } : null
            ].filter(l => l && l.text)
          }
        : { title: this.pickupName || "—", lines: [{ text: o.deposit_date ? `dipositada ${this.formatDateTime(o.deposit_date)}` : "la sòcia hi deixa la comanda" }] };
      const transfer = o.transfer
        ? {
            title: (o.transfer_route && o.transfer_route.name) || "Transferència",
            lines: [
              { text: [o.transfer_pickup_origin && `des de ${o.transfer_pickup_origin.alias || o.transfer_pickup_origin.name}`, o.transfer_route_date && this.shortDay(o.transfer_route_date)].filter(Boolean).join(" · ") },
              { text: o.transfer_pickup_destination ? `cap a ${o.transfer_pickup_destination.alias || o.transfer_pickup_destination.name}` : "Destinació sense definir" }
            ].filter(l => l.text)
          }
        : { title: "Sense transferència", lines: [], skipped: true };
      return [
        { key: "pickup", label: this.isFarmPickup ? "Recollida en finca" : "Dipòsit", current: this.isFarmPickup ? "recollida a la finca" : "dipòsit al magatzem", ...pickup },
        { key: "transfer", label: "Transferència", current: "transferència", ...transfer },
        { key: "route", label: "Repartiment", current: "repartiment", title: this.routeName || "—", lines: [{ text: o.estimated_delivery_date ? this.shortDay(o.estimated_delivery_date) : "" }].filter(l => l.text) },
        { key: "delivery", label: "Entrega", current: "entrega", title: this.contactName || "—", lines: [{ text: [o.contact_city, this.contactTimeSlots].filter(Boolean).join(" · ") }].filter(l => l.text) }
      ];
    },
    currentStep() {
      const o = this.order;
      if (!o) return 0;
      if (["delivered", "invoiced"].includes(o.status) || o.delivery_date) return 4;
      const pickedUp = this.isFarmPickup ? !!o.pickup_date : !!o.deposit_date;
      if (!pickedUp) return 0;
      if (o.transfer && !o.transfer_end_date) return 1;
      return 2;
    },
    // the tracking, done and pending moves with their actions
    timeline() {
      const o = this.order;
      if (!o) return [];
      const who = user => (user && typeof user === "object" ? ` · ${user.fullname || user.username}` : "");
      const steps = [
        { key: "created", title: "Comanda creada", done: true, detail: `${this.formatDateTime(o.createdAt || o.created_at)} · ${this.ownerName}`, actions: [] },
        {
          key: "deposit",
          title: "Dipositada",
          done: !!o.deposit_date,
          detail: o.deposit_date ? `${this.formatDateTime(o.deposit_date)}${who(o.deposit_user)}` : `Al punt de recollida ${this.pickupName || ""}`.trim(),
          actions: [
            { kind: "do", label: "Dipositar", icon: "package-down", action: this.depositOrder, visible: this.canDeposit },
            { kind: "undo", label: "Desfer dipòsit", action: this.removeDeposit, visible: this.canRemoveDeposit }
          ]
        }
      ];
      if (this.isFarmPickup || o.pickup_date || o.is_collection_order) {
        steps.push({
          key: "pickup",
          title: "Recollida a la finca",
          done: !!o.pickup_date,
          detail: o.pickup_date
            ? `${this.formatDateTime(o.pickup_date)}${who(o.pickup_user)}`
            : o.collection_pickup_date ? `Prevista ${this.shortDay(o.collection_pickup_date)}${o.collection_pickup_route ? ` · ${o.collection_pickup_route.name}` : ""}` : "Pendent",
          actions: [
            { kind: "do", label: "Recollir", icon: "package-up", action: this.pickupOrder, visible: this.canPickup },
            { kind: "undo", label: "Desfer recollida", action: this.removePickup, visible: this.canRemovePickup }
          ]
        });
      }
      if (o.transfer) {
        steps.push({
          key: "transfer-start",
          title: "Inici de transferència",
          done: !!o.transfer_start_date,
          detail: o.transfer_start_date
            ? `${this.formatDateTime(o.transfer_start_date)}${who(o.transfer_start_user)}`
            : o.transfer_route_date ? `Prevista ${this.shortDay(o.transfer_route_date)}${o.transfer_route ? ` · ${o.transfer_route.name}` : ""}` : "Pendent",
          actions: [
            { kind: "do", label: "Iniciar transferència", icon: "truck-fast", action: this.startTransfer, visible: this.canStartTransfer },
            { kind: "undo", label: "Desfer inici", action: this.removeTransferStart, visible: this.canRemoveTransferStart }
          ]
        });
        steps.push({
          key: "transfer-end",
          title: "Fi de transferència",
          done: !!o.transfer_end_date,
          detail: o.transfer_end_date ? `${this.formatDateTime(o.transfer_end_date)}${who(o.transfer_end_user)}` : o.transfer_start_date ? "En camí" : "Quan s'hagi iniciat",
          actions: [
            { kind: "do", label: "Finalitzar transferència", icon: "truck-check", action: this.endTransfer, visible: this.canEndTransfer },
            { kind: "undo", label: "Desfer fi", action: this.removeTransferEnd, visible: this.canRemoveTransferEnd }
          ]
        });
      }
      steps.push({
        key: "delivered",
        title: "Lliurada",
        done: !!o.delivery_date || ["delivered", "invoiced"].includes(o.status),
        detail: o.delivery_date ? this.formatDate(o.delivery_date) : o.estimated_delivery_date ? `Prevista ${this.shortDay(o.estimated_delivery_date)} · ${this.routeName}` : "Pendent",
        actions: []
      });
      if (!o.is_collection_order) {
        steps.push({
          key: "invoiced",
          title: "Facturada",
          done: o.status === "invoiced" || !!o.emitted_invoice,
          detail: o.emitted_invoice_datetime ? this.formatDateTime(o.emitted_invoice_datetime) : o.status === "invoiced" ? "Facturada a la sòcia" : "Quan es lliuri",
          actions: []
        });
      }
      return steps;
    },
    // the main action of the head: the next move of the order
    nextAction() {
      if (!this.order || this.order.status === "cancelled") return null;
      if (this.isFarmPickup && this.canPickup && !this.order.pickup_date) return { label: "Recollir", icon: "package-up", action: this.pickupOrder };
      if (!this.isFarmPickup && this.canDeposit) return { label: "Dipositar", icon: "package-down", action: this.depositOrder };
      if (this.canStartTransfer) return { label: "Inicia la transferència", icon: "swap-horizontal", action: this.startTransfer };
      if (this.canEndTransfer) return { label: "Finalitza la transferència", icon: "truck-check", action: this.endTransfer };
      return null;
    },
    formCardTitle() {
      if (this.order && this.order.id) {
        const collectionSuffix = this.order.is_collection_order ? "-R" : "";
        const pickupLabel = this.order.pickup_point ? " (Punt Recollida)" : "";
        return `Comanda #${this.order.id
          .toString()
          .padStart(4, "0")}${collectionSuffix}${pickupLabel}`;
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
      const me = (this.me && this.me.id) || myId();
      return (
        this.permissions.includes("orders_admin") ||
        !!(this.order && me && relId(this.order.owner) === me)
      );
    },
    canDeposit() {
      // Can deposit if order is pending or doesn't have deposit_date
      return (
        this.order &&
        !this.order.deposit_date &&
        ["pending"].includes(this.order.status) &&
        (this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery"))
      );
    },
    canPickup() {
      // Can pickup if order has no pickup_date
      return (
        this.order &&
        !this.order.pickup_date &&
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
          label: "Dipositar",
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
    formatNumber,
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

        if (this.order.is_collection_order && this.order.collection_orders && this.order.collection_orders.length > 0) {
          // For collection orders, deposit all inner orders first
          for (const innerOrder of this.order.collection_orders) {
            // a cancelled or delivered one isn't deposited (issues/149)
            if (!canDepositOrder(innerOrder) || innerOrder.deposit_date) continue;
            await service({ requiresAuth: true }).put(`orders/${innerOrder.id}`, updateData);
          }
          
          // Then deposit the collection order itself
          await service({ requiresAuth: true }).put(`orders/${this.order.id}`, updateData);

          this.$buefy.snackbar.open({
            message: `Comanda de recollida i ${this.order.collection_orders.length} comandes associades dipositades correctament`,
            queue: false,
            type: "is-success"
          });
        } else {
          // Normal order - single update
          await service({ requiresAuth: true }).put(`orders/${this.order.id}`, updateData);

          this.$buefy.snackbar.open({
            message: "Comanda dipositada correctament",
            queue: false,
            type: "is-success"
          });
        }

        // Reload order data
        await this.loadOrder();
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al dipositar la comanda",
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

        const pickupData = {
          pickup_date: new Date().toISOString(),
          pickup_user: currentUser.data.id
        };

        if (this.order.is_collection_order && this.order.collection_orders && this.order.collection_orders.length > 0) {
          // For collection orders, pick up all inner orders first
          for (const innerOrder of this.order.collection_orders) {
            await service({ requiresAuth: true }).put(`orders/${innerOrder.id}`, pickupData);
          }
          
          // Then pick up the collection order itself
          await service({ requiresAuth: true }).put(`orders/${this.order.id}`, pickupData);

          this.$buefy.snackbar.open({
            message: `Comanda de recollida i ${this.order.collection_orders.length} comandes associades recollides correctament`,
            queue: false,
            type: "is-success"
          });
        } else {
          // Normal order - single update
          await service({ requiresAuth: true }).put(`orders/${this.order.id}`, pickupData);

          this.$buefy.snackbar.open({
            message: "Comanda recollida correctament",
            queue: false,
            type: "is-success"
          });
        }

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

            const clearData = {
              deposit_date: null,
              deposit_user: null
            };

            if (this.order.is_collection_order && this.order.collection_orders && this.order.collection_orders.length > 0) {
              // For collection orders, clear all inner orders first
              for (const innerOrder of this.order.collection_orders) {
                await service({ requiresAuth: true }).put(`orders/${innerOrder.id}`, clearData);
              }
              
              // Then clear the collection order itself
              await service({ requiresAuth: true }).put(`orders/${this.order.id}`, clearData);

              this.$buefy.snackbar.open({
                message: `Informació de dipòsit de comanda de recollida i ${this.order.collection_orders.length} comandes associades eliminada`,
                queue: false,
                type: "is-success"
              });
            } else {
              // Normal order - single update
              await service({ requiresAuth: true }).put(`orders/${this.order.id}`, clearData);

              this.$buefy.snackbar.open({
                message: "Informació de dipòsit eliminada",
                queue: false,
                type: "is-success"
              });
            }

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

            const clearData = {
              pickup_date: null,
              pickup_user: null
            };

            if (this.order.is_collection_order && this.order.collection_orders && this.order.collection_orders.length > 0) {
              // For collection orders, clear all inner orders first
              for (const innerOrder of this.order.collection_orders) {
                await service({ requiresAuth: true }).put(`orders/${innerOrder.id}`, clearData);
              }
              
              // Then clear the collection order itself
              await service({ requiresAuth: true }).put(`orders/${this.order.id}`, clearData);

              this.$buefy.snackbar.open({
                message: `Informació de recollida de comanda de recollida i ${this.order.collection_orders.length} comandes associades eliminada`,
                queue: false,
                type: "is-success"
              });
            } else {
              // Normal order - single update
              await service({ requiresAuth: true }).put(`orders/${this.order.id}`, clearData);

              this.$buefy.snackbar.open({
                message: "Informació de recollida eliminada",
                queue: false,
                type: "is-success"
              });
            }

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
      return moment(date).format("DD/MM/YYYY");
    },
    formatDateTime(dateTime) {
      if (!dateTime) return "";
      return moment(dateTime).format("DD/MM/YYYY HH:mm");
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
    statusLabel: orderStatusLabel,
    shortDay(date) {
      return date ? moment(date).locale("ca").format("dd DD/MM/YYYY") : "";
    },
    money(value) {
      return formatMoney(Number(value) || 0);
    },
    statusTag: orderStatusTag,
    async printOrder() {
      this.printing = true;
      try {
        const pdf = (await service({ requiresAuth: true }).post("/orders/pdf", { orders: [this.order.id] })).data;
        window.open(getConfig().VUE_APP_API_URL + pdf.urls);
      } catch (error) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut generar l'albarà", type: "is-danger", queue: false });
      } finally {
        this.printing = false;
      }
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
.order-view :deep(.title-bar .actions) {
  flex-wrap: wrap;
}
.order-view .a-box {
  margin-bottom: 1rem;
}
.journey-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  list-style: none;
}
.journey-steps li {
  display: flex;
  flex-direction: column;
  gap: .125rem;
  font-size: .875rem;
  color: var(--a-fg-2);
}
.journey-bar {
  height: 4px;
  margin-bottom: .75rem;
  border-radius: 2px;
  background: var(--a-line);
}
.journey-steps li.is-done .journey-bar {
  background: var(--a-accent);
}
.journey-steps li.is-current .journey-bar {
  background: linear-gradient(90deg, var(--a-accent) 45%, var(--a-line) 45%);
}
.journey-label {
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--a-muted);
}
.journey-steps li b {
  color: var(--a-fg);
}
.journey-steps li.is-skipped b {
  color: var(--a-muted);
  font-weight: 600;
}
.order-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 27rem;
  gap: 1rem;
  align-items: start;
}
.timeline {
  position: relative;
  margin: 0;
  list-style: none;
}
.timeline li {
  position: relative;
  display: grid;
  grid-template-columns: 1.75rem minmax(0, 1fr) auto;
  gap: .75rem;
  align-items: start;
  padding-bottom: 1.125rem;
}
.timeline li:not(:last-child)::before {
  content: "";
  position: absolute;
  left: calc(.875rem - 1px);
  top: 1.75rem;
  bottom: 0;
  width: 2px;
  background: var(--a-line);
}
.timeline-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 2px solid var(--a-input);
  border-radius: 50%;
  background: var(--a-surface);
  color: var(--a-on-accent);
}
.timeline li.is-done .timeline-dot {
  border-color: var(--a-accent);
  background: var(--a-accent);
}
.timeline-body b {
  display: block;
  color: var(--a-fg);
}
.timeline li:not(.is-done) .timeline-body b {
  font-weight: 600;
  color: var(--a-fg-2);
}
.timeline-detail {
  font-size: .8125rem;
  color: var(--a-muted);
}
.timeline-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
}
.undo-link {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: .8125rem;
  font-weight: 700;
  color: var(--a-fg-2);
  cursor: pointer;
}
.undo-link:hover {
  color: var(--a-neg);
}
.incidence-list li + li {
  margin-top: .75rem;
  padding-top: .75rem;
  border-top: 1px solid var(--a-line-soft);
}
.incidence-head {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .25rem;
  color: var(--a-muted);
}
.lines-table {
  margin-top: 1rem;
}
.important {
  margin-top: 1rem;
  padding: .75rem;
  border-radius: 8px;
  background: var(--a-warn-bg);
  color: var(--a-warn-fg);
  font-size: .875rem;
}
@media screen and (max-width: 1215px) {
  .order-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media screen and (max-width: 768px) {
  .journey-steps {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
