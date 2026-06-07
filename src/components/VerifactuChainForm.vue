<template>
  <div>
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <section class="section is-main-section">
      <card-component title="Editar cadena Verifactu">
        <form @submit.prevent="submit" v-if="form.id">
          <!-- Read-only fields -->
          <b-field label="ID" horizontal>
            <b-input v-model="form.id" disabled />
          </b-field>

          <b-field label="Factura emesa" horizontal>
            <b-input :value="invoiceDisplay" disabled />
          </b-field>

          <b-field label="Mode" horizontal>
            <b-input v-model="form.mode" disabled />
          </b-field>

          <b-field label="Usuari" horizontal>
            <b-input :value="userDisplay" disabled />
          </b-field>

          <b-field label="Hash" horizontal>
            <b-input v-model="form.hash" disabled />
          </b-field>

          <b-field label="Accions" horizontal>
            <b-input v-model="form.actions" disabled />
          </b-field>

          <b-field label="URL petició" horizontal>
            <b-input v-model="form.request_url" disabled />
          </b-field>

          <b-field label="QR" horizontal>
            <b-input v-model="form.qr" type="textarea" rows="3" disabled />
          </b-field>

          <b-field label="XML" horizontal>
            <b-input v-model="form.xml" type="textarea" rows="5" disabled />
          </b-field>

          <b-field label="JSON factura" horizontal>
            <b-input v-model="form.invoice_json" type="textarea" rows="5" disabled />
          </b-field>

          <b-field label="Text resposta" horizontal>
            <b-input v-model="form.response_text" type="textarea" rows="3" disabled />
          </b-field>

          <hr />

          <!-- Editable state field -->
          <b-field label="Estat *" horizontal>
            <b-select v-model="form.state" required>
              <option value="pending">Pendent</option>
              <option value="ok">OK</option>
              <option value="ko">KO</option>
              <option value="okwitherrors">OK amb errors</option>
            </b-select>
          </b-field>

          <hr />
          
          <b-field horizontal>
            <b-field grouped>
              <div class="control">
                <b-button
                  type="is-primary"
                  native-type="submit"
                  :loading="submitting"
                >
                  Guardar estat
                </b-button>
              </div>
              <div class="control">
                <b-button
                  type="is-light"
                  @click="cancel"
                >
                  Cancel·lar
                </b-button>
              </div>
            </b-field>
          </b-field>
        </form>
      </card-component>
    </section>
  </div>
</template>

<script>
import service from '@/service/index';
import CardComponent from '@/components/CardComponent';

export default {
  name: 'VerifactuChainForm',
  components: {
    CardComponent
  },
  props: {
    id: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      isLoading: false,
      submitting: false,
      form: {
        id: null,
        emitted_invoice: null,
        users_permissions_user: null,
        mode: null,
        state: null,
        hash: null,
        qr: null,
        xml: null,
        invoice_json: null,
        request_url: null,
        response_text: null,
        actions: null
      }
    };
  },
  computed: {
    invoiceDisplay() {
      if (!this.form.emitted_invoice) return '';
      if (typeof this.form.emitted_invoice === 'object') {
        return `${this.form.emitted_invoice.code || this.form.emitted_invoice.id}`;
      }
      return this.form.emitted_invoice;
    },
    userDisplay() {
      if (!this.form.users_permissions_user) return '';
      if (typeof this.form.users_permissions_user === 'object') {
        return `${this.form.users_permissions_user.username || this.form.users_permissions_user.id}`;
      }
      return this.form.users_permissions_user;
    }
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get(`/verifactu-chains/${this.id}`);
        this.form = { ...response.data };
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error carregant dades: ${error.message}`,
          type: 'is-danger'
        });
      } finally {
        this.isLoading = false;
      }
    },
    async submit() {
      try {
        this.submitting = true;
        
        // Only send the state field
        await service({ requiresAuth: true }).put(`/verifactu-chains/${this.id}`, {
          state: this.form.state
        });
        
        this.$buefy.snackbar.open({
          message: 'Estat actualitzat correctament',
          queue: false
        });
        
        // Navigate back to list
        this.$router.push({ name: 'admin.verifactu-chain.list' });
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error guardant: ${(error.response && error.response.data && error.response.data.message) || error.message}`,
          type: 'is-danger',
          duration: 5000
        });
      } finally {
        this.submitting = false;
      }
    },
    cancel() {
      this.$router.push({ name: 'admin.verifactu-chain.list' });
    }
  }
};
</script>
