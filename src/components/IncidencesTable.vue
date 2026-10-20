<template>
  <!-- Redesign A (mockup A-Log-Incidencies): the incidences to solve on the
       left, the selected one on the right with its conversation and actions
       (it replaces the row details and the modal). -->
  <div class="incidences-page">
    <title-bar :title-stack="['Logística', 'Incidències']" :subtitle="headline">
      <download-excel class="export" name="incidencies" :fields="excelFields" :fetch="fetchExcel">
        <b-button icon-left="download">Exporta</b-button>
      </download-excel>
    </title-bar>

    <section class="section is-main-section">
      <div class="doc-kpis">
        <div class="doc-kpi">
          <span>Obertes</span>
          <b :class="{ 'has-text-neg': openCount }">{{ openCount }}</b>
        </div>
        <div class="doc-kpi">
          <span>En procés</span>
          <b>{{ wipCount }}</b>
        </div>
        <div class="doc-kpi">
          <span>Tancades</span>
          <b>{{ closedCount }}</b>
        </div>
        <div class="doc-kpi">
          <span>Temps mitjà de tancament</span>
          <b>{{ avgCloseDays === null ? "—" : `${formatNum(avgCloseDays)} dies` }}</b>
          <small>incidències tancades els últims 3 mesos</small>
        </div>
      </div>

      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent="refresh">
        <b-field class="filter-grow">
          <b-input v-model="search" icon="magnify" placeholder="Cerca comanda, punt o text" @update:model-value="debouncedRefresh" />
        </b-field>
        <div class="segmented" role="group" aria-label="Estat">
          <button
            v-for="tab in stateTabs"
            :key="tab.id"
            type="button"
            :class="{ 'is-on': tabOn(tab) }"
            :aria-pressed="tabOn(tab) ? 'true' : 'false'"
            @click="setTab(tab)"
          >{{ tab.label }} <span class="count">{{ tab.count }}</span></button>
        </div>
        <label v-if="isAdmin" class="filter-select">
          <span>Sòcia</span>
          <b-select v-model="ownerFilter" @update:model-value="refresh">
            <option :value="null">Totes</option>
            <option v-for="u in owners" :key="u.id" :value="u.id">{{ u.fullname || u.username }}</option>
          </b-select>
        </label>
      </form>

      <div class="inc-layout">
        <section class="a-box inc-list">
          <b-loading :is-full-page="false" :model-value="isLoading" />
          <div class="table-container inc-table-wrap">
            <table class="table is-fullwidth inc-table">
              <thead>
                <tr>
                  <th>Núm.</th>
                  <th>Incidència</th>
                  <th>Comanda</th>
                  <th>Creada</th>
                  <th>Estat</th>
                  <th class="col-actions"><span class="is-sr-only">Accions</span></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="inc in incidences"
                  :key="inc.id"
                  class="inc-row"
                  :class="{ 'is-selected': selected && selected.id === inc.id }"
                  tabindex="0"
                  @click="select(inc.id)"
                  @keydown.enter="select(inc.id)"
                >
                  <td class="num"><b>#{{ inc.id }}</b></td>
                  <td class="col-text">
                    <b>{{ inc.description }}</b>
                    <small>{{ [inc.order && inc.order.contact_trade_name, ownerName(inc)].filter(Boolean).join(" · ") }}</small>
                  </td>
                  <td class="nowrap">
                    <router-link v-if="inc.order && inc.order.id" :to="{ name: 'orders.view.detail', params: { id: inc.order.id } }" @click.stop>#{{ inc.order.id }}</router-link>
                    <span v-else>—</span>
                  </td>
                  <td class="nowrap">{{ formatDate(createdOf(inc)) }}</td>
                  <td><span class="tag" :class="stateTag(inc.state)">{{ getStateLabel(inc.state) }}</span></td>
                  <td class="col-actions">
                    <button v-if="canDelete(inc)" type="button" class="row-action" title="Elimina la incidència" aria-label="Elimina la incidència" @click.stop="deleteIncidence(inc)">
                      <b-icon icon="delete-outline" size="is-small" />
                    </button>
                  </td>
                </tr>
                <tr v-if="!isLoading && !incidences.length">
                  <td colspan="6" class="box-empty">No hi ha incidències amb aquests filtres.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- phones: one card per incidence, like Operacions; the table had its
               description squeezed to nothing (issues/208) -->
          <div class="inc-cards">
            <article
              v-for="inc in incidences"
              :key="inc.id"
              class="a-box inc-card"
              :class="{ 'is-selected': selected && selected.id === inc.id }"
              tabindex="0"
              @click="openCard(inc.id)"
              @keydown.enter="openCard(inc.id)"
            >
              <header class="inc-card-head">
                <b>#{{ inc.id }}</b>
                <span class="tag" :class="stateTag(inc.state)">{{ getStateLabel(inc.state) }}</span>
              </header>
              <p class="inc-card-text">{{ inc.description }}</p>
              <small class="inc-card-meta">
                {{ [inc.order && inc.order.contact_trade_name, ownerName(inc)].filter(Boolean).join(" · ") }}
              </small>
              <footer class="inc-card-foot">
                <span>
                  <router-link v-if="inc.order && inc.order.id" :to="{ name: 'orders.view.detail', params: { id: inc.order.id } }" @click.stop>Comanda #{{ inc.order.id }}</router-link>
                  · {{ formatDate(createdOf(inc)) }}
                </span>
                <button v-if="canDelete(inc)" type="button" class="row-action" title="Elimina la incidència" aria-label="Elimina la incidència" @click.stop="deleteIncidence(inc)">
                  <b-icon icon="delete-outline" size="is-small" />
                </button>
              </footer>
            </article>
            <p v-if="!isLoading && !incidences.length" class="box-empty">No hi ha incidències amb aquests filtres.</p>
          </div>
          <footer class="inc-foot">
            <span>{{ total }} {{ total === 1 ? "incidència" : "incidències" }}</span>
            <b-pagination v-if="total > perPage" v-model="page" :total="total" :per-page="perPage" size="is-small" order="is-right" @change="onPageChange" />
          </footer>
        </section>

        <aside ref="detail" class="a-box inc-detail">
          <template v-if="selected">
            <header class="box-head">
              <h2>Incidència #{{ selected.id }}</h2>
              <span class="tag" :class="stateTag(selected.state)">{{ getStateLabel(selected.state) }}</span>
            </header>
            <dl class="facts">
              <dt>Comanda</dt>
              <dd>
                <router-link v-if="selected.order && selected.order.id" :to="{ name: 'orders.view.detail', params: { id: selected.order.id } }">#{{ selected.order.id }}</router-link>
                <span v-if="selectedOrder" class="tag order-tag">{{ orderStatusLabel(selectedOrder.status) }}</span>
              </dd>
              <dt>Punt</dt><dd>{{ (selected.order && selected.order.contact_trade_name) || "—" }}</dd>
              <dt>Sòcia</dt><dd>{{ ownerName(selected) || "—" }}</dd>
              <template v-if="selectedOrder && selectedOrder.route"><dt>Ruta</dt><dd>{{ selectedOrder.route.name }}</dd></template>
              <dt>Creada per</dt><dd>{{ userName(selected.created_user) }} · {{ formatDateTime(createdOf(selected)) }}</dd>
              <template v-if="selected.order"><dt>Prevista / lliurada</dt><dd>{{ formatDate(selected.order.estimated_delivery_date) || "—" }} / {{ formatDate(selected.order.delivery_date) || "—" }}</dd></template>
              <template v-if="selected.closed_date"><dt>Tancada</dt><dd>{{ formatDateTime(selected.closed_date) }} · {{ userName(selected.closed_user) }}</dd></template>
            </dl>

            <div class="conversation">
              <div class="message is-first">
                <div class="message-meta"><b>{{ userName(selected.created_user) }}</b><small>{{ formatDateTime(createdOf(selected)) }}</small></div>
                <p>{{ selected.description }}</p>
              </div>
              <div v-for="(response, index) in selected.incidence_response || []" :key="index" class="message">
                <div class="message-meta"><b>{{ userName(response.user) }}</b><small>{{ formatDateTime(response.response_date) }}</small></div>
                <p>{{ response.text }}</p>
              </div>
            </div>

            <div v-if="selected.state !== 'closed'" class="reply">
              <b-field label="Resposta">
                <b-input v-model="responseText[selected.id]" type="textarea" rows="3" placeholder="Escriu una resposta…" @keydown.ctrl.enter="addResponse(selected)" />
              </b-field>
              <small class="field-note">Ctrl+Enter per enviar</small>
              <div class="reply-actions">
                <b-button type="is-primary" icon-left="send" :disabled="!responseText[selected.id] || !responseText[selected.id].trim()" @click="addResponse(selected)">Envia</b-button>
                <b-button v-if="selected.state === 'open'" icon-left="clock-outline" @click="changeState(selected, 'wip')">Marca en procés</b-button>
                <b-button icon-left="check" @click="changeState(selected, 'closed')">Tanca</b-button>
              </div>
            </div>
            <div v-else class="notification is-light closed-note">
              <span>Aquesta incidència està tancada.</span>
              <!-- the staff can reopen it; the API clears who closed it (issues/226, issues/249) -->
              <b-button v-if="isAdmin" size="is-small" icon-left="restore" class="reopen" @click="changeState(selected, 'open')">Reobre</b-button>
            </div>
          </template>
          <p v-else class="box-empty">Tria una incidència de la llista per veure-la i respondre-la.</p>
        </aside>
      </div>
    </section>
  </div>
