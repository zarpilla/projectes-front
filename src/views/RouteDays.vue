<template>
  <div>
    <title-bar :title-stack="titleStack" />

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <!-- <card-component title="Filtres">

      <form @submit.prevent="submit2">
        <b-field horizontal>
          <b-field label="Any">
            <b-select v-model="filters.year" required @input="getData">
              <option v-for="(year, index) in years" :key="index" :value="year">
                {{ year.year }}
              </option>
            </b-select>
          </b-field>
        </b-field>
      </form>

      
    </card-component> -->

    
    <div class="notification help mt-4">
        Marca o desmarca les rutes per tancar-les o obrir-les per aquell dia. Les rutes amb fons blanc són rutes tancades.
    </div>
    

    <v-calendar
      ref="calendar"
      locale="ca"
      class="custom-calendar max-w-full mb-5"
      :first-day-of-week="2"
      :masks="masks"
      :attributes="attributes"
      title-position="left"
      is-expanded
    >
      <template v-slot:day-content="{ day, attributes }">
        <div class="flex flex-col h-full z-10 overflow-hidden">
          <span
            class="day-label text-sm text-gray-900"            
            >{{ day.day }}</span
          >

          <div class="flex-grow overflow-y-auto overflow-x-auto">
            <span
              v-for="attr in attributes"
              :key="attr.key"
              class="
                text-xs
                leading-tight
                rounded-sm
                p-1
                mt-0
                mb-1
                tag tag-hours
              "
              :class="attr && attr.customData ? attr.customData.class : null"
              :style="{
                cursor: 'pointer',
                backgroundColor: attr.customData && !attr.customData.route.festive
                  ? attr.customData.bg_project
                  : 'transparent',                  
                  border: '1px solid #b8c2cc',
                  borderColor: attr.customData && !attr.customData.route.festive ? 'transparent' : attr.customData.bg_project,
              }"
              :title="attr.customData.route.festive ? 'Ruta tancada' : 'Ruta oberta'"
            >
              <span
                v-if="attr.customData && attr.customData.type === 'activity'"
                @click="checkDateRoute(!attr.customData.route.festive, day.date, attr.customData.route)"
              >
                {{ attr.customData.route.name }}
                
              </span>
            </span>
          </div>
        </div>
      </template>
    </v-calendar>


  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import service from "@/service/index";
import moment from "moment";
import * as chartConfig from "@/components/Charts/chart.config";

moment.locale("ca");

