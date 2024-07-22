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

        
        <b-table :data="cities" :sticky-header="true" :height="tableHeight">
          <b-table-column field="name" label="">
            <template slot-scope="props">
              {{ props.row.name }}
            </template>
          </b-table-column>
          <b-table-column v-for="route in routes" :key="route.id" v-slot="props" :label="route.short_name || route.name">
             <b-checkbox
                  v-if="props.row.routes.includes(route.id)"
                  :value="true"
                  class="checkbox-inline"
                  @input="checkCityRoute(false, props.row.id, route)"
                  :disabled="!orders_admin"
                >
                </b-checkbox>
                <b-checkbox
                  v-else
                  :value="false"
                  class="checkbox-inline"
                  @input="checkCityRoute(true, props.row.id, route)"
                  :disabled="!orders_admin"
                >
                </b-checkbox> 

          </b-table-column>
        </b-table>
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
      orders_admin: false,
      tableHeight: '60vh'
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
    this.tableHeight = window.innerHeight - 400 + 'px';

  },
  methods: {
    async getData() {
      this.isLoading = true;

      const cities = await service({ requiresAuth: true, cached: false })
        .get("cities?_sort=name")
        .then(r => r.data);
      this.routes = await service({ requiresAuth: true, cached: true })
        .get("routes?_sort=order&_where[active]=true")
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
    async checkCityRoute(add, cityId, route) {
      if (add) {
        await service({ requiresAuth: true }).post("city-routes", {
          city: cityId,
          route: route.id
        });
      } else {
        const cityRoute = this.cityRoutes.find(
          cr => cr.city.id === cityId && cr.route.id === route.id
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
