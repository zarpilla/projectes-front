<template>
  <div>
    <title-bar :title-stack="titleStack" subtitle="Vista prèvia del document tal com surt al PDF.">
      <router-link v-if="quote" :to="`/document/${id}/${type}`" class="button">
        <b-icon icon="arrow-left" size="is-small" /><span>Torna al document</span>
      </router-link>
      <b-button type="is-primary" icon-left="file-pdf-box" @click="getPDF">Descarrega PDF</b-button>
    </title-bar>
    <section class="section is-main-section">
      <div class="preview-page">
          <div class="invoice-box-container">
            <div id="quote" class="invoice-box" v-if="me && quote">
              <table cellpadding="0" cellspacing="0">
                <tr class="top">
                  <td :colspan="5">
                    <table class="header-table">
                      <tr>
                        <td class="title">
                          <img
                            v-if="imageUrl"
                            :src="imageUrl"
                            style="width: 100%; max-width: 200px"
                          />
                        </td>

                        <td class="more">
                          <span
                            v-if="
                              [
                                'received-invoices',
                                'emitted-invoices',
                                'quotes'
                              ].includes(type)
                            "
                            >{{ texts[locale][type]["documentName"] }}</span
                          >
                          <span v-else>{{ quote.document_type ? quote.document_type.name : '' }}</span>
                          {{ quote.code }}<br />
                          {{ texts[locale]["Data"] }}:
                          {{
                            formatDMYDate(quote.emitted
                              ? quote.emitted
                              : quote.updated_at)
                          }}<br />
                          <div v-if="quote.paybefore">
                            {{ texts[locale]["Venciment:"] }}
                            {{ formatDMYDate(quote.paybefore) }}
                          </div>
                          <div
                            v-if="
                              quote.paid &&
                                quote.paid_date &&
                                type === 'received-expenses'
                            "
                          >
                            {{ texts[locale]["Pagada:"] }}
                            {{ formatDMYDate(quote.paid_date) }}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr class="information">
                  <td :colspan="5">
                    <table>
                      <tr>
                        <td class="prov-td">
                          <div class="client">
                            {{ texts[locale][type]["PROVEÏDOR"] }}
                          </div>
                          <div v-if="me.name">{{ me.name }}</div>
                          <div v-if="me.nif">{{ me.nif }}</div>
                          <div v-if="me.address">
                            {{ me.address }}<br />{{ me.postcode }}
                            {{ me.city }}
                          </div>
                          <div v-if="me.phone">{{ me.phone }}</div>
                          <div v-if="me.email">{{ me.email }}</div>
                        </td>
                        <td class="client-td">
                          <div class="client">
                            {{ texts[locale][type]["CLIENT"] }}
                          </div>
                          <!-- the data saved on the document, else the contact's
                               (the name was left out of that fallback, issues/100) -->
                          <div v-if="party.name">{{ party.name }}</div>
                          <div v-if="party.nif">{{ party.nif }}</div>
                          <div v-if="party.email">{{ party.email }}</div>
                          <div v-if="party.address">
                            {{ party.address }}<br />{{ party.postcode }}
                            {{ party.city }}
                          </div>
                          <div v-if="party.phone">{{ party.phone }}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr class="zt-heading">
                  <td :colspan="5">
                    <table>
                      <tr class="t-heading">
                        <td v-if="showDate">{{ texts[locale]["Data"] }}</td>
                        <td class="has-text-left">
                          {{ texts[locale]["Concepte"] }}
                        </td>
                        <td v-if="showQuantity">{{ texts[locale]["Q."] }}</td>
                        <td v-if="showQuantity || showVat">
                          {{ texts[locale]["Base"] }}
                        </td>
                        <td v-if="showDiscount">
                          {{ texts[locale]["Descompte"] }}
                        </td>
                        <td>{{ texts[locale]["Base imposable"] }}</td>
                        <td v-if="showIrpf">{{ texts[locale]["IRPF"] }}</td>
                        <td v-if="showVat">{{ texts[locale]["IVA"] }}</td>
                        <td>{{ texts[locale]["Total"] }}</td>
                      </tr>
                      <tr
                        class="item"
                        v-for="(line, i) in quote.lines"
                        v-bind:key="line.id"
                        :class="{ last: i == line.length }"
                      >
                        <td v-if="showDate">{{ formatDMYDate(line.date) }}</td>
                        <td class="has-text-left">
                          {{ line.concept }}
                          <div v-if="line.comments" class="comments">
                            <span
                              v-html="richText(line.comments)"
                            ></span>
                          </div>
                        </td>
                        <td v-if="showQuantity">{{ line.quantity }}</td>
                        <td v-if="showQuantity || showVat">
                          {{ formatCurrency(line.base) }}€
                        </td>
                        <td v-if="showDiscount">
                          {{ formatCurrency(-1 * lineDiscount(line)) }}
                          ({{ line.discount || 0 }}%)
                        </td>
                        <td>
                          {{ formatCurrency(lineBase(line)) }}€
                        </td>
                        <td v-if="showIrpf">
                          {{ formatCurrency(-1 * lineIrpf(line)) }}
                          ({{ line.irpf }}%)
                        </td>
                        <td v-if="showVat">
                          {{ formatCurrency(lineVat(line)) }}
                          ({{ line.vat }}%)
                        </td>
                        <td>
                          {{ formatCurrency(lineTotal(line)) }}€
                        </td>
                      </tr>
                      <tr class="total">
                        <td :colspan="6">
                          <template v-if="showDiscount">
                            <div>
                              {{ texts[locale]["Base sense descompte"] }}:
                              {{ formatCurrency(totalBaseWithoutDiscount(quote.lines)) }}€
                            </div>
                            <div>
                              {{ texts[locale]["Descompte"] }}:
                              {{ formatCurrency(-1 * sumBy(quote.lines, lineDiscount)) }}€
                            </div>
                          </template>
                          <div>
                            {{ texts[locale]["Base imposable"] }}:
                            {{ formatCurrency(quote.total_base) }}€
                          </div>
                          <div v-if="quote.total_vat">
                            {{ texts[locale]["IVA"] }}:
                            {{ formatCurrency(quote.total_vat) }}€
                          </div>
                          <div v-if="quote.total_irpf">
                            {{ texts[locale]["IRPF"] }}:
                            {{ formatCurrency((-1 * quote.total_irpf)) }}€
                          </div>
                          <div class="total-val">
                            {{ texts[locale]["Total"] }}:
                            {{ formatCurrency(quote.total) }}€
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr
                  class="zt-heading"
                  v-if="
                    quote.payment_method && quote.payment_method.invoice_text
                  "
                >
                  <td :colspan="5">
                    <table>
                      <tr class="t-heading">
                        <td>{{ texts[locale]["Mètode de pagament"] }}</td>
                      </tr>
                      <tr>
                        <td>
                          <span v-html="sanitizeHtml(paymentText)"></span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div v-if="quote.comments" class="comments global-comments">
                <div class="more notes">{{ texts[locale]["Notes"] }}</div>
                <div
                  class="notes-content"
                  v-html="richText(quote.comments)"
                ></div>
              </div>
              <div
                v-if="me.invoice_footer && type === 'emitted-invoices'"
                class="comments global-comments quote-footer"
              >
                <span
                  v-html="richText(me.invoice_footer)"
                ></span>
              </div>
            </div>
          </div>
      </div>
    </section>
  </div>
