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
          <!-- the cause, required when the entity has categories (issues/431) -->
          <b-field v-if="categories.length" label="Categoria *" :type="{ 'is-danger': !category && submitted }" :message="!category && submitted ? 'Tria la categoria de la incidència' : ''">
            <b-select v-model="category" placeholder="Tria la causa de la incidència" expanded data-test="incidence-category">
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </b-select>
          </b-field>
          <b-field
            :label="categories.length ? 'Descripció (opcional)' : 'Descripció de la incidència'"
            :type="{ 'is-danger': !categories.length && !description && submitted }"
            :message="categories.length ? 'Aclareix o explica els fets' : 'Descriu la incidència'"
          >
            <b-input
              v-model="description"
              type="textarea"
              :rows="4"
              placeholder="Descriu el problema o situació..."
              maxlength="500"
              :required="!categories.length"
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
import { loadIncidenceCategories, incidenceFormError } from "@/domain/incidenceCategories";

export default {
  name: "ModalBoxIncidence",
  emits: ["cancel", "confirm"],
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    orderId: {
      type: [Number, String],
      required: true
    },
    predefinedDescription: {
      type: String,
      default: ""
    }
  },
  data() {
    return {
      isModalActive: false,
      description: "",
      state: "open",
      category: null,
      categories: [],
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
        this.loadCategories();
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
      this.description = this.predefinedDescription || "";
      this.state = "open";
      this.category = null;
      this.submitted = false;
    },
    async loadCategories() {
      this.categories = await loadIncidenceCategories(service);
    },
    cancel() {
      this.isModalActive = false;
      this.$emit("cancel");
    },
    async confirm() {
      this.submitted = true;
      
      const error = incidenceFormError({ categories: this.categories, category: this.category, description: this.description });
      if (error) {
        this.$buefy.snackbar.open({
          message: error,
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
          description: (this.description || "").trim(),
          state: this.state,
          ...(this.category ? { category: this.category } : {}),
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
