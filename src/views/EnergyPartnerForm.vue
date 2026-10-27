<template>
  <!-- Comunitat energètica: one member. Her data, her CUPS with the history of
       coefficients of each one, and her documents (saved as soon as they are
       uploaded or removed). projectes-v5 api/energy. -->
  <div class="energy-partner">
    <title-bar :title-stack="['Comunitat energètica', 'Sòcies i CUPS', partner ? partner.name : '…']" :subtitle="subtitle">
      <b-button tag="router-link" :to="{ name: 'energy.partners' }" icon-left="arrow-left">Totes les sòcies</b-button>
    </title-bar>

    <section class="section is-main-section">
      <b-loading :is-full-page="false" :model-value="isLoading" />
      <div v-if="notFound" class="a-box box-empty">Aquesta sòcia no existeix.</div>

      <template v-if="partner">
        <!-- her data -->
        <form class="a-box epf-box" @submit.prevent="savePartner">
          <h2 class="epf-title">Dades</h2>
          <div class="columns is-multiline">
            <b-field class="column is-6" label="Nom i cognoms (o raó social)">
              <b-input v-model="form.name" required />
            </b-field>
            <b-field class="column is-3" label="NIF">
              <b-input v-model="form.nif" />
            </b-field>
            <b-field class="column is-3" label="Telèfon">
              <b-input v-model="form.phone" />
            </b-field>
            <b-field class="column is-6" label="Correu electrònic">
              <b-input v-model="form.email" type="email" />
            </b-field>
            <b-field class="column is-6" label="Adreça">
              <b-input v-model="form.address" />
            </b-field>
            <b-field class="column is-4" label="Població">
              <b-input v-model="form.city" />
            </b-field>
            <b-field class="column is-2" label="CP">
              <b-input v-model="form.postcode" />
            </b-field>
            <b-field class="column is-3" label="Data d'alta">
              <date-field v-model="form.join_date" />
            </b-field>
            <b-field class="column is-3" label="Data de baixa" message="Buida mentre és sòcia">
              <date-field v-model="form.leave_date" />
            </b-field>
            <b-field class="column is-12" label="Aportacions al capital">
              <capital-contributions v-model="form.capital_contributions" />
            </b-field>
            <b-field class="column is-12">
              <b-checkbox v-model="form.privacy_accepted">Ha acceptat la política de privacitat</b-checkbox>
            </b-field>
            <b-field class="column is-12" label="Notes">
              <b-input v-model="form.notes" type="textarea" rows="3" />
            </b-field>
          </div>
          <div class="epf-actions">
            <b-button type="is-primary" native-type="submit" :loading="saving" :disabled="!dirty">Desa les dades</b-button>
          </div>
        </form>

        <!-- her CUPS -->
        <section class="a-box epf-box">
          <div class="epf-head">
            <h2 class="epf-title">CUPS i coeficients</h2>
            <b-button size="is-small" icon-left="plus" @click="openSupply(null)">Afegeix un CUPS</b-button>
          </div>
          <p v-if="!partner.supplies.length" class="epf-muted">Encara no té cap CUPS.</p>

          <article v-for="s in partner.supplies" :key="s.id" class="epf-supply" :class="{ 'is-off': !s.active }">
            <header class="epf-supply-head">
              <div>
                <code class="epf-cups">{{ formatCups(s.cups) }}</code>
                <b-tag v-if="!s.cups_valid" type="is-warning is-light" size="is-small" icon="alert">{{ s.cups_problem }}</b-tag>
                <b-tag v-if="s.submitted" type="is-success is-light" size="is-small">Enviat</b-tag>
                <b-tag v-if="!s.active" type="is-light" size="is-small">Inactiu</b-tag>
                <small class="epf-sub">
                  {{ [s.holder_name ? `Titular: ${s.holder_name}` : null, s.address, s.city].filter(Boolean).join(" · ") || "Titular: la sòcia" }}
                </small>
                <small v-if="s.notes" class="epf-sub epf-notes">{{ s.notes }}</small>
              </div>
              <div class="epf-buttons">
                <b-button size="is-small" icon-left="plus" @click="openCoefficient(s, null)">Coeficient</b-button>
                <b-button size="is-small" icon-left="pencil" @click="openSupply(s)">Edita</b-button>
                <b-button
                  v-if="!s.coefficients.length"
                  size="is-small"
                  icon-left="delete"
                  type="is-danger is-light"
                  :aria-label="`Esborra ${s.cups}`"
                  @click="removeSupply(s)"
                />
              </div>
            </header>
            <table v-if="s.coefficients.length" class="table is-fullwidth is-narrow epf-coefs">
              <thead>
                <tr>
                  <th>Instal·lació</th>
                  <th class="has-text-right">Coeficient</th>
                  <th class="has-text-right">%</th>
                  <th class="has-text-right">Potència</th>
                  <th>Des de</th>
                  <th>Fins a</th>
                  <th><span class="is-sr-only">Accions</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in s.coefficients" :key="c.id" :class="{ 'is-current': c.current }">
                  <td>
                    {{ c.installation ? c.installation.name : "—" }}
                    <b-tag v-if="c.current" type="is-info is-light" size="is-small">Vigent</b-tag>
                    <small v-if="c.notes" class="epf-sub">{{ c.notes }}</small>
                  </td>
                  <td class="has-text-right num">{{ formatCoefficient(c.coefficient) }}</td>
                  <td class="has-text-right num">{{ formatShare(c.coefficient) }}</td>
                  <td class="has-text-right num">{{ formatKw(c.kw) }}</td>
                  <td>{{ dateLabel(c.start_date) }}</td>
                  <td>{{ c.end_date ? dateLabel(c.end_date) : "—" }}</td>
                  <td class="has-text-right epf-row-actions">
                    <b-button size="is-small" icon-left="pencil" :aria-label="'Corregeix'" @click="openCoefficient(s, c)" />
                    <b-button size="is-small" icon-left="delete" type="is-danger is-light" :aria-label="'Esborra'" @click="removeCoefficient(c)" />
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="epf-muted">Sense coeficients.</p>
          </article>
        </section>

        <!-- her documents -->
        <section class="a-box epf-box">
          <div class="epf-head">
            <h2 class="epf-title">Documentació</h2>
            <b-field class="file is-small">
              <b-upload v-model="picked" multiple :disabled="uploading" @update:model-value="upload">
                <a class="button is-small" :class="{ 'is-loading': uploading }">
                  <b-icon icon="upload" size="is-small" />
                  <span>Puja documents</span>
                </a>
              </b-upload>
            </b-field>
          </div>
          <attachments-table :documents="partner.documents" :api-url="apiUrl" @remove="removeDocument" />
          <p v-if="!partner.documents.length" class="epf-muted">
            Cap document. Justificant d'alta, DNI, factura de la llum… Es desen en pujar-los.
          </p>
        </section>
      </template>
    </section>

    <!-- a CUPS -->
    <b-modal v-model="isSupplyOpen" has-modal-card aria-role="dialog" aria-modal>
      <form class="modal-card epf-modal" @submit.prevent="saveSupply">
        <header class="modal-card-head">
          <p class="modal-card-title">{{ supplyForm.id ? "Edita el CUPS" : "Nou CUPS" }}</p>
        </header>
        <section class="modal-card-body">
          <b-field
            label="CUPS"
            :type="supplyForm.cups && !cupsCheck.valid ? 'is-warning' : ''"
            :message="supplyForm.cups && !cupsCheck.valid ? `${cupsCheck.reason}. Es pot desar igualment.` : 'ES + 16 xifres + 2 lletres; el trobaràs a la factura de la llum'"
          >
            <b-input v-model="supplyForm.cups" required placeholder="ES0000000000000000XX0F" />
          </b-field>
          <b-field label="Titular del contracte" message="Buit si és la mateixa sòcia">
            <b-input v-model="supplyForm.holder_name" />
          </b-field>
          <div class="columns">
            <b-field class="column is-8" label="Adreça del subministrament">
              <b-input v-model="supplyForm.address" />
            </b-field>
            <b-field class="column is-4" label="Població">
              <b-input v-model="supplyForm.city" />
            </b-field>
          </div>
          <b-field>
            <b-checkbox v-model="supplyForm.submitted">Enviat a la distribuïdora / comercialitzadora</b-checkbox>
          </b-field>
          <b-field message="Un CUPS inactiu es conserva amb el seu històric (p. ex. un canvi de domicili).">
            <b-switch v-model="supplyForm.active">{{ supplyForm.active ? "Actiu" : "Inactiu" }}</b-switch>
          </b-field>
          <b-field label="Notes">
            <b-input v-model="supplyForm.notes" type="textarea" rows="2" />
          </b-field>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="isSupplyOpen = false">Cancel·la</button>
          <b-button type="is-primary" native-type="submit" :loading="saving">Desa</b-button>
        </footer>
      </form>
    </b-modal>

    <!-- a coefficient -->
    <b-modal v-model="isCoefOpen" has-modal-card aria-role="dialog" aria-modal>
      <form class="modal-card epf-modal" @submit.prevent="saveCoefficient">
        <header class="modal-card-head">
          <p class="modal-card-title">{{ coefForm.id ? "Corregeix el coeficient" : "Nou coeficient" }}</p>
        </header>
        <section class="modal-card-body">
          <p class="epf-muted epf-intro">
            <code>{{ coefForm.cups }}</code><br />
            <template v-if="coefForm.id">Corregeix aquest tram de l'històric (no n'obre cap de nou).</template>
            <template v-else>Des de la data d'inici substitueix el coeficient vigent, que es tanca el dia abans i queda a l'històric. 0 vol dir que deixa la instal·lació.</template>
          </p>
          <b-field label="Instal·lació">
            <b-select v-model="coefForm.installation" expanded required :disabled="Boolean(coefForm.id)">
              <option v-for="i in installations" :key="i.id" :value="i.id">{{ i.name }}{{ i.power_kw ? ` (${formatKw(i.power_kw)})` : "" }}</option>
            </b-select>
          </b-field>
          <div class="columns">
            <b-field
              class="column"
              label="Coeficient (0–1)"
              :type="coefSubmitted && coefficientError(coefForm.coefficient) ? 'is-danger' : ''"
              :message="coefSubmitted && coefficientError(coefForm.coefficient) ? coefficientError(coefForm.coefficient) : coefHint"
            >
              <b-input v-model="coefForm.coefficient" inputmode="decimal" placeholder="0,052300" required />
            </b-field>
            <b-field class="column" label="Des de">
              <date-field v-model="coefForm.start_date" />
            </b-field>
            <b-field v-if="coefForm.id" class="column" label="Fins a" message="Buit: vigent">
              <date-field v-model="coefForm.end_date" />
            </b-field>
          </div>
          <b-field label="Notes">
            <b-input v-model="coefForm.notes" />
          </b-field>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="isCoefOpen = false">Cancel·la</button>
          <b-button type="is-primary" native-type="submit" :loading="saving">Desa</b-button>
        </footer>
      </form>
    </b-modal>
  </div>
