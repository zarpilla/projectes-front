<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full" v-if="!submitted">
          <div v-html="config.contact_form_text" />
          <card-component class="tile is-child">
            <form @submit.prevent="submit" v-if="!isLoading">
              <b-field label="Proveïdora *" horizontal>
                <b-select v-model="form.user" placeholder="" disabled="true">
                  <option
                    v-for="(s, index) in users"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.fullname || s.username }}
                  </option>
                </b-select>
              </b-field>

              <b-field label="Correu electrònic*" horizontal>
                <b-input
                  v-model="form.email"
                  placeholder="El teu correu"
                  required
                />
              </b-field>

              <b-field label="Nom *" horizontal>
                <b-input
                  v-model="form.name"
                  placeholder="El teu nom"
                  required
                />
              </b-field>

              <b-field label="Missatge *" horizontal>
                <b-input
                  type="textarea"
                  v-model="form.message"
                  placeholder="Què vols dir-nos?"
                  required
                />
              </b-field>

              <hr />
              <b-field horizontal>
                <b-button type="is-primary" :loading="isLoading || submitting" @click="submit"
                  >Enviar</b-button
                >
              </b-field>
            </form>
          </card-component>
        </div>
        <div class="column is-full" v-if="submitted">
          <div v-html="config.contact_form_thankyou" />
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import service from "@/service/index";
import { mapState } from "vuex";
import concat from "lodash/concat";

export default {
  name: "ContactUsForm",
  components: {
    CardComponent,
    TitleBar
  },
  data() {
    return {
      isLoading: false,
      form: {
        name: null,
        user: null,
        email: null,
        message: ""
      },
      users: [],
      config: { contact_form_text: "" },
      submitted: false,
      submitting: false
    };
  },
  computed: {
    ...mapState(["me"]),
    titleStack() {
      return ["Contacta amb nosaltres"];
    },
    transitionName() {
      if (this.useTransition) {
        return "fade";
      }
      return "x";
    }
  },
  created() {
    this.getData();
  },
  methods: {
    async getData() {
      const me = await service({ requiresAuth: true, cached: true }).get(
        "users/me"
      );

      this.config = await service({ requiresAuth: true, cached: true })
        .get("me")
        .then(res => res.data);

      this.form.user = me.data.id;

      this.users = (
        await service({ requiresAuth: true, cached: true }).get(
          "users?_limit=-1"
        )
      ).data.filter(u =>
        u.permissions.map(p => p.permission).includes("orders")
      );

      this.form.email = me.data.email;
    },
    async submit() {

      if (!this.form.name || !this.form.email || !this.form.message) {
        this.$buefy.snackbar.open({
          message: "Falten camps per omplir",
          queue: false,
          type: "is-danger"
        });
        return;
      }

      this.isLoading = true;
      this.submitting = true;

      const submission = await service({ requiresAuth: true }).post(
        "form-submissions",
        this.form
      ).catch(e => {
        this.$buefy.snackbar.open({
          message: "Error en l'enviament, si us plau, contacta a través d'un altra forma.",
          queue: false,
          type: "is-danger"
        });
        this.submitting = false;
        this.isLoading = false;
        return
      });
      
      if (submission) {
        this.$buefy.snackbar.open({
          message: "Enviat",
          queue: false
        });
        setTimeout(() => {
          this.submitting = false;
          this.isLoading = false;
          this.submitted = true;
        }, 100);
      }
    }
  }
};
</script>
<style lang="scss" scoped>
.line .field.medium-field {
  width: 10%;
}
.line .field.subphase-detail-input-large-field {
  width: 30%;
}
.summary-card .column {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
.summary-card .label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.8rem;
}
.ulist .tag {
  margin-right: 3px;
  margin-bottom: 3px;
}
.summary label {
  margin-right: 0.5rem;
}
.line-notes .control {
  width: 50%;
}
.line-notes textarea {
  width: 100%;
}
</style>
