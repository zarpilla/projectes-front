<template>
  <section class="xsection">
    <modal-box-unify-contacts
      :is-active="isUnifyModalActive"
      @cancel="isUnifyModalActive = false"
      @confirm="onUnifyConfirm"
    ></modal-box-unify-contacts>

    <!-- Redesign A (contacts): one toolbar with search, type filter, count and actions -->
    <div v-if="!userContacts" class="contacts-toolbar">
      <b-input
        v-model="search"
        class="contacts-search"
        type="search"
        icon="magnify"
        placeholder="Cerca per nom, NIF, correu o població"
        aria-label="Cerca contactes"
      />
      <div v-if="contactTypeNames.length" class="segmented" role="group" aria-label="Tipus de contacte">
        <button type="button" :class="{ 'is-on': !typeFilter }" :aria-pressed="!typeFilter ? 'true' : 'false'" @click="typeFilter = ''">Tots</button>
        <button
          v-for="name in contactTypeNames"
          :key="name"
          type="button"
          :class="{ 'is-on': typeFilter === name }"
          :aria-pressed="typeFilter === name ? 'true' : 'false'"
          @click="typeFilter = name"
        >{{ name }}</button>
      </div>
      <span class="contacts-count">{{ filteredContacts.length }} {{ filteredContacts.length === 1 ? "contacte" : "contactes" }}</span>
      <div class="contacts-actions">
        <download-excel class="export" :data="contactsCSV" :escapeCsv="false" name="contactes" :fields="csv">
          <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
        </download-excel>
        <b-button type="is-primary" icon-left="plus" @click="navNew">Nou contacte</b-button>
      </div>
    </div>
    <div v-else class="is-flex">
      <download-excel
        class="export"
        :data="contactsCSV"
        :escapeCsv="false"
        name="punts-entrega"
        :fields="csv2"
        v-if="userContacts"
      >
        <b-button
          title="Exporta dades"
          class="export-button mt-0 mb-3"
          icon-left="file-excel"
        />
      </download-excel>
      <download-excel
        class="export"
        :data="contactsCSV"
        :escapeCsv="false"
        name="contactes"
        :fields="csv"
        v-else
      >
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
        <span v-if="userContacts">Nou punt d'entrega</span>
        <span v-else>Nou Contacte</span>
      </b-button>
      <b-button
        v-if="userContacts && orders_admin"
        class="view-button is-warning mb-3 ml-2"
        @click="openUnifyModal"
        icon-left="call-merge"
        title="Unificar punts d'entrega"
      >
        Unificar punts d'entrega
      </b-button>
    </div>
    <div v-if="!userContacts" class="card has-table contacts-card">
      <b-table
        :loading="isLoading"
        :paginated="true"
        :per-page="50"
        pagination-position="bottom"
        :striped="false"
        :mobile-cards="false"
        :data="filteredContacts"
        aria-next-label="Pàgina següent"
        aria-previous-label="Pàgina anterior"
        aria-page-label="Pàgina"
        aria-current-label="Pàgina actual"
      >
        <b-table-column label="Nom" field="name" sortable v-slot="props">
          <router-link class="contact-name" :to="{ name: 'contacts.edit', params: { id: props.row.id } }">
            {{ props.row.name || "(sense nom)" }}
          </router-link>
          <span class="contact-subline">{{ [props.row.nif, props.row.city].filter(Boolean).join(" · ") || "—" }}</span>
        </b-table-column>
        <b-table-column label="Contacte" field="email" sortable v-slot="props">
          <a v-if="props.row.email" :href="'mailto:' + props.row.email" class="contact-line">{{ props.row.email }}</a>
          <span v-if="props.row.phone" class="contact-line">{{ props.row.phone }}</span>
          <span v-if="!props.row.email && !props.row.phone" class="has-text-muted">—</span>
        </b-table-column>
        <b-table-column label="Tipus" field="contact_type_display" sortable v-slot="props">
          <span v-for="t in (props.row.contact_type_display || '').split(', ').filter(Boolean)" :key="t" class="tag mr-1">{{ t }}</span>
        </b-table-column>
        <template #empty>
          <p class="has-text-muted has-text-centered py-5">Cap contacte coincideix amb la cerca.</p>
        </template>
      </b-table>
    </div>
    <b-table
      :loading="isLoading"
      :paginated="true"
      :per-page="50"
      pagination-position="both"
      :striped="false"
      :data="contacts"
      v-else
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
          :to="{ name: 'contactsuser.edit', params: { id: props.row.id } }"
        >
          {{ props.row.id }}
        </router-link>
      </b-table-column>
      <b-table-column
        label="Nom comercial"
        searchable
        field="trade_name"
        sortable
        v-slot="props"
      >
        {{ props.row.trade_name }}
      </b-table-column>
      <b-table-column
        label="NIF"
        searchable
        field="nif"
        sortable
        v-slot="props"
      >
        {{ props.row.nif }}
      </b-table-column>
      <b-table-column
        v-if="userContacts"
        label="Població"
        field="city"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.city || "-" }}
      </b-table-column>
      <b-table-column
        label="Sector"
        field="sector.name"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.sector ? props.row.sector.name : "-" }}
      </b-table-column>
      <b-table-column
        label="Horari"
        field="timeSlot1And2"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.timeSlot1And2 || "-" }}
      </b-table-column>
      <b-table-column
        v-if="orders_admin"
        label="Contacte de"
        field="contact_of_display"
        searchable
        sortable
        v-slot="props"
      >
        <span v-if="props.row.multidelivery">MULTIENTREGA</span>
        <span v-else-if="props.row.multiowner">TOTES</span>
        <span
          v-else-if="
            props.row.owner &&
              (props.row.owner.fullname || props.row.owner.username)
          "
          >{{ props.row.owner.fullname || props.row.owner.username }}</span
        >
      </b-table-column>      
      <b-table-column
        v-if="orders_admin"
        label="Rutes"
        field="routes_flattened"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.routes_flattened || "-" }}
      </b-table-column>
      <b-table-column
        v-if="orders_admin"
        label="Sòcies"
        field="owners_flattened"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.owners_flattened || "-" }}
      </b-table-column>
      <b-table-column
        v-if="orders_admin"
        label="Comandes 1any"
        field="num_orders"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.num_orders || 0 }}
      </b-table-column>
      <b-table-column
        v-else
        label="Núm comandes"
        field="num_orders"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.num_orders || 0 }}
      </b-table-column>
    </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import ModalBoxUnifyContacts from "@/components/ModalBoxUnifyContacts.vue";

