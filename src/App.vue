<template>
  <div id="app">
    <nav-bar v-if="userName" />
    <aside-menu v-if="userName" :menu="menuList" />
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
    EventBus.$on("login", () => {
      this.loadUserData();
    });
  },
  computed: {
    ...mapState(["userName"]),
    menu() {
      return this.loaded ? this.menuList : [];
    }
  },
  data() {
    return {
      loaded: false,
      menuList: []
    };
  },
  async created() {
    this.loadUserData();
  },
  methods: {
    hasChildrenWithPermissions(items, userPermissions) {
      return (
        items.find(item => {
          if (!item.permission) {
            return true;
          }
          if (item.permission) {
            if (userPermissions.includes(item.permission)) {
              return true;
            }
          }
        }) !== undefined
      );
    },
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

            const userPermissions = me.data.permissions.map(p => p.permission);

            menu.forEach((element, idx) => {
              if (typeof element === "string") {
                if (menu.length > idx + 1) {
                  const hasPermisssions = this.hasChildrenWithPermissions(
                    menu[idx + 1],
                    userPermissions
                  );

                  if (hasPermisssions) {
                    this.menuList.push(element);
                    return;
                  } else {
                    return;
                  }
                } else {
                  return;
                }
              }

              const subElements = [];
              element.forEach(subElement => {
                if (!subElement.permission) {
                  subElements.push(subElement);
                } else {
                  if (userPermissions.includes(subElement.permission)) {
                    subElements.push(subElement);
                  }
                }
              });

              this.menuList.push(subElements);
            });

            if (userPermissions.includes("orders")) {
              const pending = (
                await service({ requiresAuth: true, cached: true }).get(
                  `emitted-invoices/pending-provider?_limit=-1&_sort=name:ASC`
                )
              ).data;
              if (pending && pending.invoices) {
                this.$buefy.snackbar.open({
                  message: "Atenció. Hi ha factures pendents de pagar.",
                  queue: false,
                  type: "is-warning"
                });
              }
            } else {
              if (this.$route.name === "login") {
                this.$router.push("projectes");
              }
            }

            this.loaded = true;
          }
        } catch {
          localStorage.removeItem("user");
          localStorage.removeItem("jwt");
          this.$router.push("/");
        }
      } else {
        const meOptions = (
          await service({ requiresAuth: true, cached: true }).get("me")
        ).data;

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
