<template>
  <!-- Redesign A: the members (users with the "orders" permission) -->
  <div>
    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Sòcies</span>
        <b>{{ users.length }}</b>
      </div>
      <div class="doc-kpi">
        <span>Aportacions</span>
        <b>{{ money(totalAmount) }}</b>
        <small>{{ withAmount }} {{ withAmount === 1 ? "sòcia" : "sòcies" }} amb aportació</small>
      </div>
      <div class="doc-kpi" :class="{ 'is-warn': withoutContact }">
        <span>Sense fitxa de contacte</span>
        <b>{{ withoutContact }}</b>
      </div>
    </div>

    <div class="filter-bar">
      <b-field class="filter-grow">
        <b-input v-model="search" type="search" icon="magnify" placeholder="Cerca per nom o correu" aria-label="Cerca sòcies" />
      </b-field>
      <span class="count">{{ filteredUsers.length }} {{ filteredUsers.length === 1 ? "sòcia" : "sòcies" }}</span>
      <download-excel class="export ml-auto" :data="users" name="socies" :fields="excelFields">
        <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
      </download-excel>
    </div>

    <div class="a-box list-box">
      <b-table :loading="isLoading" :paginated="false" :striped="false" :mobile-cards="false" :data="filteredUsers" default-sort="name">
        <b-table-column label="Sòcia" field="name" sortable v-slot="props">
          <router-link v-if="props.row.contact" :to="{ name: 'contacts.edit', params: { id: props.row.contact.id } }" class="partner-name">
            {{ props.row.contact.name }}
          </router-link>
          <b v-else class="partner-name">{{ props.row.fullname || props.row.username }}</b>
          <span class="subline">{{ props.row.fullname || props.row.username }}<template v-if="!props.row.contact"> · sense fitxa de contacte</template></span>
        </b-table-column>
        <b-table-column label="Accés" field="email" sortable v-slot="props">
          <a v-if="props.row.email" :href="`mailto:${props.row.email}`">{{ props.row.email }}</a>
          <span class="subline">usuària {{ props.row.id }}</span>
        </b-table-column>
        <b-table-column label="Aportació" field="amount" sortable numeric v-slot="props">
          <b v-if="props.row.contact && props.row.contact.partner_amount">{{ money(props.row.contact.partner_amount) }}</b>
          <span v-else class="has-text-muted">—</span>
          <span v-if="props.row.contact && props.row.contact.partner_amount_date" class="subline">{{ formatDate(props.row.contact.partner_amount_date) }}</span>
        </b-table-column>
        <!-- the warehouse her orders leave from: the simulator starts from it (issues/361) -->
        <b-table-column label="Magatzem" field="pickupName" sortable v-slot="props">
          <b-select
            size="is-small"
            :model-value="props.row.defaultPickupId"
            :disabled="savingPickup === props.row.id"
            :aria-label="`Magatzem per defecte de ${props.row.fullname || props.row.username}`"
            data-test="default-pickup"
            @update:model-value="value => setDefaultPickup(props.row, value)"
          >
            <option :value="null">—</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </b-select>
        </b-table-column>
        <template #empty>
          <p class="has-text-muted has-text-centered py-5">{{ search.trim() ? "Cap sòcia coincideix amb la cerca." : "Encara no hi ha cap sòcia." }}</p>
        </template>
      </b-table>
    </div>
  </div>
</template>

<script>
import service from "@/service/index";
import { userPermissions } from "@/domain/routeAccess";
import { formatMoney } from "@/helpers/format-number";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

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
      contacts: [],
      search: "",
      // the columns of the table (issues/018)
      excelFields: {
        "ID Usuària": "id",
        "Sòcia": "contact.name",
        "Nom": "username",
        "Nom complet": "fullname",
        "Correu accès": "email",
        "Permisos": "permissions",
        "Import aportació": "contact.partner_amount",
        "Data aportació": "contact.partner_amount_date",
        "Magatzem": "pickupName"
      },
      warehouses: [],
      savingPickup: null
    };
  },
  computed: {
    filteredUsers() {
      const words = this.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return this.users.filter(u => {
        const text = [u.contact && u.contact.name, u.fullname, u.username, u.email].filter(Boolean).join(" ").toLowerCase();
        return words.every(w => text.includes(w));
      });
    },
    totalAmount() {
      return this.users.reduce((a, u) => a + (Number(u.contact && u.contact.partner_amount) || 0), 0);
    },
    withAmount() {
      return this.users.filter(u => u.contact && Number(u.contact.partner_amount)).length;
    },
    withoutContact() {
      return this.users.filter(u => !u.contact).length;
    },
    ...mapState(useMainStore, ["userName"]),
    ...mapState(useMainStore, ["userId"])
  },
  async mounted() {
    this.getData();
  },
  methods: {
    async setDefaultPickup(user, value) {
      const pickup = value || null;
      this.savingPickup = user.id;
      try {
        const saved = (await service({ requiresAuth: true }).put(`users/${user.id}/default-pickup`, { pickup })).data.pickup;
        user.defaultPickupId = saved ? saved.id : null;
        user.pickupName = saved ? saved.name : "";
        this.$buefy.toast.open({ message: "Magatzem desat", type: "is-success" });
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar el magatzem", type: "is-danger" });
      } finally {
        this.savingPickup = null;
      }
    },
    money(value) {
      return formatMoney(Number(value) || 0);
    },
    formatDate(date) {
      return date ? String(date).split("-").reverse().join("/") : "";
    },
    async getData() {
      this.isLoading = true;

      this.users = (await service({ requiresAuth: true }).get(`users?_limit=-1`)).data

      // the narrow list: id, name, partner_amount(_date) and the user are read;
      // the core route came with populate=* (issues/326)
      this.contacts = (await service({ requiresAuth: true }).get(`contacts/basic?_limit=-1&_sort=name:ASC&_where[users_permissions_user_gt]=0`)).data

      // the default warehouse of each member (issues/361)
      const [pickups, defaults] = await Promise.all([
        service({ requiresAuth: true, cached: true }).get(`pickups?_limit=-1`).then(r => r.data || []).catch(() => []),
        service({ requiresAuth: true }).get(`users/default-pickups`).then(r => r.data || []).catch(() => [])
      ])
      this.warehouses = pickups.filter(p => p && p.pickup === false)
      const defaultOf = Object.fromEntries(defaults.map(d => [d.user, d.pickup]))

      this.users = this.users
        .filter(user => user.confirmed === true && user.blocked === false)
        .map(user => {
          // a member is anyone with `orders`, whatever else she has (issues/155)
          user.isMember = userPermissions(user).includes('orders');
          user.permissions = userPermissions(user)
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
          // sort keys of the table
          user.name = ((user.contact && user.contact.name) || user.fullname || user.username || "").toLowerCase();
          user.amount = Number(user.contact && user.contact.partner_amount) || 0;
          const pickup = defaultOf[user.id] || null;
          user.defaultPickupId = pickup ? pickup.id : null;
          user.pickupName = pickup ? pickup.name : "";
          return user;
        })
        .filter(user => user.isMember);
        
      

      this.isLoading = false;
    }
  }
};
</script>

<style scoped>
.partner-name {
  display: block;
  font-weight: 800;
}
.subline {
  display: block;
  font-size: .75rem;
  color: var(--a-muted);
}
.count {
  font-weight: 700;
  color: var(--a-fg-2);
}
</style>
