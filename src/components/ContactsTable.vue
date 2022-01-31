<template>
  <section class="xsection">
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
      contactsCSV: []      
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
      this.contacts = (await service({ requiresAuth: true }).get(`contacts?_limit=-1`)).data;
      this.contactsCSV = this.contacts
      // .map((e) => {
      //   return {
      //     num: e.code,
      //     data: e.date,
      //     proveidor: e.contact ? e.contact.name : "",
      //     nif: e.contact ? e.contact.nif : "",
      //     concepte: e.lines && e.lines.length > 0 ? e.lines[0].concepte : "-",
      //     projecte: e.project ? e.project.name : "-",
      //     base: e.total_base,
      //     vat: e.total_vat,
      //     irpf: e.total_irpf,
      //     total: e.total,
      //   };
      // });

      this.isLoading = false;
    },
  },
};
</script>
