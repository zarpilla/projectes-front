<template>
  <div class="container">
    <div class="columns position-relative pr-4 pl-4">
      <div class="column is-one-third">
        <h4 class="subtitle">
          <img class="main-logo" src="@/assets/esstrapis-dark.svg" alt="ESSTRAPIS"  />
        </h4>
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
    <div class="columns logos-support-home" v-if="logos.length">
      <div class="container">
      <div class="column zis-flex">
        <div class="z">
          Amb el suport de:
        </div>
        <div class="is-flex">
        <div v-for="logo in logos" :key="logo.id" class="mt-2 mr-5 logo-home">
          <figure class="image">
            <img :src="logo.url" :alt="logo.name" />
          </figure>
        </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script>
import service from "@/service/index";
import { mapState } from "vuex";
import { EventBus } from "@/service/event-bus.js";
import getConfig from "@/config";

export default {
  data() {
    return {
      email: "",
      password: "",
      logos: []
    };
  },
  computed: {
    ...mapState(["userName"])
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
            if (error.response && error.response.data && error.response.data.message && error.response.data.message.length && error.response.data.message[0].messages && error.response.data.message[0].messages.length) {
              const message = error.response.data.message[0].messages[0].message.replace("Identifier or password invalid.", "Correu electrònic o clau de pas incorrectes");

              this.$buefy.snackbar.open({
                // indefinite: true,
                position: "is-top",
                message: message,
            });
          } else {
            this.$buefy.snackbar.open({
              // indefinite: true,
              position: "is-top",
              message: "S'ha produït un error en connectar amb ESSTRAPIS.<br>Si us plau, torna a intentar-ho més tard o contacta amb l'administradora",              
              });            
          }
        });            
      }
    }
  }
};
</script>
<style scoped>
.logo-home img{
  display: inline-block;
  height: 60px;
  width: auto;
}
.position-relative {
  position: relative;
  min-height: 100vh;
}
.logos-support-home {
  position: fixed;
  width: 100vw;
  bottom: 0px;
  background-color: #262930;
  left: 0;
  color: #bbbbbb;
}
</style>