<template>
  <div>
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <!-- Redesign A: an index of the sections, the fields in a grid with what they
         are for, and a save bar. Same fields and saving as before. -->
    <section class="section is-main-section">
      <div class="config-layout">
        <nav class="config-index" aria-label="En aquesta pàgina">
          <p class="config-index-title">En aquesta pàgina</p>
          <a v-for="sec in indexSections" :key="sec.id" :href="'#' + sec.id" :class="{ 'is-active': activeSection === sec.id }" @click.prevent="goTo(sec.id)">{{ sec.label }}</a>
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
              <b-field label="Adreça de l'aplicació" message="Es fa servir als enllaços dels correus, als codis QR de les comandes i als enllaços dels pressupostos." class="is-full"><b-input v-model="form.front_url" placeholder="https://…/" /></b-field>
              <!-- issues/346: the server runs in UTC; days and hour limits follow this zone -->
              <b-field label="Zona horària" message="Per saber quin dia és una data i per a les hores límit de les comandes. Per defecte, Europe/Andorra.">
                <b-select v-model="form.time_zone" expanded data-test="time-zone">
                  <option :value="null">Europe/Andorra</option>
                  <option v-for="zone in timeZones" :key="zone" :value="zone">{{ zone }}</option>
                </b-select>
              </b-field>
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
              <router-link to="/administracio/comptes-bancaris">Gestiona els comptes →</router-link>
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
            <p class="cfg-note">Les sèries de numeració es gestionen a part. <router-link to="/administracio/series">Gestiona les sèries →</router-link></p>
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
            <certificate-card kind="face" title="Certificat de FACe" style="margin-top: .75rem" />
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

          <!-- the entity options that could only be set on the server (issues/139) -->
          <section id="cfg-projectes" class="form-box">
            <h2>Projectes</h2>
            <p class="form-box-sub">Què es mostra als projectes i com es compta l'IVA.</p>
            <label class="option-row">
              <b-checkbox v-model="form.options.structuralExpenses">
                <b>Despesa indirecta als projectes</b>
                <small>Mostra el camp «Despesa Indirecta (%)» a les dades de cada projecte, per aplicar-hi un percentatge de despeses d'estructura.</small>
              </b-checkbox>
            </label>
            <label class="option-row">
              <b-checkbox v-model="form.options.treasury">
                <b>Lligar el pressupost amb les factures</b>
                <small>Mostra a les línies del pressupost d'execució les columnes «Fact.» i «Doc» (la factura que paga cada línia) i «Compte», el compte bancari previst.</small>
              </b-checkbox>
            </label>
            <label class="option-row">
              <b-checkbox v-model="form.options.userHasCostByHour">
                <b>Cost/hora a la planificació</b>
                <small>Mostra el cost per hora de la persona a la finestra «Planificació» del Gantt.</small>
              </b-checkbox>
            </label>
            <label class="option-row">
              <b-checkbox v-model="form.options.showEstimatedHoursInPhases">
                <b>Gantt sense les línies d'ingrés</b>
                <small>La pestanya Planificació s'obre amb «Línies d'ingrés» desmarcat: les dedicacions surten directament a sota de cada fase.</small>
              </b-checkbox>
            </label>
            <div class="cfg-grid">
              <b-field label="% IVA deduïble" message="La prorrata: la part de l'IVA suportat que es pot descomptar. Cada any en pot tenir un de propi a Taules auxiliars › Anys, que és el que es fa servir en saldar l'IVA i a la tresoreria d'aquell any.">
                <b-input v-model.number="form.options.deductible_vat_pct" type="number" step="0.01" min="0" max="100" />
              </b-field>
              <b-field label="Inici de l'any fiscal" message="Els imports de la fitxa de projecte i dels informes econòmics s'agrupen per aquest any. L'IVA, les sèries de factura, les nòmines i les hores continuen per any natural.">
                <b-select v-model.number="fiscalStartMonth" expanded>
                  <option v-for="(name, i) in fiscalMonths" :key="i" :value="i + 1">{{ name }}</option>
                </b-select>
              </b-field>
              <!-- issues/371 -->
              <b-field label="Facturació dels projectes nous" message="«Per hores»: l'ingrés previst són les hores previstes pel preu/hora del projecte, i es mostra el que queda per facturar. Cada projecte ho pot canviar.">
                <b-select v-model="defaultBillingMode" expanded>
                  <option value="project">Per projecte</option>
                  <option value="hours">Per hores</option>
                </b-select>
              </b-field>
            </div>
            <label v-if="fiscalStartMonth > 1" class="option-row">
              <b-checkbox v-model="form.options.grantable_fiscal_years">
                <b>Els anys de subvenció són anys fiscals</b>
                <small>Els imports a justificar de cada any (Subvencions i Justificacions) es comparen amb el que s'ha fet de {{ fiscalMonths[fiscalStartMonth - 1].toLowerCase() }} a {{ fiscalMonths[(fiscalStartMonth + 10) % 12].toLowerCase() }}. Desmarcat, amb el de gener a desembre.</small>
              </b-checkbox>
            </label>
            <p v-if="fiscalStartMonth !== savedFiscalStartMonth && savedFiscalStartMonth !== null" class="help is-warning">
              Canviar l'inici de l'any fiscal reagrupa tots els imports per anys. Les periodificacions i els anys de subvenció ja desats conserven el seu any.
            </p>
          </section>

          <section id="cfg-persones" class="form-box">
            <h2>Persones i dietes</h2>
            <p class="form-box-sub">Valors que es proposen en crear un període de jornada a Persones (es poden canviar a cada període) i les tarifes de les dietes.</p>
            <table class="table cfg-ss">
              <thead>
                <tr><th></th><th>Treballadora autònoma</th><th>Règim general</th></tr>
              </thead>
              <tbody>
                <tr v-for="f in ssFields" :key="f.key">
                  <th scope="row">{{ f.label }}</th>
                  <td><b-input v-model.number="form.quotes['autonoma_' + f.key]" type="number" step="0.01" :aria-label="f.label + ' (autònoma)'" /></td>
                  <td><b-input v-model.number="form.quotes['general_' + f.key]" type="number" step="0.01" :aria-label="f.label + ' (règim general)'" /></td>
                </tr>
              </tbody>
            </table>
            <div class="cfg-grid">
              <b-field label="Dieta: import per km" message="El que es paga per cada quilòmetre («Nova dieta», a Despeses).">
                <b-input v-model.number="form.quotes.diet_amount_total" type="number" step="0.0001" />
              </b-field>
              <b-field label="Dieta: part sense IRPF per km" message="La part de l'import per km que no porta retenció; la resta va amb l'IRPF de la persona.">
                <b-input v-model.number="form.quotes.diet_amount_without_irpf" type="number" step="0.0001" />
              </b-field>
            </div>
          </section>

          <section v-if="logistics" id="cfg-logistica" class="form-box">
            <h2>Logística</h2>
            <p class="form-box-sub">Les tarifes de les rutes es gestionen a part. <router-link to="/administracio/tarifes-ruta">Tarifes de ruta →</router-link></p>
            <div class="cfg-grid">
              <b-field label="Descompte multientrega (%)" message="Quan una sòcia té més d'una comanda per al mateix punt d'entrega i dia.">
                <b-input v-model.number="form.orders_options.multidelivery_discount" type="number" step="0.01" min="0" max="100" />
              </b-field>
              <b-field label="Hora límit per a l'endemà" message="Les comandes fetes després d'aquesta hora van tard per al següent dia laborable. Divendres tanca les de dilluns (o dissabte, si és laborable).">
                <b-input v-model.number="form.orders_options.next_day_limit_hour" type="number" step="1" min="0" max="23" />
              </b-field>
              <b-field label="Dies laborables" message="L'hora límit d'una entrega és la del dia laborable anterior. Sense cap dia marcat: de dilluns a divendres.">
                <div class="working-days">
                  <b-checkbox v-for="d in weekdayOptions" :key="d.value" v-model="workingDays" :native-value="d.value">{{ d.label }}</b-checkbox>
                </div>
              </b-field>
              <!-- late orders and pickups (issues/315) -->
              <b-field label="Hora límit de les recollides de tarda" message="Una recollida d'una «Ruta de tarda» (Rutes) informada el mateix dia a partir d'aquesta hora va tard. Les de les altres rutes van tard a partir de l'hora límit del dia laborable anterior.">
                <b-input v-model.number="form.orders_options.pickup_same_day_limit_hour" type="number" step="1" min="0" max="23" placeholder="10" />
              </b-field>
              <b-field label="Recàrrec de les comandes fora de temps (%)" message="Una comanda per a l'endemà informada després de l'hora límit es marca en vermell, l'albarà porta un triangle d'avís i aquest recàrrec (0: sense recàrrec). Coordinació el pot treure a la comanda («Recàrrec per incidència»).">
                <b-input v-model.number="form.orders_options.late_surcharge" type="number" step="0.01" min="0" max="1000" placeholder="25" />
              </b-field>
              <b-field label="Missatge de les comandes fora de temps" class="is-full" message="Surt a la sòcia abans de desar una comanda fora de temps. {hora} l'hora límit per a l'endemà, {recarrec} el recàrrec. Buit: el text de sempre (el de l'exemple).">
                <b-input v-model="form.orders_options.late_order_message" type="textarea" rows="4" :placeholder="defaultLateOrderMessage" />
              </b-field>
              <b-field label="Missatge de les recollides fora de temps" class="is-full" message="Surt a la sòcia abans de desar una comanda amb una recollida fora de temps (sense recàrrec). {hora} l'hora límit per a l'endemà, {hora_tarda} la de les recollides de tarda. Buit: el text de sempre.">
                <b-input v-model="form.orders_options.late_pickup_message" type="textarea" rows="4" :placeholder="defaultLatePickupMessage" />
              </b-field>
              <!-- issues/312 -->
              <b-field label="Concepte de les factures de comandes" message="Surt al PDF de les factures que crea «Facturar». Amb el mes de les comandes: {Mes} Octubre, {mes} octubre, {MES} OCTUBRE, {mm} 10, {any} 2026. «Serveis logístics_{Mes}_{any}» dona «Serveis logístics_Octubre_2026». Buit: sense concepte.">
                <b-input v-model="form.orders_options.invoice_concept" placeholder="Serveis logístics_{Mes}_{any}" maxlength="200" />
              </b-field>
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
              <b-checkbox v-model="showTasksInGantt">
                <b>Mostra les tasques al Gantt dels projectes</b>
                <small>A la pestanya Planificació de cada projecte, les tasques amb data surten al final del Gantt: com una barra si tenen data d'inici i data límit, o com un punt si només tenen data límit.</small>
              </b-checkbox>
            </label>
            <label class="option-row">
              <b-checkbox v-model="form.task_emails">
                <b>Avisos de tasques per correu</b>
                <small>Cada matí, un correu a cada persona amb les seves tasques vençudes i les que li han assignat. Desactiva-ho perquè no se n'enviï cap.</small>
              </b-checkbox>
            </label>
          </section>

          <!-- the external services' addresses and keys, set until now only in the Strapi admin (issues/159) -->
          <section id="cfg-integracions" class="form-box">
            <h2>Integracions</h2>
            <p class="form-box-sub">Serveis externs que fa servir l'aplicació. Les claus no es tornen a mostrar mai: escriu-ne una de nova només per canviar-la.</p>
            <div class="cfg-grid is-two">
              <b-field label="Directori DIR3: adreça" message="Per buscar els codis DIR3 de les administracions públiques (FACe).">
                <b-input v-model="form.dir3_api_url" placeholder="https://dir3.esstrapis.org" />
              </b-field>
              <b-field label="Directori DIR3: clau" :message="tokenSet.dir3_api_token ? 'Configurada. Deixa-ho buit per mantenir-la.' : 'Sense clau.'">
                <b-input v-model="tokens.dir3_api_token" type="password" autocomplete="new-password" password-reveal />
              </b-field>
              <b-field label="Lector de PDF: adreça" message="El servei de «Omple dades a partir de PDF».">
                <b-input v-model="form.invoice_parser_api_url" placeholder="https://invoice-parser-api.esstrapis.org" />
              </b-field>
              <b-field label="Lector de PDF: clau" :message="tokenSet.invoice_parser_api_token ? 'Configurada. Deixa-ho buit per mantenir-la.' : 'Sense clau.'">
                <b-input v-model="tokens.invoice_parser_api_token" type="password" autocomplete="new-password" password-reveal />
              </b-field>
            </div>
            <!-- Google Calendar → hours (Hores dedicades › importar), issues/159 -->
            <certificate-card kind="google" title="Calendari de Google: clau del compte de servei" style="margin-top: .75rem" />
          </section>

          <!-- the server's read cache: what it keeps, and emptying it (issues/307) -->
          <section id="cfg-memoria" class="form-box">
            <h2>Memòria cau</h2>
            <read-cache-card />
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
import CertificateCard from '@/components/CertificateCard.vue';
import ReadCacheCard from '@/components/ReadCacheCard.vue';
import { DEFAULT_LATE_ORDER_MESSAGE, DEFAULT_LATE_PICKUP_MESSAGE, workingDaysOf } from '@/domain/lateOrders';

