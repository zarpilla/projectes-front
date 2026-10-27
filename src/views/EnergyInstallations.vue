<template>
  <!-- Comunitat energètica: the installations, their power and how it is
       shared among the CUPS on a day (the history of coefficients). A new
       distribution from a date closes the coefficients in force the day before.
       projectes-v5 api/energy. -->
  <div class="energy-installations">
    <title-bar :title-stack="['Comunitat energètica', 'Instal·lacions i coeficients']" :subtitle="headline">
      <b-button type="is-primary" icon-left="plus" @click="openInstallation(null)">Nova instal·lació</b-button>
    </title-bar>

    <section class="section is-main-section">
      <b-loading :is-full-page="false" :model-value="isLoading" />

      <div class="ei-cards">
        <button
          v-for="i in installations"
          :key="i.id"
          type="button"
          class="a-box ei-card"
          :class="{ 'is-selected': selected && selected.id === i.id, 'is-inactive': !i.active }"
          @click="select(i)"
        >
          <span class="ei-card-name">{{ i.name }}</span>
          <span class="ei-card-power">{{ i.power_kw ? formatKw(i.power_kw) : "Potència per definir" }}</span>
          <span class="ei-card-line">
            <b :class="{ 'has-text-danger': i.over }">{{ formatShare(i.sum) }}</b> repartit · {{ i.supplies_count }} CUPS
          </span>
          <progress class="progress is-small" :class="i.over ? 'is-danger' : 'is-info'" :value="Math.min(i.sum, 1)" max="1" />
          <small v-if="i.next_change" class="ei-card-next">Canvi programat el {{ dateLabel(i.next_change) }}</small>
        </button>
        <p v-if="!isLoading && !installations.length" class="a-box box-empty">Encara no hi ha cap instal·lació.</p>
      </div>

      <section v-if="selected" class="a-box ei-box">
        <div class="ei-head">
          <div>
            <h2 class="ei-title">{{ selected.name }}</h2>
            <small class="ei-muted">
              {{ [selected.power_kw ? formatKw(selected.power_kw) : "Sense potència", selected.cau ? `CAU ${selected.cau}` : null, selected.address].filter(Boolean).join(" · ") }}
            </small>
          </div>
          <div class="ei-buttons">
            <b-button size="is-small" icon-left="pencil" @click="openInstallation(selected)">Edita</b-button>
            <b-button size="is-small" icon-left="table-edit" type="is-primary" :disabled="editing" @click="startEditing">Nou repartiment</b-button>
          </div>
        </div>

        <!-- a day of the history -->
        <div v-if="!editing" class="ei-date">
          <b-field label="Repartiment a data" horizontal>
            <date-field v-model="date" />
          </b-field>
          <div v-if="dist && dist.change_dates.length" class="ei-changes">
            <small class="ei-muted">Canvis:</small>
            <b-button
              v-for="d in dist.change_dates"
              :key="d"
              size="is-small"
              :type="d === date ? 'is-info' : ''"
              @click="date = d"
            >{{ dateLabel(d) }}</b-button>
          </div>
        </div>

        <template v-if="!editing && dist">
          <div class="table-container">
            <table class="table is-fullwidth is-narrow ei-table">
              <thead>
                <tr>
                  <th>Sòcia</th>
                  <th>CUPS</th>
                  <th class="has-text-right">Coeficient</th>
                  <th class="has-text-right">%</th>
                  <th class="has-text-right">Potència</th>
                  <th>Des de</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in dist.rows" :key="r.id">
                  <td>
                    <router-link :to="{ name: 'energy.partner', params: { id: r.partner_id } }">{{ r.partner_name }}</router-link>
                    <small v-if="r.holder_name" class="ei-sub">Titular: {{ r.holder_name }}</small>
                  </td>
                  <td>
                    <code>{{ r.cups }}</code>
                    <b-icon v-if="!r.cups_valid" icon="alert" type="is-warning" size="is-small" />
                  </td>
                  <td class="has-text-right num">{{ formatCoefficient(r.coefficient) }}</td>
                  <td class="has-text-right num">{{ formatShare(r.coefficient) }}</td>
                  <td class="has-text-right num">{{ formatKw(r.kw) }}</td>
                  <td>{{ dateLabel(r.start_date) }}</td>
                </tr>
                <tr v-if="!dist.rows.length">
                  <td colspan="6" class="box-empty">Cap CUPS té coeficient en aquesta instal·lació el {{ dateLabel(date) }}.</td>
                </tr>
              </tbody>
              <tfoot v-if="dist.rows.length">
                <tr>
                  <th colspan="2">Total · {{ dist.rows.length }} CUPS</th>
                  <th class="has-text-right num" :class="{ 'has-text-danger': dist.over }">{{ formatCoefficient(dist.sum) }}</th>
                  <th class="has-text-right num" :class="{ 'has-text-danger': dist.over }">{{ formatShare(dist.sum) }}</th>
                  <th class="has-text-right num">{{ formatKw(dist.kw_assigned) }}</th>
                  <th>
                    <small v-if="dist.over" class="has-text-danger">Passa d'1</small>
                    <small v-else-if="dist.free > 0" class="ei-muted">Lliure {{ formatShare(dist.free) }}</small>
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-if="dist.rows.length" class="ei-exports">
            <download-excel :name="`coeficients-${slug}-${date}`" :data="exportRows" :fields="exportFields">
              <b-button size="is-small" icon-left="download">Exporta el full</b-button>
            </download-excel>
            <b-button size="is-small" icon-left="file-document-outline" @click="downloadTxt">Fitxer CUPS;coeficient (.txt)</b-button>
          </div>
        </template>

        <!-- a new distribution -->
        <template v-if="editing">
          <div class="ei-edit-head">
            <b-field label="Vigent des de" :message="`Els coeficients vigents es tancaran el dia abans. Els CUPS que no surtin aquí deixen la instal·lació.`">
              <date-field v-model="draft.start_date" />
            </b-field>
            <div class="ei-buttons">
              <b-button size="is-small" icon-left="equal" :disabled="!draft.rows.length" @click="equalShares">Parts iguals</b-button>
            </div>
          </div>
          <div class="table-container">
            <table class="table is-fullwidth is-narrow ei-table">
              <thead>
                <tr>
                  <th>Sòcia</th>
                  <th>CUPS</th>
                  <th class="ei-input-col">Coeficient</th>
                  <th class="has-text-right">%</th>
                  <th class="has-text-right">Potència</th>
                  <th><span class="is-sr-only">Treu</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, k) in draft.rows" :key="r.supply">
                  <td>{{ r.partner_name }}</td>
                  <td><code>{{ r.cups }}</code></td>
                  <td>
                    <b-input
                      v-model="r.coefficient"
                      size="is-small"
                      inputmode="decimal"
                      :class="{ 'is-danger': coefficientError(r.coefficient) }"
                      :aria-label="`Coeficient de ${r.cups}`"
                    />
                  </td>
                  <td class="has-text-right num">{{ Number.isFinite(parseCoefficient(r.coefficient)) ? formatShare(parseCoefficient(r.coefficient)) : "—" }}</td>
                  <td class="has-text-right num">{{ formatKw(kwOf(r.coefficient, selected.power_kw)) }}</td>
                  <td class="has-text-right">
                    <b-button size="is-small" icon-left="close" :aria-label="`Treu ${r.cups}`" @click="draft.rows.splice(k, 1)" />
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="2">Total · {{ draft.rows.length }} CUPS</th>
                  <th class="num" :class="{ 'has-text-danger': draftSum > 1 }">{{ formatCoefficient(draftSum) }}</th>
                  <th class="has-text-right num" :class="{ 'has-text-danger': draftSum > 1 }">{{ formatShare(draftSum) }}</th>
                  <th class="has-text-right num">{{ formatKw(kwOf(draftSum, selected.power_kw)) }}</th>
                  <th />
                </tr>
              </tfoot>
            </table>
          </div>
          <b-field label="Afegeix un CUPS" class="ei-add">
            <b-autocomplete
              v-model="addText"
              :data="addOptions"
              field="label"
              placeholder="Cerca per sòcia o CUPS"
              clearable
              open-on-focus
              append-to-body
              @select="addSupply"
            />
          </b-field>
          <b-message v-if="draftSum > 1" type="is-warning" size="is-small">
            Els coeficients sumen més d'1: es pot desar, però la distribuïdora no ho acceptarà.
          </b-message>
          <div class="ei-edit-actions">
            <button class="button" type="button" @click="editing = false">Cancel·la</button>
            <b-button type="is-primary" :loading="saving" :disabled="!draft.start_date || draftInvalid" @click="saveDraft">Desa el repartiment</b-button>
          </div>
        </template>
      </section>
    </section>

    <!-- an installation -->
    <b-modal v-model="isInstallationOpen" has-modal-card aria-role="dialog" aria-modal>
      <form class="modal-card ei-modal" @submit.prevent="saveInstallation">
        <header class="modal-card-head">
          <p class="modal-card-title">{{ installationForm.id ? `Edita ${installationForm.name}` : "Nova instal·lació" }}</p>
        </header>
        <section class="modal-card-body">
          <div class="columns">
            <b-field class="column is-8" label="Nom">
              <b-input v-model="installationForm.name" required />
            </b-field>
            <b-field class="column is-4" label="Potència (kW)">
              <b-input v-model="installationForm.power_kw" type="number" step="0.01" min="0" />
            </b-field>
          </div>
          <div class="columns">
            <b-field class="column is-6" label="CAU" message="Codi d'autoconsum de la distribuïdora">
              <b-input v-model="installationForm.cau" />
            </b-field>
            <b-field class="column is-6" label="En marxa des de">
              <date-field v-model="installationForm.start_date" />
            </b-field>
          </div>
          <b-field label="Adreça">
            <b-input v-model="installationForm.address" />
          </b-field>
          <b-field>
            <b-switch v-model="installationForm.active">{{ installationForm.active ? "Activa" : "Inactiva" }}</b-switch>
          </b-field>
          <b-field label="Notes">
            <b-input v-model="installationForm.notes" type="textarea" rows="2" />
          </b-field>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="isInstallationOpen = false">Cancel·la</button>
          <b-button type="is-primary" native-type="submit" :loading="saving">Desa</b-button>
        </footer>
      </form>
    </b-modal>
  </div>
