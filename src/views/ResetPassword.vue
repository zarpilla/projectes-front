<template>
  <!-- Redesign A: the login page's card -->
  <div class="login-page">
    <main class="login-main">
      <brand-logo class="login-logo" />

      <form class="login-card" @submit.prevent="resetPassword">
        <div>
          <h1>Tria una clau nova</h1>
          <p class="login-lead">{{ hint }} La faràs servir a partir d'ara per entrar.</p>
        </div>
        <div class="field">
          <label class="label" for="password">Clau nova</label>
          <div class="password-wrap">
            <input id="password" v-model="password" :type="show ? 'text' : 'password'" autocomplete="new-password" required class="input" />
            <button type="button" class="password-toggle" :aria-label="show ? 'Amaga la clau' : 'Mostra la clau'" @click="show = !show">
              <b-icon :icon="show ? 'eye-off' : 'eye'" />
            </button>
          </div>
        </div>
        <div class="field">
          <label class="label" for="password2">Repeteix la clau</label>
          <input id="password2" v-model="confirmPassword" :type="show ? 'text' : 'password'" autocomplete="new-password" required class="input" />
          <p v-if="confirmPassword && password !== confirmPassword" class="help is-danger">Les dues claus no coincideixen.</p>
          <p v-else-if="password && tooShort" class="help">{{ password.length }} de {{ minLength }} caràcters com a mínim.</p>
        </div>
        <div v-if="error" class="notification is-danger login-error" role="alert">
          {{ error }}
        </div>
        <button type="submit" class="button is-primary login-submit" :disabled="!valid || sending">
          {{ sending ? "Desant…" : "Desa la clau nova" }}
        </button>
      </form>

      <router-link to="/recuperar-clau" class="auth-back">Demana un enllaç nou</router-link>
    </main>
  </div>
</template>

<script>
import service from "@/service/index";
import BrandLogo from "@/components/BrandLogo.vue";
import { MIN_LENGTH, PASSWORD_HINT, passwordProblem, apiMessage, rememberWeakPassword } from "@/service/passwordPolicy";

// the password policy's messages (in Catalan, all about «la clau»); any other
// error («Incorrect code provided») means the link is no good
const POLICY_MESSAGE = /clau/i;
const BAD_LINK_MESSAGE = "No s'ha pogut canviar la clau. L'enllaç pot haver caducat: demana'n un de nou.";

export default {
  name: "ResetPassword",
  components: { BrandLogo },
  data() {
    return {
      password: "",
      confirmPassword: "",
      show: false,
      sending: false,
      error: null,
      hint: PASSWORD_HINT,
      minLength: MIN_LENGTH
    };
  },
  computed: {
    valid() {
      return !passwordProblem(this.password, this.confirmPassword);
    },
    tooShort() {
      return [...this.password].length < MIN_LENGTH;
    }
  },
  methods: {
    async resetPassword() {
      this.error = null;
      this.sending = true;
      try {
        await service().post("auth/reset-password", {
          code: this.$route.query.code,
          password: this.password,
          passwordConfirmation: this.confirmPassword
        });
        rememberWeakPassword(false);
        this.$buefy.snackbar.open({ position: "is-top", message: "Clau de pas canviada", queue: false });
        this.$router.push("/");
      } catch (e) {
        const message = apiMessage(e, "");
        this.error = POLICY_MESSAGE.test(message) ? message : BAD_LINK_MESSAGE;
      } finally {
        this.sending = false;
      }
    }
  }
};
</script>
