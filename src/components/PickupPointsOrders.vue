<template>
  <div>
    <div class="filter-bar">
      <span class="pp-count">{{ ordersData.length }} {{ ordersData.length === 1 ? "comanda" : "comandes" }}</span>
      <download-excel class="export ml-auto" name="punts-recollida" :fields="excelFields" :data="excelRows">
        <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
      </download-excel>
    </div>
    <div class="a-box list-box">
    <b-table :loading="isLoading" :data="ordersData" :paginated="false" :striped="false" :mobile-cards="false">
      <b-table-column label="Comanda" field="id" sortable v-slot="props">
        <router-link :to="{ name: 'orders.view.detail', params: { id: props.row.id } }">
          <b>#{{ props.row.id.toString().padStart(4, "0") }}</b>
        </router-link>
      </b-table-column>

      <b-table-column label="Estat" field="status" sortable v-slot="props">
        <span class="tag" :class="getStatusType(props.row.status)">{{ getStatusLabel(props.row.status) }}</span>
      </b-table-column>

      <b-table-column label="Punt" field="contact.name" sortable v-slot="props">
        {{
          props.row.contact
            ? props.row.contact.name || props.row.contact.trade_name
            : ""
        }}
      </b-table-column>

      <b-table-column label="Ruta" field="route.name" sortable v-slot="props">
        {{ props.row.route ? props.row.route.name : "" }}
      </b-table-column>

      <b-table-column
        label="Data estimada"
        field="estimated_delivery_date"
        sortable
        v-slot="props"
      >
        <span class="nowrap">{{ formatDate(props.row.estimated_delivery_date) }}</span>
      </b-table-column>

      <b-table-column label="Línia" v-slot="props">
        <div v-if="props.row.lines && props.row.lines.length > 0">
          <div
            v-for="(line, index) in props.row.lines"
            :key="index"
            class="mb-2 hrow"
          >
            <div
              class="is-flex is-justify-content-space-between is-align-items-center"
            >
              <div>
                <strong>{{ line.name }}</strong><span v-if="line.nif" class="has-text-muted"> · {{ line.nif }}</span>
                <br />
                <small>{{ line.units }} {{ Number(line.units) === 1 ? "caixa" : "caixes" }} · {{ line.kilograms }} kg</small>
              </div>
              <div>
                <b-button
                  v-if="!line.picked_up"
                  size="is-small"
                  type="is-primary"
                  icon-left="check"
                  @click="markAsPickedUp(props.row.id, index)"
                  :loading="updatingLines[`${props.row.id}_${index}`]"
                >
                  Recollit
                </b-button>
                <span v-else class="picked">
                  <b-icon icon="check-circle" size="is-small" /> Recollit
                  <b-button
                    size="is-small"
                    type="is-text"
                    @click="markAsNotPickedUp(props.row.id, index)"
                    :loading="updatingLines[`${props.row.id}_${index}`]"
                  >Desfés</b-button>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <span class="has-text-grey">Sense línies</span>
        </div>
      </b-table-column>

      <template #empty>
        <section class="section">
          <div class="content has-text-grey has-text-centered">
            <template v-if="isLoading">
              <p>
                <b-icon icon="dots-horizontal" size="is-large" />
              </p>
              <p>Carregant dades...</p>
            </template>
            <template v-else>
              <p>
                <b-icon icon="emoticon-sad" size="is-large" />
              </p>
              <p>No hi ha comandes de punt de consum pendents</p>
            </template>
          </div>
        </section>
      </template>
    </b-table>
    </div>
  </div>
</template>

<script>
import service from "@/service/index";