</template>

<script>
// import axios from 'axios'
// import dayjs from 'dayjs'
// import find from 'lodash/find'
import TitleBar from "@/components/TitleBar.vue";
import service from "@/service/index";
import { richText, sanitizeHtml } from "@/helpers/safeHtml";
import moment from "moment";
import html2pdf from "html2pdf.js";
import sumBy from "lodash/sumBy";
import {
  lineBase,
  lineDiscount,
  lineIrpf,
  lineTotal,
  lineVat,
  hasDiscount,
  totalBaseWithoutDiscount
} from "@/domain/documentTotals";

export default {
  name: "ClientForm",
  components: {
    TitleBar
  },
  props: {
    id: {
      type: [String, Number],
      default: null
    },
    type: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      isLoading: false,
      quote: null,
      me: null,
      baseUrl: import.meta.env.VUE_APP_API_URL || "http://localhost:1337",
      imageUrl: null,
      locale: "ca",
      texts: {
        ca: {
          Factura: "Factura",
          Data: "Data",
          "Venciment:": "Venciment:",
          PROVEÏDOR: "PROVEÏDOR",
          CLIENT: "CLIENT",
          Concepte: "Concepte",
          "Q.": "Q.",
          Base: "Base",
          IVA: "IVA",
          Descompte: "Descompte",
          "Base sense descompte": "Base sense descompte",
          IRPF: "IRPF",
          Total: "Total",
          "Total:": "Total:",
          "Base imposable": "Base imposable",
          Notes: "Notes",
          "Total (sense IVA):": "Total (sense IVA):",
          "Mètode de pagament": "Mètode de pagament",
          "Pagada:": "Pagada:",
          "emitted-invoices": {
            documentName: "Factura",
            PROVEÏDOR: "PROVEÏDOR",
            CLIENT: "CLIENT"
          },
          "received-incomes": {
            documentName: "Ingrés",
            PROVEÏDOR: "PROVEÏDOR",
            CLIENT: "CLIENT"
          },
          "received-expenses": {
            documentName: "Despesa",
            PROVEÏDOR: "CLIENT",
            CLIENT: "PROVEÏDOR"
          },
          "received-invoices": {
            documentName: "Factura",
            PROVEÏDOR: "CLIENT",
            CLIENT: "PROVEÏDOR"
          },
          quotes: {
            documentName: "Pressupost",
            PROVEÏDOR: "PROVEÏDOR",
            CLIENT: "CLIENT"
          }
        },
        es: {
          Factura: "Factura",
          Data: "Fecha",
          "Venciment:": "Vencimiento:",
          PROVEÏDOR: "PROVEEDOR",
          CLIENT: "CLIENTE",
          Concepte: "Concepto",
          "Q.": "Cant.",
          Base: "Base",
          IVA: "IVA",
          Descompte: "Descuento",
          "Base sense descompte": "Base sin descuento",
          IRPF: "IRPF",
          Total: "Total",
          "Total:": "Total:",
          "Base imposable": "Base imponible",
          Notes: "Notas",
          "Total (sense IVA):": "Total (sin IVA):",
          "Mètode de pagament": "Métode de pago",
          "Pagada:": "Pagada:",
          "emitted-invoices": {
            documentName: "Factura",
            PROVEÏDOR: "PROVEÏDOR",
            CLIENT: "CLIENT"
          },
          "received-incomes": {
            documentName: "Ingreso",
            PROVEÏDOR: "PROVEEDOR",
            CLIENT: "CLIENTE"
          },
          "received-expenses": {
            documentName: "Despesa",
            PROVEÏDOR: "CLIENTE",
            CLIENT: "PROVEEDOR"
          },
          "received-invoices": {
            documentName: "Factura",
            PROVEÏDOR: "CLIENTE",
            CLIENT: "PROVEEDOR"
          },
          quotes: {
            documentName: "Factura",
            PROVEÏDOR: "PROVEÏDOR",
            CLIENT: "CLIENT"
          }
        },
        en: {
          Factura: "Invoice",
          Data: "Date",
          "Venciment:": "Expiration:",
          PROVEÏDOR: "PROVIDER",
          CLIENT: "CLIENT",
          Concepte: "Concept",
          "Q.": "Q.",
          Base: "Base",
          IVA: "VAT",
          Descompte: "Discount",
          "Base sense descompte": "Base before discount",
          IRPF: "IRPF",
          Total: "Total",
          "Total:": "Total:",
          "Base imposable": "Total base",
          "Base:": "Base:",
          Notes: "Notes",
          "Total (sense IVA):": "Total (withput VAT):",
          "Mètode de pagament": "Payment method",
          "Pagada:": "Paid:",
          "emitted-invoices": {
            documentName: "Factura",
            PROVEÏDOR: "PROVIDER",
            CLIENT: "CLIENT"
          },
          "received-incomes": {
            documentName: "Income",
            PROVEÏDOR: "PROVIDER",
            CLIENT: "CLIENT"
          },
          "received-expenses": {
            documentName: "Despesa",
            PROVEÏDOR: "CLIENT",
            CLIENT: "PROVIDER"
          },
          "received-invoices": {
            documentName: "Invoice",
            PROVEÏDOR: "CLIENT",
            CLIENT: "PROVIDER"
          },
          quotes: {
            documentName: "Factura",
            PROVEÏDOR: "PROVIDER",
            CLIENT: "CLIENT"
          }
        }
      }
    };
  },
  computed: {
    // the counterparty: what the document saved (contact_info), field by
    // field, else the linked contact (issues/100)
    party() {
      const info = (this.quote && this.quote.contact_info) || {};
      const contact = (this.quote && this.quote.contact) || {};
      const fields = ["name", "nif", "email", "address", "postcode", "city", "phone"];
      return Object.fromEntries(fields.map(f => [f, info[f] || contact[f] || ""]));
    },
    titleStack() {
      const list = ["emitted-invoices", "received-incomes"].includes(this.type) ? "Ingressos" : "Despeses";
      const name = (this.texts.ca[this.type] || {}).documentName || "Document";
      return ["Diners", list, this.quote ? `${name} ${this.quote.code || ""}`.trim() : name];
    },
    showDate() {
      return this.quote.lines.filter(l => l.date).length > 0;
    },
    showQuantity() {
      return this.quote.lines.find(l => l.quantity > 1) !== undefined;
    },
    showVat() {
      return this.quote.lines.find(l => l.vat > 0) !== undefined;
    },
    showIrpf() {
      return this.quote.lines.find(l => l.irpf > 0) !== undefined;
    },
    showDiscount() {
      return hasDiscount(this.quote.lines);
    },
    columnsShown() {
      return this.showQuantity && this.showVat ? 5 : this.showQuantity ? 3 : 4;
    },
    paymentText() {
      return this.quote &&
        this.quote.payment_method &&
        this.quote.payment_method.invoice_text
        ? this.quote.payment_method.invoice_text.replace(
            /(?:\r\n|\r|\n)/g,
            "<br>"
          )
        : "";
    }
  },
  created() {
    this.getData();
    // ?locale=es, es-ES or EN; a language without texts stays in Catalan (issues/071)
    const lang = String(this.$route.query.locale || "").slice(0, 2).toLowerCase();
    if (this.texts[lang]) {
      this.locale = lang;
    }
  },
  methods: {
    richText,
    sanitizeHtml,
    lineBase,
    lineDiscount,
    lineIrpf,
    lineTotal,
    lineVat,
    sumBy,
    totalBaseWithoutDiscount,
    getData() {
      if (this.$route.params.id) {
        service({ requiresAuth: true })
          .get(`${this.$route.params.type}/${this.$route.params.id}`)
          .then(r => {
            this.quote = r.data;
          });
        service({ requiresAuth: true, cached: true })
          .get("me")
          .then(r => {
            this.me = r.data;
            // a new tenant has no logo yet (issues/044)
            if (this.me.logo && this.me.logo.url) {
              const img = `${this.baseUrl}${this.me.logo.url}`;
              this.toDataUrl(img, base64 => {
                this.imageUrl = base64;
              });
            }
          });
      }
    },
    async getPDF() {
      var element = document.getElementById("quote");
      var opt = {
        margin: [0, 0],
        filename: `${this.quote.code}-${this.quote.contact.name}`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { dpi: 300, scale: 4, letterRendering: true },
        jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };
      // html2pdf().set(opt).from(element).save(opt)

      // const pdf = html2pdf().set(opt).from(element)
      // // await pdf.save(opt.filename, { returnPromise: true })

      // pdf.toPdf().get('pdf').then(function (pdf) {
      //   setTimeout(() => {
      //     window.open(
      //     pdf.output('bloburl', opt.filename)
      //     , opt.filename);
      //   }, 200)

      // });

      html2pdf()
        .from(element)
        .set(opt)
        .toPdf()
        .get("pdf")
        .then(function(pdfObject) {})
        .save();
    },
    toDataUrl(url, callback) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        var reader = new FileReader();
        reader.onloadend = function() {
          callback(reader.result);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.open("GET", url);
      xhr.responseType = "blob";
      xhr.send();
    },
    formatDMYDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("DD/MM/YYYY");
    },
    formatCurrency(val) {
      // 0 is an amount (a 0 € total showed «-€», issues/101); only no value is «-»
      if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
        return "-";
      }
      return Number(val)
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, "$&;")
        .replace(/\./g, ",")
        .replace(/;/g, ".");
    }
  },
};
</script>
<style scoped>
/* the document as a sheet of paper; it stays white in the dark theme */
.preview-page {
  max-width: 860px;
}
@media screen and (max-width: 768px) {
  .invoice-box {
    margin: 12px;
  }
}
.invoice-box-container {
  border-radius: 4px;
  overflow-x: auto;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
  border: 1px solid #eee;
  background: #fff;
}
.invoice-box {
  max-width: 800px;
  margin: 30px;
  margin-bottom: 100px;
  padding: 0px;
  font-size: 12px;
  line-height: 24px;
  font-family: sans-serif, "Helvetica Neue", "Helvetica", Helvetica, Arial,
    sans-serif;
  color: #222;
  background: #fff;
}

