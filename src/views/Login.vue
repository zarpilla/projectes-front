<template>
  <div class="container">
    <div class="columns">
      <div class="column is-one-third">
        <h4 class="subtitle">Projectes Coop</h4>
        <h4 class="title mt-5">Accedeix</h4>
        <form>
          <label class="label" for="email">Correu electrònic</label>
          <div class="field">
            <input
              class="input"
              id="email"
              type="email"
              v-model="email"
              required
              autofocus
            />
          </div>
          <div>
            <label class="label" for="password">Clau de pas</label>
            <div class="field">
              <input
                class="input"
                id="password"
                type="password"
                v-model="password"
                required
              />
            </div>
          </div>
          <div>
            <button
              class="button is-primary mt-4"
              type="submit"
              @click="handleSubmit"
            >
              Envia
            </button>
          </div>
        </form>
        <div class="mt-4">
          <router-link to="/forgotten-password">
            He oblidat la meva clau de pas
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import service from "@/service/index";
import { mapState } from "vuex";
import { EventBus } from "@/service/event-bus.js";

export default {
  data() {
    return {
      email: "",
      password: ""
    };
  },
  computed: {
    ...mapState(["userName"])
  },
  async mounted() {
    if (this.userName) {
      this.$router.push("projectes");
    }
  },
  methods: {
    handleSubmit(e) {
      e.preventDefault();
      if (this.password.length > 0) {
        service()
          .post("auth/local", {
            identifier: this.email,
            password: this.password
          })
          .then(response => {
            let is_admin = response.data.user.is_admin;
            let user = response.data.user;

            if (!user.confirmed) {
              // this.$buefy.snackbar.open({
              //   // indefinite: true,
              //   zposition: "is-center",
              //   message:
              //     "Aquest correu electrònic no està confirmat, siusplau, contacta amb l'administradora per accedir",
              //   cancelText: "No",
              //   onAction: e => {}
              // });

              this.$buefy.toast.open({
                message: `Aquest correu electrònic no està confirmat, siusplau, contacta amb l'administradora per accedir`,
                type: "is-danger"
              });
              return;
            }

            delete user.tasks;
            delete user.daily_dedications;
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("jwt", response.data.jwt);
            this.$store.commit("user", {
              user: user,
              name: user.username,
              jwt: response.data.jwt
            });

            EventBus.$emit("login", {});

            if (this.$route.params.nextUrl != null) {
              this.$router.push(this.$route.params.nextUrl);
            } else {
              if (is_admin == 1) {
                this.$router.push("admin");
              } else {
                this.$router.push("projectes");
              }
            }
          })
          .catch(error => {
            console.error(error.response);
            this.$buefy.snackbar.open({
              // indefinite: true,
              position: "is-top",
              message: "Correu o clau de pas incorrecta",
              cancelText: "No",
              onAction: e => {
                // this.refreshApp()
              }
            });
          });
      }
    }
  }
};
</script>
