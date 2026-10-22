<template>
  <div class="document-form" v-if="!isLoading">
    <modal-box-emitted-invoices
      :is-active="isModalActive"
      :invoice="{ ...form, totalBase, totalVat, totalIrpf, total, toReal }"
      :series="series"
      :payment-methods="paymentMethods"
      :to-real="toReal"
      :contact="contact"
      @yes="
        isModalActive = false;
        !toReal ? sendSubmitEmittedInvoice() : doSetReal();
      "
      @cancel="isModalActive = false"
    ></modal-box-emitted-invoices>
    <modal-box-diet
      :is-active="isDietModalActive"
      :users="clients"
      :projects="projects"
      :quotes="quotes"
      :current-user="user"
      @submit="handleDietSubmit"
      @cancel="handleDietModalCancel"
    ></modal-box-diet>
    <!-- Modal: shows the invoice extracted by Z.ai -->
    <b-modal
      v-model="isInvoiceModalActive"
      has-modal-card
      @cancel="closeInvoiceModal"
    >
      <div class="modal-card invoice-parser-modal">
        <header class="modal-card-head">
          <p class="modal-card-title">Factura extreta</p>
        </header>
        <section class="modal-card-body">
          <!-- Contact match status -->
          <div
            v-if="invoiceMatchedContact"
            class="notification is-success is-light invoice-match"
          >
            <span class="icon"><b-icon icon="check-circle" /></span>
            <span>
              Proveïdor trobat:
              <strong>{{ invoiceMatchedContact.name }}</strong>
            </span>
          </div>
          <div v-else class="notification is-warning is-light invoice-match">
            <span class="icon"><b-icon icon="alert" /></span>
            <span v-if="parsedInvoice && parsedInvoice.vendor_tax_id">
              No s'ha trobat cap contacte amb el NIF/CIF
              <strong>{{ parsedInvoice.vendor_tax_id }}</strong
              >. Revisa les dades abans d'aplicar-les.
            </span>
            <span v-else>
              No s'ha pogut extreure el NIF/CIF del proveïdor, per tant no es
              pot verificar el contacte. Revisa les dades abans d'aplicar-les.
            </span>
          </div>

          <!-- Friendly summary -->
          <div v-if="parsedInvoice" class="invoice-summary">
            <div class="columns is-multiline is-mobile">
              <div class="column is-half">
                <span class="invoice-label">Proveïdor</span>
                <div>{{ parsedInvoice.vendor_name || "—" }}</div>
              </div>
              <div class="column is-half">
                <span class="invoice-label">NIF/CIF</span>
                <div>{{ parsedInvoice.vendor_tax_id || "—" }}</div>
              </div>
              <div class="column is-half">
                <span class="invoice-label">Número</span>
                <div>{{ parsedInvoice.invoice_number || "—" }}</div>
              </div>
              <div class="column is-half">
                <span class="invoice-label">Data</span>
                <div>{{ formatInvoiceDate(parsedInvoice.invoice_date) }}</div>
              </div>
              <div class="column is-half">
                <span class="invoice-label">Total</span>
                <div>
                  {{ parsedInvoice.total_amount }}
                  <small>{{ parsedInvoice.currency || "" }}</small>
                </div>
              </div>
              <div class="column is-half">
                <span class="invoice-label">Línies</span>
                <div>{{ (parsedInvoice.line_items || []).length }}</div>
              </div>
            </div>

            <b-table
              v-if="
                parsedInvoice.line_items && parsedInvoice.line_items.length
              "
              :data="parsedInvoice.line_items"
              :striped="true"
              :hoverable="true"
              :mobile-cards="false"
            >
              <b-table-column label="Concepte" v-slot="props">
                {{ props.row.description }}
              </b-table-column>
              <b-table-column
                label="Und."
                numeric
                v-slot="props"
              >
                {{ props.row.quantity }}
              </b-table-column>
              <b-table-column label="Preu" numeric v-slot="props">
                {{ props.row.unit_price }}
              </b-table-column>
              <b-table-column label="IVA" numeric v-slot="props">
                {{ props.row.vat_rate != null ? props.row.vat_rate + "%" : "—" }}
              </b-table-column>
              <b-table-column label="Total" numeric v-slot="props">
                {{ props.row.total }}
              </b-table-column>
            </b-table>
            <p class="invoice-note" v-if="parsedInvoice.prices_include_tax">
              <small
                >Els preus mostren l'IVA inclòs; es convertiran a base imposable
                en aplicar-los.</small
              >
            </p>
          </div>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="closeInvoiceModal">
            Cancel·la
          </button>
          <button
            class="button is-primary"
            type="button"
            @click="applyParsedInvoice"
          >
            Aplica les dades
          </button>
        </footer>
      </div>
    </b-modal>
    <!-- Redesign A: head with the document, its state, a summary line and the
         document actions; saving is in the bar at the bottom -->
    <title-bar :title-stack="headStack">
      <template #badges>
        <span v-if="entity === 'emitted-invoice' && form.id" class="tag" :class="form.state === 'real' ? 'is-success is-light' : 'is-warning is-light'">{{ form.state === 'real' ? 'Emesa' : 'Esborrany' }}</span>
        <span v-if="form.paid && type !== 'quotes'" class="tag is-success is-light">{{ isIncome ? 'Cobrada' : 'Pagada' }}</span>
        <span v-if="form.sent" class="tag is-info is-light">Enviada</span>
        <span v-if="type === 'quotes' && form.accepted" class="tag is-success is-light">Acceptat</span>
      </template>
      <template v-if="form.id" #subtitle>
        <span v-for="part in headSummary" :key="part.label" class="head-part">{{ part.label }} <b>{{ part.value }}</b></span>
      </template>
      <template v-if="form.id">
        <!-- payrolls: the PDF prints like an invoice, hidden for now -->
        <b-button v-if="type !== 'payrolls'" icon-left="file-pdf-box" @click="getPDF">PDF</b-button>
        <b-button
          v-if="entity === 'emitted-invoice' && form.state === 'real'"
          icon-left="content-copy"
          @click="duplicateInvoice()"
        >Duplica com a esborrany</b-button>
        <b-button
          v-if="entity === 'emitted-invoice' && form.state === 'real'"
          icon-left="undo-variant"
          class="is-danger is-outlined"
          @click="createRectificativeInvoice()"
        >Anul·la i rectifica…</b-button>
        <b-button
          v-if="entity === 'emitted-invoice' && form.state === 'draft'"
          @click="canEditDraft = true"
          :disabled="canEditDraft"
        >Editar dades de l'ESBORRANY</b-button>
        <b-button
          v-if="entity === 'emitted-invoice' && form.state === 'draft'"
          class="is-danger is-outlined"
          @click="deleteInvoice()"
        >Eliminar esborrany</b-button>
        <b-button
          v-if="entity === 'emitted-invoice' && form.state === 'draft'"
          type="is-primary"
          :loading="isLoading"
          :disabled="form.state === 'real' || canEditDraft"
          @click="setReal()"
        >Emetre factura (convertir a EMESA)</b-button>
        <b-button
          v-if="entity === 'emitted-invoice'"
          type="is-primary"
          icon-left="email-outline"
          :disabled="!canSendEmail || form.state !== 'real'"
          title="Desa la factura i l'envia per correu a la clienta"
          @click="sendInvoiceByEmail"
        >Envia per correu</b-button>
      </template>
    </title-bar>
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full">
          <!-- <pre>{{form}}</pre> -->
          <div v-if="entity === 'emitted-invoice' && form.state === 'real'" class="notification is-info lock-note">
            <b-icon icon="lock-outline" custom-size="default" />
            <span><b>Factura emesa:</b> la clienta, la sèrie, les dates, les línies i les notes visibles ja no es poden canviar. Per corregir-les, anul·la-la i crea'n una de rectificativa. El mètode de cobrament sí que es pot canviar, per exemple si el cobrament arriba a un altre compte.</span>
          </div>
          <div class="doc-layout">
          <div class="doc-main">
          <card-component class="tile is-child" title="Document">
            <div class="a-form is-compact document-fields">
            <!-- issued invoice: the locked data as text (mockup A-Factura-emesa) -->
            <div v-if="readOnly" class="doc-readonly">
              <p v-if="form.state === 'draft'" class="ro-item is-full ro-draft-note">
                Esborrany desat. Per canviar-ne les dades, clica «Editar dades de l'ESBORRANY».
              </p>
              <div class="ro-item is-full">
                <span class="ro-label">Clienta <span class="ro-lock"><b-icon icon="lock-outline" custom-size="mdi-14px" />bloquejat</span></span>
                <p class="ro-client">
                  <b>{{ contact && contact.name ? contact.name : clientSearch || "—" }}</b>
                  <span v-if="contactDetails" class="ro-sub"> · {{ contactDetails }}</span>
                </p>
                <router-link v-if="contact && contact.id" :to="{ name: 'contacts.edit', params: { id: contact.id } }" class="ro-link">Obre el contacte</router-link>
              </div>
              <div class="ro-item"><span class="ro-label">Sèrie</span><span class="ro-value">{{ serialName || "—" }}</span></div>
              <div class="ro-item"><span class="ro-label">Número</span><span class="ro-value">{{ form.code || "—" }}</span></div>
              <div class="ro-item"><span class="ro-label">Emissió</span><span class="ro-value">{{ formatDate(form.emitted) }}</span></div>
              <div class="ro-item"><span class="ro-label">Venciment</span><span class="ro-value">{{ formatDate(form.paybefore) }}</span></div>
              <!-- issues/199: the payment method of an issued invoice can still change -->
              <div v-if="canChangePaymentMethod" class="ro-item">
                <label class="ro-label" for="ro-payment-method">Mètode de cobrament</label>
                <div class="ro-payment-method">
                  <b-select id="ro-payment-method" v-model="newPaymentMethod" size="is-small" :disabled="savingPaymentMethod">
                    <option v-for="m in paymentMethods" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </b-select>
                  <b-button
                    v-if="newPaymentMethod && newPaymentMethod !== paymentMethodId"
                    size="is-small"
                    type="is-primary"
                    :loading="savingPaymentMethod"
                    @click="savePaymentMethod"
                  >Canvia</b-button>
                </div>
              </div>
              <div v-else class="ro-item"><span class="ro-label">Mètode de cobrament</span><span class="ro-value">{{ paymentMethodName || "—" }}</span></div>
            </div>
            <!-- PDF invoice parser (Z.ai): for new received invoices/expenses -->
            <b-field
              v-if="
                (type === 'received-invoices' || type === 'received-expenses') &&
                  !form.id &&
                  me &&
                  me.pdf_invoice_parser !== false
              "
              horizontal
              label=""
            >
              <b-button
                class="view-button"
                icon-left="file-upload"
                :loading="isParsingInvoice"
                @click="onInvoiceUploadClick"
              >
                Omple dades a partir de PDF
              </b-button>
              <input
                ref="invoicePdfInput"
                type="file"
                accept="application/pdf"
                class="is-hidden"
                @change="onInvoicePdfSelected"
              />
            </b-field>

            <b-field
              v-if="type === 'emitted-invoices' && !readOnly"
              label="Estat"
              horizontal
            >
              <div class="is-flex">
                <div
                  class="tag has-text-weight-bold"
                  :class="form.state === 'draft' ? 'is-warning' : 'is-success'"
                >
                  {{ form.state === "draft" ? "ESBORRANY" : "EMESA" }}
                </div>
                <div
                  class="tag has-text-weight-bold is-uppercase ml-3"
                  v-if="form.state === 'real' && form.face_queue"
                  :class="{
                    'is-success': form.face_queue === 'ok',
                    'is-warning': form.face_queue !== 'ok'
                  }"
                >
                  FACE: {{ form.face_queue }}
                </div>

                <div
                  class="tag has-text-weight-bold is-uppercase ml-3"
                  v-if="form.state === 'real' && form.verifactu_chain"
                  :class="{
                    'is-success': form.verifactu_chain === 'ok',
                    'is-warning': form.verifactu_chain !== 'ok'
                  }"
                >
                  VERIFACTU: {{ form.verifactu_chain }}
                </div>
              </div>
            </b-field>

            <!-- payrolls: the number is built from year, month and id (it's in the head) -->
            <b-field label="Número" horizontal v-if="form.state !== 'draft' && !readOnly && type !== 'payrolls'">
              <b-input
                v-model="form.code"
                placeholder=""
                v-if="!numberEditable"
                :disabled="!numberEditable || emittedInvoiceEditDisabled"
                icon-right="pencil-circle"
                icon-right-clickable
                @icon-right-click="editNumber"
              />
              <b-input
                v-model="form.number"
                placeholder=""
                v-if="numberEditable && !emittedInvoiceEditDisabled"
                icon-right="pencil-circle"
                icon-right-clickable
                @icon-right-click="editNumber"
              />
              <b-button
                v-if="form.id && type !== 'payrolls'"
                class="view-button is-primary ml-3"
                @click="getPDF"
                size="is-small"
                title="Visualitzar PDF"
              >
                PDF
              </b-button>
            </b-field>
            <b-field label="Sèrie *" horizontal v-if="type !== 'payrolls' && !readOnly">
              <b-select
                v-model="form.serial"
                placeholder=""
                required
                :disabled="emittedInvoiceSerieDisabled"
                @change="$event => calculateMinEmittedDate()"
              >
                <option v-for="(s, index) in series" :key="index" :value="s.id">
                  {{ s.name }}
                </option>
              </b-select>
            </b-field>

            <b-field label="Any" horizontal v-if="type === 'payrolls'">
              <b-input :model-value="form.year?.year" placeholder="" disabled />
            </b-field>

            <b-field label="Mes" horizontal v-if="type === 'payrolls'">
              <b-input :model-value="form.month?.month" placeholder="" disabled />
            </b-field>

            <b-field label="Persona" horizontal v-if="type === 'payrolls'">
              <b-input
                :model-value="form.users_permissions_user?.username"
                placeholder=""
                disabled
              />
            </b-field>


            <b-field
              label="Tipus"
              horizontal
              v-if="type === 'received-incomes'"
            >
              <b-select v-model="form.document_type" placeholder="" required>
                <option
                  v-for="(s, index) in documentTypes"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </b-select>
            </b-field>
            <b-field
              label="Tipus"
              horizontal
              v-if="type === 'received-expenses'"
            >
              <b-select
                v-model="form.document_type"
                placeholder=""
                required
                @change="$event => calculateIRPF($event)"
              >
                <option
                  v-for="(s, index) in documentTypes"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </b-select>
            </b-field>
            <b-field v-if="!readOnly" label="Emissió *" horizontal>
              <b-datepicker
                @update:model-value="
                  input;
                  calculateIRPF();
                "
                :disabled="emittedInvoiceSerieDisabled"
                v-model="form.emitted"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data Emissió"
                trap-focus
                editable
                :min-date="minEmittedDate"
                :max-date="maxEmittedDate"
              >
              </b-datepicker>
            </b-field>

            <b-field
              label="Venciment"
              horizontal
              v-if="showPaybefore"
            >
              <b-datepicker
                :disabled="emittedInvoiceEditDisabled"
                v-model="form.paybefore"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data de venciment"
                trap-focus
                editable
                :min-date="minEmittedDate"
              >
              </b-datepicker>
            </b-field>
            

            <b-field
              v-if="type !== 'quotes' && type !== 'payrolls' && !readOnly"
              :label="
                type !== 'received-incomes' && type !== 'emitted-invoices'
                  ? 'Mètode de pagament'
                  : 'Mètode de cobrament'
              "
              horizontal
            >
              <b-select
                v-model="form.payment_method"
                placeholder=""
                required
                :disabled="emittedInvoiceEditDisabled"
              >
                <option
                  v-for="(s, index) in paymentMethods"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </b-select>
            </b-field>

            <!-- the concept printed on the PDF; only issued invoices have it (issues/312) -->
            <b-field v-if="type === 'emitted-invoices'" label="Concepte a la factura" horizontal>
              <b-input
                placeholder="Surt al PDF de la factura"
                v-model="form.concept"
                :disabled="emittedInvoiceEditDisabled"
              >
              </b-input>
            </b-field>

            <!-- payrolls have no concept, attachments or internal notes -->
            <b-field v-if="type !== 'payrolls'" label="Concepte del document" horizontal>
              <b-input
                placeholder="Concepte intern del document"
                v-model="form.document_concept"
              >
              </b-input>
            </b-field>

            <b-field
              v-if="(type == 'emitted-invoices' || type == 'quotes') && !readOnly"
              label="Clienta *"
              horizontal
            >
              <b-autocomplete
                :disabled="emittedInvoiceEditDisabled"
                v-model="clientSearch"
                placeholder="Escriu el nom de la clienta..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredClients"
                field="name"
                @select="clientSelected"
                :clearable="true"
                required
              >
              </b-autocomplete>
              <div class="is-flex">
                <b-button
                  class="view-button mb-3"
                  @click="navNew"
                  icon-left="plus"
                  title="Nou Contacte"
                  :disabled="emittedInvoiceEditDisabled"
                >
                </b-button>
                <b-button
                  class="view-button mb-3 ml-3"
                  @click="refreshClients"
                  icon-left="refresh"
                  title="Refrescar Contactes"
                  :disabled="emittedInvoiceEditDisabled"
                >
                </b-button>
              </div>
            </b-field>
            <b-field
              v-if="type == 'received-invoices'"
              label="Proveïdora *"
              horizontal
            >
              <b-autocomplete
                v-model="clientSearch"
                placeholder="Escriu el nom del contacte..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredClients"
                field="name"
                @select="clientSelected"
                :clearable="true"
              >
              </b-autocomplete>
              <div class="is-flex">
                <b-button
                  class="view-button mb-3"
                  @click="navNew"
                  icon-left="plus"
                  title="Nou Contacte"
                >
                </b-button>
                <b-button
                  class="view-button mb-3 ml-3"
                  @click="refreshClients"
                  icon-left="refresh"
                  title="Refrescar Contactes"
                >
                </b-button>
              </div>
            </b-field>
            <b-field
              v-if="type == 'received-incomes' || type == 'received-expenses'"
              label="Contacte *"
              horizontal
              :message="personIrpf ? `IRPF ${personIrpf} %` : ''"
            >
              <b-autocomplete
                v-model="clientSearch"
                placeholder="Escriu el nom del contacte..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredClients"
                field="name"
                @select="clientSelected"
                :clearable="true"
                required
              >
              </b-autocomplete>
              <div class="is-flex">
                <b-button
                  class="view-button mb-3"
                  @click="navNew"
                  icon-left="plus"
                  title="Nou Contacte"
                >
                </b-button>
                <b-button
                  class="view-button mb-3 ml-3"
                  @click="refreshClients"
                  icon-left="refresh"
                  title="Refrescar Contactes"
                >
                </b-button>
              </div>
            </b-field>
            <b-field
              v-if="type == 'received-invoices'"
              label="Número factura proveïdora"
              horizontal
            >
              <b-input
                name="Unitats"
                placeholder="Referència de factura de la proveïdora"
                v-model="form.contact_invoice_number"
                class="subphase-detail-input"
              >
              </b-input>
            </b-field>

            <b-field
              :label="type === 'quotes' ? 'Projecte *' : 'Projectes *'"
              horizontal
              class="full"
              v-if="type !== 'payrolls'"
            >
              <div class="is-flex is-align-items-center is-full-width">
                <b-autocomplete
                  class="is-flex-grow-1"
                  v-model="projectSearch"
                  placeholder="Escriu el nom del projecte..."
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredProjects"
                  field="name"
                  @select="projectSelected"
                  :clearable="true"
                >
                </b-autocomplete>
                <b-button
                  class="view-button mb-0 ml-3"
                  @click="refreshProjects"
                  icon-left="refresh"
                  title="Refrescar Projectes"
                >
                </b-button>
              </div>
            </b-field>
            <b-field
              label=""
              horizontal
              class="full project-tags"
              v-if="form.projects && form.projects.length && type !== 'quotes'"
            >
              <div class="list">
                <ul class="ulist">
                  <li
                    v-for="(project, i) in form.projects"
                    :key="i"
                    @click="removeProject(project)"
                    class="tag is-primary"
                  >
                    {{ project.name }}
                    <b-button class="no-button" icon-left="close-circle" />
                  </li>
                </ul>
              </div>
            </b-field>

            

            </div>
          </card-component>

          <card-component v-if="readOnly && form.lines" title="Línies" class="tile is-child lines-readonly-card">
            <document-lines-read-only :lines="form.lines" :is-diet="form.document_type == '4'" />
            <document-totals :lines="form.lines" />
            <div class="doc-notes-readonly">
              <span class="ro-label">Notes <small>visibles a la factura</small></span>
              <p :class="{ 'has-text-muted': !form.comments }">{{ form.comments || "Cap nota" }}</p>
            </div>
          </card-component>

          <hr />
          </div>
          <aside class="doc-side">
            <card-component class="tile is-child" :title="type === 'quotes' ? 'Enviament i acceptació' : isIncome ? 'Cobrament i enviament' : 'Pagament'">
              <div class="a-form side-fields">
<b-field
              label="Previsió cobrament"
              horizontal
              v-if="type === 'received-incomes' || type === 'emitted-invoices'"
            >
              <b-datepicker
                @update:model-value="
                  input;
                  calculateIRPF();
                "
                v-model="form.estimated_payment"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data prevista de cobrament"
                trap-focus
                editable
              >
              </b-datepicker>
            </b-field>
            <b-field
              label="Enviada"
              horizontal
              v-if="
                type !== 'received-incomes' &&
                  type !== 'received-expenses' &&
                  type !== 'received-invoices' &&
                  type !== 'payrolls'
              "
            >
              <b-checkbox v-model="form.sent" class="checkbox-inline">
              </b-checkbox>
              <b-datepicker
                v-model="form.sent_date"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data d'enviament"
                trap-focus
                editable
              >
              </b-datepicker>
            </b-field>
            <b-field
              v-if="type !== 'quotes'"
              :label="
                type !== 'received-incomes' && type !== 'emitted-invoices'
                  ? 'Pagada'
                  : 'Cobrada'
              "
              horizontal
            >
              <!-- the box and the date kept together (issues/256) -->
              <b-checkbox :model-value="form.paid" class="checkbox-inline" @update:model-value="v => setPaid(form, v)">
              </b-checkbox>
              <b-datepicker
                v-if="type !== 'quotes'"
                :model-value="form.paid_date"
                @update:model-value="v => setPaidDate(form, v)"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data de pagament"
                trap-focus
                editable
              >
              </b-datepicker>
            </b-field>

            <b-field label="Compte bancari" horizontal v-if="type === 'payrolls'">
              <b-select
                expanded
                v-model="payrollBankAccount"
                placeholder="-- Compte --"
              >
                <option
                  v-for="account in bankAccounts"
                  :key="account.id"
                  :value="account.id"
                >
                  {{ account.name }}
                </option>
              </b-select>
            </b-field>

            <b-field v-if="type === 'quotes'" label="Acceptat" horizontal>
              <!-- the box and the date kept together (issues/280) -->
              <b-checkbox :model-value="form.accepted" class="checkbox-inline" @update:model-value="v => setAccepted(form, v)">
              </b-checkbox>
              <b-datepicker
                :model-value="form.accepted_date"
                @update:model-value="v => setAcceptedDate(form, v)"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data d'acceptació"
                trap-focus
                editable
              >
              </b-datepicker>
            </b-field>

            <b-field
              label="Modificable"
              horizontal
              v-if="type !== 'payrolls' && type !== 'quotes'"
            >
              <b-switch v-model="form.updatable"> </b-switch>
            </b-field>

            <b-field
              label="Factura proforma"
              horizontal
              v-if="type === 'quotes'"
            >
              <b-checkbox v-model="form.proforma" class="checkbox-inline">
              </b-checkbox>
            </b-field>
              </div>
            </card-component>
            <invoice-submission-card
              v-if="type === 'emitted-invoices' && form.id && form.state === 'real'"
              :invoice-id="form.id"
              :verifactu="form.verifactu_chain"
              :face="form.face_queue"
            />
            <card-component v-if="type !== 'payrolls'" class="tile is-child" title="Adjunts">
              <p v-if="!form.id" class="has-text-muted side-hint">Els adjunts es poden afegir un cop desat el document.</p>
            <attachments-table
              v-if="!editingDocuments && form.documents && form.documents.length"
              :documents="form.documents"
              :api-url="apiUrl"
              @remove="removeImage"
            />
            <file-upload
              :multiple="true"
              :entity="entity"
              :ref-id="form.id"
              :field="'documents'"
              :accept="'*/*'"
              compact
              @uploaded="uploaded"
              v-if="form.id"
            >
            </file-upload>
            </card-component>
            <card-component v-if="type !== 'payrolls'" class="tile is-child" title="Notes internes">
              <div class="a-form side-fields no-labels">
<b-field
              label="Notes internes"
             
              message="No visibles a la factura"
            >
              <b-input
                type="textarea"
                v-model="form.comments_internal"
                placeholder="Notes internes"
                :maxlength="1000"
              />
            </b-field>
              </div>
            </card-component>
            <document-history
              v-if="form.id && entity && canSeeHistory"
              :entity="entity"
              :document-id="form.id"
              :refresh-key="historyKey"
            />
          </aside>
          </div>
          <div class="doc-below">
          <card-component title="Línies" v-if="form.lines && !readOnly">
            <document-lines
              v-model:lines="form.lines"
              :new-line="getNewLine"
              :disabled="emittedInvoiceEditDisabled"
              :is-diet="form.document_type == '4'"
            />
            <hr />
            <document-totals :lines="form.lines" />
            <hr />

            <div class="a-form doc-notes">
            <b-field label="Notes" message="Visibles a la factura">
              <b-input
                type="textarea"
                v-model="form.comments"
                placeholder="Notes"
                :disabled="emittedInvoiceEditDisabled"
                :maxlength="1000"
              />
            </b-field>
            
            </div>
          </card-component>
          <card-component
            v-if="type === 'payrolls' && dedication"
            title="Detall"
          >
            <b-field label="Salari base" horizontal>
              <b-input
                v-model="form.total_base"
                type="numeric"
                placeholder=""
                @update:model-value="fixDecimalsPayroll('total_base', form.total_base)"
              />
            </b-field>

            <b-field
              v-if="form.irpf_base"
              :label="payrollLabel('IRPF a càrrec de la treballadora', dedication.pct_irpf)"
              horizontal
            >
              <b-input
                v-model="form.irpf_base"
                type="numeric"
                placeholder=""
                @update:model-value="fixDecimalsPayroll('irpf_base', form.irpf_base)"
              />

              <b-datepicker
                v-model="form.irpf_date"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder=""
              >
              </b-datepicker>
            </b-field>

            <b-field
              v-if="form.other_base"
              :label="payrollLabel('Altres a càrrec de la treballadora', dedication.pct_other)"
              horizontal
            >
              <b-input
                v-model="form.other_base"
                type="numeric"
                placeholder=""
                @update:model-value="fixDecimalsPayroll('other_base', form.other_base)"
              />

              <b-datepicker
                v-model="form.other_date"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder=""
              >
              </b-datepicker>
            </b-field>

            <b-field
              :label="`Salari net a percebre per la treballadora`"
              horizontal
            >
              <b-input v-model="form.net_base" placeholder="" disabled />

              <b-datepicker
                v-model="form.net_date"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder=""
              >
              </b-datepicker>
            </b-field>

            <b-field
              v-if="form.ss_base"
              :label="payrollLabel('SS a càrrec de la cooperativa', dedication.pct_quota)"
              horizontal
            >
              <b-input
                v-model="form.ss_base"
                placeholder=""
                @update:model-value="fixDecimalsPayroll('ss_base', form.ss_base)"
              />

              <b-datepicker
                v-model="form.ss_date"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder=""
              >
              </b-datepicker>
            </b-field>

            <b-field v-if="form.ss_base" label="Despesa total" horizontal>
              <b-input v-model="form.total" placeholder="" disabled />
            </b-field>
          </card-component>


          </div>

          <hr />

          <div v-if="type !== 'quotes' && !isLoadingProject">
            <card-component
              v-for="(project, i) in form.projects"
              :key="i"
              :title="`DETALL DEL PROJECTE - ${project.name}`"
            >
              <div class="project-form">
                <project-phases
                  :hidden="true"
                  :form="project"
                  :project-phases="project.project_phases"
                  :contacts="clients"
                  :is-paginated="false"
                  @phases-updated="phasesUpdated"
                  :mode="
                    type === 'emitted-invoices' || type === 'received-incomes'
                      ? 'incomes'
                      : 'expenses'
                  "
                  :document-id="form.id"
                  :document-type="type"
                  :document-total="totalBase"
                  :document-type-name="documentTypeName"
                  :document-emitted="form.emitted"
                  :document-paid-date="form.paid_date"
                  :document-estimated-payment="form.estimated_payment"
                  :document-paybefore="form.paybefore"
                />
                <div class="helper">
                  <b-icon icon="help-circle" />

                  Cal assignar el document (factura, tiquet, dieta...) a una
                  línia de pressupost del projecte. Si la línia no existís, es
                  pot crear en aquest moment o també es pot desdoblar alguna
                  existent. Per assignar-lo, cal marcar la casella de 'Facturat
                  (Fact.)' i clicar al botó de 'Document (Doc.)'. Un cop
                  assignat, caldrà guardar la factura.
                </div>
              </div>
            </card-component>
            <hr />
          </div>

        </div>
      </div>
    </section>

    <div v-if="canSave" class="savebar">
      <span class="savebar-state">{{ form.id ? (form.updatable === false ? 'Document no modificable' : 'Desa els canvis quan acabis') : 'Document nou' }}</span>
      <b-button v-if="form.id" :loading="isLoading" @click="canEditDocument(true)">Guardar i sortir</b-button>
      <b-button type="is-primary" :loading="isLoading" @click="canEditDocument(false)">Guardar</b-button>
    </div>
  </div>
</template>

<script>
// External libraries
import moment from "moment";
import { rectificativeSerial, isRectificativeSerial } from "@/domain/rectificativeSerial";
import _ from "lodash";
import * as documentTotals from "@/domain/documentTotals.js";
import { documentPayload } from "@/domain/documentPayload.js";
import { documentDatesForPickers, documentDatesForApi, estimatedPaymentFrom, setPaid, setPaidDate, setAccepted, setAcceptedDate } from "@/domain/documentDates.js";
import { budgetLineTotal, documentLineQuantity } from "@/domain/budgetLines.js";
import { formatMoney } from "@/helpers/format-number";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

// Project components
import TitleBar from "@/components/TitleBar.vue";
import CardComponent from "@/components/CardComponent.vue";
import ModalBoxEmittedInvoices from "@/components/ModalBoxEmittedInvoices.vue";
import ModalBoxSplit from "@/components/ModalBoxSplit.vue";
import ModalBoxDiet from "@/components/ModalBoxDiet.vue";
import ProjectPhases from "@/components/ProjectPhases.vue";
import MoneyFormat from "@/components/MoneyFormat.vue";
import DocumentLines from "@/components/DocumentLines.vue";
import DocumentLinesReadOnly from "@/components/DocumentLinesReadOnly.vue";
import DocumentTotals from "@/components/DocumentTotals.vue";
import FileUpload from "@/components/FileUpload.vue";
import AttachmentsTable from "@/components/AttachmentsTable.vue";
import InvoiceSubmissionCard from "@/components/InvoiceSubmissionCard.vue";
import DocumentHistory from "@/components/DocumentHistory.vue";

// Services
import service from "@/service/index";
import getConfig from "@/config";
import { payrollCode, payrollLabel, payrollTotal } from "@/domain/payrollForm";
import { upperCase } from "lodash";

export default {
  name: "DocumentForm",
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat,
    DocumentLines,
    DocumentLinesReadOnly,
    DocumentTotals,
    ModalBoxEmittedInvoices,
    ModalBoxSplit,
    ModalBoxDiet,
    ProjectPhases,
    FileUpload,
    AttachmentsTable,
    InvoiceSubmissionCard,
    DocumentHistory
  },
  props: {
    id: {
      type: [String, Number],
      default: null
    },
    type: {
      type: [String],
      default: null
    }
  },
  data() {
    return {
      appPath: import.meta.env.VUE_APP_PATH,
      isProfileExists: false,
      isLoading: false,
      // bumped when the document is read again (after a save, an email)
      historyKey: 0,
      isLoadingProject: false,
      series: [],
      bankAccounts: [],
      form: this.getClearFormObject(),
      clients: [],
      clientSearch: "",
      projectSearch: "",
      methodSearch: "",
      productSearch: "",
      paymentMethods: [],
      projects: [],
      project: null,
      projectCopy: null,
      shouldSaveProject: false,
      documentTypes: [],
      dedications: [],
      dedicationsDiets: [],
      dedication: null,
      numberEditable: false,
      apiUrl: import.meta.env.VUE_APP_API_URL,
      editingDocuments: false,
      personIrpf: 0,
      quotes: null,
      products: [],
      pdf: false,
      contact: null,
      isModalActive: false,
      isDietModalActive: false,
      // PDF invoice parser (Z.ai)
      isParsingInvoice: false,
      isInvoiceModalActive: false,
      parsedInvoice: null,
      invoiceMatchedContact: null,
      toReal: false,
      exitAfterSave: false,
      minEmittedDate: moment()
        .subtract(25, "year")
        .toDate(),
      maxEmittedDate: moment()
        .add(4, "day")
        .toDate(),
      canEditDraft: false,
      newPaymentMethod: null,
      savingPaymentMethod: false,
      options: null,
      user: null,
      // Pagination for large lists
      // Debouncing for inputs
      apiUrl: ""
    };
  },
  computed: {
    ...mapState(useMainStore, ["me"]),
    // The bank a bestreta is paid from; Tresoreria shows its net payment
    // there (issues/042). Saved as { id }, like the other relations.
    payrollBankAccount: {
      get() {
        const account = this.form.bank_account;
        return account && typeof account === "object" ? account.id : account || null;
      },
      set(id) {
        this.form.bank_account = id ? { id } : null;
      }
    },
    filteredClients() {
      return this.clients.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.clientSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredProjects() {
      return this.projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredMethods() {
      return this.paymentMethods.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.methodSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredProducts() {
      return this.products.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.productSearch.toLowerCase()) >= 0 ||
          option.code
            .toString()
            .toLowerCase()
            .indexOf(this.productSearch.toLowerCase()) >= 0
        );
      });
    },
    titleStack() {
      let type = "";
      if (this.type === "emitted-invoices") {
        type = "Factures Emeses";
      } else if (this.type === "received-incomes") {
        type = "Ingressos rebuts";
      } else if (this.type === "received-expenses") {
        type = "Despeses rebudes";
      } else if (this.type === "quotes") {
        type = "Pressupostos";
      } else if (this.type === "payrolls") {
        type = "Nòmines i Bestretes";
      } else {
        type = "Factures Rebudes";
      }
      return ["Facturació", type, this.formCardTitle];
    },
    // the «Historial» (issues/161): the API answers only projects/admin
    canSeeHistory() {
      const permissions = ((this.user && this.user.permissions) || []).map(p => p.permission || p);
      return permissions.includes("projects") || permissions.includes("admin");
    },
    entity() {
      if (this.type === "emitted-invoices") {
        return "emitted-invoice";
      } else if (this.type === "received-incomes") {
        return "received-income";
      } else if (this.type === "received-expenses") {
        return "received-expense";
      } else if (this.type === "received-invoices") {
        return "received-invoice";
      } else if (this.type === "quotes") {
        return "quote";
      }
    },
    // the old bottom buttons showed once the document had a project (or always
    // for payrolls and received expenses)
    canSave() {
      return this.type === "payrolls" || this.type === "received-expenses" ||
        !!((this.form.projects && this.form.projects.length) || this.form.projects);
    },
    isIncome() {
      return this.type === "emitted-invoices" || this.type === "received-incomes" || this.type === "quotes";
    },
    headStack() {
      const crumbs = {
        "emitted-invoices": ["Ingressos", "Factures emeses"],
        "received-incomes": ["Ingressos", "Ingressos rebuts"],
        "received-invoices": ["Despeses", "Factures rebudes"],
        "received-expenses": ["Despeses", "Despeses rebudes"],
        quotes: ["Pressupostos"],
        payrolls: ["Bestretes"]
      }[this.type] || ["Facturació"];
      let title = this.formCardTitle;
      if (this.isProfileExists) {
        const noun = { "emitted-invoices": "Factura", "received-invoices": "Factura", quotes: "Pressupost" }[this.type];
        if (noun && this.form.code) title = `${noun} ${this.form.code}`;
        else if (this.entity === "emitted-invoice" && this.form.state === "draft") title = "Esborrany de factura";
      }
      return [...crumbs, title || ""];
    },
    headSummary() {
      const date = d => (d ? moment(d).format("DD/MM/YYYY") : null);
      if (this.type === "payrolls") {
        const u = this.form.users_permissions_user;
        return [
          { label: "Persona", value: u && u.username },
          { label: "Emesa", value: date(this.form.emitted) },
          { label: "Despesa total", value: this.form.total ? this.formatMoney(this.form.total) : null }
        ].filter(p => p.value);
      }
      const contactName = this.contact && this.contact.name;
      const parts = [
        { label: this.isIncome ? "Clienta" : "Proveïdora", value: contactName },
        { label: this.type === "quotes" ? "Data" : "Emesa", value: date(this.form.emitted) },
        { label: "Venciment", value: date(this.form.paybefore) },
        { label: "Total", value: this.total !== undefined && this.total !== null ? this.formatMoney(this.total) : null }
      ];
      return parts.filter(p => p.value);
    },
    formCardTitle() {
      if (this.isProfileExists) {
        return this.form.code;
      } else {
        if (this.type === "emitted-invoices") {
          return "Nova factura";
        } else if (this.type === "received-incomes") {
          return "Nou ingrés";
        } else if (this.type === "received-expenses") {
          return "Nova despesa";
        } else if (this.type === "quotes") {
          return "Nou Pressupost";
        } else if (this.type === "payrolls") {
          return "Nova Nòmina o Bestreta";
        } else {
          return "Nova factura";
        }
      }
    },
    transitionName() {
      if (this.useTransition) {
        return "fade";
      }
      return "x";
    },
    // A saved document without lines (many migrated ones) keeps the totals
    // stored on it; computing them from no lines showed 0,00 € (issues/101)
    usesStoredTotals() {
      return !!this.form.id && !(this.form.lines || []).length;
    },
    totalBase() {
      return this.usesStoredTotals ? Number(this.form.total_base) || 0 : documentTotals.totalBase(this.form.lines);
    },
    totalVat() {
      return this.usesStoredTotals ? Number(this.form.total_vat) || 0 : documentTotals.totalVat(this.form.lines);
    },
    totalIrpf() {
      // stored positive, shown (like the computed one) as negative
      return this.usesStoredTotals ? -(Number(this.form.total_irpf) || 0) : documentTotals.totalIrpf(this.form.lines);
    },
    total() {
      return this.totalBase + this.totalVat + this.totalIrpf;
    },
    hasDiscount() {
      return documentTotals.hasDiscount(this.form.lines);
    },
    totalBaseWithoutDiscount() {
      return documentTotals.totalBaseWithoutDiscount(this.form.lines);
    },
    totalDiscount() {
      return this.totalBaseWithoutDiscount - this.totalBase;
    },
    canSendEmail() {
      const can =
        this.form.id !== null &&
        // this.pdf &&
        //this.form.pdf &&
        //this.form.pdf.startsWith("/uploads/documents/") &&
        this.form.contact !== null &&
        this.contact !== null &&
        this.contact.contact_email !== null;
      return can;
    },
    emittedInvoiceEditDisabled() {
      // return this.type === "emitted-invoices" && !this.canEditDraft
      // a Boolean: a new rectificative has form.id 0, and the `disabled`
      // props warned «Expected Boolean, got Number» (issues/229)
      return !!(
        (this.type === "emitted-invoices" &&
          this.form.id &&
          this.form.code !== "ESBORRANY") ||
        (this.type === "emitted-invoices" &&
          this.form.id &&
          this.form.code === "ESBORRANY" &&
          !this.canEditDraft)
      );
    },
    // quotes have no paybefore column: the date was dropped on save (issues/229)
    showPaybefore() {
      return !["received-incomes", "received-expenses", "payrolls", "quotes"].includes(this.type) && !this.readOnly;
    },
    // An issued invoice (or a draft that is not being edited) shows its locked
    // data as text: same data, same save, just not as disabled inputs
    readOnly() {
      return this.type === "emitted-invoices" && !!this.emittedInvoiceEditDisabled;
    },
    serialName() {
      const serie = (this.series || []).find(s => s.id === this.form.serial);
      return serie ? serie.name : "";
    },
    paymentMethodId() {
      return this.form.payment_method && this.form.payment_method.id ? this.form.payment_method.id : this.form.payment_method;
    },
    paymentMethodName() {
      const method = (this.paymentMethods || []).find(m => m.id === this.paymentMethodId);
      return method ? method.name : "";
    },
    // issued invoices: PUT /emitted-invoices/:id/payment-method, same audience
    // as the invoices themselves (projects/admin) (issues/199)
    canChangePaymentMethod() {
      return this.entity === "emitted-invoice" && this.form.state === "real" && !!this.form.id && this.canSeeHistory;
    },
    contactDetails() {
      const c = this.contact || {};
      const place = [c.postcode, c.city].filter(Boolean).join(" ");
      return [c.nif, c.address, place].filter(Boolean).join(" · ");
    },
    emittedInvoiceSerieDisabled() {
      return (
        (this.type === "emitted-invoices" &&
          this.form.id > 0 &&
          this.form.code !== "ESBORRANY") ||
        (this.type === "emitted-invoices" &&
          this.form.id > 0 &&
          this.form.code === "ESBORRANY" &&
          !this.canEditDraft)
      );
    },
    currentProjectLinesHash() {
      return JSON.stringify(this.form.projects.map(p => p.project_phases));
    },
    currentProjectLinesHashHasChanged() {
      return this.initialProjectLinesHash !== this.currentProjectLinesHash;
    },
    prettyInvoiceJson() {
      try {
        return JSON.stringify(this.parsedInvoice, null, 2);
      } catch (e) {
        return String(this.parsedInvoice);
      }
    },
    documentTypeName() {
      const typeMap = {
        "emitted-invoices": "Factura emesa",
        "received-incomes": "Ingrés rebut",
        "received-expenses": "Despesa rebuda",
        "received-invoices": "Factura rebuda",
        "received-grants": "Subvenció rebuda",
        tickets: "Tiquet",
        diets: "Dieta",
        quotes: "Pressupost",
        payrolls: "Nòmina"
      };
      return typeMap[this.type] || "Document";
    }
  },
  watch: {
    async id(newValue) {
      this.isProfileExists = false;
      if (!newValue || newValue === 0) {
        await this.getAuxiliarData();
        this.form = this.getClearFormObject();
      } else {
        this.getData();
      }
    },
    totalBase() {
      // Recalculate warnings when document total changes
      if (this.form.id) {
        this.$nextTick(() => {
          this.calculateDocumentWarnings();
        });
      }
    },
    paymentMethodId: {
      immediate: true,
      handler(id) {
        this.newPaymentMethod = id || null;
      }
    }
  },
  created() {
    const config = getConfig();
    this.apiUrl = config.VUE_APP_API_URL;

    this.getData();
  },
  methods: {
    payrollLabel,
    setPaid,
    setPaidDate,
    setAccepted,
    setAcceptedDate,
    // issues/199: only the payment method (and its bank account) change; the
    // backend records it in the history
    async savePaymentMethod() {
      this.savingPaymentMethod = true;
      try {
        const { data } = await service({ requiresAuth: true }).put(
          `/emitted-invoices/${this.form.id}/payment-method`,
          { payment_method: this.newPaymentMethod }
        );
        this.form.payment_method = data && data.payment_method ? data.payment_method.id : this.newPaymentMethod;
        this.form.bank_account = data ? data.bank_account || null : this.form.bank_account;
        this.historyKey++;
        this.$buefy.snackbar.open({ message: "Mètode de cobrament canviat", queue: false });
      } catch (err) {
        console.error(err);
        this.newPaymentMethod = this.paymentMethodId || null;
        this.$buefy.snackbar.open({ message: "No s'ha pogut canviar el mètode de cobrament", type: "is-danger", queue: false });
      } finally {
        this.savingPaymentMethod = false;
      }
    },
    formatMoney,
    formatDate(date) {
      return date ? moment(date).format("DD/MM/YYYY") : "—";
    },
    getClearFormObject() {
      return {
        id: null,
        number: null,
        serial: { id: 0 },
        emitted:
          this.type === "emitted-invoices" || this.type === "received-incomes"
            ? new Date()
            : null,
        paybefore: null,
        estimated_payment: null,
        contact: { id: 0 },
        lines: _.concat([], this.getNewLine()),
        updatable: true,
        documents: [],
        document_type: 0,
        state: this.type === "emitted-invoices" ? "draft" : null,
        user_last: 0,
        verifactu: false
      };
    },
    getNewLine() {
      if (this.form && this.form.document_type === 4 && this.personIrpf) {
        return [
          {
            concept: "Dieta sense IRPF",
            base: parseFloat(
              (this.quotes.diet_amount_without_irpf || 0).toFixed(4)
            ),
            quantity: 1,
            discount: 0,
            vat: 0,
            irpf: 0,
            comments: "",
            show: false,
            date: new Date()
          },
          {
            concept: "Dieta amb IRPF",
            base: parseFloat(
              (
                (this.quotes.diet_amount_total || 0) -
                (this.quotes.diet_amount_without_irpf || 0)
              ).toFixed(4)
            ),
            quantity: 1,
            discount: 0,
            vat: 0,
            irpf: this.personIrpf,
            comments: "",
            show: false,
            date: new Date()
          }
        ];
      }
      return {
        concept: "",
        base: 0,
        quantity: 1,
        discount: 0,
        vat: 0,
        irpf: 0,
        comments: "",
        show: false,
        date: new Date(),
        product: null,
        productSearch: ""
      };
    },
    warnSettingsMissing() {
      this.$buefy.snackbar.open({
        message: "No s'han pogut carregar les dades de la sessió o de l'entitat. Si no pots desar, torna a entrar.",
        type: "is-warning",
        queue: false
      });
    },
    async getData() {
      // The document, /users/me and /me go out at once, with the lists right
      // after: one after another they took ~17 s on ladili_test (issues/317).
      const existing = this.$route.params.id && this.$route.params.id > 0;
      const documentRequest = existing
        ? service({ requiresAuth: true }).get(`${this.type}/${this.$route.params.id}`)
        : null;
      // handled below, once the lists are here; don't report it as unhandled meanwhile
      if (documentRequest) documentRequest.catch(() => {});
      const [userMe, me] = await Promise.allSettled([
        service({ requiresAuth: true }).get("/users/me"),
        service({ requiresAuth: true }).get("me")
      ]);
      // A failed /users/me or /me (e.g. a 403) left the form blank: the
      // document wasn't loaded at all (issues/063). Fall back to the session
      // and keep going.
      if (userMe.status === "fulfilled") {
        this.user = userMe.value.data;
      } else {
        this.user = useMainStore().user || JSON.parse(localStorage.getItem("user") || "null") || {};
        this.warnSettingsMissing();
      }
      if (me.status === "fulfilled") {
        this.options = me.value.data;
        useMainStore().setMe({
          me: me.value.data
        });
      } else {
        this.options = useMainStore().me || {};
        this.warnSettingsMissing();
      }

      this.isLoading = true;

      // the lines need the products of the lists
      await this.getAuxiliarData();

      if (existing) {
        await documentRequest
          .then(async r => {
            if (r.data && r.data.id) {
              this.isProfileExists = true;
              this.historyKey++;

              if (r.data.lines) {
                r.data.lines.forEach(l => {
                  l.show = l.show || false;
                  l.date = l.date
                    ? moment(l.date, "YYYY-MM-DD").toDate()
                    : null;
                  if (l.product && l.product.id) {
                    const p = this.products.find(p => p.id === l.product.id);
                    if (p) {
                      l.productSearch = `${p.code} - ${p.name}`;
                    }
                  }
                });
              }

              this.form = documentDatesForPickers(r.data);

              if (this.form.serial && this.form.serial.id) {
                this.form.serial = this.form.serial.id;
              }
              if (this.form.contact && this.form.contact.id) {
                this.contact = this.form.contact;
                this.clientSearch = this.form.contact.name;
                this.form.contact = this.form.contact.id;
              }

              if (this.form.user_last && this.form.user_last.id) {
                this.form.user_last = this.form.user_last.id;
              } else {
                this.form.user_last = null;
              }
              if (this.form.user_real && this.form.user_real.id) {
                this.form.user_real = this.form.user_real.id;
              } else {
                this.form.user_real = null;
              }
              if (this.form.user_draft && this.form.user_draft.id) {
                this.form.user_draft = this.form.user_draft.id;
              } else {
                this.form.user_draft = null;
              }

              if (this.form.payment_method && this.form.payment_method.id) {
                this.methodSearch = this.form.payment_method.name;
                this.form.payment_method = this.form.payment_method.id;
              }
              if (this.form.updatable === null) {
                this.form.updatable = true;
              }
              if (this.form.document_type && this.form.document_type.id) {
                this.form.document_type = this.form.document_type.id;
              }

              if (
                this.form.project &&
                this.form.project.id &&
                this.type !== "quotes"
              ) {
                // load legacy project
                this.form.projects = this.form.projects || [];
                if (this.form.projects.length === 0) {
                  this.form.projects.push(this.form.project);
                  this.form.project = null;
                }
              } else if (this.form.project && this.form.project.id) {
                this.form.projects = this.form.projects || [];
                this.form.projects.push({ id: this.form.project.id });
                this.projectSearch = this.form.project.name;
                this.form.project = this.form.project.id;
              }

              if (this.form.projects) {
                // every project's phases at once (issues/317)
                await Promise.all(
                  this.form.projects.filter(project => project.id).map(async project => {
                    const p = (
                      await service({ requiresAuth: true }).get(
                        `projects/${project.id}/phases`
                      )
                    ).data;
                    project.project_phases = p.project_phases.map(pp => {
                      pp.show = false;
                      return pp;
                    });
                  })
                );
                this.form.projects = this.form.projects.map(p => {
                  const { activities, ...item } = p;
                  return item;
                });
              }

              this.calculateIRPF();

              if (this.type === "payrolls") {
                this.form.code = this.form.code || payrollCode(this.form);

                this.dedications = (
                  await service({ requiresAuth: true }).get(
                    "daily-dedications?_limit=-1&users_permissions_user.id=" +
                      this.form.users_permissions_user.id
                  )
                ).data;

                this.dedication = this.dedications.find(
                  d =>
                    d.from <= moment(this.form.emitted).format("YYYY-MM-DD") &&
                    d.to >= moment(this.form.emitted).format("YYYY-MM-DD")
                );

                this.form.total = payrollTotal(this.form.total_base, this.form.ss_base);
              }

              if (this.form.state === "draft") {
                await this.calculateMinEmittedDate();
              }

              // Calculate warnings after document data is loaded
              this.$nextTick(() => {
                this.calculateDocumentWarnings();
              });

              this.isLoading = false;
            } else {
              this.$router.push({ name: "project.new" });
            }
          });
      } else {
        const serie = this.series.find(s => s.name === moment().format("YYYY"));
        if (serie) {
          this.form.serial = serie.id;
        }
        this.setDefaultPaymentMethod();

        await this.calculateMinEmittedDate();

        const verifactu = await service({ requiresAuth: true }).get(
          "verifactu"
        );

        if (
          verifactu &&
          verifactu.data &&
          (verifactu.data.mode === "test" || verifactu.data.mode === "real") &&
          this.type === "emitted-invoices"
        ) {
          this.form.verifactu = true;
        }

        // Check if document_type=4 (diet) is specified in query parameters
        if (
          this.$route.query.document_type === "4" &&
          this.type === "received-expenses"
        ) {
          this.form.document_type = 4;
          // Show diet modal after a short delay to ensure component is ready
          this.$nextTick(() => {
            this.isDietModalActive = true;
          });
        }

        this.isLoading = false;
      }
    },
    // A new document shows the payment method the API would give it anyway
    // (the first one, emitted-invoice and document lifecycles): the form
    // started empty and the draft confirmation said «Mètode de pagament: -»
    // (issues/213)
    setDefaultPaymentMethod() {
      const defaulted = ["emitted-invoices", "received-invoices", "received-expenses", "received-incomes"];
      if (this.form.payment_method || !defaulted.includes(this.type)) return;
      const first = _.minBy(this.paymentMethods || [], "id");
      if (first) this.form.payment_method = first.id;
    },
    async calculateMinEmittedDate() {
      if (this.type === "emitted-invoices") {
        const serial =
          this.form.serial && this.form.serial.id
            ? this.form.serial.id
            : this.form.serial;
        const maxDateInvoice = (
          await service({ requiresAuth: true }).get(
            `/emitted-invoices/basic?_limit=1&_sort=emitted:DESC&_where[serial_eq]=${serial}&_where[state_eq]=real`
          )
        ).data;
        this.minEmittedDate =
          maxDateInvoice.length > 0
            ? moment(maxDateInvoice[0].emitted).toDate()
            : moment()
                .subtract(25, "year")
                .toDate();

        if (this.form.state === "draft") {
          if (moment(this.form.emitted).isBefore(this.minEmittedDate)) {
            this.form.emitted = this.minEmittedDate;
          }
        }
      }
    },
    // The lists the form needs, asked at once: one after another, the
    // document itself waited for eight requests in a row (issues/307).
    async getAuxiliarData() {
      const typeFilter =
        this.type === "received-incomes" ? "income" : "expense";
      const withProducts =
        this.type === "received-incomes" ||
        this.type === "emitted-invoices" ||
        this.type === "quotes";
      const get = (url, opts = {}) =>
        service({ requiresAuth: true, ...opts }).get(url).then(r => r.data);
      const [
        series,
        paymentMethods,
        bankAccounts,
        projects,
        me,
        clients,
        documentTypes,
        products
      ] = await Promise.all([
        get("series?_sort=name:DESC"),
        get("payment-methods"),
        this.type === "payrolls" ? get("bank-accounts") : null,
        get("projects/basic?_limit=-1&_sort=name:ASC"),
        get("me", { cached: true }),
        get("contacts/basic?_limit=-1&_sort=name:ASC"),
        get(
          `document-types?_where[type_eq]=${typeFilter}&_limit=-1&_sort=name:ASC`,
          { cached: true }
        ),
        withProducts ? get("products?_limit=-1&_sort=code:ASC") : null
      ]);

      this.series = series;
      this.paymentMethods = paymentMethods;
      if (this.type === "payrolls") {
        this.bankAccounts = bankAccounts;
      }
      if (me && me.quotes && me.quotes.id) {
        this.quotes = me.quotes;
      }

      this.projects = this.form.id
        ? projects
        : projects
            .filter(
              p => p.project_state && p.project_state.can_assign_documents
            )
            .filter(p => !p.is_mother);

      this.clients = clients;
      this.documentTypes = documentTypes;

      if (this.documentTypes.length && !this.form.document_type) {
        this.form.document_type = this.documentTypes[0].id;
      }

      if (withProducts) {
        this.products = products.map(p => {
          return { ...p, namecode: `${p.code} - ${p.name}` };
        });
      }
    },
    async refreshClients() {
      this.clients = (
        await service({ requiresAuth: true }).get(
          "contacts/basic?_limit=-1&_sort=name:ASC"
        )
      ).data;
    },
    async refreshProjects() {
      const projects = (
        await service({ requiresAuth: true }).get(
          "projects/basic?_limit=-1&_sort=name:ASC"
        )
      ).data;

      this.projects = this.form.id
        ? projects
        : projects
            .filter(
              p => p.project_state && p.project_state.can_assign_documents
            )
            .filter(p => !p.is_mother);
    },
    input(v) {},
    async submit(exit) {

      this.isLoading = true;
      this.canEditDraft = false;

      // quantities with the 2 decimals they are stored with (issues/295)
      if (this.type !== "payrolls") {
        documentTotals.storeLineQuantities(this.form.lines, this.form.projects, documentLineQuantity);
      }

      const isInvalid =
        (this.type !== "payrolls" &&
          (!this.form.emitted ||
            !this.form.contact ||
            !this.form.projects ||
            !this.form.projects.length ||
            !this.form.serial)) ||
        (this.type === "payrolls" && !this.form.emitted);

      try {
        this.form.user_last = this.user.id;
        if (this.form.id) {
          if (isInvalid) {
            this.$buefy.snackbar.open({
              message:
                "Error. Serie, Emissió, Clienta i Projecte són dades obligatòries",
              queue: false
            });
            this.isLoading = false;
            return;
          }

          const assignedToProjectPhase =
            this.type !== "payrolls" &&
            this.validateIfProjectPhasesHasDocument();

          if (this.type !== "payrolls" && !assignedToProjectPhase) {
            this.$buefy.snackbar.open({
              message:
                "Error. La factura no està assignada a cap línia del projecte",
              queue: false
            });
            this.isLoading = false;
            return;
          }

          this.isLoading = true;

          await service({ requiresAuth: true }).put(
            `${this.type}/${this.form.id}`,
            documentPayload(documentDatesForApi(this.form))
          );

          if (this.shouldSaveProject && this.type !== "payrolls") {
            const projects = JSON.parse(JSON.stringify(this.form.projects));
            await this.updateProjectPhases(this.form.id, projects);
          }

          this.numberEditable = false;
          this.isLoading = false;

          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          if (exit) {
            const routeName =
              this.type === "emitted-invoices" ||
              this.type === "received-incomes"
                ? "emitted.invoices.view"
                : "received.invoices.view";
            this.$router.push({
              name: routeName
            });
          } else {
            this.shouldSaveProject = false;
            this.getData();
          }
        } else {
          if (
            !this.form.emitted ||
            !this.form.contact ||
            (this.form.contact && this.form.contact.id === 0) ||
            !this.form.serial ||
            !this.form.projects ||
            !this.form.projects.length
          ) {
            this.$buefy.snackbar.open({
              message:
                "Error. Serie, Emissió, Clienta i Projecte són dades obligatòries",
              queue: false
            });
            this.isLoading = false;
            return;
          }

          // a rectificative only goes in a series flagged rectificative (issues/257)
          if (this.form.rectified_invoice && !isRectificativeSerial(this.series, this.form.serial)) {
            this.$buefy.snackbar.open({
              message:
                "Error. Una factura rectificativa ha d'anar en una sèrie marcada com a rectificativa. Creeu-ne una des de l'àrea d'administració.",
              queue: false
            });
            this.isLoading = false;
            return;
          }

          if (
            !this.form.contact ||
            (this.form.contact && this.form.contact.id === 0) ||
            (this.form.contact && !this.form.contact.nif)
          ) {
            this.$buefy.snackbar.open({
              message: "Error. La clienta ha de tenir NIF o CIF",
              queue: false
            });
            this.isLoading = false;
            return;
          }

          const assignedToProjectPhase = this.validateIfProjectPhasesHasDocument();

          if (!assignedToProjectPhase) {
            this.$buefy.snackbar.open({
              message:
                "Error. La factura no està assignada a cap línia del projecte",
              queue: false
            });
            this.isLoading = false;
            return;
          }

          const projects = [...this.form.projects];
          if (this.form.projects) {
            this.form.projects = this.form.projects.map(p => {
              const { activities, ...item } = p;
              return item;
            });
          }

          this.isLoading = true;

          const newProject = await service({ requiresAuth: true }).post(
            this.type,
            documentPayload(documentDatesForApi(this.form))
          );

          if (this.shouldSaveProject) {
            await this.updateProjectPhases(newProject.data.id, projects);
          }

          this.numberEditable = false;
          this.isLoading = false;

          this.shouldSaveProject = false;
          // this.$router.push({
          //   name: `document.edit`,
          //   params: { id: newProject.data.id, type: this.type },
          // });

          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          if (exit) {
            const routeName =
              this.type === "emitted-invoices" ||
              this.type === "received-incomes"
                ? "emitted.invoices.view"
                : "received.invoices.view";
            this.$router.push({
              name: routeName
            });
          } else {
            this.$router.push({
              name: `document.edit`,
              params: { id: newProject.data.id, type: this.type }
            });
          }
        }
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error",
          queue: false
        });
        this.isLoading = false;
      }
    },
    clientSelected(option) {
      if (!option || !option.id) {
        this.form.contact = null;
      }
      if (option) {
        delete option.projects;
        delete option.quotes;
        delete option.projectes;
        this.form.contact = option;
        this.contact = option;

        setTimeout(() => {
          this.calculateIRPF();
        }, 100);
      }
    },
    async calculateIRPF() {
      this.personIrpf = 0;
      if (
        this.filteredClients.length === 1 &&
        this.filteredClients[0].users_permissions_user &&
        this.form.document_type === 4 &&
        this.form.emitted
      ) {
        const user = this.filteredClients[0].users_permissions_user;

        if (user) {
          this.dedicationsDiets = (
            await service({ requiresAuth: true }).get(
              "daily-dedications?_limit=-1&users_permissions_user.id=" + user.id
            )
          ).data;

          const dedication = this.dedicationsDiets.find(
            d =>
              d.from <= moment(this.form.emitted).format("YYYY-MM-DD") &&
              d.to >= moment(this.form.emitted).format("YYYY-MM-DD")
          );
          if (dedication) {
            this.personIrpf = dedication.pct_irpf;
          }
        }
      }
    },
    async projectSelected(option) {
      if (!option) {
        return;
      }

      this.form.projects = this.form.projects || [];

      if (!this.form.projects.find(c => c.id === option.id)) {
        this.isLoadingProject = true;
        const project = (
          await service({ requiresAuth: true }).get(
            `projects/${option.id}/phases`
          )
        ).data;

        if (this.type !== "quote") {
          this.form.projects = this.form.projects || [];
        }

        if (!this.form.projects.find(p => p.id === project.id)) {
          this.form.projects.push(project);
        }

        if (this.type !== "quotes") {
          this.projectSearch = "";
        } else {
          this.form.project = option.id;
        }

        // this.projectCopy = this.project;
        this.isLoadingProject = false;
      } else {
        setTimeout(async () => {
          this.projectSearch = "";
        }, 100);
      }
    },
    methodSelected(option) {
      this.form.payment_method = option;
    },
    productSelected(option, line) {
      // this.form.payment_method = option;
      // const option = line.productSearch
      line.product = option.id;
      line.concept = option.name;
      line.base = option.base;
      line.vat = option.vat;
      // setTimeout(async () => {
      //     this.productSearch = "";
      //   }, 100);
    },
    phasesUpdated(info) {
      this.shouldSaveProject = true;
      const project = this.form.projects.find(p => p.id === info.projectId);

      project.project_phases = [...info.phases];
      project.project_phases_info = {
        deletedPhases: info.deletedPhases || [],
        deletedIncomes: info.deletedIncomes || [],
        deletedExpenses: info.deletedExpenses || [],
        deletedHours: []
      };
      project._project_phases_updated = true;

      // Calculate warnings for this document across all projects
      this.calculateDocumentWarnings();
    },
    calculateDocumentWarnings() {
      // Only calculate warnings for saved documents
      if (!this.form.id) {
        return;
      }


      // Sum all phase lines that reference this document across ALL projects
      let totalAssignedIncomes = 0;
      let totalAssignedExpenses = 0;
      const matchedIncomeLines = [];
      const matchedExpenseLines = [];

      // payrolls have no projects
      (this.form.projects || []).forEach(project => {
        if (!project.project_phases) return;

        project.project_phases.forEach(phase => {
          // Check incomes
          if (phase.incomes) {
            phase.incomes.forEach(income => {
              let isMatched = false;

              // Check if this income line references our document
              if (
                this.type === "emitted-invoices" &&
                income.invoice &&
                income.invoice.id === this.form.id
              ) {
                isMatched = true;
              } else if (
                this.type === "received-incomes" &&
                income.income &&
                income.income.id === this.form.id
              ) {
                isMatched = true;
              } else if (
                this.type === "received-grants" &&
                income.grant &&
                income.grant.id === this.form.id
              ) {
                isMatched = true;
              }

              if (isMatched) {
                const lineTotal = budgetLineTotal(income);
                totalAssignedIncomes += lineTotal;
                matchedIncomeLines.push({
                  projectId: project.id,
                  phaseId: phase.id,
                  incomeId: income.id,
                  concept: income.concept,
                  lineTotal,
                  line: income
                });
              }
            });
          }

          // Check expenses
          if (phase.expenses) {
            phase.expenses.forEach(expense => {
              let isMatched = false;

              // Check if this expense line references our document
              if (
                this.type === "received-invoices" &&
                expense.invoice &&
                expense.invoice.id === this.form.id
              ) {
                isMatched = true;
              } else if (
                this.type === "received-expenses" &&
                expense.expense &&
                expense.expense.id === this.form.id
              ) {
                isMatched = true;
              } else if (
                this.type === "tickets" &&
                expense.ticket &&
                expense.ticket.id === this.form.id
              ) {
                isMatched = true;
              } else if (
                this.type === "diets" &&
                expense.diet &&
                expense.diet.id === this.form.id
              ) {
                isMatched = true;
              }

              if (isMatched) {
                const lineTotal = budgetLineTotal(expense);
                totalAssignedExpenses += lineTotal;
                matchedExpenseLines.push({
                  projectId: project.id,
                  phaseId: phase.id,
                  expenseId: expense.id,
                  concept: expense.concept,
                  lineTotal,
                  line: expense
                });
              }
            });
          }
        });
      });

      // Determine which total to use based on document type
      const isIncomeType = [
        "emitted-invoices",
        "received-incomes",
        "received-grants"
      ].includes(this.type);
      const totalAssigned = isIncomeType
        ? totalAssignedIncomes
        : totalAssignedExpenses;
      const matchedLines = isIncomeType
        ? matchedIncomeLines
        : matchedExpenseLines;

      // Calculate if there's a warning (difference > 0.01€), in whole cents:
      // 78.18 - 78.17 is 0.010000000000005. Same rule as the backend, which
      // recomputes it when the project lines change (issues/094)
      const diff = Math.abs(this.totalBase - totalAssigned);
      const hasWarning = Math.round(diff * 100) > 1;


      // Update warning field on all matched lines
      matchedLines.forEach(match => {
        if (match.line.warning !== hasWarning) {
          match.line.warning = hasWarning;
          match.line.dirty = true;
        }
      });
    },
    validateIfProjectPhasesHasDocument() {
      var validateIfProjectPhasesHasDocument = false;
      if (
        this.type === "quotes" ||
        (this.type === "received-expenses" && !this.form.paid)
      ) {
        return true;
      }
      this.form.projects.forEach(p => {
        if (this.type === "emitted-invoices") {
          p.project_phases.forEach(ph => {
            ph.incomes.forEach(sph => {
              if (sph.invoice && sph.invoice.id === this.form.id) {
                validateIfProjectPhasesHasDocument = true;
              } else if (sph.assign) {
                if (!this.form.estimated_payment && sph.date) {
                  // not before the emission date (issues/256)
                  this.form.estimated_payment = estimatedPaymentFrom(sph.date, this.form.emitted);
                }
                validateIfProjectPhasesHasDocument = true;
              }
            });
          });
        } else if (this.type === "received-incomes") {
          p.project_phases.forEach(ph => {
            ph.incomes.forEach(sph => {
              if (sph.income && sph.income.id === this.form.id) {
                validateIfProjectPhasesHasDocument = true;
              } else if (sph.assign) {
                if (!this.form.estimated_payment && sph.date) {
                  // not before the emission date (issues/256)
                  this.form.estimated_payment = estimatedPaymentFrom(sph.date, this.form.emitted);
                }
                validateIfProjectPhasesHasDocument = true;
              }
            });
          });
        } else if (this.type === "received-invoices") {
          p.project_phases.forEach(ph => {
            ph.expenses.forEach(sph => {
              if (sph.invoice && sph.invoice.id === this.form.id) {
                validateIfProjectPhasesHasDocument = true;
              } else if (sph.assign) {
                validateIfProjectPhasesHasDocument = true;
              }
            });
          });
        } else if (this.type === "received-expenses") {
          p.project_phases.forEach(ph => {
            ph.expenses.forEach(sph => {
              if (sph.expense && sph.expense.id === this.form.id) {
                validateIfProjectPhasesHasDocument = true;
              } else if (sph.assign) {
                validateIfProjectPhasesHasDocument = true;
              }
            });
          });
        }
      });

      return validateIfProjectPhasesHasDocument;
    },
    async updateProjectPhases(id, projects) {
      if (this.type === "quotes") {
        return;
      }

      // this.form.projects.forEach(async p => {
      for (let i = 0; i < projects.length; i++) {
        let p = projects[i];
        let updateProject = false;
        if (this.type === "emitted-invoices") {
          p.project_phases.forEach(ph => {
            ph.incomes.forEach(sph => {
              if (sph.assign) {
                sph.invoice = id;
                updateProject = true;
              }
            });
          });
        } else if (this.type === "received-incomes") {
          p.project_phases.forEach(ph => {
            ph.incomes.forEach(sph => {
              if (sph.assign) {
                sph.income = id;
                updateProject = true;
              }
            });
          });
        } else if (this.type === "received-invoices") {
          p.project_phases.forEach(ph => {
            ph.expenses.forEach(sph => {
              if (sph.assign) {
                sph.invoice = id;
                updateProject = true;
              }
            });
          });
        } else if (this.type === "received-expenses") {
          p.project_phases.forEach(ph => {
            ph.expenses.forEach(sph => {
              if (sph.assign) {
                sph.expense = id;
                updateProject = true;
              }
            });
          });
        }

        p.project_phases.forEach(ph => {
          if (ph.expenses) {
            ph.expenses.forEach(sph => {
              if (
                sph.grant !== null &&
                typeof sph.grant === "object" &&
                !sph.grant.id
              ) {
                sph.grant = null;
              }
              if (
                sph.income !== null &&
                typeof sph.income === "object" &&
                !sph.income.id
              ) {
                sph.income = null;
              }
              if (
                sph.invoice !== null &&
                typeof sph.invoice === "object" &&
                !sph.invoice.id
              ) {
                sph.invoice = null;
              }
              if (
                sph.expense !== null &&
                typeof sph.expense === "object" &&
                !sph.expense.id
              ) {
                sph.expense = null;
              }
              if (
                sph.diet !== null &&
                typeof sph.diet === "object" &&
                !sph.diet.id
              ) {
                sph.diet = null;
              }
            });
            ph.incomes.forEach(sph => {
              if (
                sph.grant !== null &&
                typeof sph.grant === "object" &&
                !sph.grant.id
              ) {
                sph.grant = null;
              }
              if (
                sph.income !== null &&
                typeof sph.income === "object" &&
                !sph.income.id
              ) {
                sph.income = null;
              }
              if (
                sph.invoice !== null &&
                typeof sph.invoice === "object" &&
                !sph.invoice.id
              ) {
                sph.invoice = null;
              }
              if (
                sph.expense !== null &&
                typeof sph.expense === "object" &&
                !sph.expense.id
              ) {
                sph.expense = null;
              }
              if (
                sph.diet !== null &&
                typeof sph.diet === "object" &&
                !sph.diet.id
              ) {
                sph.diet = null;
              }
            });
          }
        });

        await service({ requiresAuth: true }).put(`projects/${p.id}`, {
          project_phases: p.project_phases,
          project_phases_info: p.project_phases_info,
          _project_phases_updated: true
        });
      }
    },
    // undoProject() {
    //   this.isLoadingProject = true;
    //   setTimeout(() => {
    //     this.project = this.projectCopy;
    //     this.isLoadingProject = false;
    //     this.shouldSaveProject();
    //   }, 100);
    // },
    removeProject(option) {
      this.$buefy.dialog.confirm({
        message:
          "Estàs segura d'eliminar el projecte? Aquesta acció eliminarà també la línia associada al document i guardarà el projecte.",
        onConfirm: async () => {
          this.isLoadingProject = true;

          try {
            // Find the project to be removed
            const projectToRemove = this.form.projects.find(
              p => p.id === option.id
            );

            if (
              projectToRemove &&
              projectToRemove.project_phases &&
              this.form.id
            ) {
              // Check each project phase for incomes/expenses that reference this document
              let deletedIncomes = [];
              let deletedExpenses = [];
              projectToRemove.project_phases.forEach(phase => {
                // Check incomes
                if (phase.incomes) {
                  deletedIncomes = phase.incomes.filter(income => {
                    return income.invoice && income.invoice.id === this.form.id;
                  });
                  phase.incomes = phase.incomes.filter(income => {
                    return !(
                      income.invoice && income.invoice.id === this.form.id
                    );
                  });
                }

                // Check expenses
                if (phase.expenses) {
                  deletedExpenses = phase.expenses.filter(expense => {
                    return (
                      expense.invoice && expense.invoice.id === this.form.id
                    );
                  });
                  phase.expenses = phase.expenses.filter(expense => {
                    return !(
                      expense.invoice && expense.invoice.id === this.form.id
                    );
                  });
                }
              });

              // Mark that project phases have been updated so they get saved
              this.shouldSaveProject = true;
              projectToRemove._project_phases_updated = true;
              projectToRemove.project_phases_info = {
                deletedPhases: [],
                deletedIncomes: deletedIncomes.map(i => i.id),
                deletedExpenses: deletedExpenses.map(e => e.id),
                ...(projectToRemove.project_phases_info || {})
              };

              if (deletedIncomes.length > 0 || deletedExpenses.length > 0) {
                // Save the project with the updated phases
                await this.updateProjectPhases(this.form.id, [projectToRemove]);
                this.$buefy.snackbar.open({
                  message:
                    "Projecte actualitzat després d'eliminar les línies associades.",
                  queue: false
                });
              }
            }

            // Remove the project from the form
            this.form.projects = this.form.projects.filter(
              c => c.id !== option.id
            );
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error al guardar el projecte",
              queue: false
            });
          } finally {
            this.isLoadingProject = false;
          }
        },
        onCancel: () => {
          // Do nothing if cancelled
        }
      });
    },
    editNumber() {
      if (!this.form.code) {
        this.numberEditable = !this.numberEditable;
      } else {
        this.$buefy.snackbar.open({
          message: "Número no editable",
          queue: false
        });
      }
    },
    canEditDocument(exit) {
      if (this.type === "emitted-invoices" && !this.form.id) {
        this.exitAfterSave = exit;
        this.toReal = false;

        this.isModalActive = true;
      } else if (
        moment().isAfter(
          moment(this.form.emitted)
            .endOf("quarter")
            .add(20, "day")
        )
      ) {
        // if (moment().format('YYYY-DD-MM') > moment(this.form.emitted).endOf('quarter').add(20, 'day').format('YYYY-DD-MM'))  {
        this.$buefy.dialog.confirm({
          message:
            "El document està fora del període d'edició. Vols guardar igualment?",
          onConfirm: () => this.submit(exit),
          onCancel: () => {
            return false;
          }
        });
      } else {
        this.submit(exit);
      }
    },
    async setReal() {
      this.toReal = true;
      this.isModalActive = true;
    },
    async doSetReal() {
      const theInvoice = await service({ requiresAuth: true }).put(
        `${this.type}/${this.form.id}`,
        {
          state: "real",
          code: "ESBORRANY",
          serial: this.form.serial,
          user_last: this.user.id,
          emitted: documentDatesForApi({ emitted: this.form.emitted }).emitted
        }
      );

      const pdf = (
        await service({ requiresAuth: true }).get(
          `/emitted-invoices/pdf/${this.entity}/${this.form.id}`
        )
      ).data;
      this.pdf = true;
      this.form.pdf = pdf.url; // Save the updated PDF URL

      this.form.state = theInvoice.data.state;
      this.form.code = theInvoice.data.code;

      await this.updateDraftLine();

      this.$buefy.snackbar.open({
        message: "Factura emesa correctament",
        queue: false
      });
      scrollTo(0, 0);
      this.getData();
    },
    async updateDraftLine() {
      // Update project phases with correct invoice number
      let needsProjectUpdate = false;
      const updatedProjects = [];

      for (const project of this.form.projects) {
        if (project.project_phases) {
          let projectNeedsUpdate = false;
          const updatedProject = JSON.parse(JSON.stringify(project));

          updatedProject.project_phases.forEach(phase => {
            if (phase.incomes) {
              phase.incomes.forEach(income => {
                // Check if this income is linked to the current invoice and has #ESBORRANY# in concept
                if (
                  income.invoice &&
                  income.invoice.id === this.form.id &&
                  income.concept &&
                  income.concept.includes("#ESBORRANY#")
                ) {
                  // Replace #ESBORRANY# with the actual invoice number
                  income.concept = income.concept.replace(
                    "#ESBORRANY#",
                    "#" + this.form.code + "#"
                  );
                  income.dirty = true;
                  projectNeedsUpdate = true;
                  needsProjectUpdate = true;
                }
              });
            }
          });

          if (projectNeedsUpdate) {
            updatedProject._project_phases_updated = true;
            updatedProject.project_phases_info = {
              deletedPhases: [],
              deletedIncomes: [],
              deletedExpenses: [],
              deletedHours: [],
              ...(updatedProject.project_phases_info || {})
            };
            updatedProjects.push(updatedProject);
          }
        }
      }

      // Update project phases if needed
      if (needsProjectUpdate && updatedProjects.length > 0) {
        try {
          await this.updateProjectPhases(this.form.id, updatedProjects);
          // Update local form data with the updated projects
          updatedProjects.forEach(updatedProject => {
            const localProject = this.form.projects.find(
              p => p.id === updatedProject.id
            );
            if (localProject) {
              localProject.project_phases = updatedProject.project_phases;
            }
          });
        } catch (err) {
          console.error("Error updating project phases:", err);
          // Continue anyway, don't block the invoice emission
        }
      }
    },
    sendSubmitEmittedInvoice() {
      this.submit(this.exitAfterSave);
    },
    // "Cancel·lar", an outside click or Escape in the "Nova Dieta" modal: close it
    // and stay on the (empty) expense form (issues/048)
    handleDietModalCancel() {
      this.isDietModalActive = false;
    },
    async handleDietSubmit(dietData) {
      // Populate the form with diet data
      this.isDietModalActive = false;


      // Find the selected user contact
      const selectedContact = this.clients.find(
        client =>
          client.users_permissions_user &&
          client.users_permissions_user.id === dietData.user
      );

      if (selectedContact) {
        this.form.contact = selectedContact.id;
        this.clientSearch = selectedContact.name;
        this.contact = selectedContact;

        this.clientSelected(selectedContact);
      }

      // Set project
      // Loaded with its phases like a project picked in the form: the basic
      // object had none, so «DETALL DEL PROJECTE» showed no budget lines to
      // assign the diet to until it was saved (issues/280)
      if (dietData.project) {
        this.form.projects = [];
        await this.projectSelected(dietData.project);
      }

      // Set emission date
      this.form.emitted = dietData.date;

      // this.personIrpf
      await this.calculateIRPF();

      // Create diet lines based on kilometers
      this.form.lines = [
        {
          concept: `${dietData.concept} - sense IRPF`,
          base: parseFloat(
            (this.quotes.diet_amount_without_irpf || 0).toFixed(4)
          ),
          quantity: dietData.kilometers,
          discount: 0,
          vat: 0,
          irpf: 0,
          comments: "",
          show: false,
          date: dietData.date
        },
        {
          concept: `${dietData.concept} - amb IRPF`,
          base: parseFloat(
            (
              (this.quotes.diet_amount_total || 0) -
              (this.quotes.diet_amount_without_irpf || 0)
            ).toFixed(4)
          ),
          quantity: dietData.kilometers,
          discount: 0,
          vat: 0,
          irpf: this.personIrpf || 0,
          comments: "",
          show: false,
          date: dietData.date
        }
      ];

      // setTimeout(() => this.submit(false), 200);
    },
    navNew() {
      // id 0 = new contact. Without it Vue Router 4 reuses the document's id
      // and opens an unrelated contact (issues/024)
      let routeData = this.$router.resolve({ name: "contacts.edit", params: { id: 0 } });
      window.open(routeData.href, "_blank");
    },
    async uploaded(info) {
      this.editingDocuments = true;
      if (info.refId && info.refId > 0) {
        const document = (
          await service({ requiresAuth: true }).get(
            `${this.type}/${info.refId}`
          )
        ).data;
        this.form.documents = document.documents;
      } else {
        this.form.documents = info.documents;
      }
      this.editingDocuments = false;
    },
    removeImage(doc) {
      this.editingDocuments = true;
      this.form.documents = this.form.documents.filter(d => d.id !== doc.id);
      setTimeout(() => (this.editingDocuments = false), 100);
    },
    fixDecimals(field, value) {
      if (value && value.toString().includes(",")) {
        this.form[field] = value.toString().replace(",", ".");
      }
    },
    fixDecimalsPayroll(field, value) {
      this.fixDecimals(field, value);
      this.form.net_base = (
        parseFloat(this.form.total_base) -
        parseFloat(this.form.irpf_base) -
        parseFloat(this.form.other_base)
      ).toFixed(2);
      this.form.total = payrollTotal(this.form.total_base, this.form.ss_base);
    },
    async getPDF() {
      const pdf = (
        await service({ requiresAuth: true }).get(
          `/emitted-invoices/pdf/${this.entity}/${this.form.id}`
        )
      ).data;
      this.pdf = true;
      window.open(this.apiUrl + pdf.url);
    },
    async sendInvoiceByEmail() {
      this.isLoading = true;
      try {
        await this.canEditDocument(false);

        const pdf = (
          await service({ requiresAuth: true }).get(
            `/emitted-invoices/pdf/${this.entity}/${this.form.id}`
          )
        ).data;
        this.pdf = true;


        await service({ requiresAuth: true }).post(
          `/emitted-invoices/send-email/${this.form.id}`
        );

        // this.isLoading = false;
        this.$buefy.snackbar.open({
          message: "Correu enviat",
          queue: false
        });

        this.form.sent_date = new Date();
        this.form.sent = true;
        // the backend recorded the email (issues/161)
        this.historyKey++;

        this.canEditDocument(false);
      } catch (err) {
        console.error(err);
        this.isLoading = false;
        this.$buefy.snackbar.open({
          message: err.msg || "Error a l'enviar correu",
          queue: false
        });
      }
    },
    createRectificativeInvoice() {
      const previousForm = JSON.parse(JSON.stringify(this.form));
      this.form.id = 0;
      this.form.state = "draft";
      this.form.code = null;
      this.form.number = null;
      this.form.emitted = moment().toDate();
      const rectificative = rectificativeSerial(this.series, this.form.emitted);
      this.series = rectificative.series;
      this.form.serial = rectificative.serial;
      if (rectificative.serial) this.calculateMinEmittedDate();
      if (this.series.length === 0) {
        this.$buefy.snackbar.open({
          message:
            "No hi ha cap sèrie rectificativa. Si us plau, creeu una sèrie rectificativa des de l'àrea d'administració.",
          queue: false
        });
      } else if (rectificative.missingYear) {
        this.$buefy.snackbar.open({
          message: `No hi ha cap sèrie rectificativa de ${rectificative.year}: la factura es numerarà a la sèrie ${rectificative.serialName}. Si en voleu una de ${rectificative.year}, creeu-la des de l'àrea d'administració (marcada com a rectificativa).`,
          queue: false,
          indefinite: true
        });
      }
      // Save reference to the original invoice being rectified
      this.form.rectified_invoice = previousForm.id;
      this.form.rectification_reason_code = "80";
      this.form.rectification_reason = `Rectificativa de la factura ${previousForm.code}`;
      this.form.rectification_method_code = "01";
      this.form.sent = false;
      this.form.sent_date = null;
      this.form.paid = false;
      this.form.paid_date = null;
      this.form.contact = this.contact;
      this.user_last = this.user.id;
      this.form.lines = this.form.lines.map(l => {
        return {
          ...l,
          id: 0,
          quantity: -1 * l.quantity
        };
      });
      this.form.comments = `Rectificativa de la factura ${previousForm.code}`;

      this.form.projects = [];

      this.editingDocuments = true;

      setTimeout(() => {
        this.form.projects = [...previousForm.projects];
        scrollTo(0, 0);
      }, 300);
    },
    duplicateInvoice() {
      const previousForm = JSON.parse(JSON.stringify(this.form));
      this.form.id = 0;
      this.form.state = "draft";
      this.form.code = null;
      this.form.number = null;
      this.form.emitted = moment().toDate();

      this.form.sent = false;
      this.form.sent_date = null;
      this.form.paid = false;
      this.form.paid_date = null;
      this.form.contact = this.contact;
      this.user_last = this.user.id;

      this.editingDocuments = false;
      this.canEditDraft = true;

      setTimeout(() => {
        this.canEditDraft = true;
        scrollTo(0, 0);
      }, 300);
    },
    deleteInvoice() {
      this.$buefy.dialog.confirm({
        message: "Vols esborrar l'esborrany de factura?",
        onConfirm: async () => {
          try {
            await service({ requiresAuth: true }).delete(
              `${this.type}/${this.form.id}`
            );
            this.$buefy.snackbar.open({
              message: "Factura esborrada",
              queue: false
            });
            this.$router.push({ name: "emitted.invoices.view" });
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error a l'esborrar la factura",
              queue: false
            });
          }
        },
        onCancel: () => {
          return false;
        }
      });
    },
    // ===== PDF invoice parser (Z.ai) =====
    onInvoiceUploadClick() {
      // Reset the input so selecting the same file twice still fires `change`.
      if (this.$refs.invoicePdfInput) {
        this.$refs.invoicePdfInput.value = "";
        this.$refs.invoicePdfInput.click();
      }
    },
    async onInvoicePdfSelected(event) {
      const file =
        event && event.target && event.target.files && event.target.files[0];
      if (!file) return;

      this.isParsingInvoice = true;
      this.parsedInvoice = null;

      try {
        const formData = new FormData();
        formData.append("file", file, file.name);

        const response = await service({
          requiresAuth: true,
          multipart: true
        }).post(`${this.type}/upload`, formData);

        const data = response && response.data;
        const invoice =
          data && data.data
            ? data.data
            : data && data.invoice
            ? data.invoice
            : data;

        this.parsedInvoice = invoice;
        // Check the extracted tax id against existing contacts (by nif).
        this.invoiceMatchedContact = this.findContactByTaxId(
          invoice && invoice.vendor_tax_id
        );
        this.isInvoiceModalActive = true;
      } catch (error) {
        console.error("Invoice parse error", error);
        const message =
          (error && error.data && error.data.message) ||
          (error && error.message) ||
          "No s'ha pogut processar la factura PDF.";

        this.$buefy.snackbar.open({
          message: `Error: ${message}`,
          type: "is-danger",
          queue: false
        });
      } finally {
        this.isParsingInvoice = false;
      }
    },
    closeInvoiceModal() {
      this.isInvoiceModalActive = false;
    },
    /**
     * Normalize a Spanish tax id by stripping anything that is not a letter or
     * digit (spaces, dashes, dots) and lowercasing it, so that "B-73347494",
     * "B73347494" and "b73347494" all match.
     */
    normalizeTaxId(value) {
      if (!value) return "";
      return String(value)
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
    },
    /**
     * Find an existing contact whose `nif` matches the given vendor tax id.
     * Returns the contact object or null.
     */
    findContactByTaxId(taxId) {
      const normalized = this.normalizeTaxId(taxId);
      if (!normalized) return null;
      return (
        this.clients.find(c => this.normalizeTaxId(c.nif) === normalized) ||
        null
      );
    },
    formatInvoiceDate(value) {
      if (!value) return "—";
      const parsed = moment(value, [
        "YYYY-MM-DD",
        "DD/MM/YYYY",
        "DD-MM-YYYY"
      ]);
      return parsed.isValid()
        ? parsed.format("DD/MM/YYYY")
        : String(value);
    },
    applyParsedInvoice() {
      const data = this.parsedInvoice;
      if (!data) {
        this.isInvoiceModalActive = false;
        return;
      }

      // Invoice number from provider
      if (data.invoice_number) {
        this.form.contact_invoice_number = String(data.invoice_number);
      }

      // Dates (parse to Date objects, format expected: YYYY-MM-DD)
      if (data.invoice_date) {
        const parsed = moment(data.invoice_date, ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"]);
        if (parsed.isValid()) {
          this.form.emitted = parsed.toDate();
        }
      }
      if (data.due_date) {
        const parsed = moment(data.due_date, ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"]);
        if (parsed.isValid()) {
          this.form.paybefore = parsed.toDate();
        }
      }

      // Vendor -> prefer the contact matched by tax id, otherwise fall back
      // to a fuzzy match on the vendor name.
      const contact =
        this.invoiceMatchedContact ||
        (data.vendor_name
          ? this.clients.find(
              c =>
                c.name &&
                c.name
                  .toLowerCase()
                  .includes(String(data.vendor_name).toLowerCase())
            )
          : null);
      if (contact) {
        this.form.contact = contact.id;
        this.clientSearch = contact.name;
        this.contact = contact;
      }

      // Line items
      if (Array.isArray(data.line_items) && data.line_items.length > 0) {
        const pricesIncludeTax = data.prices_include_tax === true;
        this.form.lines = data.line_items.map(item => {
          const vat = parseFloat(item.vat_rate) || 0;
          let unitPrice = parseFloat(item.unit_price) || 0;
          // If the invoice prints prices with tax included (gross), convert
          // to the net/tax-exclusive unit price the form expects in `base`.
          if (pricesIncludeTax && vat > 0) {
            unitPrice = unitPrice / (1 + vat / 100);
          }
          return {
            concept: item.description || "",
            quantity: parseFloat(item.quantity) || 1,
            base: unitPrice,
            discount: 0,
            vat: vat,
            irpf: 0,
            comments: "",
            show: false,
            date: new Date(),
            product: null,
            productSearch: ""
          };
        });
      }

      this.isInvoiceModalActive = false;
      this.$buefy.snackbar.open({
        message: "Dades aplicades al formulari",
        queue: false
      });
    }
  }
};
</script>
<style scoped>
/* Redesign A */
.document-form {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.document-form > .section.is-main-section {
  flex: 1;
}
.lock-note {
  display: flex;
  align-items: flex-start;
  gap: .625rem;
  font-size: .875rem;
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
.document-fields :deep(.project-tags) {
  margin-top: -.5rem;
}
.document-fields :deep(.project-tags > .field-label) {
  display: none;
}
.doc-notes {
  padding: 1rem 1.25rem 0;
}
/* issued invoice: locked data as text */
.doc-readonly {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.ro-item.is-full {
  grid-column: 1 / -1;
}
.ro-payment-method {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
}
.ro-draft-note {
  margin: 0;
  font-size: .875rem;
  color: var(--a-fg-2);
}
.ro-label {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .25rem;
  font-size: .875rem;
  font-weight: 700;
  color: var(--a-fg);
}
.ro-label small {
  font-size: .75rem;
  font-weight: 600;
  color: var(--a-muted);
}
.ro-lock {
  display: inline-flex;
  align-items: center;
  gap: .125rem;
  font-size: .75rem;
  font-weight: 600;
  color: var(--a-muted);
}
.ro-value {
  display: block;
  font-weight: 700;
  color: var(--a-fg);
}
.ro-client {
  margin: 0;
  color: var(--a-fg);
}
.ro-sub {
  color: var(--a-fg-2);
}
.ro-link {
  font-size: .875rem;
  font-weight: 700;
  text-decoration: underline;
}
.lines-readonly-card :deep(.card-content) {
  padding-bottom: 1.25rem;
}
.doc-notes-readonly {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--a-line-soft);
}
.doc-notes-readonly p {
  margin: 0;
  white-space: pre-line;
  color: var(--a-fg);
}

.doc-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24rem;
  gap: 1rem;
  align-items: start;
}
.doc-main,
.doc-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}
.doc-main > *,
.doc-side > * {
  margin: 0 !important;
}
.side-hint {
  font-size: .875rem;
}
.doc-below {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}
.doc-below > * {
  margin: 0 !important;
}
.no-labels :deep(.field-label),
.no-labels :deep(.field > .label) {
  display: none;
}
.side-fields {
  grid-template-columns: minmax(0, 1fr) !important;
}
.side-fields > :deep(.field) {
  grid-column: 1 / -1 !important;
}
@media screen and (max-width: 1215px) {
  .doc-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
.savebar-state {
  margin-right: auto;
  font-weight: 700;
  color: var(--a-muted);
}
</style>
<style lang="scss">
.helper {
  margin-top: 1rem;
  color: #aaa;
  font-size: 0.9rem;

  .subtitle {
    font-size: 1.1rem;
    line-height: 1rem;
    color: var(--a-muted);
    margin-left: 0.5rem;
  }
}

.is-w-30 {
  width: 30%;
}
.ml-auto {
  margin-left: auto;
}
.invoice-parser-modal {
  width: 60vw;
  min-width: 320px;
}
.invoice-parser-modal .modal-card-body {
  max-height: calc(100vh - 200px);
}
.invoice-match {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.invoice-match .icon {
  flex-shrink: 0;
}
.invoice-summary {
  margin-top: 0.5rem;
}
.invoice-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--a-muted);
  margin-bottom: 0.15rem;
}
.invoice-note {
  margin-top: 0.5rem;
  color: var(--a-muted);
}
.invoice-json {
  background: var(--a-thead);
  border: 1px solid var(--a-line);
  border-radius: 4px;
  padding: 1rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 50vh;
  overflow: auto;
}
</style>
