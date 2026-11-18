<template>
  <!-- «Consulta i autorització nou punt d'entrega» (issues/357): a member asks
       for a delivery point the service doesn't cover yet. The request is mailed
       to the office (the incidences' address). The office approves or rejects
       it, the member gets a mail, and an approved one gives a button to create
       the delivery point with what the request says; decided requests are
       archived out of the list (issues/357, seguiment). -->
  <div class="point-request">
    <title-bar
      :title-stack="['Rutes i punts', 'Consulta nou punt']"
      subtitle="Demana un punt d'entrega on encara no arribem: l'oficina en rebrà un correu i t'avisarem per correu quan l'aprovi o la rebutgi."
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
          <h2>{{ isOffice ? (showArchived ? "Consultes arxivades" : "Consultes rebudes") : "Les meves consultes" }}</h2>
          <span v-if="!showArchived" class="box-hint">{{ pendingCount }} {{ pendingCount === 1 ? "pendent" : "pendents" }} de resposta</span>
          <b-switch
            v-if="isOffice"
            v-model="showArchived"
            size="is-small"
            class="ml-auto"
            data-test="requests-archived"
            @update:model-value="load"
          >Mostra les arxivades</b-switch>
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
                <th v-if="isOffice"></th>
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
                <td class="answer-cell">
                  <span class="tag is-light" :class="stateOf(r).tag" data-test="request-state">{{ stateOf(r).text }}</span>
                  <small v-if="r.answered && r.answered_date" class="sub">{{ formatDateTime(r.answered_date) }}</small>
                  <small v-if="r.answer" class="sub pre">{{ r.answer }}</small>
                  <router-link
                    v-if="r.contact && r.contact.id"
                    :to="`/punt-entrega/${r.contact.id}`"
                    class="sub"
                    data-test="request-point"
                  >Punt d'entrega: {{ r.contact.trade_name || r.contact.name || r.contact.id }}</router-link>
                </td>
                <td v-if="isOffice" class="request-actions">
                  <template v-if="!r.answered">
                    <b-button size="is-small" type="is-success" icon-left="check" data-test="request-approve" @click="decide(r, 'approved')">Aprova</b-button>
                    <b-button size="is-small" type="is-danger" outlined icon-left="close" data-test="request-reject" @click="decide(r, 'rejected')">Rebutja</b-button>
                  </template>
                  <template v-else>
                    <b-button
                      v-if="r.status === 'approved' && !(r.contact && r.contact.id)"
                      size="is-small"
                      type="is-primary"
                      icon-left="map-marker-plus"
                      data-test="request-create-point"
                      @click="createPoint(r)"
                    >Crea el punt d'entrega</b-button>
                    <b-button
                      size="is-small"
                      outlined
                      :icon-left="r.archived ? 'archive-arrow-up' : 'archive-arrow-down'"
                      data-test="request-archive"
                      @click="setArchived(r, !r.archived)"
                    >{{ r.archived ? "Desarxiva" : "Arxiva" }}</b-button>
                    <b-button
                      v-if="!r.archived"
                      size="is-small"
                      type="is-text"
                      data-test="request-undo"
                      @click="decide(r, null)"
                    >Torna a pendent</b-button>
                  </template>
                </td>
              </tr>
              <tr v-if="!isLoading && !requests.length">
                <td :colspan="isOffice ? 8 : 6" class="box-empty">{{ showArchived ? "No hi ha cap consulta arxivada." : "Encara no hi ha cap consulta." }}</td>
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
import { emptyPointRequest, pointRequestError, isOfficeUser, requestState } from "@/domain/deliveryPointRequest";

export default {
  name: "DeliveryPointRequest",
  components: { TitleBar, RoutesTabs },
  data() {
    return {
      isLoading: true,
      isSending: false,
      submitted: false,
      showArchived: false,
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
    // the API keeps a member to her own requests (all of them); the office
    // lists the archived ones apart
    async load() {
      try {
        const params = { _limit: -1, _sort: "id:DESC", "populate[0]": "user", "populate[1]": "contact" };
        if (this.isOffice) params._archived = this.showArchived ? 1 : 0;
        const { data } = await service({ requiresAuth: true }).get("delivery-point-requests", { params });
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
    stateOf(request) {
      return requestState(request);
    },
    async save(request, data) {
      const { data: res } = await service({ requiresAuth: true }).put(`delivery-point-requests/${request.id}`, { data });
      return (res && res.data ? res.data : res) || {};
    },
    // approve / reject, with an optional message for the member (mailed);
    // null takes it back to pending
    decide(request, status) {
      if (!status) return this.applyDecision(request, null, "");
      const approve = status === "approved";
      this.$buefy.dialog.prompt({
        title: approve ? "Aprova la consulta" : "Rebutja la consulta",
        message: "La sòcia en rebrà un correu. Missatge per a ella (opcional):",
        inputAttrs: { placeholder: approve ? "Per exemple, el dia que hi passarem" : "Per exemple, el motiu", required: false, maxlength: 1000 },
        confirmText: approve ? "Aprova" : "Rebutja",
        cancelText: "Cancel·la",
        type: approve ? "is-success" : "is-danger",
        trapFocus: true,
        onConfirm: answer => this.applyDecision(request, status, answer)
      });
    },
    async applyDecision(request, status, answer) {
      const text = String(answer || "").trim();
      try {
        const saved = await this.save(request, { status, answer: text });
        Object.assign(request, {
          status,
          answered: !!status,
          answer: text || null,
          answered_date: saved.answered_date !== undefined ? saved.answered_date : (status ? new Date().toISOString() : null)
        });
        if (status) {
          this.$buefy.snackbar.open({ message: `Consulta ${status === "approved" ? "aprovada" : "rebutjada"}: la sòcia en rebrà un correu`, queue: false });
        }
      } catch (e) {
        this.$buefy.toast.open({ message: "Error desant la resposta", type: "is-danger" });
      }
    },
    async setArchived(request, archived) {
      try {
        await this.save(request, { archived });
        this.requests = this.requests.filter(r => r.id !== request.id);
      } catch (e) {
        this.$buefy.toast.open({ message: "Error arxivant la consulta", type: "is-danger" });
      }
    },
    // the point form, filled from the request (ContactsUserForm reads ?consulta)
    createPoint(request) {
      this.$router.push({ path: "/punt-entrega/0", query: { consulta: request.id } });
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
.box-head .ml-auto {
  margin-left: auto;
}
.request-actions {
  white-space: nowrap;
}
.request-actions .button + .button {
  margin-left: .25rem;
}
.answer-cell {
  min-width: 8rem;
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
