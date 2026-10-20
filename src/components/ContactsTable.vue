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
      <span class="contacts-count">{{ formatNumber(filteredContacts.length) }} {{ filteredContacts.length === 1 ? "contacte" : "contactes" }}</span>
      <div class="contacts-actions">
        <!-- the export follows the search and the type chips, like the table (issues/277) -->
        <download-excel class="export" :data="filteredContacts" :escapeCsv="false" name="contactes" :fields="csv">
          <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
        </download-excel>
        <b-button type="is-primary" icon-left="plus" @click="navNew">Nou contacte</b-button>
      </div>
    </div>
    <!-- Redesign A (delivery points of logistics): the same toolbar -->
    <div v-else class="contacts-toolbar">
      <b-input
        v-model="search"
        class="contacts-search"
        type="search"
        icon="magnify"
        placeholder="Cerca per nom, NIF, població o ruta"
        aria-label="Cerca punts d'entrega"
      />
      <label v-if="orders_admin && pointOwners.length" class="filter-select">
        <span>Sòcia</span>
        <b-select v-model="pointOwner">
          <option :value="null">Totes</option>
          <option v-for="name in pointOwners" :key="name" :value="name">{{ name }}</option>
        </b-select>
      </label>
      <span class="contacts-count">{{ filteredPoints.length }} {{ filteredPoints.length === 1 ? "punt" : "punts" }}</span>
      <div class="contacts-actions">
        <download-excel class="export" :data="filteredPoints" :escapeCsv="false" name="punts-entrega" :fields="csv2">
          <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
        </download-excel>
        <b-button v-if="orders_admin" icon-left="call-merge" title="Unificar punts d'entrega" @click="openUnifyModal">Unifica punts</b-button>
        <b-button type="is-primary" icon-left="plus" @click="navNew">Nou punt d'entrega</b-button>
      </div>
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
          <p class="has-text-muted has-text-centered py-5">{{ search.trim() ? "Cap contacte coincideix amb la cerca." : "Encara no hi ha cap contacte." }}</p>
        </template>
      </b-table>
    </div>
    <div v-else class="card has-table contacts-card">
      <b-table
        :loading="isLoading"
        :paginated="true"
        :per-page="50"
        pagination-position="bottom"
        :striped="false"
        :mobile-cards="false"
        :data="filteredPoints"
        default-sort="trade_name"
        aria-next-label="Pàgina següent"
        aria-previous-label="Pàgina anterior"
        aria-page-label="Pàgina"
        aria-current-label="Pàgina actual"
      >
        <b-table-column label="Punt d'entrega" field="trade_name" sortable v-slot="props">
          <router-link class="contact-name" :to="{ name: 'contactsuser.edit', params: { id: props.row.id } }">
            {{ props.row.trade_name || props.row.name || "(sense nom)" }}
          </router-link>
          <span class="contact-subline">{{ [props.row.trade_name && props.row.name !== props.row.trade_name ? props.row.name : "", props.row.nif].filter(Boolean).join(" · ") || "—" }}</span>
        </b-table-column>
        <b-table-column label="Població" field="city" sortable v-slot="props">
          {{ props.row.city || "—" }}
          <span v-if="props.row.sector" class="contact-subline">{{ props.row.sector.name }}</span>
        </b-table-column>
        <b-table-column label="Horari" field="timeSlot1And2" sortable v-slot="props">
          <span class="nowrap">{{ props.row.timeSlot1And2 || "—" }}</span>
        </b-table-column>
        <b-table-column v-if="orders_admin" label="Contacte de" field="contact_of_display" sortable v-slot="props">
          <span v-if="props.row.multidelivery" class="tag is-info is-light">Multientrega</span>
          <span v-else-if="props.row.multiowner" class="tag">Totes</span>
          <span v-else-if="props.row.owner && (props.row.owner.fullname || props.row.owner.username)">{{ props.row.owner.fullname || props.row.owner.username }}</span>
          <span v-else class="has-text-muted">—</span>
        </b-table-column>
        <b-table-column v-if="orders_admin" label="Rutes" field="routes_flattened" sortable v-slot="props">
          <span v-for="r in splitList(props.row.routes_flattened)" :key="r" class="tag route-tag">{{ r }}</span>
          <span v-if="!splitList(props.row.routes_flattened).length" class="has-text-muted">—</span>
        </b-table-column>
        <b-table-column v-if="orders_admin" label="Sòcies" field="owners_flattened" sortable v-slot="props">
          <span class="contact-subline">{{ props.row.owners_flattened || "—" }}</span>
        </b-table-column>
        <b-table-column :label="orders_admin ? 'Comandes (1 any)' : 'Comandes'" field="num_orders" sortable numeric v-slot="props">
          {{ props.row.num_orders || 0 }}
        </b-table-column>
        <template #empty>
          <p class="has-text-muted has-text-centered py-5">{{ search.trim() ? "Cap punt d'entrega coincideix amb la cerca." : "Encara no hi ha cap punt d'entrega." }}</p>
        </template>
      </b-table>
    </div>
  </section>
</template>

<script>
import service from "@/service/index";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import ModalBoxUnifyContacts from "@/components/ModalBoxUnifyContacts.vue";
import { formatNumber } from "@/helpers/format-number";

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
      pointOwner: null,
      isLoading: false,
      isUnifyModalActive: false,
      contacts: [],
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
    // delivery points: the search also looks at their routes and members
    filteredPoints() {
      const words = this.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return (this.contacts || []).filter(c => {
        if (this.pointOwner) {
          const owner = c.owner ? c.owner.fullname || c.owner.username : "";
          if (owner !== this.pointOwner && !(c.owners_flattened || "").split(/,\s*/).includes(this.pointOwner)) return false;
        }
        const owner = c.owner ? c.owner.fullname || c.owner.username : "";
        const text = [c.name, c.trade_name, c.nif, c.city, owner, c.routes_flattened, c.owners_flattened].filter(Boolean).join(" ").toLowerCase();
        return words.every(w => text.includes(w));
      });
    },
    pointOwners() {
      const names = new Set();
      for (const c of this.contacts || []) {
        if (c.owner && (c.owner.fullname || c.owner.username)) names.add(c.owner.fullname || c.owner.username);
      }
      return [...names].sort((a, b) => a.localeCompare(b));
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
    formatNumber,
    splitList(text) {
      return [...new Set(String(text || "").split(/,\s*/).map(t => t.trim()).filter(Boolean))];
    },
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
  flex-wrap: wrap;
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
.contacts-toolbar :deep(.filter-select select) {
  max-width: 14rem;
}
.route-tag {
  height: 1.375rem;
  margin: 0 .25rem .25rem 0;
  font-size: .6875rem;
}
.nowrap {
  white-space: nowrap;
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
  border-bottom: 1px solid var(--a-line-soft);
}
</style>
