<template>
  <div>
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <section class="section is-main-section">
      <!-- Basic Information -->
      <card-component title="INFORMACIÓ BÀSICA">
        <form @submit.prevent="submit">
          <b-field label="Nom *" horizontal>
            <b-input v-model="form.name" required />
          </b-field>

          <b-field label="NIF" horizontal>
            <b-input v-model="form.nif" />
          </b-field>

          <b-field label="Telèfon" horizontal>
            <b-input v-model="form.phone" />
          </b-field>

          <b-field label="Email" horizontal>
            <b-input v-model="form.email" type="email" />
          </b-field>

          <b-field label="Adreça" horizontal>
            <b-input v-model="form.address" />
          </b-field>

          <b-field label="Població" horizontal>
            <b-input v-model="form.city" />
          </b-field>

          <b-field label="Codi Postal" horizontal>
            <b-input v-model="form.postcode" />
          </b-field>

          <b-field label="Província" horizontal>
            <b-input v-model="form.state" />
          </b-field>

          <b-field label="País" horizontal>
            <b-input v-model="form.country" />
          </b-field>

          <b-field label="CCC" horizontal>
            <b-input v-model="form.ccc" />
          </b-field>

          <b-field label="iCal URL" horizontal>
            <b-input v-model="form.ical" />
          </b-field>

          <b-field label="URL Frontend" horizontal>
            <b-input v-model="form.front_url" />
          </b-field>
        </form>
      </card-component>

      <!-- Bank Accounts -->
      <card-component title="COMPTES BANCARIS" class="mt-4">
        <form @submit.prevent="submit">
          <b-field label="Compte per defecte" horizontal>
            <b-select v-model="form.bank_account_default" :loading="loadingBankAccounts">
              <option :value="null">Selecciona...</option>
              <option v-for="account in bankAccounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </option>
            </b-select>
          </b-field>

          <b-field label="Compte nòmines" horizontal>
            <b-select v-model="form.bank_account_payroll" :loading="loadingBankAccounts">
              <option :value="null">Selecciona...</option>
              <option v-for="account in bankAccounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </option>
            </b-select>
          </b-field>

          <b-field label="Compte Seguretat Social" horizontal>
            <b-select v-model="form.bank_account_ss" :loading="loadingBankAccounts">
              <option :value="null">Selecciona...</option>
              <option v-for="account in bankAccounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </option>
            </b-select>
          </b-field>

          <b-field label="Compte IRPF" horizontal>
            <b-select v-model="form.bank_account_irpf" :loading="loadingBankAccounts">
              <option :value="null">Selecciona...</option>
              <option v-for="account in bankAccounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </option>
            </b-select>
          </b-field>

          <b-field label="Compte IVA" horizontal>
            <b-select v-model="form.bank_account_vat" :loading="loadingBankAccounts">
              <option :value="null">Selecciona...</option>
              <option v-for="account in bankAccounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </option>
            </b-select>
          </b-field>
        </form>
      </card-component>

      <!-- Footer Texts -->
      <card-component title="TEXTOS DE PEU" class="mt-4">
        <form @submit.prevent="submit">
          <b-field label="Peu pressupostos" horizontal>
            <b-input v-model="form.quote_footer" type="textarea" rows="3" />
          </b-field>

          <b-field label="Peu factures" horizontal>
            <b-input v-model="form.invoice_footer" type="textarea" rows="3" />
          </b-field>

          <b-field label="Peu comandes" horizontal>
            <b-input v-model="form.order_footer" type="textarea" rows="3" />
          </b-field>
        </form>
      </card-component>

      <!-- Invoice Email Settings -->
      <card-component title="CONFIGURACIÓ EMAIL FACTURES" class="mt-4">
        <form @submit.prevent="submit">
          <b-field label="Email factures" horizontal>
            <b-input v-model="form.invoice_email" type="email" />
          </b-field>

          <b-field label="Assumpte email" horizontal>
            <b-input v-model="form.invoice_subject" />
          </b-field>

          <b-field label="Plantilla email" horizontal>
            <b-input v-model="form.invoice_template" type="textarea" rows="5" />
          </b-field>
        </form>
      </card-component>

      <!-- FACE Settings -->
      <card-component title="CONFIGURACIÓ FACE" class="mt-4">
        <form @submit.prevent="submit">
          <b-field label="FACE" horizontal>
            <b-select v-model="form.face">
              <option value="no">No</option>
              <option value="test">Test</option>
              <option value="real">Real</option>
            </b-select>
          </b-field>

          <b-field label="Contrasenya certificat FACE" horizontal>
            <b-message type="is-info" has-icon size="is-small">
              La contrasenya del certificat FACE s'ha d'actualitzar a l'àrea d'administració del servidor per motius de seguretat.
            </b-message>
          </b-field>

          <b-field label="Endpoint FACE test" horizontal>
            <b-input v-model="form.face_test_endpoint" />
          </b-field>

          <b-field label="Endpoint FACE real" horizontal>
            <b-input v-model="form.face_real_endpoint" />
          </b-field>

          <b-field label="Format factura FACE" horizontal>
            <b-select v-model="form.face_invoice_format">
              <option value="ubl">UBL</option>
              <option value="facturae">FacturaE</option>
            </b-select>
          </b-field>
        </form>
      </card-component>

      <!-- Contact Form Settings -->
      <card-component title="FORMULARI DE CONTACTE" class="mt-4">
        <form @submit.prevent="submit">
          <b-field label="Email formulari contacte" horizontal>
            <b-input v-model="form.contact_form_email" type="email" />
          </b-field>

          <b-field label="Text formulari" horizontal>
            <b-input v-model="form.contact_form_text" type="textarea" rows="5" />
          </b-field>

          <b-field label="Missatge gràcies" horizontal>
            <b-input v-model="form.contact_form_thankyou" type="textarea" rows="3" />
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
  name: 'MeForm',
  components: {
    CardComponent
  },
  data() {
    return {
      isLoading: false,
      submitting: false,
      form: {
        name: '',
        nif: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        postcode: '',
        country: '',
        state: '',
        ccc: '',
        ical: '',
        front_url: '',
        quote_footer: '',
        invoice_footer: '',
        order_footer: '',
        invoice_email: '',
        invoice_subject: '',
        invoice_template: '',
        face: 'no',
        face_test_endpoint: '',
        face_real_endpoint: '',
        face_invoice_format: 'facturae',
        contact_form_email: '',
        contact_form_text: '',
        contact_form_thankyou: '',
        bank_account_default: null,
        bank_account_payroll: null,
        bank_account_ss: null,
        bank_account_irpf: null,
        bank_account_vat: null
      },
      bankAccounts: [],
      loadingBankAccounts: false
    };
  },
  async mounted() {
    await this.loadBankAccounts();
    await this.loadData();
  },
  methods: {
    async loadBankAccounts() {
      try {
        this.loadingBankAccounts = true;
        const response = await service({ requiresAuth: true }).get('/bank-accounts?_limit=-1&_sort=name:ASC');
        this.bankAccounts = response.data;
      } catch (error) {
        console.error('Error loading bank accounts:', error);
      } finally {
        this.loadingBankAccounts = false;
      }
    },
    async loadData() {
      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get('/me');
        
        // Merge response data with form, extracting IDs from relations
        Object.keys(this.form).forEach(key => {
          if (response.data[key] !== undefined) {
            // If it's a relation and it's an object, extract the ID
            if (key.startsWith('bank_account_') && response.data[key] && typeof response.data[key] === 'object') {
              this.form[key] = response.data[key].id;
            } else {
              this.form[key] = response.data[key];
            }
          }
        });
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
        
        await service({ requiresAuth: true }).put('/me', data);
        
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
