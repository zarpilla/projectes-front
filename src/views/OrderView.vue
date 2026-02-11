<template>
  <div>
    <title-bar :title-stack="titleStack" />

    <section class="section is-main-section">
      <card-component :title="formCardTitle" icon="package-variant">
        <div v-if="isLoading" class="has-text-centered">
          <b-loading :active="isLoading"></b-loading>
        </div>

        <div v-else-if="order">
          <!-- Action Buttons -->
          <div class="buttons mb-5">
            <b-button
              type="is-primary"
              icon-left="pencil"
              @click="editOrder"
              v-if="canEdit"
            >
              Editar
            </b-button>

            <b-button
              type="is-info"
              icon-left="package-down"
              @click="depositOrder"
              v-if="canDeposit"
              :loading="isDepositingOrPickingUp"
            >
              Depositar
            </b-button>

            <b-button
              type="is-success"
              icon-left="package-up"
              @click="pickupOrder"
              v-if="canPickup"
              :loading="isDepositingOrPickingUp"
            >
              Recollir
            </b-button>

            <b-button
              type="is-warning"
              icon-left="alert-circle"
              @click="createIncidence"
              v-if="canCreateIncidence"
            >
              Crear Incidència
            </b-button>
          </div>

          <!-- Order Details (simple pre tag for now) -->
          <div class="box">
            <h3 class="title is-5">Detalls de la Comanda</h3>
            <pre>{{ orderFormatted }}</pre>
          </div>

          <!-- Incidences Section -->
          <div class="box" v-if="order.incidences && order.incidences.length > 0">
            <h3 class="title is-5">Incidències ({{ openIncidencesCount }})</h3>
            <div v-for="(incidence, index) in order.incidences" :key="index" class="mb-3">
              <b-tag :type="incidence.state === 'closed' ? 'is-success' : 'is-warning'">
                {{ incidence.state === 'closed' ? 'Tancada' : 'Oberta' }}
              </b-tag>
              <strong class="ml-2">{{ incidence.type }}</strong>
              <p class="ml-5">{{ incidence.description }}</p>
              <p class="ml-5 is-size-7 has-text-grey">
                {{ formatDateTime(incidence.created_at) }}
              </p>
            </div>
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
import service from "@/service/index";
import { mapState } from "vuex";

export default {
  name: "OrderView",
  components: {
    TitleBar,
    CardComponent
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
      permissions: []
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
        return `Comanda #${this.order.id.toString().padStart(4, "0")}${collection}`;
      }
      return "Veure Comanda";
    },
    orderFormatted() {
      return JSON.stringify(this.order, null, 2);
    },
    canEdit() {
      // User can edit if they are admin or the order owner
      return (
        this.permissions.includes("orders_admin") ||
        (this.order && this.order.owner === this.me.id)
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
        ["deposited", "delivered"].includes(this.order.status) &&
        (this.permissions.includes("orders_admin") || 
         this.permissions.includes("orders_delivery"))
      );
    },
    canCreateIncidence() {
      // Can create incidence if order exists and user has permissions
      return (
        this.order &&
        (this.permissions.includes("orders_admin") || 
         this.order.owner === this.me.id)
      );
    },
    openIncidencesCount() {
      if (!this.order || !this.order.incidences || !Array.isArray(this.order.incidences)) {
        return 0;
      }
      return this.order.incidences.filter(inc => inc.state !== 'closed').length;
    }
  },
  async created() {
    await this.getPermissions();
    await this.loadOrder();
  },
  methods: {
    async getPermissions() {
      try {
        const me = await service({ requiresAuth: true, cached: true }).get("users/me");
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
        const response = await service({ requiresAuth: true }).get(`orders/${this.id}`);
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
        const currentUser = await service({ requiresAuth: true }).get("users/me");

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
        const currentUser = await service({ requiresAuth: true }).get("users/me");

        // Update with pickup information
        await service({ requiresAuth: true }).put(
          `orders/${this.order.id}`,
          {
            pickup_date: new Date().toISOString(),
            pickup_user: currentUser.data.id
          }
        );

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
    createIncidence() {
      // Navigate to edit page with focus on incidences
      this.$router.push({
        name: "orders.edit",
        params: { id: this.order.id },
        query: { focusIncidence: true }
      });
    },
    formatDateTime(dateTime) {
      if (!dateTime) return "";
      return dayjs(dateTime).format("DD/MM/YYYY HH:mm");
    }
  }
};
</script>

<style scoped>
pre {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
