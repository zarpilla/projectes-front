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
          <div class="label-row">
            <label class="label" for="password">Clau de pas</label>
            <router-link to="/forgotten-password">He oblidat la clau</router-link>
          </div>
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
      </form>
    </main>
    <footer v-if="logos.length" class="login-logos">
      <span>Amb el suport de</span>
      <div class="login-logos-list">
        <figure v-for="logo in logos" :key="logo.id" class="image">
          <img :src="logo.url" :alt="logo.name" />
        </figure>
      </div>
    </footer>
  </div>
</template>

<script>
import service from "@/service/index";
import { clearCache } from "@/service/cache";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import getConfig from "@/config";
import BrandLogo from "@/components/BrandLogo.vue";

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
      this.$router.push("projectes");
    } else {
      try {
        const response = await service({ cached: true }).get("logos?_sort=order:ASC");
        this.logos = response.data;

        const config = getConfig();
        const apiUrl = config.VUE_APP_API_URL;
        this.logos = this.logos.map(logo => {
          return {
            ...logo,
            url: logo.logo ? apiUrl + logo.logo.url : ""
          };
        });
      } catch (error) {
        console.error("Error fetching logos:", error);
      }

    }
  },
  methods: {
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
            let is_admin = response.data.user.is_admin;
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

            if (this.$route.query.nextUrl != null) {
              this.$router.push(this.$route.query.nextUrl);
            } else {
              if (is_admin == 1) {
                this.$router.push("admin");
              } else {
                this.$router.push("projectes");
              }
            }
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
