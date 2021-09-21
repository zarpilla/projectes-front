<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <!-- <hero-bar>
      {{ heroTitle }}
      <router-link slot="right" :to="heroRouterLinkTo" class="button">
        {{ heroRouterLinkLabel }}
      </router-link>
    </hero-bar> -->
    <section class="section is-main-section">
      <!-- <notification class="is-info">
        <div>
          <span><b>Demo only.</b> No data will be saved/updated</span>
        </div>
      </notification> -->
      <div class="columns">
        <div class="column is-two-thirds">
          <card-component
          :title="formCardTitle"
          class="tile is-child"
        >
          <form @submit.prevent="submit" v-if="!isLoading">
            <!-- <b-field label="ID" horizontal>
              <b-input v-model="form.id" custom-class="is-static" readonly />
            </b-field>
            <hr />
            <b-field label="Avatar" horizontal>
              <file-picker />
            </b-field>
            <hr /> -->
            <b-field label="Codi" horizontal>
              <b-input
                v-model="form.name"
                placeholder="Codi"
                required
              />
            </b-field>
            <b-field label="Estat" horizontal>
              <b-select
                v-model="form.project_state.id"
                placeholder="Estat"
                required
              >
                <option
                  v-for="(s, index) in project_states"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Àmbit" horizontal>
              <b-select
                v-model="form.project_scope.id"
                placeholder="Àmbit"
                required
              >
                <option
                  v-for="(s, index) in project_scopes"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Lidera" horizontal>
              <b-select
                v-model="form.leader.id"
                placeholder="Lidera"
                required
              >
                <option
                  v-for="(s, index) in leaders"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.username }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Clientes" horizontal>
              <b-autocomplete
                v-model="clientSearch"
                placeholder="Escriu el nom de la clienta..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredClients"
                field="name"
                @select="clientSelected"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="" horizontal v-if="form.clients && form.clients.length">
              <div class="list">
                <ul class="ulist">
                  <li v-for="(client, i) in form.clients" :key="i" class="tag is-primary">
                    {{ client.name }}
                    <b-button
                      @click="removeClient(client)"
                      class="no-button"
                      icon-left="close-circle" />
                  </li>
                </ul>
              </div>
            </b-field>
            <b-field label="Intercooperació" horizontal>
              <b-autocomplete
                v-model="cooperaSearch"
                placeholder="Escriu el nom..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredCoopera"
                field="name"
                @select="cooperaSelected"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="" horizontal v-if="form.intercooperations && form.intercooperations.length">
              <div class="list">
                <ul class="ulist">
                  <li v-for="(client, i) in form.intercooperations" :key="i" class="tag is-primary">
                    {{ client.name }}
                    <b-button
                      @click="removeCoopera(client)"
                      class="no-button"
                      icon-left="close-circle" />
                  </li>
                </ul>
              </div>
            </b-field>
            <b-field label="Estratègies" horizontal>
              <b-autocomplete
                v-model="strategiesSearch"
                placeholder="Escriu el nom..."
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredStrategies"
                field="code_name"
                @select="strategiesSelected"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="" horizontal v-if="form.strategies && form.strategies.length">
              <div class="list">
                <ul class="ulist">
                  <li v-for="(client, i) in form.strategies" :key="i" class="tag is-primary">
                    {{ client.code_name }}
                    <b-button
                      @click="removeStrategies(client)"
                      class="no-button"
                      icon-left="close-circle" />
                  </li>
                </ul>
              </div>
            </b-field>
            <b-field label="Descripció" message="Descripció o notes sobre el projecte" horizontal>
              <b-input
                type="textarea"
                v-model="form.description"
                placeholder="Descripció"
              />
            </b-field>
            <b-field label="Inici" horizontal>
              <b-datepicker
                v-model="form.date_start"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data inici"
                @input="input"
              >
              </b-datepicker>
            </b-field>
            <b-field label="Final" horizontal>
              <b-datepicker
                v-model="form.date_end"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder="Data final"
                @input="input"
              >
              </b-datepicker>
            </b-field>
            <b-field label="Despesa Indirecta (%)" horizontal v-if="me.options && me.options.structuralExpenses">
              <b-input
                type="numeric"
                v-model="form.structural_expenses_pct"
                placeholder="Percentatge de despeses d'estructura"
              >
              </b-input>
            </b-field>
            <!-- <b-field label="Company" message="Client's company name" horizontal>
              <b-input
                v-model="form.company"
                placeholder="e.g. Berton & Steinway"
                required
              />
            </b-field>
            <b-field label="City" message="Client's city" horizontal>
              <b-input
                v-model="form.city"
                placeholder="e.g. Geoffreyton"
                required
              />
            </b-field>
            <b-field label="Created" horizontal>
              <b-datepicker
                v-model="form.created_date"
                placeholder="Click to select..."
                icon="calendar-today"
                @input="input"
              >
              </b-datepicker>
            </b-field>
            <hr />
            <b-field label="Progress" horizontal>
              <b-slider v-model="form.progress" />
            </b-field> -->
            <hr />
            <b-field horizontal>
              <b-button
                type="is-primary"
                :loading="isLoading"
                @click="submit"
                >Guardar</b-button
              >
            </b-field>
          </form>
        </card-component>
        </div>
        <div class="column">
          <card-component
          v-if="isProfileExists"
          title="Resum"
          class="tile is-child"
        >
          <!-- <user-avatar
            :avatar="form.avatar"
            class="image has-max-width is-aligned-center"
          />
          <hr /> -->
          <b-field label="Hores previstes" horizontal>
            <div
              class="readonly subphase-detail-input">
              {{ form.total_estimated_hours }}
            </div>
          </b-field>
          <b-field label="Hores reals" horizontal>
            <div
              class="readonly subphase-detail-input">
              {{ form.total_real_hours }}
            </div>
          </b-field>
          <hr>
          <b-field label="Ingressos previstos" horizontal>
            <div
              class="readonly subphase-detail-input">
              <money-format :value="form.total_incomes"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value=false
                  :hide-subunits=false>
                </money-format>
            </div>
          </b-field>
          <b-field label="Despeses previstes" horizontal>
            <div
              class="readonly subphase-detail-input">
              <money-format :value="form.total_expenses"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value=false
                  :hide-subunits=false>
                </money-format>
            </div>
          </b-field>
          <b-field label="Hores previstes" horizontal v-if="me.options && me.options.userHasCostByHour">
            <div
              class="readonly subphase-detail-input">
              <money-format :value="form.total_estimated_hours_price"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value=false
                  :hide-subunits=false>
                </money-format>
            </div>
          </b-field>
          <b-field label="Resultat previst" horizontal>
            <div
              class="readonly subphase-detail-input">
              <money-format :value="form.incomes_expenses"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value=false
                :hide-subunits=false>
              </money-format>
            </div>
          </b-field>
          <hr v-if="me.options && me.options.treasury">
          <b-field label="Ingressos reals" horizontal v-if="me.options && me.options.treasury">
            <div
              class="readonly subphase-detail-input">
              <money-format :value="form.total_real_incomes"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value=false
                  :hide-subunits=false>
                </money-format>
            </div>
          </b-field>
          <b-field label="Despeses reals" horizontal v-if="me.options && me.options.treasury">
            <div
              class="readonly subphase-detail-input">
              <money-format :value="form.total_real_expenses"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value=false
                  :hide-subunits=false>
                </money-format>
            </div>
          </b-field>
          <b-field label="Hores reals" horizontal v-if="me.options && me.options.userHasCostByHour">
            <div
              class="readonly subphase-detail-input">
              <money-format :value="form.total_real_hours_price"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value=false
                  :hide-subunits=false>
                </money-format>
            </div>
          </b-field>
          <b-field label="Resultat real" horizontal v-if="me.options && me.options.treasury">
            <div
              class="readonly subphase-detail-input">
              <money-format :value="form.total_real_incomes_expenses"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value=false
                :hide-subunits=false>
              </money-format>
            </div>
          </b-field>
          <!-- <pre style="height:400px;width:800px;overflow:scroll">
            {{ form }}
          </pre> -->
          <!-- <b-field label="Name">
            <b-input :value="form.name" custom-class="is-static" readonly />
          </b-field>
          <b-field label="Company">
            <b-input :value="form.company" custom-class="is-static" readonly />
          </b-field>
          <b-field label="City">
            <b-input :value="form.city" custom-class="is-static" readonly />
          </b-field>
          <b-field label="Created">
            <b-input
              :value="createdReadable"
              custom-class="is-static"
              readonly
            />
          </b-field>
          <hr />
          <b-field label="Progress">
            <progress
              class="progress is-small is-primary"
              :value="form.progress"
              max="100"
              >{{ form.progress }}</progress
            >
          </b-field> -->
        </card-component>

        <card-component
          v-if="isProfileExists"
          title="Documents"
          class="ztile is-child mt-2"
        >

        <b-field label="Factures emeses" v-if="form.emitted_invoices && form.emitted_invoices.length">
          <div class="tag is-primary mr-1" v-for="invoice in form.emitted_invoices" :key="invoice.id">{{invoice.code}}: {{ invoice.total_base}}€</div>
        </b-field>
        <b-field label="Factures rebudes" v-if="form.received_invoices && form.received_invoices.length">
          <div class="tag is-primary mr-1" v-for="invoice in form.received_invoices" :key="invoice.id">{{invoice.code}}: {{ invoice.total_base}}€</div>
        </b-field>
        </card-component>
        </div>
      </div>
      <card-component title="Fases i Ingressos">

        <b-table
          :data="form.phases"
          ref="table"
          :opened-detailed="[true]"
          detailed
          detail-key="opened"
          :detail-transition="transitionName"
          :show-detail-icon="false">
          <b-table-column field="name" label="Fase" width="500" v-slot="props">
            <form @submit.prevent="blurPhaseEdit(phase)">
              <b-input
                placeholder="Nom de la fase..."
                v-model="props.row.name"
                @input="blurPhaseEdit(phase)"
                class="phase-detail-input">
              </b-input>
            </form>
          </b-table-column>
          <b-table-column field="name" label="Total" width="150" v-slot="props">
            <div class="readonly subphase-detail-input subphase-detail-input-phase-total">
              <money-format :value="props.row.total_amount"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value=false
                :hide-subunits=false>
              </money-format>
              {{ totalSubPhase(props.row) }}
            </div>
          </b-table-column>
          <b-table-column field="name" label="Esborrar" width="150" v-slot="props">
            <button class="button is-small is-primary" type="button" @click.prevent="removePhase(props.index)">
              <b-icon icon="trash-can" size="is-small"/>
            </button>
          </b-table-column>
          <template #detail="props">
            <ul class="subphases-list">
              <li v-for="(subphase, j) in props.row.subphases" :key="j" class="subphase mt-2 mb-2">
                <b-field grouped>
                  <b-field :label="j == 0 ? 'Concepte' : null" class="subphase-detail-input-large-field">
                    <b-input
                      name="SubFase"
                      placeholder="Nom de la subfase..."
                      v-model="subphase.concept"
                      class="subphase-detail-input subphase-detail-input-large">
                    </b-input>
                  </b-field>
                  <b-field :label="j == 0 ? 'Quantitat' : null">
                    <b-input
                      name="Unitats"
                      placeholder="Quantitat, hores, unitats..."
                      v-model="subphase.quantity"
                      @input="blurSubPhase"
                      class="subphase-detail-input">
                    </b-input>
                  </b-field>
                  <b-field :label="j == 0 ? 'Preu' : null">
                    <b-input
                      name="PreuUnitari"
                      placeholder="Preu per unitat"
                      v-model="subphase.amount"
                      @input="blurSubPhase"
                      class="subphase-detail-input">
                    </b-input>
                  </b-field>
                  <b-field :label="j == 0 ? 'Pagat' : null" v-if="me.options && me.options.treasury" class="short-field">
                    <b-checkbox
                      v-model="subphase.paid"
                      class="checkbox-inline"
                    >
                    </b-checkbox>
                    <span v-if="me.options && me.options.treasury && subphase.paid && subphase.invoice && subphase.invoice.id" :title="`Factura ${subphase.invoice.code}`" class="tag is-primary invoice-tag">{{subphase.invoice.code}}</span>
                    <span v-if="me.options && me.options.treasury && subphase.paid && (!subphase.invoice || !subphase.invoice.id)" class="tag is-warning invoice-tag">{{ 'Informar factura'}}</span>
                  </b-field>
                  <b-field :label="j == 0 ? 'Data' : null" v-if="me.options && me.options.treasury">
                    <b-datepicker
                      v-model="subphase.date"
                      :show-week-number="false"
                      :locale="'ca-ES'"
                      :first-day-of-week="1"
                      icon="calendar-today"
                      placeholder="Data pagament"
                      @input="input"
                    >
                    </b-datepicker>
                  </b-field>
                  <b-field :label="j == 0 ? 'Total' : null">
                    <div
                      class="readonly subphase-detail-input">
                      <money-format :value="subphase.quantity * subphase.amount"
                        :locale="'es'"
                        :currency-code="'EUR'"
                        :subunits-value=false
                        :hide-subunits=false>
                      </money-format>
                    </div>
                    <button class="button is-small is-danger ml-2" type="button" @click.prevent="removeSubPhase(props.row, subphase, j)">
                      <b-icon icon="trash-can" size="is-small"/>
                    </button>
                    <button v-if="j === props.row.subphases.length - 1" class="button is-small is-primary ml-2" type="button" @click.prevent="addSubPhase(props.row)">
                      <b-icon icon="plus-circle" size="is-small"/>
                    </button>
                  </b-field>
                </b-field>
              </li>
            </ul>
            <div class="add-subphase mt-2" v-if="props.row.subphases.length === 0">
              <button class="button is-small is-primary" type="button" @click.prevent="addSubPhase(props.row)">
                  <b-icon icon="plus-circle" size="is-small"/>
              </button>
            </div>
          </template>
        </b-table>

        <form @submit.prevent="addPhase">
          <b-field label="Nova Fase" class="mt-5">
              <b-input placeholder="Nom de la fase..."
                  v-model="phaseToAdd"
                  icon-right="plus-circle"
                  icon-right-clickable
                  @icon-right-click="addPhase">
              </b-input>
          </b-field>
        </form>
        <div class="quote-summary">
          <hr>
          <b-field label="Total Ingressos" class="mt-5">
            <div
              class="readonly subphase-detail-input">
            <money-format :value="totalAmount"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value=false
              :hide-subunits=false>
            </money-format>
            </div>
          </b-field>
        </div>
        <hr />
          <b-field>
            <b-button
              type="is-primary"
              :loading="isLoading"
              @click="submit"
              >Guardar</b-button
            >
          </b-field>
      </card-component>

      <card-component title="Despeses">

        <ul class="subphases-list">
          <li v-for="(expense, j) in form.expenses" :key="j" class="subphase mt-2 mb-2">
            <b-field grouped>
              <b-field :label="j == 0 ? 'Concepte' : null" class="subphase-detail-input-large-field">
                <b-input
                  name="SubFase"
                  placeholder="Nom de la despesa"
                  v-model="expense.concept"
                  class="subphase-detail-input subphase-detail-input-large">
                </b-input>
              </b-field>
              <b-field :label="j == 0 ? 'Quantitat' : null">
                <b-input
                  name="Unitats"
                  placeholder="Quantitat, hores, unitats..."
                  v-model="expense.quantity"
                  @blur="blurSubPhase"
                  class="subphase-detail-input">
                </b-input>
              </b-field>
              <b-field :label="j == 0 ? 'Preu' : null">
                <b-input
                  name="PreuUnitari"
                  placeholder="Preu per unitat"
                  v-model="expense.amount"
                  @blur="blurSubPhase"
                  class="subphase-detail-input">
                </b-input>
              </b-field>
              <b-field :label="j == 0 ? 'Pagat' : null" v-if="me.options && me.options.treasury">
                <b-checkbox
                  v-model="expense.paid"
                  class="checkbox-inline"
                >
                </b-checkbox>
              </b-field>
              <b-field :label="j == 0 ? 'Data' : null" v-if="me.options && me.options.treasury">
                <b-datepicker
                  v-model="expense.date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data pagament"
                  @input="input"
                >
                </b-datepicker>
              </b-field>
              <b-field :label="j == 0 ? 'Total' : null">
                <div
                  class="readonly subphase-detail-input">
                  <money-format :value="expense.quantity * expense.amount"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value=false
                    :hide-subunits=false>
                  </money-format>
                </div>
                <button class="button is-small is-danger ml-2" type="button" @click.prevent="removeExpense(expense, j)">
                  <b-icon icon="trash-can" size="is-small"/>
                </button>
                <button v-if="j === form.expenses.length - 1" class="button is-small is-primary ml-2" type="button" @click.prevent="addExpense()">
                  <b-icon icon="plus-circle" size="is-small"/>
                </button>
              </b-field>
            </b-field>
          </li>
        </ul>
        <div class="add-subphase mt-2" v-if="form.expenses.length === 0">
          <button class="button is-small is-primary" type="button" @click.prevent="addExpense()">
              <b-icon icon="plus-circle" size="is-small"/>
          </button>
        </div>

        <div class="quote-summary">
          <hr>
          <b-field label="Total Despeses" class="mt-5">
            <div
                      class="readonly subphase-detail-input">
            <money-format :value="totalExpenses"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value=false
              :hide-subunits=false>
            </money-format>
            </div>
          </b-field>
        </div>
        <hr />
          <b-field>
            <b-button
              type="is-primary"
              :loading="isLoading"
              @click="submit"
              >Guardar</b-button
            >
          </b-field>
      </card-component>

      <card-component v-if="!isLoading && !isUpdating" title="Planificació">
          <button v-if="needsUpdate" class="button is-small is-danger ml-2" type="button" @click.prevent="updateGantt">
            Guardar i Actualitzar
            <b-icon icon="refresh" size="is-small"/>
          </button>
          <!-- <pre style="height:600px;width:800px;overflow:scroll">
            {{ form.phases }}
          </pre> -->
          <project-gannt :project="form" :users="leaders" @gantt-item-update="ganttItemUpdate" @gantt-item-delete="ganttItemDelete" />
          <hr />
          <b-field>
            <b-button
              type="is-primary"
              :loading="isLoading"
              @click="submit"
              >Guardar</b-button
            >
          </b-field>
      </card-component>
    </section>
  </div>
