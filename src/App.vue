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
import { useTaskAlerts } from "@/stores/taskAlerts";

const TASK_ALERTS_EVERY_MS = 5 * 60 * 1000;
import service from "@/service/index";
import menu, { hasMenuPermission } from "@/service/menu";
import { isMemberOnly, landingForUser } from "@/domain/home";
import { useHomePins } from "@/stores/homePins";
import ModalBoxInvoice from "@/components/ModalBoxInvoice.vue";

const PENDING_NOTICE = "pendingInvoicesNotice";
const pendingNoticeShown = userId => {
  try {
    return sessionStorage.getItem(PENDING_NOTICE) === String(userId);
  } catch (e) {
    return false;
  }
};
const markPendingNoticeShown = userId => {
  try {
    sessionStorage.setItem(PENDING_NOTICE, String(userId));
  } catch (e) {
    // shown again next time
  }
};

export default {
  name: "Home",
  components: {
    NavBar,
    AsideMenu,
    FooterBar,
    ModalBoxInvoice
  },
  watch: {
    // the sidebar (and the room the layout keeps for it) only exists with a session
    userName: {
      immediate: true,
      handler(name) {
        document.documentElement.classList.toggle("has-session", !!name);
      }
    },
    // Login.vue commits the new jwt on a successful login
    userJwt(jwt) {
      if (jwt) {
        this.loadUserData();
      }
    },
    // the Tasques menu dot: opening Tasques sees what was new; leaving it recounts
    "$route.path"(path, from) {
      if (!this.hasTaskAlerts) return;
      if (path === "/tasques") useTaskAlerts().markSeen();
      else if (from === "/tasques") useTaskAlerts().refreshSoon();
    }
  },
  mounted() {
    // Refresh user data when tab/window regains focus
    window.addEventListener("focus", this.refreshUserData);
    this.taskAlertsTimer = setInterval(() => {
      if (this.hasTaskAlerts && !document.hidden) useTaskAlerts().refresh();
    }, TASK_ALERTS_EVERY_MS);
  },
  beforeUnmount() {
    window.removeEventListener("focus", this.refreshUserData);
    clearInterval(this.taskAlertsTimer);
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
      lastRefresh: 0,
      // people with the projects permission see the Tasques entry and its dot
      hasTaskAlerts: false
    };
  },
  async created() {
    this.loadUserData();
  },
  methods: {
    // the entity's name for the pending payments notice: a member never opens
    // the screens that load it
    async loadEntity() {
      if (useMainStore().me && useMainStore().me.name) return;
      try {
        const entity = (await service({ requiresAuth: true, cached: true }).get("me")).data;
        useMainStore().setMe({ me: entity && entity.data ? entity.data : entity });
      } catch (e) {
        // «de l'entitat»
      }
    },
    hasChildrenWithPermissions(items, userPermissions) {
      return items.some(item => hasMenuPermission(item, userPermissions));
    },
    async refreshUserData() {
      const now = Date.now();
      const THROTTLE_MS = 900000; // Only refresh once every 15 minutes
      
      // Skip if refreshed recently
      if (now - this.lastRefresh < THROTTLE_MS) {
        return;
      }
      
      this.lastRefresh = now;

      // fresh permissions: users/me is otherwise kept for the page load (issues/327)
      await this.loadUserData({ reload: true });
    },
    async loadUserData(options) {
      if (localStorage.getItem("user") && localStorage.getItem("jwt")) {
        // the load on created() counts for the focus throttle: the first focus
        // after a reload asked users/me, home and the task alerts again
        // (issues/309)
        this.lastRefresh = Date.now();
        try {
          const me = await service({ requiresAuth: true }).get("users/me", options);
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

            // built apart and swapped in whole: two loads at once (a focus while
            // the first users/me was on its way) put every group twice
            // (issues/309)
            const menuList = [];
            menu.forEach((element, idx) => {
              if (typeof element === "string") {
                if (menu.length > idx + 1) {
                  const hasPermisssions = this.hasChildrenWithPermissions(
                    menu[idx + 1],
                    userPermissions
                  );

                  if (hasPermisssions) {
                    menuList.push(element);
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
                if (hasMenuPermission(subElement, userPermissions)) {
                  subElements.push(subElement);
                }
              });

              menuList.push(subElements);
            });
            this.menuList = menuList;

            // the stars of the menu: this person's pins (another one may have logged in)
            useHomePins().load();

            this.hasTaskAlerts = userPermissions.includes("projects");
            if (this.hasTaskAlerts) {
              if (this.$route && this.$route.path === "/tasques") useTaskAlerts().markSeen();
              // after the page's own data (issues/307)
              useTaskAlerts().refreshSoon();
            }

            // a member reads it on «Avisos», where she lands (issues/354)
            if (userPermissions.includes("orders") && !isMemberOnly(userPermissions)) {
              const pending = (
                await service({ requiresAuth: true, cached: true }).get(
                  `emitted-invoices/pending-provider?_limit=-1&_sort=name:ASC`
                )
              ).data;
              // once per session, not on every page load (issues/181)
              if (pending && pending.invoices && pending.invoices.length > 0 && !pendingNoticeShown(user.id)) {
                this.invoices = pending.invoices;
                await this.loadEntity();
                this.isModalActive = true;
                markPendingNoticeShown(user.id);
              }
            } else {
              // Login.vue is already navigating to nextUrl (a lazy route can
              // still be loading here); pushing now would cancel it
              if (this.$route.name === "login" && !this.$route.query.nextUrl) {
                this.$router.push(landingForUser(user.id, userPermissions));
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
        // Logged out (the login page): nothing to load. It used to ask /me
        // without a JWT, which the API answers 403 (issues/063), for options
        // nothing read.
        this.loaded = true;
      }
    }
  }
};
</script>
