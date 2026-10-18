<template>
  <!-- The office creates, edits and disables routes (issues/141). A route is
       never deleted: old orders keep it, and a disabled one stops showing in
       the order form, «Rutes i dies», «Poblacions i rutes» and Operacions. -->
  <div class="routes-admin">
    <title-bar :title-stack="['Rutes i punts', 'Rutes']" :subtitle="headline">
      <b-button type="is-primary" icon-left="plus" @click="openForm(null)">Nova ruta</b-button>
    </title-bar>

    <section class="section is-main-section">
      <routes-tabs :is-staff="true" :is-office="true" />

      <section class="a-box ra-box">
        <b-loading :is-full-page="false" :model-value="isLoading" />
        <div class="table-container">
          <table class="table is-fullwidth">
            <thead>
              <tr>
                <th class="has-text-right">Ordre</th>
                <th>Ruta</th>
                <th>Dies</th>
                <th>Repartidor/a</th>
                <th>Notes</th>
                <th>Activa</th>
                <th class="has-text-right"><span class="is-sr-only">Accions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="route in sorted" :key="route.id" :class="{ 'is-inactive': !route.active }">
                <td class="has-text-right">{{ route.order ?? "—" }}</td>
                <td>
                  <b>{{ route.name }}</b>
                  <small v-if="route.short_name" class="ra-short">{{ route.short_name }}</small>
                </td>
                <td>{{ routeDaysShort(route) || "—" }}</td>
                <td>{{ userName(route.delivery_user) }}</td>
                <td><small>{{ note(route) }}</small></td>
                <td>
                  <b-switch
                    :key="`${route.id}-${switchResets}`"
                    :model-value="Boolean(route.active)"
                    :disabled="saving"
                    :aria-label="route.active ? `Desactiva ${route.name}` : `Activa ${route.name}`"
                    @update:model-value="setActive(route, $event)"
                  />
                </td>
                <td class="has-text-right">
                  <b-button size="is-small" icon-left="pencil" @click="openForm(route)">Edita</b-button>
                </td>
              </tr>
              <tr v-if="!isLoading && !routes.length">
                <td colspan="7" class="box-empty">Encara no hi ha cap ruta. Crea'n una amb «Nova ruta».</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <b-modal v-model="isFormOpen" has-modal-card aria-role="dialog" aria-modal>
      <form class="modal-card route-form" @submit.prevent="save">
        <header class="modal-card-head">
          <p class="modal-card-title">{{ form.id ? `Edita ${editedName}` : "Nova ruta" }}</p>
        </header>
        <section class="modal-card-body">
          <div class="columns">
            <b-field class="column" label="Nom" :type="shownErrors.name ? 'is-danger' : ''" :message="shownErrors.name">
              <b-input v-model="form.name" required />
            </b-field>
            <b-field class="column is-3" label="Nom curt">
              <b-input v-model="form.short_name" />
            </b-field>
            <b-field class="column is-2" label="Ordre" message="Posició a les llistes">
              <b-input v-model="form.order" type="number" min="0" />
            </b-field>
          </div>

          <b-field label="Dies que passa" :type="shownErrors.days ? 'is-danger' : ''" :message="shownErrors.days">
            <div class="ra-days">
              <b-checkbox v-for="d in weekdays" :key="d.key" v-model="form[d.key]">{{ d.label }}</b-checkbox>
            </div>
          </b-field>

          <b-field label="Repartidor/a" message="Qui la fa a Operacions">
            <b-select v-model="form.delivery_user" expanded>
              <option :value="null">— Cap —</option>
              <option v-for="u in drivers" :key="u.id" :value="u.id">{{ u.name }}</option>
            </b-select>
          </b-field>

          <b-field
            label="Descompte per volum"
            :type="shownErrors.volume_discount ? 'is-danger' : ''"
            :message="shownErrors.volume_discount || 'Euros menys per comanda quan la ruta en porta prou el mateix dia. Buit: sense descompte.'"
            grouped
          >
            <b-field label="A partir de (comandes)" label-position="inside">
              <b-input v-model="form.volume_discount_number_of_orders" type="number" min="1" />
            </b-field>
            <b-field label="Descompte (€)" label-position="inside">
              <b-input v-model="form.volume_discount_price" type="number" min="0" step="0.01" />
            </b-field>
          </b-field>

          <div class="columns">
            <b-field class="column" label="Projecte" message="El projecte de la ruta">
              <b-select v-model="form.project" expanded>
                <option :value="null">— Cap —</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </b-select>
            </b-field>
            <b-field class="column" label="Punt de recollida" message="El punt de recollida de la ruta">
              <b-select v-model="form.pickup" expanded>
                <option :value="null">— Cap —</option>
                <option v-for="p in pickups" :key="p.id" :value="p.id">{{ p.alias || p.name }}</option>
              </b-select>
            </b-field>
          </div>

          <b-field>
            <b-checkbox v-model="form.is_transfer_route">Fa transferències</b-checkbox>
          </b-field>
          <b-field v-if="form.is_transfer_route" label="Dies que porta transferències" message="Quins dies pot portar una comanda que s'ha de transferir, respecte al dia de l'entrega">
            <b-select v-model="form.is_transfer_route_date" expanded>
              <option v-for="o in transferDateOptions" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
            </b-select>
          </b-field>
          <b-field
            :label="form.is_transfer_route ? 'Les transferències van a' : 'Destinació de les transferències'"
            :type="shownErrors.transfer_pickup ? 'is-danger' : ''"
            :message="shownErrors.transfer_pickup || (form.is_transfer_route ? '' : 'On es deixen les comandes d’altres magatzems que ha de repartir aquesta ruta.')"
          >
            <b-select v-model="form.transfer_pickup" expanded>
              <option :value="null">{{ form.is_transfer_route ? "— Tria —" : "— Cap —" }}</option>
              <option v-for="p in pickups" :key="p.id" :value="p.id">{{ p.alias || p.name }}</option>
            </b-select>
          </b-field>

          <b-field message="Desactivada no surt en fer comandes ni a Rutes i dies. Les comandes que ja la tenen la mantenen.">
            <b-switch v-model="form.active">{{ form.active ? "Activa" : "Desactivada" }}</b-switch>
          </b-field>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="isFormOpen = false">Cancel·la</button>
          <b-button type="is-primary" native-type="submit" :loading="saving">Desa</b-button>
        </footer>
      </form>
    </b-modal>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import RoutesTabs from "@/components/RoutesTabs.vue";
