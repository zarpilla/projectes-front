<template>
  <!-- Redesign A: the sending mode, then the software data of the declaration -->
  <div>
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <section class="section is-main-section verifactu-config">
      <form @submit.prevent="submit">
        <section class="a-box">
          <header class="box-head"><h2>Enviament a l'AEAT</h2></header>
          <div class="a-form">
            <b-field label="Mode" message="«Test» envia les factures a l'entorn de proves de l'AEAT; «Real», a l'entorn de producció.">
              <b-select v-model="form.mode">
                <option value="no">No s'envien</option>
                <option value="test">Test</option>
                <option value="real">Real</option>
              </b-select>
            </b-field>
            <certificate-card kind="verifactu" title="Certificat de l'AEAT" class="full" />
          </div>
        </section>

        <section class="a-box">
          <header class="box-head">
            <h2>Informació del programari</h2>
            <span class="box-hint">Surt a la declaració responsable</span>
          </header>
          <div class="a-form is-compact">
            <b-field label="Nom desenvolupador">
              <b-input v-model="form.software_developerName" />
            </b-field>
            <b-field label="NIF desenvolupador">
              <b-input v-model="form.software_developerIrsId" />
            </b-field>
            <b-field label="Nom programari">
              <b-input v-model="form.software_name" />
            </b-field>
            <b-field label="ID programari">
              <b-input v-model="form.software_id" />
            </b-field>
            <b-field label="Versió">
              <b-input v-model="form.software_version" />
            </b-field>
            <b-field label="Número">
              <b-input v-model="form.software_number" />
            </b-field>
            <b-field label="Ubicació">
              <b-input v-model="form.software_location" />
            </b-field>
            <b-field label="Data">
              <b-input v-model="form.software_date" />
            </b-field>
            <b-field label="Adreça" class="full">
              <b-input v-model="form.software_address" />
            </b-field>
            <div class="full verifactu-switches">
              <b-switch v-model="form.software_useOnlyVerifactu">Usa només Verifactu</b-switch>
              <b-switch v-model="form.software_useMulti">Ús múltiple</b-switch>
              <b-switch v-model="form.software_useCurrentMulti">Ús múltiple actual</b-switch>
            </div>
          </div>
        </section>

        <div class="verifactu-actions">
          <b-button type="is-primary" native-type="submit" :loading="submitting">Guardar</b-button>
        </div>
      </form>
    </section>
  </div>
</template>

<script>
import service from '@/service/index';
import CertificateCard from '@/components/CertificateCard.vue';

export default {
  name: 'VerifactuForm',
  components: { CertificateCard },
  data() {
    return {
      isLoading: false,
      submitting: false,
      form: {
        mode: 'no',
        software_developerName: '',
        software_developerIrsId: '',
        software_name: '',
        software_id: '',
        software_version: '',
        software_number: '',
        software_useOnlyVerifactu: false,
        software_useMulti: false,
        software_useCurrentMulti: false,
        software_address: '',
        software_date: '',
        software_location: ''
      }
    };
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get('/verifactu');
        
        // Merge response data with form
        if (response.data) {
          Object.keys(this.form).forEach(key => {
            if (response.data[key] !== undefined && response.data[key] !== null) {
              this.form[key] = response.data[key];
            }
          });
        }
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
        
        // Prepare data - only send non-null values
        const data = {};
        Object.keys(this.form).forEach(key => {
          if (this.form[key] !== null && this.form[key] !== '' && this.form[key] !== undefined) {
            data[key] = this.form[key];
          }
        });
        
        await service({ requiresAuth: true }).put('/verifactu', data);
        
        this.$buefy.snackbar.open({
          message: 'Guardat correctament',
          queue: false
        });
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error guardant: ${(error.response && error.response.data && error.response.data.message) || error.message}`,
          type: 'is-danger',
          duration: 5000
        });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style scoped>
.verifactu-config .a-box + .a-box {
  margin-top: 1rem;
}
.verifactu-switches {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem 2rem;
}
.verifactu-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
