<template>
  <section class="xsection">
    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <div class="is-flex is-block-mobile is-flex-wrap-wrap mb-3">
      <b-button
        class="view-button mb-3 ml-0 mr-3"
        :class="{
          'is-primary': stateFilter.length === 0,
          'is-warning': stateFilter.length > 0
        }"
        @click="setStateFilter($event, null)"
      >
        TOTES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': stateFilter.includes('open'),
          'is-warning': !stateFilter.includes('open')
        }"
        @click="setStateFilter($event, 'open')"
      >
        OBERTES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': stateFilter.includes('wip'),
          'is-warning': !stateFilter.includes('wip')
        }"
        @click="setStateFilter($event, 'wip')"
      >
        EN PROCÉS
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': stateFilter.includes('closed'),
          'is-warning': !stateFilter.includes('closed')
        }"
        @click="setStateFilter($event, 'closed')"
      >
        TANCADES
      </b-button>
    </div>

    <div class="mb-3">
      <div class="columns is-multiline ml-0 mt-4">
        <div class="column is-half">
          <div class="columns is-mobile bg-white-panel">
            <div class="column">
              <h2 class="pr-2">Total</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ total }} (PÀG {{ this.page }}/{{ Math.ceil(total / perPage) }})
                </b>
              </div>
            </div>
            <div class="column">
              <h2 class="pr-2">Obertes</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ openCount }}
                </b>
              </div>
            </div>
            <div class="column">
              <h2 class="pr-2">En procés</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ wipCount }}
                </b>
              </div>
            </div>
            <div class="column">
              <h2 class="pr-2">Tancades</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ closedCount }}
                </b>
              </div>
            </div>
          </div>
        </div>
        <div class="column is-flex">
          <div class="ml-auto mt-2">
            <b-select
              v-model="perPage"
              @input="loadData"
              v-if="total > 50"
            >
              <option value="50">50 per pàg.</option>
              <option value="100">100 per pàg.</option>
              <option value="250">250 per pàg.</option>
            </b-select>
          </div>
        </div>
      </div>
    </div>

    <b-table
      class="small-table"
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
      :data="incidences"
      :debounce-search="500"
      :row-class="rowClassFn"
      detailed
      detail-key="id"
      :show-detail-icon="true"
      @details-open="onDetailsOpen"
    >
      <b-table-column label="ID" field="id" sortable v-slot="props" width="80">
        {{ props.row.id }}
      </b-table-column>

      <b-table-column
        label="Comanda"
        field="order.id"
        sortable
        v-slot="props"
        width="100"
      >
        <router-link
          v-if="props.row.order && props.row.order.id"
          :to="{ name: 'orders.edit', params: { id: props.row.order.id } }"
        >
          #{{ props.row.order.id.toString().padStart(4, "0") }}
        </router-link>
        <span v-else>-</span>
      </b-table-column>

      <b-table-column
        label="Sòcia"
        field="order.owner"
        sortable
        v-slot="props"
        width="150"
      >
        {{ props.row.order && props.row.order.owner ? props.row.order.owner.fullname : '-' }}
      </b-table-column>

      <b-table-column
        label="Descripció"
        field="description"
        sortable
        v-slot="props"
      >
        <div class="incidence-description">
          {{ props.row.description }}
        </div>
      </b-table-column>

      <b-table-column
        label="Estat"
        field="state"
        sortable
        v-slot="props"
        width="120"
      >
        <b-tag
          :type="getStateTagType(props.row.state)"
        >
          {{ getStateLabel(props.row.state) }}
        </b-tag>
      </b-table-column>

      <b-table-column
        label="Creada"
        field="created_at"
        sortable
        v-slot="props"
        width="110"
      >
        {{ formatDate(props.row.created_at) }}
      </b-table-column>

      <b-table-column
        label="Creada per"
        field="created_user.username"
        sortable
        v-slot="props"
        width="120"
      >
        {{ props.row.created_user ? (props.row.created_user.fullname || props.row.created_user.username) : '-' }}
      </b-table-column>

      <b-table-column
        label="Tancada"
        field="closed_date"
        sortable
        v-slot="props"
        width="110"
      >
        {{ props.row.closed_date ? formatDate(props.row.closed_date) : '-' }}
      </b-table-column>

      <b-table-column
        label="Tancada per"
        field="closed_user.username"
        sortable
        v-slot="props"
        width="120"
      >
        {{ props.row.closed_user ? (props.row.closed_user.fullname || props.row.closed_user.username) : '-' }}
      </b-table-column>

      <b-table-column
        label="Accions"
        v-slot="props"
        width="80"
      >
        <b-button
          type="is-danger"
          size="is-small"
          icon-left="delete"
          @click="deleteIncidence(props.row)"
          v-if="canDelete(props.row)"
        >
        </b-button>
      </b-table-column>

      <template #empty>
        <div class="has-text-centered">No hi ha incidències</div>
      </template>

      <template #detail="props">
        <div class="incidence-chat-container">
          <!-- Original incidence description -->
          <div class="chat-message initial-message">
            <div class="message-header">
              <div class="message-author">
                <b-icon icon="account" size="is-small"></b-icon>
                <strong>{{ props.row.created_user ? (props.row.created_user.fullname || props.row.created_user.username) : 'Usuari desconegut' }}</strong>
              </div>
              <div class="message-date">{{ formatDateTime(props.row.created_at) }}</div>
            </div>
            <div class="message-content initial-content">
              {{ props.row.description }}
            </div>
          </div>

          <!-- Responses -->
          <div 
            v-for="(response, index) in (props.row.incidence_response || [])" 
            :key="index"
            class="chat-message"
          >
            <div class="message-header">
              <div class="message-author">
                <b-icon icon="account-arrow-right" size="is-small"></b-icon>
                <strong>{{ response.user ? (response.user.fullname || response.user.username) : 'Usuari desconegut' }}</strong>
              </div>
              <div class="message-date">{{ formatDateTime(response.response_date) }}</div>
            </div>
            <div class="message-content">
              {{ response.text }}
            </div>
          </div>

          <!-- Add new response form -->
          <div class="add-response-form" v-if="props.row.state !== 'closed'">
            <b-field grouped>
              <b-field expanded>
                <b-input
                  v-model="responseText[props.row.id]"
                  type="textarea"
                  placeholder="Escriu una resposta..."
                  :rows="2"
                  @keydown.native.ctrl.enter="addResponse(props.row)"
                ></b-input>
              </b-field>
            </b-field>
            <div class="is-flex is-justify-content-space-between">
              <div class="buttons">
                <b-button
                  type="is-primary"
                  size="is-small"
                  icon-left="send"
                  @click="addResponse(props.row)"
                  :disabled="!responseText[props.row.id] || !responseText[props.row.id].trim()"
                >
                  Enviar resposta
                </b-button>
                <b-button
                  v-if="props.row.state === 'open'"
                  type="is-warning"
                  size="is-small"
                  icon-left="clock"
                  @click="changeState(props.row, 'wip')"
                >
                  Marcar en procés
                </b-button>
                <b-button
                  v-if="props.row.state === 'wip'"
                  type="is-success"
                  size="is-small"
                  icon-left="check"
                  @click="changeState(props.row, 'closed')"
                >
                  Tancar incidència
                </b-button>
              </div>
              <small class="has-text-grey-light">Ctrl+Enter per enviar</small>
            </div>
          </div>

          <div v-else class="notification is-light">
            <p>Aquesta incidència està tancada.</p>
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