@media print {
  .invoice-box {
    padding: 0px;
  }
}

.invoice-box table {
  width: 100%;
  line-height: inherit;
  text-align: left;
}

.invoice-box table td {
  padding: 5px;
  vertical-align: top;
}

.invoice-box table tr td:nth-child(2) {
  text-align: right;
}
.invoice-box table tr td:nth-child(3) {
  text-align: right;
}
.invoice-box table tr td:nth-child(4) {
  text-align: right;
}
.invoice-box table tr td:nth-child(5) {
  text-align: right;
}
.invoice-box table tr td:nth-child(6) {
  text-align: right;
}
.invoice-box table tr td:nth-child(7) {
  text-align: right;
}
.invoice-box table tr.top table td {
  padding-bottom: 20px;
}

.invoice-box table tr.top table td.title {
  font-size: 45px;
  line-height: 45px;
  color: #222;
}

.invoice-box table tr.information table td {
  padding-bottom: 40px;
}

.invoice-box table tr.t-heading td {
  border-bottom: 1px solid #ddd;
  border-bottom: 3px solid #f9a43b;
  font-weight: bold;
}

.invoice-box table tr.details td {
  padding-bottom: 20px;
}

.invoice-box table tr.item td {
  border-bottom: 2px solid #f9a43b;
}

