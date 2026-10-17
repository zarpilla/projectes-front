<template>
  <div>
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <!-- Redesign A: an index of the sections, the fields in a grid with what they
         are for, and a save bar. Same fields and saving as before. -->
    <section class="section is-main-section">
      <div class="config-layout">
        <nav class="config-index" aria-label="En aquesta pàgina">
          <p class="config-index-title">En aquesta pàgina</p>
          <a v-for="sec in sections" :key="sec.id" :href="'#' + sec.id" :class="{ 'is-active': activeSection === sec.id }" @click.prevent="goTo(sec.id)">{{ sec.label }}</a>
        </nav>

        <form class="config-forms" @submit.prevent="submit">
          <section id="cfg-entitat" class="form-box">
            <h2>Entitat</h2>
            <p class="form-box-sub">Surten a la capçalera de factures, pressupostos i comandes. Els camps amb * són obligatoris.</p>
            <div class="cfg-grid">
              <b-field label="Nom *" class="is-full"><b-input v-model="form.name" required /></b-field>
              <b-field label="NIF"><b-input v-model="form.nif" /></b-field>
              <b-field label="Telèfon"><b-input v-model="form.phone" /></b-field>
              <b-field label="Correu electrònic"><b-input v-model="form.email" type="email" /></b-field>
              <b-field label="Adreça" class="is-full"><b-input v-model="form.address" /></b-field>
              <b-field label="Codi postal"><b-input v-model="form.postcode" /></b-field>
              <b-field label="Població"><b-input v-model="form.city" /></b-field>
              <b-field label="Província"><b-input v-model="form.state" /></b-field>
              <b-field label="País"><b-input v-model="form.country" /></b-field>
              <b-field label="CCC" message="Codi de compte de cotització a la Seguretat Social."><b-input v-model="form.ccc" placeholder="Codi de compte de cotització" /></b-field>
              <b-field label="Calendari de l'entitat (iCal)" message="S'importa com a dedicació de totes les persones."><b-input v-model="form.ical" placeholder="https://…/calendari.ics" /></b-field>
              <b-field label="Adreça de l'aplicació" message="Es fa servir als enllaços dels correus que envia l'aplicació." class="is-full"><b-input v-model="form.front_url" /></b-field>
            </div>
          </section>

          <section id="cfg-logo" class="form-box">
            <h2>Logo</h2>
            <p class="form-box-sub">Surt a les factures, pressupostos i comandes impreses. Millor en PNG o JPG, amb fons transparent o blanc.</p>
            <div
              class="logo-drop"
              :class="{ 'is-over': logoDragOver }"
              @dragover.prevent="logoDragOver = true"
              @dragleave.prevent="logoDragOver = false"
              @drop.prevent="onLogoDrop"
            >
              <div class="logo-preview">
                <img v-if="logoUrl" :src="logoUrl" alt="Logo de l'entitat" @error="logoBroken = true" />
                <span v-else>Sense logo</span>
              </div>
              <div class="logo-text">
                <p v-if="logoBroken" class="has-text-danger">El fitxer del logo no es troba al servidor. Puja'l de nou (mentrestant els PDF surten sense logo).</p>
                <p>Arrossega una imatge aquí o <label class="logo-pick">tria-la<input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden @change="onLogoPick" /></label>.</p>
              </div>
              <b-button v-if="logo" size="is-small" class="is-danger is-outlined" :loading="logoSaving" @click="removeLogo">Treu el logo</b-button>
              <b-loading :is-full-page="false" v-model="logoSaving" />
            </div>
          </section>

          <section id="cfg-comptes" class="form-box">
            <h2>Comptes bancaris</h2>
            <p class="form-box-sub">Compte que es proposa per a cada tipus de moviment a Tresoreria, nòmines i bestretes.</p>
            <div class="cfg-grid">
              <b-field label="Compte per defecte">
                <b-select v-model="form.bank_account_default" :loading="loadingBankAccounts" expanded>
                  <option :value="null">Selecciona...</option>
                  <option v-for="account in bankAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
                </b-select>
              </b-field>
              <b-field label="Nòmines">
                <b-select v-model="form.bank_account_payroll" :loading="loadingBankAccounts" expanded>
                  <option :value="null">Selecciona...</option>
                  <option v-for="account in bankAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
                </b-select>
              </b-field>
              <b-field label="Seguretat Social">
                <b-select v-model="form.bank_account_ss" :loading="loadingBankAccounts" expanded>
                  <option :value="null">Selecciona...</option>
                  <option v-for="account in bankAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
                </b-select>
              </b-field>
              <b-field label="IRPF">
                <b-select v-model="form.bank_account_irpf" :loading="loadingBankAccounts" expanded>
                  <option :value="null">Selecciona...</option>
                  <option v-for="account in bankAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
                </b-select>
              </b-field>
              <b-field label="IVA">
                <b-select v-model="form.bank_account_vat" :loading="loadingBankAccounts" expanded>
                  <option :value="null">Selecciona...</option>
                  <option v-for="account in bankAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
                </b-select>
              </b-field>
            </div>
            <p class="cfg-note">
              {{ bankAccounts.length }} comptes{{ bankAccounts.length ? ": " + bankAccounts.map(a => a.name).join(", ") : "" }}
              <router-link to="/admin/bank-account">Gestiona els comptes →</router-link>
            </p>
          </section>

          <section id="cfg-facturacio" class="form-box">
            <h2>Facturació</h2>
            <p class="form-box-sub">Correu amb què s'envien les factures a les clientes.</p>
            <div class="cfg-grid">
              <b-field label="Correu des del qual s'envien"><b-input v-model="form.invoice_email" type="email" /></b-field>
              <b-field label="Assumpte del correu" class="is-wide"><b-input v-model="form.invoice_subject" /></b-field>
              <b-field label="Plantilla del correu" class="is-full"><b-input v-model="form.invoice_template" type="textarea" rows="4" placeholder="Text del correu que acompanya la factura en PDF" /></b-field>
            </div>
            <p class="cfg-note">Les sèries de numeració es gestionen a part. <router-link to="/admin/serie">Gestiona les sèries →</router-link></p>
          </section>

          <section id="cfg-face" class="form-box">
            <h2>Factura electrònica (FACe)</h2>
            <p class="form-box-sub">Enviament de factures a les administracions públiques.</p>
            <div class="cfg-grid">
              <b-field label="FACe">
                <b-select v-model="form.face" expanded>
                  <option value="no">No</option>
                  <option value="test">Test</option>
                  <option value="real">Real</option>
                </b-select>
              </b-field>
              <b-field label="Format de factura">
                <b-select v-model="form.face_invoice_format" expanded>
                  <option value="ubl">UBL</option>
                  <option value="facturae">FacturaE</option>
                </b-select>
              </b-field>
              <b-field label="Endpoint de test" class="is-full"><b-input v-model="form.face_test_endpoint" /></b-field>
              <b-field label="Endpoint real" class="is-full"><b-input v-model="form.face_real_endpoint" /></b-field>
            </div>
            <p class="cfg-note">La contrasenya del certificat FACe s'actualitza a l'àrea d'administració del servidor, per seguretat.</p>
          </section>

          <section id="cfg-peus" class="form-box">
            <h2>Textos de peu</h2>
            <p class="form-box-sub">Text fix al final de cada document, per exemple les dades per pagar per transferència.</p>
            <div class="cfg-grid is-two">
              <b-field label="Peu de les factures" class="is-full"><b-input v-model="form.invoice_footer" type="textarea" rows="3" /></b-field>
              <b-field label="Peu dels pressupostos"><b-input v-model="form.quote_footer" type="textarea" rows="3" /></b-field>
              <b-field label="Peu de les comandes"><b-input v-model="form.order_footer" type="textarea" rows="3" /></b-field>
            </div>
          </section>

          <section id="cfg-contacte" class="form-box">
            <h2>Formulari de contacte</h2>
            <p class="form-box-sub">El formulari públic per demanar informació.</p>
            <div class="cfg-grid is-two">
              <b-field label="Correu que rep els missatges" class="is-full"><b-input v-model="form.contact_form_email" type="email" /></b-field>
              <b-field label="Text del formulari"><b-input v-model="form.contact_form_text" type="textarea" rows="3" placeholder="Text que es mostra a sobre del formulari" /></b-field>
              <b-field label="Missatge d'agraïment"><b-input v-model="form.contact_form_thankyou" type="textarea" rows="3" placeholder="Es mostra en enviar el formulari" /></b-field>
            </div>
          </section>

          <section id="cfg-opcions" class="form-box">
            <h2>Opcions</h2>
            <label class="option-row">
              <b-checkbox v-model="form.pdf_invoice_parser">
                <b>Omple dades a partir de PDF</b>
                <small>Mostra el botó «Omple dades a partir de PDF» a les factures i despeses rebudes. El PDF s'envia a un servei extern per llegir-ne les dades: activa-ho només si hi confieu.</small>
              </b-checkbox>
            </label>
            <label class="option-row">
              <b-checkbox v-model="form.task_emails">
                <b>Avisos de tasques per correu</b>
                <small>Cada matí, un correu a cada persona amb les seves tasques vençudes i les que li han assignat. Desactiva-ho perquè no se n'enviï cap.</small>
              </b-checkbox>
            </label>
          </section>
        </form>
      </div>
    </section>

    <div class="savebar">
      <span class="savebar-state">Configuració de l'entitat</span>
      <b-button type="is-primary" :loading="submitting" @click="submit">Guardar</b-button>
    </div>
  </div>
