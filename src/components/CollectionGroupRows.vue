<template>
  <!-- The orders a collection order (XXXXX-R) gathers, under its row in
       Comandes (issues/429). Each shows its pickup and its delivery, editable
       with the pencil; moving its pickup takes it out of this -R into the -R of
       its new day and route (a new one if there is none). -->
  <div class="collection-group" data-test="collection-group">
    <header class="collection-group-head">
      <b-icon icon="package-variant-closed" size="is-small" />
      <b>Comanda de recollida agrupada</b>
      <span>· {{ isLoading ? "carregant…" : `${rows.length} ${rows.length === 1 ? "comanda" : "comandes"}` }}</span>
      <small>Per moure-les totes alhora, edita la data o la ruta de la {{ code }}.</small>
    </header>
    <div class="table-container">
      <table class="table is-fullwidth is-narrow grouped-table">
        <thead>
          <tr>
            <th>Comanda</th>
            <th>Punt d'entrega</th>
            <th>Recollida prevista</th>
            <th>Entrega prevista</th>
            <th>Estat</th>
            <th class="col-actions"><span class="is-sr-only">Accions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in rows" :key="o.id" :class="{ 'is-editing': editingId === o.id }" data-test="grouped-order">
            <td class="nowrap">
              <a :href="orderHref(o.id)" target="_blank" rel="noopener" class="order-num" title="Obre la fitxa en una pestanya nova">{{ String(o.id).padStart(4, "0") }}</a>
            </td>
            <td>{{ (o.contact && (o.contact.trade_name || o.contact.name)) || o.contact_trade_name || "—" }}</td>
            <template v-if="editingId === o.id">
              <td>
                <div class="edit-pair">
                  <b-datepicker v-model="form.collection_pickup_date" size="is-small" locale="ca-ES" :first-day-of-week="1" :show-week-number="false" placeholder="Data" aria-label="Data de recollida" data-test="edit-pickup-date" />
                  <b-select v-model="form.collection_pickup_route" size="is-small" aria-label="Ruta de recollida" data-test="edit-pickup-route">
                    <option v-for="r in routes" :key="r.id" :value="r.id">{{ r.name }}</option>
                  </b-select>
                </div>
              </td>
              <td>
                <div class="edit-pair">
                  <b-datepicker v-model="form.estimated_delivery_date" size="is-small" locale="ca-ES" :first-day-of-week="1" :show-week-number="false" placeholder="Data" aria-label="Data d'entrega" data-test="edit-delivery-date" />
                  <b-select v-model="form.route" size="is-small" aria-label="Ruta d'entrega" data-test="edit-delivery-route">
                    <option v-for="r in routes" :key="r.id" :value="r.id">{{ r.name }}</option>
                  </b-select>
                </div>
              </td>
            </template>
            <template v-else>
              <td>
                <b>{{ formatDay(o.collection_pickup_date) }}</b>
                <small>{{ routeName(o.collection_pickup_route) }}</small>
              </td>
              <td>
                <b>{{ formatDay(o.estimated_delivery_date) }}</b>
                <small>{{ routeName(o.route) }}</small>
              </td>
            </template>
            <td><span class="tag" :class="statusTag(o.status)">{{ statusLabel(o.status) }}</span></td>
            <td class="col-actions">
              <template v-if="editingId === o.id">
                <b-button size="is-small" type="is-primary" icon-left="content-save" title="Desa" aria-label="Desa" :loading="isSaving" data-test="grouped-save" @click="save(o)" />
                <b-button size="is-small" icon-left="close" title="Cancel·la" aria-label="Cancel·la" @click="cancel" />
              </template>
              <button v-else-if="canEdit" type="button" class="row-action" title="Edita la recollida i l'entrega" aria-label="Edita la recollida i l'entrega" :disabled="!!editingId" data-test="grouped-edit" @click="edit(o)">
                <b-icon icon="pencil-outline" size="is-small" />
              </button>
            </td>
          </tr>
          <tr v-if="!isLoading && !rows.length">
            <td colspan="6" class="box-empty">Aquesta recollida no té cap comanda oberta.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <modal-pickup-conflict :active="conflict.active" :message="conflict.message" :orders="conflict.orders" @close="conflict.active = false" />
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import ModalPickupConflict from "@/components/ModalPickupConflict.vue";
import { orderStatusLabel, orderStatusTag } from "@/domain/orderStatus";
import { populateParams } from "@/domain/orderPopulate";
import {
  GROUPED_ORDER_RELATIONS, conflictOrders, refusalMessage, groupedEditForm, groupedEditPayload, pickupAfterDelivery, movesPickup
} from "@/domain/collectionGroup";

