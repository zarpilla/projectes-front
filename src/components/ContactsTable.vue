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
        Nou Contacte
      </b-button>

    </div>
    <b-table
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="contacts"
    >
      <b-table-column
        label="ID"
        field="id"
        sortable
        width="80"
        searchable
                v-slot="props"
      >
        <router-link
          :to="{ name: 'contacts.edit', params: { id: props.row.id } }"
        >
          {{ props.row.id }}
        </router-link>
      </b-table-column>
      <b-table-column label="Nom" searchable field="name" sortable v-slot="props">        
        {{ props.row.name }}
      </b-table-column>
      <b-table-column label="NIF" field="nif" searchable sortable v-slot="props">
        {{ props.row.nif }}
      </b-table-column>
      <b-table-column label="Correu" field="email" searchable sortable v-slot="props">
        {{ props.row.email }}
      </b-table-column>
      <b-table-column label="Telèfon" field="phone" searchable sortable v-slot="props">
        {{ props.row.phone }}
      </b-table-column>
      <b-table-column label="Tipus" field="contact_type_display" searchable sortable v-slot="props">
        {{ props.row.contact_type_display }}
      </b-table-column>
      <b-table-column label="Contacte de" field="props.row.owner.username" searchable sortable v-slot="props">
        <span v-if="props.row.multidelivery">MULTIENTREGA</span>
        <span v-else-if="props.row.multiowner">TOTES</span>        
        <span v-else-if="props.row.owner && (props.row.owner.fullname || props.row.owner.username)">{{ props.row.owner.fullname || props.row.owner.username }}</span>
      </b-table-column>
    </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import moment from "moment";
import sumBy from "lodash/sumBy";
import { mapState } from "vuex";

export default {
  name: "Tresoreria",
  props: {
    titleStack: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isLoading: false,
      contacts: [],
      contactsCSV: [],
      filters: {
        q: "",
        userContacts: ""
      },
      queryChanged: 0,
      orders_admin: false
    };
  },
  computed: {
    ...mapState(["userName"]),
    ...mapState(["userId"])
  },
  async mounted() {
    this.getData();
  },
  methods: {
    navNew() {
      const q = this.$route.meta.userContacts ? `?user=true` : "";
      this.$router.push("/contact/0" + q);
    },
    async getData() {
      this.isLoading = true;

      var userContacts = false;
      if (this.$route.meta.userContacts) {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        const permissions = me.data.permissions.map(p => p.permission);
        if (permissions.includes("orders_admin")) {
          this.orders_admin = true;
          this.userContacts = `&_where[owner_ne]=null`;
        } else {
          this.userContacts = `&_where[owner]=${me.data.id}`;
          userContacts = true;
        }
        
      } else {
        this.userContacts = "&_where[owner_null]=true";
      }

      if (this.filters.q) {
        this.contacts = (
          await service({ requiresAuth: true }).get(
            `contacts/basic?_limit=-1&_sort=name:ASC&_q=${this.filters.q}${this.userContacts}`
          )
        ).data;        
      } else {
        this.contacts = (
          await service({ requiresAuth: true }).get(
            `contacts/basic?_limit=-1&_sort=name:ASC${this.userContacts}`
          )
        ).data;

        if (userContacts) {
          const multideliveryContacts = (
            await service({ requiresAuth: true }).get(
              `contacts/basic?_limit=-1&_sort=name:ASC&_where[multidelivery_eq]=true`
            )
          ).data;
          this.contacts = this.contacts.concat(multideliveryContacts);
        }
      }

      this.contacts = this.contacts.map(contact => {
        return {
          ...contact,
          contact_type_display: contact.contact_types.map(ct => ct.name).join(", ")
        };
      });

      this.contactsCSV = this.contacts;
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
    }
  }
};
</script>