import service from "@/service/index";
import { formatMoney } from "@/helpers/format-number";
import {
  WEEKDAYS,
  TRANSFER_DATE_OPTIONS,
  routeToForm,
  validateRoute,
  routePayload,
  sortRoutes,
  routeDaysShort,
  deliveryUserOptions
} from "@/domain/routeForm";

export default {
  name: "Routes",
  components: {
    TitleBar,
    RoutesTabs
  },
  data() {
    return {
      isLoading: false,
      saving: false,
      isFormOpen: false,
      submitted: false,
      editedName: "",
      // bumped to redraw the active switches when a change doesn't happen
      // (b-switch keeps its own state: cancelled, it stayed drawn off)
      switchResets: 0,
      routes: [],
      pickups: [],
      projects: [],
      users: [],
      form: routeToForm(null)
    };
  },
  computed: {
    weekdays() {
      return WEEKDAYS;
    },
    transferDateOptions() {
      return TRANSFER_DATE_OPTIONS;
    },
    sorted() {
      return sortRoutes(this.routes);
    },
    drivers() {
      return deliveryUserOptions(this.users, this.form.delivery_user);
    },
    errors() {
      return validateRoute(this.form, this.routes);
    },
    // only after a first «Desa», so a new form doesn't open in red
    shownErrors() {
      return this.submitted ? this.errors : {};
    },
    headline() {
      if (this.isLoading) return "";
      const active = this.routes.filter(r => r.active).length;
      const inactive = this.routes.length - active;
      return `${active} ${active === 1 ? "ruta activa" : "rutes actives"}${inactive ? ` · ${inactive} ${inactive === 1 ? "desactivada" : "desactivades"}` : ""}`;
    }
  },
  async mounted() {
    this.isLoading = true;
    try {
      const [pickups, users, projects] = await Promise.all([
        service({ requiresAuth: true, cached: true }).get("pickups?_limit=-1&_sort=name:ASC").then(r => r.data),
        service({ requiresAuth: true, cached: true }).get("users?_limit=-1").then(r => r.data).catch(() => []),
        service({ requiresAuth: true, cached: true }).get("projects/basic?_limit=-1&_sort=name:ASC").then(r => r.data).catch(() => []),
        this.getData()
      ]);
      this.pickups = pickups;
      this.users = users;
      this.projects = projects;
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    routeDaysShort,
    async getData() {
      this.routes = await service({ requiresAuth: true, cached: false })
        .get("routes?_sort=order&_limit=-1")
        .then(r => r.data);
    },
    userName(user) {
      if (!user) return "—";
      const id = typeof user === "object" ? user.id : user;
      const found = this.users.find(u => u.id === id);
      const u = found || (typeof user === "object" ? user : {});
      return u.fullname || u.username || "—";
    },
    note(route) {
      const parts = [];
      if (route.volume_discount_price && route.volume_discount_number_of_orders) {
        parts.push(`−${formatMoney(route.volume_discount_price)} a partir de ${route.volume_discount_number_of_orders} comandes`);
      }
      if (route.is_transfer_route) {
        const id = route.transfer_pickup && (route.transfer_pickup.id || route.transfer_pickup);
        const p = this.pickups.find(x => x.id === id);
        parts.push(p ? `transferències cap a ${p.alias || p.name}` : "fa transferències");
      }
      return parts.join(" · ");
    },
    openForm(route) {
      this.form = routeToForm(route, this.routes);
      this.editedName = route ? route.name : "";
      this.submitted = false;
      this.isFormOpen = true;
    },
    async save() {
      this.submitted = true;
      if (Object.keys(this.errors).length) return;
      this.saving = true;
      try {
        const data = routePayload(this.form);
        if (this.form.id) await service({ requiresAuth: true }).put(`routes/${this.form.id}`, data);
        else await service({ requiresAuth: true }).post("routes", data);
        this.isFormOpen = false;
        this.$buefy.snackbar.open({ message: "Ruta desada", type: "is-success", queue: false });
        await this.getData();
      } catch (e) {
        this.$buefy.snackbar.open({ message: "No s'ha pogut desar la ruta", type: "is-danger", queue: false });
      } finally {
        this.saving = false;
      }
    },
    setActive(route, active) {
      const apply = async () => {
        this.saving = true;
        try {
          await service({ requiresAuth: true }).put(`routes/${route.id}`, { active });
          await this.getData();
        } catch (e) {
          this.switchResets++;
          this.$buefy.snackbar.open({ message: "No s'ha pogut desar", type: "is-danger", queue: false });
        } finally {
          this.saving = false;
        }
      };
      if (active) return apply();
      this.$buefy.dialog.confirm({
        title: `Desactivar ${route.name}`,
        message: "Les comandes noves ja no la podran triar i deixarà de sortir a Rutes i dies. Les comandes que ja la tenen la mantenen. La pots tornar a activar quan vulguis.",
        confirmText: "Desactiva",
        cancelText: "Cancel·la",
        type: "is-warning",
        onConfirm: apply,
        onCancel: () => { this.switchResets++; }
      });
    }
  }
};
</script>

<style scoped>
.ra-box {
  position: relative;
  padding: 0;
  overflow: hidden;
}
.ra-short {
  margin-left: 0.5rem;
  color: var(--a-muted);
}
.is-inactive td {
  color: var(--a-muted);
}
.ra-days {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
}
.route-form {
  width: min(640px, 100vw - 2rem);
}
.box-empty {
  padding: 2rem !important;
  text-align: center;
  color: var(--a-muted);
}
</style>
