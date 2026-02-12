<template>
  <b-modal v-model="isModalActive" has-modal-card trap-focus :destroy-on-hide="false" aria-role="dialog" aria-modal>
    <form @submit.prevent="confirm">
      <div class="modal-card modal-card-wide">
        <header class="modal-card-head">
          <p class="modal-card-title">Crear Incidència</p>
          <button
            type="button"
            class="delete"
            @click="cancel"/>
        </header>
        <section class="modal-card-body">
          <b-field label="Descripció de la incidència" :type="{ 'is-danger': !description && submitted }" message="Descriu la incidència">
            <b-input
              v-model="description"
              type="textarea"
              :rows="4"
              placeholder="Descriu el problema o situació..."
              maxlength="500"
              required
            ></b-input>
          </b-field>

          <b-field label="Estat" :type="{ 'is-danger': !state && submitted }">
            <b-select v-model="state" placeholder="Selecciona l'estat" expanded required>
              <option value="open">Oberta</option>
              <option value="wip">En procés</option>
              <option value="closed">Tancada</option>
            </b-select>
          </b-field>
        </section>
        <footer class="modal-card-foot">
          <b-button
            label="Cancel·lar"
            @click="cancel" />
          <b-button
            native-type="submit"
            label="Crear incidència"
            type="is-primary"
            :loading="isLoading" />
        </footer>
      </div>
    </form>
  </b-modal>
</template>

<script>
import service from "@/service/index";

export default {
  name: "ModalBoxIncidence",
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    orderId: {
      type: [Number, String],
      required: true
    }
  },
  data() {
    return {
      isModalActive: false,
      description: "",
      state: "open",
      submitted: false,
      isLoading: false
    };
  },
  watch: {
    isActive(newValue) {
      this.isModalActive = newValue;
      if (newValue) {
        // Reset form when modal opens
        this.resetForm();
      }
    },
    isModalActive(newValue) {
      if (!newValue) {
        this.$emit("cancel");
      }
    }
  },
  methods: {
    resetForm() {
      this.description = "";
      this.state = "open";
      this.submitted = false;
    },
    cancel() {
      this.isModalActive = false;
      this.$emit("cancel");
    },
    async confirm() {
      this.submitted = true;
      
      if (!this.description || !this.description.trim()) {
        this.$buefy.snackbar.open({
          message: "Si us plau, descriu la incidència",
          queue: false,
          type: "is-danger"
        });
        return;
      }

      try {
        this.isLoading = true;

        // Get the current order
        const orderResponse = await service({ requiresAuth: true }).get(`orders/${this.orderId}`);
        const order = orderResponse.data;

        // Get existing incidences or initialize empty array
        const incidences = order.incidences || [];

        // Add the new incidence
        incidences.push({
          description: this.description.trim(),
          state: this.state,
          created_at: new Date().toISOString()
        });

        // Update the order with the new incidence
        await service({ requiresAuth: true }).put(`orders/${this.orderId}`, {
          incidences: incidences
        });

        this.$buefy.snackbar.open({
          message: "Incidència creada correctament",
          queue: false,
          type: "is-success"
        });

        this.isModalActive = false;
        this.$emit("confirm", { orderId: this.orderId });

      } catch (err) {
        console.error("Error creating incidence:", err);
        this.$buefy.snackbar.open({
          message: "Error al crear la incidència",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.modal-card-foot {
  justify-content: space-between;
}

.modal-card-wide {
  width: 90vw;
  max-width: 800px;
}

@media screen and (max-width: 768px) {
  .modal-card-wide {
    width: 95vw;
    max-width: none;
  }
}
</style>
