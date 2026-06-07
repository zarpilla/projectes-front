<template>
  <div>
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <section class="section is-main-section">
      <card-component title="Editar cua FACE">
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

          <b-field label="Número de registre" horizontal>
            <b-input v-model="form.registration_number" disabled />
          </b-field>

          <b-field label="Intents" horizontal>
            <b-input v-model="form.attempts" disabled />
          </b-field>

          <b-field label="Última comprovació" horizontal>
            <b-input :value="formatDate(form.last_status_check)" disabled />
          </b-field>

          <b-field label="Codi resposta" horizontal>
            <b-input v-model="form.response_code" disabled />
          </b-field>

          <b-field label="URL petició" horizontal>
            <b-input v-model="form.request_url" disabled />
          </b-field>

          <b-field label="Cos petició" horizontal>
            <b-input v-model="form.request_body" type="textarea" rows="3" disabled />
          </b-field>

          <b-field label="Cos resposta" horizontal>
            <b-input v-model="form.response_body" type="textarea" rows="3" disabled />
          </b-field>

          <hr />

          <!-- Editable status field -->
          <b-field label="Estat *" horizontal>
            <b-select v-model="form.status" required>
              <option value="pending">Pendent</option>
              <option value="registered">Registrada</option>
              <option value="delivered">Lliurada</option>
              <option value="rejected">Rebutjada</option>
              <option value="error">Error</option>
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
import moment from 'moment';

export default {
  name: 'FaceQueueForm',
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
        mode: null,
        status: null,
        registration_number: null,
        attempts: 0,
        last_status_check: null,
        response_code: null,
        request_url: null,
        request_body: null,
        response_body: null
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
    }
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get(`/face-queues/${this.id}`);
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
        
        // Only send the status field
        await service({ requiresAuth: true }).put(`/face-queues/${this.id}`, {
          status: this.form.status
        });
        
        this.$buefy.snackbar.open({
          message: 'Estat actualitzat correctament',
          queue: false
        });
        
        // Navigate back to list
        this.$router.push({ name: 'admin.face-queue.list' });
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
      this.$router.push({ name: 'admin.face-queue.list' });
    },
    formatDate(value) {
      if (!value) return '';
      return moment(value).format('DD/MM/YYYY HH:mm:ss');
    }
  }
};
</script>
