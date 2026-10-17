<template>
  <!-- Redesign A: the login page's card -->
  <div class="login-page">
    <main class="login-main">
      <brand-logo class="login-logo" />

      <form v-if="!done" class="login-card" @submit.prevent="forgotPassword">
        <div>
          <h1>Recupera la clau de pas</h1>
          <p class="login-lead">Escriu el correu amb què entres i t'enviarem un enllaç per triar-ne una de nova.</p>
        </div>
        <div class="field">
          <label class="label" for="email">Correu electrònic</label>
          <input id="email" v-model="email" type="email" autocomplete="username" autofocus required class="input" />
        </div>
        <div v-if="error" class="notification is-danger login-error" role="alert">
          No hem pogut enviar el correu. Torna-ho a provar d'aquí a una estona o contacta amb l'equip.
        </div>
        <button type="submit" class="button is-primary login-submit" :disabled="sending">
          {{ sending ? "Enviant…" : "Envia l'enllaç" }}
        </button>
      </form>

      <div v-else class="login-card">
        <span class="auth-icon"><b-icon icon="email-outline" /></span>
        <div>
          <h1>Revisa el correu</h1>
          <p class="login-lead">
            T'hem enviat un enllaç per canviar la clau de pas a <b>{{ email }}</b>. Pot trigar uns minuts; si no el veus, mira la carpeta de correu brossa.
          </p>
        </div>
        <router-link to="/" class="button is-primary login-submit">Torna a l'inici de sessió</router-link>
        <p class="auth-note">
          No t'ha arribat? <button type="button" @click="forgotPassword">Torna-ho a enviar</button>
          o <button type="button" @click="done = false">canvia el correu</button>.
        </p>
      </div>

      <router-link v-if="!done" to="/" class="auth-back">← Torna a l'inici de sessió</router-link>
    </main>
  </div>
</template>

<script>
import service from "@/service/index";
import BrandLogo from "@/components/BrandLogo.vue";

export default {
  components: { BrandLogo },
  name: "ForgottenPassword",
  data() {
    return {
      email: "",
      done: false,
      sending: false,
      error: false
    };
  },
  methods: {
    async forgotPassword() {
      this.error = false;
      this.sending = true;
      try {
        // Strapi 5 takes the reset link from its own settings and refuses
        // other keys (issues/021)
        await service().post("auth/forgot-password", { email: this.email });
        this.done = true;
      } catch (e) {
        this.done = false;
        this.error = true;
      } finally {
        this.sending = false;
      }
    }
  }
};
</script>