export default {
  name: "IncidencesTable",
  data() {
    return {
      isLoading: false,
      incidences: [],
      total: 0,
      page: 1,
      perPage: 50,
      sortField: "id",
      sortOrder: "desc",
      defaultSortOrder: "desc",
      stateFilter: [],
      permissions: [],
      openCount: 0,
      wipCount: 0,
      closedCount: 0,
      responseText: {},
      currentUserId: null,
      isAdmin: false
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
    this.isAdmin = (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"));
    this.loadData();
  },
  methods: {
    async loadData() {
      this.isLoading = true;
      try {
        const params = {
          _limit: this.perPage,
          _start: (this.page - 1) * this.perPage,
          _sort: `${this.sortField}:${this.sortOrder.toUpperCase()}`
        };

        // Add state filter if any
        if (this.stateFilter.length > 0) {
          params.state_in = this.stateFilter;
        }

        // If not admin, filter by order owner
        if (!this.isAdmin && this.currentUserId) {
          params['order.owner'] = this.currentUserId;
        }

        // Fetch incidences and users in parallel
        const [incidencesResponse, usersResponse] = await Promise.all([
          service({ requiresAuth: true }).get("incidences", { params }),
          service({ requiresAuth: true, cached: true }).get("users", { params: { _limit: -1 } })
        ]);

        this.incidences = incidencesResponse.data;
        const users = usersResponse.data;

        // Create a map of users by id for quick lookup
        const usersMap = new Map(users.map(u => [u.id, u]));

        // Enrich incidences with order owner information
        this.incidences = this.incidences.map(incidence => {
          if (incidence.order && incidence.order.owner) {
            const ownerId = typeof incidence.order.owner === 'object' 
              ? incidence.order.owner.id 
              : incidence.order.owner;
            const owner = usersMap.get(ownerId);
            if (owner) {
              incidence.order.owner = owner;
            }
          }
          return incidence;
        });

        // Get total count
        const countParams = {};
        if (this.stateFilter.length > 0) {
          countParams.state_in = this.stateFilter;
        }
        // If not admin, filter by order owner for count too
        if (!this.isAdmin && this.currentUserId) {
          countParams['order.owner'] = this.currentUserId;
        }
        const countResponse = await service({ requiresAuth: true }).get(
          "incidences/count",
          { params: countParams }
        );
        this.total = countResponse.data;

        // Get counts by state
        await this.loadStateCounts();
      } catch (error) {
        console.error("Error loading incidences:", error);
        this.$buefy.toast.open({
          message: "Error carregant incidències",
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    async loadStateCounts() {
      try {
        // Base params for non-admin users
        const baseParams = {};
        if (!this.isAdmin && this.currentUserId) {
          baseParams['order.owner'] = this.currentUserId;
        }

        const [openRes, wipRes, closedRes] = await Promise.all([
          service({ requiresAuth: true }).get("incidences/count", {
            params: { ...baseParams, state: "open" }
          }),
          service({ requiresAuth: true }).get("incidences/count", {
            params: { ...baseParams, state: "wip" }
          }),
          service({ requiresAuth: true }).get("incidences/count", {
            params: { ...baseParams, state: "closed" }
          })
        ]);
        this.openCount = openRes.data;
        this.wipCount = wipRes.data;
        this.closedCount = closedRes.data;
      } catch (error) {
        console.error("Error loading state counts:", error);
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
    setStateFilter(event, state) {
      if (state === null) {
        // Show all
        this.stateFilter = [];
      } else if (event.ctrlKey || event.metaKey) {
        // Add/remove from filter
        const index = this.stateFilter.indexOf(state);
        if (index > -1) {
          this.stateFilter.splice(index, 1);
        } else {
          this.stateFilter.push(state);
        }
      } else {
        // Replace filter
        this.stateFilter = [state];
      }
      this.page = 1;
      this.loadData();
    },
    getStateLabel(state) {
      const labels = {
        open: "OBERTA",
        wip: "EN PROCÉS",
        closed: "TANCADA"
      };
      return labels[state] || state;
    },
    getStateTagType(state) {
      const types = {
        open: "is-danger",
        wip: "is-warning",
        closed: "is-success"
      };
      return types[state] || "is-light";
    },
    formatDate(date) {
      if (!date) return "-";
      return moment(date).format("DD/MM/YYYY");
    },
    formatDateTime(date) {
      if (!date) return "-";
      return moment(date).format("DD/MM/YYYY HH:mm");
    },
    onDetailsOpen(row) {
      // Initialize response text for this row if not exists
      if (!this.responseText[row.id]) {
        this.$set(this.responseText, row.id, '');
      }
    },
    async addResponse(incidence) {
      const text = this.responseText[incidence.id];
      if (!text || !text.trim()) {
        return;
      }

      try {
        this.isLoading = true;

        // Get current user
        const me = await service({ requiresAuth: true, cached: true }).get("users/me");
        const currentUserId = me.data.id;

        // Prepare the new response
        const newResponse = {
          text: text.trim(),
          user: currentUserId,
          response_date: new Date().toISOString()
        };

        // Get current responses and add the new one
        const currentResponses = incidence.incidence_response || [];
        const updatedResponses = [...currentResponses, newResponse];

        // Update the incidence with the new response
        await service({ requiresAuth: true }).put(
          `incidences/${incidence.id}`,
          {
            incidence_response: updatedResponses
          }
        );

        this.$buefy.toast.open({
          message: "Resposta afegida correctament",
          type: "is-success"
        });

        // Clear the input
        this.$set(this.responseText, incidence.id, '');

        // Reload data to show the new response
        await this.loadData();
      } catch (error) {
        console.error("Error adding response:", error);
        this.$buefy.toast.open({
          message: "Error afegint resposta",
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    async changeState(incidence, newState) {
      const stateLabels = {
        open: 'oberta',
        wip: 'en procés',
        closed: 'tancada'
      };

      const confirmMessage = newState === 'closed' 
        ? 'Estàs segur que vols tancar aquesta incidència?' 
        : `Vols marcar aquesta incidència com a ${stateLabels[newState]}?`;

      this.$buefy.dialog.confirm({
        message: confirmMessage,
        onConfirm: async () => {
          try {
            this.isLoading = true;

            // Get current user
            const me = await service({ requiresAuth: true, cached: true }).get("users/me");
            const currentUserId = me.data.id;

            const updateData = {
              state: newState
            };

            // If closing, set closed_date and closed_user
            if (newState === 'closed') {
              updateData.closed_date = new Date().toISOString();
              updateData.closed_user = currentUserId;
            }

            await service({ requiresAuth: true }).put(
              `incidences/${incidence.id}`,
              updateData
            );

            this.$buefy.toast.open({
              message: `Incidència marcada com a ${stateLabels[newState]}`,
              type: "is-success"
            });

            // Reload data
            await this.loadData();
          } catch (error) {
            console.error("Error changing state:", error);
            this.$buefy.toast.open({
              message: "Error canviant l'estat de la incidència",
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    rowClassFn(row) {
      if (row.state === "closed") {
        return "has-background-light";
      }
      return "";
    },
    canDelete(incidence) {
      // Admins can always delete
      if (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery")) {
        return true;
      }
      
      // Non-admins can only delete their own incidences if:
      // - The incidence is not closed
      // - It was created within the last 24 hours
      // - They are the order owner
      const isOwner = incidence.order && 
                      incidence.order.owner && 
                      (typeof incidence.order.owner === 'object' 
                        ? incidence.order.owner.id === this.currentUserId 
                        : incidence.order.owner === this.currentUserId);
      
      return isOwner && 
             incidence.state !== "closed" && 
             moment().diff(moment(incidence.created_at), "hours") < 24;
    },
    deleteIncidence(incidence) {
      this.$buefy.dialog.confirm({
        message: "Estàs segur que vols eliminar aquesta incidència?",
        onConfirm: async () => {
          try {
            this.isLoading = true;
            await service({ requiresAuth: true }).delete(
              `incidences/${incidence.id}`
            );
            this.$buefy.toast.open({
              message: "Incidència eliminada",
              type: "is-success"
            });
            this.loadData();
          } catch (error) {
            console.error("Error deleting incidence:", error);
            this.$buefy.toast.open({
              message: "Error eliminant incidència",
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.bg-white-panel {
  background-color: white;
  border-radius: 4px;
  padding: 1rem;
}

.incidence-description {
  max-width: 400px;
  white-space: pre-wrap;
  word-break: break-word;
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

.incidence-chat-container {
  padding: 1.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin: 1rem 0;
}

.chat-message {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &.initial-message {
    border-left: 0px solid #3273dc;
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e8e8e8;
  background-color: transparent;
}

.message-author {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  strong {
    color: #363636;
  }
}

.message-date {
  font-size: 0.875rem;
  color: #7a7a7a;
}

.message-content {
  white-space: pre-wrap;
  word-break: break-word;
  color: #4a4a4a;
  line-height: 1.5;

  &.initial-content {
    font-weight: 500;
  }
}

.add-response-form {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .buttons {
    display: flex;
    gap: 0.5rem;
  }
}

.message-author .icon {
    color: #000;
}
</style>

<style lang="scss">
.small-table {
  font-size: 0.875rem;

  .table {
    font-size: 0.875rem;
  }

  td {
    padding: 0.5rem 0.75rem;
  }

  th {
    padding: 0.5rem 0.75rem;
  }
}
</style>
