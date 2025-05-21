<template>
  <section class="xsection">
    <b-loading
      :is-full-page="true"
      v-model="importing"
      :can-cancel="false"
    ></b-loading>

    <b-field label="Projecte *" horizontal>
      <b-autocomplete
        v-model="projectSearch"
        placeholder="Escriu el nom del projecte..."
        :keep-first="false"
        :open-on-focus="true"
        :data="filteredProjects"
        field="name"
        @select="projectSelected"
        :clearable="true"
      >
      </b-autocomplete>
    </b-field>

    <b-table
      ref="table"
      :paginated="false"
      :striped="false"
      :data="ordersGrouped"
      :debounce-search="500"
    >
      <b-table-column
        label="Proveïdora / Sòcia"
        field="owner.fullname"
        sortable
        searchable
        v-slot="props"
      >
      <router-link v-if="props.row.users_permissions_user" :to="{ name: 'contacts.edit', params: { id: props.row.users_permissions_user.id } }">
        {{ props.row.owner.fullname }} / {{ props.row.users_permissions_user ? props.row.users_permissions_user.name : '' }}
      </router-link>
      <span v-else>
        {{ props.row.owner.fullname }}
      </span>
      </b-table-column>
      <b-table-column
        label="Mes"
        searchable
        field="month"
        sortable
        v-slot="props"
      >
        {{ props.row.month }}
      </b-table-column>
      <b-table-column
        label="Comandes"
        searchable
        field="count"
        sortable
        v-slot="props"
      >
        {{ props.row.count }}
      </b-table-column>

      <b-table-column
        label="Preu"
        field="amount"
        sortable
        searchable
        number
        v-slot="props"
      >
        <div class="left-money-format">
          <money-format
            :value="props.row.amount"
            :locale="'es'"
            :currency-code="'EUR'"
            :subunits-value="false"
            :hide-subunits="false"
          >
          </money-format>
        </div>
      </b-table-column>
      <b-table-column label="Facturar" v-slot="props">
        <button
          @click="invoiceOrders(props.row.orders)"
          :disabled="importing || !projectSearch"
          class="button is-small is-warning"
        >
          FACTURAR
        </button>
      </b-table-column>
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
import _ from "lodash";
import { filter } from "lodash";

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
      importing: false,
      orders: [],
      ordersGrouped: [],
      me: {},
      projectSearch: "",
      projectId: null,
      projects: [],
      apiUrl: process.env.VUE_APP_API_URL
    };
  },
  computed: {
    ...mapState(["userName"]),
    ...mapState(["userId"]),
    theOrdersChecked() {
      return this.checkedRows.length
        ? this.orders.filter(o =>
            this.checkedRows.map(c => c.id).includes(o.id)
          )
        : this.theOrders;
    },
    filteredProjects() {
      return this.projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
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
    async getData() {
      this.isLoading = true;

      const me = await service({ requiresAuth: true, cached: true }).get(
        "users/me"
      );
      this.me = me.data;
      this.orders = (
        await service({ requiresAuth: true }).get(
          `orders?_limit=-1&_sort=route_date:DESC,id:DESC&_where[status_eq]=delivered`
        )
      ).data;

      const contacts = (
        await service({ requiresAuth: true, cached: true }).get(
          `contacts?_limit=-1&_sort=name:ASC&_where[users_permissions_user_gt]=0`
        )
      ).data;

      console.log("contacts", contacts);

      this.orders = this.orders.map(o => {                
        o.users_permissions_user = contacts.find(c => o.owner && c.users_permissions_user && c.users_permissions_user.id === o.owner.id);
        o.price = o.price * (1 - (o.multidelivery_discount || 0) / 100);
        return o;
      });

      console.log("this.orders", this.orders);

      this.projects = (
        await service({ requiresAuth: true, cached: true }).get(
          `projects/basic?_limit=-1&_sort=name:ASC`
        )
      ).data;

      // grouped by owner and month
      this.ordersGrouped = _.groupBy(this.orders, o => {
        return o.owner.id + "-" + moment(o.delivery_date).format("YYYY-MM");
      });

      this.ordersGrouped = Object.keys(this.ordersGrouped).map(k => {
        return {
          owner: this.ordersGrouped[k][0].owner,
          month: moment(this.ordersGrouped[k][0].delivery_date).format(
            "YYYY-MM"
          ),
          orders: this.ordersGrouped[k].map(o => o.id),
          count: this.ordersGrouped[k].length,
          amount: this.ordersGrouped[k].reduce((acc, o) => acc + o.price, 0),
          users_permissions_user: this.ordersGrouped[k][0].users_permissions_user
        };
      });

      this.isLoading = false;
    },
    async invoiceOrders(orders) {
      this.importing = true;

      await service({ requiresAuth: true })
        .post("orders/invoice", {
          orders: orders,
          project: this.projectId
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

        this.$buefy.snackbar.open({
              message: "Comandes facturades correctament",
              type: "is-success"
            });

      this.importing = false;

      this.checkedRows = [];
      this.getData();

      //console.log("response", response);
    },
    async projectSelected(project) {
      this.isLoading = true;
      this.projectSearch = project.name;
      this.projectId = project.id;
      this.isLoading = false;
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
.w-50 {
  width: 50%;
}
.left-money-format .money_format {
  text-align: left !important;
}
</style>