</template>

<script>
import moment from "moment";
import TitleBar from "@/components/TitleBar.vue";
import DateField from "@/components/DateField.vue";
import AttachmentsTable from "@/components/AttachmentsTable.vue";
import CapitalContributions from "@/components/CapitalContributions.vue";
import { cleanContributions, contributionError } from "@/domain/capitalContributions";
import service from "@/service/index";
import getConfig from "@/config";
import {
  checkCups,
  formatCups,
  formatCoefficient,
  formatShare,
  formatKw,
  coefficientError,
  parseCoefficient,
  kwOf
} from "@/domain/energy";

const FIELDS = [
  "name",
  "nif",
  "email",
  "phone",
  "address",
  "city",
  "postcode",
  "join_date",
  "leave_date",
  "privacy_accepted",
  "capital_contributions",
  "notes"
];

const errorMessage = (e, fallback) => e?.response?.data?.error?.message || fallback;

export default {
  name: "EnergyPartnerForm",
  components: { TitleBar, DateField, AttachmentsTable, CapitalContributions },
  props: { id: { type: [String, Number], required: true } },
  data() {
    return {
      isLoading: false,
      notFound: false,
      saving: false,
      uploading: false,
      partner: null,
      form: {},
      saved: "",
      installations: [],
      picked: [],
      isSupplyOpen: false,
      supplyForm: {},
      isCoefOpen: false,
      coefSubmitted: false,
      coefForm: {}
    };
  },
  computed: {
    apiUrl() {
      return getConfig().VUE_APP_API_URL || "";
    },
    dirty() {
      return JSON.stringify(this.form) !== this.saved;
    },
    subtitle() {
      if (!this.partner) return "";
      const n = this.partner.supplies.length;
      return [this.partner.nif, `${n} ${n === 1 ? "CUPS" : "CUPS"}`, this.partner.leave_date ? "Baixa" : null]
        .filter(Boolean)
        .join(" · ");
    },
    cupsCheck() {
      return checkCups(this.supplyForm.cups);
    },
    coefHint() {
      const installation = this.installations.find(i => i.id === this.coefForm.installation);
      const kw = installation ? kwOf(this.coefForm.coefficient, installation.power_kw) : null;
      const n = parseCoefficient(this.coefForm.coefficient);
      if (!Number.isFinite(n)) return "Amb coma o punt, fins a 6 decimals";
      return `${formatShare(n)}${kw !== null ? ` · ${formatKw(kw)}` : ""}`;
    }
  },
  watch: {
    id() {
      this.load();
    }
  },
  async mounted() {
    await Promise.all([this.load(), this.loadInstallations()]);
  },
  methods: {
    formatCups,
    formatCoefficient,
    formatShare,
    formatKw,
    coefficientError,
    dateLabel(d) {
      return d ? moment(d).format("DD/MM/YYYY") : "";
    },
    setPartner(partner) {
      this.partner = partner;
      this.form = Object.fromEntries(FIELDS.map(f => [f, partner[f] ?? (f === "privacy_accepted" ? false : null)]));
      this.form.capital_contributions = (partner.capital_contributions || []).map(c => ({ ...c }));
      this.saved = JSON.stringify(this.form);
    },
    async load() {
      this.isLoading = true;
      this.notFound = false;
      try {
        this.setPartner(await service({ requiresAuth: true, cached: false }).get(`energy/partners/${this.id}`).then(r => r.data));
      } catch (e) {
        if (e?.response?.status === 404) this.notFound = true;
        else throw e;
      } finally {
        this.isLoading = false;
      }
    },
    async loadInstallations() {
      this.installations = await service({ requiresAuth: true, cached: false }).get("energy/installations").then(r => r.data);
    },
    notify(message, type = "is-success") {
      this.$buefy.snackbar.open({ message, type, queue: false });
    },
    async run(fn, ok, fail) {
      this.saving = true;
      try {
        const partner = await fn();
        if (partner && partner.supplies) this.setPartner(partner);
        else await this.load();
        if (ok) this.notify(ok);
        return true;
      } catch (e) {
        this.notify(errorMessage(e, fail), "is-danger");
        return false;
      } finally {
        this.saving = false;
      }
    },
    savePartner() {
      if (this.form.capital_contributions.some(contributionError)) {
        this.notify("L'import d'una aportació ha de ser un número", "is-danger");
        return false;
      }
      const data = { ...this.form, capital_contributions: cleanContributions(this.form.capital_contributions) };
      return this.run(
        () => service({ requiresAuth: true }).put(`energy/partners/${this.partner.id}`, data).then(r => r.data),
        "Dades desades",
        "No s'han pogut desar les dades"
      );
    },
    openSupply(s) {
      this.supplyForm = s
        ? { id: s.id, cups: s.cups, holder_name: s.holder_name, address: s.address, city: s.city, submitted: s.submitted, active: s.active, notes: s.notes }
        : { id: null, cups: "", holder_name: "", address: this.partner.address, city: this.partner.city, submitted: false, active: true, notes: "" };
      this.isSupplyOpen = true;
    },
    async saveSupply() {
      const { id, ...data } = this.supplyForm;
      const ok = await this.run(
        () =>
          id
            ? service({ requiresAuth: true }).put(`energy/supplies/${id}`, data)
            : service({ requiresAuth: true }).post("energy/supplies", { ...data, contact: this.partner.id }),
        "CUPS desat",
        "No s'ha pogut desar el CUPS"
      );
      if (ok) this.isSupplyOpen = false;
    },
    removeSupply(s) {
      this.$buefy.dialog.confirm({
        title: "Esborrar el CUPS",
        message: `S'esborrarà ${s.cups}. No té coeficients.`,
        confirmText: "Esborra",
        cancelText: "Cancel·la",
        type: "is-danger",
        onConfirm: () => this.run(() => service({ requiresAuth: true }).delete(`energy/supplies/${s.id}`), "CUPS esborrat", "No s'ha pogut esborrar")
      });
    },
    openCoefficient(s, c) {
      this.coefSubmitted = false;
      this.coefForm = c
        ? {
            id: c.id,
            cups: s.cups,
            installation: c.installation && c.installation.id,
            coefficient: String(c.coefficient).replace(".", ","),
            start_date: c.start_date,
            end_date: c.end_date,
            notes: c.notes
          }
        : {
            id: null,
            supply: s.id,
            cups: s.cups,
            installation: this.installations.length === 1 ? this.installations[0].id : null,
            coefficient: "",
            start_date: moment().format("YYYY-MM-DD"),
            notes: ""
          };
      this.isCoefOpen = true;
    },
    async saveCoefficient() {
      this.coefSubmitted = true;
      if (coefficientError(this.coefForm.coefficient) || !this.coefForm.installation || !this.coefForm.start_date) return;
      const { id, cups, ...data } = this.coefForm;
      const ok = await this.run(
        () =>
          (id
            ? service({ requiresAuth: true }).put(`energy/coefficients/${id}`, data)
            : service({ requiresAuth: true }).post("energy/coefficients", data)
          ).then(r => r.data),
        "Coeficient desat",
        "No s'ha pogut desar el coeficient"
      );
      if (ok) this.isCoefOpen = false;
    },
    removeCoefficient(c) {
      this.$buefy.dialog.confirm({
        title: "Esborrar el coeficient",
        message: `S'esborrarà aquest tram (${this.dateLabel(c.start_date)}${c.end_date ? ` – ${this.dateLabel(c.end_date)}` : ""}). Si el tram anterior es va tancar per aquest canvi, torna a quedar obert.`,
        confirmText: "Esborra",
        cancelText: "Cancel·la",
        type: "is-danger",
        onConfirm: () =>
          this.run(() => service({ requiresAuth: true }).delete(`energy/coefficients/${c.id}`).then(r => r.data), "Coeficient esborrat", "No s'ha pogut esborrar")
      });
    },
    async saveDocuments(ids, ok) {
      return this.run(
        () => service({ requiresAuth: true }).put(`energy/partners/${this.partner.id}`, { documents: ids }).then(r => r.data),
        ok,
        "No s'han pogut desar els documents"
      );
    },
    async upload(files) {
      const list = Array.isArray(files) ? files : [files];
      if (!list.length) return;
      this.uploading = true;
      try {
        const formData = new FormData();
        for (const f of list) formData.append("files", f, f.name);
        const uploaded = await service({ requiresAuth: true, multipart: true }).post("upload", formData).then(r => r.data);
        const ids = [...this.partner.documents.map(d => d.id), ...uploaded.map(d => d.id)];
        await this.saveDocuments(ids, uploaded.length === 1 ? "Document pujat" : `${uploaded.length} documents pujats`);
      } catch (e) {
        this.notify(errorMessage(e, "No s'ha pogut pujar"), "is-danger");
      } finally {
        this.uploading = false;
        this.picked = [];
      }
    },
    removeDocument(doc) {
      this.$buefy.dialog.confirm({
        title: "Treure el document",
        message: `Es traurà ${doc.name} de la fitxa.`,
        confirmText: "Treu",
        cancelText: "Cancel·la",
        type: "is-danger",
        onConfirm: () => this.saveDocuments(this.partner.documents.filter(d => d.id !== doc.id).map(d => d.id), "Document tret")
      });
    }
  }
};
</script>

