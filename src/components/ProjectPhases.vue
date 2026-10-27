<template>
  <div class="project-form-phases" v-if="form && !isLoading && rendered">
    <modal-box-invoicing
      :is-active="isModalActive"
      :invoicing-object="invoicingObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
      @delete="modalDelete"
    />
    <modal-box-split
      :is-active="isModalSplitActive"
      :invoicing-object="invoicingObject"
      @submit="modalSplitSubmit"
      @action="modalSplitSubmit"
      @cancel="modalSplitCancel"
      @delete="modalSplitDelete"
    />

    <div v-if="phases && phases.length" class="phases-toolbar">
      <span class="phases-count">{{ phases.length }} {{ phases.length === 1 ? "fase" : "fases" }} · {{ linesCount }} {{ linesCount === 1 ? "línia" : "línies" }}</span>
      <b-button
        v-if="currentDocumentLineCount"
        size="is-small"
        type="is-primary"
        outlined
        icon-left="crosshairs-gps"
        class="current-document-button"
        @click="goToDocumentLine"
      >{{ currentDocumentLineCount === 1 ? "Ves a la línia d'aquest document" : "Ves a les línies d'aquest document" }}</b-button>
      <div v-if="phases.length > 1" class="phases-toolbar-actions">
        <b-button size="is-small" icon-left="unfold-less-horizontal" @click="setAllCollapsed(true)">Plega-ho tot</b-button>
        <b-button size="is-small" icon-left="unfold-more-horizontal" @click="setAllCollapsed(false)">Desplega-ho tot</b-button>
      </div>
    </div>

    <div
      v-for="(phase, phi) in phases"
      class="phase-container columns is-multiline"
    >
      <div class="column is-12 phase-head">
        <button
          type="button"
          class="phase-toggle"
          :aria-expanded="isCollapsed(phase, phi) ? 'false' : 'true'"
          :aria-label="(isCollapsed(phase, phi) ? 'Desplega la fase ' : 'Plega la fase ') + (phase.name || '')"
          @click="toggleCollapsed(phase, phi)"
        >
          <b-icon :icon="isCollapsed(phase, phi) ? 'chevron-right' : 'chevron-down'" custom-size="default" />
        </button>
        <form class="phase-name" @submit.prevent="blurPhaseEdit(phase)">
          <b-input
            placeholder="Nom de la fase..."
            v-model="phase.name"
            @update:model-value="blurPhaseEdit(phase)"
            class="phase-detail-input"
            aria-label="Nom de la fase"
            :disabled="(mode !== '' && mode !== 'simple') || !editable"
          >
          </b-input>
        </form>
        <dl class="phase-sums">
          <div><dt>Ingressos</dt><dd>{{ formatMoney(subTotalIncomes(phase)) }}</dd></div>
          <div><dt>Despeses</dt><dd>{{ formatMoney(subTotalExpenses(phase)) }}</dd></div>
          <div><dt>Total</dt><dd :class="'has-text-' + sign(phase.total_amount)">{{ formatMoney(phase.total_amount || 0) }}</dd></div>
        </dl>
      <div v-if="mode === '' || mode === 'simple'" class="phase-actions">
        <button
          class="button is-small"
          type="button"
          title="Esborra la fase"
          aria-label="Esborra la fase"
          :disabled="
            !editable ||
              phase.incomes.find(s => s.paid && mode !== 'simple') ||
              phase.expenses.find(s => s.paid && mode !== 'simple') ||
              phase.incomes.find(
                s => s.estimated_hours && s.estimated_hours.length > 0
              )
          "
          @click.prevent="removePhase(phi)"
        >
          <b-icon icon="trash-can" size="is-small" />
        </button>
        <button
          v-if="mode === 'simple'"
          class="button is-small is-danger ml-1"
          type="button"
          title="Copia la fase a l'execució"
          aria-label="Copia la fase a l'execució"
          :disabled="!editable"
          @click.prevent="copyPhase(phi)"
        >
          <b-icon icon="content-duplicate" size="is-small" />
        </button>
        <button
          class="button is-small is-warning ml-1"
          type="button"
          title="Duplica la fase i el pressupost"
          aria-label="Duplica la fase i el pressupost"
          :disabled="!editable"
          @click.prevent="duplicatePhase(phi)"
        >
          <b-icon icon="content-copy" size="is-small" />
        </button>
      </div>
      </div>
      <div v-show="!isCollapsed(phase, phi)" class="column is-12 subphases-list" v-if="mode !== 'expenses'">
        <div class="subphase-detail-title">
          Ingressos <span class="lines-count">{{ phase.incomes ? phase.incomes.length : 0 }}</span>
        </div>
        <div
          class="lines-drop-zone"
          @dragover="lineDragOver($event, phase, 'incomes')"
          @drop="lineDrop($event, phase, 'incomes')"
        >
        <b-table v-if="form && phase.incomes" :data="phase.incomes" ref="table"
          :row-class="row => lineRowClass(row, phase, 'incomes')"
          :paginated="isPaginated && phase.incomes.length > 10"
          :per-page="perPage"
          pagination-position="top"
          :pagination-simple="true"
        >
          <b-table-column v-if="canReorder" label="" width="20" cell-class="col-drag" header-class="col-drag" v-slot="props">
            <span
              class="line-drag-handle"
              draggable="true"
              :data-line-index="props && props.row ? phase.incomes.indexOf(props.row) : -1"
              title="Arrossega per moure la línia"
              aria-label="Arrossega per moure la línia"
              @dragstart="lineDragStart($event, phase, 'incomes', props && props.row)"
              @dragend="lineDragEnd"
            >
              <b-icon icon="drag-vertical" size="is-small" />
            </span>
          </b-table-column>
          <b-table-column field="name" label="Tipus" width="40px" cell-class="col-type" v-slot="props">
            <b-field
                v-if="
                  (incomeTypes && incomeTypes.length) ||
                    (expenseTypes && expenseTypes.length)
                "                
                class="subphase-detail-input"
              >
                <b-select
                  v-model="props.row.income_type"
                  placeholder="Tipus"
                  :disabled="!editable"
                  @update:model-value="incomeTypeChanged(props.row)"
                >
                  <option
                    v-for="(s, index) in incomeTypes"
                    :key="index"
                    :value="s"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Concepte" width="450" cell-class="col-concept" v-slot="props">
            <b-field
                
                class="subphase-detail-input-large-field"
              >
                <b-input
                  name="SubFase"
                  placeholder="Nom de la subfase..."
                  v-model="props.row.concept"
                  class="subphase-detail-input subphase-detail-input-large"
                  @update:model-value="somethingChanged(props.row)"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Quantitat" width="80" cell-class="col-qty" v-slot="props">
              <b-field
                class="medium-field"
              >
                <b-input
                  name="Unitats"
                  placeholder="Quantitat, hores, unitats..."
                  :model-value="lineInputText(props.row, 'quantity')"
                  @update:model-value="v => lineInput(props.row, 'quantity', v)"
                  @focus="lineInputFocus(props.row, 'quantity', $event)"
                  @blur="editingLine = null"
                  class="subphase-detail-input"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Preu" width="80" cell-class="col-price" v-slot="props">
              <b-field class="medium-field">
                <b-input
                  name="PreuUnitari"
                  placeholder="Preu per unitat"
                  :model-value="lineInputText(props.row, 'amount')"
                  @update:model-value="v => lineInput(props.row, 'amount', v)"
                  @focus="lineInputFocus(props.row, 'amount', $event)"
                  @blur="editingLine = null"
                  class="subphase-detail-input"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Total" width="80" v-slot="props">
              <b-field class="medium-field">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="budgetLineTotal(props.row)"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Previsió fac." width="100" v-slot="props">
              <b-field
                class="date-field"
              >
                <lazy-datepicker
                  append-to-body
                  v-model="props.row.date_estimate_document"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data factura"
                  @update:model-value="
                    input;
                    somethingChanged(props.row);
                  "
                  trap-focus
                  editable
                  :disabled="!editable"
                >
                </lazy-datepicker>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Previsió pag." width="100" v-slot="props">
              <b-field
                class="date-field"
              >
                <lazy-datepicker
                  append-to-body
                  v-model="props.row.date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data pagament"
                  @update:model-value="
                    input;
                    somethingChanged(props.row);
                  "
                  trap-focus
                  editable
                  :disabled="!editable"
                >
                </lazy-datepicker>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Compte" width="80" v-if="me.options && me.options.treasury && bankAccounts && bankAccounts.length > 1 && mode !== 'simple'" v-slot="props">
              <b-field
                v-if="
                  bankAccounts && bankAccounts.length > 1
                "                
                class="subphase-detail-input subphase-detail-input-short"
              >
                <b-select
                  v-model="props.row.bank_account"
                  placeholder="Compte"
                  :disabled="!editable"
                  @update:model-value="somethingChanged(props.row)"
                >
                  <option
                    v-for="(s, index) in bankAccounts"
                    :key="index"
                    :value="s"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="IVA" width="80" v-slot="props">
              <b-field
                v-if="vatTypes && vatTypes.length"
                class="subphase-detail-input subphase-detail-input-short"
              >
                <b-select
                  v-model="props.row.vat_pct"
                  placeholder="IVA"
                  :disabled="!editable"
                  @update:model-value="somethingChanged(props.row)"
                >
                  <option
                    v-for="(s, index) in vatTypes"
                    :key="index"
                    :value="s.value"
                  >
                    {{ s.value }}%
                  </option>
                </b-select>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Accions" width="80" v-slot="props">
              <b-field class="medium-field">
                <button
                  class="button is-small line-action ml-2"
                  title="Divideix la línia"
                  aria-label="Divideix la línia"
                  type="button"
                  @click.prevent="
                    splitSubPhase(phase, props.row, phi, props.index)
                  "
                  :disabled="!editable"
                >
                  <b-icon icon="arrow-split-horizontal" size="is-small" />
                </button>
                <button
                  class="button is-small line-action ml-2"
                  title="Esborra la línia"
                  aria-label="Esborra la línia"
                  type="button"
                  :disabled="
                    !editable ||
                      (props.row.paid && mode !== 'simple') ||
                      (props.row.estimated_hours &&
                        props.row.estimated_hours.length > 0)
                  "
                  @click.prevent="removeSubPhase(phase, props.row, props.index)"
                >
                  <b-icon icon="trash-can" size="is-small" />
                </button>
                <button
                  v-if="props.index === phase.incomes.length - 1"
                  class="button is-small line-action ml-2"
                  title="Afegeix una línia"
                  aria-label="Afegeix una línia"
                  type="button"
                  @click.prevent="addSubPhase(phase)"
                  :disabled="!editable"
                >
                  <b-icon icon="plus-circle" size="is-small" />
                </button>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Fact." title="Facturat" width="30" v-slot="props" v-if="me.options && me.options.treasury && mode !== 'simple'">
              <b-field
                class="short-field"
              >
                <b-checkbox
                  v-model="props.row.paid"
                  class="checkbox-inline"
                  @update:model-value="paidChanged(props.row)"
                  :disabled="!editable"
                >
                </b-checkbox>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Doc" title="Document" width="100" v-slot="props" v-if="me.options && me.options.treasury && mode !== 'simple'">            
            <b-field
                v-if="me.options && me.options.treasury && mode !== 'simple'"
                class="zshort-field"
              >
                <span
                  v-if="
                    me.options &&
                      me.options.treasury &&
                      props.row.invoice &&
                      props.row.invoice.id
                  "
                  :title="`${props.row.invoice.total_base} €`"
                  class="tag is-primary invoice-tag clickable"
                  :disabled="!editable"
                  @click="
                    setInvoice('incomes', props.row, props.row, phi, props.index)
                  "
                  >F {{ props.row.invoice.code }}
                  <b-icon
                    icon="alert-circle"
                    class="warning-tag"
                    size="is-small"
                    v-if="importWarning(props.row, props.row.invoice)"
                    title="Imports diferents"
                  />
                </span>
                <span
                  v-if="
                    me.options &&
                      me.options.treasury &&
                      props.row.grant &&
                      props.row.grant.id
                  "
                  :disabled="!editable"
                  :title="`${props.row.grant.total_base} €`"
                  class="tag is-primary invoice-tag clickable"
                  @click="
                    setInvoice('incomes', props.row, props.row, phi, props.index)
                  "
                  >S {{ props.row.grant.code }}
                  <b-icon
                    icon="alert-circle"
                    class="warning-tag"
                    size="is-small"
                    v-if="importWarning(props.row, props.row.grant)"
                    title="Imports diferents"
                  />
                </span>
                <span
                  v-if="
                    me.options &&
                      me.options.treasury &&
                      props.row.income &&
                      props.row.income.id
                  "
                  :disabled="!editable"
                  :title="`${props.row.income.total_base} €`"
                  class="tag is-primary invoice-tag clickable"
                  @click="
                    setInvoice('incomes', props.row, props.row, phi, props.index)
                  "
                  >D {{ props.row.income.code }}
                  <b-icon
                    icon="alert-circle"
                    class="warning-tag"
                    size="is-small"
                    v-if="importWarning(props.row, props.row.income)"
                    title="Imports diferents"
                  />
                </span>
                <span
                  v-if="
                    me.options &&
                      me.options.treasury &&
                      props.row.paid &&
                      !props.row.invoice &&
                      !props.row.income &&
                      !props.row.grant
                  "
                  :disabled="!editable"
                  class="tag is-warning invoice-tag clickable"
                  @click="
                    setInvoice('incomes', props.row, subphase, phi, props.index)
                  "
                  >{{
                    props.row.assign === true ? "Assignat" : "Document"
                  }}</span
                >
              </b-field>
          </b-table-column>
          
        </b-table>
        </div>
        <div class="add-subphase mt-2" v-if="phase.incomes.length === 0">
          <button
            class="button is-small line-action"
            title="Afegeix una línia"
            aria-label="Afegeix una línia"
            type="button"
            @click.prevent="addSubPhase(phase)"
            :disabled="!editable"
          >
            <b-icon icon="plus-circle" size="is-small" />
          </button>
        </div>
      </div>
      <div v-show="!isCollapsed(phase, phi)" class="column is-12 subphases-list" v-if="mode !== 'incomes'">
        <div class="subphase-detail-title">
          Despeses <span class="lines-count">{{ phase.expenses ? phase.expenses.length : 0 }}</span>
        </div>
        <div
          class="lines-drop-zone"
          @dragover="lineDragOver($event, phase, 'expenses')"
          @drop="lineDrop($event, phase, 'expenses')"
        >
        <b-table v-if="form && phase.expenses" :data="phase.expenses" ref="table"
          :row-class="row => lineRowClass(row, phase, 'expenses')"
        :paginated="isPaginated && phase.expenses.length > 10"
          :per-page="perPage"
          pagination-position="top"
          :pagination-simple="true">
          <b-table-column v-if="canReorder" label="" width="20" cell-class="col-drag" header-class="col-drag" v-slot="props">
            <span
              class="line-drag-handle"
              draggable="true"
              :data-line-index="props && props.row ? phase.expenses.indexOf(props.row) : -1"
              title="Arrossega per moure la línia"
              aria-label="Arrossega per moure la línia"
              @dragstart="lineDragStart($event, phase, 'expenses', props && props.row)"
              @dragend="lineDragEnd"
            >
              <b-icon icon="drag-vertical" size="is-small" />
            </span>
          </b-table-column>
          <b-table-column field="name" label="Tipus" width="80" cell-class="col-type" v-slot="props">
            <b-field
                v-if="
                  (incomeTypes && incomeTypes.length) ||
                    (expenseTypes && expenseTypes.length)
                "                
                class="subphase-detail-input"
              >
                <b-select
                  v-model="props.row.expense_type"
                  placeholder="Tipus"
                  :disabled="!editable"
                  @update:model-value="expenseTypeChanged(props.row)"
                >
                  <option
                    v-for="(s, index) in expenseTypes"
                    :key="index"
                    :value="s"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Concepte" width="450" cell-class="col-concept" v-slot="props">
            <b-field                
                class="subphase-detail-input-large-field"
              >
                <b-input
                  name="SubFase"
                  placeholder="Nom de la despesa..."
                  v-model="props.row.concept"
                  class="subphase-detail-input subphase-detail-input-large"
                  @update:model-value="somethingChanged(props.row)"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Quantitat" width="80" cell-class="col-qty" v-slot="props">
              <b-field
                class="medium-field"
              >
                <b-input
                  name="Unitats"
                  placeholder="Quantitat, hores, unitats..."
                  :model-value="lineInputText(props.row, 'quantity')"
                  @update:model-value="v => lineInput(props.row, 'quantity', v)"
                  @focus="lineInputFocus(props.row, 'quantity', $event)"
                  @blur="editingLine = null"
                  class="subphase-detail-input"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Preu" width="80" cell-class="col-price" v-slot="props">
              <b-field class="medium-field">
                <b-input
                  name="PreuUnitari"
                  placeholder="Preu per unitat"
                  :model-value="lineInputText(props.row, 'amount')"
                  @update:model-value="v => lineInput(props.row, 'amount', v)"
                  @focus="lineInputFocus(props.row, 'amount', $event)"
                  @blur="editingLine = null"
                  class="subphase-detail-input"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Total" width="80" v-slot="props">
              <b-field class="medium-field">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="budgetLineTotal(props.row)"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Previsió fac." width="100" v-slot="props">
              <b-field
                class="date-field"
              >
                <lazy-datepicker
                  append-to-body
                  v-model="props.row.date_estimate_document"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data factura"
                  @update:model-value="
                    input;
                    somethingChanged(props.row);
                  "
                  trap-focus
                  editable
                  :disabled="!editable"
                >
                </lazy-datepicker>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Previsió pag." width="100" v-slot="props">
              <b-field
                class="date-field"
              >
                <lazy-datepicker
                  append-to-body
                  v-model="props.row.date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data pagament"
                  @update:model-value="
                    input;
                    somethingChanged(props.row);
                  "
                  trap-focus
                  editable
                  :disabled="!editable"
                >
                </lazy-datepicker>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Compte" width="80" v-if="me.options && me.options.treasury && bankAccounts && bankAccounts.length > 1" v-slot="props">
              <b-field
                v-if="
                  bankAccounts && bankAccounts.length > 1
                "                
                class="subphase-detail-input subphase-detail-input-short"
              >
                <b-select
                  v-model="props.row.bank_account"
                  placeholder="Compte"
                  :disabled="!editable"
                  @update:model-value="somethingChanged(props.row)"
                >
                  <option
                    v-for="(s, index) in bankAccounts"
                    :key="index"
                    :value="s"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="IVA" width="80" v-slot="props">
              <b-field
                v-if="vatTypes && vatTypes.length"
                class="subphase-detail-input subphase-detail-input-short"
              >
                <b-select
                  v-model="props.row.vat_pct"
                  placeholder="IVA"
                  :disabled="!editable"
                  @update:model-value="somethingChanged(props.row)"
                >
                  <option
                    v-for="(s, index) in vatTypes"
                    :key="index"
                    :value="s.value"
                  >
                    {{ s.value }}%
                  </option>
                </b-select>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Accions" width="80" v-slot="props">
              <b-field class="medium-field">
                <button
                  class="button is-small line-action ml-2"
                  title="Divideix la línia"
                  aria-label="Divideix la línia"
                  type="button"
                  @click.prevent="
                    splitSubExpense(phase, props.row, phi, props.index)
                  "
                  :disabled="!editable"
                >
                  <b-icon icon="arrow-split-horizontal" size="is-small" />
                </button>
                <button
                  class="button is-small line-action ml-2"
                  title="Esborra la línia"
                  aria-label="Esborra la línia"
                  type="button"
                  :disabled="props.row.paid || !editable"
                  @click.prevent="removeSubExpense(phase, props.row, props.index)"
                >
                  <b-icon icon="trash-can" size="is-small" />
                </button>                
                <button
                  v-if="props.index === phase.expenses.length - 1"
                  class="button is-small line-action ml-2"
                  title="Afegeix una línia"
                  aria-label="Afegeix una línia"
                  type="button"
                  @click.prevent="addSubExpense(phase)"
                  :disabled="!editable"
                >
                  <b-icon icon="plus-circle" size="is-small" />
                </button>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Fact." title="Facturat" width="30" v-slot="props" v-if="me.options && me.options.treasury && mode !== 'simple'">
              <b-field
                class="short-field"
              >
                <b-checkbox
                  v-model="props.row.paid"
                  class="checkbox-inline"
                  @update:model-value="paidChanged(props.row)"
                  :disabled="!editable"
                >
                </b-checkbox>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Doc." title="Document" width="100" v-slot="props" v-if="me.options && me.options.treasury && mode !== 'simple'">
            <b-field
                v-if="me.options && me.options.treasury && mode !== 'simple'"
                class="zshort-field"
              >
                <span
                  v-if="
                    me.options &&
                      me.options.treasury &&
                      props.row.invoice &&
                      props.row.invoice.id
                  "
                  :title="`${props.row.invoice.total_base} €`"
                  class="tag is-primary invoice-tag clickable"
                  :disabled="!editable"
                  @click="
                    setInvoice('expenses', props.row, props.row, phi, props.index)
                  "
                  >F {{ props.row.invoice.code }}
                  <b-icon
                    icon="alert-circle"
                    class="warning-tag"
                    size="is-small"
                    v-if="importWarning(props.row, props.row.invoice)"
                    title="Imports diferents"
                  />
                </span>
                <span
                  v-if="
                    me.options &&
                      me.options.treasury &&
                      props.row.grant &&
                      props.row.grant.id
                  "
                  :disabled="!editable"
                  :title="`${props.row.grant.total_base} €`"
                  class="tag is-primary invoice-tag clickable"
                  @click="
                    setInvoice('expenses', props.row, props.row, phi, props.index)
                  "
                  >S {{ props.row.grant.code }}
                  <b-icon
                    icon="alert-circle"
                    class="warning-tag"
                    size="is-small"
                    v-if="importWarning(props.row, props.row.grant)"
                    title="Imports diferents"
                  />
                </span>
                <span
                  v-if="
                    me.options &&
                      me.options.treasury &&
                      props.row.expense &&
                      props.row.expense.id
                  "
                  :disabled="!editable"
                  :title="`${props.row.expense.total_base} €`"
                  class="tag is-primary invoice-tag clickable"
                  @click="
                    setInvoice('expenses', props.row, props.row, phi, props.index)
                  "
                  >D {{ props.row.expense.code }}
                  <b-icon
                    icon="alert-circle"
                    class="warning-tag"
                    size="is-small"
                    v-if="importWarning(props.row, props.row.expense)"
                    title="Imports diferents"
                  />
                </span>
                <span
                  v-if="
                    me.options &&
                      me.options.treasury &&
                      props.row.paid &&
                      !props.row.invoice &&
                      !props.row.expense &&
                      !props.row.grant
                  "
                  :disabled="!editable"
                  class="tag is-warning invoice-tag clickable"
                  @click="
                    setInvoice('expenses', props.row, subphase, phi, props.index)
                  "
                  >{{
                    props.row.assign === true ? "Assignat" : "Document"
                  }}</span
                >
              </b-field>
          </b-table-column>
        </b-table>
        </div>
        <div class="add-subphase mt-2" v-if="phase.expenses.length === 0">
          <button
            class="button is-small line-action"
            title="Afegeix una línia"
            aria-label="Afegeix una línia"
            type="button"
            @click.prevent="addSubExpense(phase)"
            :disabled="!editable"
          >
            <b-icon icon="plus-circle" size="is-small" />
          </button>
        </div>

      </div>
    </div>

    
    <form @submit.prevent="addPhase" v-if="mode === '' || mode === 'simple'">
      <b-field label="Nova Fase" class="mt-5">
        <b-input
          placeholder="Nom de la fase..."
          v-model="phaseToAdd"
          icon-right="plus-circle"
          icon-right-clickable
          @icon-right-click="addPhase"
        >
        </b-input>
      </b-field>
    </form>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import CardComponent from "@/components/CardComponent.vue";
