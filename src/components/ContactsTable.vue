<template>
  <section class="xsection">
    <div class="is-flex">
      <download-excel class="export" :data="contactsCSV">
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
        Nou Contacte
      </b-button>

      <b-field horizontal label="Cercar" class="ml-5 is-full-width">
        <b-input
          :value="filters.q"
          @keyup.native="queryProjects($event.target.value)"
          placeholder="Contacte"
        >
        </b-input>
      </b-field>
  </div>
    <!-- <pre>{{contacts}}</pre> -->
    <b-table
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="contacts"
    >
      <b-table-column label="Name" field="name" sortable v-slot="props">
        <router-link
          v-if="props.row.id"
          :to="{ name: 'contacts.edit', params: { id: props.row.id } }"
        >
          {{ props.row.name }}
        </router-link>
      </b-table-column>      
      <b-table-column
        label="NIF"
        field="nif"
        sortable
        v-slot="props"
      >
        {{ props.row.nif }}
      </b-table-column>
      <b-table-column
        label="Correu"
        field="email"
        sortable
        v-slot="props"
      >
        {{ props.row.email }}
      </b-table-column>      
    </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import moment from "moment";
import sumBy from "lodash/sumBy";

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
      contacts: [],
      contactsCSV: [],
      filters: {
        q: ''
      },
      queryChanged: 0,
    };
  },  
  async mounted() {
    this.getData();
  },
  methods: {
    navNew() {
      this.$router.push("/contact/0");
    },    
    async getData() {
      this.isLoading = true;      

      if (this.filters.q) {
        this.contacts = (await service({ requiresAuth: true })
          .get(
            `contacts/basic?_limit=-1&_sort=name:ASC&_q=${this.filters.q}`
          )).data;
      } else {
        this.contacts = (await service({ requiresAuth: true }).get(`contacts/basic?_limit=-1&_sort=name:ASC`)).data;
      }
      
      this.contactsCSV = this.contacts
      this.isLoading = false;
    },
    queryProjects(q) {
      if (this.queryChanged) {
        clearTimeout(this.queryChanged);
      }
      this.queryChanged = setTimeout(() => {
        this.filters.q = q;
        this.getData();
      }, 400);
    },
  },
};
</script>