export default {
  name: "PickupPointsOrders",
  data() {
    return {
      ordersData: [],
      isLoading: false,
      perPage: 20,
      updatingLines: {},
      excelFields: {
        "Comanda": "id",
        "Estat": "status",
        "Punt": "point",
        "Ruta": "route",
        "Data estimada": "estimated_delivery_date",
        "Línia": "line",
        "NIF": "nif",
        "Caixes": "units",
        "Kg": "kilograms",
        "Recollida": "picked_up"
      }
    };
  },
  computed: {
    // One row per line of each order, or one row for an order without lines (issues/029)
    excelRows() {
      return this.ordersData.flatMap(order => {
        const row = {
          id: order.id,
          status: this.getStatusLabel(order.status),
          point: order.contact ? order.contact.name || order.contact.trade_name : "",
          route: order.route ? order.route.name : "",
          estimated_delivery_date: order.estimated_delivery_date
        };
        if (!order.lines || order.lines.length === 0) return [row];
        return order.lines.map(line => ({
          ...row,
          line: line.name,
          nif: line.nif,
          units: line.units,
          kilograms: line.kilograms,
          picked_up: line.picked_up ? "Sí" : "No"
        }));
      });
    }
  },
  async created() {
    await this.getOrders();
  },
  methods: {
    async getOrders() {
      this.isLoading = true;
      try {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        const permissions = me.data.permissions.map(p => p.permission);

        if (
          !(permissions.includes("orders_admin") || permissions.includes("orders_delivery")) &&
          permissions.includes("orders")
        ) {
          const response = await service({ requiresAuth: true }).get(
            `orders?_where[pickup_point]=true&_where[status_ne]=invoiced&_where[status_ne]=cancelled&_where[owner]=${me.data.id}&_sort=estimated_delivery_date:ASC,id:ASC&_limit=-1`
          );
          this.ordersData = response.data;

          const contacts = await service({
            requiresAuth: true,
            cached: true
          }).get(`contacts?users_permissions_user=${me.data.id}&_limit=-1`);

          if (contacts.data.length > 0) {
            for (const contact of contacts.data) {
              const response2 = await service({ requiresAuth: true }).get(
                `orders?_where[pickup_point]=true&_where[status_ne]=invoiced&_where[status_ne]=cancelled&_where[contact]=${contact.id}&_sort=estimated_delivery_date:ASC,id:ASC&_limit=-1`
              );
              this.ordersData.push(...response2.data);
              // push if id not exists
              this.ordersData = this.ordersData.filter(
                (order, index, self) =>
                  index === self.findIndex(o => o.id === order.id)
              );
            }
          } else {
            //this.ordersData = [];
          }
        } else {
          const response = await service({ requiresAuth: true }).get(
            "orders?_where[pickup_point]=true&_where[status_ne]=invoiced&_where[status_ne]=cancelled&_sort=estimated_delivery_date:ASC,id:ASC&_limit=-1"
          );
          this.ordersData = response.data;
        }
      } catch (error) {
        console.error("Error fetching pickup point orders:", error);
        this.$buefy.toast.open({
          message: "Error al carregar les comandes de punt de consum",
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    async markAsPickedUp(orderId, lineIndex) {
      const key = `${orderId}_${lineIndex}`;
      this.updatingLines = { ...this.updatingLines, [key]: true };

      try {
        // Find the order in our data
        const order = this.ordersData.find(o => o.id === orderId);
        if (!order || !order.lines || !order.lines[lineIndex]) {
          throw new Error("Línia no trobada");
        }

        // Update the line to mark as picked up
        const updatedLines = [...order.lines];
        updatedLines[lineIndex] = {
          ...updatedLines[lineIndex],
          picked_up: true
        };

        // Check if all lines are picked up
        const allLinesPickedUp = updatedLines.every(line => line.picked_up);

        // Update the order in the backend
        await service({ requiresAuth: true }).put(`orders/${orderId}`, {
          lines: updatedLines,
          picked_up: allLinesPickedUp
        });

        // Update local data
        order.lines = updatedLines;
        order.picked_up = allLinesPickedUp;

        // If all lines are picked up, remove from the list
        // if (allLinesPickedUp) {
        //   this.ordersData = this.ordersData.filter(o => o.id !== orderId);
        // }

        this.$buefy.toast.open({
          message: "Línia marcada com recollida correctament",
          type: "is-success"
        });
      } catch (error) {
        console.error("Error updating pickup status:", error);
        this.$buefy.toast.open({
          message: "Error al marcar la línia com recollida",
          type: "is-danger"
        });
      } finally {
        this.updatingLines = { ...this.updatingLines, [key]: false };
      }
    },
    async markAsNotPickedUp(orderId, lineIndex) {
      const key = `${orderId}_${lineIndex}`;
      this.updatingLines = { ...this.updatingLines, [key]: true };

      try {
        // Find the order in our data
        const order = this.ordersData.find(o => o.id === orderId);
        if (!order || !order.lines || !order.lines[lineIndex]) {
          throw new Error("Línia no trobada");
        }

        // Update the line to mark as not picked up
        const updatedLines = [...order.lines];
        updatedLines[lineIndex] = {
          ...updatedLines[lineIndex],
          picked_up: false
        };

        // Update the order in the backend
        await service({ requiresAuth: true }).put(`orders/${orderId}`, {
          lines: updatedLines,
          picked_up: false
        });

        // Update local data
        order.lines = updatedLines;

        this.$buefy.toast.open({
          message: "Línia marcada com NO recollida correctament",
          type: "is-success"
        });
      } catch (error) {
        console.error("Error updating pickup status:", error);
        this.$buefy.toast.open({
          message: "Error al marcar la línia com NO recollida",
          type: "is-danger"
        });
      } finally {
        this.updatingLines = { ...this.updatingLines, [key]: false };
      }
    },
    getStatusType(status) {
      const statusTypes = {
        pending: "is-warning",
        processed: "is-info is-light",
        confirmed: "is-info is-light",
        in_progress: "is-info is-light",
        delivered: "is-success is-light",
        invoiced: "",
        cancelled: "is-danger is-light"
      };
      return statusTypes[status] || "";
    },
    getStatusLabel(status) {
      const statusLabels = {
        pending: "Pendent",
        processed: "Processada",
        confirmed: "Confirmada",
        in_progress: "En procés",
        delivered: "Lliurada",
        invoiced: "Facturada",
        cancelled: "Anul·lada"
      };
      return statusLabels[status] || status;
    },
    formatDate(date) {
      return date ? String(date).split("-").reverse().join("/") : "";
    }
  }
};
</script>

<style scoped>
.mb-2 {
  margin-bottom: 0.5rem;
}
.status.tag {
  text-transform: uppercase;
}
.hrow {
  padding-bottom: .5rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.hrow:last-child {
  border-bottom: 0;
}
.pp-count {
  font-weight: 700;
  color: var(--a-fg-2);
}
.picked {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  font-weight: 700;
  color: var(--a-pos);
}
.nowrap {
  white-space: nowrap;
}
</style>
