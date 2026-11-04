<template>
  <!-- IVA › Models 303 i 390: the model 303 as a PDF in the app's style (the
       AEAT's sections and box numbers), drawn off screen and saved with
       html2pdf like the Registre de jornada. Not the AEAT's form: a draft says so. -->
  <div v-if="sheet" class="vat-pdf-holder" aria-hidden="true">
    <div id="vat-pdf" ref="sheet" class="vat-pdf">
      <header class="vp-band">
        <div>
          <h1>{{ sheet.title }}</h1>
          <p v-if="sheet.entity">{{ sheet.entity }}</p>
        </div>
        <p class="vp-status" :class="{ 'is-draft': sheet.draft }">{{ sheet.status }}</p>
      </header>
      <section v-for="sec in sheet.sections" :key="sec.title" class="vp-section">
        <h2>{{ sec.title }}</h2>
        <table>
          <thead v-if="sec.lines.some(l => l.base)">
            <tr>
              <th />
              <th class="vp-num">Base imposable</th>
              <th v-if="sec.rates" class="vp-num">Tipus</th>
              <th class="vp-num">Quota</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in sec.lines" :key="i" class="vp-row" :class="{ 'is-total': l.total }">
              <th scope="row">{{ l.label }}</th>
              <td v-if="sec.lines.some(x => x.base)" class="vp-num"><template v-if="l.base"><span class="vp-box">{{ l.base.box }}</span><span class="vp-val">{{ money(l.base.value) }}</span></template></td>
              <td v-if="sec.rates" class="vp-num"><template v-if="l.rate"><span class="vp-box">{{ l.rate.box }}</span><span class="vp-val is-rate">{{ pct(l.rate.value) }}</span></template></td>
              <td class="vp-num"><template v-if="l.vat"><span class="vp-box">{{ l.vat.box }}</span><span class="vp-val">{{ l.vat.pct ? pct(l.vat.value) : money(l.vat.value) }}</span></template></td>
            </tr>
            <tr v-if="sec.total" class="vp-row is-total">
              <th scope="row">{{ sec.total.label }}</th>
              <td v-if="sec.lines.some(x => x.base)" />
              <td v-if="sec.rates" />
              <td class="vp-num"><span class="vp-box">{{ sec.total.box }}</span><span class="vp-val">{{ money(sec.total.value) }}</span></td>
            </tr>
          </tbody>
        </table>
      </section>
      <section class="vp-section vp-settlement">
        <h2>Liquidació</h2>
        <p>
          <b>{{ sheet.settlement.label }}</b>
          <span v-if="sheet.settlement.box"><span class="vp-box">{{ sheet.settlement.box }}</span><span class="vp-val">{{ money(sheet.settlement.amount) }}</span></span>
        </p>
      </section>
      <footer class="vp-foot">Generat per ESSTRAPIS el {{ today }}. Les caselles que no es calculen (recàrrec d'equivalència, criteri de caixa, importacions…) no hi surten.</footer>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import html2pdf from "@/helpers/html2pdf";
import { formatMoney } from "@/helpers/format-number";
import "@/assets/fonts/rubik.css";

export default {
  name: "VatModelPdf",
  props: {
    // model303Sheet() of domain/vatModels.js, or null
    sheet: { type: Object, default: null }
  },
  computed: {
    today() {
      return moment().format("DD/MM/YYYY");
    }
  },
  methods: {
    money(value) {
      return formatMoney(value || 0);
    },
    pct(value) {
      return `${String(Number(value) || 0).replace(".", ",")} %`;
    },
    async download() {
      await this.$nextTick();
      const element = this.$refs.sheet;
      if (!element) return;
      if (document.fonts && document.fonts.load) {
        await Promise.all([document.fonts.load('11px "Rubik"'), document.fonts.load('500 11px "Rubik"')]).catch(() => {});
      }
      await html2pdf()
        .set({
          margin: [10, 0, 10, 0],
          filename: this.sheet.filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { letterRendering: false, scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css"], avoid: [".vp-row", ".vp-settlement"] }
        })
        .from(element)
        .save();
    }
  }
};
</script>

<style scoped>
.vat-pdf-holder {
  position: fixed;
  left: -10000px;
  top: 0;
}
.vat-pdf {
  width: 210mm;
  padding: 0 14mm;
  font-family: "Rubik", sans-serif;
  font-size: 8.8pt;
  color: #333;
  background: #fff;
}
.vp-band {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 8mm;
  margin: 0 -14mm 5mm;
  padding: 5mm 14mm 4mm;
  background: #f8f8fa;
}
.vp-band h1 {
  font-size: 16pt;
  font-weight: 500;
  margin: 0;
}
.vp-band p {
  margin: 1mm 0 0;
}
.vp-status {
  font-size: 8.5pt;
  text-align: right;
  max-width: 80mm;
}
.vp-status.is-draft {
  color: #b45309;
  font-weight: 500;
}
.vp-section {
  margin-bottom: 3mm;
}
.vp-section h2 {
  font-size: 10pt;
  font-weight: 500;
  margin: 0 0 1mm;
}
.vp-section table {
  width: 100%;
  border-collapse: collapse;
}
.vp-section th,
.vp-section td {
  padding: 0.5mm 1mm;
  border-bottom: 1px solid #eee;
  text-align: left;
  font-weight: 400;
}
.vp-section thead th {
  font-size: 8pt;
  color: #8f8f8f;
}
.vp-num {
  text-align: right !important;
  white-space: nowrap;
}
.vp-box {
  display: inline-block;
  min-width: 7mm;
  margin-right: 2mm;
  padding: 0 1mm;
  border: 1px solid #ddd;
  border-radius: 2px;
  font-size: 7.5pt;
  color: #8f8f8f;
  text-align: center;
}
.vp-val {
  display: inline-block;
  min-width: 22mm;
  text-align: right;
}
.vp-val.is-rate {
  min-width: 9mm;
}
.vp-row.is-total th,
.vp-row.is-total td {
  font-weight: 500;
  border-bottom-color: #ccc;
}
.vp-settlement p {
  display: flex;
  justify-content: space-between;
  margin: 0;
  padding: 2mm 1mm;
  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
}
.vp-foot {
  margin-top: 2mm;
  font-size: 7.5pt;
  color: #8f8f8f;
}
</style>
