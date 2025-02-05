<template>
  <section class="xsection">
    <b-table
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="users"
    >
      <b-table-column
        label="ID Usuària"
        field="id"
        sortable
        width="80"
        searchable
        v-slot="props"
      >
      {{ props.row.id }}
      </b-table-column>      
      <b-table-column
        label="Sòcia"
        searchable
        field="contact.name"
        sortable
        v-slot="props"
      >
      <router-link v-if="props.row.contact" :to="{ name: 'contacts.edit', params: { id: props.row.contact.id } }">
        {{ props.row.contact.name }}
      </router-link>
      <span v-else>NO</span>
      </b-table-column>
      <b-table-column
        label="Nom"
        searchable
        field="username"
        sortable
        v-slot="props"
      >
        {{ props.row.username }}
      </b-table-column>
      <b-table-column
        label="Nom complet"
        searchable
        field="fullname"
        sortable
        v-slot="props"
      >
        {{ props.row.fullname }}
      </b-table-column>
      <b-table-column
        label="Correu accès"
        searchable
        field="email"
        sortable
        v-slot="props"
      >
        {{ props.row.email }}
      </b-table-column>
      <b-table-column
        label="Permisos"
        searchable
        field="permissions"
        sortable
        v-slot="props"
      >
        {{ props.row.permissions }}
      </b-table-column>
      <b-table-column
        label="Permisos"
        searchable
        field="permissions"
        sortable
        v-slot="props"
      >
        {{ props.row.permissions }}
      </b-table-column>
      <b-table-column
        label="Import aportació"
        searchable
        field="contact.partner_amount"
        sortable
        v-slot="props"
      >
        {{ props.row.contact && props.row.contact.partner_amount ? props.row.contact.partner_amount + ' €' : '' }}
      </b-table-column>
      <b-table-column
        label="Data aportació"
        searchable
        field="contact.partner_amount_date"
        sortable
        v-slot="props"
      >
        {{ props.row.contact && props.row.contact.partner_amount_date ? props.row.contact.partner_amount_date : '' }}
      </b-table-column>
      
      
    </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import { name } from "lodash/sortBy";
import { mapState } from "vuex";

export default {
  name: "UsersTable",
  props: {
    titleStack: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isLoading: false,
      users: [],
      contacts: []
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
    async getData() {
      this.isLoading = true;

      this.users = (await service({ requiresAuth: true }).get(`users`)).data

      this.contacts = (await service({ requiresAuth: true }).get(`contacts?_where[users_permissions_user_gt]=0`)).data

      this.users = this.users
        .filter(user => user.confirmed === true && user.blocked === false)
        .map(user => {
          user.permissions = user.permissions.map(p => p.permission)
          .map(
            // alias hours as Hores
            // alias projects as Projectes
            // alias orders_admin as Comandes
            // alias orders as Sòcia

            permission => {
              if (permission === 'hours') return 'Hores';
              if (permission === 'projects') return 'Projectes';
              if (permission === 'orders_admin') return 'Administració de Comandes';
              if (permission === 'orders') return 'Sòcia';
              return permission;
            }
          )
          .join(', ');

          user.contact = this.contacts.find(contact => contact.users_permissions_user && contact.users_permissions_user.id === user.id);
          return user;
        });
      
        
      

      this.isLoading = false;
    }
  }
};
</script>
