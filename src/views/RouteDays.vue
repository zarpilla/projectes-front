<template>
  <div>
    <title-bar :title-stack="titleStack" />

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <card-component title="Filtres">
        <form @submit.prevent="submit2">
          <b-field horizontal>
            <b-field label="Any">
              <b-select
                v-model="filters.year"
                required
                @input="getData"
              >
                <option
                  v-for="(year, index) in years"
                  :key="index"
                  :value="year"
                >
                  {{ year.year }}
                </option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>

    <card-component :title="formCardTitle" class="tile is-child">
      <section class="section is-main-section">

        <table class="table">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Rutes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="day in days" :key="day.date">
              <td class="capitalize">{{ formatDate(day.date, 'dddd, DD-MM-YYYY') }}</td>
              <td>
                <ul>
                  <li v-for="route in day.routes" :key="route.id" class="is-flex mb-2">
                    {{ route.name }}
                    <b-checkbox
                      :value="route.festive ? false : true"
                      class="checkbox-inline pl-2"
                      @input="checkDateRoute(!route.festive, day.date, route)"
                      :disabled="!orders_admin"></b-checkbox>
                  </li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
       
      </section>

      <!-- <section class="section is-main-section" v-if="orders_admin">
        
      </section> -->
    </card-component>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import service from "@/service/index";
import moment from "moment";

moment.locale("ca");

export default {
  name: "RouteDays",
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
      years: [],
      filters: {
        year: null
      },
      days: []
    };
  },
  computed: {
    titleStack() {
      return ["Rutes i dies"];
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
    
    this.years = await service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then(r => r.data) 
      if (!this.filters.year) {
        this.filters.year = this.years[0]
    }
    await this.getData();
  },
  
  methods: {
    async getData() {
      console.log('getData')
      this.isLoading = true;

      

      this.routes = await service({ requiresAuth: true, cached: true })
        .get("routes?_sort=order&_where[active]=true")
        .then(r => r.data);
      
      this.routesFestives = await service({ requiresAuth: true, cached: false })
        .get("route-festives")
        .then(r => r.data);

      // push into this.days all the days of the this.filters.year
      this.days = this.enumerateDaysBetweenDates().map(d => {
        return {
          date: d,
          mom: moment(d, 'YYYY-MM-DD').day() ,
          routes: this.routes
          .filter(r => 
            (r.monday && moment(d, 'YYYY-MM-DD').day() === 1) 
            || (r.tuesday && moment(d, 'YYYY-MM-DD').day() === 2)
            || (r.wednesday && moment(d, 'YYYY-MM-DD').day() === 3)
            || (r.thursday && moment(d, 'YYYY-MM-DD').day() === 4)
            || (r.friday && moment(d, 'YYYY-MM-DD').day() === 5)
            || (r.saturday && moment(d, 'YYYY-MM-DD').day() === 6)
            || (r.sunday && moment(d, 'YYYY-MM-DD').day() === 0) 
          )
        .map(r => {
            return {
              // id: r.id,
              // name: r.name,
              // festiu: this.routesFestives.find(rf => rf.route.id === r.id && rf.date === d)
              ...r,
              festive: this.routesFestives.find(rf => rf.route.id === r.id && rf.date === moment(d).format('YYYY-MM-DD')),              
            }
          })
        }
      })



      // for (const city of cities) {
      //   const cityRoutes = this.cityRoutes.filter(
      //     cr => cr.city && cr.city.id === city.id
      //   );
      //   const routes = cityRoutes.map(cr => cr.route.id);
      //   this.cities.find(c => c.id === city.id).routes = routes;
      // }

      this.isLoading = false;
    },
    enumerateDaysBetweenDates() {
      var dates = [];
      if (!this.filters.year) {
        return dates;
      }
      var currDate = moment(this.filters.year.year, "YYYY").startOf("year");
      const endOfYear = moment(this.filters.year.year, "YYYY").endOf("year");
      
      dates.push(currDate.clone().toDate());
      while (currDate.add(1, "days").diff(endOfYear) < 0) {
        dates.push(currDate.clone().toDate());
      }
      
      return dates;
    },
    formatDate(date, format) {
      return moment(date).format(format);
    },
    async checkDateRoute(add, date, route) {
      console.log('checkDateRoute', add, date, route)
      if (add) {
        await service({ requiresAuth: true }).post("route-festives", {
          date: date,
          route: route.id
        });
      } else {
        const dateRoute = this.routesFestives.find(
          cr => cr.date === date && cr.route.id === route.id
        );
        await service({ requiresAuth: true }).delete(
          `route-festives/${dateRoute.id}`
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