export default {
  name: "CollectionGroupRows",
  components: { ModalPickupConflict },
  props: {
    collectionOrder: { type: Object, required: true },
    routes: { type: Array, default: () => [] },
    canEdit: { type: Boolean, default: false }
  },
  emits: ["changed"],
  data() {
    return {
      isLoading: true,
      isSaving: false,
      rows: [],
      editingId: null,
      form: {},
      conflict: { active: false, message: "", orders: [] }
    };
  },
  computed: {
    code() {
      return `${String(this.collectionOrder.id).padStart(4, "0")}-R`;
    }
  },
  mounted() {
    this.load();
  },
  methods: {
    statusLabel: orderStatusLabel,
    statusTag: orderStatusTag,
    async load() {
      this.isLoading = true;
      try {
        const { data } = await service({ requiresAuth: true }).get("orders", {
          params: { collection_order: this.collectionOrder.id, _limit: -1, _sort: "id:ASC", ...populateParams(GROUPED_ORDER_RELATIONS) }
        });
        this.rows = (Array.isArray(data) ? data : []).filter(o => o.status !== "cancelled");
      } catch (e) {
        this.rows = [];
      } finally {
        this.isLoading = false;
      }
    },
    edit(order) {
      this.editingId = order.id;
      this.form = groupedEditForm(order);
    },
    cancel() {
      this.editingId = null;
      this.form = {};
    },
    showConflict(message, orders) {
      this.conflict = { active: true, message, orders };
    },
    async save(order) {
      const payload = groupedEditPayload(order, this.form);
      if (!Object.keys(payload).length) return this.cancel();
      if (pickupAfterDelivery(this.form)) {
        return this.showConflict(
          `La recollida (${this.formatDay(this.form.collection_pickup_date)}) seria després de l'entrega (${this.formatDay(this.form.estimated_delivery_date)}).`,
          [order.id]
        );
      }
      this.isSaving = true;
      try {
        await service({ requiresAuth: true }).put(`orders/${order.id}`, payload);
        this.$buefy.snackbar.open({
          message: movesPickup(payload)
            ? `La comanda ${String(order.id).padStart(4, "0")} té una recollida nova i surt de la ${this.code}.`
            : "Comanda actualitzada",
          type: "is-success",
          queue: false
        });
        this.cancel();
        await this.load();
        this.$emit("changed");
      } catch (error) {
        const orders = conflictOrders(error);
        const message = refusalMessage(error, "Error actualitzant la comanda");
        if (orders.length) this.showConflict(message, orders);
        else this.$buefy.snackbar.open({ message, type: "is-danger", queue: false });
      } finally {
        this.isSaving = false;
      }
    },
    orderHref(id) {
      return this.$router ? this.$router.resolve({ name: "orders.edit", params: { id } }).href : `#/comanda/${id}`;
    },
    routeName(route) {
      if (!route) return "—";
      if (typeof route === "object") return route.name || "—";
      const found = this.routes.find(r => r.id === route);
      return found ? found.name : "—";
    },
    formatDay(value) {
      return value ? moment(value).format("DD/MM/YYYY") : "—";
    }
  }
};
</script>

<style scoped>
/* a «comanda de recollida agrupada», set apart from a normal order */
.collection-group {
  margin: .25rem 0 .5rem 2rem;
  padding: .5rem .75rem;
  border-left: 3px solid var(--a-accent);
  background: var(--a-accent-soft);
  border-radius: 0 .375rem .375rem 0;
}
.collection-group-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .375rem;
  margin-bottom: .25rem;
}
.collection-group-head small {
  flex-basis: 100%;
  color: var(--a-muted);
}
.grouped-table {
  background: transparent;
}
.grouped-table td small {
  display: block;
  color: var(--a-muted);
  font-size: .8125rem;
}
.edit-pair {
  display: grid;
  gap: .25rem;
  min-width: 11rem;
}
.nowrap {
  white-space: nowrap;
}
@media (max-width: 700px) {
  .collection-group {
    margin-left: 0;
  }
}
</style>
