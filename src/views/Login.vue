<template>
  <div class="login-page">
    <main class="login-main">
      <brand-logo class="login-logo" />
      <form class="login-card" novalidate @submit.prevent="handleSubmit">
        <div>
          <h1>Accedeix</h1>
          <p class="login-lead">Projectes, temps i diners de la teva entitat.</p>
        </div>
        <div class="field">
          <label class="label" for="email">Correu electrònic</label>
          <input
            id="email"
            v-model="email"
            class="input"
            type="email"
            autocomplete="username"
            required
            autofocus
          />
        </div>
        <div class="field">
          <label class="label" for="password">Clau de pas</label>
          <div class="password-wrap">
            <input
              id="password"
              v-model="password"
              class="input"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showPassword ? 'Amaga la clau' : 'Mostra la clau'"
              :aria-pressed="showPassword ? 'true' : 'false'"
              @click="showPassword = !showPassword"
            >
              <b-icon :icon="showPassword ? 'eye-off' : 'eye'" custom-size="default" />
            </button>
          </div>
        </div>
        <div v-if="error" class="notification is-danger login-error" role="alert">{{ error }}</div>
        <button class="button is-primary is-fullwidth login-submit" type="submit" :class="{ 'is-loading': sending }">
          Entra
        </button>
        <router-link class="login-forgot" to="/recuperar-clau">He oblidat la clau</router-link>
      </form>
    </main>
    <footer v-if="logos.length" class="login-logos">
      <span>Amb el suport de</span>
      <div class="login-logos-list">
        <figure v-for="logo in logos" :key="logo.id" class="image">
          <a v-if="logo.href" :href="logo.href" target="_blank" rel="noopener"><img :src="logo.src" alt="" /></a>
          <img v-else :src="logo.src" alt="" />
        </figure>
      </div>
    </footer>
  </div>
</template>

<script>
import service from "@/service/index";
import { clearCache } from "@/service/cache";
import { storedPermissions, userPermissions } from "@/domain/routeAccess";
import { HOME_PATH, landingForUser, writePrefs } from "@/domain/home";
import { fetchHome } from "@/stores/homePins";
import { currentUserId } from "@/domain/currentUser";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import getConfig from "@/config";
import BrandLogo from "@/components/BrandLogo.vue";
import { logosForDisplay } from "@/domain/logos";

export default {
  components: { BrandLogo },
  data() {
    return {
      email: "",
      password: "",
      logos: [],
      showPassword: false,
      sending: false,
      error: ""
    };
  },
  computed: {
    ...mapState(useMainStore, ["userName"])
  },
  async mounted() {
    if (this.userName) {
      const permissions = storedPermissions();
      this.$router.push(permissions ? landingForUser(currentUserId(), permissions) : HOME_PATH);
    } else {
      try {
        // without the trashed ones (Administració › Logos, issues/159)
        const response = await service({ cached: true }).get("logos?_sort=order:ASC");
        this.logos = logosForDisplay(response.data, getConfig().VUE_APP_API_URL);
      } catch (error) {
        console.error("Error fetching logos:", error);
      }

    }
  },
  methods: {
    // the login answer has no app permissions: read them before choosing the
    // page, so the router lets her in where she belongs (issues/121)
    async goToLanding(user) {
      let permissions = null;
      let userId = user && user.id;
      try {
        const me = await service({ requiresAuth: true }).get("users/me");
        if (me && me.data && me.data.username) {
          localStorage.setItem("user", JSON.stringify(me.data));
          permissions = userPermissions(me.data);
          userId = me.data.id;
          // the page chosen in Inici, from any browser
          const home = await fetchHome();
          if (home) writePrefs(userId, home);
        }
      } catch (e) {
        localStorage.setItem("user", JSON.stringify(user));
      }
      if (this.$route.query.nextUrl != null) {
        this.$router.push(this.$route.query.nextUrl);
      } else {
        // Inici, or the page the person chose there; unknown permissions: Inici
        // (the router lets everybody in)
        this.$router.push(permissions ? landingForUser(userId, permissions) : HOME_PATH);
      }
    },
    handleSubmit() {
      this.error = "";
      if (!this.email || !this.password) {
        this.error = "Escriu el correu electrònic i la clau de pas.";
        return;
      }
      this.sending = true;
      {
        service()
          .post("auth/local", {
            identifier: this.email,
            password: this.password
          })
          .then(response => {
            let user = response.data.user;

            if (!user.confirmed) {

              this.error = "Aquest correu electrònic no està confirmat. Contacta amb l'administradora per accedir.";
              this.sending = false;
              return;
            }

            delete user.tasks;
            delete user.daily_dedications;
            // the catalogs cached for the previous user (issues/097)
            clearCache();
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("jwt", response.data.jwt);
            useMainStore().setUser({
              user: user,
              name: user.username,
              jwt: response.data.jwt
            });

            return this.goToLanding(user);
          })
          .catch(error => {
            this.sending = false;
            console.error(error.response);
            // Strapi v5 answers { error: { message } }; the compat layer in
            // service/v5-compat.js aliases it to a top-level `message` string.
            if (error.response && error.response.data && typeof error.response.data.message === "string") {
              const message = error.response.data.message
                .replace("Identifier or password invalid.", "Correu electrònic o clau de pas incorrectes")
                .replace("Invalid identifier or password", "Correu electrònic o clau de pas incorrectes");

              this.error = message;
          } else {
            this.error = "S'ha produït un error en connectar amb ESSTRAPIS. Torna-ho a provar més tard o contacta amb l'administradora.";
          }
        });            
      }
    }
  }
};
</script>
<!-- styles: scss/_auth.scss (shared with the password pages) -->
