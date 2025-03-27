<template>
  <div class="project-form-phases" v-if="form && !isLoading">
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

    <div class="columns subphase-detail-title">
      <div class="column is-8">Fase</div>
      <div class="column is-1">Ing - Des</div>
      <div class="column is-1">Total</div>
      <div class="column is-2">Accions</div>
    </div>

    <div
      v-for="(phase, phi) in phases"
      class="phase-container columns is-multiline"
    >
      <div class="column is-8">
        <form @submit.prevent="blurPhaseEdit(phase)">
          <b-input
            placeholder="Nom de la fase..."
            v-model="phase.name"
            @input="blurPhaseEdit(phase)"
            class="phase-detail-input"
            :disabled="(mode !== '' && mode !== 'simple') || !editable"
          >
          </b-input>
        </form>
      </div>
      <div class="column is-1">
        <div
          class="readonly
                subphase-detail-input zsubphase-detail-input-phase-subtotal subphase-detail-input-phase-total"
        >
          <money-format
            class="inline"
            :value="subTotalIncomes(phase)"
            :locale="'es'"
            currency-code=" "
            :subunits-value="false"
            :hide-subunits="false"
          >
          </money-format>
          -
          <money-format
            class="inline"
            :value="subTotalExpenses(phase)"
            :locale="'es'"
            currency-code=" "
            :subunits-value="false"
            :hide-subunits="false"
          >
          </money-format>
        </div>
      </div>
      <div class="column is-1">
        <div
          class="readonly
                subphase-detail-input zsubphase-detail-input-phase-subtotal subphase-detail-input-phase-total"
        >
          <money-format
            class="inline"
            :value="phase.total_amount ? phase.total_amount : 0"
            :locale="'es'"
            :currency-code="'EUR'"
            :subunits-value="false"
            :hide-subunits="false"
          >
          </money-format>
        </div>
      </div>
      <div v-if="mode === '' || mode === 'simple'" class="column is-2">
        <button
          class="button is-small is-danger"
          type="button"
          title="Esborrar"
          :disabled="
            !editable ||
              phase.incomes.find(s => s.paid && mode !== 'simple') ||
              phase.expenses.find(s => s.paid && mode !== 'simple') ||
              (mode === 'simple' &&
                phase.incomes.find(
                  s => s.estimated_hours && s.estimated_hours.length > 0
                ))
          "
          @click.prevent="removePhase(phi)"
        >
          <b-icon icon="trash-can" size="is-small" />
        </button>
        <button
          v-if="mode === 'simple'"
          class="button is-small is-danger ml-1"
          type="button"
          title="Copiar fase a execució"
          :disabled="!editable"
          @click.prevent="copyPhase(phi)"
        >
          <b-icon icon="content-duplicate" size="is-small" />
        </button>
      </div>
      <div class="column is-12 subphases-list" v-if="mode !== 'expenses'">
        <div class="subphase-detail-title">
          Ingressos
        </div>
        <b-table v-if="form && phase.incomes" :data="phase.incomes" ref="table"
          :paginated="isPaginated && phase.incomes.length > 10"
          :per-page="perPage"
          pagination-position="top"
          :pagination-simple="true"
        >
          <b-table-column field="name" label="Tipus" width="40px" v-slot="props">
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
                  @input="somethingChanged(props.row)"
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
          <b-table-column field="name" label="Concepte" width="450" v-slot="props">
            <b-field
                
                class="subphase-detail-input-large-field"
              >
                <b-input
                  name="SubFase"
                  placeholder="Nom de la subfase..."
                  v-model="props.row.concept"
                  class="subphase-detail-input subphase-detail-input-large"
                  @input="somethingChanged(props.row)"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Quantitat" width="80" v-slot="props">
              <b-field
                class="medium-field"
              >
                <b-input
                  name="Unitats"
                  placeholder="Quantitat, hores, unitats..."
                  v-model="props.row.quantity"
                  @input="
                    changeSubPhase(props.row, 'quantity', props.row.quantity)
                  "
                  class="subphase-detail-input"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Preu" width="80" v-slot="props">
              <b-field class="medium-field">
                <b-input
                  name="PreuUnitari"
                  placeholder="Preu per unitat"
                  v-model="props.row.amount"
                  @input="changeSubPhase(props.row, 'amount', props.row.amount)"
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
                    :value="
                      props.row.quantity * props.row.amount
                        ? props.row.quantity * props.row.amount
                        : 0
                    "
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
                <b-datepicker
                  v-model="props.row.date_estimate_document"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data factura"
                  @input="
                    input;
                    somethingChanged(props.row);
                  "
                  trap-focus
                  editable
                  :disabled="!editable"
                >
                </b-datepicker>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Previsió pag." width="100" v-slot="props">
              <b-field
                class="date-field"
              >
                <b-datepicker
                  v-model="props.row.date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data pagament"
                  @input="
                    input;
                    somethingChanged(props.row);
                  "
                  trap-focus
                  editable
                  :disabled="!editable"
                >
                </b-datepicker>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Accions" width="80" v-slot="props">
              <b-field class="medium-field">
                <button
                  class="button is-small is-primary ml-2"
                  type="button"
                  @click.prevent="
                    splitSubPhase(phase, props.row, phi, props.index)
                  "
                  :disabled="!editable"
                >
                  <b-icon icon="arrow-split-horizontal" size="is-small" />
                </button>
                <button
                  class="button is-small is-danger ml-2"
                  type="button"
                  :disabled="
                    !editable ||
                      (props.row.paid && mode !== 'simple') ||
                      (mode === 'simple' &&
                        props.row.estimated_hours &&
                        props.row.estimated_hours.length > 0)
                  "
                  @click.prevent="removeSubPhase(phase, props.row, props.index)"
                >
                  <b-icon icon="trash-can" size="is-small" />
                </button>
                <button
                  v-if="props.index === phase.incomes.length - 1"
                  class="button is-small is-primary ml-2"
                  type="button"
                  @click.prevent="addSubPhase(phase)"
                  :disabled="!editable"
                >
                  <b-icon icon="plus-circle" size="is-small" />
                </button>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Facturat" width="30" v-slot="props" v-if="me.options && me.options.treasury && mode !== 'simple'">
              <b-field
                class="short-field"
              >
                <b-checkbox
                  v-model="props.row.paid"
                  class="checkbox-inline"
                  @input="paidChanged(props.row)"
                  :disabled="!editable"
                >
                </b-checkbox>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Document" width="100" v-slot="props" v-if="me.options && me.options.treasury && mode !== 'simple'">            
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
        <div class="add-subphase mt-2" v-if="phase.incomes.length === 0">
          <button
            class="button is-small is-primary"
            type="button"
            @click.prevent="addSubPhase(phase)"
            :disabled="!editable"
          >
            <b-icon icon="plus-circle" size="is-small" />
          </button>
        </div>
      </div>
      <div class="column is-12 subphases-list" v-if="mode !== 'incomes'">
        <div class="subphase-detail-title">
          Despeses
        </div>
        <b-table v-if="form && phase.expenses" :data="phase.expenses" ref="table"
        :paginated="isPaginated && phase.expenses.length > 10"
          :per-page="perPage"
          pagination-position="top"
          :pagination-simple="true">
          <b-table-column field="name" label="Tipus" width="80" v-slot="props">
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
                  @input="somethingChanged(props.row)"
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
          <b-table-column field="name" label="Concepte" width="450" v-slot="props">
            <b-field                
                class="subphase-detail-input-large-field"
              >
                <b-input
                  name="SubFase"
                  placeholder="Nom de la despesa..."
                  v-model="props.row.concept"
                  class="subphase-detail-input subphase-detail-input-large"
                  @input="somethingChanged(props.row)"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Quantitat" width="80" v-slot="props">
              <b-field
                class="medium-field"
              >
                <b-input
                  name="Unitats"
                  placeholder="Quantitat, hores, unitats..."
                  v-model="props.row.quantity"
                  @input="
                    changeSubPhase(props.row, 'quantity', props.row.quantity)
                  "
                  class="subphase-detail-input"
                  :disabled="!editable"
                >
                </b-input>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Preu" width="80" v-slot="props">
              <b-field class="medium-field">
                <b-input
                  name="PreuUnitari"
                  placeholder="Preu per unitat"
                  v-model="props.row.amount"
                  @input="changeSubPhase(props.row, 'amount', props.row.amount)"
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
                    :value="props.row.quantity * props.row.amount"
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
                <b-datepicker
                  v-model="props.row.date_estimate_document"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data factura"
                  @input="
                    input;
                    somethingChanged(props.row);
                  "
                  trap-focus
                  editable
                  :disabled="!editable"
                >
                </b-datepicker>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Previsió pag." width="100" v-slot="props">
              <b-field
                class="date-field"
              >
                <b-datepicker
                  v-model="props.row.date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data pagament"
                  @input="
                    input;
                    somethingChanged(props.row);
                  "
                  trap-focus
                  editable
                  :disabled="!editable"
                >
                </b-datepicker>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Accions" width="80" v-slot="props">
              <b-field class="medium-field">
                <button
                  class="button is-small is-primary ml-2"
                  type="button"
                  @click.prevent="
                    splitSubExpense(phase, props.row, phi, props.index)
                  "
                  :disabled="!editable"
                >
                  <b-icon icon="arrow-split-horizontal" size="is-small" />
                </button>
                <button
                  class="button is-small is-danger ml-2"
                  type="button"
                  :disabled="props.row.paid || !editable"
                  @click.prevent="removeSubExpense(phase, props.row, props.index)"
                >
                  <b-icon icon="trash-can" size="is-small" />
                </button>                
                <button
                  v-if="props.index === phase.expenses.length - 1"
                  class="button is-small is-primary ml-2"
                  type="button"
                  @click.prevent="addSubExpense(phase)"
                  :disabled="!editable"
                >
                  <b-icon icon="plus-circle" size="is-small" />
                </button>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Facturat" width="30" v-slot="props" v-if="me.options && me.options.treasury && mode !== 'simple'">
              <b-field
                class="short-field"
              >
                <b-checkbox
                  v-model="props.row.paid"
                  class="checkbox-inline"
                  @input="paidChanged(props.row)"
                  :disabled="!editable"
                >
                </b-checkbox>
              </b-field>
          </b-table-column>
          <b-table-column field="name" label="Document" width="100" v-slot="props" v-if="me.options && me.options.treasury && mode !== 'simple'">
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
        <div class="add-subphase mt-2" v-if="phase.expenses.length === 0">
          <button
            class="button is-small is-primary"
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
import dayjs from "dayjs";
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import ModalBoxInvoicing from "@/components/ModalBoxInvoicing";
import ModalBoxSplit from "@/components/ModalBoxSplit";
import service from "@/service/index";
import MoneyFormat from "@/components/MoneyFormat.vue";
import { EventBus } from "@/service/event-bus.js";
import sumBy from "lodash/sumBy";
import { mapState } from "vuex";
import moment from "moment";
import sortBy from "lodash/sortBy";
import RadioPicker from "@/components/RadioPicker";
import { sub } from "date-fns";
import { de, is } from "date-fns/locale";

