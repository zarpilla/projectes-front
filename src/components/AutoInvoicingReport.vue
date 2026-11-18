<template>
  <!-- The report of an automatic monthly invoicing run, or of a preview (issues/430). -->
  <div class="auto-report">
    <header class="report-head">
      <b>{{ report.preview ? "Previsualització" : "Informe" }} {{ ofMonth(report.monthName) }}</b>
      <small v-if="report.project">· projecte {{ report.project.name }} · factures del {{ formatDay(report.invoiceDay) }}</small>
    </header>

    <div v-if="report.fatal && report.fatal.length" class="notification is-danger is-light">
      <b>No {{ report.preview ? "es generaria" : "s'ha generat" }} cap esborrany:</b>
      <ul><li v-for="(f, i) in report.fatal" :key="i">{{ f }}</li></ul>
    </div>

    <div class="report-kpis">
      <div><span>{{ report.preview ? "Esborranys que es crearien" : "Esborranys creats" }}</span><b>{{ report.drafts }}</b></div>
      <div><span>Sòcies sense esborrany</span><b :class="{ 'has-text-neg': report.blocked }">{{ report.blocked }}</b></div>
      <div><span>Esborranys per revisar</span><b>{{ report.withWarnings }}</b></div>
      <div v-if="rec">
        <span>Quadrament amb Comandes</span>
        <b :class="rec.ok ? 'has-text-pos' : 'has-text-neg'">{{ rec.ok ? "Quadra" : "No quadra" }}</b>
        <small>{{ rec.expected.count }} comandes previstes, {{ money(rec.expected.amount) }}</small>
      </div>
    </div>

    <p v-if="rec" class="box-help">
      Comandes amb ruta prevista {{ ofMonth(report.monthName) }}: {{ rec.expected.count }} ({{ money(rec.expected.amount) }}).
      {{ report.preview ? "Es facturarien" : "Facturades" }} ara: {{ rec.invoicedNow.count }} ({{ money(rec.invoicedNow.amount) }});
      ja facturades abans: {{ rec.invoicedBefore.count }} ({{ money(rec.invoicedBefore.amount) }}).
      <template v-if="!rec.ok"> En falten {{ rec.missing.count }} ({{ money(rec.missing.amount) }}): {{ orderList(rec.missing.orders) }}.</template>
    </p>

    <div class="table-container">
      <table class="table is-fullwidth is-narrow report-table">
        <thead>
          <tr>
            <th>Sòcia</th>
            <th class="has-text-right">Comandes</th>
            <th class="has-text-right">Import</th>
            <th>Estat</th>
            <th>Incidències</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.owner || m.name" data-test="report-member">
            <td>{{ m.name }}</td>
            <td class="has-text-right">
              {{ m.orders }}
              <small v-if="m.orders !== m.current" class="sub">{{ m.orders - m.current }} de mesos anteriors</small>
            </td>
            <td class="has-text-right">{{ money(m.amount) }}</td>
            <td>
              <span class="tag" :class="statusTag(m.status)">{{ statusLabel(m.status) }}</span>
              <router-link v-if="m.invoice" :to="{ name: 'document.edit', params: { id: m.invoice.id, type: 'emitted-invoices' } }" class="sub">Obre l'esborrany</router-link>
            </td>
            <td>
              <ul class="issues">
                <li v-for="(b, i) in m.blockers" :key="`b${i}`" class="is-blocker">{{ b.text }}: {{ orderList(b.orders) }}</li>
                <li v-for="(w, i) in m.warnings" :key="`w${i}`">{{ w.text }}: {{ orderList(w.orders) }}</li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import { formatMoney } from "@/helpers/format-number";
import { memberStatusLabel, memberStatusTag, ofMonth, orderList, sortedMembers } from "@/domain/autoInvoicing";

export default {
  name: "AutoInvoicingReport",
  props: {
    report: { type: Object, required: true }
  },
  computed: {
    rec() {
      return this.report.reconciliation || null;
    },
    members() {
      return sortedMembers(this.report.members);
    }
  },
  methods: {
    ofMonth,
    orderList,
    statusLabel: memberStatusLabel,
    statusTag: memberStatusTag,
    money(n) {
      return formatMoney(n);
    },
    formatDay(day) {
      return day ? moment(day, "YYYY-MM-DD").format("DD/MM/YYYY") : "";
    }
  }
};
</script>

<style scoped>
.auto-report {
  border-top: 1px solid var(--a-line);
  padding-top: .75rem;
  margin-top: .5rem;
}
.report-head small {
  color: var(--a-muted);
}
.report-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: .5rem;
  margin: .75rem 0;
}
.report-kpis > div {
  display: grid;
  gap: .125rem;
}
.report-kpis span,
.report-kpis small,
.sub {
  color: var(--a-muted);
  font-size: .8125rem;
}
.sub {
  display: block;
}
.issues li.is-blocker {
  color: var(--a-neg);
  font-weight: 600;
}
.report-table td {
  vertical-align: top;
}
</style>
