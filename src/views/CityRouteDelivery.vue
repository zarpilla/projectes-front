<template>
  <div>
    <title-bar :title-stack="titleStack" />

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>
    <card-component :title="formCardTitle" class="tile is-child">

      <div class="help">
        <p>
          Aquesta pàgina mostra les poblacions trobades en punts d'entrega que no estan a la llista de poblacions de la base de dades.
        </p>
        <p>
          Pots afegir una població a la base de dades fent clic al botó "Afegeix població".
        </p>
      </div>
      

      <section class="section zis-main-section" v-if="orders_admin">        
        <div v-if="!isLoading" class="mt-4">
          <b-table :data="contactCitiesNotFoundInCities">
              <b-table-column field="name" label="Població" width="10%">
                <template slot-scope="props">
                  {{ props.row.name }}
                </template>
              </b-table-column>
              <b-table-column field="name" label="Afegeix població" width="20%">
                <template slot-scope="props">
                  <button class="button is-primary" @click="addCityName(props.row.name)" title="Afegeix població">
                    <b-icon icon="plus"></b-icon>
                  </button>
                </template>
              </b-table-column>
            </b-table>
        </div>
      </section>
    </card-component>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import service from "@/service/index";

export default {
  name: "CityRoute",
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
      tableHeight: '60vh',
      contactCities: [],
      contactCitiesNotFoundInCities: []
    };
  },
  computed: {
    titleStack() {
      return ["Noves poblacions trobades a punts d'entrega"];
    }
  },
  async mounted() {    
    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    const permissions = me.data.permissions.map(p => p.permission);    
    if (permissions.includes("orders_admin")) {
      this.orders_admin = true;
    }
    await this.getData();
    this.tableHeight = window.innerHeight - 400 + 'px';

  },
  methods: {
    async getData() {
      this.isLoading = true;

      const cities = await service({ requiresAuth: true, cached: false })
        .get("cities?_sort=name")
        .then(r => r.data);
      // this.routes = await service({ requiresAuth: true, cached: true })
      //   .get("routes?_sort=order&_where[active]=true")
      //   .then(r => r.data);
      this.cities = cities.map(c => ({ id: c.id, name: c.name, routes: [] }));
      // this.cityRoutes = await service({ requiresAuth: true, cached: false })
      //   .get("city-routes")
      //   .then(r => r.data);

      for (const city of cities) {
        const cityRoutes = this.cityRoutes.filter(
          cr => cr.city && cr.city.id === city.id
        );
        const routes = cityRoutes.map(cr => cr.route.id);
        this.cities.find(c => c.id === city.id).routes = routes;
      }

      if (this.orders_admin) {
        this.contactCitiesNotFoundInCities = []
        this.contactCities = await service({ requiresAuth: true, cached: true })
        .get("/contacts/basic?_limit=-1&_sort=name:ASC&_where[owner_ne]=null")
        .then(r => r.data);

        this.contactCities = this.contactCities.map(c => { return { name: c.city, safeName: this.removeAccents(c.city) }})

        const contactCitiesNotFoundInCities = this.contactCities.filter(cc => !this.cities.find(c => this.removeAccents(c.name) === cc.safeName));
        const distinctContactCitiesNotFoundInCitiesSafeName = contactCitiesNotFoundInCities.map(cc => cc.safeName).filter((value, index, self) => self.indexOf(value) === index);
        for (const citySafeName of distinctContactCitiesNotFoundInCitiesSafeName) {
          const city = contactCitiesNotFoundInCities.find(cc => cc.safeName === citySafeName);
          this.contactCitiesNotFoundInCities.push(city)          
        }
      }
      

      this.isLoading = false;
    },
    removeAccents(name) {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    },
    async addCityName(name) {
      await service({ requiresAuth: true })
              .post("cities", { name })
              .then(() => {
                this.$buefy.snackbar.open({
                  message: "Població afegida correctament",
                  type: "is-success"
                });
                this.getData();
              });
    }
  }
};
</script>
