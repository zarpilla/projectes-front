<template>
  <aside v-show="isAsideVisible" class="aside is-placed-left is-expanded">
    <aside-tools :is-main-menu="true">
      <span slot="label"> <b>ESS</b>TRAPIS </span>
    </aside-tools>
    <div class="menu is-menu-main">
      <template v-for="(menuGroup, index) in menu">
        <p v-if="typeof menuGroup === 'string'" :key="index" class="menu-label">
          {{ menuGroup }}
        </p>
        <aside-menu-list
          v-else          
          :key="index"
          :menu="menuGroup"
          @menu-click="menuClick"
        />
      </template>
    </div>
    <div class="logos">
      <div v-for="logo in logos" :key="logo.id" class="mt-5 mb-5 has-text-centered">
        <figure class="image is-128x128 is-inline-block">
          <img :src="logo.url" :alt="logo.name" />
        </figure>
      </div>
    </div>
  </aside>
</template>

<script>
import { mapState } from 'vuex'
import AsideTools from '@/components/AsideTools'
import AsideMenuList from '@/components/AsideMenuList'
import service from "@/service/index";
import getConfig from "@/config";

export default {
  name: 'AsideMenu',
  components: { AsideTools, AsideMenuList },
  props: {
    menu: {
      type: Array,
      default: []
    }
  },
  computed: {
    ...mapState(['isAsideVisible'])
  },
  data() {
    return {
      logos: []
    }
  },
  created() {
    this.fetchLogos();
  },
  methods: {
    menuClick (item) {
      
      //
    },
    fetchLogos() {
      service({ cached: true }).get("logos?_sort=order:ASC").then(response => {
        const config = getConfig();
        const apiUrl = config.VUE_APP_API_URL;
        this.logos = response.data.map(logo => {
          return {
            ...logo,
            url: logo.logo ? apiUrl + logo.logo.url : ""
          };
        });
      }).catch(error => {
        console.error("Error fetching logos:", error);
      });
    }
  }
}
</script>
<style>
.menu-list a{
  padding: 0.3rem 0;
}
aside.aside{
    overflow-y: auto;
}
</style>