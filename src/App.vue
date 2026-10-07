<template>
  <!-- Vue 3 mounts inside index.html's #app instead of replacing it -->
  <div>
    <nav-bar v-if="userName" />
    <aside-menu v-if="userName" :menu="menuList" />
    <router-view />
    <footer-bar v-if="userName" />
    <modal-box-invoice :is-active="isModalActive" :invoices="invoices" />
  </div>
</template>

<script>
// @ is an alias to /src
import NavBar from "@/components/NavBar.vue";
import AsideMenu from "@/components/AsideMenu.vue";
import FooterBar from "@/components/FooterBar.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import service from "@/service/index";
import menu from "@/service/menu";
import ModalBoxInvoice from "@/components/ModalBoxInvoice.vue";

export default {
  name: "Home",
  components: {
    NavBar,
    AsideMenu,
    FooterBar,
    ModalBoxInvoice
  },
  watch: {
    // Login.vue commits the new jwt on a successful login
    userJwt(jwt) {
      if (jwt) {
        this.loadUserData();
      }
    }
  },
  mounted() {
    // Refresh user data when tab/window regains focus
    window.addEventListener("focus", this.refreshUserData);
  },
  beforeUnmount() {
    window.removeEventListener("focus", this.refreshUserData);
  },
  computed: {
    ...mapState(useMainStore, ["userName", "userJwt"]),
    menu() {
      return this.loaded ? this.menuList : [];
    }
  },
  data() {
    return {
      loaded: false,
      menuList: [],
      isModalActive: false,
      invoices: [],
      lastRefresh: 0
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
    async refreshUserData() {
      const now = Date.now();
      const THROTTLE_MS = 900000; // Only refresh once every 15 minutes
      
      // Skip if refreshed recently
      if (now - this.lastRefresh < THROTTLE_MS) {
        return;
      }
      
      this.lastRefresh = now;
      
      // Clear menu list to avoid duplicates
      this.menuList = [];
      await this.loadUserData();
    },
    async loadUserData() {
      if (localStorage.getItem("user") && localStorage.getItem("jwt")) {
        try {
          const me = await service({ requiresAuth: true }).get("users/me");
          if (me && me.data && me.data.username) {
            // Update localStorage with fresh user data (including permissions)
            localStorage.setItem("user", JSON.stringify(me.data));
            
            const user = me.data;
            user["jwt"] = localStorage.getItem("jwt");
            useMainStore().setUser({
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
              if (pending && pending.invoices && pending.invoices.length > 0) {
                this.invoices = pending.invoices;
                this.isModalActive = true;
              }
            } else {
              // Login.vue is already navigating to nextUrl (a lazy route can
              // still be loading here); pushing now would cancel it
              if (this.$route.name === "login" && !this.$route.query.nextUrl) {
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
