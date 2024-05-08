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
        :message="`Crea comandes pujant arxiu CSV separat per comes`"
      >
      </file-upload>
    </div>

    <div class="is-flex">
      <download-excel
        class="export"
        :data="theOrders"
        type="csv"
        :escapeCsv="false"
        name="comandes.csv"
        :fields="{
          id: 'id',
          date: 'route_date',
          ...csvFields
        }"
      >
        <b-button
          title="Descarrega les dades de les teves comandes"
          class="export-button mt-0 mb-3"
          icon-left="download"
        />
      </download-excel>
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
          class="export-button mt-0 mb-3"
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
        {{ route.name }}
      </b-button>
    </div>

    <pre class="mb-2" v-if="csvErrors.length">{{ csvErrors }}</pre>

    <!-- <pre>{{ theOrders }}</pre> -->

    <div v-if="permissions.includes('orders_admin')" class="mb-3">
      <div class="is-flex">
        <div>
        <h2>CANVIAR ESTAT</h2>
      <div class="is-flex">
        <b-select v-model="newState" placeholder="">
          <option value="pending">PENDENT</option>
          <option value="processed">PROCESSADA</option>
          <option value="delivered">LLIURADA</option>
          <!-- <option value="invoiced">FACTURADA</option> -->
          <option value="cancelled">ANUL·LADA</option>
        </b-select>
        <button
          class="button is-danger ml-3"
          :disabled="!newState || !checkedRows.length"
          @click="setBulkState"
        >
          CANVIAR ESTAT
        </button>
      </div>
    </div>
    <div class="ml-6" v-if="'delivered' == statusFilter">
      <h2 class="pr-2">FACTURAR</h2>
      <div class="is-flex">        
        <button
          class="button is-danger zml-3"
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
      :checkable="permissions.includes('orders_admin')"
    >
      <b-table-column label="ID" field="id" sortable v-slot="props">
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
        v-slot="props"
      >
        {{ props.row.owner.fullname }}
      </b-table-column>
      <b-table-column label="Ruta" field="route.name" sortable v-slot="props">
        {{ props.row.route.name }}
      </b-table-column>
      <b-table-column
        label="Data com."
        field="route_date"
        sortable
        v-slot="props"
      >
        {{ props.row.route_date }}
      </b-table-column>
      <b-table-column
        label="Data est."
        field="estimated_delivery_date"
        sortable
        v-slot="props"
      >
        {{ props.row.estimated_delivery_date }}
      </b-table-column>
      <b-table-column
        label="Data lli."
        field="delivery_date"
        sortable
        v-slot="props"
      >
        {{ props.row.delivery_date }}
      </b-table-column>
      <b-table-column
        label="Clienta"
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
import assignRouteRate from "@/service/assignRouteRate";

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
        contact_name: "contact_name",
        contact_address: "contact_address",
        contact_postcode: "contact_postcode",
        contact_city: "contact_city",
        contact_nif: "contact_nif",
        contact_phone: "contact_phone",
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
      csvFields: {
        route_name: "route_name",
        owner_id: "owner_id",
        contact_name: "contact_name",
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
      csvExample: [
        {
          route_name: "RUTA01-DT-MARESME",
          owner_id: 0,
          contact_name: "Joan Garriga",
          contact_address: "Carrer de l'amargura 17",
          contact_postcode: "08001",
          contact_city: "Mataró",
          contact_nif: "000000001A",
          contact_phone: "93 123 45 67",
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
          contact_name: "Anna Garriga",
          contact_address: "Carrer de la font, 1",
          contact_postcode: "17001",
          contact_city: "Girona",
          contact_nif: "000000002A",
          contact_phone: "93 123 45 67",
          contact_time_slot_1_ini: "10",
          contact_time_slot_1_end: "11",
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
      ]
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
    }
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
    setStatusFilter(status) {
      this.statusFilter = status;
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
        return { ...o, route_name: o.route.name, owner_id: o.owner.id };
      });

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
      // for (const key in this.csvAlias) {
      //   const alias = this.csvAlias[key]
      // }

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
        if (!record.route_name) {
          this.csvErrors.push({ line: i, error: "No route" });
          return false;
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
            error: `Route ${record.route_name} not found`
          });
          return false;
        }
        if (
          !this.users.find(u => u.id.toString() === record.owner_id.toString())
        ) {
          this.csvErrors.push({
            line: i,
            error: `User ${record.owner_id} not found`
          });
          return false;
        }
        // if (
        //   record.pickup &&
        //   !this.pickups.find(
        //     p =>
        //       this.removeAccents(p.name) === this.removeAccents(record.pickup)
        //   )
        // ) {
        //   this.csvErrors.push({
        //     line: i,
        //     error: `Pickup ${record.pickup} not found`
        //   });
        //   return false;
        // }

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
          contact_time_slot_1_ini: record.contact_time_slot_1_ini ?? null,
          contact_time_slot_1_end: record.contact_time_slot_1_end ?? null,
          contact_time_slot_2_ini: record.contact_time_slot_2_ini ?? null,
          contact_time_slot_2_end: record.contact_time_slot_2_end ?? null,
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
          route: this.routes.find(
            r =>
              this.removeAccents(r.name) ===
              this.removeAccents(record.route_name)
          ),
          price: null,
          status: "CSV",
          _uuid: this.createUUID()
        };

        console.log("assignRouteRate");
        // console.log("order", order);
        // console.log("routeRates", this.routeRates);
        // console.log("orders", this.orders);

        const orderWithRate = {
          ...order,
          route_rate: assignRouteRate(order, this.routeRates, this.orders)
        };
        console.log("orderWithRate", orderWithRate);
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
    // assignRouteRate(order) {
    //   if (
    //     !this.routeRates ||
    //     this.routeRates.length === 0 ||
    //     !order.route ||
    //     !order.pickup ||
    //     !order.delivery_type
    //   ) {
    //     return order;
    //   }

    //   console.log("order", order.route);
    //   console.log("rates", this.routeRates);

    //   let rates = this.routeRates.filter(
    //     r =>
    //       (r.route && order.route && r.route.id === order.route.id) ||
    //       r.route === null
    //   );
    //   console.log("rates 0", rates);

    //   //check if we have pending orders for this route and owner
    //   console.log("order", order, order.pickup);
    //   if (order.pickup && order.pickup.pickup) {
    //     const pendingOrders = this.orders.filter(
    //       o =>
    //         o.route.id === order.route.id &&
    //         o.owner.id === order.owner.id &&
    //         o.status === "pending"
    //     );
    //     console.log("pendingOrders", pendingOrders);
    //     if (pendingOrders.length > 0) {
    //       // We have pending orders for this route and owner
    //       // Add your logic here
    //       console.log(
    //         "We have pending orders for this route and owner, applying NO PICKUP",
    //         pendingOrders
    //       );

    //       rates = rates.filter(
    //         r =>
    //           (r.pickup && order.pickup && r.pickup.id === 1) ||
    //           r.pickup === null
    //       );
    //     } else {
    //       // No pending orders for this route and owner
    //       // Add your logic here
    //       console.log("No pending orders for this route and owner");

    //       rates = rates.filter(
    //         r =>
    //           (r.pickup && order.pickup && r.pickup.id === order.pickup.id) ||
    //           r.pickup === null
    //       );
    //     }
    //   } else {
    //     rates = rates.filter(
    //       r =>
    //         (r.pickup && order.pickup && r.pickup.id === 1) || r.pickup === null
    //     );
    //   }

    //   // rates = rates.filter(
    //   //   r => (r.pickup && order.pickup && r.pickup.id === order.pickup.id) || r.pickup === null
    //   // );
    //   console.log("rates 1", rates);
    //   rates = rates.filter(
    //     r =>
    //       (r.delivery_type &&
    //         order.delivery_type &&
    //         r.delivery_type.id === order.delivery_type.id) ||
    //       r.delivery_type === null
    //   );
    //   console.log("rates 2", rates);
    //   if (rates.length > 1) {
    //     rates = rates.filter(r => r.route !== null);
    //   }
    //   console.log("rates 3", rates);
    //   if (rates.length === 0) {
    //     console.warn("no rates!", order);
    //   } else if (rates.length > 1) {
    //     console.warn("several rates!", order);
    //     order.route_rate = rates[0];
    //   } else {
    //     order.route_rate = rates[0];
    //   }

    //   if (order.kilograms !== null && order.route_rate) {
    //     const rate = order.route_rate;
    //     if (order.kilograms < 15) {
    //       order.price = rate.less15;
    //     } else if (order.kilograms < 30) {
    //       order.price = rate.less30;
    //     } else {
    //       order.price =
    //         rate.less30 + (order.kilograms - 30) * rate.additional30;
    //     }
    //   } else {
    //     console.warn("!order", order.kilograms, order.route_rate);
    //   }

    //   return order;
    // },
    async createCSVOrder(order) {
      const _uuid = order._uuid;
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
    invoiceOrders() {
      this.$buefy.snackbar.open({
          message: "Aquesta funcionalitat aviat estarà disponible!",
          queue: false
        });
    }
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
</style>
