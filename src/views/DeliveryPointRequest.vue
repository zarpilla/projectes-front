<template>
  <!-- «Consulta i autorització nou punt d'entrega» (issues/357): a member asks
       for a delivery point the service doesn't cover yet. The request is mailed
       to the office (the incidences' address), which answers by e-mail; here
       stays the record: who asked, when, and whether it has been answered. -->
  <div class="point-request">
    <title-bar
      :title-stack="['Rutes i punts', 'Consulta nou punt']"
      subtitle="Demana un punt d'entrega on encara no arribem: l'oficina en rebrà un correu i et respondrà per correu."
    />

    <section class="section is-main-section">
      <routes-tabs :is-staff="isOffice" :is-office="isOffice" />

      <section class="a-box">
        <header class="box-head"><h2>Consulta i autorització nou punt d'entrega</h2></header>
        <form class="request-form" data-test="point-request-form" @submit.prevent="send">
          <b-field label="Nom comercial">
            <b-input v-model="form.trade_name" maxlength="255" :has-counter="false" data-test="request-trade-name" />
          </b-field>
          <b-field label="Població *" :type="{ 'is-danger': submitted && !filled(form.city) }">
            <b-input v-model="form.city" maxlength="255" :has-counter="false" data-test="request-city" />
          </b-field>
          <b-field label="Adreça *" class="span-2" :type="{ 'is-danger': submitted && !filled(form.address) }">
            <b-input v-model="form.address" maxlength="255" :has-counter="false" data-test="request-address" />
          </b-field>
          <b-field
            label="Horari *"
            class="span-2"
            message="Amb la màxima amplitud: tots els dies i les hores en què s'hi pot lliurar."
            :type="{ 'is-danger': submitted && !filled(form.schedule) }"
          >
            <b-input v-model="form.schedule" type="textarea" rows="2" data-test="request-schedule" />
          </b-field>
          <b-field label="Pes estimat de la comanda" message="Per exemple, «15 kg» o «2 caixes de 10 kg».">
            <b-input v-model="form.estimated_weight" maxlength="255" :has-counter="false" data-test="request-weight" />
          </b-field>
          <b-field label="Notes" class="span-2">
            <b-input v-model="form.notes" type="textarea" rows="2" data-test="request-notes" />
          </b-field>
          <div class="span-2 form-actions">
            <b-button native-type="submit" type="is-primary" icon-left="send" :loading="isSending" data-test="request-send">Envia la consulta</b-button>
            <small>Els camps amb * són obligatoris.</small>
          </div>
        </form>
      </section>

      <section class="a-box">
        <header class="box-head">
          <h2>{{ isOffice ? "Consultes rebudes" : "Les meves consultes" }}</h2>
          <span class="box-hint">{{ pendingCount }} {{ pendingCount === 1 ? "pendent" : "pendents" }} de resposta</span>
        </header>
        <b-loading :is-full-page="false" :model-value="isLoading" />
        <div class="table-container">
          <table class="table is-fullwidth requests-table" data-test="requests-table">
            <thead>
              <tr>
                <th>Data</th>
                <th v-if="isOffice">Sòcia</th>
                <th>Punt</th>
                <th>Horari</th>
                <th>Pes</th>
                <th>Notes</th>
                <th>Resposta</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in requests" :key="r.id">
                <td class="nowrap">{{ formatDateTime(r.createdAt || r.created_at) }}</td>
                <td v-if="isOffice">{{ userName(r.user) }}</td>
                <td>
                  <b>{{ r.trade_name || "—" }}</b>
                  <small class="sub">{{ r.address }} · {{ r.city }}</small>
                </td>
                <td class="pre">{{ r.schedule }}</td>
                <td>{{ r.estimated_weight || "—" }}</td>
                <td class="pre">{{ r.notes || "—" }}</td>
                <td class="nowrap">
                  <b-switch
                    v-if="isOffice"
                    :model-value="!!r.answered"
                    size="is-small"
                    data-test="request-answered"
                    @update:model-value="setAnswered(r, $event)"
                  >{{ r.answered ? "Resposta" : "Pendent" }}</b-switch>
                  <span v-else class="tag" :class="r.answered ? 'is-success is-light' : 'is-warning is-light'">{{ r.answered ? "Resposta" : "Pendent" }}</span>
                  <small v-if="r.answered && r.answered_date" class="sub">{{ formatDateTime(r.answered_date) }}</small>
                </td>
              </tr>
              <tr v-if="!isLoading && !requests.length">
                <td :colspan="isOffice ? 7 : 6" class="box-empty">Encara no hi ha cap consulta.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import TitleBar from "@/components/TitleBar.vue";
import RoutesTabs from "@/components/RoutesTabs.vue";
import { emptyPointRequest, pointRequestError, isOfficeUser } from "@/domain/deliveryPointRequest";

export default {
  name: "DeliveryPointRequest",
  components: { TitleBar, RoutesTabs },
  data() {
    return {
      isLoading: true,
      isSending: false,
      submitted: false,
      permissions: [],
      form: emptyPointRequest(),
      requests: []
    };
  },
  computed: {
    isOffice() {
      return isOfficeUser(this.permissions);
    },
    pendingCount() {
      return this.requests.filter(r => !r.answered).length;
    }
  },
  async mounted() {
    try {
      const me = (await service({ requiresAuth: true, cached: true }).get("users/me")).data;
      this.permissions = (me.permissions || []).map(p => p.permission);
      await this.load();
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    filled(value) {
      return !!(value && String(value).trim());
    },
    // the API keeps a member to her own requests
    async load() {
      try {
        const { data } = await service({ requiresAuth: true }).get("delivery-point-requests", {
          params: { _limit: -1, _sort: "id:DESC", "populate[0]": "user" }
        });
        this.requests = Array.isArray(data) ? data : [];
      } catch (e) {
        this.requests = [];
        this.$buefy.toast.open({ message: "Error carregant les consultes", type: "is-danger" });
      }
    },
    async send() {
      this.submitted = true;
      const error = pointRequestError(this.form);
      if (error) {
        this.$buefy.snackbar.open({ message: error, type: "is-danger", queue: false });
        return;
      }
      this.isSending = true;
      try {
        await service({ requiresAuth: true }).post("delivery-point-requests", { data: this.form });
        this.$buefy.snackbar.open({ message: "Consulta enviada: l'oficina et respondrà per correu", type: "is-success", queue: false });
        this.form = emptyPointRequest();
        this.submitted = false;
        await this.load();
      } catch (e) {
        const message = (e && e.response && e.response.data && e.response.data.error && e.response.data.error.message) || "No s'ha pogut enviar la consulta";
        this.$buefy.snackbar.open({ message, type: "is-danger", queue: false });
      } finally {
        this.isSending = false;
      }
    },
    async setAnswered(request, answered) {
      try {
        const { data } = await service({ requiresAuth: true }).put(`delivery-point-requests/${request.id}`, { data: { answered } });
        const saved = data && data.data ? data.data : data;
        Object.assign(request, { answered, answered_date: saved && saved.answered_date !== undefined ? saved.answered_date : (answered ? new Date().toISOString() : null) });
      } catch (e) {
        this.$buefy.toast.open({ message: "Error desant la resposta", type: "is-danger" });
      }
    },
    userName(user) {
      return user && typeof user === "object" ? user.fullname || user.username : "—";
    },
    formatDateTime(date) {
      return date ? moment(date).format("DD/MM/YYYY HH:mm") : "";
    }
  }
};
</script>

<style scoped>
.request-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .25rem 1rem;
}
.request-form .span-2 {
  grid-column: 1 / -1;
}
.form-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.form-actions small {
  color: var(--a-muted);
}
.a-box + .a-box {
  margin-top: 1rem;
}
.box-hint {
  color: var(--a-muted);
  font-size: .875rem;
}
.requests-table td {
  vertical-align: top;
}
.requests-table .sub {
  display: block;
  color: var(--a-muted);
  font-size: .8125rem;
}
.requests-table .pre {
  white-space: pre-line;
  min-width: 10rem;
}
.nowrap {
  white-space: nowrap;
}
@media (max-width: 700px) {
  .request-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