</template>

<script>
import service from "@/service/index";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import moment from "moment";
import TitleBar from "@/components/TitleBar.vue";
import { formatNumber } from "@/helpers/format-number";

export default {
  name: "IncidencesTable",
  components: {
    TitleBar
  },
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
      // "Per resoldre" first
      stateFilter: ["open", "wip"],
      search: "",
      searchTimer: null,
      ownerFilter: null,
      owners: [],
      selected: null,
      selectedOrder: null,
      avgCloseDays: null,
      permissions: [],
      openCount: 0,
      wipCount: 0,
      closedCount: 0,
      responseText: {},
      currentUserId: null,
      isAdmin: false,
      showIncidenceModal: false,
      modalIncidence: null,
      // the columns of the table (issues/029)
      excelFields: {
        "ID": "id",
        "Comanda": "order.id",
        "Punt": "order.contact_trade_name",
        "Sòcia": "order.owner.fullname",
        "Descripció": "description",
        "Estat": "state_label",
        "Creada": "created",
        "Creada per": "created_by",
        "Tancada": "closed",
        "Tancada per": "closed_by"
      }
    };
  },
  computed: {
    ...mapState(useMainStore, ["me"]),
    stateTabs() {
      return [
        { id: "todo", states: ["open", "wip"], label: "Per resoldre", count: this.openCount + this.wipCount },
        { id: "open", states: ["open"], label: "Obertes", count: this.openCount },
        { id: "wip", states: ["wip"], label: "En procés", count: this.wipCount },
        { id: "closed", states: ["closed"], label: "Tancades", count: this.closedCount },
        { id: "all", states: [], label: "Totes", count: this.openCount + this.wipCount + this.closedCount }
      ];
    },
    headline() {
      const todo = this.openCount + this.wipCount;
      const all = todo + this.closedCount;
      return `${todo} per resoldre · ${all} en total`;
    }
  },
  async mounted() {
    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    this.permissions = me.data.permissions.map(p => p.permission);
    this.currentUserId = me.data.id;
    this.isAdmin = (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"));
    // a link to one incidence (?id=) shows it, whatever its state
    const incidenceId = this.$route.query.id;
    if (incidenceId) this.stateFilter = [];
    this.loadData();
    if (this.isAdmin) {
      const users = (await service({ requiresAuth: true, cached: true }).get("users", { params: { _limit: -1 } })).data;
      this.owners = users
        .filter(u => (u.permissions || []).some(p => p.permission === "orders"))
        .sort((a, b) => (a.fullname || a.username || "").localeCompare(b.fullname || b.username || ""));
    }
    if (incidenceId) {
      await this.select(incidenceId);
    }
  },
  methods: {
    // the incidence of the right panel, with its order (route, status)
    async select(id) {
      try {
        const incidence = (await service({ requiresAuth: true }).get(`incidences/${id}`)).data;
        const listed = this.incidences.find(i => i.id === incidence.id);
        if (listed && listed.order && listed.order.owner && typeof listed.order.owner === "object" && incidence.order) {
          incidence.order.owner = listed.order.owner;
        }
        if (!this.responseText[incidence.id]) this.responseText[incidence.id] = "";
        this.selected = incidence;
        this.selectedOrder = null;
        if (incidence.order && incidence.order.id) {
          this.selectedOrder = (await service({ requiresAuth: true }).get(`orders/${incidence.order.id}`)).data;
          if (this.selectedOrder && this.selectedOrder.owner && typeof this.selectedOrder.owner === "object") {
            this.selected = { ...this.selected, order: { ...this.selected.order, owner: this.selectedOrder.owner } };
          }
        }
      } catch (error) {
        this.$buefy.toast.open({ message: "Error carregant la incidència", type: "is-danger" });
      }
    },
    // a card opens its incidence and brings the detail, under the list, into view
    async openCard(id) {
      await this.select(id);
      await this.$nextTick();
      const detail = this.$refs.detail;
      if (detail && detail.scrollIntoView) detail.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    async refreshSelected() {
      if (this.selected) await this.select(this.selected.id);
    },
    tabOn(tab) {
      return tab.states.length === this.stateFilter.length && tab.states.every(s => this.stateFilter.includes(s));
    },
    setTab(tab) {
      this.stateFilter = [...tab.states];
      this.refresh();
    },
    refresh() {
      this.page = 1;
      this.loadData();
    },
    debouncedRefresh() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.refresh(), 400);
    },
    async loadAvgClose() {
      try {
        // like the other counters: the filters of the list (member, search)
        // but not its state, and again after every reload, a close included;
        // it was loaded once on mount (issues/275)
        const since = moment().subtract(3, "months").format("YYYY-MM-DD");
        const params = this.filterParams();
        delete params.state_in;
        Object.assign(params, { state: "closed", closed_date_gte: since, _limit: -1 });
        const closed = (await service({ requiresAuth: true }).get("incidences", { params })).data;
        const days = closed
          .filter(i => i.closed_date && this.createdOf(i))
          .map(i => moment(i.closed_date).diff(moment(this.createdOf(i)), "hours") / 24);
        this.avgCloseDays = days.length ? days.reduce((a, b) => a + b, 0) / days.length : null;
      } catch (e) {
        this.avgCloseDays = null;
      }
    },
    createdOf(incidence) {
      return incidence.created_at || incidence.createdAt;
    },
    userName(user) {
      return user ? user.fullname || user.username : "Usuari desconegut";
    },
    ownerName(incidence) {
      const owner = incidence && incidence.order && incidence.order.owner;
      return owner && typeof owner === "object" ? owner.fullname || owner.username : "";
    },
    stateTag(state) {
      return { open: "is-danger is-light", wip: "is-warning is-light", closed: "is-success is-light" }[state] || "";
    },
    orderStatusLabel(status) {
      return { pending: "Pendent", processed: "Processada", delivered: "Lliurada", invoiced: "Facturada", cancelled: "Anul·lada" }[status] || status;
    },
    formatNum(value) {
      return formatNumber(value, 1);
    },
    async loadData() {
      this.isLoading = true;
      try {
        const params = {
          _limit: this.perPage,
          _start: (this.page - 1) * this.perPage,
          _sort: `${this.sortField}:${this.sortOrder.toUpperCase()}`,
          // _populate: 'order.contact'
        };

        Object.assign(params, this.filterParams());

        this.incidences = await this.fetchIncidences(params);

        // Get total count
        const countParams = this.filterParams();
        const countResponse = await service({ requiresAuth: true }).get(
          "incidences/count",
          { params: countParams }
        );
        this.total = countResponse.data;

        // Get counts by state
        await Promise.all([this.loadStateCounts(), this.loadAvgClose()]);
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
    // The filters of the list: the chosen states and, for non-admins, their own orders
    filterParams() {
      const params = {};
      if (this.stateFilter.length > 0) {
        params.state_in = this.stateFilter;
      }
      if (!this.isAdmin && this.currentUserId) {
        params['order.owner'] = this.currentUserId;
      } else if (this.ownerFilter) {
        params['order.owner'] = this.ownerFilter;
      }
      const q = (this.search || "").trim();
      if (q) {
        params["_where[_or][0][description_contains]"] = q;
        params["_where[_or][1][order.contact_trade_name_contains]"] = q;
        if (/^\d+$/.test(q)) {
          params["_where[_or][2][order.id]"] = q;
          params["_where[_or][3][id]"] = q;
        }
      }
      return params;
    },
    // Incidences with the owner of their order as a user (the API gives its id)
    async fetchIncidences(params) {
      const [incidencesResponse, usersResponse] = await Promise.all([
        service({ requiresAuth: true }).get("incidences", { params }),
        service({ requiresAuth: true, cached: true }).get("users", { params: { _limit: -1 } })
      ]);

      const usersMap = new Map(usersResponse.data.map(u => [u.id, u]));

      return incidencesResponse.data.map(incidence => {
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
    },
    // Every incidence of the current filter and order, not only the page on screen
    async fetchExcel() {
      const userName = user => (user ? user.fullname || user.username : "");
      try {
        this.isLoading = true;
        const incidences = await this.fetchIncidences({
          _limit: -1,
          _sort: `${this.sortField}:${this.sortOrder.toUpperCase()}`,
          ...this.filterParams()
        });
        return incidences.map(incidence => ({
          ...incidence,
          state_label: this.getStateLabel(incidence.state),
          created: this.formatDate(incidence.created_at),
          created_by: userName(incidence.created_user),
          closed: incidence.closed_date ? this.formatDate(incidence.closed_date) : "",
          closed_by: userName(incidence.closed_user)
        }));
      } catch (error) {
        console.error("Error exporting incidences:", error);
        this.$buefy.toast.open({
          message: "Error exportant incidències",
          type: "is-danger"
        });
        return [];
      } finally {
        this.isLoading = false;
      }
    },
    async loadStateCounts() {
      try {
        // the filters of the list (member, search) but not its state (issues/154)
        const baseParams = this.filterParams();
        delete baseParams.state_in;

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
        open: "Oberta",
        wip: "En procés",
        closed: "Tancada"
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
      if (!date) return "";
      return moment(date).format("DD/MM/YYYY");
    },
    formatDateTime(date) {
      if (!date) return "-";
      return moment(date).format("DD/MM/YYYY HH:mm");
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
        this.responseText[incidence.id] = '';

        // Reload data to show the new response
        await this.loadData();
        await this.refreshSelected();
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

      const reopening = incidence.state === 'closed' && newState !== 'closed';
      const confirmMessage = newState === 'closed' 
        ? 'Estàs segur que vols tancar aquesta incidència?' 
        : reopening
          ? 'Vols reobrir aquesta incidència?'
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
              message: reopening ? "Incidència reoberta" : `Incidència marcada com a ${stateLabels[newState]}`,
              type: "is-success"
            });

            // Reload data
            await this.loadData();
            await this.refreshSelected();
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
            if (this.selected && this.selected.id === incidence.id) this.selected = null;
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
.incidences-page .segmented .count {
  margin-left: .25rem;
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-muted);
}
.inc-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 27rem;
  gap: 1rem;
  align-items: start;
}
.inc-list {
  position: relative;
  padding: 0;
  overflow: hidden;
}
.inc-table {
  font-size: .875rem;
}
.inc-table td {
  vertical-align: middle;
}
.inc-row {
  cursor: pointer;
}
.inc-row:hover td {
  background: var(--a-thead);
}
.inc-row.is-selected td {
  background: var(--a-accent-soft);
}
.col-text {
  width: 100%;
  max-width: 0;
}
.col-text b,
.col-text small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-text b {
  color: var(--a-fg);
}
.col-text small {
  font-size: .75rem;
  color: var(--a-muted);
}
.num,
.nowrap {
  white-space: nowrap;
}
.col-actions {
  width: 2.5rem;
  text-align: right;
}
.row-action {
  border: 0;
  background: none;
  color: var(--a-muted);
  cursor: pointer;
}
.row-action:hover {
  color: var(--a-neg);
}
.box-empty {
  padding: 2rem !important;
  text-align: center;
  color: var(--a-muted);
}
.inc-foot {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .75rem 1rem;
  border-top: 1px solid var(--a-line-soft);
  font-size: .875rem;
  color: var(--a-muted);
}
.inc-foot > :last-child {
  margin-left: auto;
}
.inc-detail {
  position: sticky;
  top: 1rem;
}
.inc-cards {
  display: none;
}
.inc-card {
  display: flex;
  flex-direction: column;
  gap: .375rem;
  margin: .75rem;
  cursor: pointer;
}
.inc-card.is-selected {
  background: var(--a-accent-soft);
}
.inc-card-head,
.inc-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
}
.inc-card-head b {
  color: var(--a-fg);
}
.inc-card-text {
  color: var(--a-fg);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.inc-card-meta,
.inc-card-foot {
  font-size: .8125rem;
  color: var(--a-muted);
}
.inc-card-foot .row-action {
  margin-top: 0;
}
.order-tag {
  margin-left: .5rem;
}
.conversation {
  display: flex;
  flex-direction: column;
  gap: .625rem;
  margin: 1.25rem 0;
}
.message {
  padding: .75rem .875rem;
  border: 1px solid var(--a-line-soft);
  border-radius: 10px;
  background: var(--a-thead);
}
.message.is-first {
  background: var(--a-chip);
}
.message-meta {
  display: flex;
  justify-content: space-between;
  gap: .5rem;
  margin-bottom: .25rem;
  font-size: .8125rem;
}
.message-meta small {
  color: var(--a-muted);
}
.message p {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--a-fg);
}
.field-note {
  display: block;
  margin-top: -.5rem;
  font-size: .75rem;
  color: var(--a-muted);
}
.reply-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: .75rem;
}
.closed-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
}
@media screen and (max-width: 768px) {
  .inc-table-wrap {
    display: none;
  }
  .inc-cards {
    display: block;
  }
}
@media screen and (max-width: 1215px) {
  .inc-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .inc-detail {
    position: static;
  }
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
