<template>
  <!-- Redesign A: towns written in delivery points that are not in the towns
       list (orders to them get no route). Add them, or see the likely match. -->
  <div class="point-towns">
    <title-bar :title-stack="['Rutes i punts', 'Poblacions i punts']" :subtitle="headline" />

    <section class="section is-main-section">
      <routes-tabs :is-staff="true" />
      <b-loading :is-full-page="false" :model-value="isLoading" />

      <div class="notification is-info">
        Poblacions escrites als punts d'entrega que no són a la llista de poblacions: les comandes cap a aquests punts no troben ruta.
        Si és una població nova, afegeix-la i dona-li rutes a <router-link to="/city-route">Poblacions i rutes</router-link>.
        Si és la mateixa que una altra però mal escrita, corregeix el punt d'entrega.
      </div>

      <section class="a-box pt-box">
        <div class="table-container">
          <table class="table is-fullwidth">
            <thead>
              <tr>
                <th>Població als punts</th>
                <th class="has-text-right">Punts</th>
                <th>Potser és</th>
                <th class="has-text-right"><span class="is-sr-only">Accions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="town in towns" :key="town.name">
                <td><b>{{ town.name }}</b></td>
                <td class="has-text-right">{{ town.points }}</td>
                <td>
                  <span v-if="town.similar" class="similar">{{ town.similar.name }}</span>
                  <span v-else class="has-text-muted">—</span>
                </td>
                <td class="has-text-right">
                  <b-button size="is-small" icon-left="plus" :loading="adding === town.name" title="Afegeix població" @click="addCityName(town.name)">Afegeix la població</b-button>
                </td>
              </tr>
              <tr v-if="!isLoading && !towns.length">
                <td colspan="4" class="box-empty">Totes les poblacions dels punts d'entrega són a la llista.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import RoutesTabs from "@/components/RoutesTabs.vue";
import service from "@/service/index";
import { unknownPointTowns } from "@/domain/cityRoutes.js";

export default {
  name: "CityRouteDelivery",
  components: {
    TitleBar,
    RoutesTabs
  },
  data() {
    return {
      isLoading: false,
      adding: null,
      cities: [],
      pointTowns: []
    };
  },
  computed: {
    towns() {
      return unknownPointTowns(this.pointTowns, this.cities);
    },
    headline() {
      if (this.isLoading) return "";
      return this.towns.length
        ? `${this.towns.length} ${this.towns.length === 1 ? "població" : "poblacions"} dels punts d'entrega no ${this.towns.length === 1 ? "és" : "són"} a la llista`
        : "Totes les poblacions dels punts d'entrega són a la llista";
    }
  },
  async mounted() {
    this.isLoading = true;
    await this.getData();
    this.isLoading = false;
  },
  methods: {
    async getData() {
      const [cities, contacts] = await Promise.all([
        service({ requiresAuth: true, cached: false }).get("cities?_sort=name&_limit=-1").then(r => r.data),
        service({ requiresAuth: true, cached: true }).get("/contacts/basic?_limit=-1&_sort=name:ASC&_where[owner_ne]=null").then(r => r.data)
      ]);
      this.cities = cities.map(c => ({ id: c.id, name: c.name }));
      this.pointTowns = contacts.map(c => c.city);
    },
    async addCityName(name) {
      this.adding = name;
      try {
        await service({ requiresAuth: true }).post("cities", { name });
        this.$buefy.snackbar.open({ message: "Població afegida correctament", type: "is-success", queue: false });
        await this.getData();
      } finally {
        this.adding = null;
      }
    }
  }
};
</script>

<style scoped>
.pt-box {
  padding: 0;
  overflow: hidden;
}
.similar {
  font-weight: 700;
  color: var(--a-over);
}
.box-empty {
  padding: 2rem !important;
  text-align: center;
  color: var(--a-muted);
}
</style>
