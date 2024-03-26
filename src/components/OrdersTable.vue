<template>
  <section class="xsection">
    <div class="is-flex">
      <download-excel class="export" :data="contactsCSV">
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

      <!-- <b-field horizontal label="Cercar" class="ml-5 is-full-width">
        <b-input
          :value="filters.q"
          @keyup.native="queryProjects($event.target.value)"
          placeholder="Contacte"
        >
        </b-input>
      </b-field> -->
  </div>
    <!-- <pre>{{orders}}</pre> -->
    <b-table
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="orders"
    >
      <b-table-column label="ID" field="id" sortable v-slot="props">
        <router-link
          v-if="props.row.id"
          :to="{ name: 'orders.edit', params: { id: props.row.id } }"
        >
            {{ props.row.id.toString().padStart(4, '0') }}
        </router-link>
      </b-table-column>      
      <b-table-column
        label="Proveïdora"
        field="owner.fullname"
        sortable
        v-slot="props"
      >
        {{ props.row.owner.fullname }}
      </b-table-column>
      <b-table-column
        label="Projecte"
        field="project.name"
        sortable
        v-slot="props"
      >
        {{ props.row.project.name }}
      </b-table-column>
      <b-table-column
        label="Producte"
        field="product.name"
        sortable
        v-slot="props"
      >
        {{ props.row.product.name }}
      </b-table-column>
      <b-table-column
        label="Clienta"
        field="contact.name"
        sortable
        v-slot="props"
      >
        {{ props.row.contact.name }}
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
        label="Recollida"
        field="pickup.name"
        sortable
        v-slot="props"
      >
        {{ props.row.pickup ? props.row.pickup.name : '-' }}
      </b-table-column>
      <b-table-column
        label="Estat"
        field="status"
        sortable
        v-slot="props"
      >
      <span v-if="props.row.status === 'pending'" class="tag is-warning">PENDENT</span>
      <span v-else-if="props.row.status === 'invoiced'" class="tag is-success">{{ props.row.status}}</span>
      <span v-else-if="props.row.status === 'delivered'" class="tag is-success">{{ props.row.status}}</span>
      <span v-else class="tag is-info">{{ props.row.status}}</span>
        
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
import moment from "moment";
import sumBy from "lodash/sumBy";
import { mapState } from 'vuex'

export default {
  name: "Tresoreria",
  props: {
    titleStack: {
      type: Array,
      default: () => [],
    }
  },
  data() {
    return {
      isLoading: false,      
      orders: [],
      contactsCSV: [],
      filters: {
        q: '',
        userContacts: ''
      },
      queryChanged: 0,
    };
  },  
  computed: {
    ...mapState(['userName']),    
    ...mapState(['userId']),    
  },
  async mounted() {
    this.getData();
  },
  methods: {
    navNew() {
      const q = this.$route.meta.userContacts ? `?user=true` : '';
      this.$router.push("/order/0"+q);
    },    
    async getData() {
      
      this.isLoading = true;      

      const me = await service({ requiresAuth: true, cached: true }).get("users/me")    
      if (me.data.permissions.includes('projects')) {
        this.userFilter = ''
      } else {
        this.userFilter = `&_where[owner]=${me.data.id}`
      }

      this.orders = (await service({ requiresAuth: true }).get(`orders?_limit=-1&_sort=route_date:ASC${this.userFilter}`)).data;
      
      this.contactsCSV = this.orders
      this.isLoading = false;
    },
    // queryProjects(q) {
    //   if (this.queryChanged) {
    //     clearTimeout(this.queryChanged);
    //   }
    //   this.queryChanged = setTimeout(() => {
    //     this.filters.q = q;
    //     this.getData();
    //   }, 400);
    // },
  },
};
</script>
