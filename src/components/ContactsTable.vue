<template>
  <section class="xsection">
    <div class="is-flex">
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
    </div>
    <b-table
      :loading="isLoading"
      :paginated="true"
      :per-page="50"
      pagination-position="both"
      :striped="false"
      :data="contacts"
      v-if="!userContacts"
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
      <b-table-column
        label="Nom"
        searchable
        field="name"
        sortable
        v-slot="props"
      >
        {{ props.row.name }}
      </b-table-column>
      <b-table-column
        label="NIF"
        field="nif"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.nif }}
      </b-table-column>
      <b-table-column
        label="Correu"
        field="email"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.email || "-" }}
      </b-table-column>
      <b-table-column
        label="Telèfon"
        field="phone"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.phone || "-" }}
      </b-table-column>
      <b-table-column
        label="Població"
        field="nif"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.city || "-" }}
      </b-table-column>
      <b-table-column
        label="Tipus"
        field="contact_type_display"
        searchable
        sortable
        v-slot="props"
      >
        {{ props.row.contact_type_display || "-" }}
      </b-table-column>
    </b-table>
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
import moment from "moment";
import sumBy from "lodash/sumBy";
import { mapState } from "vuex";

export default {
  name: "ContactsTable",
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
        Rutes: "routes"
      },
      cities: []
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
      if (this.$route.meta.userContacts) {
        this.$router.push("/contact-user/0");
        return;
      } else {
        this.$router.push("/contact/0");
      }
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
              .get("city-routes?_limit=-1")
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
            if (this.contacts.find(c => c.id === contact.id)) {
              this.contacts.find(c => c.id === contact.id).num_orders =
                contact.num_orders;
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
          routes: this.cities.find(c => c.name === contact.city) ? this.cities.find(c => c.name === contact.city).routes : null,
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