// the settings components of `me` edited here (issues/139)
const COMPONENTS = ['options', 'quotes', 'orders_options'];

export default {
  name: 'MeForm',
  components: {
    CardComponent,
    CertificateCard,
    ReadCacheCard
  },
  data() {
    return {
      logo: null,
      defaultLateOrderMessage: DEFAULT_LATE_ORDER_MESSAGE,
      defaultLatePickupMessage: DEFAULT_LATE_PICKUP_MESSAGE,
      weekdayOptions: [
        { value: 'monday', label: 'Dl' },
        { value: 'tuesday', label: 'Dt' },
        { value: 'wednesday', label: 'Dc' },
        { value: 'thursday', label: 'Dj' },
        { value: 'friday', label: 'Dv' },
        { value: 'saturday', label: 'Ds' },
        { value: 'sunday', label: 'Dg' }
      ],
      logoBroken: false,
      logoSaving: false,
      logoDragOver: false,
      activeSection: "cfg-entitat",
      fiscalMonths: ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'],
      savedFiscalStartMonth: null,
      sections: [
        { id: "cfg-entitat", label: "Entitat" },
        { id: "cfg-logo", label: "Logo" },
        { id: "cfg-comptes", label: "Comptes bancaris" },
        { id: "cfg-facturacio", label: "Facturació" },
        { id: "cfg-face", label: "FACe" },
        { id: "cfg-peus", label: "Textos de peu" },
        { id: "cfg-contacte", label: "Formulari de contacte" },
        { id: "cfg-projectes", label: "Projectes" },
        { id: "cfg-persones", label: "Persones i dietes" },
        { id: "cfg-logistica", label: "Logística", logistics: true },
        { id: "cfg-opcions", label: "Opcions" },
        { id: "cfg-integracions", label: "Integracions" },
        { id: "cfg-memoria", label: "Memòria cau" }
      ],
      ssFields: [
        { key: "quota", label: "Quota fixa (€)" },
        { key: "pct_quota", label: "Quota (%)" },
        { key: "pct_irpf", label: "% IRPF" },
        { key: "pct_other", label: "% Altres" }
      ],
      // the Logística block, for entities with logistics (people with a logistics permission)
      logistics: false,
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
        time_zone: null,
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
        task_emails: true,
        dir3_api_url: '',
        invoice_parser_api_url: '',
        // the settings components (options, Seguretat Social and diets, logistics):
        // sent back whole, with their id, so nothing else in them is lost
        options: {},
        quotes: {},
        orders_options: {}
      },
      // write-only keys: sent only when typed; the API only says whether each is set
      tokens: { dir3_api_token: '', invoice_parser_api_token: '' },
      tokenSet: { dir3_api_token: false, invoice_parser_api_token: false },
      bankAccounts: [],
      loadingBankAccounts: false
    };
  },
  async mounted() {
    await this.loadBankAccounts();
    await this.loadData();
  },
  computed: {
    // the zones of Europe and the Atlantic islands, and the one saved
    timeZones() {
      let all = [];
      try {
        all = Intl.supportedValuesOf('timeZone');
      } catch {
        all = ['Europe/Andorra', 'Europe/Madrid', 'Atlantic/Canary', 'Europe/Lisbon', 'Europe/Paris'];
      }
      // Europe/Andorra is the empty value, the default
      const zones = all.filter(z => /^(Europe|Atlantic)\//.test(z) && z !== 'Europe/Andorra');
      if (this.form.time_zone && !zones.includes(this.form.time_zone)) zones.unshift(this.form.time_zone);
      return zones;
    },
    // «Dies laborables»: never set is Monday to Friday (lateOrders.js)
    workingDays: {
      get() {
        const days = this.form.orders_options && this.form.orders_options.working_days;
        return Array.isArray(days) ? days : workingDaysOf(null);
      },
      set(days) {
        this.form.orders_options = { ...this.form.orders_options, working_days: workingDaysOf(days).filter(d => days.includes(d)) };
      }
    },
    // empty (saved before the option existed) is January
    fiscalStartMonth: {
      get() {
        return (this.form.options && this.form.options.fiscal_year_start_month) || 1;
      },
      set(value) {
        this.form.options = { ...this.form.options, fiscal_year_start_month: value };
      }
    },
    // empty (saved before the option existed) is «Per projecte» (issues/371)
    defaultBillingMode: {
      get() {
        return (this.form.options && this.form.options.default_billing_mode) === 'hours' ? 'hours' : 'project';
      },
      set(value) {
        this.form.options = { ...(this.form.options || {}), default_billing_mode: value };
      }
    },
    indexSections() {
      return this.sections.filter(sec => !sec.logistics || this.logistics);
    },
    // empty counts as on (the option's default)
    showTasksInGantt: {
      get() {
        return !this.form.options || this.form.options.showTasksInGantt !== false;
      },
      set(value) {
        this.form.options = { ...(this.form.options || {}), showTasksInGantt: value };
      }
    },
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
        for (const key of COMPONENTS) this.form[key] = { ...(response.data[key] || {}) };
        this.savedFiscalStartMonth = this.fiscalStartMonth;
        for (const key of Object.keys(this.tokenSet || {})) this.tokenSet[key] = !!response.data[key + '_set'];
        try {
          const user = (await service({ requiresAuth: true, cached: true }).get('users/me')).data;
          const perms = ((user && user.permissions) || []).map(p => p.permission);
          this.logistics = perms.some(p => ['orders', 'orders_admin', 'orders_delivery'].includes(p));
        } catch (e) {
          this.logistics = false;
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
        // inside the components too: a cleared number is null, not ''
        for (const key of COMPONENTS) {
          data[key] = Object.fromEntries(Object.entries(this.form[key] || {}).map(([k, v]) => [k, v === '' || v === undefined ? null : v]));
        }
        
        const tokens = this.tokens || {};
        for (const [key, value] of Object.entries(tokens)) {
          if (String(value || '').trim()) data[key] = String(value).trim();
        }

        await service({ requiresAuth: true }).put('/me', data);
        this.savedFiscalStartMonth = this.fiscalStartMonth;
        for (const key of Object.keys(tokens)) {
          if (data[key]) this.tokenSet[key] = true;
          tokens[key] = '';
        }
        
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
.working-days {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
}
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
.cfg-ss {
  max-width: 40rem;
  margin-bottom: 1rem;
}
.cfg-ss th[scope="row"] {
  vertical-align: middle;
  font-weight: 600;
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
/* one option per line, with room between them (the labels were inline and ran together) */
.option-row {
  display: block;
  margin-bottom: .875rem;
}
.option-row + .cfg-grid {
  margin-top: 1.25rem;
}
.cfg-grid + .option-row {
  margin-top: 1.25rem;
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
  padding: .5rem 2rem;
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