</template>

<script>
// import axios from 'axios'
import dayjs from 'dayjs'
// import find from 'lodash/find'
import TitleBar from '@/components/TitleBar'
// import HeroBar from '@/components/HeroBar'
// import Tiles from '@/components/Tiles'
import CardComponent from '@/components/CardComponent'
// import FilePicker from '@/components/FilePicker'
// import UserAvatar from '@/components/UserAvatar'
// import Notification from '@/components/Notification'
import service from '@/service/index'
import ProjectGannt from '@/components/ProjectGannt.vue'
// import CurrencyInput from '@/components/CurrencyInput'
import MoneyFormat from 'vue-money-format'
import { EventBus } from '@/service/event-bus.js'
import sumBy from 'lodash/sumBy'
import { mapState } from 'vuex'
import moment from 'moment'

export default {
  name: 'ProjectForm',
  components: {
    // UserAvatar,
    // FilePicker,
    CardComponent,
    // Tiles,
    // HeroBar,
    TitleBar,
    ProjectGannt,
    MoneyFormat
    // CurrencyInput
    // Notification
  },
  props: {
    id: {
      type: [String, Number],
      default: null
    }
  },
  data () {
    return {
      isLoading: false,
      isUpdating: false,
      needsUpdate: false,
      form: this.getClearFormObject(),
      createdReadable: null,
      isProfileExists: false,
      project_states: [],
      project_scopes: [],
      leaders: [],
      clients: [],
      strategies: [],
      clientSearch: '',
      cooperaSearch: '',
      strategiesSearch: '',
      todos: [
        { title: 'one value', edit: false },
        { title: 'other value', edit: false },
        { title: 'otro titulo', edit: false }
      ],
      editedTodo: null,
      phaseToAdd: '',
      updatingGantt: false,
      updatingGanttTimer: 0,
      defaultOpenedDetails: [1],
      showDetailIcon: true,
      useTransition: false
    }
  },
  computed: {
    ...mapState(['me']),
    filteredClients () {
      return this.clients.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.clientSearch.toLowerCase()) >= 0
        )
      })
    },
    filteredCoopera () {
      return this.clients.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.cooperaSearch.toLowerCase()) >= 0
        )
      })
    },
    filteredStrategies () {
      return this.strategies.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.strategiesSearch.toLowerCase()) >= 0
        )
      })
    },
    titleStack () {
      let lastCrumb

      if (this.isProfileExists) {
        lastCrumb = this.form.name
      } else {
        lastCrumb = 'Nou Projecte'
      }

      return ['Projectes', lastCrumb]
    },
    heroTitle () {
      if (this.isProfileExists) {
        return this.form.name
      } else {
        return 'Crea Projecte'
      }
    },
    heroRouterLinkTo () {
      if (this.isProfileExists) {
        return { name: 'project.new' }
      } else {
        return '/'
      }
    },
    heroRouterLinkLabel () {
      if (this.isProfileExists) {
        return 'Nou Projecte'
      } else {
        return 'Inici'
      }
    },
    formCardTitle () {
      if (this.isProfileExists) {
        return 'Edita Projecte'
      } else {
        return 'Nou Projecte'
      }
    },
    transitionName () {
      if (this.useTransition) {
        return 'fade'
      }
      return 'x'
    },
    totalAmount () {
      var s = 0
      this.form.phases.forEach(p => {
        s += sumBy(p.subphases, x => x.quantity * x.amount)
      })
      return s
    },
    totalExpenses () {
      return sumBy(this.form.expenses, x => x.quantity * x.amount)
    }
  },
  watch: {
    id (newValue) {
      this.isProfileExists = false
      if (!newValue || newValue === 0) {
        this.form = this.getClearFormObject()
        this.getAuxiliarData()
      } else {
        this.getData()
      }
    }
  },
  created () {
    this.getData()
  },
  methods: {
    blurPhase (phase) {
      this.form.phases.forEach(p => {
        p.edit = false
      })
      if (phase) {
        phase.edit = true
      }
    },
    blurPhaseEdit (phase) {
      this.needsUpdate = true
      this.blurPhase(null)
      // this.$emit('update')
    },
    blurSubPhase () {
      this.form.phases = this.form.phases.map(r => { return { ...r, opened: true, total_amount: sumBy(r.subphases, x => x.quantity * x.amount) } })
      // console.log('blurSubPhase', this.form.phases)
    },
    // editTodo (todo) {
    //   this.editedTodo = todo
    // },
    addPhase () {
      this.needsUpdate = true
      this.form.phases.push({ name: this.phaseToAdd, edit: false, opened: true, subphases: [], total_amount: 0 })
      this.phaseToAdd = ''
    },
    removePhase (i) {
      this.needsUpdate = true
      this.form.phases = this.form.phases.filter((p, j) => i !== j)
    },
    getClearFormObject () {
      return {
        id: null,
        name: null,
        project_state: { id: 0 },
        project_scope: { id: 0 },
        leader: { id: 0 },
        phases: [],
        expenses: []
      }
    },
    getData () {
      if (this.$route.params.id && this.$route.params.id > 0) {
        this.isLoading = true
        console.log('me', this.me)
        if (!this.me) {
          service({ requiresAuth: true })
            .get('me')
            .then((r) => {
              this.me = r.data
              this.$store.commit('me', {
                me: r.data
              })
            })
        }

        service({ requiresAuth: true }).get('projects/' + this.$route.params.id).then(async (r) => {
          if (r.data && r.data.id) {
            this.isProfileExists = true
            this.form = r.data
            this.form.project_state = this.form.project_state && this.form.project_state.id ? this.form.project_state : { id: 0 }
            this.form.project_scope = this.form.project_scope && this.form.project_scope.id ? this.form.project_scope : { id: 0 }
            this.form.leader = this.form.leader && this.form.leader.id ? this.form.leader : { id: 0 }
            this.form.phases = this.form.phases.map(p => { return { ...p, edit: false } })
            if (this.form.phases.length === 0) {
              // create first phase
              const phase = { name: 'F1', subphases: [] }
              let mustUpdate = false
              if (this.form.incomes.length > 0) {
                mustUpdate = true
                for (let i = 0; i < this.form.incomes.length; i++) {
                  const income = this.form.incomes[i]
                  delete income.id
                  phase.subphases.push(income)
                }
              } else {
                phase.subphases.push({ concept: 'SF1' })
              }
              this.form.phases.push(phase)
              this.form.incomes = []

              if (this.form.estimated_hours.length > 0) {
                mustUpdate = true
                this.form.phases[0].subphases[0].estimated_hours = this.form.estimated_hours
                this.form.phases[0].subphases[0].estimated_hours.forEach(e => { delete e.id })
                this.form.estimated_hours = []
              }
              if (mustUpdate) {
                await this.submit()
              }
            }
            this.form.phases = this.form.phases.map(r => { return { ...r, opened: true, total_amount: sumBy(r.subphases, 'total_amount') } })

            this.form.phases.forEach(p => {
              p.subphases.forEach(s => {
                if (s.date) {
                  s.date = moment(s.date, 'YYYY-MM-DD').toDate()
                }
              })
            })

            this.form.expenses.forEach(e => {
              if (e.date) {
                e.date = moment(e.date, 'YYYY-MM-DD').toDate()
              }
            })

            this.getAuxiliarData()

            this.isLoading = false
          } else {
            this.$router.push({ name: 'project.new' })
          }
        })
      } else {
        this.getAuxiliarData()
      }
    },
    getAuxiliarData () {
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = r.data
      })
      service({ requiresAuth: true }).get('project-scopes').then((r) => {
        this.project_scopes = r.data
      })
      service({ requiresAuth: true }).get('users').then((r) => {
        this.leaders = r.data.filter(u => u.hidden !== true)
      })
      service({ requiresAuth: true }).get('contacts').then((r) => {
        this.clients = r.data
      })
      service({ requiresAuth: true }).get('strategies').then((r) => {
        this.strategies = r.data
      })
    },
    input (v) {
      this.createdReadable = dayjs(v).format('MMM D, YYYY')
    },
    async submit () {
      this.isLoading = true

      try {
        if (this.form.id) {
          await service({ requiresAuth: true }).put(`projects/${this.form.id}`, this.form)
          this.getData()
        } else {
          const newProject = await service({ requiresAuth: true }).post('projects', this.form)
          console.log('newProject', newProject.data)
          this.$router.push({ name: 'project.edit', params: { id: newProject.data.id } })
          // this.getData()
        }
      } catch (err) {
        console.error('projects error', err)
        this.$buefy.snackbar.open({
          message: 'Error',
          queue: false
        })
      }

      this.$buefy.snackbar.open({
        message: 'Guardat',
        queue: false
      })

      this.needsUpdate = false

      setTimeout(() => {
        this.isLoading = false
      }, 500)
    },
    clientSelected (option) {
      delete option.projects
      delete option.quotes
      delete option.projectes
      if (!this.form.clients.find(c => c.id === option.id)) {
        this.form.clients.push(option)
      }
      this.clientSearch = ''
      setTimeout(() => {
        this.clientSearch = ''
      }, 100)
    },
    cooperaSelected (option) {
      delete option.projects
      delete option.quotes
      delete option.projectes
      if (!this.form.intercooperations.find(c => c.id === option.id)) {
        this.form.intercooperations.push(option)
      }
      this.cooperaSearch = ''
      setTimeout(() => {
        this.cooperaSearch = ''
      }, 100)
    },
    strategiesSelected (option) {
      delete option.projects
      delete option.quotes
      delete option.projectes
      if (!this.form.strategies.find(c => c.id === option.id)) {
        this.form.strategies.push(option)
      }
      this.strategiesSearch = ''
      setTimeout(() => {
        this.strategiesSearch = ''
      }, 100)
    },
    removeClient (option) {
      this.form.clients = this.form.clients.filter(c => c.id !== option.id)
    },
    removeCoopera (option) {
      this.form.intercooperations = this.form.intercooperations.filter(c => c.id !== option.id)
    },
    removeStrategies (option) {
      this.form.strategies = this.form.strategies.filter(c => c.id !== option.id)
    },
    removeSubPhase (phase, subphase, j) {
      this.needsUpdate = true
      phase.subphases = phase.subphases.filter((s, i) => i !== j)
    },
    removeExpense (expense, j) {
      this.form.expenses = this.form.expenses.filter((s, i) => i !== j)
    },
    addExpense (expense) {
      this.form.expenses.push({ concept: '', quantity: 1, amount: 0, expense_type: null })
    },
    addSubPhase (phase) {
      this.needsUpdate = true
      phase.subphases.push({ concept: '', quantity: 1, amount: 0 })
    },
    updateGantt () {
      EventBus.$emit('zphases-updated', {})
      this.isUpdating = true
      this.needsUpdate = false
      setTimeout(() => {
        this.isUpdating = false
      }, 500)
    },
    ganttItemUpdate (item) {
      // console.log('ganttItemUpdate', item)
      // console.log('ganttItemUpdate _uuid', item._uuid)
      const id = item._hours.id
      const pid = item._phase.id
      const sid = item._subphase.id
      const uuid = item._uuid
      const subphase = this.form.phases.find(p => p.id === pid).subphases.find(s => s.id === sid)
      // console.log('subphase', subphase)
      if (!subphase || !subphase.estimated_hours) {
        return
      }
      const hours = this.form.phases.find(p => p.id === pid).subphases.find(s => s.id === sid).estimated_hours.find(h => (h.id === id && h.id > 0 && !uuid) || (h._uuid === uuid && uuid))
      if (hours) {
        hours.from = item.from
        hours.to = item.to
        hours.monthly_quantity = item.monthly_quantity
        hours.quantity = item.quantity
        hours.users_permissions_user = item.users_permissions_user
        hours.amount = item.amount
        hours.total_amount = item.total_amount
      } else if (uuid) {
        const hour = {
          from: item.from,
          to: item.to,
          monthly_quantity: item.monthly_quantity,
          quantity: item.quantity,
          users_permissions_user: item.users_permissions_user,
          amount: item.amount,
          total_amount: item.total_amount,
          _uuid: item._uuid
        }
        this.form.phases.find(p => p.id === pid).subphases.find(s => s.id === sid).estimated_hours.push(hour)
      }
      this.updatingGantt = true
      if (this.updatingGanttTimer) {
        clearTimeout(this.updatingGanttTimer)
      }
      this.updatingGanttTimer = setTimeout(() => {
        this.updatingGantt = false
        EventBus.$emit('phases-updated', this.form.phases)
        // console.log('ganttItemUpdate timeout!!!')
      }, 800)
      // console.log('ganttItemUpdate', item)
    },
    ganttItemDelete (item) {
      const id = item._hours.id
      const pid = item._phase.id
      const sid = item._subphase.id
      this.form.phases.find(p => p.id === pid).subphases.find(s => s.id === sid).estimated_hours = this.form.phases.find(p => p.id === pid).subphases.find(s => s.id === sid).estimated_hours.filter(h => h.id !== id)
    },
    sumByFn (arr, field) {
      return sumBy(arr, field)
    },
    totalSubPhase (phase) {
      return ''
    }
  }
}
</script>
<style>
.button.no-button {
  background: none;
  border: 0;
  padding: 0;
  display: inline-block;
  vertical-align: -1px;
  padding-left: 5px;
}
.phases-list .phase .phase-detail{
  padding: calc(0.5em - 2px) 0.5rem;
  border: 0px solid #ccc;
}
.phases-list .phase .phase-detail label{
  vertical-align: 2px;
  padding-left: 4px;
}
.phases-list .subphase{
  padding-left: 2.5rem;
}
.phases-list .phase .phase-detail-input{
  border: 0px solid #ccc;
}
.add-subphase{
  margin-left: 2.5rem;
}
.subphase-detail-input.readonly{
  width: auto;
  border: 1px solid #ccc;
  background: #e5e5e5;
  color: #777;
  border-radius: 4px;
  padding-bottom: calc(0.5em - 1px);
  padding-left: calc(0.75em - 1px);
  padding-right: calc(0.75em - 1px);
  padding-top: calc(0.5em - 1px);
  max-width: 100%;
  width: 100%;
}
/* .subphase .field{
  width: 80px;
} */
.subphase .field:not(.short-field){
  width: 35%;
}
.subphase .field.subphase-detail-input-large-field{
  width: 75%;
}
.subphases-list{margin-left: 2rem;}
.subphases-list .subphase-detail-input.readonly, .subphases-list .subphase-detail-input.readonly.subphase-detail-input-phase-total{
  width: 8rem;
}
.checkbox-inline{
  margin-top: 10px;
}
.invoice-tag{
  margin-top: 8px;
}
</style>