export default {
  name: "ProjectFormPhases",
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat,
    ModalBoxInvoicing,
    ModalBoxSplit,
    RadioPicker
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
    perPage: {
      type: Number,
      default: 10
    },
    isPaginated: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
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
        id: r.id
      };
    });

    this.incomeTypes = await service({ requiresAuth: true, cached: true })
      .get("income-types")
      .then(r => r.data);

    this.incomeTypes = this.incomeTypes.map(r => {
      return {
        name: r.name,
        id: r.id
      };
    });

    this.clients = await service({ requiresAuth: true })
      .get("contacts/basic?_limit=-1&_sort=name:ASC")
      .then(r => r.data);

    const phases0 = this.projectPhases.map(r => {
      return {
        ...r,
        opened: true,
        total_amount:
          sumBy(r.incomes, "total_amount") - sumBy(r.expenses, "total_amount")
      };
    });

    phases0.forEach(p => {
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
          s.income_type = { id: s.income_type.id, name: s.income_type.name };
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
          s.expense_type = { id: s.expense_type.id, name: s.expense_type.name };
        }
      });
    });

    this.phases = phases0;

    // console.log('this.phases', this.phases)
    this.isLoading = false;
  },
  methods: {
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
    somethingChanged(subphase) {
      subphase.dirty = true;
      this.needsUpdate = true;
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    changeSubPhase(subphase, field, value) {
      subphase.dirty = true;
      if (value && value.toString().includes(",")) {
        subphase[field] = value.toString().replace(",", ".");        
      }
      this.phases = this.phases.map(r => {
        return {
          ...r,
          opened: true,
          total_amount:
            sumBy(r.incomes, x => x.quantity * x.amount) -
            sumBy(r.expenses, x => x.quantity * x.amount)
        };
      });
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
      return sumBy(phase.incomes, x => x.quantity * x.amount);
    },
    subTotalExpenses(phase) {
      return sumBy(phase.expenses, x => x.quantity * x.amount);
    },
    copyPhase(i) {
      this.$emit("phases-copy", { index: i });
    },
    input(v) {
      this.createdReadable = dayjs(v).format("MMM D, YYYY");
    },
    removeSubPhase(phase, subphase, j) {
      this.needsUpdate = true;
      this.deletedIncomes.push(subphase.id);
      phase.incomes = phase.incomes.filter((s, i) => i !== j);      
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
      this.$emit("phases-updated", {
        phases: this.phases,
        projectId: this.form.id,
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses
      });
    },
    addSubPhase(phase) {
      this.needsUpdate = true;
      // console.log('this.form', this.form)
      phase.incomes.push({
        concept: "",
        quantity: 1,
        amount: 0,
        assign: false,
        date_estimate_document: this.form.date_end
          ? moment(this.form.date_end, "YYYY-MM-DD").toDate()
          : null,
        date: this.form.date_end
          ? moment(this.form.date_end, "YYYY-MM-DD").toDate()
          : null,
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
      this.needsUpdate = true;
      phase.expenses.push({
        concept: "",
        quantity: 1,
        amount: 0,
        assign: false,
        date_estimate_document: this.form.date_end
          ? moment(this.form.date_end, "YYYY-MM-DD").toDate()
          : null,
        date: this.form.date_end
          ? moment(this.form.date_end, "YYYY-MM-DD").toDate()
          : null,
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
          subphase.assign = !subphase.assign;
          subphase.paid = true; // necessary
          // }

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
          subphase.assign = !subphase.assign;
          subphase.paid = true; // necessary

          this.$emit("phases-updated", {
            phases: this.phases,
            projectId: this.form.id
          });
        }
      }
    },
    async modalSubmit(invoicing) {
      // console.log("invoicing", invoicing);
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
      // console.log('action',action)

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
            console.log("action.subphase", action.subphase);
            const newIncome = {
              income_type: action.subphase.income_type,
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
      this.somethingChanged(subphase);
    },
    importWarning(subphase, document) {
      return document
        ? document.total_base !== subphase.quantity * subphase.amount
        : false;
    }
  }
};
</script>

<style>
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
  min-width: 180px;
}
.phase-container{
  background: #fafafa;
  border: 2px solid #eee;
  margin-bottom: 2rem!important;  
}
.subphase-detail-title {
  font-size: 1.0rem!important;
  font-weight: bold;  
}
.phase-container .b-table .table {
  background: #fafafa;

}
</style>
