<template>
  <div id="app">
    <nav-bar v-if="userName" />
    <aside-menu v-if="userName" :menu="menu" />
    <router-view />
    <footer-bar v-if="userName" />
  </div>
</template>

<script>
// @ is an alias to /src
import NavBar from "@/components/NavBar";
import AsideMenu from "@/components/AsideMenu";
import FooterBar from "@/components/FooterBar";
import update from "@/mixins/update";
import { mapState } from "vuex";
import service from "@/service/index";
import menu from "@/service/menu";
import { EventBus } from "@/service/event-bus.js";

export default {
  name: "Home",
  components: {
    FooterBar,
    AsideMenu,
    NavBar
  },
  mixins: [update],
  mounted() {
    console.log("mounted!");

    EventBus.$on("login", () => {
      this.loadUserData();
    });
  },
  computed: {
    ...mapState(["userName"]),
    menu() {
      return this.loaded ? menu : [];
    }
  },
  data() {
    return {
      loaded: false
    };
  },
  async created() {
    this.loadUserData();
  },
  methods: {
    async loadUserData() {
      if (localStorage.getItem("user") && localStorage.getItem("jwt")) {
        try {
          const me = await service({ requiresAuth: true }).get("users/me");
          if (me && me.data && me.data.username) {
            const user = JSON.parse(localStorage.getItem("user"));
            user["jwt"] = localStorage.getItem("jwt");
            this.$store.commit("user", {
              user: user,
              name: user.username,
              jwt: sessionStorage.getItem("jwt")
            });

            // const meOptions = (await service({ requiresAuth: true }).get("me"))
            //   .data;

            // console.log("meOptions", meOptions);

            // if (meOptions.options.show_forecast) {
            //   menu[5].push({
            //     to: "/forecast",
            //     icon: "table",
            //     label: "Previsió Económica"
            //   });
            // }

            this.loaded = true;

            if (this.$route.name === "login") {
              this.$router.push("projectes");
            }
          }
        } catch {
          localStorage.removeItem("user");
          localStorage.removeItem("jwt");
          this.$router.push("/");
        }
      } else {
        const meOptions = (await service({ requiresAuth: true }).get("me"))
          .data;

        // if (meOptions.options.show_forecast) {
        //   menu[3].push({
        //     to: "/forecast",
        //     icon: "table",
        //     label: "Previsió"
        //   });
        // }

        this.loaded = true;

        console.log("else!");
      }
    }
  }
};
</script>
