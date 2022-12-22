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
        <b-table
          v-if="form && phases"
          :data="phases"
          ref="table"
          :opened-detailed="[true]"
          detailed
          detail-key="opened"
          :detail-transition="transitionName"
          :show-detail-icon="false"
        >
          <b-table-column field="name" label="Fase" width="500" v-slot="props">
            <form @submit.prevent="blurPhaseEdit()">
              <b-input
                placeholder="Nom de la fase..."
                v-model="props.row.name"
                @input="blurPhaseEdit()"
                class="phase-detail-input"
                :disabled="mode !== '' && mode !== 'simple'"
              >
              </b-input>
            </form>
          </b-table-column>
          <b-table-column field="name" label="Total" width="150" v-slot="props">
            <div
              class="
                readonly
                subphase-detail-input subphase-detail-input-phase-total
              "
            >
              <money-format
                :value="props.row.total_amount ? props.row.total_amount : 0"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
          </b-table-column>
          <b-table-column
            v-if="mode === '' || mode === 'simple'"
            field="name"
            label="Esborrar"
            width="150"
            v-slot="props"
          >
            <button
              class="button is-small is-danger"
              type="button"
              :disabled="( props.row.subphases.find(s => s.paid && mode !== 'simple') || props.row.expenses.find(s => s.paid && mode !== 'simple') ) || ( mode === 'simple' && props.row.subphases.find(s => s.estimated_hours && s.estimated_hours.length > 0) )"
              @click.prevent="removePhase(props.index)"
            >

              <b-icon icon="trash-can" size="is-small" />
            </button>
          </b-table-column>
          <template #detail="props">
            <b-field label="Ingressos" horizontal class="has-text-left" v-if="mode !== 'expenses'">
            </b-field>
            <ul class="subphases-list" v-if="mode !== 'expenses'">
              <li
                v-for="(subphase, j) in props.row.subphases"
                :key="j"
                class="subphase mt-2 mb-2"
              >
                <b-field grouped>
                  <b-field
                    v-if="
                      (incomeTypes && incomeTypes.length) ||
                      (expenseTypes && expenseTypes.length)
                    "
                    :label="j == 0 ? 'Tipus' : null"
                    class="subphase-detail-input"
                  >
                    <b-select
                      v-model="subphase.income_type"
                      placeholder="Tipus"
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
                  <b-field
                    :label="j == 0 ? 'Concepte' : null"
                    class="subphase-detail-input-large-field"
                  >
                    <b-input
                      name="SubFase"
                      placeholder="Nom de la subfase..."
                      v-model="subphase.concept"
                      class="subphase-detail-input subphase-detail-input-large"
                      @input="somethingChanged()"
                    >
                    </b-input>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Quantitat' : null"
                    class="medium-field"
                  >
                    <b-input
                      name="Unitats"
                      placeholder="Quantitat, hores, unitats..."
                      v-model="subphase.quantity"
                      @input="
                        changeSubPhase(subphase, 'quantity', subphase.quantity)
                      "
                      class="subphase-detail-input"
                    >
                    </b-input>
                  </b-field>
                  <b-field :label="j == 0 ? 'Preu' : null" class="medium-field">
                    <b-input
                      name="PreuUnitari"
                      placeholder="Preu per unitat"
                      v-model="subphase.amount"
                      @input="
                        changeSubPhase(
                          subphase,
                          'amount',
                          subphase.amount
                        )
                      "
                      class="subphase-detail-input"
                    >
                    </b-input>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Total' : null"
                    class="medium-field"
                  >
                    <div class="readonly subphase-detail-input">
                      <money-format
                        :value="
                          subphase.quantity * subphase.amount
                            ? subphase.quantity * subphase.amount
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

                
                
                <!-- </b-field>
                <b-field horizontal class="b-field-row-2"> -->

                  <b-field
                    :label="j == 0 ? 'Previsió fac.' : null"
                    v-if="me.options && me.options.treasury"
                    class="date-field"
                  >
                    <b-datepicker
                      v-model="subphase.date_estimate_document"
                      :show-week-number="false"
                      :locale="'ca-ES'"
                      :first-day-of-week="1"
                      icon="calendar-today"
                      placeholder="Data factura"
                      @input="input;somethingChanged()"
                      trap-focus
                      editable                      
                    >
                    </b-datepicker>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Previsió pag.' : null"
                    v-if="me.options && me.options.treasury"
                    class="date-field"
                  >
                    <b-datepicker
                      v-model="subphase.date"
                      :show-week-number="false"
                      :locale="'ca-ES'"
                      :first-day-of-week="1"
                      icon="calendar-today"
                      placeholder="Data pagament"
                      @input="input;somethingChanged()"
                      trap-focus
                      editable                      
                    >
                    </b-datepicker>
                  </b-field>

                  <b-field
                    :label="j == 0 ? 'Accions' : null"
                    class="medium-field"
                  >
                    <button
                      v-if="mode !== 'simple'"
                      class="button is-small is-primary ml-2"
                      type="button"
                      @click.prevent="
                        splitSubPhase(props.row, subphase, props.index, j)
                      "
                    >
                      <b-icon icon="arrow-split-horizontal" size="is-small" />
                    </button>
                    <button
                      class="button is-small is-danger ml-2"
                      type="button"
                      :disabled="(subphase.paid && mode !== 'simple' ) || ( mode === 'simple' && subphase.estimated_hours && subphase.estimated_hours.length > 0 )"
                      @click.prevent="removeSubPhase(props.row, subphase, j)"
                    >
                      <b-icon icon="trash-can" size="is-small" />
                    </button>
                    <button
                      v-if="j === props.row.subphases.length - 1"
                      class="button is-small is-primary ml-2"
                      type="button"
                      @click.prevent="addSubPhase(props.row)"
                    >
                      <b-icon icon="plus-circle" size="is-small" />
                    </button>
                  </b-field>  

                  <b-field
                    :label="j == 0 ? 'Facturat' : null"
                    v-if="me.options && me.options.treasury && mode !== 'simple'"
                    class="short-field"
                  >
                    <b-checkbox v-model="subphase.paid" class="checkbox-inline" @input="paidChanged(subphase)">
                    </b-checkbox>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Document' : null"
                    v-if="me.options && me.options.treasury && mode !== 'simple'"
                    class="zshort-field"
                  >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.invoice &&
                        subphase.invoice.id
                      "
                      :title="`${subphase.invoice.total_base} €`"
                      class="tag is-primary invoice-tag clickable"
                      @click="
                        setInvoice(
                          'incomes',
                          props.row,
                          subphase,
                          props.index,
                          j
                        )
                      "
                      >F {{ subphase.invoice.code }}
                      <b-icon icon="alert-circle" class="warning-tag" size="is-small" v-if="importWarning(subphase, subphase.invoice)" title="Imports diferents" />
                      </span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.grant &&
                        subphase.grant.id
                      "                      
                      :title="`${subphase.grant.total_base} €`"
                      class="tag is-primary invoice-tag clickable"
                      @click="
                        setInvoice(
                          'incomes',
                          props.row,
                          subphase,
                          props.index,
                          j
                        )
                      "
                      >S {{ subphase.grant.code }}
                      <b-icon icon="alert-circle" class="warning-tag" size="is-small" v-if="importWarning(subphase, subphase.grant)" title="Imports diferents" />
                      </span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.income &&
                        subphase.income.id
                      "                      
                      :title="`${subphase.income.total_base} €`"
                      class="tag is-primary invoice-tag clickable"
                      @click="
                        setInvoice(
                          'incomes',
                          props.row,
                          subphase,
                          props.index,
                          j
                        )
                      "
                      >D {{ subphase.income.code }}
                      <b-icon icon="alert-circle" class="warning-tag" size="is-small" v-if="importWarning(subphase, subphase.income)" title="Imports diferents" />
                      </span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.paid &&
                        !subphase.invoice &&
                        !subphase.income &&
                        !subphase.grant
                      "
                      class="tag is-warning invoice-tag clickable"
                      @click="
                        setInvoice(
                          'incomes',
                          props.row,
                          subphase,
                          props.index,
                          j
                        )
                      "
                      >{{ subphase.assign === true ? 'Assignat' : "Document" }}</span
                    >
                  </b-field>
                </b-field>
              </li>
            </ul>
            <div
              class="add-subphase mt-2"
              v-if="props.row.subphases.length === 0"
            >
              <button
                class="button is-small is-primary"
                type="button"
                @click.prevent="addSubPhase(props.row)"
              >
                <b-icon icon="plus-circle" size="is-small" />
              </button>
            </div>
            <b-field label="Despeses" horizontal class="has-text-left mt-5" v-if="mode !== 'incomes'">
            </b-field>
            <ul class="subphases-list" v-if="mode !== 'incomes'">
              <li
                v-for="(subphase, j) in props.row.expenses"
                :key="j"
                class="subphase mt-2 mb-2"
              >
                <b-field grouped>
                  <b-field
                    v-if="
                      (incomeTypes && incomeTypes.length) ||
                      (expenseTypes && expenseTypes.length)
                    "
                    :label="j == 0 ? 'Tipus' : null"
                    class="subphase-detail-input"
                  >
                    <b-select
                      v-model="subphase.expense_type"
                      placeholder="Tipus"
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
                  <b-field
                    :label="j == 0 ? 'Concepte' : null"
                    class="subphase-detail-input-large-field"
                  >
                    <b-input
                      name="SubFase"
                      placeholder="Nom de la despesa..."
                      v-model="subphase.concept"
                      class="subphase-detail-input subphase-detail-input-large"
                      @input="somethingChanged()"
                    >
                    </b-input>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Quantitat' : null"
                    class="medium-field"
                  >
                    <b-input
                      name="Unitats"
                      placeholder="Quantitat, hores, unitats..."
                      v-model="subphase.quantity"
                      @input="
                        changeSubPhase(subphase, 'quantity', subphase.quantity)
                      "
                      class="subphase-detail-input subphase-detail-input-short"
                    >
                    </b-input>
                  </b-field>
                  <b-field :label="j == 0 ? 'Preu' : null" class="medium-field">
                    <b-input
                      name="PreuUnitari"
                      placeholder="Preu per unitat"
                      v-model="subphase.amount"
                      @input="
                        changeSubPhase(subphase, 'amount', subphase.amount)
                      "
                      class="subphase-detail-input subphase-detail-input-short"
                    >
                    </b-input>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Total' : null"
                    class="medium-field"
                  >
                    <div
                      class="
                        readonly
                        subphase-detail-input subphase-detail-input-short
                      "
                    >
                      <money-format
                        :value="subphase.quantity * subphase.amount"
                        :locale="'es'"
                        :currency-code="'EUR'"
                        :subunits-value="false"
                        :hide-subunits="false"
                      >
                      </money-format>
                    </div>
                  </b-field>

                  

                <!-- </b-field>
                <b-field grouped class="b-field-row-2"> -->

                  <b-field
                    :label="j == 0 ? 'Previsió fac.' : null"
                    v-if="me.options && me.options.treasury"
                    class="date-field"
                  >
                    <b-datepicker
                      v-model="subphase.date_estimate_document"
                      :show-week-number="false"
                      :locale="'ca-ES'"
                      :first-day-of-week="1"
                      icon="calendar-today"
                      placeholder="Data factura"
                      @input="input;somethingChanged()"
                      trap-focus
                      editable
                    >
                    </b-datepicker>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Previsió pag.' : null"
                    v-if="me.options && me.options.treasury"
                    class="date-field"
                  >
                    <b-datepicker
                      v-model="subphase.date"
                      :show-week-number="false"
                      :locale="'ca-ES'"
                      :first-day-of-week="1"
                      icon="calendar-today"
                      placeholder="Data pagament"
                      @input="input;somethingChanged()"
                      trap-focus
                      editable
                    >
                    </b-datepicker>
                  </b-field>

                  <b-field
                    :label="j == 0 ? 'Accions' : null"
                    class="medium-field"
                  >
                    <button
                      v-if="mode !== 'simple'"
                      class="button is-small is-primary ml-2"
                      type="button"
                      @click.prevent="
                        splitSubExpense(props.row, subphase, props.index, j)
                      "
                    >
                      <b-icon icon="arrow-split-horizontal" size="is-small" />
                    </button>
                    <button
                      class="button is-small is-danger ml-2"
                      type="button"
                      :disabled="subphase.paid"
                      @click.prevent="removeSubExpense(props.row, subphase, j)"
                    >
                      <b-icon icon="trash-can" size="is-small" />
                    </button>
                    <button
                      v-if="j === props.row.expenses.length - 1"
                      class="button is-small is-primary ml-2"
                      type="button"
                      @click.prevent="addSubExpense(props.row)"
                    >
                      <b-icon icon="plus-circle" size="is-small" />
                    </button>
                  </b-field>


                  <b-field
                    :label="j == 0 ? 'Facturat' : null"
                    v-if="me.options && me.options.treasury && mode !== 'simple'"
                    class="short-field"
                  >
                    <b-checkbox v-model="subphase.paid" class="checkbox-inline"  @input="paidChanged(subphase)">
                    </b-checkbox>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Document' : null"
                    v-if="me.options && me.options.treasury && mode !== 'simple'"
                  >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.invoice &&
                        subphase.invoice.id
                      "                      
                      :title="`${subphase.invoice.total_base} €`"
                      class="tag is-primary invoice-tag clickable"
                      @click="
                        setInvoice(
                          'expenses',
                          props.row,
                          subphase,
                          props.index,
                          j
                        )
                      "
                      >F {{ subphase.invoice.code }}
                      <b-icon icon="alert-circle" class="warning-tag" size="is-small" v-if="importWarning(subphase, subphase.invoice)" title="Imports diferents" /></span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.ticket &&
                        subphase.ticket.id
                      "                      
                      :title="`${subphase.ticket.total_base} €`"
                      class="tag is-primary invoice-tag clickable"
                      @click="
                        setInvoice(
                          'expenses',
                          props.row,
                          subphase,
                          props.index,
                          j
                        )
                      "
                      >T {{ subphase.ticket.code }}
                      <b-icon icon="alert-circle" class="warning-tag" size="is-small" v-if="importWarning(subphase, subphase.ticket)" title="Imports diferents" /></span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.diet &&
                        subphase.diet.id
                      "
                      :title="`${subphase.diet.total_base} €`"
                      class="tag is-primary invoice-tag clickable"
                      @click="
                        setInvoice(
                          'expenses',
                          props.row,
                          subphase,
                          props.index,
                          j
                        )
                      "
                      >D {{ subphase.diet.code }}
                      <b-icon icon="alert-circle" class="warning-tag" size="is-small" v-if="importWarning(subphase, subphase.diet)" title="Imports diferents" /></span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.expense &&
                        subphase.expense.id
                      "
                      :title="`${subphase.expense.total_base} €`"
                      class="tag is-primary invoice-tag clickable"
                      @click="
                        setInvoice(
                          'expenses',
                          props.row,
                          subphase,
                          props.index,
                          j
                        )
                      "
                      >D {{ subphase.expense.code }}
                      <b-icon icon="alert-circle" class="warning-tag" size="is-small" v-if="importWarning(subphase, subphase.expense)" title="Imports diferents" /></span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.paid &&
                        !subphase.invoice &&
                        !subphase.ticket &&
                        !subphase.diet && 
                        !subphase.expense
                      "
                      class="tag is-warning invoice-tag clickable"
                      @click="
                        setInvoice(
                          'expenses',
                          props.row,
                          subphase,
                          props.index,
                          j
                        )
                      "
                      >{{ subphase.assign === true ? 'Assignat' : "Document" }}</span
                    >
                  </b-field>
                </b-field>
              </li>
            </ul>
            <div
              class="add-subphase mt-2"
              v-if="props.row.expenses.length === 0"
            >
              <button
                class="button is-small is-primary"
                type="button"
                @click.prevent="addSubExpense(props.row)"
              >
                <b-icon icon="plus-circle" size="is-small" />
              </button>
            </div>
          </template>
        </b-table>

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
import RadioPicker from '@/components/RadioPicker'

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
      default: null,
    },
    projectPhases: {
      type: [Array],
      default: null,
    },
    mode: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      phases: [],
      isLoading: false,
      isUpdating: false,
      needsUpdate: false,
      // form: this.getClearFormObject(),
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
            progress: 0.6,
          },
          {
            id: 2,
            text: "Task #2",
            start_date: "2020-01-20",
            duration: 3,
            progress: 0.4,
          },
        ],
        links: [{ id: 1, source: 1, target: 2, type: "0" }],
      },
      invoicingObject: {},
      isModalActive: false,
      isModalSplitActive: false,
      newTask: "",
      auxDocument: null
    };
  },
  computed: {
    ...mapState(["me"]),
    filteredClients() {
      return this.clients.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.clientSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredCoopera() {
      return this.clients.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.cooperaSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredStrategies() {
      return this.strategies.filter((option) => {
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
  },  
  created() {
    if (!this.form || !this.phases) {
      return
    }
    this.isLoading = true
    service({ requiresAuth: true })
      .get("expense-types")
      .then((r) => {
        this.expenseTypes = r.data;
      });
    service({ requiresAuth: true })
      .get("income-types")
      .then((r) => {
        this.incomeTypes = r.data;
    });
    service({ requiresAuth: true })
        .get("contacts?_limit=-1&_sort=name:ASC")
        .then((r) => {
          this.clients = r.data;
        });
    
    this.phases = this.projectPhases.map((r) => {
      return {
        ...r,
        opened: true,        
        total_amount:
          sumBy(r.subphases, "total_amount") -
          sumBy(r.expenses, "total_amount"),
      };
    });

    this.phases.forEach((p) => {
      p.subphases.forEach((s) => {
        s.assign = false
        s['assign'] = false
        if (s.date) {
          s.date = moment(s.date, "YYYY-MM-DD").toDate();
        }
        if (s.date_estimate_document) {
          s.date_estimate_document = moment(s.date_estimate_document, "YYYY-MM-DD").toDate();
        }        
      });
      p.expenses.forEach((s) => {
        s.assign = false
        s['assign'] = false
        if (s.date) {
          s.date = moment(s.date, "YYYY-MM-DD").toDate();
        }
        if (s.date_estimate_document) {
          s.date_estimate_document = moment(s.date_estimate_document, "YYYY-MM-DD").toDate();
        }
      });
    });
    // console.log('this.phases', this.phases)
    this.isLoading = false
  },
  methods: {
    blurPhase(phase) {
      this.phases.forEach((p) => {
        p.edit = false;
      });
      if (phase) {
        phase.edit = true;
      }
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    blurPhaseEdit() {
      this.needsUpdate = true;
      this.blurPhase(null);
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    somethingChanged() {      
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    changeSubPhase(subphase, field, value) {
      if (value && value.toString().includes(",")) {
        subphase[field] = value.toString().replace(",", ".");
      }
      this.phases = this.phases.map((r) => {
        return {
          ...r,
          opened: true,
          total_amount:
            sumBy(r.subphases, (x) => x.quantity * x.amount) -
            sumBy(r.expenses, (x) => x.quantity * x.amount),
        };
      });
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    addPhase() {
      this.needsUpdate = true;
      this.phases.push({
        name: this.phaseToAdd,
        edit: false,
        opened: true,
        subphases: [],
        expenses: [],
        total_amount: 0,
      });
      this.phaseToAdd = "";
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    removePhase(i) {
      this.needsUpdate = true;
      this.phases = this.phases.filter((p, j) => i !== j);
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    getClearFormObject() {
      return {
        id: null,
        name: null,
        project_state: { id: 0 },
        project_scope: { id: 0 },
        leader: { id: 0 },
        phases: [],
        expenses: [],
        default_dedication_type: { id: 0 }
      };
    },        
    input(v) {
      this.createdReadable = dayjs(v).format("MMM D, YYYY");
    },    
    removeSubPhase(phase, subphase, j) {
      this.needsUpdate = true;
      phase.subphases = phase.subphases.filter((s, i) => i !== j);
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    removeSubExpense(phase, subphase, j) {
      this.needsUpdate = true;
      phase.expenses = phase.expenses.filter((s, i) => i !== j);
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    removeExpense(expense, j) {
      this.form.expenses = this.form.expenses.filter((s, i) => i !== j);
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    addExpense(expense) {
      this.form.expenses.push({
        concept: "",
        quantity: 1,
        amount: 0,
        expense_type: null,
      });
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    addSubPhase(phase) {
      this.needsUpdate = true;
      console.log('this.form', this.form)
      phase.subphases.push({ concept: "", quantity: 1, amount: 0, assign: false, date: this.form.date_end ? moment(this.form.date_end, 'YYYY-MM-DD').toDate() : null  });
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    addSubExpense(phase) {
      this.needsUpdate = true;
      phase.expenses.push({ concept: "", quantity: 1, amount: 0, assign: false, date: this.form.date_end ? moment(this.form.date_end, 'YYYY-MM-DD').toDate() : null });
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    splitSubPhase(phase, subphase, i, j) {
      this.invoicingObject = {
        phase,
        subphase,
        i,
        j,
        type: "income",
      };
      this.isModalSplitActive = true;
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    splitSubExpense(phase, subphase, i, j) {
      this.invoicingObject = {
        phase,
        subphase,
        i,
        j,
        type: "expense",
      };
      this.isModalSplitActive = true;
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    setInvoice(type, phase, subphase, i, j) {
      if (this.mode === '') {
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
      }
      else if (this.mode === 'incomes') {
        const phase = this.phases.find(
          (p, idx) => idx === i
        );
        const subphase = phase.subphases.find(
          (p, idx) => idx === j
        );

        if ( (!subphase.invoice || !subphase.invoice.id) && (!subphase.grant || !subphase.grant.id) && (!subphase.income || !subphase.income.id)) {
          
          // if (!subphase.invoice || !subphase.invoice.id) {
          subphase.paid = false; // necessary
          subphase.assign = !subphase.assign;
          subphase.paid = true; // necessary
          // }
          
          this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
        }
      }
      else if (this.mode === 'expenses') {
        const phase = this.phases.find(
          (p, idx) => idx === i
        );
        const subphase = phase.expenses.find(
          (p, idx) => idx === j
        );
        
        if ( (!subphase.invoice || !subphase.invoice.id) && (!subphase.ticket || !subphase.ticket.id) && (!subphase.grant || !subphase.grant.id) && (!subphase.diet || !subphase.diet.id) && (!subphase.expense || !subphase.expense.id) ) {
          
          subphase.paid = false; // necessary
          subphase.assign = !subphase.assign;
          subphase.paid = true; // necessary

          this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
        }        
      }
      
    },
    async modalSubmit(invoicing) {
      // console.log("invoicing", invoicing);
      if (this.invoicingObject.type === "incomes") {
        const phase = this.phases.find(
          (p, idx) => idx === this.invoicingObject.i
        );
        const subphase = phase.subphases.find(
          (p, idx) => idx === this.invoicingObject.j
        );
        subphase.paid = true;
        subphase.invoice = invoicing.emitted;
        subphase.income = invoicing.income;
        subphase.grant = invoicing.grant;
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
      }
      this.isModalActive = false;
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    async modalDelete(activity) {
      this.isModalActive = false;
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    modalCancel() {
      this.isModalActive = false;
      // this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },    
    async modalSplitSubmit(action) {
      // console.log('action',action)

      var max = 0
      var divider = 1
      if (action.action === "x2") {
        max = 2
      }
      else if (action.action === "x3") {
        max = 3
      }
      else if (action.action === "x4") {
        max = 4
      }
      else if (action.action === "x12") {
        max = 12
      }
      if (action.action === "d2") {
        max = 2
        divider = 2
      }
      else if (action.action === "d3") {
        max = 3
        divider = 3
      }
      else if (action.action === "d4") {
        max = 4
        divider = 4
      }
      else if (action.action === "d12") {
        max = 12
        divider = 12
      }

      if (action.type === "income") {
        if (max > 0) {
          for (let i = 0; i < max - 1; i++) {
            const newIncome = {
              income_type: action.subphase.income_type,
              concept: action.subphase.concept,
              amount: action.subphase.amount / divider,
              quantity: action.subphase.quantity,
              date: action.subphase.date ? moment(action.subphase.date).add(max - i - 1, 'month').toDate() : null
            };
            this.phases[action.i].subphases.splice(
              action.j + 1,
              0,
              newIncome
            );
          }
          if (divider > 1) {
            const el = this.phases[action.i].subphases[action.j]
            el.amount = el.amount / divider
          }
        }

        if (action.action === "split") {
          const newIncome = {
            income_type: action.subphase.income_type,
            concept: action.subphase.concept,
            amount: action.amount,
            quantity: action.subphase.quantity,
          };
          this.phases[action.i].subphases[action.j].amount =
            this.phases[action.i].subphases[action.j].amount -
            action.amount;
          this.phases[action.i].subphases.splice(
            action.j + 1,
            0,
            newIncome
          );
        }
      } else if (action.type === "expense") {


        if (max > 0) {
          for (let i = 0; i < max - 1; i++) {
            const newIncome = {
              expense_type: action.subphase.expense_type,
              concept: action.subphase.concept,
              amount: action.subphase.amount / divider,
              quantity: action.subphase.quantity,
              date: action.subphase.date ? moment(action.subphase.date).add(max - i - 1, 'month').toDate() : null
            };
            this.phases[action.i].expenses.splice(
              action.j + 1,
              0,
              newIncome
            );
          }
          if (divider > 1) {
            const el = this.phases[action.i].expenses[action.j]
            el.amount = el.amount / divider
          }
        }
        
        // if (action.action === "x2") {
        //   const newIncome = {
        //     expense_type: action.subphase.expense_type,
        //     concept: action.subphase.concept,
        //     amount: action.subphase.amount,
        //     quantity: action.subphase.quantity,
        //   };
        //   this.phases[action.i].expenses.splice(
        //     action.j + 1,
        //     0,
        //     newIncome
        //   );
        // } else if (action.action === "x12") {
        //   for (let i = 0; i < 12; i++) {
        //     const newIncome = {
        //       expense_type: action.subphase.expense_type,
        //       concept: action.subphase.concept,
        //       amount: action.subphase.amount,
        //       quantity: action.subphase.quantity,
        //       date: action.subphase.date ? moment(action.subphase.date).add(12 - i, 'month').toDate() : null
        //     };
        //     this.phases[action.i].expenses.splice(
        //       action.j + 1,
        //       0,
        //       newIncome
        //     );
        //   }
        // } else 
        if (action.action === "split") {
          const newIncome = {
            expense_type: action.subphase.expense_type,
            concept: action.subphase.concept,
            amount: action.amount,
            quantity: action.subphase.quantity,
          };
          this.phases[action.i].expenses[action.j].amount =
            this.phases[action.i].expenses[action.j].amount -
            action.amount;
          this.phases[action.i].expenses.splice(
            action.j + 1,
            0,
            newIncome
          );
        }
      }
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
      this.isModalSplitActive = false;
    },
    async modalSplitDelete(invoicing) {
      this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
      this.isModalSplitActive = false;
    },
    async modalSplitCancel() {
      // this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
      this.isModalSplitActive = false;
    },
    paidChanged(subphase) {
      if (!subphase.paid) {
        subphase.invoice = null
        subphase.ticket = null
        subphase.diet = null
        subphase.income = null
        subphase.expense = null
      }
      this.somethingChanged();
    },
    importWarning(subphase, document) {
      return document ? document.total_base !== subphase.quantity * subphase.amount : false
    }
  },
};
</script>
<style>
.warning-tag {
  padding-left: 0.5rem;
}

</style>
