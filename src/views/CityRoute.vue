<template>
  <div>
    <title-bar :title-stack="titleStack" />

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>
    <card-component :title="formCardTitle" class="tile is-child">
      <section class="section is-main-section">
        <table class="table">
          <thead>
            <tr>
              <th></th>
              <th v-for="route in routes" :key="route.id">
                {{ route.short_name || route.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="city in cities" :key="city.id">
              <td>{{ city.name }}</td>
              <td v-for="route in routes" :key="route.id">
                <b-checkbox
                  v-if="city.routes.includes(route.id)"
                  :value="true"
                  class="checkbox-inline"
                  @input="checkCityRoute(false, city, route)"
                  :disabled="!orders_admin"
                >
                </b-checkbox>
                <b-checkbox
                  v-else
                  :value="false"
                  class="checkbox-inline"
                  @input="checkCityRoute(true, city, route)"
                  :disabled="!orders_admin"
                >
                </b-checkbox>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section is-main-section" v-if="orders_admin">
        <form v-if="!isLoading">
          <b-field label="Nova població" horizontal>
            <b-input v-model="newCity" placeholder="Població" />
            <div class="is-flex">
              <b-button
                class="view-button is-warning mb-3"
                @click="addCity"
                icon-left="plus"
                title="Nova població"
                :disabled="!newCity"
              >
              </b-button>
            </div>
          </b-field>
        </form>
      </section>
    </card-component>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import service from "@/service/index";

export default {
  name: "DedicacioSaldo",
  components: {
    CardComponent,
    TitleBar
  },
  data() {
    return {
      isLoading: false,
      cities: [],
      routes: [],
      cityRoutes: [],
      newCity: "",
      orders_admin: false
    };
  },
  computed: {
    titleStack() {
      return ["Poblacions i rutes"];
    }
  },
  async mounted() {
    await this.getData();
    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    const permissions = me.data.permissions.map(p => p.permission);
    if (permissions.includes("orders_admin")) {
      this.orders_admin = true;
    }
  },
  methods: {
    async getData() {
      this.isLoading = true;

      const cities = await service({ requiresAuth: true, cached: false })
        .get("cities?_sort=name")
        .then(r => r.data);
      this.routes = await service({ requiresAuth: true, cached: true })
        .get("routes")
        .then(r => r.data);
      this.cities = cities.map(c => ({ id: c.id, name: c.name, routes: [] }));
      this.cityRoutes = await service({ requiresAuth: true, cached: false })
        .get("city-routes")
        .then(r => r.data);

      for (const city of cities) {
        const cityRoutes = this.cityRoutes.filter(
          cr => cr.city && cr.city.id === city.id
        );
        const routes = cityRoutes.map(cr => cr.route.id);
        this.cities.find(c => c.id === city.id).routes = routes;
      }

      this.isLoading = false;
    },
    async checkCityRoute(add, city, route) {
      if (add) {
        await service({ requiresAuth: true }).post("city-routes", {
          city: city.id,
          route: route.id
        });
      } else {
        const cityRoute = this.cityRoutes.find(
          cr => cr.city.id === city.id && cr.route.id === route.id
        );
        await service({ requiresAuth: true }).delete(
          `city-routes/${cityRoute.id}`
        );
      }
      //console.log(add, city, route);
      await this.getData();
    },
    addCity() {
      if (this.newCity) {
        this.$buefy.dialog.confirm({
          message: "Vols afegir la població?",
          onConfirm: async () => {
            await service({ requiresAuth: true })
              .post("cities", { name: this.newCity })
              .then(() => {
                this.newCity = "";
                this.getData();
              });
          },
          onCancel: () => {}
        });
      }
    }
  }
};
</script>
