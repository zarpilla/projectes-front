<template>
  <div>
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <section class="section is-main-section">
      <!-- Verifactu Configuration -->
      <card-component title="CONFIGURACIÓ VERIFACTU">
        <form @submit.prevent="submit">
          <b-field label="Mode" horizontal>
            <b-select v-model="form.mode">
              <option value="no">No</option>
              <option value="test">Test</option>
              <option value="real">Real</option>
            </b-select>
          </b-field>

          <b-field label="Contrasenya certificat" horizontal>
            <b-message type="is-info" has-icon size="is-small">
              La contrasenya del certificat s'ha d'actualitzar a l'àrea d'administració del servidor (Strapi) per motius de seguretat.
            </b-message>
          </b-field>
        </form>
      </card-component>

      <!-- Software Information -->
      <card-component title="INFORMACIÓ DEL PROGRAMARI" class="mt-4">
        <form @submit.prevent="submit">
          <b-field label="Nom desenvolupador" horizontal>
            <b-input v-model="form.software_developerName" />
          </b-field>

          <b-field label="NIF desenvolupador" horizontal>
            <b-input v-model="form.software_developerIrsId" />
          </b-field>

          <b-field label="Nom programari" horizontal>
            <b-input v-model="form.software_name" />
          </b-field>

          <b-field label="ID programari" horizontal>
            <b-input v-model="form.software_id" />
          </b-field>

          <b-field label="Versió" horizontal>
            <b-input v-model="form.software_version" />
          </b-field>

          <b-field label="Número" horizontal>
            <b-input v-model="form.software_number" />
          </b-field>

          <b-field label="Ubicació" horizontal>
            <b-input v-model="form.software_location" />
          </b-field>

          <b-field label="Adreça" horizontal>
            <b-input v-model="form.software_address" />
          </b-field>

          <b-field label="Data" horizontal>
            <b-input v-model="form.software_date" />
          </b-field>

          <b-field label="Usa només Verifactu" horizontal>
            <b-switch v-model="form.software_useOnlyVerifactu" />
          </b-field>

          <b-field label="Ús múltiple" horizontal>
            <b-switch v-model="form.software_useMulti" />
          </b-field>

          <b-field label="Ús múltiple actual" horizontal>
            <b-switch v-model="form.software_useCurrentMulti" />
          </b-field>
        </form>
      </card-component>

      <!-- Save Button -->
      <card-component class="mt-4">
        <b-field horizontal>
          <b-button
            type="is-primary"
            :loading="submitting"
            @click="submit"
          >
            Guardar
          </b-button>
        </b-field>
      </card-component>
    </section>
  </div>
</template>

<script>
import service from '@/service/index';
import CardComponent from '@/components/CardComponent';

export default {
  name: 'VerifactuForm',
  components: {
    CardComponent
  },
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