export default {
  name: "RouteDays",
  components: {
    CardComponent,
    TitleBar,
    
  },
  data() {
    return {
      isLoading: false,
      routes: [],
      orders_admin: false,
      years: [],
      filters: {
        year: null
      },
      days: [],
      masks: {
        weekdays: "WWW"
      },
      attributes: []
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

    this.years = await service({ requiresAuth: true, cached: true })
      .get("years?_sort=year:DESC")
      .then(r => r.data);
    if (!this.filters.year) {
      this.filters.year = this.years[0];
    }
    await this.getData();
  },

  methods: {
    async getData() {
      this.isLoading = true;

      this.routes = await service({ requiresAuth: true, cached: true })
        .get("routes?_sort=order&_where[active]=true")
        .then(r => r.data);

      this.routesFestives = await service({ requiresAuth: true, cached: false })
        .get("route-festives?_limit=-1")
        .then(r => r.data);

      // push into this.days all the days of the this.filters.year
      this.days = this.enumerateDaysBetweenDates().map(d => {
        return {
          date: d,
          routes: this.routes
            .filter(
              r =>
                (r.monday && moment(d, "YYYY-MM-DD").day() === 1) ||
                (r.tuesday && moment(d, "YYYY-MM-DD").day() === 2) ||
                (r.wednesday && moment(d, "YYYY-MM-DD").day() === 3) ||
                (r.thursday && moment(d, "YYYY-MM-DD").day() === 4) ||
                (r.friday && moment(d, "YYYY-MM-DD").day() === 5) ||
                (r.saturday && moment(d, "YYYY-MM-DD").day() === 6) ||
                (r.sunday && moment(d, "YYYY-MM-DD").day() === 0)
            )
            .map(r => {
              return {
                ...r,
                festive: this.routesFestives.find(
                  rf =>
                    rf.route.id === r.id &&
                    rf.date === moment(d).format("YYYY-MM-DD")
                )
              };
            })
        };
      });

      this.attributes = [];
      let i = 0;
      for (const day of this.days) {
        for (const route of day.routes) {
          const item = {
            key: i,
            dates: day.date,
            customData: {
              bg_project: this.getChartColor(
                this.routes.findIndex(r => r.id === route.id)
              ),
              class: "tag zis-primary",
              type: "activity",
              route: route,
              festive: route.festive
            }
          };
          i++;
          this.attributes.push(item);

          // if (route.festive) {
          //   route.festive = true;
          // } else {
          //   route.festive = false;
          // }
        }
      }

      // this.attributes.unshift({
      //   key: "today",
      //   highlight: "red",
      //   dates: new Date()
      // });

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
      const endOfYear = moment(this.filters.year.year, "YYYY").add(1, "year").endOf("year");

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
      if (!this.orders_admin) {
        return;
      }
      if (add) {
        await service({ requiresAuth: true }).post("route-festives", {
          date: date,
          route: route.id
        });
      } else {
        const dateRoute = this.routesFestives.find(
          cr =>
            cr.date === moment(date).format("YYYY-MM-DD") &&
            cr.route.id === route.id
        );
        await service({ requiresAuth: true }).delete(
          `route-festives/${dateRoute.id}`
        );
        this.routesFestives = this.routesFestives.filter(
          cr => cr.id !== dateRoute.id
        );
      }
      //console.log(add, city, route);
      await this.getData();
    },
    getChartColor(n) {
      return chartConfig.chartDataColors[n];
    }
  }
};
</script>

<style lang="postcss">
.vc-container {
  font-family: "Nunito";
}
::-webkit-scrollbar {
  width: 0px;
}
::-webkit-scrollbar-track {
  display: none;
}
.custom-calendar.vc-container {
  --day-border: 1px solid #b8c2cc;
  --day-border-highlight: 1px solid #b8c2cc;
  --day-width: 90px;
  --day-height: 90px;
  --weekday-bg: #f8fafc;
  --weekday-border: 1px solid #eaeaea;
  border-radius: 0.25rem;
  border: 0;
  width: 100%;
}
.custom-calendar.vc-container .vc-header {
  background-color: #eee;
  padding: 10px 0;
  border-top-right-radius: 0.25rem;
  border-top-left-radius: 0.25rem;
}
.custom-calendar.vc-container .vc-weeks {
  padding: 0;
}
.custom-calendar.vc-container .vc-weekday {
  background-color: #f8f8f8;
  border-bottom: 1px solid #eaeaea;
  border-top: 1px solid #eaeaea;
  padding: 5px 0;
}
.custom-calendar.vc-container .vc-day {
  padding: 0 5px 3px 5px;
  text-align: left;
  height: auto;
  min-height: 90px;
  min-width: 90px;
  background-color: white;
}
.custom-calendar.vc-container .vc-day.weekday-1,
.custom-calendar.vc-container .vc-day.weekday-7 {
  background-color: #eff8ff;
  background: #eee;
}
.custom-calendar.vc-container .vc-day:not(.on-bottom) {
  border-bottom: 1px solid #b8c2cc;
}
.custom-calendar.vc-container .vc-day:not(.on-bottom).weekday-1 {
  border-bottom: 1px solid #b8c2cc;
}

.custom-calendar.vc-container .vc-day:not(.on-right) {
  border-right: 1px solid #b8c2cc;
}

.custom-calendar.vc-container .vc-day .vc-day-dots {
  margin-bottom: 5px;
}
.custom-calendar .vc-title {
  margin-left: 1rem;
}
</style>
