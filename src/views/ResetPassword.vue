<template>
  <!-- Redesign A: the login page's card -->
  <div class="login-page">
    <main class="login-main">
      <div class="login-logo" aria-label="ESSTRAPIS"><b>ESS</b><span>TRAPIS</span></div>

      <form class="login-card" @submit.prevent="resetPassword">
        <div>
          <h1>Tria una clau nova</h1>
          <p class="login-lead">Com a mínim 6 caràcters. La faràs servir a partir d'ara per entrar.</p>
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
        </div>
        <div v-if="error" class="notification is-danger login-error" role="alert">
          No s'ha pogut canviar la clau. L'enllaç pot haver caducat: demana'n un de nou.
        </div>
        <button type="submit" class="button is-primary login-submit" :disabled="!valid || sending">
          {{ sending ? "Desant…" : "Desa la clau nova" }}
        </button>
      </form>

      <router-link to="/forgotten-password" class="auth-back">Demana un enllaç nou</router-link>
    </main>
  </div>
</template>

<script>
import service from "@/service/index";

export default {
  name: "ResetPassword",
  data() {
    return {
      password: "",
      confirmPassword: "",
      show: false,
      sending: false,
      error: false
    };
  },
  computed: {
    valid() {
      return this.password.length >= 6 && this.password === this.confirmPassword;
    }
  },
  methods: {
    async resetPassword() {
      this.error = false;
      this.sending = true;
      try {
        await service().post("auth/reset-password", {
          code: this.$route.query.code,
          password: this.password,
          passwordConfirmation: this.confirmPassword
        });
        this.$buefy.snackbar.open({ position: "is-top", message: "Clau de pas canviada", queue: false });
        this.$router.push("/");
      } catch (e) {
        this.error = true;
      } finally {
        this.sending = false;
      }
    }
  }
};
</script>
