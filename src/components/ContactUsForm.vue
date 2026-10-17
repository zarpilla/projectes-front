<template>
  <!-- Redesign A: the members' contact form, with the entity's text beside it -->
  <div>
    <title-bar :title-stack="titleStack" subtitle="Una població que no és a la llista, un problema amb una recollida o una entrega, o qualsevol altra cosa." />
    <section class="section is-main-section">
      <div v-if="!submitted" class="contact-layout">
        <section class="a-box">
          <header class="box-head"><h2>El teu missatge</h2></header>
          <form v-if="!isLoading" class="a-form" @submit.prevent="submit">
            <b-field label="Sòcia">
              <b-select v-model="form.user" placeholder="" disabled expanded>
                <option v-for="(s, index) in users" :key="index" :value="s.id">{{ s.fullname || s.username }}</option>
              </b-select>
            </b-field>
            <b-field label="Correu electrònic *">
              <b-input v-model="form.email" type="email" placeholder="El teu correu" required />
            </b-field>
            <b-field label="Nom *" class="full">
              <b-input v-model="form.name" placeholder="El teu nom" required />
            </b-field>
            <b-field label="Missatge *" class="full">
              <b-input v-model="form.message" type="textarea" placeholder="Què vols dir-nos?" required />
            </b-field>
            <div class="full">
              <b-button type="is-primary" icon-left="send" :loading="isLoading || submitting" @click="submit">Envia</b-button>
            </div>
          </form>
        </section>
        <aside v-if="config.contact_form_text" class="a-box contact-help">
          <div class="content" v-html="sanitizeHtml(config.contact_form_text)" />
        </aside>
      </div>
      <div v-else class="a-box contact-thanks">
        <b-icon icon="check-circle-outline" size="is-large" />
        <div class="content" v-html="sanitizeHtml(config.contact_form_thankyou || 'Gràcies! Hem rebut el teu missatge.')" />
      </div>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import CardComponent from "@/components/CardComponent.vue";
import service from "@/service/index";
import { richText, sanitizeHtml } from "@/helpers/safeHtml";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
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
    ...mapState(useMainStore, ["me"]),
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
    richText,
    sanitizeHtml,
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
<style scoped>
.contact-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24rem;
  gap: 1rem;
  align-items: start;
}
.contact-help {
  font-size: .9375rem;
  color: var(--a-fg-2);
}
.contact-thanks {
  display: flex;
  gap: 1rem;
  align-items: center;
  max-width: 40rem;
  color: var(--a-pos);
}
@media screen and (max-width: 1023px) {
  .contact-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .contact-help {
    order: -1;
  }
}
</style>