<style scoped>
.energy-partner .section {
  position: relative;
}
.epf-box {
  margin-bottom: 1.25rem;
}
.epf-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}
.epf-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.epf-head .epf-title {
  margin-bottom: 0;
}
.epf-actions {
  display: flex;
  justify-content: flex-end;
}
.epf-supply {
  border: 1px solid var(--a-line);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}
.epf-supply.is-off {
  opacity: 0.7;
}
.epf-supply-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.epf-cups {
  font-size: 0.95rem;
  font-weight: 700;
  background: none;
  padding: 0;
  margin-right: 0.4rem;
  color: var(--a-fg);
}
.epf-sub {
  display: block;
  color: var(--a-muted);
}
.epf-notes {
  white-space: pre-line;
}
.epf-buttons {
  display: flex;
  gap: 0.35rem;
}
.epf-coefs {
  font-size: 0.875rem;
  margin-bottom: 0;
}
.epf-coefs tr:not(.is-current) td {
  color: var(--a-muted);
}
.epf-row-actions {
  white-space: nowrap;
}
.epf-row-actions .button + .button {
  margin-left: 0.25rem;
}
.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.epf-muted {
  color: var(--a-muted);
}
.epf-intro {
  margin-bottom: 1rem;
}
.epf-modal {
  width: min(640px, 100vw - 2rem);
}
.box-empty {
  padding: 2rem;
  text-align: center;
  color: var(--a-muted);
}
</style>