export default {
  name: "ContactsTable",
  components: {
    ModalBoxUnifyContacts
  },
  props: {
    titleStack: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      // redesign: one search and a type filter for the contacts list
      search: "",
      typeFilter: "",
      isLoading: false,
      isUnifyModalActive: false,
      contacts: [],
      contactsCSV: [],
      filters: {
        q: "",
        userContacts: ""
      },
      queryChanged: 0,
      orders_admin: false,
      userContacts: false,
      csv: {
        Id: "id",
        nom: "name",
        NomComercial: "trade_name",
        NIF: "nif",
        Telèfon: "phone",
        Correu: "email",
        Adreça: "address",
        Població: "city",
        CodiPostal: "postcode",
        Provincia: "state",
        Pais: "country",
        FormaLegal: "legal_form.name",
        Sector: "sector.name",
        NomContacte: "contact_person",
        TelèfonContacte: "contact_phone",
        CorreuContacte: "contact_email",
        Web: "web",
        ContacteDe: "contact_of_display",
        TipusContacte: "contact_type_display",
        Horaris: "timeSlot1And2",
        notes: "notes"
      },
      csv2: {
        Id: "id",
        nom: "name",
        NomComercial: "trade_name",
        NIF: "nif",
        Telèfon: "phone",
        Correu: "email",
        Adreça: "address",
        Població: "city",
        CodiPostal: "postcode",
        Provincia: "state",
        Pais: "country",
        FormaLegal: "legal_form.name",
        Sector: "sector.name",
        NomContacte: "contact_person",
        TelèfonContacte: "contact_phone",
        CorreuContacte: "contact_email",
        Web: "web",
        ContacteDe: "contact_of_display",
        TipusContacte: "contact_type_display",
        Horaris: "timeSlot1And2",
        notes: "notes",
        Comandes: "num_orders",
        Rutes: "routes",
        RutesEntrega: "routes_flattened",
        Sòcies: "owners_flattened"
      },
      cities: [],
      permissions: []
    };
  },
  computed: {
    contactTypeNames() {
      const names = new Set();
      (this.contacts || []).forEach(c => (c.contact_type_display || "").split(", ").filter(Boolean).forEach(n => names.add(n)));
      return [...names].sort((a, b) => a.localeCompare(b, "ca"));
    },
    filteredContacts() {
      const words = this.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return (this.contacts || []).filter(c => {
        if (this.typeFilter && !(c.contact_type_display || "").split(", ").includes(this.typeFilter)) {
          return false;
        }
        const text = [c.name, c.trade_name, c.nif, c.email, c.phone, c.city].filter(Boolean).join(" ").toLowerCase();
        return words.every(w => text.includes(w));
      });
    },
    ...mapState(useMainStore, ["userName"]),
    ...mapState(useMainStore, ["userId"])
  },
  async mounted() {
    this.getData();
  },
  methods: {
    navNew() {
      if (this.$route.meta.userContacts) {
        this.$router.push("/contact-user/0");
        return;
      } else {
        this.$router.push("/contact/0");
      }
    },
    openUnifyModal() {
      this.isUnifyModalActive = true;
    },
    onUnifyConfirm(data) {
      this.$buefy.snackbar.open({
        message: `S'han unificat els punts d'entrega correctament`,
        type: "is-success",
        queue: false
      });
      // Refresh the data
      this.getData();
    },
    async getData() {
      this.isLoading = true;

      var userContacts = false;
      if (this.$route.meta.userContacts) {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        const permissions = me.data.permissions.map(p => p.permission);
        this.permissions = permissions;
        if (
          permissions.includes("orders_admin") ||
          permissions.includes("orders_delivery")
        ) {
          this.orders_admin = true;
          userContacts = `&_where[owner_ne]=null`;
        } else {
          userContacts = `&_where[owner]=${me.data.id}`;
          this.userContacts = true;
        }
      } else {
        userContacts = "&_where[owner_null]=true";
      }

      if (this.filters.q) {
        this.contacts = (
          await service({ requiresAuth: true }).get(
            `contacts/basic?_limit=-1&_sort=name:ASC&_q=${this.filters.q}${userContacts}`
          )
        ).data;
      } else {
        this.contacts = (
          await service({ requiresAuth: true }).get(
            `contacts/basic?_limit=-1&_sort=name:ASC${userContacts}`
          )
        ).data;

        if (this.userContacts) {
          const multideliveryContacts = (
            await service({ requiresAuth: true }).get(
              `contacts/basic?_limit=-1&_sort=name:ASC&_where[multidelivery_eq]=true`
            )
          ).data;
          this.contacts = this.contacts.concat(multideliveryContacts);

          const contactsWithOrders = (
            await service({ requiresAuth: true }).get(
              `contacts/withorders?_limit=-1&_sort=name:ASC`
            )
          ).data;
          for (const contact of contactsWithOrders) {
            if (this.contacts.find(c => c.id === contact.id)) {
              this.contacts.find(c => c.id === contact.id).num_orders =
                contact.num_orders;
            } else {
              this.contacts.push(contact);
            }
          }

          // routes and city routes

          if (this.$route.meta.userContacts) {
            const cities = await service({ requiresAuth: true, cached: true })
              .get("cities?_sort=name&_limit=-1")
              .then(r => r.data);
            // const allRoutes = await service({ requiresAuth: true, cached: true })
            //   .get("routes?_sort=order&_where[active]=true&_limit=-1")
            //   .then(r => r.data);
            this.cities = cities.map(c => ({
              id: c.id,
              name: c.name,
              routes: []
            }));
            this.cityRoutes = await service({
              requiresAuth: true,
              cached: false
            })
              .get("city-routes/basic")
              .then(r => r.data);

            for (const city of cities) {
              const cityRoutes = this.cityRoutes.filter(
                cr => cr.city && cr.city.id === city.id
              );
              const routes = cityRoutes.map(cr => cr.route && cr.route.name);
              this.cities.find(c => c.id === city.id).routes = routes.join(
                ", "
              );
            }
          }
        }

        if (this.$route.meta.userContacts && this.orders_admin) {
          const contactsWithOrders = (
            await service({ requiresAuth: true }).get(
              `contacts/orders?_limit=-1&_sort=name:ASC`
            )
          ).data;
          for (const contact of contactsWithOrders) {
            const c = this.contacts.find(c => c.id === contact.id);
            if (c) {
              c.num_orders = contact.num_orders;
              c.owners_flattened = contact.owners_flattened;
              c.routes_flattened = contact.routes_flattened;
            } else {
              this.contacts.push(contact);
            }
          }
        }
      }

      this.userContacts = this.$route.meta.userContacts;

      this.contacts = this.contacts.map(contact => {
        return {
          ...contact,
          contact_type_display: contact.contact_types
            ? contact.contact_types.map(ct => ct.name).join(", ")
            : "-",
          contact_of_display: contact.multidelivery
            ? "MULTIENTREGA"
            : contact.multiowner
            ? "TOTES"
            : contact.owner
            ? contact.owner.fullname || contact.owner.username
            : "---",
          timeSlot1And2: `${this.formatSlot2(
            contact.time_slot_1_ini,
            contact.time_slot_1_end,
            ""
          )}${this.formatSlot2(
            contact.time_slot_2_ini,
            contact.time_slot_2_end,
            ", "
          )}`,
          num_orders: contact.num_orders || 0,
          routes: this.cities.find(c => c.name === contact.city)
            ? this.cities.find(c => c.name === contact.city).routes
            : null
        };
      });

      this.contactsCSV = this.contacts;
      this.isLoading = false;
    },
    formatSlot2(s1, s2, prefix) {
      return s1 && s2
        ? prefix +
            (s1.toString().includes(".")
              ? s1
                  .toString()
                  .replace(".5", ":30")
                  .replace(".25", ":15")
                  .replace(".75", ":45")
              : `${s1}:00`) +
            "-" +
            (s2.toString().includes(".")
              ? s2
                  .toString()
                  .replace(".5", ":30")
                  .replace(".25", ":15")
                  .replace(".75", ":45")
              : `${s2}:00`)
        : "";
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
<style scoped>
.contacts-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
  margin-bottom: 1rem;
}
.contacts-search {
  flex: 1 1 18rem;
  max-width: 24rem;
}
.segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--a-seg);
}
.segmented button {
  height: 2.125rem;
  padding: 0 .75rem;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font: inherit;
  font-size: .875rem;
  font-weight: 600;
  color: var(--a-fg-2);
  cursor: pointer;
}
.segmented button.is-on {
  background: var(--a-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
  font-weight: 800;
  color: var(--a-fg);
}
.contacts-count {
  color: var(--a-muted);
  font-weight: 700;
}
.contacts-actions {
  margin-left: auto;
  display: flex;
  gap: .5rem;
}
.contacts-actions .export {
  display: inline-flex;
}
.contact-name {
  display: block;
  font-weight: 700;
  color: var(--a-fg);
}
.contact-name:hover {
  color: var(--a-accent);
}
.contact-subline {
  display: block;
  color: var(--a-muted);
  font-size: .8125rem;
}
.contact-line {
  display: block;
  white-space: nowrap;
}
.zb-table :deep(tbody tr) {
  border-bottom: 1px solid #eee;
}
</style>
