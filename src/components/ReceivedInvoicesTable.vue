<template>
  <div>
    <section class="xsection">
      <tiles>
        <card-widget class="tile is-child" type="is-primary" icon="currency-eur" :number="total_base" suffix="€"
          label="Base" />
        <card-widget class="tile is-child" type="is-primary" icon="currency-eur" :number="total_vat" label="IVA"
          suffix="€" />
        <card-widget class="tile is-child" type="is-primary" icon="currency-eur" :number="total_irpf" label="IRPF"
          suffix="€" />
        <card-widget class="tile is-child" type="is-primary" icon="currency-eur" :number="total_total" label="Total"
          suffix="€" />
      </tiles>
      <!-- <pre>{{emitted}}</pre> -->
      <download-excel class="export" 
      :fields="{
        num: 'num',
        num_document_proveidor: 'num_document_proveidor',
        tipus: 'tipus',
        data: 'data',
        venciment: 'venciment',
        cobrada: 'cobrada',
        proveidor: 'proveidor',
        proveidor_nif: 'proveidor_nif',
        proveidor_adreça: 'proveidor_adreça',
        proveidor_cp: 'proveidor_cp',
        proveidor_ciutat: 'proveidor_ciutat',
        concepte: 'concepte',
        projecte: 'projecte',
        base: {
          field: 'base',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        iva: {
          field: 'iva',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        irpf: {
          field: 'irpf',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        total: {
          field: 'total',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_concept: 'line_concept',
        line_base: {
          field: 'line_base',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_date: 'line_date',
        line_irpf: {
          field: 'line_irpf',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_irpf_pct: {
          field: 'line_irpf_pct',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_quantity: {
          field: 'line_quantity',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_vat: {
          field: 'line_vat',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_vat_pct: {
          field: 'line_vat_pct',
          callback: (value) => {
            return excelFormat(value);
          },
        },
      }"
      :data="emittedCSV" name="despeses">
        <b-button title="Exporta dades" class="export-button mt-0 mb-3" icon-left="file-excel" />
      </download-excel>
      <b-button class="view-button is-primary mb-3" @click="navNew" icon-left="plus">
        Nova factura
      </b-button>
      <b-button class="view-button is-primary mb-3 ml-3" @click="navNewExpense" icon-left="plus">
        Nova despesa
      </b-button>

      <b-table :loading="isLoading" :paginated="false" :striped="false" :data="emitted" :row-class="(row, index) =>
          (row.subtotal < 0 && 'has-text-danger has-text-bold') ||
          (row.type == 'Avui' && 'has-text-info')
        ">
        <b-table-column label="Codi" field="code" v-slot="props" sortable>
          <router-link v-if="props.row.id && props.row.type !== 'payrolls'" :to="{
            name: 'document.edit',
            params: { id: props.row.id, type: props.row.type },
          }">
            {{ props.row.code }}
          </router-link>
          <b v-else-if="props.row.code && props.row.type !== 'payrolls'">{{
            props.row.code
          }}</b>
          <router-link v-else :to="{
                name: 'document.edit',
                params: { id: props.row.id, type: props.row.type },
              }">{{
      `${props.row.year.year}-${zeroPad(props.row.month.month, 2)}-${props.row.users_permissions_user.username
        }`
    }}
          </router-link>
        </b-table-column>
        <b-table-column label="Tipus" field="type" v-slot="props" sortable>
          <span v-if="props.row.type === 'received-invoices'"> Factura </span>
          <span v-if="props.row.type === 'received-expenses'">
            {{ props.row.document_type.name }}
          </span>
          <span v-if="props.row.type === 'payrolls'"> Nòmina </span>
        </b-table-column>
        <b-table-column label="Data" field="emitted" v-slot="props" sortable>
          {{ formatDate(props.row.emitted) }}
        </b-table-column>
        <b-table-column label="Venciment" field="paybefore" v-slot="props" sortable>
          {{ formatDate(props.row.paybefore) }}
        </b-table-column>
        <b-table-column label="Contacte" field="contact.name" v-slot="props" sortable>
          {{ props.row.contact ? props.row.contact.name : "-" }}
        </b-table-column>
        <b-table-column label="NIF Contacte" field="contact.name" v-slot="props" sortable>
          {{ props.row.contact ? props.row.contact.nif : "-" }}
        </b-table-column>
        <b-table-column label="FProv" field="contact.name" v-slot="props" sortable>
          {{ props.row.contact_invoice_number ? props.row.contact_invoice_number : "" }}
        </b-table-column>

        <b-table-column label="Concepte" field="lines" v-slot="props" sortable>
          <span v-if="props.row.type === 'payrolls'">
            {{ props.row.users_permissions_user.username }}
          </span>
          <span v-else>
            {{
              props.row.lines && props.row.lines.length > 0
              ? props.row.lines[0].concept
              : ""
            }}
          </span>
        </b-table-column>
        <b-table-column label="Projecte" field="lines" v-slot="props" sortable>
          {{
            props.row.projects && props.row.projects.length
            ? props.row.projects[0].name
            : props.row.project
              ? props.row.project.name
              : "-"
          }}
        </b-table-column>
        <b-table-column label="Base" field="total_base" v-slot="props" sortable>
          {{ formatPrice(props.row.total_base) }}€
        </b-table-column>
        <b-table-column label="IVA" field="total_vat" v-slot="props" sortable>
          {{ formatPrice(props.row.total_vat) }}€
        </b-table-column>
        <b-table-column label="IRPF" field="total_irpf" v-slot="props" sortable>
          {{ formatPrice(-1 * props.row.total_irpf) }}€
        </b-table-column>
        <b-table-column label="Total" field="total" v-slot="props" sortable>
          {{ formatPrice(props.row.total) }}€
        </b-table-column>
        <b-table-column label="Pagada" field="paid_date" v-slot="props" sortable>
          {{
            props.row.paid_date
            ? formatDate(props.row.paid_date)
            : props.row.paid
              ? "Sí (sense data)"
              : "No"
          }}
        </b-table-column>
        <b-table-column label="Assig." title="Assignada a línia de projecte" field="assigned" v-slot="props" sortable>
          {{ props.row.assigned }}
        </b-table-column>
      </b-table>
    </section>
  </div>
</template>

<script>
import service from "@/service/index";
import moment from "moment";
import sumBy from "lodash/sumBy";
import Tiles from "@/components/Tiles";
import CardWidget from "@/components/CardWidget";
import _ from "lodash";
import { format } from "@/helpers/excelFormatter";
import { mapState } from 'vuex'

export default {
  name: "ReceivedInvoices",
  components: { Tiles, CardWidget },
  props: {
    titleStack: {
      type: Array,
      default: () => [],
    },
    year: {
      type: Number,
      default: null,
    },
    month: {
      type: Number,
      default: null,
    },
    quarter: {
      type: Number,
      default: null,
    },
    contact: {
      type: Number,
      default: null,
    },
    documentType: {
      type: Number,
      default: null,
    },
    project: {
      type: Number,
      default: null,
    },
    paid: {
      type: Number,
      default: null,
    },
  },
  data() {
    return {
      isLoading: false,
      years: [],
      projects: [],
      treasury: [],
      treasuryData: [],
      emitted: [],
      emittedCSV: [],
      received: [],
      tickets: [],
      diets: [],
      emittedGrants: [],
      receivedGrants: [],
      projectIncomes: [],
      projectExpenses: [],
    };
  },
  watch: {
    year: function (newVal, oldVal) {
      this.getData();
    },
    month: function (newVal, oldVal) {
      this.getData();
    },
    quarter: function (newVal, oldVal) {
      this.getData();
    },
    contact: function (newVal, oldVal) {
      this.getData();
    },
    documentType: function (newVal, oldVal) {
      this.getData();
    },
    project: function (newVal, oldVal) {
      this.getData();
    },
    paid: function (newVal, oldVal) {
      this.getData();
    },
  },
  computed: {
    total_base() {
      return sumBy(this.emitted, "total_base").toFixed(2);
    },
    total_vat() {
      return sumBy(this.emitted, "total_vat").toFixed(2);
    },
    total_irpf() {
      return -1 * sumBy(this.emitted, "total_irpf").toFixed(2);
    },
    total_total() {
      return sumBy(this.emitted, "total").toFixed(2);
    },
    ...mapState(["userName", "user"]),
  },
  async mounted() {
    this.getData();
  },
  methods: {
    navNew() {
      this.$router.push("/document/0/received-invoices");
    },
    navNewExpense() {
      this.$router.push("/document/0/received-expenses");
    },
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatDate(value) {
      if (!value) return "";
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
    },
    async getData() {
      this.isLoading = true;
      if (!this.year) {
        return;
      }

      const from = moment(this.year, "YYYY")
        .startOf("year")
        .format("YYYY-MM-DD");
      const to = moment(this.year, "YYYY").endOf("year").format("YYYY-MM-DD");

      const from2 = this.month
        ? moment(`${this.year}-${this.month}`, "YYYY-M")
          .startOf("month")
          .format("YYYY-MM-DD")
        : from;
      const to2 = this.month
        ? moment(`${this.year}-${this.month}`, "YYYY-M")
          .endOf("month")
          .format("YYYY-MM-DD")
        : to;

      const from3 = this.quarter
        ? moment(`${this.year}`, "YYYY")
          .quarter(this.quarter)
          .startOf("quarter")
          .format("YYYY-MM-DD")
        : from2;
      const to3 = this.quarter
        ? moment(`${this.year}`, "YYYY")
          .quarter(this.quarter)
          .endOf("quarter")
          .format("YYYY-MM-DD")
        : to2;

      const contactQuery = this.contact ? `&[contact_eq]=${this.contact}` : "";
      const contactQueryPayrolls = this.contact
        ? `&[users_permissions_user_eq]=-1`
        : "";

      const projectQuery = this.project ? `&[projects_eq]=${this.project}` : "";

      const paidQuery = this.paid === 1 ? `&[paid_date_null]=false` : (this.paid === 2 ? `&[paid_date_null]=true` : '');
      const paidQuery2 = this.paid === 1 ? `&[paid_eq]=true` : (this.paid === 2 ? `&[paid_eq]=false` : '');

      let invoices = (
        await service({ requiresAuth: true }).get(
          `received-invoices?_limit=${this.documentType === 0 || this.documentType === -1 ? -1 : 0
          }&_where[emitted_gte]=${from3}&[emitted_lte]=${to3}${contactQuery}${projectQuery}${paidQuery}`
        )
      ).data;

      invoices = invoices.map((element) => {
        return { ...element, type: "received-invoices" };
      });

      

      const typeQuery =
        this.documentType !== 0
          ? `&[document_type_eq]=${this.documentType}`
          : "";
      let expenses = (
        await service({ requiresAuth: true }).get(
          `received-expenses?_limit=-1&_where[emitted_gte]=${from3}&[emitted_lte]=${to3}${contactQuery}${typeQuery}${projectQuery}${paidQuery}`
        )
      ).data;

      expenses = expenses.map((element) => {
        return { ...element, type: "received-expenses" };
      });

      let payrolls = [];
      if (projectQuery === "") {
        payrolls = (
          await service({ requiresAuth: true }).get(
            `payrolls?_limit=${this.documentType === 0 || this.documentType === -2 ? -1 : 0
            }&_where[emitted_gte]=${from3}&[emitted_lte]=${to3}${contactQueryPayrolls}${paidQuery2}`
          )
        ).data;
        payrolls = payrolls.map((element) => {
          return { ...element, type: "payrolls", total_base: element.total };
        });
      }

      const emitted = _.concat(invoices, expenses, payrolls);

      const emittedWithInfo = emitted.map((e) => {
        return {
          ...e,
          assigned: this.assignedToProject(e) ? "Sí" : "No",
        };
      });

      this.emitted = emittedWithInfo;

      this.emittedCSV = [];

      this.emitted.forEach((e) => {
        this.emittedCSV.push({
          num: e.code,
          num_document_proveidor: e.contact_invoice_number
            ? e.contact_invoice_number
            : "",
          tipus:
            e.type == "received-invoices"
              ? "Factura"
              : e.type === "received-expenses"
                ? e.document_type.name
                : "Nómina",
          data: this.formatDate(e.emitted),
          venciment: this.formatDate(e.paybefore),
          cobrada: this.formatDate(e.paid_date),
          proveidor: e.contact ? e.contact.name : "",
          proveidor_nif: e.contact ? e.contact.nif : "",
          proveidor_adreça: e.contact ? e.contact.address : "",
          proveidor_cp: e.contact ? e.contact.postcode : "",
          proveidor_ciutat: e.contact ? e.contact.city : "",
          // proveidor_provincia: e.contact ? e.contact.state : "",
          // proveidor_pais: e.contact ? e.contact.country : "",
          concepte: e.lines && e.lines.length > 0 ? e.lines[0].concept : "",
          projecte:
            e.projects && e.projects.length
              ? e.projects[0].name
              : e.project
                ? e.project.name
                : "",
          base: e.total_base,
          iva: e.total_vat,
          irpf: e.total_irpf,
          total: e.total,
          line_concept: "",
          line_base: "",
          line_date: "",
          line_irpf: "",
          line_irpf_pct: "",
          line_quantity: "",
          line_vat: "",
          line_vat_pct: "",
        });
        if (e.lines && e.lines.length) {
          e.lines.forEach(line => {
            let base = (line.base ? line.base : 0) * (line.quantity ? line.quantity : 0);
            if (line.discount) {
              base = base * (1 - line.discount / 100.0);
            }
            let vat = (base * (line.vat ? line.vat : 0)) / 100.0;
            let irpf = (base * (line.irpf ? line.irpf : 0)) / 100.0;
            this.emittedCSV.push({
              num: e.code,
              line_concept: line.concept,
              line_base: line.base,
              line_date: line.date,
              line_discount: line.discount,
              line_quantity: line.quantity,
              line_irpf: irpf,
              line_irpf_pct: line.irpf,
              line_vat: vat,
              line_vat_pct: line.vat,
            })
          })
        }
      });

      // this.emittedCSV = this.emitted.map((e) => {
      //   console.log("e", e);
      //   return {
      //     num: e.code,
      //     num_document_proveidor: e.contact_invoice_number
      //       ? e.contact_invoice_number
      //       : "",
      //     tipus:
      //       e.type == "received-invoices"
      //         ? "Factura"
      //         : e.type === "received-expenses"
      //         ? e.document_type.name
      //         : "Nómina",
      //     data: this.formatDate(e.emitted),
      //     venciment: this.formatDate(e.paybefore),
      //     cobrada: this.formatDate(e.paid_date),
      //     proveidor: e.contact ? e.contact.name : "",
      //     proveidor_nif: e.contact ? e.contact.nif : "",
      //     proveidor_adreça: e.contact ? e.contact.address : "",
      //     proveidor_cp: e.contact ? e.contact.postcode : "",
      //     proveidor_ciutat: e.contact ? e.contact.city : "",
      //     // proveidor_provincia: e.contact ? e.contact.state : "",
      //     // proveidor_pais: e.contact ? e.contact.country : "",
      //     concepte: e.lines && e.lines.length > 0 ? e.lines[0].concept : "",
      //     projecte:
      //       e.projects && e.projects.length
      //         ? e.projects[0].name
      //         : e.project
      //         ? e.project.name
      //         : "",
      //     base: e.total_base,
      //     iva: e.total_vat,
      //     irpf: e.total_irpf,
      //     total: e.total,
      //     line_concept: "",
      //     line_concept2: "",
      //   };
      // });

      this.isLoading = false;
    },
    zeroPad(num, places) {
      return String(num).padStart(places, "0");
    },
    assignedToProject(invoice) {
      let assigned = false;

      console.log("invoice", invoice);
      if (invoice.projects) {
        for (let i = 0; i < invoice.projects.length; i++) {
          const project = invoice.projects[i];
          if (invoice.type === "received-invoices") {
            if (project.phases) {
              const invoiceAssigned = project.phases.find(
                (p) =>
                  p.expenses &&
                  p.expenses.find(
                    (e) => e.invoice && e.invoice.id === invoice.id
                  )
              );
              assigned = invoiceAssigned !== undefined;
            }
          } else if (invoice.type === "emitted-invoices") {
            if (project.phases) {
              const invoiceAssigned = project.phases.find(
                (p) =>
                  p.incomes &&
                  p.subphaincomesses.find(
                    (e) => e.invoice && e.invoice.id === invoice.id
                  )
              );
              assigned = invoiceAssigned !== undefined;
            }
          } else if (invoice.type === "received-expenses") {
            if (project.phases) {
              const invoiceAssigned = project.phases.find(
                (p) =>
                  p.expenses &&
                  p.expenses.find(
                    (e) => e.expense && e.expense.id === invoice.id
                  )
              );
              assigned = invoiceAssigned !== undefined;
            }
          } else if (invoice.type === "received-incomes") {
            if (project.phases) {
              const invoiceAssigned = project.phases.find(
                (p) =>
                  p.incomes &&
                  p.incomes.find(
                    (e) => e.income && e.income.id === invoice.id
                  )
              );
              assigned = invoiceAssigned !== undefined;
            }
          }
        }
      }
      return assigned;
    },
    excelFormat(value) {
      return format(this.user, value);
    },
  },
};
</script>
