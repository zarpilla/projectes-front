<template>
  <section class="xsection">
    <b-loading
      :is-full-page="true"
      v-model="importing"
      :can-cancel="false"
    ></b-loading>

    <div class="is-flex">
      <download-excel class="export" :data="theOrders"
      type="csv"
      :escapeCsv="false"
      name="comandes.csv"
      :fields="{
        id: 'id',
        date: 'route_date',
        route: 'route.name',
        owner: 'owner.id',        
        contact_name: 'contact_name',
        contact_address: {
          field: 'contact_address',
          callback: (value) => {
            return addressFormatted(value);
          },
        },
        contact_postcode: 'contact_postcode',
        contact_city: 'contact_city',
        contact_nif: 'contact_nif',
        contact_phone: 'contact_phone',
        contact_time_slot_1_ini: 'contact_time_slot_1_ini',
        contact_time_slot_1_end: 'contact_time_slot_1_end',
        contact_time_slot_2_ini: 'contact_time_slot_2_ini',
        contact_time_slot_2_end: 'contact_time_slot_2_end',
        units: 'units',
        kilograms: 'kilograms',
        refrigerated: 'refrigerated',
        fragile: 'fragile',
        pickup: 'pickup.name',
        notes: {
          field: 'comments',
          callback: (value) => {
            return addressFormatted(value);
          },
        },
      }">
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
        Nova Comanda
      </b-button>
    </div>

    <div>
      <file-upload
        class="mt-5"
        :multiple="false"
        entity="orders-imports"
        :ref-id="0"
        :field="'file'"
        :accept="'.csv'"
        @uploaded="uploaded"
        :pre-upload="preUpload"
        :message="`Pujar arxiu CSV`"
      >
      </file-upload>
    </div>

    <h4>ESTATS</h4>
    <div class="filters">
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === '',
          'is-warning': statusFilter !== ''
        }"
        @click="statusFilter = ''"
      >
        TOTES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'pending',
          'is-warning': statusFilter !== 'pending'
        }"
        @click="statusFilter = 'pending'"
      >
        PENDENTS
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'processed',
          'is-warning': statusFilter !== 'processed'
        }"
        @click="statusFilter = 'processed'"
      >
        PROCESSADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'delivered',
          'is-warning': statusFilter !== 'delivered'
        }"
        @click="statusFilter = 'delivered'"
      >
        LLIURADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'invoiced',
          'is-warning': statusFilter !== 'invoiced'
        }"
        @click="statusFilter = 'invoiced'"
      >
        FACTURADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3"
        :class="{
          'is-primary': statusFilter === 'cancelled',
          'is-warning': statusFilter !== 'cancelled'
        }"
        @click="statusFilter = 'cancelled'"
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
        @click="routeFilter = ''"
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
        @click="routeFilter = route.name"
      >
        {{ route.name}}
      </b-button>
    </div>

    <pre class="mb-2" v-if="csvErrors.length">{{ csvErrors }}</pre>

    <!-- <pre>{{ theOrders }}</pre> -->

    <b-table
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="theOrders"
    >
      <b-table-column label="ID" field="id" sortable v-slot="props">
        <router-link
          v-if="props.row.id"
          :to="{ name: 'orders.edit', params: { id: props.row.id } }"
        >
          {{ props.row.id.toString().padStart(4, "0") }}
        </router-link>
        <div v-else>
          <button class="button is-danger zbutton-small" @click="createCSVOrder(props.row)">NOVA</button>          
        </div>
      </b-table-column>
      <b-table-column
        label="Proveïdora"
        field="owner.fullname"
        sortable
        v-slot="props"
      >
        {{ props.row.owner.fullname }}
      </b-table-column>
      <b-table-column label="Ruta" field="route.name" sortable v-slot="props">
        {{ props.row.route.name }}
      </b-table-column>
      <b-table-column label="Data" field="route_date" sortable v-slot="props">
        {{ props.row.route_date }}
      </b-table-column>
      <b-table-column
        label="Clienta"
        field="contact.name"
        sortable
        v-slot="props"
      >
        {{ props.row.contact ? props.row.contact.name : props.row.contact_name }}
      </b-table-column>
      <b-table-column
        label="Unitats"
        field="units"
        sortable
        number
        v-slot="props"
      >
        {{ props.row.units }}
      </b-table-column>
      <b-table-column
        label="Kg"
        field="kilograms"
        sortable
        number
        v-slot="props"
      >
        {{ props.row.kilograms }}
      </b-table-column>
      <b-table-column
        label="Entrega"
        field="delivery_type.name"
        sortable
        v-slot="props"
      >
        {{ props.row.delivery_type ? props.row.delivery_type.name : "-" }}
      </b-table-column>
      <b-table-column
        label="Recollida"
        field="pickup.name"
        sortable
        v-slot="props"
      >
        {{ props.row.pickup ? props.row.pickup.name : "-" }}
      </b-table-column>
      <b-table-column label="Preu" field="price" sortable v-slot="props">
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
      <b-table-column label="Estat" field="status" sortable v-slot="props">
        <span v-if="props.row.status === 'pending'" class="tag is-warning"
          >PENDENT</span
        >
        <span v-else-if="props.row.status === 'invoiced'" class="tag is-success"
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
      statusFilter: "",
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
      routerates: []
    };
  },
  computed: {
    ...mapState(["userName"]),
    ...mapState(["userId"]),
    theOrders() {
      const orders =
      this.orders.filter(o => {
        if (this.statusFilter === "") {
          return true;
        } else {
          return o.status === this.statusFilter;
        }
      });

      return orders.filter(o => {
        if (this.routeFilter === "") {
          return true;
        } else {
          return o.route && o.route.name === this.routeFilter;
        }
      });
    },    
  },
  async created() {
    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    this.permissions = me.data.permissions.map(p => p.permission);
  },
  async mounted() {
    this.getData();
  },
  methods: {
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
      }
      this.orders = (
        await service({ requiresAuth: true }).get(
          `orders?_limit=-1&_sort=route_date:DESC${this.userFilter},id:DESC`
        )
      ).data;

      this.routes = (
        await service({ requiresAuth: true }).get(`routes?_limit=-1`)
      ).data;

      this.users = (
        await service({ requiresAuth: true, cached: true }).get(
          "users?_limit=-1"
        )
      ).data.filter(u =>
        u.permissions.map(p => p.permission).includes("orders")
      );

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

      this.contactsCSV = this.orders;
      this.isLoading = false;
    },
    async preUpload() {
      return await service({ requiresAuth: true }).post("orders-imports", {
        users_permissions_user: this.me.id
      });
    },
    uploaded(e) {
      console.log("uploaded", e);
      if (e.fileList && e.fileList[0]) {
        const file = e.fileList[0];
        const reader = new FileReader();

        if (file && file.name && !file.name.toLowerCase().endsWith('.csv')) {
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
          await this.importCSV(records);
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
      console.log("this.routes", this.routes);
      let i = 2;
      this.csvErrors = [];
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
        if (!record.contact_nif) {
          this.csvErrors.push({ line: i, error: "No contact_nif" });
          return false;
        }
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
        if (!record.route) {
          this.csvErrors.push({ line: i, error: "No route" });
          return false;
        }
        if (
          !this.routes.find(
            r => this.removeAccents(r.name) === this.removeAccents(record.route)
          )
        ) {
          this.csvErrors.push({
            line: i,
            error: `Route ${record.route} not found`
          });
          return false;
        }
        if (
          !this.users.find(u => u.id.toString() === record.owner.toString())
        ) {
          this.csvErrors.push({
            line: i,
            error: `User ${record.owner} not found`
          });
          return false;
        }
        if (
          record.pickup &&
          !this.pickups.find(
            p =>
              this.removeAccents(p.name) === this.removeAccents(record.pickup)
          )
        ) {
          this.csvErrors.push({
            line: i,
            error: `Pickup ${record.pickup} not found`
          });
          return false;
        }

        i++;
        const order = {
          id: 0,
          route_date: new Date().toISOString().split("T")[0],
          contact_address: record.contact_address,
          contact_name: record.contact_name,
          contact_phone: record.contact_phone,
          contact_postcode: record.contact_postcode,
          contact_nif: record.contact_nif,
          contact_city: record.contact_city,
          contact_time_slot_1_ini: record.contact_time_slot_1_ini,
          contact_time_slot_1_end: record.contact_time_slot_1_end,
          contact_time_slot_2_ini: record.contact_time_slot_2_ini,
          contact_time_slot_2_end: record.contact_time_slot_2_end,
          contact: {
            name: record.contact_name,
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
          pickup: record.pickup
            ? this.pickups.find(
                p =>
                  this.removeAccents(p.name) ===
                  this.removeAccents(record.pickup)
              )
            : this.pickups[0],
          kilograms: parseInt(record.kilograms),
          units: parseInt(record.units),
          notes: record.notes,
          comments: record.notes,
          owner: this.permissions.includes("orders_admin")
            ? this.users.find(u => u.id.toString() === record.owner.toString())
            : this.me,
          route: this.routes.find(
            r => this.removeAccents(r.name) === this.removeAccents(record.route)
          ),
          price: null,
          status: "CSV",
          _uuid: this.createUUID()
        };
        
        const orderWithRate = this.assignRouteRate(order);
        this.orders.unshift(orderWithRate);
      }
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
    assignRouteRate(order) {
      if (
        !this.routeRates ||
        this.routeRates.length === 0 ||
        !order.route ||
        !order.pickup ||
        !order.delivery_type
      ) {
        return order;
      }

      console.log("order", order.route);
      console.log("rates", this.routeRates  );

      let rates = this.routeRates.filter(
        r => (r.route && order.route && r.route.id === order.route.id) || r.route === null
      );
      console.log("rates 0", rates);
      rates = rates.filter(
        r => (r.pickup && order.pickup && r.pickup.id === order.pickup.id) || r.pickup === null
      );
      console.log("rates 1", rates);
      rates = rates.filter(
        r =>
          (r.delivery_type && order.delivery_type && r.delivery_type.id === order.delivery_type.id) ||
          r.delivery_type === null
      );
      console.log("rates 2", rates);
      if (rates.length > 1) {
        rates = rates.filter(r => r.route !== null);
      }
      console.log("rates 3", rates);
      if (rates.length === 0) {
        console.warn("no rates!", order);
      } else if (rates.length > 1) {
        console.warn("several rates!", order);
        order.route_rate = rates[0];
      } else {        
        order.route_rate = rates[0];        
      }
      
      if (order.kilograms !== null && order.route_rate) {        
        const rate = order.route_rate;
        if (order.kilograms < 15) {
          order.price = rate.less15;
        } else if (order.kilograms < 30) {
          order.price = rate.less30;
        } else {
          order.price =
            rate.less30 + (order.kilograms - 30) * rate.additional30;
        }        
      } else {
        console.warn("!order", order.kilograms, order.route_rate);  
      }

      return order;
    },
    async createCSVOrder(order) {
      const _uuid = order._uuid;
      const { data } = await service({ requiresAuth: true }).post("orders/csv", order);
      const orderToUpdate = this.orders.findIndex(o => o._uuid && o._uuid === _uuid)
      if (orderToUpdate >= 0) {
        this.orders[orderToUpdate].id = data.id
      }
    },
    addressFormatted(address) {
      return '"' + address + '"';
    },
  }
};
</script>
<style>
.button.button-small{
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: 20px;
  max-height: 24px;
}</style>