import ModalBoxInvoicing from "@/components/ModalBoxInvoicing.vue";
import ModalBoxSplit from "@/components/ModalBoxSplit.vue";
import service from "@/service/index";
import MoneyFormat from "@/components/MoneyFormat.vue";
import sumBy from "lodash/sumBy";
import { budgetLineDisplay, budgetLineTotal, budgetLineValue } from "@/domain/budgetLines.js";
import { sortLinesByPosition, moveLine, lineHasDocument } from "@/domain/budgetLineOrder.js";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import moment from "moment";
import sortBy from "lodash/sortBy";
import RadioPicker from "@/components/RadioPicker.vue";
import LazyDatepicker from "@/components/LazyDatepicker.vue";
import { formatMoney, sign } from "@/helpers/format-number";

export default {
  name: "ProjectFormPhases",
  emits: ["phases-copy", "phases-updated"],
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat,
    ModalBoxInvoicing,
    ModalBoxSplit,
    RadioPicker,
    LazyDatepicker
  },
  props: {
    form: {
      type: Object,
      default: null
    },
    projectPhases: {
      type: [Array],
      default: null
    },
    // The contact list, when the parent already has it loaded. Each instance
    // used to fetch its own copy: three requests of the whole list to open one
    // project (issues/016). Left out, it is fetched here as before.
    contacts: {
      type: Array,
      default: null
    },
    mode: {
      type: String,
      default: ""
    },
    editable: {
      type: Boolean,
      default: true
    },
    hidden: {
      type: Boolean,
      default: false
    },
    // issues/055: a block out of sight (another tab, a folded card) waits to
    // draw its lines until it is shown; its data is set up as usual.
    deferRender: {
      type: Boolean,
      default: false
    },
    perPage: {
      type: Number,
      default: 10
    },
    isPaginated: {
      type: Boolean,
      default: true
    },
    documentId: {
      type: [Number, String],
      default: null
    },
    documentType: {
      type: String,
      default: null
    },
    documentTotal: {
      type: Number,
      default: 0
    },
    documentTypeName: {
      type: String,
      default: ""
    },
    documentEmitted: {
      type: Date,
      default: null
    },
    documentPaidDate: {
      type: Date,
      default: null
    },
    documentEstimatedPayment: {
      type: Date,
      default: null
    },
    documentPaybefore: {
      type: Date,
      default: null
    }
  },
  data() {
    return {
      // issues/055: drawn once, kept drawn
      rendered: !this.deferRender,
      // phases folded by the user (key: phase id, or index for unsaved ones)
      collapsedPhases: {},
      // the line being dragged by its handle (issues/345)
      lineDrag: null,
      // the quantity / price input being typed in: shows the text as typed
      // while the others show Catalan decimals (issues/224)
      editingLine: null,
      phases: [],
      isLoading: false,
      isUpdating: false,
      needsUpdate: false,
      createdReadable: null,
      isProfileExists: false,
      project_states: [],
      project_scopes: [],
      leaders: [],
      clients: [],
      strategies: [],
      expenseTypes: [],
      incomeTypes: [],
      dedicationTypes: [],
      bankAccounts: [],
      vatTypes: [],
      clientSearch: "",
      cooperaSearch: "",
      strategiesSearch: "",
      phaseToAdd: "",
      updatingGantt: false,
      updatingGanttTimer: 0,
      defaultOpenedDetails: [1],
      showDetailIcon: true,
      useTransition: false,
      selected: new Date(),
      tasks: {
        data: [
          {
            id: 1,
            text: "Task #1",
            start_date: "2020-01-17",
            duration: 3,
            progress: 0.6
          },
          {
            id: 2,
            text: "Task #2",
            start_date: "2020-01-20",
            duration: 3,
            progress: 0.4
          }
        ],
        links: [{ id: 1, source: 1, target: 2, type: "0" }]
      },
      invoicingObject: {},
      isModalActive: false,
      isModalSplitActive: false,
      newTask: "",
      auxDocument: null,
      deletedPhases: [],
      deletedIncomes: [],
      deletedExpenses: []
    };
  },
  computed: {
    // issues/345: the lines can be reordered with drag & drop
    canReorder() {
      return this.editable;
    },
    // issues/344: lines linked to the document being viewed
    currentDocumentLineCount() {
      if (!this.documentId) return 0;
      return (this.phases || []).reduce(
        (total, phase) =>
          total +
          (phase.incomes || []).filter(line => this.isCurrentDocumentLine(line, "incomes")).length +
          (phase.expenses || []).filter(line => this.isCurrentDocumentLine(line, "expenses")).length,
        0
      );
    },
    linesCount() {
      return (this.phases || []).reduce(
        (total, phase) => total + (phase.incomes ? phase.incomes.length : 0) + (phase.expenses ? phase.expenses.length : 0),
        0
      );
    },
    ...mapState(useMainStore, ["me"]),
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
    filteredCoopera() {
      return this.clients.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.cooperaSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredStrategies() {
      return this.strategies.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.strategiesSearch.toLowerCase()) >= 0
        );
      });
    },
    transitionName() {
      if (this.useTransition) {
        return "fade";
      }
      return "x";
    },
    unassignedDocuments() {
      // If no documentId, it's a new document (not yet assigned)
      if (!this.documentId) {
        return [{
          type: this.documentTypeName || 'Document',
          total_base: this.documentTotal || 0
        }];
      }

      // Check if the document is assigned to any phase line
      let isAssigned = false;
      
      // Check all phases
      this.phases.forEach(phase => {
        // Check incomes for emitted-invoices or received-incomes
        if (phase.incomes && this.mode === 'incomes') {
          phase.incomes.forEach(income => {
            if (this.documentType === 'emitted-invoices' && income.invoice && income.invoice.id === this.documentId) {
              isAssigned = true;
            }
            if (this.documentType === 'received-incomes' && income.income && income.income.id === this.documentId) {
              isAssigned = true;
            }
            if (this.documentType === 'received-grants' && income.grant && income.grant.id === this.documentId) {
              isAssigned = true;
            }
          });
        }
        
        // Check expenses for received-invoices, received-expenses, tickets, diets
        if (phase.expenses && this.mode === 'expenses') {
          phase.expenses.forEach(expense => {
            if (this.documentType === 'received-invoices' && expense.invoice && expense.invoice.id === this.documentId) {
              isAssigned = true;
            }
            if (this.documentType === 'received-expenses' && expense.expense && expense.expense.id === this.documentId) {
              isAssigned = true;
            }
            if (this.documentType === 'tickets' && expense.ticket && expense.ticket.id === this.documentId) {
              isAssigned = true;
            }
            if (this.documentType === 'diets' && expense.diet && expense.diet.id === this.documentId) {
              isAssigned = true;
            }
          });
        }
      });

      // If not assigned, return array with document info
      if (!isAssigned) {
        return [{
          type: this.documentTypeName || 'Document',
          total_base: this.documentTotal || 0
        }];
      }

      // If assigned, return empty array
      return [];
    }
  },
  watch: {
    deferRender(defer) {
      if (!defer) this.rendered = true;
    },
    // The parent's list arrives (or is refreshed) after this is mounted.
    contacts: {
      immediate: true,
      handler(contacts) {
        if (contacts) this.clients = contacts;
      }
    },
    documentTotal(newVal, oldVal) {
      // When document total changes in assignment mode, recalculate warnings
      // This happens when you change the document line amounts in DocumentForm
      if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId && newVal !== oldVal) {
        this.updateWarningFields();
      }
    }
  },
  async created() {
    if (!this.form || !this.projectPhases) {
      return;
    }
    this.isLoading = true;
    this.expenseTypes = await service({ requiresAuth: true, cached: true })
      .get("expense-types")
      .then(r => r.data);

    this.expenseTypes = this.expenseTypes.map(r => {
      return {
        name: r.name,
        id: r.id,
        vat_pct: r.vat_pct
      };
    });

    this.incomeTypes = await service({ requiresAuth: true, cached: true })
      .get("income-types")
      .then(r => r.data);

    this.incomeTypes = this.incomeTypes.map(r => {
      return {
        name: r.name,
        id: r.id,
        vat_pct: r.vat_pct
      };
    });

    this.bankAccounts = await service({ requiresAuth: true, cached: true })
      .get("bank-accounts")
      .then(r => r.data);

    this.bankAccounts = this.bankAccounts.map(r => {
      return {
        name: r.name,
        id: r.id
      };
    });

    this.vatTypes = await service({ requiresAuth: true, cached: true })
      .get("vat-types", )
      .then(r => r.data);

    this.vatTypes = this.vatTypes.map(r => {
      return {
        value: r.value,
        id: r.id
      };
    });

    if (!this.contacts) {
      this.clients = await service({ requiresAuth: true })
        .get("contacts/basic?_limit=-1&_sort=name:ASC")
        .then(r => r.data);
    }

    const phases0 = this.projectPhases.map(r => {
      return {
        ...r,
        opened: true,
        total_amount:
          sumBy(r.incomes, "total_amount") - sumBy(r.expenses, "total_amount")
      };
    });

    phases0.forEach(p => {
      // the order saved with drag & drop (issues/345)
      sortLinesByPosition(p.incomes);
      sortLinesByPosition(p.expenses);
      p.dirty = p.dirty || false;
      p.incomes.forEach(s => {
        s.dirty = s.dirty || false;
        s.assign = false;
        s["assign"] = false;
        if (s.date) {
          s.date = moment(s.date, "YYYY-MM-DD").toDate();
        }
        if (s.date_estimate_document) {
          s.date_estimate_document = moment(
            s.date_estimate_document,
            "YYYY-MM-DD"
          ).toDate();
        }
        if (s.income_type) {
          const incomeTypeId = typeof s.income_type === 'object' ? s.income_type.id : s.income_type;
          s.income_type = this.incomeTypes.find(it => it.id === incomeTypeId) || s.income_type;
        }
        if (s.bank_account) {
          const bankAccountId = typeof s.bank_account === 'object' ? s.bank_account.id : s.bank_account;
          s.bank_account = this.bankAccounts.find(ba => ba.id === bankAccountId) || s.bank_account;
        }
      });
      p.expenses.forEach(s => {
        s.dirty = s.dirty || false;
        s.assign = false;
        s["assign"] = false;
        if (s.date) {
          s.date = moment(s.date, "YYYY-MM-DD").toDate();
        }
        if (s.date_estimate_document) {
          s.date_estimate_document = moment(
            s.date_estimate_document,
            "YYYY-MM-DD"
          ).toDate();
        }
        if (s.expense_type) {
          const expenseTypeId = typeof s.expense_type === 'object' ? s.expense_type.id : s.expense_type;
          s.expense_type = this.expenseTypes.find(et => et.id === expenseTypeId) || s.expense_type;
        }
        if (s.bank_account) {
          const bankAccountId = typeof s.bank_account === 'object' ? s.bank_account.id : s.bank_account;
          s.bank_account = this.bankAccounts.find(ba => ba.id === bankAccountId) || s.bank_account;
        }
      });
    });

    this.phases = phases0;

    // Calculate warnings on load only in document assignment mode
    // In normal project view, we trust the warning field from database
    if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
      this.updateWarningFields();
    }

    this.isLoading = false;
  },
  methods: {
    budgetLineTotal,
    formatMoney,
    sign,
    isCurrentDocumentLine(line, kind) {
      return !!this.documentId && lineHasDocument(line, kind, this.documentType, this.documentId);
    },
    lineRowClass(row, phase, kind) {
      const classes = [];
      if (this.isCurrentDocumentLine(row, kind)) classes.push("is-current-document");
      const drag = this.lineDrag;
      if (drag && drag.phase === phase && drag.kind === kind) {
        const index = phase[kind].indexOf(row);
        if (index === drag.from) classes.push("is-dragging");
        else if (index === drag.over) classes.push(drag.over < drag.from ? "drop-before" : "drop-after");
      }
      return classes.join(" ");
    },
    // issues/344: unfold the phases holding the document's lines and scroll to the first one
    goToDocumentLine() {
      const collapsed = { ...this.collapsedPhases };
      (this.phases || []).forEach((phase, index) => {
        const holds =
          (phase.incomes || []).some(line => this.isCurrentDocumentLine(line, "incomes")) ||
          (phase.expenses || []).some(line => this.isCurrentDocumentLine(line, "expenses"));
        if (holds) collapsed[this.phaseKey(phase, index)] = false;
      });
      this.collapsedPhases = collapsed;
      this.$nextTick(() => {
        const row = this.$el && this.$el.querySelector && this.$el.querySelector("tr.is-current-document");
        if (row && row.scrollIntoView) row.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    // issues/345: drag a line by its handle within its own table
    lineDragStart(event, phase, kind, row) {
      const from = phase[kind].indexOf(row);
      if (!this.canReorder || from < 0) return;
      this.lineDrag = { phase, kind, from, over: from };
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        // Firefox starts a drag only with some data
        event.dataTransfer.setData("text/plain", String(from));
        const tr = event.target && event.target.closest && event.target.closest("tr");
        if (tr && event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(tr, 16, 16);
      }
    },
    lineDropIndex(event, phase, kind) {
      const drag = this.lineDrag;
      if (!drag || drag.phase !== phase || drag.kind !== kind) return -1;
      const tr = event.target && event.target.closest && event.target.closest("tr");
      const handle = tr && tr.querySelector("[data-line-index]");
      if (!handle) return -1;
      const index = Number(handle.getAttribute("data-line-index"));
      return Number.isInteger(index) && index >= 0 ? index : -1;
    },
    lineDragOver(event, phase, kind) {
      const index = this.lineDropIndex(event, phase, kind);
      // another table (or no line dragged): no drop allowed
      if (index < 0) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      if (this.lineDrag.over !== index) this.lineDrag = { ...this.lineDrag, over: index };
    },
    lineDrop(event, phase, kind) {
      const index = this.lineDropIndex(event, phase, kind);
      const drag = this.lineDrag;
      this.lineDrag = null;
      if (index < 0) return;
      event.preventDefault();
      const lines = phase[kind];
      const row = lines[drag.from];
      if (moveLine(lines, drag.from, index)) this.somethingChanged(row);
    },
    lineDragEnd() {
      this.lineDrag = null;
    },
    phaseKey(phase, index) {
      return phase && phase.id ? "id-" + phase.id : "index-" + index;
    },
    isCollapsed(phase, index) {
      return !!this.collapsedPhases[this.phaseKey(phase, index)];
    },
    toggleCollapsed(phase, index) {
      const key = this.phaseKey(phase, index);
      this.collapsedPhases = { ...this.collapsedPhases, [key]: !this.collapsedPhases[key] };
    },
    setAllCollapsed(collapsed) {
      const all = {};
      (this.phases || []).forEach((phase, index) => {
        all[this.phaseKey(phase, index)] = collapsed;
      });
      this.collapsedPhases = all;
    },
    blurPhase(phase) {
      this.phases.forEach(p => {
        p.edit = false;
      });
      if (phase) {
        phase.edit = true;
      }
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    blurPhaseEdit(phase) {
      phase.dirty = true;
      this.needsUpdate = true;
      this.blurPhase(null);
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    incomeTypeChanged(income) {
      // Update vat_pct based on selected income type
      if (income.income_type && income.income_type.vat_pct !== null && income.income_type.vat_pct !== undefined) {
        income.vat_pct = income.income_type.vat_pct;
      }
      this.somethingChanged(income);
    },
    expenseTypeChanged(expense) {
      // Update vat_pct based on selected expense type
      if (expense.expense_type && expense.expense_type.vat_pct !== null && expense.expense_type.vat_pct !== undefined) {
        expense.vat_pct = expense.expense_type.vat_pct;
      }
      this.somethingChanged(expense);
    },
    somethingChanged(subphase) {
      subphase.dirty = true;
      this.needsUpdate = true;
      // Update warning fields only in assignment mode
      if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
        this.updateWarningFields();
      }
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    lineInputText(row, field) {
      const editing = this.editingLine;
      if (editing && editing.row === row && editing.field === field) return editing.text;
      return budgetLineDisplay(row[field]);
    },
    lineInputFocus(row, field, event) {
      const text = budgetLineDisplay(row[field], { grouped: false });
      const input = event && event.target;
      this.editingLine = { row, field, text };
      // «1.500» becomes «1500» while editing: the new text drops the browser's
      // select-all of a tab-in and typing appended to the old value (issues/234)
      if (input && typeof input.select === "function" && input.value !== text) {
        this.$nextTick(() => {
          if (document.activeElement === input) input.select();
        });
      }
    },
    lineInput(row, field, text) {
      this.editingLine = { row, field, text };
      this.changeSubPhase(row, field, text);
    },
    changeSubPhase(subphase, field, value) {
      subphase.dirty = true;
      // quantity / price: Catalan decimals and thousands, at most 4 decimals
      // as the API stores them (issues/194, issues/224)
      subphase[field] = budgetLineValue(value);
      this.phases = this.phases.map(r => {
        return {
          ...r,
          opened: true,
          total_amount:
            sumBy(r.incomes, budgetLineTotal) -
            sumBy(r.expenses, budgetLineTotal)
        };
      });
      // Update warning fields only in assignment mode
      if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
        this.updateWarningFields();
      }
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    addPhase() {
      this.needsUpdate = true;
      this.phases.push({
        name: this.phaseToAdd,
        edit: false,
        opened: true,
        incomes: [],
        expenses: [],
        total_amount: 0,
        dirty: true
      });
      this.phaseToAdd = "";
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    removePhase(i) {
      this.needsUpdate = true;
      this.deletedPhases.push(this.phases[i].id);
      this.phases = this.phases.filter((p, j) => i !== j);      
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    subTotalIncomes(phase) {
      return sumBy(phase.incomes, budgetLineTotal);
    },
    subTotalExpenses(phase) {
      return sumBy(phase.expenses, budgetLineTotal);
    },
    copyPhase(i) {
      this.$emit("phases-copy", { index: i });
    },
    duplicatePhase(i) {
      this.needsUpdate = true;
      const phase = this.phases[i];
      
      // Deep clone the phase with its incomes and expenses
      const duplicatedPhase = {
        name: `${phase.name} (còpia)`,
        edit: false,
        opened: true,
        incomes: phase.incomes.map(income => ({
          ...income,
          id: undefined, // Remove id so it will be created as new
          paid: false, // Reset paid status
          invoice: null, // Reset invoice
          grant: null, // Reset grant
          income: null, // Reset income
          dirty: true
        })),
        expenses: phase.expenses.map(expense => ({
          ...expense,
          id: undefined, // Remove id so it will be created as new
          paid: false, // Reset paid status
          invoice: null, // Reset invoice
          grant: null, // Reset grant
          expense: null, // Reset expense
          ticket: null, // Reset ticket
          diet: null, // Reset diet
          dirty: true
        })),
        total_amount: phase.total_amount,
        dirty: true
      };
      
      // Insert the duplicated phase right after the original
      this.phases.splice(i + 1, 0, duplicatedPhase);
      
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    input(v) {
      this.createdReadable = moment(v).locale("en").format("MMM D, YYYY");
    },
    removeSubPhase(phase, subphase, j) {
      this.needsUpdate = true;
      this.deletedIncomes.push(subphase.id);
      phase.incomes = phase.incomes.filter((s, i) => i !== j);
      // Update warning fields only in assignment mode
      if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
        this.updateWarningFields();
      }
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    removeSubExpense(phase, subphase, j) {
      this.needsUpdate = true;
      this.deletedExpenses.push(subphase.id);
      phase.expenses = phase.expenses.filter((s, i) => i !== j);
      // Update warning fields only in assignment mode
      if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
        this.updateWarningFields();
      }
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },

    addSubPhase(phase) {
      // Check if in incomes mode and if there are unassigned documents from parent
      if (this.mode === 'incomes' && this.unassignedDocuments && this.unassignedDocuments.length > 0) {
        this.$buefy.dialog.confirm({
          title: 'Assignar document',
          message: 'Vols crear una nova línia i associar-li el document automàticament?',
          confirmText: 'Sí',
          cancelText: 'No',
          type: 'is-primary',
          onConfirm: () => {
            this.createSubPhase(phase, true);
          },
          onCancel: () => {
            this.createSubPhase(phase, false);
          }
        });
        return;
      }
      
      this.createSubPhase(phase, false);
    },
    createSubPhase(phase, autoAssign) {
      this.needsUpdate = true;
      
      let concept = "";
      let amount = 0;
      if (autoAssign && this.unassignedDocuments && this.unassignedDocuments.length > 0) {
        const nextDoc = this.unassignedDocuments[0];
        if (nextDoc) {
          const docAmount = nextDoc.total_base || 0;
          concept = nextDoc.type;
          amount = docAmount;
        }
      }
      
      phase.incomes.push({
        concept: concept,
        quantity: 1,
        amount: amount,
        assign: autoAssign,
        paid: autoAssign,
        vat_pct: 21,
        date_estimate_document: this.defaultLineDate(),
        date: autoAssign ? this.calculatePaymentDate() : this.defaultLineDate(),
        dirty: true
      });
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    addSubExpense(phase) {
      // Check if in expenses mode and if there are unassigned documents from parent
      if (this.mode === 'expenses' && this.unassignedDocuments && this.unassignedDocuments.length > 0) {
        this.$buefy.dialog.confirm({
          title: 'Assignar document',
          message: 'Vols crear una nova línia i associar-li el document automàticament?',
          confirmText: 'Sí',
          cancelText: 'No',
          type: 'is-primary',
          onConfirm: () => {
            this.createSubExpense(phase, true);
          },
          onCancel: () => {
            this.createSubExpense(phase, false);
          }
        });
        return;
      }
      
      this.createSubExpense(phase, false);
    },
    createSubExpense(phase, autoAssign) {
      this.needsUpdate = true;
      
      let concept = "";
      let amount = 0;
      if (autoAssign && this.unassignedDocuments && this.unassignedDocuments.length > 0) {
        const nextDoc = this.unassignedDocuments[0];
        if (nextDoc) {
          const docAmount = nextDoc.total_base || 0;
          concept = nextDoc.type;
          amount = docAmount;
        }
      }
      
      phase.expenses.push({
        concept: concept,
        quantity: 1,
        amount: amount,
        assign: autoAssign,
        paid: autoAssign,
        vat_pct: 21,
        date_estimate_document: this.defaultLineDate(),
        date: autoAssign ? this.calculatePaymentDate() : this.defaultLineDate(),
        dirty: true
      });
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    splitSubPhase(phase, subphase, i, j) {
      this.invoicingObject = {
        phase,
        subphase,
        i,
        j,
        type: "income"
      };
      this.isModalSplitActive = true;
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    splitSubExpense(phase, subphase, i, j) {
      this.invoicingObject = {
        phase,
        subphase,
        i,
        j,
        type: "expense"
      };
      this.isModalSplitActive = true;
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    // Previsió fac./pag. of a new line: the document's date when adding from one,
    // else the project's end date, so a new project doesn't open with every line
    // in the "no tenen data" warning (same default as copying a phase)
    defaultLineDate() {
      if (this.documentEmitted) {
        return moment(this.documentEmitted, "YYYY-MM-DD").toDate();
      }
      return this.form && this.form.date_end ? moment(this.form.date_end).toDate() : null;
    },
    /**
     * Calcula la data de Previsió pag. d'una línia segons la prioritat de les
     * dates del document que s'hi assigna:
     *   1. paid_date (cobrada/pagada)
     *   2. estimated_payment (previsió de cobrament)
     *   3. paybefore (venciment)
     *   4. emitted (emissió, sempre present)
     * Torna un objecte Date o null si no hi ha cap data disponible.
     */
    calculatePaymentDate() {
      const candidates = [
        this.documentPaidDate,
        this.documentEstimatedPayment,
        this.documentPaybefore,
        this.documentEmitted
      ];
      const found = candidates.find(d => d);
      return found ? moment(found).toDate() : null;
    },
    setInvoice(type, phase, subphase, i, j) {
      if (this.mode === "") {
        this.invoicingObject = {
          type,
          phase,
          subphase,
          i,
          j,
          emitted_invoices: this.form.emitted_invoices,
          received_invoices: this.form.received_invoices,
          received_grants: this.form.received_grants,
          diets: this.form.diets,
          tickets: this.form.tickets,
          contacts: this.clients,
          received_incomes: this.form.received_incomes,
          received_expenses: this.form.received_expenses
        };
        this.isModalActive = true;
      } else if (this.mode === "incomes") {
        const phase = this.phases.find((p, idx) => idx === i);
        const subphase = phase.incomes.find((p, idx) => idx === j);
        phase.dirty = true;
        subphase.dirty = true;

        if (
          (!subphase.invoice || !subphase.invoice.id) &&
          (!subphase.grant || !subphase.grant.id) &&
          (!subphase.income || !subphase.income.id)
        ) {
          // if (!subphase.invoice || !subphase.invoice.id) {
          subphase.paid = false; // necessary
          const justAssigned = !subphase.assign;
          subphase.assign = !subphase.assign;
          subphase.paid = true; // necessary
          // }

          // When assigning the document, fill Previsió pag. (date) with the
          // best available document date, only if the line has no date yet.
          if (justAssigned && !subphase.date) {
            subphase.date = this.calculatePaymentDate();
          }

          // Update warning fields after assignment toggle
          if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
            this.updateWarningFields();
          }
          this.$emit("phases-updated", {
            phases: this.phases,
            projectId: this.form.id,
            deletedPhases: this.deletedPhases,
            deletedIncomes: this.deletedIncomes,
            deletedExpenses: this.deletedExpenses
          });
        }
      } else if (this.mode === "expenses") {
        const phase = this.phases.find((p, idx) => idx === i);
        const subphase = phase.expenses.find((p, idx) => idx === j);
        phase.dirty = true;
        subphase.dirty = true;

        if (
          (!subphase.invoice || !subphase.invoice.id) &&
          (!subphase.ticket || !subphase.ticket.id) &&
          (!subphase.grant || !subphase.grant.id) &&
          (!subphase.diet || !subphase.diet.id) &&
          (!subphase.expense || !subphase.expense.id)
        ) {
          subphase.paid = false; // necessary
          const justAssigned = !subphase.assign;
          subphase.assign = !subphase.assign;
          subphase.paid = true; // necessary

          // When assigning the document, fill Previsió pag. (date) with the
          // best available document date, only if the line has no date yet.
          if (justAssigned && !subphase.date) {
            subphase.date = this.calculatePaymentDate();
          }

          // Update warning fields after assignment toggle
          if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
            this.updateWarningFields();
          }
          this.$emit("phases-updated", {
            phases: this.phases,
            projectId: this.form.id
          });
        }
      }
    },
    async modalSubmit(invoicing) {
      if (this.invoicingObject.type === "incomes") {
        const phase = this.phases.find(
          (p, idx) => idx === this.invoicingObject.i
        );
        const subphase = phase.incomes.find(
          (p, idx) => idx === this.invoicingObject.j
        );
        subphase.paid = true;
        subphase.invoice = invoicing.emitted;
        subphase.income = invoicing.income;
        subphase.grant = invoicing.grant;
        subphase.dirty = true;

      } else if (this.invoicingObject.type === "expenses") {
        const phase = this.phases.find(
          (p, idx) => idx === this.invoicingObject.i
        );
        const subphase = phase.expenses.find(
          (p, idx) => idx === this.invoicingObject.j
        );
        subphase.paid = true;
        subphase.invoice = invoicing.received;
        subphase.expense = invoicing.expense;
        subphase.ticket = invoicing.ticket;
        subphase.diet = invoicing.diet;
        subphase.grant = invoicing.grant;
        subphase.dirty = true;
      }
      this.isModalActive = false;
      // Update warning fields only in assignment mode
      if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
        this.updateWarningFields();
      }
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    async modalDelete(activity) {
      this.isModalActive = false;
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    modalCancel() {
      this.isModalActive = false;
      // this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    async modalSplitSubmit(action) {

      var max = 0;
      var divider = 1;
      if (action.action === "x2") {
        max = 2;
      } else if (action.action === "x3") {
        max = 3;
      } else if (action.action === "x4") {
        max = 4;
      } else if (action.action === "x12") {
        max = 12;
      }
      if (action.action === "d2") {
        max = 2;
        divider = 2;
      } else if (action.action === "d3") {
        max = 3;
        divider = 3;
      } else if (action.action === "d4") {
        max = 4;
        divider = 4;
      } else if (action.action === "d12") {
        max = 12;
        divider = 12;
      }

      if (action.type === "income") {
        if (max > 0) {
          for (let i = 0; i < max - 1; i++) {
            const newIncome = {
              income_type: action.subphase.income_type,
              bank_account: action.subphase.bank_account,
              vat_pct: action.subphase.vat_pct,
              concept: action.subphase.concept,
              amount: action.subphase.amount / divider,
              quantity: action.subphase.quantity,
              date: action.subphase.date
                ? moment(action.subphase.date)
                    .add(max - i - 1, "month")
                    .toDate()
                : null,
              date_estimate_document: action.subphase.date_estimate_document
                ? moment(action.subphase.date_estimate_document)
                    .add(max - i - 1, "month")
                    .toDate()
                : null,
              dirty: true
            };
            this.phases[action.i].incomes.splice(action.j + 1, 0, newIncome);
          }
          if (divider > 1) {
            const el = this.phases[action.i].incomes[action.j];
            el.amount = el.amount / divider;
            el.dirty = true;
          }
        }

        if (action.action === "split") {
          const newIncome = {
            income_type: action.subphase.income_type,
            bank_account: action.subphase.bank_account,
            vat_pct: action.subphase.vat_pct,
            concept: action.subphase.concept,
            amount: action.amount,
            quantity: action.subphase.quantity,
            date: action.subphase.date,
            date_estimate_document: action.subphase.date_estimate_document,
            dirty: true
          };
          this.phases[action.i].incomes[action.j].amount =
            this.phases[action.i].incomes[action.j].amount - action.amount;
          this.phases[action.i].incomes.splice(action.j + 1, 0, newIncome);
          this.phases[action.i].incomes[action.j].dirty = true;
        }
      } else if (action.type === "expense") {
        if (max > 0) {
          for (let i = 0; i < max - 1; i++) {
            const newIncome = {
              expense_type: action.subphase.expense_type,
              bank_account: action.subphase.bank_account,
              vat_pct: action.subphase.vat_pct,
              concept: action.subphase.concept,
              amount: action.subphase.amount / divider,
              quantity: action.subphase.quantity,
              date: action.subphase.date
                ? moment(action.subphase.date)
                    .add(max - i - 1, "month")
                    .toDate()
                : null,
              date_estimate_document: action.subphase.date_estimate_document
                ? moment(action.subphase.date_estimate_document)
                    .add(max - i - 1, "month")
                    .toDate()
                : null,
              dirty: true
            };
            this.phases[action.i].expenses.splice(action.j + 1, 0, newIncome);

          }
          if (divider > 1) {
            const el = this.phases[action.i].expenses[action.j];
            el.amount = el.amount / divider;
            el.dirty = true;
          }
        }

        if (action.action === "split") {
          const newIncome = {
            expense_type: action.subphase.expense_type,
            bank_account: action.subphase.bank_account,
            vat_pct: action.subphase.vat_pct,
            concept: action.subphase.concept,
            amount: action.amount,
            quantity: action.subphase.quantity,
            date: action.subphase.date,
            date_estimate_document: action.subphase.date_estimate_document,
            dirty: true
          };
          this.phases[action.i].expenses[action.j].amount =
            this.phases[action.i].expenses[action.j].amount - action.amount;
          this.phases[action.i].expenses.splice(action.j + 1, 0, newIncome);
          this.phases[action.i].expenses[action.j].dirty = true;
        }
      }
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
      // Update warning fields only in assignment mode
      if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
        this.updateWarningFields();
      }
      this.isModalSplitActive = false;
    },
    async modalSplitDelete(invoicing) {
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
      this.isModalSplitActive = false;
    },
    async modalSplitCancel() {
      // this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
      this.isModalSplitActive = false;
    },
    paidChanged(subphase) {
      if (!subphase.paid) {
        subphase.invoice = null;
        subphase.ticket = null;
        subphase.diet = null;
        subphase.income = null;
        subphase.expense = null;
      }
      subphase.dirty = true;
      // Update warning fields only in assignment mode
      if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
        this.updateWarningFields();
      }
      this.somethingChanged(subphase);
    },
    importWarning(subphase, document) {
      // In assignment mode, check if line is marked for assignment
      if ((this.mode === 'incomes' || this.mode === 'expenses') && subphase.assign) {
        // Use stored warning if available
        if (subphase.warning !== undefined && subphase.warning !== null) {
          return subphase.warning;
        }
      }
      
      // Use the stored warning field from the database
      if (subphase.warning !== undefined && subphase.warning !== null) {
        return subphase.warning;
      }
      // Fallback to old calculation if warning field not set
      return document
        ? document.total_base !== budgetLineTotal(subphase)
        : false;
    },
    calculateDocumentTotal(documentId, documentType, lineType) {
      // Sum all lines (incomes or expenses) that reference this document
      let total = 0;
      let matchCount = 0;
      this.phases.forEach((phase, phaseIndex) => {
        const lines = lineType === 'income' ? phase.incomes : phase.expenses;
        lines.forEach((line, lineIndex) => {
          const doc = line[documentType];
          if (doc && doc.id === documentId) {
            const lineTotal = budgetLineTotal(line);
            total += lineTotal;
            matchCount++;
          }
        });
      });
      return total;
    },
    updateWarningFields() {
      
      // In assignment mode, we can't calculate warnings accurately because each ProjectPhases
      // component only sees lines from ONE project, but documents can be split across MULTIPLE projects.
      // The backend will calculate and store the correct warning when saving.
      // So in assignment mode, just display the stored warning value from database.
      if ((this.mode === 'incomes' || this.mode === 'expenses') && this.documentId) {
        return;
      }
      
      // When in document assignment mode, calculate warnings based on assigned lines
      if (this.mode === 'incomes' && this.documentId && this.documentTotal) {
        // Sum all lines that reference this document (either assign=true OR already linked)
        let totalAssigned = 0;
        const matchedLines = [];
        const allLines = [];
        
        this.phases.forEach((phase, phaseIdx) => {
          phase.incomes.forEach((income, incomeIdx) => {
            // Log every income line for debugging
            allLines.push({
              phaseIdx,
              incomeIdx,
              concept: income.concept,
              quantity: income.quantity,
              amount: income.amount,
              assign: income.assign,
              paid: income.paid,
              hasInvoice: !!(income.invoice && income.invoice.id),
              invoiceId: income.invoice?.id,
              hasGrant: !!(income.grant && income.grant.id),
              grantId: income.grant?.id,
              hasIncome: !!(income.income && income.income.id),
              incomeId: income.income?.id
            });
            
            let isMatched = false;
            
            // Check if line is newly assigned
            if (income.assign) {
              isMatched = true;
            }
            // Check if line already has the document linked
            else if (this.documentType === 'emitted-invoices' && income.invoice && income.invoice.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'received-grants' && income.grant && income.grant.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'received-incomes' && income.income && income.income.id === this.documentId) {
              isMatched = true;
            }
            
            if (isMatched) {
              const lineTotal = budgetLineTotal(income);
              totalAssigned += lineTotal;
              matchedLines.push({ concept: income.concept, quantity: income.quantity, amount: income.amount, lineTotal });
            }
          });
        });
        
        
        const diff = Math.abs(this.documentTotal - totalAssigned);
        const hasWarning = diff > 0.01;
        
        
        // Update warning for all matched lines
        this.phases.forEach(phase => {
          phase.incomes.forEach(income => {
            let isMatched = false;
            
            if (income.assign) {
              isMatched = true;
            }
            else if (this.documentType === 'emitted-invoices' && income.invoice && income.invoice.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'received-grants' && income.grant && income.grant.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'received-incomes' && income.income && income.income.id === this.documentId) {
              isMatched = true;
            }
            
            if (isMatched && income.warning !== hasWarning) {
              income.warning = hasWarning;
              income.dirty = true;
            }
          });
        });
        return;
      }
      
      if (this.mode === 'expenses' && this.documentId && this.documentTotal) {
        // Sum all lines that reference this document (either assign=true OR already linked)
        let totalAssigned = 0;
        const matchedLines = [];
        
        this.phases.forEach(phase => {
          phase.expenses.forEach(expense => {
            let isMatched = false;
            
            // Check if line is newly assigned
            if (expense.assign) {
              isMatched = true;
            }
            // Check if line already has the document linked
            else if (this.documentType === 'received-invoices' && expense.invoice && expense.invoice.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'received-expenses' && expense.expense && expense.expense.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'tickets' && expense.ticket && expense.ticket.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'diets' && expense.diet && expense.diet.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'received-grants' && expense.grant && expense.grant.id === this.documentId) {
              isMatched = true;
            }
            
            if (isMatched) {
              const lineTotal = budgetLineTotal(expense);
              totalAssigned += lineTotal;
              matchedLines.push({ concept: expense.concept, quantity: expense.quantity, amount: expense.amount, lineTotal });
            }
          });
        });
        
        const diff = Math.abs(this.documentTotal - totalAssigned);
        const hasWarning = diff > 0.01;
        
        
        // Update warning for all matched lines
        this.phases.forEach(phase => {
          phase.expenses.forEach(expense => {
            let isMatched = false;
            
            if (expense.assign) {
              isMatched = true;
            }
            else if (this.documentType === 'received-invoices' && expense.invoice && expense.invoice.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'received-expenses' && expense.expense && expense.expense.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'tickets' && expense.ticket && expense.ticket.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'diets' && expense.diet && expense.diet.id === this.documentId) {
              isMatched = true;
            }
            else if (this.documentType === 'received-grants' && expense.grant && expense.grant.id === this.documentId) {
              isMatched = true;
            }
            
            if (isMatched && expense.warning !== hasWarning) {
              expense.warning = hasWarning;
              expense.dirty = true;
            }
          });
        });
        return;
      }
      
      // Normal project view mode: Trust the stored warning field from database
      // Don't recalculate because we only have phases from ONE project here,
      // but documents might be split across multiple projects
    }
  }
};
</script>

<style>
/* issues/344: the line of the document being viewed */
.project-form-phases tr.is-current-document > td {
  background: var(--a-warn-bg);
}
.project-form-phases tr.is-current-document > td:first-child {
  box-shadow: inset 4px 0 0 var(--a-accent);
}
.project-form-phases .current-document-button {
  margin-left: auto;
}
/* issues/345: drag & drop of the lines */
.project-form-phases .col-drag {
  width: 20px;
  padding-left: 0 !important;
  padding-right: 0 !important;
  vertical-align: middle !important;
}
.project-form-phases .line-drag-handle {
  display: inline-flex;
  cursor: grab;
  color: var(--a-muted);
}
.project-form-phases .line-drag-handle:hover {
  color: var(--a-fg);
}
.project-form-phases tr.is-dragging > td {
  opacity: 0.4;
}
.project-form-phases tr.drop-before > td {
  box-shadow: inset 0 2px 0 var(--a-accent);
}
.project-form-phases tr.drop-after > td {
  box-shadow: inset 0 -2px 0 var(--a-accent);
}

/* Redesign A: phase head, folding, quiet line actions, columns that don't truncate */
.project-form-phases .phases-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  margin-bottom: .75rem;
}
.project-form-phases .phases-count {
  color: var(--a-muted);
  font-weight: 700;
  font-size: .875rem;
}
.project-form-phases .phases-toolbar-actions {
  display: flex;
  gap: .5rem;
}
.project-form-phases .phase-container {
  margin: 0 0 .75rem !important;
  border: 1px solid var(--a-line);
  border-radius: 10px;
  background: var(--a-surface);
}
.project-form-phases .phase-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem 1rem;
  padding: .625rem .75rem;
  background: var(--a-thead);
  border-radius: 10px;
}
.project-form-phases .phase-toggle {
  flex: none;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--a-fg-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.project-form-phases .phase-toggle:hover {
  background: var(--a-chip);
}
.project-form-phases .phase-name {
  flex: 1 1 16rem;
  min-width: 0;
}
.project-form-phases .phase-name .input {
  font-weight: 800;
}
.project-form-phases .phase-sums {
  display: flex;
  flex-wrap: wrap;
  gap: .25rem 1.25rem;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.project-form-phases .phase-sums div {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.project-form-phases .phase-sums dt {
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-muted);
}
.project-form-phases .phase-sums dd {
  margin: 0;
  font-weight: 800;
  white-space: nowrap;
}
.project-form-phases .phase-actions {
  display: flex;
  gap: .25rem;
}
.project-form-phases .phase-actions .button,
.project-form-phases .button.line-action {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  color: var(--a-fg-2);
  box-shadow: none;
}
.project-form-phases .phase-actions .button:hover,
.project-form-phases .button.line-action:hover {
  background: var(--a-chip);
  color: var(--a-fg);
}
.project-form-phases .phase-actions .button[title^="Esborra"]:hover,
.project-form-phases .button.line-action[title^="Esborra"]:hover {
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
}
.project-form-phases .subphases-list {
  padding: .5rem .75rem .75rem;
}
.project-form-phases .subphase-detail-title {
  font-weight: 800;
  color: var(--a-fg);
  margin: .25rem 0 .375rem;
}
.project-form-phases .lines-count {
  display: inline-block;
  min-width: 1.5rem;
  padding: 0 .375rem;
  border-radius: 999px;
  background: var(--a-chip);
  color: var(--a-fg-2);
  font-size: .75rem;
  text-align: center;
}
/* wide budgets scroll inside the phase instead of truncating dates and types */
.project-form-phases .subphases-list .table-wrapper {
  overflow-x: auto;
}
.project-form-phases .subphases-list .table td,
.project-form-phases .subphases-list .table th {
  padding: .3rem .375rem;
}
.project-form-phases .subphases-list .table .input,
.project-form-phases .subphases-list .table .select select {
  height: 2.125rem;
  font-size: .8125rem;
}
/* dates: no calendar icon inside the table (the picker still opens on click) */
.project-form-phases .subphases-list .table .datepicker .control.has-icons-left .icon.is-left {
  display: none;
}
.project-form-phases .subphases-list .table .datepicker .control.has-icons-left .input {
  padding-left: .5rem;
  min-width: 6.5rem;
}
.project-form-phases .subphases-list .table .select select {
  min-width: 4.75rem;
}
.project-form-phases .subphases-list .table td.col-type .select select {
  min-width: 9rem;
}
.project-form-phases .subphases-list .table td.col-concept {
  min-width: 10rem;
}
.project-form-phases .subphases-list .table td.col-qty .input {
  min-width: 3.5rem;
}
.project-form-phases .subphases-list .table td.col-price .input {
  min-width: 5.5rem;
}
/* laptops (1440 with the menu collapsed): tighter cells so the whole line fits,
   actions and document included, without scrolling sideways */
@media screen and (min-width: 1024px) and (max-width: 1919px) {
  .project-form-phases .subphases-list .table td,
  .project-form-phases .subphases-list .table th {
    padding-left: .25rem;
    padding-right: .25rem;
  }
  .project-form-phases .subphases-list .table td.col-type .select select {
    min-width: 8.25rem;
  }
  .project-form-phases .subphases-list .table .datepicker .control.has-icons-left .input {
    min-width: 6rem;
  }
  .project-form-phases .subphases-list .table .button.line-action.ml-2 {
    margin-left: .25rem !important;
  }
}
.warning-tag {
  padding-left: 0.5rem;
}
.inline {
  display: inline;
}
.subphase-detail-input-phase-subtotal {
  min-width: 35%;
}
.subphase-detail-input-phase-total {
  text-align: right;
}
.subphase-detail-input select {
  min-width: 120px;
  max-width: 120px;
}
.subphase-detail-input-short select {
  min-width: 80px;
  max-width: 80px;
}

.subphases-list .table td, .subphases-list .table th {
  padding: 0.25em 0.375em;
}


.phase-container{
  background: var(--a-thead);
  border: 2px solid var(--a-line-soft);
  margin-bottom: 2rem!important;  
}
.subphase-detail-title {
  font-size: 1.0rem!important;
  font-weight: bold;  
}
.phase-container .b-table .table {
  background: var(--a-thead);

}
</style>