</template>

<script>
import service from '@/service/index';
import getConfig from '@/config';
import CardComponent from '@/components/CardComponent.vue';

export default {
  name: 'MeForm',
  components: {
    CardComponent
  },
  data() {
    return {
      logo: null,
      logoBroken: false,
      logoSaving: false,
      logoDragOver: false,
      activeSection: "cfg-entitat",
      sections: [
        { id: "cfg-entitat", label: "Entitat" },
        { id: "cfg-logo", label: "Logo" },
        { id: "cfg-comptes", label: "Comptes bancaris" },
        { id: "cfg-facturacio", label: "Facturació" },
        { id: "cfg-face", label: "FACe" },
        { id: "cfg-peus", label: "Textos de peu" },
        { id: "cfg-contacte", label: "Formulari de contacte" },
        { id: "cfg-opcions", label: "Opcions" }
      ],
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
        bank_account_vat: null,
        pdf_invoice_parser: true,
        task_emails: true
      },
      bankAccounts: [],
      loadingBankAccounts: false
    };
  },
  async mounted() {
    await this.loadBankAccounts();
    await this.loadData();
  },
  computed: {
    logoUrl() {
      return this.logo && this.logo.url ? getConfig().VUE_APP_API_URL + this.logo.url : null;
    }
  },
  methods: {
    onLogoPick(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) this.uploadLogo(file);
    },
    onLogoDrop(e) {
      this.logoDragOver = false;
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) this.uploadLogo(file);
    },
    // upload the image, then point the settings' logo to it (Guardar doesn't send logo)
    async uploadLogo(file) {
      if (!/^image\//.test(file.type)) {
        this.$buefy.toast.open({ message: "El logo ha de ser una imatge (PNG, JPG o SVG)", type: "is-danger" });
        return;
      }
      this.logoSaving = true;
      try {
        const formData = new FormData();
        formData.append('files', file, file.name);
        const uploaded = (await service({ requiresAuth: true, multipart: true }).post('upload', formData)).data;
        const image = Array.isArray(uploaded) ? uploaded[0] : uploaded;
        await service({ requiresAuth: true }).put('/me', { logo: image.id });
        this.logo = image;
        this.logoBroken = false;
        this.$buefy.snackbar.open({ message: 'Logo actualitzat', queue: false });
      } catch (error) {
        this.$buefy.toast.open({ message: `No s'ha pogut pujar el logo: ${error.message}`, type: 'is-danger' });
      } finally {
        this.logoSaving = false;
      }
    },
    async removeLogo() {
      this.logoSaving = true;
      try {
        await service({ requiresAuth: true }).put('/me', { logo: null });
        this.logo = null;
        this.logoBroken = false;
        this.$buefy.snackbar.open({ message: 'Logo tret', queue: false });
      } catch (error) {
        this.$buefy.toast.open({ message: `No s'ha pogut treure el logo: ${error.message}`, type: 'is-danger' });
      } finally {
        this.logoSaving = false;
      }
    },
    goTo(id) {
      const el = document.getElementById(id);
      if (el) {
        this.activeSection = id;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
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
        this.logo = response.data.logo || null;
        this.logoBroken = false;
        
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
        // empty (saved before the option existed) means on, as the server reads it
        this.form.task_emails = response.data.task_emails !== false;
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
        
        if (!String(this.form.name || '').trim()) {
          this.$buefy.toast.open({ message: "Cal el nom de l'entitat", type: 'is-danger' });
          return;
        }
        // Every field, a cleared one as null: skipping the empty ones meant a
        // field (or a bank account set back to «Selecciona…») could never be
        // emptied (issues/080)
        const data = {};
        Object.keys(this.form).forEach(key => {
          const value = this.form[key];
          data[key] = value === '' || value === undefined ? null : value;
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
<style scoped>
.config-layout {
  display: grid;
  grid-template-columns: 12rem minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
  padding-bottom: 4rem;
}
.config-index {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.config-index-title {
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--a-muted);
  padding: 0 .625rem .375rem;
}
.config-index a {
  padding: .375rem .625rem;
  border-radius: 8px;
  font-size: .875rem;
  font-weight: 600;
  color: var(--a-fg-2);
}
.config-index a:hover {
  background: var(--a-chip);
}
.config-index a.is-active {
  background: var(--a-accent-soft);
  color: var(--a-accent);
  font-weight: 800;
}
.form-box {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  scroll-margin-top: 1rem;
}
.form-box h2 {
  font-size: 1.125rem;
  font-weight: 800;
}
.form-box-sub {
  color: var(--a-fg-2);
  font-size: .875rem;
  margin-bottom: 1rem;
}
.cfg-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .25rem 1.25rem;
}
.cfg-grid .is-full {
  grid-column: 1 / -1;
}
.cfg-grid .is-wide {
  grid-column: span 2;
}
.cfg-grid.is-two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.logo-drop {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px dashed var(--a-input);
  border-radius: 10px;
}
.logo-drop.is-over {
  border-color: var(--a-accent);
  background: var(--a-accent-soft);
}
.logo-preview {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 9rem;
  height: 4.5rem;
  border-radius: 8px;
  background: var(--a-thead);
  font-size: .8125rem;
  color: var(--a-muted);
  overflow: hidden;
}
.logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.logo-text {
  flex: 1;
  font-size: .875rem;
  color: var(--a-fg-2);
}
.logo-pick {
  color: var(--a-accent);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
.cfg-note {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: .75rem;
  padding: .625rem .875rem;
  border-radius: 8px;
  background: var(--a-thead);
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.cfg-note a {
  font-weight: 700;
  text-decoration: underline;
}
.option-row small {
  display: block;
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.savebar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .875rem 2rem;
  background: var(--a-surface);
  border-top: 1px solid var(--a-line);
  box-shadow: 0 -6px 16px rgba(16, 32, 30, .06);
}
.savebar-state {
  margin-right: auto;
  font-weight: 700;
  color: var(--a-muted);
}
@media screen and (max-width: 1023px) {
  .config-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .config-index {
    display: none;
  }
  .cfg-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .cfg-grid .is-wide {
    grid-column: auto;
  }
}
</style>
