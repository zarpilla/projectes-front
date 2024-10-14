<template>
  <section class="xsection">
    <b-loading
      :is-full-page="true"
      v-model="importing"
      :can-cancel="false"
    ></b-loading>

    <div class="is-flex">
      <b-button
        class="view-button is-primary mb-3"
        @click="navNew"
        icon-left="plus"
      >
        Nova Comanda
      </b-button>
    </div>

    <div class="is-flex">
      <file-upload
        class="mt-5 w-50"
        :multiple="false"
        entity="orders-imports"
        :ref-id="0"
        :field="'file'"
        :accept="'.csv'"
        @uploaded="uploaded($event, 'orders')"
        :pre-upload="preUpload"
        :message="`Crea comandes pujant arxiu CSV separat per comes`"
      >
      </file-upload>
      <file-upload
        class="mt-5 ml-4 w-50"
        :multiple="false"
        entity="orders-imports"
        :ref-id="0"
        :field="'file'"
        :accept="'.csv'"
        @uploaded="uploaded($event, 'contacts')"
        :pre-upload="preUpload"
        :message="`Crea punts d'entrega pujant arxiu CSV separat per comes`"
      >
      </file-upload>
    </div>

    <div class="is-flex">
      <span v-if="permissions.includes('orders_admin')">
      Exportar per a planificador:
      </span> 
      <download-excel
        v-if="permissions.includes('orders_admin')"
        class="export"
        :data="theOrdersChecked"
        type="csv"
        :escapeCsv="false"
        :name="comandesRouterCSVName()"
        :fields="csvFieldsRouter"
      >
        <b-button
          title="Descarrega les dades de les teves comandes"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="download"
        />
      </download-excel>
      <span>
        Exportar comandes:
      </span>
      <download-excel
        class="export"
        :data="theOrdersChecked"
        type="csv"
        :escapeCsv="false"
        :name="comandesCSVName()"
        :fields="{
          id: 'id',
          date: 'route_date',
          ...csvFields
        }"
      >
        <b-button
          title="Descarrega les dades de les teves comandes"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="download"
        />
      </download-excel>
      <span v-if="permissions.includes('orders_admin')">
        Ecologística:
      </span>
      <download-excel
        v-if="permissions.includes('orders_admin')"
        class="export"
        :data="theOrdersChecked"
        name="ecologistica.xlsx"
        :fields="{
          ...csvEcologistica
        }"
      >
        <b-button
          title="Descarrega les dades de les teves comandes en format per a Ecologística"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="download"
        />
      </download-excel>

      <span class="ml-auto">
      Exemple de fitxer CSV de comandes:      
      </span>
      <download-excel
        class="export"
        :data="csvExample"
        type="csv"
        :escapeCsv="false"
        name="exemple-comandes.csv"
        :fields="csvFields"
      >
        <b-button
          title="Descarrega exemple de fitxer CSV de comandes"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="file-delimited"
        />
      </download-excel>

      Exemple de fitxer CSV de punts d'entrega:
      <download-excel
        class="export"
        :data="csvExampleContacts"
        type="csv"
        :escapeCsv="false"
        name="exemple-contactes.csv"
        :fields="csvFieldsContacts"
      >
        <b-button
          title="Descarrega exemple de fitxer CSV de comandes"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="file-delimited"
        />
      </download-excel>
    </div>

    <!-- <pre>{{ theOrders }}</pre> -->
    <h4>ESTATS</h4>
    <div class="filters">
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === '',
          'is-warning': statusFilter !== ''
        }"
        @click="setStatusFilter('')"
      >
        TOTES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'pending',
          'is-warning': statusFilter !== 'pending'
        }"
        @click="setStatusFilter('pending')"
      >
        PENDENTS
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'processed',
          'is-warning': statusFilter !== 'processed'
        }"
        @click="setStatusFilter('processed')"
      >
        PROCESSADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'distributing',
          'is-warning': statusFilter !== 'distributing'
        }"
        @click="setStatusFilter('distributing')"
      >
        EN REPARTIMENT
      </b-button>

      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'delivered',
          'is-warning': statusFilter !== 'delivered'
        }"
        @click="setStatusFilter('delivered')"
      >
        LLIURADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'invoiced',
          'is-warning': statusFilter !== 'invoiced'
        }"
        @click="setStatusFilter('invoiced')"
      >
        FACTURADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'cancelled',
          'is-warning': statusFilter !== 'cancelled'
        }"
        @click="setStatusFilter('cancelled')"
      >
        ANUL·LADES
      </b-button>
    </div>
    <h4>RUTES</h4>
    <div class="filters">
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': routeFilter === '',
          'is-warning': routeFilter !== ''
        }"
        @click="setRouteFilter('')"
      >
        TOTES
      </b-button>
      <b-button
        v-for="route in routes"
        :key="route.id"
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': routeFilter === route.name,
          'is-warning': routeFilter !== route.name
        }"
        @click="setRouteFilter(route.name)"
      >
        {{ route.name }}
      </b-button>
    </div>

    <pre class="mb-2" v-if="csvErrors.length">{{ csvErrors }}</pre>

    <!-- <pre>{{ theOrders }}</pre> -->

    <div class="mb-3">
      <div class="is-flex">
        <div v-if="permissions.includes('orders_admin')">
          <h2>CANVIAR ESTAT</h2>
          <div class="is-flex">
            <b-select v-model="newState" placeholder="">
              <option value="pending">PENDENT</option>
              <option value="processed">PROCESSADA</option>
              <option value="distributing">EN REPARTIMENT</option>
              <option value="delivered">LLIURADA</option>
              <option value="cancelled">ANUL·LADA</option>
            </b-select>
            <button
              class="button is-primary ml-3"
              :disabled="!newState || !checkedRows.length"
              @click="setBulkState"
            >
              CANVIAR ESTAT
            </button>
          </div>
        </div>
        <div :class="{ 'ml-6': permissions.includes('orders_admin') }">
          <h2 class="pr-2">ALBARÀ</h2>
          <div class="is-flex">
            <button
              class="button is-primary zml-3"
              :disabled="!checkedRows.length"
              @click="pdfOrders"
            >
            Imprimeix PDF
            </button>
          </div>
        </div>
        <div class="ml-6" v-if="permissions.includes('orders_admin') && 'delivered' == statusFilter">
          <h2 class="pr-2">FACTURAR</h2>
          <div class="is-flex">
            <button
              class="button is-primary zml-3"
              :disabled="!checkedRows.length"
              @click="invoiceOrders"
            >
              FACTURAR
            </button>
          </div>
        </div>
      </div>
    </div>

    <b-table
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="theOrders"
      :checked-rows.sync="checkedRows"
      :is-row-checkable="row => true"
      :debounce-search="500"
      :checkable="true || permissions.includes('orders_admin')"
    >
      <b-table-column label="ID" field="idx" sortable v-slot="props" searchable>
        <router-link
          v-if="props.row.id"
          :to="{ name: 'orders.edit', params: { id: props.row.id } }"
        >
          {{ props.row.id.toString().padStart(4, "0") }}
        </router-link>
        <div v-else>
          <button
            class="button is-danger zbutton-small"
            @click="createCSVOrder(props.row)"
          >
            NOVA
          </button>
        </div>
      </b-table-column>
      <b-table-column
        label="Proveïdora"
        field="owner.fullname"
        sortable
        searchable
        v-slot="props"
      >
        {{ props.row.owner.fullname }}
      </b-table-column>
      <b-table-column
        label="Ruta"
        searchable
        field="route.name"
        sortable
        v-slot="props"
      >
        {{ props.row.route.name }}
      </b-table-column>
      <b-table-column
        label="Creada"
        searchable
        field="route_date"
        sortable
        v-slot="props"
      >
        {{ props.row.route_date }}
      </b-table-column>
      <b-table-column
        label="Prevista"
        searchable
        field="estimated_delivery_date"
        sortable
        v-slot="props"
      >
        {{ props.row.estimated_delivery_date }}
      </b-table-column>
      <b-table-column
        label="Lliurada"
        searchable
        field="delivery_date"
        sortable
        v-slot="props"
      >
        {{ props.row.delivery_date }}
      </b-table-column>
      <b-table-column
        label="Punt d'entrega"
        searchable
        field="contact.name"
        sortable
        v-slot="props"
      >
        {{
          props.row.contact ? props.row.contact.name : props.row.contact_name
        }}
      </b-table-column>
      <b-table-column
        label="Unitats"
        field="units"
        sortable
        searchable
        number
        v-slot="props"
      >
        {{ props.row.units }}
      </b-table-column>
      <b-table-column
        label="Kg"
        field="kilograms"
        sortable
        searchable
        number
        v-slot="props"
      >
        {{ props.row.kilograms }}
      </b-table-column>
      <b-table-column
        label="Entrega"
        searchable
        field="delivery_type.name"
        sortable
        v-slot="props"
      >
        {{ props.row.delivery_type ? props.row.delivery_type.name : "-" }}
      </b-table-column>
      <b-table-column
        label="Recollida"
        searchable
        field="pickup.name"
        sortable
        v-slot="props"
      >
        {{ props.row.pickup ? props.row.pickup.name : "-" }}
      </b-table-column>
      <b-table-column
        label="Preu"
        field="price"
        sortable
        searchable
        v-slot="props"
      >
        <money-format
          v-if="props.row.price"
          class="has-text-left"
          :value="props.row.price"
          :locale="'es'"
          :currency-code="'EUR'"
          :subunits-value="false"
          :hide-subunits="false"
        >
        </money-format>
        <span v-else>?</span>
      </b-table-column>
      <b-table-column
        label="Estat"
        field="status"
        sortable
        searchable
        v-slot="props"
      >
        <span
          v-if="props.row.status === 'pending'"
          class="tag is-warning bg-pending"
          >PENDENT</span
        >
        <span
          v-else-if="props.row.status === 'invoiced'"
          class="tag is-success bg-invoiced"
          >FACTURADA</span
        >
        <span
          v-else-if="props.row.status === 'delivered'"
          class="tag is-success"
          >LLIURADA</span
        >
        <span
          v-else-if="props.row.status === 'processed'"
          class="tag is-warning"
          >PROCESSADA</span
        >
        <span
          v-else-if="props.row.status === 'distributing'"
          class="tag is-info bg-distributing"
          >EN REPARTIMENT</span
        >
        <span v-else-if="props.row.status === 'cancelled'" class="tag is-danger"
          >ANUL·LADA</span
        >
        <span v-else class="tag is-info">{{ props.row.status }}</span>
      </b-table-column>

      <!-- <b-table-column
        label="Correu"
        field="email"
        sortable
        v-slot="props"
      >
        {{ props.row.email }}
      </b-table-column>       -->
    </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import { parse } from "csv-parse";