</template>

<script>
import moment from "moment";
import download from "downloadjs";
import TitleBar from "@/components/TitleBar.vue";
import DateField from "@/components/DateField.vue";
import service from "@/service/index";
import {
  formatCoefficient,
  formatShare,
  formatKw,
  coefficientError,
  parseCoefficient,
  distributionSum,
  kwOf,
  coefficientsFile,
  normalizeCups
} from "@/domain/energy";

const errorMessage = (e, fallback) => e?.response?.data?.error?.message || fallback;

export default {
  name: "EnergyInstallations",
  components: { TitleBar, DateField },
  data() {
    return {
      isLoading: false,
      saving: false,
      installations: [],
      selected: null,
      date: moment().format("YYYY-MM-DD"),
      dist: null,
      partners: [],
      editing: false,
      draft: { start_date: null, rows: [] },
      addText: "",
      isInstallationOpen: false,
      installationForm: {}
    };
  },
  computed: {
    headline() {
      if (this.isLoading) return "";
      const power = this.installations.reduce((s, i) => s + Number(i.power_kw || 0), 0);
      return `${this.installations.length} instal·lacions${power ? ` · ${formatKw(power)}` : ""}`;
    },
    slug() {
      return String(this.selected?.name || "installacio").normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();
    },
    draftSum() {
      return distributionSum(this.draft.rows);
    },
    draftInvalid() {
      return this.draft.rows.some(r => coefficientError(r.coefficient));
    },
    // the active CUPS of current members not yet in the draft
    addOptions() {
      const taken = new Set(this.draft.rows.map(r => r.supply));
      const q = this.addText.trim().toLowerCase();
      const qCups = normalizeCups(this.addText);
      return this.partners
        .filter(p => !p.leave_date)
        .flatMap(p => p.supplies.filter(s => s.active && !taken.has(s.id)).map(s => ({
          supply: s.id,
          cups: s.cups,
          partner_name: p.name,
          label: `${p.name} · ${s.cups}`
        })))
        .filter(o => !q || o.partner_name.toLowerCase().includes(q) || (qCups && o.cups.includes(qCups)))
        .slice(0, 30);
    },
    exportFields() {
      return { Sòcia: "partner_name", NIF: "partner_nif", Titular: "holder_name", CUPS: "cups", Coeficient: "coefficient", "Potència (kW)": "kw", "Des de": "start_date" };
    },
    exportRows() {
      return (this.dist?.rows || []).map(r => ({ ...r }));
    }
  },
  watch: {
    date() {
      if (this.selected) this.loadDistribution();
    }
  },
  async mounted() {
    this.isLoading = true;
    try {
      await this.loadInstallations();
      if (this.installations.length) await this.select(this.installations[0]);
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    formatCoefficient,
    formatShare,
    formatKw,
    coefficientError,
    parseCoefficient,
    kwOf,
    dateLabel(d) {
      return d ? moment(d).format("DD/MM/YYYY") : "";
    },
    notify(message, type = "is-success") {
      this.$buefy.snackbar.open({ message, type, queue: false });
    },
    async loadInstallations() {
      this.installations = await service({ requiresAuth: true, cached: false })
        .get(`energy/installations?date=${moment().format("YYYY-MM-DD")}`)
        .then(r => r.data);
      if (this.selected) this.selected = this.installations.find(i => i.id === this.selected.id) || null;
    },
    async loadDistribution() {
      if (!this.selected || !this.date) return;
      this.dist = await service({ requiresAuth: true, cached: false })
        .get(`energy/installations/${this.selected.id}/distribution?date=${this.date}`)
        .then(r => r.data);
    },
    async select(i) {
      this.selected = i;
      this.editing = false;
      await this.loadDistribution();
    },
    async startEditing() {
      if (!this.partners.length) {
        this.partners = await service({ requiresAuth: true, cached: false }).get("energy/partners").then(r => r.data);
      }
      // from the last distribution (today's, or one already set for later)
      const today = moment().format("YYYY-MM-DD");
      const latest = this.selected.next_change ? (this.dist?.change_dates || [])[0] || today : today;
      const from = latest > today ? latest : today;
      const current = await service({ requiresAuth: true, cached: false })
        .get(`energy/installations/${this.selected.id}/distribution?date=${from}`)
        .then(r => r.data);
      const nextMonth = moment().add(1, "month").startOf("month").format("YYYY-MM-DD");
      this.draft = {
        start_date: from > today ? from : nextMonth,
        rows: current.rows.map(r => ({
          supply: r.supply,
          cups: r.cups,
          partner_name: r.partner_name,
          coefficient: String(r.coefficient).replace(".", ",")
        }))
      };
      this.addText = "";
      this.editing = true;
    },
    addSupply(option) {
      if (!option) return;
      this.draft.rows.push({ supply: option.supply, cups: option.cups, partner_name: option.partner_name, coefficient: "" });
      this.$nextTick(() => { this.addText = ""; });
    },
    // 1 / n each, the remainder on the first so they add up to exactly 1
    equalShares() {
      const n = this.draft.rows.length;
      const each = Math.floor(1e6 / n) / 1e6;
      const first = Math.round((1 - each * (n - 1)) * 1e6) / 1e6;
      this.draft.rows.forEach((r, k) => { r.coefficient = String(k === 0 ? first : each).replace(".", ","); });
    },
    async saveDraft() {
      this.saving = true;
      try {
        const rows = this.draft.rows.map(r => ({ supply: r.supply, coefficient: parseCoefficient(r.coefficient) }));
        await service({ requiresAuth: true }).post(`energy/installations/${this.selected.id}/distribution`, { start_date: this.draft.start_date, rows });
        this.editing = false;
        this.notify("Repartiment desat");
        await this.loadInstallations();
        if (this.date === this.draft.start_date) await this.loadDistribution();
        else this.date = this.draft.start_date;
      } catch (e) {
        this.notify(errorMessage(e, "No s'ha pogut desar el repartiment"), "is-danger");
      } finally {
        this.saving = false;
      }
    },
    downloadTxt() {
      download(coefficientsFile(this.dist.rows), `${this.slug}-${this.date}.txt`, "text/plain");
    },
    openInstallation(i) {
      this.installationForm = i
        ? { id: i.id, name: i.name, power_kw: i.power_kw, cau: i.cau, address: i.address, start_date: i.start_date, active: i.active !== false, notes: i.notes }
        : { id: null, name: "", power_kw: null, cau: "", address: "", start_date: null, active: true, notes: "" };
      this.isInstallationOpen = true;
    },
    async saveInstallation() {
      const { id, ...data } = this.installationForm;
      this.saving = true;
      try {
        const saved = id
          ? await service({ requiresAuth: true }).put(`energy/installations/${id}`, data).then(r => r.data)
          : await service({ requiresAuth: true }).post("energy/installations", data).then(r => r.data);
        this.isInstallationOpen = false;
        this.notify("Instal·lació desada");
        await this.loadInstallations();
        await this.select(this.installations.find(i => i.id === saved.id) || this.installations[0]);
      } catch (e) {
        this.notify(errorMessage(e, "No s'ha pogut desar la instal·lació"), "is-danger");
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.energy-installations .section {
  position: relative;
}
.ei-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.ei-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  text-align: left;
  cursor: pointer;
  border: 2px solid transparent;
  font: inherit;
  color: inherit;
}
.ei-card.is-selected {
  border-color: var(--a-accent);
}
.ei-card.is-inactive {
  opacity: 0.6;
}
.ei-card-name {
  font-weight: 700;
  font-size: 1.05rem;
}
.ei-card-power,
.ei-card-line {
  color: var(--a-muted);
  font-size: 0.875rem;
}
.ei-card-next {
  color: var(--a-info-fg);
}
.ei-card .progress {
  width: 100%;
  margin: 0.25rem 0 0;
}
.ei-box {
  position: relative;
}
.ei-head,
.ei-edit-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.ei-title {
  font-size: 1.1rem;
  font-weight: 700;
}
.ei-buttons {
  display: flex;
  gap: 0.35rem;
}
.ei-date {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.5rem;
  margin-bottom: 0.75rem;
}
.ei-date .field {
  margin-bottom: 0;
}
.ei-changes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}
.ei-table {
  font-size: 0.875rem;
}
.ei-table code {
  background: none;
  padding: 0;
  color: var(--a-fg);
  font-size: 0.8rem;
}
.ei-input-col {
  width: 9rem;
}
.ei-sub {
  display: block;
  color: var(--a-muted);
}
.ei-muted {
  color: var(--a-muted);
}
.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ei-exports {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ei-add {
  max-width: 32rem;
}
.ei-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.ei-modal {
  width: min(640px, 100vw - 2rem);
}
.box-empty {
  padding: 1.5rem !important;
  text-align: center;
  color: var(--a-muted);
}
</style>
