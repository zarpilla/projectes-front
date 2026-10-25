<template>
  <!-- Comunitat energètica: the members (contacts with the «Sòcia» type), their
       CUPS and the coefficients in force today. projectes-v5 api/energy. -->
  <div class="energy-partners">
    <title-bar :title-stack="['Comunitat energètica', 'Sòcies i CUPS']" :subtitle="headline">
      <download-excel name="socies-cups" :data="exportRows" :fields="exportFields">
        <b-button icon-left="download" :disabled="!partners.length">Exporta</b-button>
      </download-excel>
      <b-button type="is-primary" icon-left="plus" @click="openNew">Nova sòcia</b-button>
    </title-bar>

    <section class="section is-main-section">
      <div class="ep-filters">
        <b-input
          v-model="search"
          icon="magnify"
          placeholder="Cerca per nom, NIF, correu, telèfon o CUPS"
          aria-label="Cerca"
          class="ep-search"
        />
        <b-checkbox v-model="showLeft">Mostra les baixes</b-checkbox>
        <b-checkbox v-model="onlyWarnings">Només amb avisos</b-checkbox>
      </div>

      <section class="a-box ep-box">
        <b-loading :is-full-page="false" :model-value="isLoading" />
        <div class="table-container">
          <table class="table is-fullwidth is-hoverable">
            <thead>
              <tr>
                <th>Sòcia</th>
                <th>Contacte</th>
                <th>CUPS</th>
                <th>Coeficients vigents</th>
                <th>Alta</th>
                <th class="has-text-centered">Docs</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in shown"
                :key="p.id"
                :class="{ 'is-inactive': !isActivePartner(p, today) }"
                class="ep-row"
                @click="open(p)"
              >
                <td>
                  <router-link :to="{ name: 'energy.partner', params: { id: p.id } }" @click.stop>
                    <b>{{ p.name }}</b>
                  </router-link>
                  <small class="ep-sub">{{ p.nif || "Sense NIF" }}</small>
                  <b-tag v-if="p.leave_date" type="is-light" size="is-small">Baixa {{ dateLabel(p.leave_date) }}</b-tag>
                </td>
                <td>
                  <small class="ep-line">{{ p.email || "—" }}</small>
                  <small class="ep-line">{{ p.phone || "" }}</small>
                </td>
                <td>
                  <div v-for="s in p.supplies" :key="s.id" class="ep-cups" :class="{ 'is-off': !s.active }">
                    <code>{{ s.cups }}</code>
                    <b-tooltip v-if="!s.cups_valid" :label="s.cups_problem" type="is-warning" append-to-body>
                      <b-icon icon="alert" type="is-warning" size="is-small" />
                    </b-tooltip>
                    <b-tag v-if="s.submitted" type="is-success is-light" size="is-small">Enviat</b-tag>
                    <b-tag v-if="!s.active" type="is-light" size="is-small">Inactiu</b-tag>
                  </div>
                  <small v-if="!p.supplies.length" class="has-text-warning-dark">Sense CUPS</small>
                </td>
                <td>
                  <div v-for="c in currentCoefficients(p)" :key="c.key" class="ep-coef">
                    <span>{{ c.installation }}</span>
                    <b>{{ formatShare(c.coefficient) }}</b>
                    <small v-if="c.kw !== null">{{ formatKw(c.kw) }}</small>
                  </div>
                  <small v-if="!currentCoefficients(p).length" class="ep-muted">—</small>
                </td>
                <td><small>{{ dateLabel(p.join_date) || "—" }}</small></td>
                <td class="has-text-centered"><small>{{ p.documents_count || "—" }}</small></td>
              </tr>
              <tr v-if="!isLoading && !shown.length">
                <td colspan="6" class="box-empty">
                  {{ partners.length ? "Cap sòcia coincideix amb la cerca." : "Encara no hi ha cap sòcia. Crea'n una amb «Nova sòcia»." }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <b-modal v-model="isNewOpen" has-modal-card aria-role="dialog" aria-modal>
      <form class="modal-card ep-new" @submit.prevent="create">
        <header class="modal-card-head">
          <p class="modal-card-title">Nova sòcia</p>
        </header>
        <section class="modal-card-body">
          <b-field label="Nom i cognoms (o raó social)">
            <b-input ref="newName" v-model="newPartner.name" required />
          </b-field>
          <b-field label="NIF">
            <b-input v-model="newPartner.nif" />
          </b-field>
          <b-field label="Data d'alta">
            <date-field v-model="newPartner.join_date" />
          </b-field>
          <p class="ep-muted">Després hi podràs afegir els CUPS, els coeficients i la documentació.</p>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="isNewOpen = false">Cancel·la</button>
          <b-button type="is-primary" native-type="submit" :loading="saving">Crea</b-button>
        </footer>
      </form>
    </b-modal>
  </div>
</template>

<script>
import moment from "moment";
import TitleBar from "@/components/TitleBar.vue";
import DateField from "@/components/DateField.vue";
import service from "@/service/index";
import { filterPartners, formatShare, formatKw, isActivePartner } from "@/domain/energy";

export default {
  name: "EnergyPartners",
  components: { TitleBar, DateField },
  data() {
    return {
      isLoading: false,
      saving: false,
      partners: [],
      search: "",
      showLeft: false,
      onlyWarnings: false,
      isNewOpen: false,
      newPartner: { name: "", nif: "", join_date: null },
      today: moment().format("YYYY-MM-DD")
    };
  },
  computed: {
    shown() {
      let list = filterPartners(this.partners, this.search);
      if (!this.showLeft) list = list.filter(p => isActivePartner(p, this.today));
      if (this.onlyWarnings) list = list.filter(p => this.hasWarning(p));
      return list;
    },
    headline() {
      if (this.isLoading) return "";
      const active = this.partners.filter(p => isActivePartner(p, this.today));
      const cups = active.reduce((n, p) => n + p.supplies.filter(s => s.active).length, 0);
      const warnings = this.partners.filter(p => this.hasWarning(p)).length;
      return `${active.length} sòcies · ${cups} CUPS actius${warnings ? ` · ${warnings} amb avisos` : ""}`;
    },
    exportFields() {
      return {
        Sòcia: "name",
        NIF: "nif",
        Correu: "email",
        Telèfon: "phone",
        Adreça: "address",
        Població: "city",
        "Data d'alta": "join_date",
        "Data de baixa": "leave_date",
        Privacitat: "privacy",
        "Capital aportat (€)": "capital",
        "Darrera aportació": "capital_date",
        CUPS: "cups",
        "CUPS correcte": "cups_ok",
        Titular: "holder_name",
        Enviat: "submitted",
        Coeficients: "coefficients"
      };
    },
    // one row per CUPS (and one for a member without any)
    exportRows() {
      return this.partners.flatMap(p => {
        const base = {
          name: p.name,
          nif: p.nif,
          email: p.email,
          phone: p.phone,
          address: p.address,
          city: p.city,
          join_date: p.join_date,
          leave_date: p.leave_date,
          privacy: p.privacy_accepted ? "Sí" : "No",
          capital: p.partner_amount === null || p.partner_amount === undefined ? null : Number(p.partner_amount),
          capital_date: p.partner_amount_date
        };
        if (!p.supplies.length) return [base];
        return p.supplies.map(s => ({
          ...base,
          cups: s.cups,
          cups_ok: s.cups_valid ? "Sí" : "No",
          holder_name: s.holder_name,
          submitted: s.submitted ? "Sí" : "No",
          coefficients: s.coefficients.map(c => `${c.installation ? c.installation.name : "?"} ${c.coefficient}`).join("; ")
        }));
      });
    }
  },
  async mounted() {
    await this.getData();
  },
  methods: {
    formatShare,
    formatKw,
    isActivePartner,
    async getData() {
      this.isLoading = true;
      try {
        this.partners = await service({ requiresAuth: true, cached: false }).get("energy/partners").then(r => r.data);
      } finally {
        this.isLoading = false;
      }
    },
    hasWarning(p) {
      return !p.supplies.length || p.supplies.some(s => !s.cups_valid) || !p.nif;
    },
    // per installation: the coefficients of all her CUPS added up
    currentCoefficients(p) {
      const sums = new Map();
      for (const s of p.supplies) {
        for (const c of s.coefficients) {
          const key = c.installation ? c.installation.id : 0;
          const row = sums.get(key) || { key, installation: c.installation ? c.installation.name : "?", coefficient: 0, kw: null };
          row.coefficient += Number(c.coefficient);
          if (c.kw !== null) row.kw = (row.kw || 0) + c.kw;
          sums.set(key, row);
        }
      }
      return [...sums.values()];
    },
    dateLabel(d) {
      return d ? moment(d).format("DD/MM/YYYY") : "";
    },
    open(p) {
      this.$router.push({ name: "energy.partner", params: { id: p.id } });
    },
    openNew() {
      this.newPartner = { name: "", nif: "", join_date: this.today };
      this.isNewOpen = true;
    },
    async create() {
      if (!this.newPartner.name.trim()) return;
      this.saving = true;
      try {
        const created = await service({ requiresAuth: true }).post("energy/partners", this.newPartner).then(r => r.data);
        this.isNewOpen = false;
        this.$router.push({ name: "energy.partner", params: { id: created.id } });
      } catch (e) {
        const message = e?.response?.data?.error?.message || "No s'ha pogut crear la sòcia";
        this.$buefy.snackbar.open({ message, type: "is-danger", queue: false });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.ep-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
  margin-bottom: 1rem;
}
.ep-search {
  flex: 1 1 18rem;
  max-width: 32rem;
}
.ep-box {
  position: relative;
  padding: 0;
  overflow: hidden;
}
.ep-row {
  cursor: pointer;
}
.ep-sub,
.ep-line {
  display: block;
  color: var(--a-muted);
}
.ep-cups {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
}
.ep-cups code {
  font-size: 0.8rem;
  background: none;
  padding: 0;
  color: var(--a-fg);
}
.ep-cups.is-off code {
  color: var(--a-muted);
  text-decoration: line-through;
}
.ep-coef {
  display: flex;
  gap: 0.4rem;
  align-items: baseline;
  white-space: nowrap;
}
.ep-coef small,
.ep-muted {
  color: var(--a-muted);
}
.is-inactive td {
  color: var(--a-muted);
}
.ep-new {
  width: min(520px, 100vw - 2rem);
}
.box-empty {
  padding: 2rem !important;
  text-align: center;
  color: var(--a-muted);
}
</style>
