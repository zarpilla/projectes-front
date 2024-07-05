<template>
  <div class="container">
    <div class="columns">
      <div class="column is-one-third">
        <h4 class="subtitle"><b>ESS</b>TRAPIS</h4>
        <h4 class="title mt-5">Canviar clau de pas</h4>
        <form @submit="resetPassword">
          <div class="field">
            <label class="label" for="pwd">Clau de pas</label>
            <input type="password" v-model="password" required class="input" />
          </div>
          <div class="field">
            <label class="label" for="pwd">Confirma clau de pas</label>
            <input
              type="password"
              v-model="confirmPassword"
              required
              class="input"
            />
          </div>
          <button
            type="submit"
            :disabled="password.length < 3 || password !== confirmPassword"
            class="button is-primary mt-4"
          >
            Envia
          </button>
        </form>

        <p v-show="done" class="has-text-primary">{{ message }}</p>
        <p v-show="error" class="has-text-danger">Oh oh, hi ha hagut un error...</p>

        <div class="mt-4">
          <router-link to="/"> Torna </router-link>
        </div>
      </div>
    </div>
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
      done: false,
      error: false,
      message: ''
    };
  },
  methods: {
    async resetPassword(e) {
      e.preventDefault();
      service()
        .post("auth/reset-password", {
          code: this.$route.query.code,
          password: this.password,
          passwordConfirmation: this.confirmPassword,
        })
        .then(() => {
          this.done = true;
          this.$buefy.snackbar.open({
                position: "is-top",
                message: 'Clau de pas canviada',
                cancelText: "No"                    
            });
          this.$router.push("/");
        })
        .catch((e) => {
          e;
          this.error = true;
        });
    },
  },
};
</script>
