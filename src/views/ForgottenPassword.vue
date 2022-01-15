<template>
  <div class="container">
    <div class="columns">
      <div class="column is-one-third">
        <h4 class="subtitle">Projectes Coop</h4>
        <h4 class="title mt-5">Recuperar clau de pas</h4>
        <form @submit="forgotPassword">
          <div class="field">
            <label class="label" for="email">Correu electrònic</label>
            <input
              type="email"
              v-model="email"
              autofocus
              required
              class="input"
            />
          </div>

          <button v-show="!sent" type="submit" class="button is-primary mt-4">Envia</button>
        </form>

        <p v-show="done" class="has-text-primary mt-4">{{ message }}</p>
        <p v-show="error" class="has-text-danger mt-4">Oh oh, hi ha hagut un error...</p>

        <div  class="mt-4">
            <router-link to="/"> Torna </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import service from "@/service/index";
    export default {
        name: 'ForgottenPassword',        
        data() {
            return {
                email: '',
                done: false,
                sent: false,
                error: false,
                message0: "S'ha enviat un enllaç per canviar la clau de pas a",
                message: "S'ha enviat un enllaç per canviar la clau de pas a"
            }
        },
        methods: {
            async forgotPassword(e) {
                e.preventDefault()
                this.done = false;
                this.error = false;
                this.sent = true;
                service()
                .post("auth/forgot-password", {
                    email: this.email,
                    url: process.env.VUE_APP_RESET_PASSWORD,
                })                
                .then((res) => {
                    this.done = true
                    this.message = `${this.message0} ${this.email}`
                    this.$buefy.snackbar.open({
                        position: "is-top",
                        message: this.message,
                        cancelText: "No"                    
                    });
                })
                .catch(e => {
                    e;
                    this.error = true
                })
            }
        }
    }
</script>
