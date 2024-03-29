<template>
  <section class="xsection">
    <!-- <tiles>
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
    </tiles> -->

    <download-excel class="export" :data="emittedCSV">
      <b-button
        title="Exporta dades"
        class="export-button mt-0 mb-3"
        icon-left="file-excel"
      />
    </download-excel>
    <b-button
      class="view-button is-primary mb-3"
      @click="navNew"
      icon-left="plus"
    >
      Nou pressupost
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
      <b-table-column label="Data" field="emitted" v-slot="props" sortable>
        {{ props.row.emitted ? formatDate(props.row.emitted) : "" }}
      </b-table-column>
      <b-table-column
        label="Acceptat"
        field="paybefore"
        v-slot="props"
        sortable
      >
        {{ props.row.paybefore ? formatDate(props.row.accepted_date) : "" }}
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
      type: Object,
      default: null,
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
  },
  async mounted() {
    this.getData();
  },
  methods: {
    navNew() {
      this.$router.push("/document/0/quotes");
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
      const from = moment(this.year).startOf("year").format("YYYY-MM-DD");
      const to = moment(this.year).endOf("year").format("YYYY-MM-DD");
      let quotes = (
        await service({ requiresAuth: true }).get(
          `quotes?_limit=-1&_where[emitted_gte]=${from}&[emitted_lte]=${to}`
        )
      ).data;

      quotes = quotes.map((element) => {
        return { ...element, type: 'quotes' };
      });

      this.emitted = quotes

      this.emittedCSV = this.emitted.map((e) => {
        return {
          num: e.code,
          data: this.formatDate(e.date),
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

      this.isLoading = false;
    },
  },
};
</script>
