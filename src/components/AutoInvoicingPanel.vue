<template>
  <!-- The automatic monthly invoicing (issues/430): when it runs next, on which
       project, the last runs with their report; a preview of a month (nothing
       is written) and a run by hand. -->
  <section class="a-box auto-invoicing" data-test="auto-invoicing">
    <header class="box-head">
      <h2>Facturació automàtica</h2>
      <span v-if="state" class="box-hint">
        {{ state.project ? `Propera: ${runAtText} · ${state.monthName}` : "Desactivada" }}
      </span>
    </header>
    <b-loading :is-full-page="false" :model-value="isLoading" />

    <template v-if="state">
      <p v-if="state.project" class="box-help">
        El <b>{{ runAtText }}</b> es generaran els esborranys {{ ofMonth(state.monthName) }}, amb data {{ formatDay(state.invoiceDay) }},
        al projecte <router-link :to="{ name: 'project.edit', params: { id: state.project.id } }">{{ state.project.name }}</router-link>.
        Cal revisar-los i emetre'ls a Ingressos. L'informe s'envia per correu a l'adreça de les incidències.
      </p>
      <p v-else-if="state.autoProjects.length" class="notification is-warning is-light" data-test="no-project">
        Cap projecte amb «Habilitar facturació automàtica» no inclou el {{ formatDay(state.invoiceDay) }}: aquest mes no es generarà res.
        Activa-ho al projecte de logística del trimestre.
      </p>
      <p v-else class="box-help" data-test="disabled">
        Per activar-la, marca «Habilitar facturació automàtica» al projecte de logística del trimestre (les seves dates han d'incloure l'últim dia del mes).
      </p>
      <p v-if="state.otherProjects.length" class="notification is-warning is-light">
        També tenen l'opció i inclouen aquest dia: {{ state.otherProjects.map(p => p.name).join(", ") }}. Només es fa servir el primer.
      </p>

      <div class="auto-actions">
        <b-field label="Mes">
          <b-select v-model="month" size="is-small" aria-label="Mes" data-test="auto-month">
            <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </b-select>
        </b-field>
        <b-button size="is-small" icon-left="eye-outline" :loading="isPreviewing" data-test="auto-preview" @click="preview">Previsualitza</b-button>
        <b-button size="is-small" type="is-primary" icon-left="play" :loading="isRunning" data-test="auto-run" @click="confirmRun">Genera ara</b-button>
      </div>

      <auto-invoicing-report v-if="report" :report="report" data-test="auto-report" />

      <div v-if="state.runs.length" class="runs">
        <h3>Darreres execucions</h3>
        <ul>
          <li v-for="r in state.runs" :key="r.id">
            <span class="tag" :class="statusTag(r.status)">{{ statusLabel(r.status) }}</span>
            <b>{{ monthLabel(r.month) }}</b>
            <small>{{ r.trigger === "cron" ? "automàtica" : `a mà${r.user ? `, ${r.user}` : ""}` }} · {{ formatDateTime(r.finished_at || r.started_at) }}</small>
            <button v-if="r.report && r.report.members" type="button" class="link-button" @click="report = { ...r.report, preview: false }">Informe</button>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import AutoInvoicingReport from "@/components/AutoInvoicingReport.vue";
import { refusalMessage } from "@/domain/collectionGroup";
import { autoRunLabel, autoRunTag, monthOptions, ofMonth } from "@/domain/autoInvoicing";

export default {
  name: "AutoInvoicingPanel",
  components: { AutoInvoicingReport },
  emits: ["invoiced"],
  data() {
    return {
      isLoading: true,
      isPreviewing: false,
      isRunning: false,
      state: null,
      report: null,
      month: moment().format("YYYY-MM"),
      monthOptions: monthOptions(new Date())
    };
  },
  computed: {
    runAtText() {
      if (!this.state) return "";
      return moment(this.state.runAt, "YYYY-MM-DD HH:mm").locale("ca").format("dddd D/MM/YYYY [a les] HH:mm");
    }
  },
  mounted() {
    this.load();
  },
  methods: {
    ofMonth,
    statusLabel: autoRunLabel,
    statusTag: autoRunTag,
    async load() {
      this.isLoading = true;
      try {
        this.state = (await service({ requiresAuth: true }).get("auto-invoicing/status")).data;
      } catch (e) {
        this.state = null;
      } finally {
        this.isLoading = false;
      }
    },
    async preview() {
      this.isPreviewing = true;
      try {
        this.report = (await service({ requiresAuth: true }).post("auto-invoicing/preview", { month: this.month })).data;
      } catch (e) {
        this.$buefy.snackbar.open({ message: refusalMessage(e, "No s'ha pogut previsualitzar"), type: "is-danger", queue: false });
      } finally {
        this.isPreviewing = false;
      }
    },
    confirmRun() {
      this.$buefy.dialog.confirm({
        title: "Generar els esborranys",
        message: `Es generaran ara els esborranys ${ofMonth(this.monthLabel(this.month))} de totes les comandes encara no facturades, i s'enviarà l'informe per correu. Vols continuar?`,
        confirmText: "Genera",
        cancelText: "Cancel·la",
        onConfirm: () => this.run()
      });
    },
    async run() {
      this.isRunning = true;
      try {
        this.report = (await service({ requiresAuth: true }).post("auto-invoicing/run", { month: this.month })).data;
        this.$buefy.snackbar.open({ message: `${this.report.drafts} esborranys generats`, type: "is-success", queue: false });
        await this.load();
        this.$emit("invoiced");
      } catch (e) {
        this.$buefy.snackbar.open({ message: refusalMessage(e, "No s'ha pogut generar"), type: "is-danger", queue: false });
      } finally {
        this.isRunning = false;
      }
    },
    monthLabel(month) {
      return moment(`${month}-01`, "YYYY-MM-DD").locale("ca").format("MMMM YYYY");
    },
    formatDay(day) {
      return day ? moment(day, "YYYY-MM-DD").format("DD/MM/YYYY") : "";
    },
    formatDateTime(value) {
      return value ? moment(value).format("DD/MM/YYYY HH:mm") : "";
    }
  }
};
</script>

<style scoped>
.auto-invoicing {
  margin-bottom: 1rem;
}
.box-hint {
  color: var(--a-muted);
  font-size: .875rem;
}
.auto-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: .5rem;
  margin: .75rem 0;
}
.auto-actions :deep(.field) {
  margin-bottom: 0;
}
.runs h3 {
  font-weight: 600;
  margin: .75rem 0 .25rem;
}
.runs li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  padding: .25rem 0;
}
.runs small {
  color: var(--a-muted);
}
.link-button {
  background: none;
  border: 0;
  padding: 0;
  color: var(--a-accent);
  text-decoration: underline;
  cursor: pointer;
}
</style>
