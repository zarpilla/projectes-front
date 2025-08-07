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
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full">
          <!-- <pre>{{form}}</pre> -->
          <card-component class="tile is-child" title="INFORMACIÓ BÀSICA">
            <b-field
              v-if="type === 'emitted-invoices'"
              label="Estat"
              horizontal
            >
              <div
                class="tag has-text-weight-bold"
                :class="form.state === 'draft' ? 'is-warning' : 'is-success'"
              >
                {{ form.state === "draft" ? "ESBORRANY" : "EMESA" }}
              </div>
            </b-field>

            <b-field label="Número" horizontal v-if="form.state !== 'draft'">
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
            </b-field>
            <b-field label="Sèrie *" horizontal v-if="type !== 'payrolls'">
              <b-select
                v-model="form.serial"
                placeholder=""
                required
                :disabled="emittedInvoiceSerieDisabled"
                @change.native="$event => calculateMinEmittedDate()"
              >
                <option v-for="(s, index) in series" :key="index" :value="s.id">
                  {{ s.name }}
                </option>
              </b-select>
            </b-field>

            <b-field label="Any" horizontal v-if="type === 'payrolls'">
              <b-input v-model="form.year.year" placeholder="" disabled />
            </b-field>

            <b-field label="Mes" horizontal v-if="type === 'payrolls'">
              <b-input v-model="form.month.month" placeholder="" disabled />
            </b-field>

            <b-field label="Persona" horizontal v-if="type === 'payrolls'">
              <b-input
                v-model="form.users_permissions_user.username"
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
                @change.native="$event => calculateIRPF($event)"
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
            <b-field label="Emissió *" horizontal>
              <b-datepicker
                @input="
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
              v-if="
                type !== 'received-incomes' &&
                  type !== 'received-expenses' &&
                  type !== 'payrolls'
              "
            >
              <b-datepicker
                :disabled="emittedInvoiceEditDisabled"
                v-model="form.paybefore"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data Venciment"
                trap-focus
                editable
                :min-date="minEmittedDate"
              >
              </b-datepicker>
            </b-field>
            <b-field
              label="Previsió cobrament"
              horizontal
              v-if="type === 'received-incomes' || type === 'emitted-invoices'"
            >
              <b-datepicker
                @input="
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
                placeholder="Data Enviament"
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
              <b-checkbox v-model="form.paid" class="checkbox-inline">
              </b-checkbox>
              <b-datepicker
                v-if="type !== 'quotes'"
                v-model="form.paid_date"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data Pagament"
                trap-focus
                editable
              >
              </b-datepicker>
            </b-field>

            <b-field v-if="type === 'quotes'" label="Acceptat" horizontal>
              <b-checkbox v-model="form.accepted" class="checkbox-inline">
              </b-checkbox>
              <b-datepicker
                v-model="form.accepted_date"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data Acceptació"
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

            <b-field
              v-if="type !== 'quotes' && type !== 'payrolls'"
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

            <b-field
              v-if="type == 'emitted-invoices' || type == 'quotes'"
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
                  class="view-button is-warning mb-3"
                  @click="navNew"
                  icon-left="plus"
                  title="Nou Contacte"
                  :disabled="emittedInvoiceEditDisabled"
                >
                </b-button>
                <b-button
                  class="view-button is-warning mb-3 ml-3"
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
                  class="view-button is-warning mb-3"
                  @click="navNew"
                  icon-left="plus"
                  title="Nou Contacte"
                >
                </b-button>
                <b-button
                  class="view-button is-warning mb-3 ml-3"
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
                  class="view-button is-warning mb-3"
                  @click="navNew"
                  icon-left="plus"
                  title="Nou Contacte"
                >
                </b-button>
                <b-button
                  class="view-button is-warning mb-3 ml-3"
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
              v-if="type !== 'payrolls'"
            >
              <b-autocomplete
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
            </b-field>
            <b-field
              label=""
              horizontal
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

            <b-field
              horizontal
              label="Adjunts"
              style="width: 100%"
              v-if="!editingDocuments"
            >
              <div
                class="file-documents columns is-multiline"
                v-if="form.documents && form.documents.length"
              >
                <!-- <pre>{{ form.documents }}</pre>   -->
                <div
                  v-for="(doc, i) in form.documents"
                  :key="i"
                  class="column"
                  :class="
                    form.documents.length > 6
                      ? 'is-2'
                      : form.documents.length > 3
                      ? 'is-3'
                      : 'is-4'
                  "
                >
                  <div class="column-doc">
                    <div
                      @click="removeImage(doc)"
                      class="remove-button clickable"
                    >
                      <b-icon icon="close" size="is-medium" />
                    </div>
                    <img
                      v-if="doc.mime.startsWith('image')"
                      :src="apiUrl + doc.url"
                      class="file-document mb-3"
                    />
                    <div v-else class="mb-3">
                      <a :href="apiUrl + doc.url" target="_blank">
                        <b-icon icon="open-in-new"></b-icon>
                        {{ doc.name }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </b-field>
            <file-upload
              :multiple="true"
              :entity="entity"
              :ref-id="form.id"
              :field="'documents'"
              :accept="'*/*'"
              @uploaded="uploaded"
              v-if="form.id"
            >
            </file-upload>
          </card-component>

          <hr />
          <card-component title="LINIES" v-if="form.lines">
            <!-- Pagination for large lists -->
            <div v-if="form.lines.length > 50" class="pagination-controls mb-3">
              <b-field grouped>
                <b-field label="Línies" class="ml-auto">
                  <b-select v-model="linesPerPage" @change="currentPage = 1">
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="99999"
                      >Totes ({{ form.lines.length }})</option
                    >
                  </b-select>
                </b-field>
                <b-field
                  label="Pàgina"
                  v-if="linesPerPage > 0"
                  class="mzl-auto"
                >
                  <b-pagination
                    v-model="currentPage"
                    :total="form.lines.length"
                    :per-page="linesPerPage"
                    size="is-small"
                  ></b-pagination>
                </b-field>
              </b-field>
            </div>
            <ul class="subphases-list">
              <li
                v-for="(line, j) in paginatedLines"
                :key="getLineKey(line, j)"
                class="subphase line mt-2 mb-2"
              >
                <b-field grouped class="is-full-width">
                  <b-field
                    v-if="form.document_type == '4'"
                    :label="j == 0 ? 'Data' : null"
                    class="medium-field"
                  >
                    <b-datepicker
                      v-model="line.date"
                      :show-week-number="false"
                      :locale="'ca-ES'"
                      :first-day-of-week="1"
                      icon="calendar-today"
                      placeholder="Data"
                      trap-focus
                      editable
                    >
                    </b-datepicker>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Concepte' : null"
                    class="subphase-detail-input-large-field"
                  >
                    <b-input
                      :disabled="emittedInvoiceEditDisabled"
                      name="SubFase"
                      placeholder="Concepte..."
                      v-model="line.concept"
                      class="subphase-detail-input subphase-detail-input-large"
                    >
                    </b-input>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Quantitat' : null"
                    class="medium-field"
                  >
                    <b-input
                      name="Unitats"
                      :disabled="emittedInvoiceEditDisabled"
                      placeholder="Quantitat, hores, unitats..."
                      v-model="line.quantity"
                      class="subphase-detail-input"
                      @input="debouncedChangeLine(line, 'quantity', $event)"
                    >
                    </b-input>
                  </b-field>
                  <b-field :label="j == 0 ? 'Preu' : null" class="medium-field">
                    <b-input
                      name="base"
                      :disabled="emittedInvoiceEditDisabled"
                      placeholder="Preu per unitat"
                      v-model="line.base"
                      class="subphase-detail-input"
                      @input="debouncedChangeLine(line, 'base', $event)"
                    >
                    </b-input>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Descompte %' : null"
                    class="medium-field"
                  >
                    <b-input
                      :disabled="emittedInvoiceEditDisabled"
                      name="discount"
                      placeholder="Descompte"
                      v-model="line.discount"
                      class="subphase-detail-input"
                      @input="debouncedChangeLine(line, 'discount', $event)"
                    >
                    </b-input>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'IVA %' : null"
                    class="medium-field"
                  >
                    <b-input
                      :disabled="emittedInvoiceEditDisabled"
                      name="vat"
                      placeholder="Preu per unitat"
                      v-model="line.vat"
                      class="subphase-detail-input"
                      @input="debouncedChangeLine(line, 'vat', $event)"
                    >
                    </b-input>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'IRPF %' : null"
                    class="medium-field"
                  >
                    <b-input
                      :disabled="emittedInvoiceEditDisabled"
                      name="irpf"
                      placeholder="Preu per unitat"
                      v-model="line.irpf"
                      class="subphase-detail-input"
                      @input="debouncedChangeLine(line, 'irpf', $event)"
                    >
                    </b-input>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Accions' : null"
                    class="medium-field"
                  >
                    <button
                      class="button is-small is-primary ml-2"
                      type="button"
                      @click.prevent="line.show = !line.show"
                    >
                      <b-icon icon="comment" size="is-small" />
                    </button>
                    <button
                      v-if="form.lines.length > 1"
                      class="button is-small is-danger ml-2"
                      type="button"
                      @click.prevent="removeLine(line, j)"
                      :disabled="emittedInvoiceEditDisabled"
                    >
                      <b-icon icon="trash-can" size="is-small" />
                    </button>
                    <button
                      v-if="isLastLineInPagination(j)"
                      class="button is-small is-primary ml-2"
                      type="button"
                      @click.prevent="addLine(line)"
                      :disabled="emittedInvoiceEditDisabled"
                    >
                      <b-icon icon="plus-circle" size="is-small" />
                    </button>
                  </b-field>
                </b-field>
                <!-- <b-field
                  grouped
                  class="is-full-width"
                  v-if="products.length > 0"
                >
                  <b-autocomplete
                    class="is-w-30"
                    v-model="line.productSearch"
                    placeholder="Escriu el codi del producte..."
                    :keep-first="false"
                    :open-on-focus="true"
                    :data="filteredProducts"
                    field="namecode"
                    @select="option => productSelected(option, line)"
                    :clearable="true"
                  >
                  </b-autocomplete>
                </b-field> -->
                <b-field
                  label="Notes"
                  grouped
                  class="line-notes is-full-width mb-5"
                  :class="line.show ? 'z' : 'is-hidden'"
                >
                  <b-input
                    type="textarea"
                    maxlength="1000"
                    :disabled="emittedInvoiceEditDisabled"
                    v-model="line.comments"
                    placeholder="Descripció del concepte"
                  />
                </b-field>
              </li>
            </ul>
            <!-- Pagination for large lists -->
            <div
              v-if="form.lines.length > 50"
              class="pagination-controls mt-5 mb-3"
            >
              <b-field grouped>
                <b-field label="Línies" class="ml-auto">
                  <b-select v-model="linesPerPage" @change="currentPage = 1">
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="99999"
                      >Totes ({{ form.lines.length }})</option
                    >
                  </b-select>
                </b-field>
                <b-field
                  label="Pàgina"
                  v-if="linesPerPage > 0"
                  class="mzl-auto"
                >
                  <b-pagination
                    v-model="currentPage"
                    :total="form.lines.length"
                    :per-page="linesPerPage"
                    size="is-small"
                  ></b-pagination>
                </b-field>
              </b-field>
            </div>
            <hr />
            <div class="summary has-background-white-ter p-4">
              <div class="is-flex is-justify-content-flex-end">
                <label>Base: </label>
                <money-format
                  :value="totalBase"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value="false"
                  :hide-subunits="false"
                >
                </money-format>
              </div>
              <div class="is-flex is-justify-content-flex-end">
                <label>IVA: </label>
                <money-format
                  :value="totalVat"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value="false"
                  :hide-subunits="false"
                >
                </money-format>
              </div>
              <div class="is-flex is-justify-content-flex-end">
                <label>IRPF: </label>
                <money-format
                  :value="totalIrpf"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value="false"
                  :hide-subunits="false"
                >
                </money-format>
              </div>
              <div
                class="is-flex is-justify-content-flex-end has-text-weight-bold mt-5"
              >
                <label>Total </label>
                <money-format
                  :value="total"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value="false"
                  :hide-subunits="false"
                >
                </money-format>
              </div>
            </div>
            <hr />

            <b-field label="Notes" horizontal message="Visibles a la factura">
              <b-input
                type="textarea"
                v-model="form.comments"
                placeholder="Notes"
                :disabled="emittedInvoiceEditDisabled"
                :maxlength="1000"
              />
            </b-field>
            <b-field
              label="Notes internes"
              horizontal
              message="No visibles a la factura"
            >
              <b-input
                type="textarea"
                v-model="form.comments_internal"
                placeholder="Notes internes"
                :maxlength="1000"
              />
            </b-field>
          </card-component>
          <card-component
            v-if="type === 'payrolls' && dedication"
            title="DETALL"
          >
            <b-field label="Salari base" horizontal>
              <b-input
                v-model="form.total_base"
                type="numeric"
                placeholder=""
                @input="fixDecimalsPayroll('total_base', form.total_base)"
              />
            </b-field>

            <b-field
              v-if="form.irpf_base"
              :label="
                `IRPF a càrrec de la treballadora (${dedication.pct_irpf}%)`
              "
              horizontal
            >
              <b-input
                v-model="form.irpf_base"
                type="numeric"
                placeholder=""
                @input="fixDecimalsPayroll('irpf_base', form.irpf_base)"
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
              :label="
                `Altres a càrrec de la treballadora (${dedication.pct_other}%)`
              "
              horizontal
            >
              <b-input
                v-model="form.other_base"
                type="numeric"
                placeholder=""
                @input="fixDecimalsPayroll('other_base', form.other_base)"
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
              :label="
                `SS a càrrec de la cooperativa ${
                  dedication.pct_quota ? '(' + dedication.pct_quota + '%)' : ''
                }`
              "
              horizontal
            >
              <b-input
                v-model="form.ss_base"
                placeholder=""
                @input="fixDecimalsPayroll('ss_base', form.ss_base)"
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

          <b-field v-if="type === 'received-expenses'">
            <b-button
              class="mr-3"
              type="is-primary"
              :loading="isLoading"
              @click="canEditDocument(false)"
              >Guardar</b-button
            >
            <b-button
              type="is-primary"
              :loading="isLoading"
              @click="canEditDocument(true)"
              v-if="form.id"
              >Guardar i sortir</b-button
            >
          </b-field>

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
                  :is-paginated="false"
                  @phases-updated="phasesUpdated"
                  :mode="
                    type === 'emitted-invoices' || type === 'received-incomes'
                      ? 'incomes'
                      : 'expenses'
                  "
                />
                <div class="helper">
                  <b-icon icon="help-circle" />

                  Cal assignar el document (factura, tiquet, dieta...) a una
                  línia de pressupost del projecte. Si la línia no existís, es
                  pot crear en aquest moment o també es pot desdoblar alguna
                  existent. Per assignar-lo, cal marcar la casella de 'Facturat'
                  i clicar al botó de 'Document'. Un cop assignat, caldrà
                  guardar la factura.
                </div>
              </div>
            </card-component>
            <hr />
          </div>

          <b-field
            v-if="
              (type !== 'payrolls' &&
                ((form.projects && form.projects.length) || form.projects)) ||
                type === 'payrolls'
            "
          >
            <b-button
              class="mr-3"
              type="is-primary"
              :loading="isLoading"
              @click="canEditDocument(false)"
              >Guardar</b-button
            >

            <b-button
              class="mr-3"
              type="is-primary"
              :loading="isLoading"
              @click="canEditDocument(true)"
              v-if="form.id"
              >Guardar i sortir</b-button
            >

            <b-button
              class="mr-3"
              type="is-primary"
              :loading="isLoading"
              @click="canEditDraft = true"
              v-if="
                form.id &&
                  entity === 'emitted-invoice' &&
                  form.state === 'draft'
              "
              :disabled="canEditDraft"
              >Editar dades de l'ESBORRANY</b-button
            >

            <b-button
              class="mr-3"
              type="is-primary"
              :loading="isLoading"
              @click="setReal()"
              v-if="
                form.id &&
                  entity === 'emitted-invoice' &&
                  form.state === 'draft'
              "
              :disabled="form.state === 'real' || canEditDraft"
              >Emetre factura (convertir a EMESA)</b-button
            >

            <b-button
              class="mr-3"
              type="is-primary"
              @click="sendInvoiceByEmail"
              v-if="form.id && entity === 'emitted-invoice'"
              :disabled="!canSendEmail || form.state !== 'real'"
            >
              Guardar i enviar factura per correu
            </b-button>
            <b-button
              class="mr-3"
              type="is-warning"
              @click="createRectificativeInvoice()"
              v-if="
                form.id && entity === 'emitted-invoice' && form.state === 'real'
              "
            >
              Anul·lar i crear factura rectificativa
            </b-button>
            <b-button
              class="mr-3"
              type="is-primary"
              @click="duplicateInvoice()"
              v-if="
                form.id && entity === 'emitted-invoice' && form.state === 'real'
              "
            >
              Duplicar factura (com a ESBORRANY)
            </b-button>
            <b-button
              class="mr-3"
              type="is-warning"
              @click="deleteInvoice()"
              v-if="
                form.id &&
                  entity === 'emitted-invoice' &&
                  form.state === 'draft'
              "
            >
              Eliminar esborrany
            </b-button>
            <b-button
              class="mr-3"
              v-if="form.id"
              type="is-primary"
              @click="getPDF"
            >
              Visualitzar PDF
            </b-button>
          </b-field>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
// External libraries
import dayjs from "dayjs";
import moment from "moment";
import _ from "lodash";
import sumBy from "lodash/sumBy";
import { mapState } from "vuex";

// Project components
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import ModalBoxEmittedInvoices from "@/components/ModalBoxEmittedInvoices";
import ModalBoxSplit from "@/components/ModalBoxSplit";
import ProjectPhases from "@/components/ProjectPhases.vue";
import MoneyFormat from "@/components/MoneyFormat.vue";
import FileUpload from "@/components/FileUpload";

// Services
import service from "@/service/index";

export default {
  name: "DocumentForm",
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat,
    ModalBoxEmittedInvoices,
    ModalBoxSplit,
    ProjectPhases,
    FileUpload
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
      appPath: process.env.VUE_APP_PATH,
      isProfileExists: false,
      isLoading: false,
      isLoadingProject: false,
      series: [],
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
      apiUrl: process.env.VUE_APP_API_URL,
      editingDocuments: false,
      personIrpf: 0,
      quotes: null,
      products: [],
      pdf: false,
      contact: null,
      isModalActive: false,
      toReal: false,
      exitAfterSave: false,
      minEmittedDate: dayjs()
        .subtract(25, "year")
        .toDate(),
      maxEmittedDate: dayjs()
        .add(4, "day")
        .toDate(),
      canEditDraft: false,
      options: null,
      user: null,
      // Pagination for large lists
      linesPerPage: 50,
      currentPage: 1,
      // Debouncing for inputs
      debouncedInputs: new Map()
    };
  },
  computed: {
    ...mapState(["me"]),
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
    totalBase() {
      return sumBy(this.form.lines, l => {
        return l.quantity * l.base * (1 - (l.discount || 0) / 100);
      });
    },
    totalVat() {
      return sumBy(this.form.lines, l => {
        return (
          (l.quantity * l.base * (1 - (l.discount || 0) / 100) * l.vat) / 100
        );
      });
    },
    totalIrpf() {
      return (
        -1 *
        sumBy(this.form.lines, l => {
          return (
            (l.quantity * l.base * (1 - (l.discount || 0) / 100) * l.irpf) / 100
          );
        })
      );
    },
    total() {
      return this.totalBase + this.totalVat + this.totalIrpf;
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
      return (
        (this.type === "emitted-invoices" &&
          this.form.id &&
          this.form.code !== "ESBORRANY") ||
        (this.type === "emitted-invoices" &&
          this.form.id &&
          this.form.code === "ESBORRANY" &&
          !this.canEditDraft)
      );
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
    paginatedLines() {
      if (this.linesPerPage === 0 || this.form.lines.length <= 50) {
        return this.form.lines;
      }
      const start = (this.currentPage - 1) * this.linesPerPage;
      const end = start + this.linesPerPage;
      return this.form.lines.slice(start, end);
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
    }
  },
  created() {
    this.getData();
  },
  beforeDestroy() {
    // Clean up any pending debounced timeouts
    this.debouncedInputs.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.debouncedInputs.clear();
  },
  methods: {
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
            base: this.quotes.diet_amount_without_irpf,
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
            base:
              this.quotes.diet_amount_total -
              this.quotes.diet_amount_without_irpf,
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
    async getData() {
      const user = await service({ requiresAuth: true }).get("/users/me");
      this.user = user.data;

      const me = await service({ requiresAuth: true }).get("me");

      this.options = me.data;
      this.$store.commit("me", {
        me: me.data
      });

      this.isLoading = true;

      await this.getAuxiliarData();

      if (this.$route.params.id && this.$route.params.id > 0) {
        service({ requiresAuth: true })
          .get(`${this.type}/${this.$route.params.id}`)
          .then(async r => {
            if (r.data && r.data.id) {
              this.isProfileExists = true;

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

              this.form = r.data;
              if (this.form.paybefore) {
                this.form.paybefore = moment(
                  this.form.paybefore,
                  "YYYY-MM-DD"
                ).toDate();
              }
              if (this.form.estimated_payment) {
                this.form.estimated_payment = moment(
                  this.form.estimated_payment,
                  "YYYY-MM-DD"
                ).toDate();
              }

              if (this.form.sent_date) {
                this.form.sent_date = moment(
                  this.form.sent_date,
                  "YYYY-MM-DD"
                ).toDate();
              }
              if (this.form.paid_date) {
                this.form.paid_date = moment(
                  this.form.paid_date,
                  "YYYY-MM-DD"
                ).toDate();
              }
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
                for await (const project of this.form.projects) {
                  if (project.id) {
                    const p = (
                      await service({ requiresAuth: true }).get(
                        `projects/${project.id}/phases`
                      )
                    ).data;
                    project.project_phases = p.project_phases;
                    project.project_phases = project.project_phases.map(pp => {
                      pp.show = false;
                      return pp;
                    });
                  }
                }
                this.form.projects = this.form.projects.map(p => {
                  const { activities, ...item } = p;
                  return item;
                });
              }

              this.calculateIRPF();

              if (this.type === "payrolls") {
                this.form.code =
                  this.form.code ||
                  `${this.form.year.year}-${this.form.month.month}-${this.form.id}`;

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

                this.form.net_date = moment(
                  this.form.net_date,
                  "YYYY-MM-DD"
                ).toDate();
                this.form.irpf_date = moment(
                  this.form.irpf_date,
                  "YYYY-MM-DD"
                ).toDate();
                this.form.ss_date = moment(
                  this.form.ss_date,
                  "YYYY-MM-DD"
                ).toDate();
                this.form.other_date = moment(
                  this.form.other_date,
                  "YYYY-MM-DD"
                ).toDate();

                this.form.total = this.form.total_base + this.form.ss_base;
              }

              if (this.form.state === "draft") {
                await this.calculateMinEmittedDate();
              }

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

        this.isLoading = false;
      }
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
            ? dayjs(maxDateInvoice[0].emitted).toDate()
            : dayjs()
                .subtract(25, "year")
                .toDate();

        if (this.form.state === "draft") {
          if (moment(this.form.emitted).isBefore(this.minEmittedDate)) {
            this.form.emitted = this.minEmittedDate;
          }
        }
      }
    },
    async getAuxiliarData() {
      // console.log("getAuxiliarData");
      this.series = (
        await service({ requiresAuth: true }).get("series?_sort=name:DESC")
      ).data;
      this.paymentMethods = (
        await service({ requiresAuth: true }).get("payment-methods")
      ).data;
      const projects = (
        await service({ requiresAuth: true }).get(
          "projects/basic?_limit=-1&_sort=name:ASC"
        )
      ).data;

      const me = (await service({ requiresAuth: true, cached: true }).get("me"))
        .data;
      // console.log('me!', me)
      if (me && me.quotes && me.quotes.id) {
        this.quotes = me.quotes;
      }

      this.projects = this.form.id
        ? projects
        : projects
            .filter(p => p.project_state && p.project_state.id !== 2)
            .filter(
              p =>
                p.mother === null ||
                (p.mother !== null && p.mother.id && p.mother.id !== p.id)
            );

      this.clients = (
        await service({ requiresAuth: true }).get(
          "contacts/basic?_limit=-1&_sort=name:ASC"
        )
      ).data;
      const typeFilter =
        this.type === "received-incomes" ? "income" : "expense";
      this.documentTypes = (
        await service({ requiresAuth: true, cached: true }).get(
          `document-types?_where[type_eq]=${typeFilter}&_limit=-1&_sort=name:ASC`
        )
      ).data;

      if (this.documentTypes.length && !this.form.document_type) {
        this.form.document_type = this.documentTypes[0].id;
      }

      if (
        this.type === "received-incomes" ||
        this.type === "emitted-invoices" ||
        this.type === "quotes"
      ) {
        const products = (
          await service({ requiresAuth: true }).get(
            "products?_limit=-1&_sort=code:ASC"
          )
        ).data;

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
    changeLine(line, field, value) {
      if (value && value.toString().includes(",")) {
        line[field] = value.toString().replace(",", ".");
      }
    },
    debouncedChangeLine(line, field, value) {
      // Create a unique key for this line and field combination
      const lineIndex = this.form.lines.indexOf(line);
      const key = `${lineIndex}-${field}`;

      // Clear any existing timeout for this field
      if (this.debouncedInputs.has(key)) {
        clearTimeout(this.debouncedInputs.get(key));
      }

      // Set new debounced timeout
      const timeoutId = setTimeout(() => {
        this.changeLine(line, field, value);
        this.debouncedInputs.delete(key);
      }, 300); // 300ms delay

      this.debouncedInputs.set(key, timeoutId);
    },
    getLineKey(line, index) {
      // Generate a stable key for each line
      return line.id || `line-${index}`;
    },
    isLastLineInPagination(index) {
      // Check if this is the last line in the current pagination view
      const isLastInPage = index === this.paginatedLines.length - 1;
      const isLastOverall =
        this.linesPerPage === 0 || this.form.lines.length <= 50
          ? index === this.form.lines.length - 1
          : (this.currentPage - 1) * this.linesPerPage + index ===
            this.form.lines.length - 1;

      return isLastInPage && isLastOverall;
    },
    input(v) {},
    async submit(exit) {
      console.log("submit", this.form);

      this.isLoading = true;
      this.canEditDraft = false;

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
                "Error. Serie, Emissió, Clienta i Projecte son dades obligatòries",
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
            this.form
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
          // console.log("this.form", this.form);
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
                "Error. Serie, Emissió, Clienta i Projecte son dades obligatòries",
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
            this.form
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
      console.log("line", line);
      // const option = line.productSearch
      console.log("option", option);
      line.product = option.id;
      line.concept = option.name;
      line.base = option.base;
      line.vat = option.vat;
      // setTimeout(async () => {
      //     this.productSearch = "";
      //   }, 100);
    },
    removeLine(line, j) {
      this.needsUpdate = true;
      // Calculate the actual index in the full array
      const actualIndex =
        this.linesPerPage > 0 && this.form.lines.length > 50
          ? (this.currentPage - 1) * this.linesPerPage + j
          : j;

      this.form.lines.splice(actualIndex, 1);

      // Adjust current page if we deleted the last item on the page
      if (
        this.linesPerPage > 0 &&
        this.paginatedLines.length === 0 &&
        this.currentPage > 1
      ) {
        this.currentPage--;
      }
    },
    addLine() {
      this.form.lines = _.concat(this.form.lines, this.getNewLine());

      // If using pagination, go to the last page to show the new line
      if (this.linesPerPage > 0 && this.form.lines.length > 50) {
        const totalPages = Math.ceil(
          this.form.lines.length / this.linesPerPage
        );
        this.currentPage = totalPages;
      }
    },
    phasesUpdated(info) {
      console.log("Phases updated:", info);
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
                  this.form.estimated_payment = sph.date;
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
                  this.form.estimated_payment = sph.date;
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

        /// temp uncomment
        if (updateProject || true) {
          await service({ requiresAuth: true }).put(`projects/${p.id}`, {
            project_phases: p.project_phases,
            project_phases_info: p.project_phases_info,
            _project_phases_updated: true
          });
        }
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
      this.isLoadingProject = true;
      this.form.projects = this.form.projects.filter(c => c.id !== option.id);
      setTimeout(async () => {
        this.isLoadingProject = false;
      }, 100);
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
          emitted: this.form.emitted
        }
      );

      const pdf = (
        await service({ requiresAuth: true }).get(
          `/emitted-invoices/pdf/${this.entity}/${this.form.id}`
        )
      ).data;
      this.pdf = true;

      this.form.state = theInvoice.data.state;
      this.form.code = theInvoice.data.code;
      this.$buefy.snackbar.open({
        message: "Factura emesa correctament",
        queue: false
      });
      scrollTo(0, 0);
    },
    sendSubmitEmittedInvoice() {
      this.submit(this.exitAfterSave);
    },
    navNew() {
      let routeData = this.$router.resolve({ name: "contacts.edit" });
      window.open(routeData.href, "_blank");
    },
    async uploaded(info) {
      this.editingDocuments = true;
      // console.log('uploaded', info)
      if (info.refId && info.refId > 0) {
        const document = (
          await service({ requiresAuth: true }).get(
            `${this.type}/${info.refId}`
          )
        ).data;
        console.log("document", document);
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
      this.form.total = (
        parseFloat(this.form.total_base) + parseFloat(this.form.ss_base)
      ).toFixed(2);
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

        console.log("pdf", pdf);

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
      this.form.serial = null;
      this.series = this.series.filter(s => s.rectificative === true);
      if (this.series.length === 0) {
        this.$buefy.snackbar.open({
          message:
            "No hi ha cap sèrie rectificativa. Si us plau, creeu una sèrie rectificativa des de l'àrea d'administració.",
          queue: false
        });
      }
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
        console.log("this.form.projects", this.form.projects);
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
    }
  }
};
</script>
<style lang="scss">
.helper {
  margin-top: 1rem;
  color: #aaa;
  font-size: 0.9rem;

  .subtitle {
    font-size: 1.1rem;
    line-height: 1rem;
    color: #aaa;
    margin-left: 0.5rem;
  }
}

.is-w-30 {
  width: 30%;
}
.ml-auto {
  margin-left: auto;
}
</style>