.invoice-box table tr.item.last td {
  border-bottom: none;
}

.invoice-box table tr.total {
  margin-top: 1rem;
}
.invoice-box table tr.total td {
  text-align: right;
  color: #222;
}
.invoice-box table tr.total td .total-val {
  font-weight: bold;
}
.invoice-box table tr.total td:nth-child(2) {
  border-top: 1px solid #f9a43b;
  font-weight: bold;
  color: #222;
}

.invoice-box .notes {
  padding: 5px;
}
.invoice-box .notes-content {
  padding: 5px;
}
.invoice-box .global-comments {
  margin-top: 4rem;
}
.invoice-box .client {
  color: #222;
  font-weight: bold;
}
.invoice-box .more {
  color: #222;
  font-weight: bold;
}
.invoice-box .header-table {
  border-bottom: 3px solid #f9a43b;
  margin-bottom: 1rem;
}
.invoice-box .notes {
  border-bottom: 3px solid #f9a43b;
  margin-bottom: 0.5rem;
}

.invoice-box .quote-footer {
  border-top: 1px solid #f9a43b;
  margin-top: 5rem;
  padding-top: 0.5rem;
  font-size: 13px;
}
@media only screen and (max-width: 600px) {
  .invoice-box table tr.top table td {
    width: 100%;
    display: block;
    text-align: center;
  }

  .invoice-box table tr.information table td {
    width: 100%;
    display: block;
    text-align: center;
  }
}

/** RTL **/
.rtl {
  direction: rtl;
  font-family: Tahoma, "Helvetica Neue", "Helvetica", Helvetica, Arial,
    sans-serif;
}

.rtl table {
  text-align: right;
}

.rtl table tr td:nth-child(2) {
  text-align: left;
}
</style>
