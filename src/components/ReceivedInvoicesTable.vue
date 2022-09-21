<template>
  <div>
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
      <!-- <pre>{{emitted}}</pre> -->
      <download-excel class="export" :data="emittedCSV" name="despeses">
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
        @click="navNewExpense"
        icon-left="plus"
      >
        Nova despesa
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
            v-if="props.row.id && props.row.type !== 'payrolls'"
            :to="{
              name: 'document.edit',
              params: { id: props.row.id, type: props.row.type },
            }"
          >
            {{ props.row.code }}
          </router-link>
          <b v-else-if="props.row.code && props.row.type !== 'payrolls'">{{ props.row.code }}</b>
          <router-link v-else
          :to="{
              name: 'document.edit',
              params: { id: props.row.id, type: props.row.type },
            }"
          >{{ `${props.row.year.year}-${zeroPad(props.row.month.month, 2)}-${props.row.users_permissions_user.username}` }}

          </router-link>
          
        </b-table-column>
        <b-table-column label="Tipus" field="type" v-slot="props" sortable>
          <span v-if="props.row.type === 'received-invoices'">
            Factura
          </span>
          <span v-if="props.row.type === 'received-expenses'">
            {{props.row.document_type.name }}
          </span>
          <span v-if="props.row.type === 'payrolls'">
            Nòmina
          </span>
        </b-table-column>
        <b-table-column label="Data" field="emitted" v-slot="props" sortable>
          {{ formatDate(props.row.emitted) }}
        </b-table-column>
        <b-table-column
          label="Venciment"
          field="paybefore"
          v-slot="props"
          sortable
        >
          {{ formatDate(props.row.paybefore) }}
        </b-table-column>
        <b-table-column
          label="Contacte"
          field="contact.name"
          v-slot="props"
          sortable
        >
          {{ props.row.contact ? props.row.contact.name : "-" }}
        </b-table-column>
        <b-table-column
          label="NIF Contacte"
          field="contact.name"
          v-slot="props"
          sortable
        >
          {{ props.row.contact ? props.row.contact.nif : "-" }}
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
          {{ props.row.projects && props.row.projects.length ? props.row.projects[0].name : (props.row.project ? props.row.project.name : "-" ) }}
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
        <b-table-column label="Pagada" field="total" v-slot="props" sortable>
          {{ props.row.paid ? 'Sí' : 'No' }}
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
    contact: {
      type: Number,
      default: null,
    },
    documentType: {
      type: Number,
      default: null,
    }
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
      const contactQueryPayrolls = this.contact ? `&[users_permissions_user_eq]=-1` : '';

      let invoices = (        
        await service({ requiresAuth: true }).get(
          `received-invoices?_limit=${this.documentType === 0 || this.documentType === -1 ? -1 : 0}&_where[emitted_gte]=${from2}&[emitted_lte]=${to2}${contactQuery}`
        )
      ).data;

      invoices = invoices.map((element) => {
        return { ...element, type: 'received-invoices' };
      });

      const typeQuery = this.documentType !== 0 ? `&[document_type_eq]=${this.documentType}` : '';
      let expenses = (
        await service({ requiresAuth: true }).get(
          `received-expenses?_limit=-1&_where[emitted_gte]=${from2}&[emitted_lte]=${to2}${contactQuery}${typeQuery}`
        )
      ).data;

      expenses = expenses.map((element) => {
        return { ...element, type: 'received-expenses' };
      });


      let payrolls = (
        await service({ requiresAuth: true }).get(
          `payrolls?_limit=${this.documentType === 0 || this.documentType === -2 ? -1 : 0}&_where[emitted_gte]=${from2}&[emitted_lte]=${to2}&[paid_eq]=true${contactQueryPayrolls}`
        )
      ).data;

      payrolls = payrolls.map((element) => {
        return { ...element, type: 'payrolls', total_base: element.total };
      });

      const emitted = _.concat(invoices, expenses, payrolls)
      this.emitted = emitted

      this.emittedCSV = this.emitted.map((e) => {
        return {
          num: e.code,
          num_document_proveidor: e.contact_invoice_number ? e.contact_invoice_number : '',
          tipus: e.type == 'received-invoices' ? 'Factura' : ( e.type === 'received-expenses' ? e.document_type.name : 'Nómina' ),
          data: e.emitted,
          proveidor: e.contact ? e.contact.name : "",
          proveidor_nif: e.contact ? e.contact.nif : "",
          proveidor_adreça: e.contact ? e.contact.address : "",
          proveidor_cp: e.contact ? e.contact.postcode : "",
          proveidor_ciutat: e.contact ? e.contact.city : "",
          proveidor_provincia: e.contact ? e.contact.state : "",
          proveidor_pais: e.contact ? e.contact.country : "",
          concepte: e.lines && e.lines.length > 0 ? e.lines[0].concept : "",
          projecte: e.projects && e.projects.length ? e.projects[0].name : (e.project ? e.project.name : ""),
          base: e.total_base,
          iva: e.total_vat,
          irpf: e.total_irpf,
          total: e.total,
        };
      });

      this.isLoading = false;
    },
    zeroPad(num, places) {
      return String(num).padStart(places, '0')
    } 
  },
};
</script>