import { mapState } from "vuex";
import FileUpload from "@/components/FileUpload.vue";
import MoneyFormat from "@/components/MoneyFormat.vue";
import { assignRouteRate, assignRouteDate } from "@/service/assignRouteRate";
import moment from "moment";

export default {
  name: "Tresoreria",
  components: {
    FileUpload,
    MoneyFormat
  },
  props: {
    titleStack: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isLoading: false,
      orders: [],
      contactsCSV: [],
      filters: {
        q: "",
        userContacts: ""
      },
      queryChanged: 0,
      me: {},
      csv: "",
      csvRecords: [],
      csvErrors: [],
      statusFilter: "pending",
      routeFilter: "",
      csvOptions: {
        delimiter: ",",
        columns: true
      },
      importing: false,
      permissions: [],
      routes: [],
      users: [],
      deliveryTypes: [],
      pickups: [],
      routerates: [],
      checkedRows: [],
      newState: null,
      csvAlias: {
        route_name: "route_name",
        owner_id: "owner_id",
        estimated_delivery_date: "estimated_delivery_date",
        contact_name: "contact_name",
        contact_trade_name: "contact_trade_name",
        contact_address: "contact_address",
        contact_postcode: "contact_postcode",
        contact_city: "contact_city",
        contact_nif: "contact_nif",
        contact_phone: "contact_phone",
        contact_legal_form: "contact_legal_form",
        contact_time_slot_1_ini: "contact_time_slot_1_ini",
        contact_time_slot_1_end: "contact_time_slot_1_end",
        contact_time_slot_2_ini: "contact_time_slot_2_ini",
        contact_time_slot_2_end: "contact_time_slot_2_end",
        units: "units",
        kilograms: "kilograms",
        refrigerated: "refrigerated",
        fragile: "fragile",
        pickup: "pickup.name",
        provider_order_number: "provider_order_number",
        notes: "notes"
      },

      csvFieldsContacts: {        
        owner_id: "owner_id",        
        contact_name: "contact_name",
        contact_trade_name: "contact_trade_name",
        contact_address: {
          field: "contact_address",
          callback: value => {
            return this.addressFormatted(value);
          }
        },
        contact_postcode: "contact_postcode",
        contact_city: "contact_city",
        contact_nif: "contact_nif",
        contact_phone: "contact_phone",
        contact_legal_form: "contact_legal_form",
        contact_time_slot_1_ini: "contact_time_slot_1_ini",
        contact_time_slot_1_end: "contact_time_slot_1_end",
        contact_time_slot_2_ini: "contact_time_slot_2_ini",
        contact_time_slot_2_end: "contact_time_slot_2_end",
      },
      csvFields: {
        owner_id: "owner_id",
        owner_name: "owner.username",
        route_name: "route_name",        
        estimated_delivery_date: "estimated_delivery_date",
        contact_name: "contact_name",
        contact_trade_name: "contact_trade_name",
        contact_address: {
          field: "contact_address",
          callback: value => {
            return this.addressFormatted(value);
          }
        },
        contact_postcode: "contact_postcode",
        contact_city: "contact_city",
        contact_nif: "contact_nif",
        contact_phone: "contact_phone",
        contact_legal_form: "contact_legal_form.name",
        contact_time_slot_1_ini: "contact_time_slot_1_ini",
        contact_time_slot_1_end: "contact_time_slot_1_end",
        contact_time_slot_2_ini: "contact_time_slot_2_ini",
        contact_time_slot_2_end: "contact_time_slot_2_end",
        units: "units",
        kilograms: "kilograms",
        refrigerated: {
          field: "refrigerated",
          callback: value => {
            return value ? 1 : 0;
          }
        },
        fragile: "fragile",
        // pickup: 'pickup.name',
        pickup: {
          field: "pickup",
          callback: value => {
            return value && value.id && value.pickup ? 1 : 0;
          }
        },
        provider_order_number: "provider_order_number",
        notes: {
          field: "comments",
          callback: value => {
            return this.addressFormatted(value);
          }
        }
      },      
      csvFieldsRouter: {        
        "NOM CLIENT": "fullName",
        "TELEFON": "contact_phone",
        "ADREÇA": {
          field: "fullAddress",
          callback: value => {
            return this.addressFormatted(value);
          }
        },
        "DETALLS COMANDA": {
          field: "comments",
          callback: value => {
            return this.addressFormatted(value);
          }
        },        
        "HORARIS CLIENT": {
          field: "timeslot1And2",
          callback: value => {
            return this.addressFormatted(value);
          }
        },        
        "CAIXES": "units",
        "TOTAL KG": "kilograms",
        "DATA D'ENTREGA": "estimated_delivery_date",        
        "SOCIA": "owner.username",
        "MAIL": "owner.email",
        // contact_trade_name: "contact_trade_name",
        // contact_address: {
        //   field: "contact_address",
        //   callback: value => {
        //     return this.addressFormatted(value);
        //   }
        // },
        // contact_postcode: "contact_postcode",
        // contact_city: "contact_city",
        // contact_nif: "contact_nif",
        
        // contact_legal_form: "contact_legal_form",
        // contact_time_slot_1_ini: "contact_time_slot_1_ini",
        // contact_time_slot_1_end: "contact_time_slot_1_end",
        // contact_time_slot_2_ini: "contact_time_slot_2_ini",
        // contact_time_slot_2_end: "contact_time_slot_2_end",

        
      },
      csvEcologistica: {
        "pickup.address": {
          field: "contact_address",
          callback: value => {
            return "";
          }
        },
        "pickup.address.description": {
          field: "contact_address",
          callback: value => {
            return "";
          }
        },
        "pickup.address.name": {
          field: "contact_address",
          callback: value => {
            return "La Diligència";
          }
        },
        "pickup.address.telephone": {
          field: "contact_address",
          callback: value => {
            return "";
          }
        },
        "pickup.comments": {
          field: "comments",
          callback: value => {
            return "";
          }
        },
        "pickup.timeslot": {
          field: "comments",
          callback: value => {
            return "?";
          }
        },
        "dropoff.address": {
          field: "contact_address",
          callback: value => {
            return this.addressFormatted(value);
          }
        },
        "dropoff.address.description": "contact_legal_form.name",
        "dropoff.address.name": "contact_name",
        "dropoff.address.telephone": "contact_phone",
        "dropoff.comments": {
          field: "comments",
          callback: value => {
            return this.addressFormatted(value);
          }
        },
        "dropoff.timeslot": {
          field: "timeslot1",
          callback: value => {
            return `${value}`;
          }
        },
        weight: "kilograms",
        packages: "units",
        CP: "contact_postcode"
      },
      csvExample: [
        {
          route_name: "RUTA01-DT-MARESME",
          owner_id: 0,
          estimated_delivery_date: "20240215",
          contact_name: "Joan Garriga",
          contact_trade_name: "Begudes Garriga",
          contact_address: "Carrer de l'amargura 17",
          contact_postcode: "08001",
          contact_city: "Mataró",
          contact_nif: "000000001A",
          contact_phone: "93 123 45 67",
          contact_legal_form: "2",
          contact_time_slot_1_ini: "9",
          contact_time_slot_1_end: "12",
          contact_time_slot_2_ini: "16",
          contact_time_slot_2_end: "18",
          units: 2,
          kilograms: 3,
          refrigerated: "1",
          fragile: "0",
          pickup: "0",
          provider_order_number: "0560605",
          notes: "Trucar per telèfon abans de l'entrega"
        },
        {
          route_name: "RUTA02-DC-GIRONAINTERIOR",
          owner_id: 0,
          estimated_delivery_date: "",
          contact_name: "Queviures Font",
          contact_trade_name: "Queviures Maria Font",
          contact_address: "Carrer de la font, 1",
          contact_postcode: "17001",
          contact_city: "Girona",
          contact_nif: "000000002B",
          contact_phone: "93 123 45 76",
          contact_legal_form: "1",
          contact_time_slot_1_ini: "10",
          contact_time_slot_1_end: "15",
          contact_time_slot_2_ini: "16",
          contact_time_slot_2_end: "19",
          units: 1,
          kilograms: 1,
          refrigerated: "0",
          fragile: "1",
          pickup: "1",
          provider_order_number: "2024/0605",
          notes: "Recollida en finca"
        }
      ],
      csvExampleContacts: [
        {
          owner_id: 0,          
          contact_name: "Joan Garriga",
          contact_trade_name: "Begudes Garriga",
          contact_address: "Carrer de l'amargura 17",
          contact_postcode: "08001",
          contact_city: "Mataró",
          contact_nif: "000000001A",
          contact_phone: "93 123 45 67",
          contact_legal_form: "2",
          contact_time_slot_1_ini: "9",
          contact_time_slot_1_end: "12",
          contact_time_slot_2_ini: "16",
          contact_time_slot_2_end: "18",
        },
        {
          owner_id: 0,
          contact_name: "Queviures Font",
          contact_trade_name: "Queviures Maria Font",
          contact_address: "Carrer de la font, 1",
          contact_postcode: "17001",
          contact_city: "Girona",
          contact_nif: "000000002B",
          contact_phone: "93 123 45 76",
          contact_legal_form: "1",
          contact_time_slot_1_ini: "10",
          contact_time_slot_1_end: "15",
          contact_time_slot_2_ini: "16",
          contact_time_slot_2_end: "19",
        }
      ],
      apiUrl: process.env.VUE_APP_API_URL
    };
  },
  computed: {
    ...mapState(["userName"]),
    ...mapState(["userId"]),
    theOrders() {
      const orders = this.orders.filter(o => {
        if (this.statusFilter === "") {
          return true;
        } else {
          return o.status === this.statusFilter || o.status === "CSV";
        }
      });

      return orders.filter(o => {
        if (this.routeFilter === "") {
          return true;
        } else {
          return o && o.route && o.route.name === this.routeFilter;
        }
      });
    },
    theOrdersChecked() {
      return this.checkedRows.length
        ? this.theOrders.filter(o =>
            this.checkedRows.map(c => c.id).includes(o.id)
          )
        : this.theOrders;
    }
  },
  async created() {
    if (localStorage.getItem("OrdersTable.statusFilter")) {
      this.statusFilter = localStorage.getItem("OrdersTable.statusFilter");
    }
    if (localStorage.getItem("OrdersTable.routeFilter")) {
      this.routeFilter = localStorage.getItem("OrdersTable.routeFilter");
    }
    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    this.permissions = me.data.permissions.map(p => p.permission);
  },
  async mounted() {
    this.getData();
  },
  methods: {
    setStatusFilter(status) {
      //localStorage.setItem("OrdersTable.statusFilter", status);
      this.statusFilter = status;
      this.checkedRows = [];
    },
    setRouteFilter(route) {
      //localStorage.setItem("OrdersTable.routeFilter", route);
      this.routeFilter = route;
      this.checkedRows = [];
    },
    navNew() {
      const q = this.$route.meta.userContacts ? `?user=true` : "";
      this.$router.push("/order/0" + q);
    },
    async getData() {
      this.isLoading = true;

      const me = await service({ requiresAuth: true, cached: true }).get(
        "users/me"
      );
      this.me = me.data;
      if (me.data.permissions.map(p => p.permission).includes("orders_admin")) {
        this.userFilter = "";
      } else {
        this.userFilter = `&_where[owner]=${me.data.id}`;
        this.csvExample.forEach(element => {
          element.owner_id = me.data.id;
        });
        this.csvExampleContacts.forEach(element => {
          element.owner_id = me.data.id;
        });
      }
      this.orders = (
        await service({ requiresAuth: true }).get(
          `orders?_limit=-1&_sort=route_date:DESC${this.userFilter},id:DESC`
        )
      ).data;

      this.routes = (
        await service({ requiresAuth: true }).get(`routes?_limit=-1&_sort=order:ASC`)
      ).data;

      this.users = (
        await service({ requiresAuth: true, cached: true }).get(
          "users?_limit=-1"
        )
      ).data.filter(u =>
        u.permissions.map(p => p.permission).includes("orders")
      );

      if (me.data.permissions.map(p => p.permission).includes("orders_admin")) {
        this.csvExample.forEach(element => {
          element.owner_id = this.users[0].id;
        });
      }

      this.deliveryTypes = (
        await service({ requiresAuth: true }).get(`delivery-types?_limit=-1`)
      ).data;

      this.pickups = (
        await service({ requiresAuth: true }).get(`pickups?_limit=-1`)
      ).data;

      this.routeRates = (
        await service({ requiresAuth: true, cached: true }).get(
          "route-rates?_limit=-1"
        )
      ).data;

      this.orders = this.orders.map(o => {
        return {
          ...o,
          idx: o.id.toString().padStart(4, "0"),
          route_name: o.route.name,
          owner_id: o.owner.id,
          timeslot1: `${o.estimated_delivery_date} ${this.formatSlot(o.contact_time_slot_1_ini)} - ${o.estimated_delivery_date} ${this.formatSlot(o.contact_time_slot_1_end)}`,
          timeslot2: `${o.estimated_delivery_date} ${this.formatSlot(o.contact_time_slot_2_ini)} -${o.estimated_delivery_date} ${this.formatSlot(o.contact_time_slot_2_end)}`,
          fullAddress: `${o.contact_address}, ${o.contact_postcode} ${o.contact_city}`,
          timeslot1And2: `${this.formatSlot(o.contact_time_slot_1_ini)}-${this.formatSlot(o.contact_time_slot_1_end)} + ${this.formatSlot(o.contact_time_slot_2_ini)}-${this.formatSlot(o.contact_time_slot_2_end)}`,
          fullName: o.contact_trade_name ||o.contact_name,
        };
      });

      this.contactsCSV = this.orders;
      this.isLoading = false;
    },
    formatSlot(s) {
      return s && s.toString().includes('.') ? s.toString().replace('.5',':30') : `${s}:00`
    },
    async preUpload() {
      return await service({ requiresAuth: true }).post("orders-imports", {
        users_permissions_user: this.me.id
      });
    },
    uploaded(e, fileType) {
      console.log("uploaded", e);
      if (e.fileList && e.fileList[0]) {
        const file = e.fileList[0];
        const reader = new FileReader();

        if (file && file.name && !file.name.toLowerCase().endsWith(".csv")) {
          this.$buefy.snackbar.open({
            message: "Només es poden pujar arxius CSV",
            type: "is-danger"
          });
          return;
        }
        this.importing = true;

        reader.onload = async e => {
          const text = e.target.result;
          this.csv = text;
          const records = await this.readCSV(text);
          if (fileType === "orders") {
            await this.importCSV(records);
          } else {
            await this.importContactsCSV(records);
          }
          this.importing = false;
        };

        reader.readAsText(file);
      }
    },
    removeAccents(name) {
      return name
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    },
    async importCSV(records) {
      // for (const key in this.csvAlias) {
      //   const alias = this.csvAlias[key]
      // }

      let i = 2;
      this.csvErrors = [];
      for await (const record of records) {
        if (!record.route_name) {
          this.csvErrors.push({ line: i, error: "No route" });
          return false;
        }
        if (!record.contact_address) {
          this.csvErrors.push({ line: i, error: "No contact_address" });
          return false;
        }
        if (!record.contact_name) {
          this.csvErrors.push({ line: i, error: "No contact_name" });
          return false;
        }
        if (!record.contact_phone) {
          this.csvErrors.push({ line: i, error: "No contact_phone" });
          return false;
        }
        if (!record.contact_postcode) {
          this.csvErrors.push({ line: i, error: "No contact_postcode" });
          return false;
        }
        if (!record.contact_city) {
          this.csvErrors.push({ line: i, error: "No contact_city" });
          return false;
        }
        // if (!record.contact_nif) {
        //   this.csvErrors.push({ line: i, error: "No contact_nif" });
        //   return false;
        // }
        // if (!record.contact_time_slot_1_ini) {
        //   this.csvErrors.push({ line: i, error: "No contact_time_slot_1_ini" });
        //   return false;
        // }
        // if (!record.contact_time_slot_1_end) {
        //   this.csvErrors.push({ line: i, error: "No contact_time_slot_1_end" });
        //   return false;
        // }
        if (!record.kilograms) {
          this.csvErrors.push({ line: i, error: "No kilograms" });
          return false;
        }
        if (!record.units) {
          this.csvErrors.push({ line: i, error: "No units" });
          return false;
        }
        

        // L'hora d'inici del tram horari 1 no pot ser més gran que l'hora de finalitzaci
        if (record.contact_time_slot_1_ini && record.contact_time_slot_1_end) {
          if (
            parseFloat(record.contact_time_slot_1_ini) >=
            parseFloat(record.contact_time_slot_1_end)
          ) {
            console.log(
              "record",
              record
            );
            this.csvErrors.push({
              line: i,
              error: `L'hora d'inici del tram horari 1 no pot ser més gran que l'hora de finalització`
            });
            return false;
          }
        }

        // Cal indicar l'hora de finalització del tram horari 1
        if (record.contact_time_slot_1_ini && !record.contact_time_slot_1_end) {
          this.csvErrors.push({
            line: i,
            error: `Cal indicar l'hora de finalització del tram horari 1`
          });
          return false;
        }

        // El tram horari ha de ser més gran de 3 hores
        if (record.contact_time_slot_1_ini && record.contact_time_slot_1_end) {
          if (
            parseFloat(record.contact_time_slot_1_end) -
            parseFloat(record.contact_time_slot_1_ini < 3)
          ) {
            // comprovar també per al tram 2
            if (
              record.contact_time_slot_2_ini &&
              record.contact_time_slot_2_end
            ) {
              if (
                parseFloat(record.contact_time_slot_2_end) -
                parseFloat(record.contact_time_slot_2_ini < 3)
              ) {
                this.csvErrors.push({
                  line: i,
                  error: `El tram horari ha de ser mínim de 3 hores`
                });
                return false;
              }
            } else {
              this.csvErrors.push({
                line: i,
                error: `El tram horari ha de ser mínim de 3 hores`
              });
              return false;
            }
          }
        }

        if (
          !this.routes.find(
            r =>
              this.removeAccents(r.name) ===
              this.removeAccents(record.route_name)
          )
        ) {
          this.csvErrors.push({
            line: i,
            error: `Ruta ${record.route_name} no trobada`
          });
          return false;
        }

        if (
          !this.users.find(u => u.id.toString() === record.owner_id.toString())
        ) {
          this.csvErrors.push({
            line: i,
            error: `Owner ${record.owner_id} no trobat`
          });
          return false;
        }
        i++;

        const route = this.routes.find(
          r =>
            this.removeAccents(r.name) === this.removeAccents(record.route_name)
        );

        const routeDate = assignRouteDate(route)

        const order = {
          id: 0,
          route_date: new Date().toISOString().split("T")[0],
          estimated_delivery_date: record.estimated_delivery_date ?? null,
          contact_address: record.contact_address,
          contact_name: record.contact_name,
          contact_trade_name: record.contact_trade_name,
          contact_phone: record.contact_phone,
          contact_postcode: record.contact_postcode,
          contact_nif: record.contact_nif,
          contact_city: record.contact_city,
          contact_legal_form: record.contact_legal_form.id,
          contact_time_slot_1_ini: record.contact_time_slot_1_ini ?? null,
          contact_time_slot_1_end: record.contact_time_slot_1_end ?? null,
          contact_time_slot_2_ini: record.contact_time_slot_2_ini ?? null,
          contact_time_slot_2_end: record.contact_time_slot_2_end ?? null,
          contact: {
            name: record.contact_name,
            trade_name: record.contact_trade_name,
            address: record.contact_address,
            phone: record.contact_phone,
            postcode: record.contact_postcode,
            nif: record.contact_nif,
            city: record.contact_city,
            time_slot_1_ini: record.contact_time_slot_1_ini,
            time_slot_1_end: record.contact_time_slot_1_end,
            time_slot_2_ini: record.contact_time_slot_2_ini,
            time_slot_2_end: record.contact_time_slot_2_end
          },
          fragile: record.fragile === "1",
          refrigerated: record.refrigerated === "1",
          delivery_type:
            record.refrigerated === "1"
              ? this.deliveryTypes.find(d => d.refrigerated)
              : this.deliveryTypes.find(d => !d.refrigerated),
          pickup:
            record.pickup === "1"
              ? this.pickups.find(p => p.pickup)
              : this.pickups.find(p => !p.pickup),
          kilograms: parseInt(record.kilograms),
          units: parseInt(record.units),
          notes: record.notes,
          comments: record.notes,
          owner: this.permissions.includes("orders_admin")
            ? this.users.find(
                u => u.id.toString() === record.owner_id.toString()
              )
            : this.me,
          route: route,
          estimated_delivery_date: moment(
            routeDate.nextDay.toDate()
          ).format("YYYY-MM-DD"),
          price: null,
          status: "CSV",
          _uuid: this.createUUID()
        };

        if (routeDate.warning) {
          this.$buefy.toast.open({
            message: routeDate.warning,
            type: "is-warning",            
          });
          // this.$buefy.snackbar.open({
          //   message: routeDate.warning,
          //   type: "is-warning"
          // });
        }

        // console.log("assignRouteRate");
        // console.log("order", order);
        // console.log("routeRates", this.routeRates);
        // console.log("orders", this.orders);

        const orderWithRate = {
          ...order,
          route_rate: assignRouteRate(order, this.routeRates, this.orders)
        };
        orderWithRate.price = orderWithRate.route_rate.price;

        if (order.kilograms !== null && orderWithRate.route_rate) {
          const rate = orderWithRate.route_rate;
          if (order.kilograms < 15) {
            orderWithRate.price = rate.less15;
          } else if (order.kilograms < 30) {
            orderWithRate.price = rate.less30;
          } else {
            orderWithRate.price =
              rate.less30 + (order.kilograms - 30) * rate.additional30;
          }
        } else {
          // console.warn("!order", order.kilograms, order.route_rate);
        }
        this.orders.unshift(orderWithRate);
        // this.orders.unshift(order);
      }
    },
    async importContactsCSV(records) {
      // for (const key in this.csvAlias) {
      //   const alias = this.csvAlias[key]
      // }

      let i = 2;
      this.csvErrors = [];
      const contacts = [];
      for await (const record of records) {        
        if (!record.contact_address) {
          this.csvErrors.push({ line: i, error: "No contact_address" });
          return false;
        }
        if (!record.contact_name) {
          this.csvErrors.push({ line: i, error: "No contact_name" });
          return false;
        }
        if (!record.contact_phone) {
          this.csvErrors.push({ line: i, error: "No contact_phone" });
          return false;
        }
        if (!record.contact_postcode) {
          this.csvErrors.push({ line: i, error: "No contact_postcode" });
          return false;
        }
        if (!record.contact_city) {
          this.csvErrors.push({ line: i, error: "No contact_city" });
          return false;
        }

        // L'hora d'inici del tram horari 1 no pot ser més gran que l'hora de finalitzaci
        if (record.contact_time_slot_1_ini && record.contact_time_slot_1_end) {
          if (
            parseFloat(record.contact_time_slot_1_ini) >=
            parseFloat(record.contact_time_slot_1_end)
          ) {
            console.log(
              "record"
            );
            this.csvErrors.push({
              line: i,
              error: `L'hora d'inici del tram horari 1 no pot ser més gran que l'hora de finalització`
            });
            return false;
          }
        }

        // Cal indicar l'hora de finalització del tram horari 1
        if (record.contact_time_slot_1_ini && !record.contact_time_slot_1_end) {
          this.csvErrors.push({
            line: i,
            error: `Cal indicar l'hora de finalització del tram horari 1`
          });
          return false;
        }

        // El tram horari ha de ser més gran de 3 hores
        if (record.contact_time_slot_1_ini && record.contact_time_slot_1_end) {
          if (
            parseFloat(record.contact_time_slot_1_end) -
            parseFloat(record.contact_time_slot_1_ini < 3)
          ) {
            // comprovar també per al tram 2
            if (
              record.contact_time_slot_2_ini &&
              record.contact_time_slot_2_end
            ) {
              if (
                parseFloat(record.contact_time_slot_2_end) -
                parseFloat(record.contact_time_slot_2_ini < 3)
              ) {
                this.csvErrors.push({
                  line: i,
                  error: `El tram horari ha de ser mínim de 3 hores`
                });
                return false;
              }
            } else {
              this.csvErrors.push({
                line: i,
                error: `El tram horari ha de ser mínim de 3 hores`
              });
              return false;
            }
          }
        }

        if (record.owner_id.toString() === "0" && this.permissions.includes("orders_admin")) {
          record.owner_id = this.me.id;
          record.multiowner = true
        }
        else {
          record.multiowner = false
          if (!this.permissions.includes("orders_admin")) {
            record.owner_id = this.me.id;
          }
          if (
            !this.users.find(u => u.id.toString() === record.owner_id.toString())
          ) {
            this.csvErrors.push({
              line: i,
              error: `Owner ${record.owner_id} no trobat`
            });
            return false;
          }
          i++;

        }
      


        const contact = {
          name: record.contact_name,
            trade_name: record.contact_trade_name,
            address: record.contact_address,
            phone: record.contact_phone,
            postcode: record.contact_postcode,
            nif: record.contact_nif,
            city: record.contact_city,
            time_slot_1_ini: record.contact_time_slot_1_ini || null,
            time_slot_1_end: record.contact_time_slot_1_end || null,
            time_slot_2_ini: record.contact_time_slot_2_ini || null,
            time_slot_2_end: record.contact_time_slot_2_end || null,
            multiowner: record.multiowner,
            owner: record.owner_id
        };

        
        contacts.push(contact);
        i++;
      }

      for (const contact of contacts) {
        const { data } = await service({ requiresAuth: true }).post(
          "contacts",
          contact
        );
      }

      this.$buefy.snackbar.open({
        message: `${records.length} contactes importats correctament`,
        type: "is-success"
      });

      

    },
    createUUID() {
      var dt = new Date().getTime();
      var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function(c) {
          var r = (dt + Math.random() * 16) % 16 | 0;
          dt = Math.floor(dt / 16);
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        }
      );
      return uuid;
    },
    async readCSV(content) {
      return new Promise(async (resolve, reject) => {
        try {
          parse(content, this.csvOptions, (err, records) => {
            if (err) {
              console.error("Error importing file (2)", err);
              reject(err);
            }
            resolve(records);
          });
        } catch (e) {
          console.error("Error importing file (3)", e);
          reject(e);
        }
      });
    },
    async createCSVOrder(order) {
      const _uuid = order._uuid;

      if (order.estimated_delivery_date === "") {
        delete order.estimated_delivery_date;
      }
      const { data } = await service({ requiresAuth: true }).post(
        "orders/csv",
        order
      );

      if (!order.contact_time_slot_1_ini) {
        delete order.contact_time_slot_1_ini;
      }
      if (!order.contact_time_slot_1_end) {
        delete order.contact_time_slot_1_end;
      }
      if (!order.contact_time_slot_2_ini) {
        delete order.contact_time_slot_2_ini;
      }
      if (!order.contact_time_slot_2_end) {
        delete order.contact_time_slot_2_end;
      }
      if (order.contact && !order.time_slot_1_ini) {
        delete order.contact.time_slot_1_ini;
      }
      if (order.contact && !order.time_slot_1_end) {
        delete order.contact.time_slot_1_end;
      }
      if (order.contact && !order.time_slot_2_ini) {
        delete order.contact.time_slot_2_ini;
      }
      const orderToUpdate = this.orders.findIndex(
        o => o._uuid && o._uuid === _uuid
      );
      if (orderToUpdate >= 0) {
        this.orders[orderToUpdate].id = data.id;
        this.orders[orderToUpdate].status = data.status;
      }
    },
    addressFormatted(address) {
      return '"' + address + '"';
    },
    async setBulkState() {
      this.importing = true;
      for await (const row of this.checkedRows) {
        await service({ requiresAuth: true }).put(`orders/${row.id}`, {
          status: this.newState
        });
      }
      this.checkedRows = [];
      this.importing = false;
      this.getData();
    },
    async invoiceOrders() {
      this.importing = true;

      await service({ requiresAuth: true })
        .post("orders/invoice", {
          orders: this.checkedRows.map(o => o.id)
        })
        .catch(error => {
          console.error(error);
          if (error && error.data && error.data.message) {
            this.$buefy.snackbar.open({
              message: error.data.message,
              type: "is-danger"
            });
          }
        });

      this.importing = false;

      this.checkedRows = [];
      this.getData();

      //console.log("response", response);
    },
    async pdfOrders() {
      this.importing = true;

      try {      
        for await (const row of this.checkedRows) {
          const pdf = (
            await service({ requiresAuth: true }).get(
              `/orders/pdf/${row.id}`
            )
          ).data;
          for (const url of pdf.urls) {
            window.open(this.apiUrl + url);
          }
        }
      }
      catch (error) {
        console.error(error);
        if (error && error.data && error.data.message) {
          this.$buefy.snackbar.open({
            message: error.data.message,
            type: "is-danger"
          });
        }
      }

      this.importing = false;
    },
    comandesCSVName() {
      return `orders-${moment().format("YYYYMMDD-HHmmss")}.csv`;
    },
    comandesRouterCSVName() {
      return `comandes-${moment().format("YYYYMMDD-HHmmss")}.csv`;
    },
  }
};
</script>
<style>
.button.button-small {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: 20px;
  max-height: 24px;
}
.tag.bg-invoiced {
  background-color: grey !important;
  color: white !important;
}
.tag.bg-pending {
  background-color: #c9b460 !important;
  color: white !important;
}
.tag.bg-distributing {
  background-color: #ff7300 !important;
  color: white !important;
}
.w-50{
  width: 50%;
}
</style>
