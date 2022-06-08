<template>
  <section class="xsection">
    <tiles>
      <card-widget
        class="tile is-child"
        type="is-primary"
        icon="currency-eur"
        :number="total_base"
        suffix="€"
        label="Base"
      />
      <card-widget
        class="tile is-child"
        type="is-primary"
        icon="currency-eur"
        :number="total_vat"
        label="IVA"
        suffix="€"
      />
      <card-widget
        class="tile is-child"
        type="is-primary"
        icon="currency-eur"
        :number="total_irpf"
        label="IRPF"
        suffix="€"
      />
      <card-widget
        class="tile is-child"
        type="is-primary"
        icon="currency-eur"
        :number="total_total"
        label="Total"
        suffix="€"
      />
    </tiles>

    <download-excel class="export" :data="emittedCSV">
      <b-button
        title="Exporta dades"
        class="export-button mb-3"
        icon-left="file-excel"
      />
    </download-excel>
    <b-button
      class="view-button is-primary mb-3"
      @click="navNew"
      icon-left="plus"
    >
      Nova factura
    </b-button>
    <b-button
      class="view-button is-primary mb-3 ml-3"
      @click="navNewIncome"
      icon-left="plus"
    >
      Nou ingrés
    </b-button>
    <b-table
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="emitted"
      :row-class="
        (row, index) =>
          (row.subtotal < 0 && 'has-text-danger has-text-bold') ||
          (row.type == 'Avui' && 'has-text-info')
      "
    >
      <b-table-column label="Codi" field="code" v-slot="props" sortable>
        <router-link
          v-if="props.row.id"
          :to="{ name: 'document.edit', params: { id: props.row.id, type: props.row.type } }"
        >
          {{ props.row.code }}
        </router-link>
        <b v-else>{{ props.row.code }}</b>
      </b-table-column>
      <b-table-column label="Tipus" field="type" v-slot="props" sortable>
        <span v-if="props.row.type === 'emitted-invoices'">
          Factura
        </span>
        <span v-if="props.row.type === 'received-incomes'">
          {{props.row.document_type.name }}
        </span>
      </b-table-column>
      <b-table-column label="Data" field="emitted" v-slot="props" sortable>
        {{ props.row.emitted ? formatDate(props.row.emitted) : "" }}
      </b-table-column>
      <b-table-column
        label="Venciment"
        field="paybefore"
        v-slot="props"
        sortable
      >
        {{ props.row.paybefore ? formatDate(props.row.paybefore) : "" }}
      </b-table-column>
      <b-table-column
        label="Contacte"
        field="contact.name"
        v-slot="props"
        sortable
      >
        {{ props.row.contact ? props.row.contact.name : "" }}
      </b-table-column>
      <b-table-column
        label="NIF Contacte"
        field="contact.name"
        v-slot="props"
        sortable
      >
        {{ props.row.contact ? props.row.contact.nif : null }}
      </b-table-column>
      <b-table-column label="Concepte" field="lines" v-slot="props" sortable>
        {{
          props.row.lines && props.row.lines.length > 0
            ? props.row.lines[0].concept
            : ""
        }}
      </b-table-column>
      <b-table-column label="Projecte" field="lines" v-slot="props" sortable>
        {{ props.row.projects && props.row.projects.length ? props.row.projects[0].name : (props.row.project ? props.row.project.name : "-" ) }}
      </b-table-column>
      <b-table-column label="Base" field="total_base" v-slot="props" sortable>
        {{ formatPrice(props.row.total_base) }} €
      </b-table-column>
      <b-table-column label="IVA" field="total_vat" v-slot="props" sortable>
        {{ formatPrice(props.row.total_vat) }} €
      </b-table-column>
      <b-table-column label="IRPF" field="total_irpf" v-slot="props" sortable>
        {{ formatPrice(-1 * props.row.total_irpf) }} €
      </b-table-column>
      <b-table-column label="Total" field="total" v-slot="props" sortable>
        {{ formatPrice(props.row.total) }} €
      </b-table-column>
    </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import moment from "moment";
import sumBy from "lodash/sumBy";
import Tiles from "@/components/Tiles";
import CardWidget from "@/components/CardWidget";
import _ from "lodash";

export default {
  name: "EmittedInvoices",
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
    contact: {
      type: Number,
      default: null,
    },
    documentType: {
      type: Number,
      default: null,
    }
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
    contact: function (newVal, oldVal) {
      this.getData();
    },
    documentType: function (newVal, oldVal) {
      this.getData();
    },
  },
  async mounted() {
    this.getData();
  },
  methods: {
    navNew() {
      this.$router.push("/document/0/emitted-invoices");
    },
    navNewIncome() {
      this.$router.push("/document/0/received-incomes");
    },    
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatDate(value) {
      if (!value) return ''
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
    },
    async getData() {
      this.isLoading = true;
      if (!this.year) {
        return;
      }
      const from = moment(this.year, 'YYYY').startOf("year").format("YYYY-MM-DD");
      const to = moment(this.year, 'YYYY').endOf("year").format("YYYY-MM-DD");

      const from2 = this.month ? moment(`${this.year}-${this.month}`, 'YYYY-M').startOf("month").format("YYYY-MM-DD") : from;
      const to2 = this.month ? moment(`${this.year}-${this.month}`, 'YYYY-M').endOf("month").format("YYYY-MM-DD") : to;

      const contactQuery = this.contact ? `&[contact_eq]=${this.contact}` : '';      

      let invoices = (
        await service({ requiresAuth: true }).get(
          `emitted-invoices?_limit=${this.documentType === 0 || this.documentType === -1 ? -1 : 0}&_where[emitted_gte]=${from2}&[emitted_lte]=${to2}${contactQuery}`
        )
      ).data;

      invoices = invoices.map((element) => {
        return { ...element, type: 'emitted-invoices' };
      });

      const typeQuery = this.documentType !== 0 ? `&[document_type_eq]=${this.documentType}` : '';
      let incomes = (
        await service({ requiresAuth: true }).get(
          `received-incomes?_limit=-1&_where[emitted_gte]=${from2}&[emitted_lte]=${to2}${contactQuery}${typeQuery}`
        )
      ).data;

      incomes = incomes.map((element) => {
        return { ...element, type: 'received-incomes' };
      });

      const emitted = _.concat(invoices, incomes)
      this.emitted = emitted

      this.emittedCSV = this.emitted.map((e) => {
        return {
          num: e.code,
          data: e.date,
          proveidor: e.contact ? e.contact.name : "",
          nif: e.contact ? e.contact.nif : "",
          concepte: e.lines && e.lines.length > 0 ? e.lines[0].concepte : "-",
          projecte: e.projects && e.projects.length ? e.projects[0].name : (e.project ? e.project.name : ""),
          base: e.total_base,
          vat: e.total_vat,
          irpf: e.total_irpf,
          total: e.total,
        };
      });

      // this.emitted.push({
      //   number: 0,
      //   code: "Total",
      //   emitted: null,
      //   paybefore: null,
      //   contact: null,
      //   project: null,
      //   concept: "",
      //   total_base: sumBy(this.emitted, "total_base"),
      //   total_vat: sumBy(this.emitted, "total_vat"),
      //   total_irpf: sumBy(this.emitted, "total_irpf"),
      //   total: sumBy(this.emitted, "total"),
      // });

      this.isLoading = false;
    },
  },
};
</script>
