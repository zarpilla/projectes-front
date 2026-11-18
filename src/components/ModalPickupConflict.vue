<template>
  <!-- A pickup can't come after its delivery (issues/429): the API refused the
       save and named the orders. Each one opens in a new tab, to change its
       delivery date first or move it by itself. -->
  <b-modal :model-value="active" has-modal-card trap-focus aria-role="alertdialog" aria-modal @update:model-value="v => !v && $emit('close')">
    <div class="modal-card conflict-card" data-test="pickup-conflict">
      <header class="modal-card-head">
        <p class="modal-card-title">
          <b-icon icon="alert-outline" type="is-danger" />
          No s'ha desat: primer cal recollir i després entregar
        </p>
      </header>
      <section class="modal-card-body">
        <p>{{ message }}</p>
        <template v-if="orders.length">
          <p class="mt-3"><b>{{ orders.length === 1 ? "Comanda afectada" : "Comandes afectades" }}</b> (s'obren en una pestanya nova):</p>
          <ul class="conflict-orders">
            <li v-for="id in orders" :key="id">
              <a :href="orderHref(id)" target="_blank" rel="noopener" data-test="conflict-order">{{ String(id).padStart(4, "0") }}</a>
            </li>
          </ul>
        </template>
      </section>
      <footer class="modal-card-foot">
        <b-button type="is-primary" @click="$emit('close')">D'acord</b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script>
export default {
  name: "ModalPickupConflict",
  props: {
    active: { type: Boolean, default: false },
    message: { type: String, default: "" },
    orders: { type: Array, default: () => [] }
  },
  emits: ["close"],
  methods: {
    // the order's card, to edit it
    orderHref(id) {
      return this.$router ? this.$router.resolve({ name: "orders.edit", params: { id } }).href : `#/comanda/${id}`;
    }
  }
};
</script>

<style scoped>
.conflict-card {
  max-width: 36rem;
}
.modal-card-title {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: 1.05rem;
}
.conflict-orders {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem .75rem;
  margin-top: .5rem;
}
.conflict-orders a {
  font-weight: 600;
  text-decoration: underline;
}
</style>
