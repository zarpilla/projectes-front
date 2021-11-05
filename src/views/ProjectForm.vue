<template>
  <div>
    <modal-box-invoicing
      :is-active="isModalActive"
      :invoicing-object="invoicingObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
      @delete="modalDelete"
    />
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-two-thirds">
          <card-component :title="formCardTitle" class="tile is-child">
            <form @submit.prevent="submit" v-if="!isLoading">
              <b-field label="Codi" horizontal>
                <b-input v-model="form.name" placeholder="Codi" required />
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
              <b-field label="Coordina" horizontal>
                <b-select
                  v-model="form.leader.id"
                  placeholder="Coordina"
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
              <b-field
                label=""
                horizontal
                v-if="form.clients && form.clients.length"
              >
                <div class="list">
                  <ul class="ulist">
                    <li
                      v-for="(client, i) in form.clients"
                      :key="i"
                      class="tag is-primary"
                    >
                      {{ client.name }}
                      <b-button
                        @click="removeClient(client)"
                        class="no-button"
                        icon-left="close-circle"
                      />
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
              <b-field
                label=""
                horizontal
                v-if="form.intercooperations && form.intercooperations.length"
              >
                <div class="list">
                  <ul class="ulist">
                    <li
                      v-for="(client, i) in form.intercooperations"
                      :key="i"
                      class="tag is-primary"
                    >
                      {{ client.name }}
                      <b-button
                        @click="removeCoopera(client)"
                        class="no-button"
                        icon-left="close-circle"
                      />
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
              <b-field
                label=""
                horizontal
                v-if="form.strategies && form.strategies.length"
              >
                <div class="list">
                  <ul class="ulist">
                    <li
                      v-for="(client, i) in form.strategies"
                      :key="i"
                      class="tag is-primary"
                    >
                      {{ client.code_name }}
                      <b-button
                        @click="removeStrategies(client)"
                        class="no-button"
                        icon-left="close-circle"
                      />
                    </li>
                  </ul>
                </div>
              </b-field>
              <b-field
                label="Descripció"
                message="Descripció o notes sobre el projecte"
                horizontal
              >
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
                  trap-focus
                  editable
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
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field>
              <b-field
                label="Despesa Indirecta (%)"
                horizontal
                v-if="me.options && me.options.structuralExpenses"
              >
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
                <b-button type="is-primary" :loading="isLoading" @click="submit"
                  >Guardar</b-button
                >
              </b-field>
            </form>
          </card-component>
        </div>
        <div class="column is-one-third">
          <card-component
            v-if="isProfileExists"
            title="Resum"
            class="tile is-child summary-card"
          >
            <!-- <user-avatar
            :avatar="form.avatar"
            class="image has-max-width is-aligned-center"
          />
          <hr /> -->
            <div class="columns">
              <b-field label="Hores previstes" class="column">
                <div class="readonly subphase-detail-input">
                  {{ form.total_estimated_hours }} h
                </div>
              </b-field>
              <b-field label="Hores executades" class="column">
                <div class="readonly subphase-detail-input">
                  {{ form.total_real_hours }} h
                </div>
              </b-field>
            </div>
            <div class="columns">
              <b-field label="Ingressos previstos" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.total_incomes"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Ingressos executats" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.total_real_incomes"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
            </div>

            <div class="columns">
              <b-field label="Despeses previstes" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.total_expenses"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Despeses executades" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.total_real_expenses"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
            </div>
            <div class="columns">
              <b-field label="Hores previstes" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.total_estimated_hours_price"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Hores executades" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.total_real_hours_price"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
            </div>

            <div class="columns">
              <b-field label="Resultat previst" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.incomes_expenses"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Resultat executat" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.total_real_incomes_expenses"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
            </div>
          </card-component>
        </div>
      </div>

      <card-component title="Fases i Pressupost">
        <b-table
          :data="form.phases"
          ref="table"
          :opened-detailed="[true]"
          detailed
          detail-key="opened"
          :detail-transition="transitionName"
          :show-detail-icon="false"
        >
          <b-table-column field="name" label="Fase" width="500" v-slot="props">
            <form @submit.prevent="blurPhaseEdit(phase)">
              <b-input
                placeholder="Nom de la fase..."
                v-model="props.row.name"
                @input="blurPhaseEdit(phase)"
                class="phase-detail-input"
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
            field="name"
            label="Esborrar"
            width="150"
            v-slot="props"
          >
            <button
              class="button is-small is-danger"
              type="button"
              @click.prevent="removePhase(props.index)"
            >
              <b-icon icon="trash-can" size="is-small" />
            </button>
          </b-table-column>
          <template #detail="props">
            <b-field label="Ingressos" horizontal class="has-text-left">
              <div
                class="
                  readonly
                  subphase-detail-input subphase-detail-input-phase-total
                "
              >
                <money-format
                  :value="
                    totalSubPhase(props.row.subphases)
                      ? totalSubPhase(props.row.subphases)
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
            <ul class="subphases-list">
              <li
                v-for="(subphase, j) in props.row.subphases"
                :key="j"
                class="subphase mt-2 mb-2"
              >
                <b-field grouped>
                  <b-field
                    v-if="(incomeTypes && incomeTypes.length) || (expenseTypes && expenseTypes.length)"
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
                    >
                    </b-input>
                  </b-field>
                  <b-field :label="j == 0 ? 'Quantitat' : null" class="medium-field">
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
                          subphase.amount,
                          'amount',
                          subphase.amount
                        )
                      "
                      class="subphase-detail-input"
                    >
                    </b-input>
                  </b-field>
                  <b-field :label="j == 0 ? 'Total' : null" class="medium-field">
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
                  <b-field
                    :label="j == 0 ? 'Data' : null"
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
                      @input="input"
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
                      class="button is-small is-danger ml-2"
                      type="button"
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
                    :label="j == 0 ? 'Pagat' : null"
                    v-if="me.options && me.options.treasury"
                    class="short-field"
                  >
                    <b-checkbox v-model="subphase.paid" class="checkbox-inline">
                    </b-checkbox>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Document' : null"
                    v-if="me.options && me.options.treasury"
                    class="zshort-field"
                  >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.invoice &&
                        subphase.invoice.id
                      "
                      :title="`Document ${subphase.invoice.code}`"
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
                      >F {{ subphase.invoice.code }}</span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.grant &&
                        subphase.grant.id
                      "
                      :title="`Document ${subphase.grant.code}`"
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
                      >S {{ subphase.grant.code }}</span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.paid &&
                        !subphase.invoice &&
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
                      >{{ "Document" }}</span
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
            <b-field label="Despeses" horizontal class="has-text-left mt-5">
              <div
                class="
                  readonly
                  subphase-detail-input subphase-detail-input-phase-total
                "
              >
                <money-format
                  :value="totalSubPhase(props.row.expenses)"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value="false"
                  :hide-subunits="false"
                >
                </money-format>
              </div>
            </b-field>
            <ul class="subphases-list">
              <li
                v-for="(subphase, j) in props.row.expenses"
                :key="j"
                class="subphase mt-2 mb-2"
              >
                <b-field grouped>
                  <b-field
                    v-if="(incomeTypes && incomeTypes.length) || (expenseTypes && expenseTypes.length)"
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
                    >
                    </b-input>
                  </b-field>
                  <b-field :label="j == 0 ? 'Quantitat' : null" class="medium-field">
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
                  <b-field :label="j == 0 ? 'Total' : null" class="medium-field">
                    <div class="readonly subphase-detail-input subphase-detail-input-short">
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
                  <b-field
                    :label="j == 0 ? 'Data' : null"
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
                      @input="input"
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
                      class="button is-small is-danger ml-2"
                      type="button"
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
                    :label="j == 0 ? 'Pagat' : null"
                    v-if="me.options && me.options.treasury"
                    class="short-field"
                  >
                    <b-checkbox v-model="subphase.paid" class="checkbox-inline">
                    </b-checkbox>
                  </b-field>
                  <b-field
                    :label="j == 0 ? 'Document' : null"
                    v-if="me.options && me.options.treasury"
                  >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.invoice &&
                        subphase.invoice.id
                      "
                      :title="`${subphase.invoice.code}`"
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
                      >F {{ subphase.invoice.code }}</span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.ticket &&
                        subphase.ticket.id
                      "
                      :title="`${subphase.ticket.code}`"
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
                      >T {{ subphase.ticket.code }}</span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.diet &&
                        subphase.diet.id
                      "
                      :title="`${subphase.diet.code}`"
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
                      >D {{ subphase.diet.code }}</span
                    >
                    <span
                      v-if="
                        me.options &&
                        me.options.treasury &&
                        subphase.paid &&
                        !subphase.invoice &&
                        !subphase.ticket &&
                        !subphase.diet
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
                      >{{ "Document" }}</span
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

        <form @submit.prevent="addPhase">
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
        <div class="quote-summary">
          <hr />
          <b-field label="Total Pressupost" class="mt-5">
            <div class="readonly subphase-detail-input">
              <money-format
                :value="totalAmount ? totalAmount : 0"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
          </b-field>
        </div>
        <hr />
        <b-field>
          <b-button type="is-primary" :loading="isLoading" @click="submit"
            >Guardar</b-button
          >
        </b-field>
      </card-component>

      <card-component v-if="!isLoading && !isUpdating" title="Planificació">
        <button
          v-if="needsUpdate"
          class="button is-small is-danger ml-2"
          type="button"
          @click.prevent="updateGantt"
        >
          Guardar i Actualitzar
          <b-icon icon="refresh" size="is-small" />
        </button>
        <!-- <pre style="height:600px;width:800px;overflow:scroll">
            {{ form.phases }}
          </pre> -->
        <!-- <project-gannt :project="form" :users="leaders" @gantt-item-update="ganttItemUpdate" @gantt-item-delete="ganttItemDelete" /> -->
        <project-gannt2
          v-if="
            !isLoading &&
            !needsUpdate &&
            form.id &&
            form.phases &&
            form.phases.length &&
            form.phases[0].id
          "
          class="left-container"
          :project="form"
          :users="leaders"
          :tasks="tasks"
          @gantt-item-update="ganttItemUpdate"
          @gantt-item-delete="ganttItemDelete"
        />
        <span class="bg-info" v-else
          >Es necessari tenir fases i guardar el projecte per accedir a la
          planificació</span
        >
        <hr />
        <b-field>
          <b-button type="is-primary" :loading="isLoading" @click="submit"
            >Guardar</b-button
          >
        </b-field>
      </card-component>



      <card-component
        v-if="documents && documents.length"
        title="Moviments"
        class="ztile is-child mt-2"
      >
        <b-table :data="documents">
          <b-table-column
            label="Tipus"
            field="docTypeDesc"
            sortable
            v-slot="props"
          >
            {{ props.row.docTypeDesc }}
          </b-table-column>
          <b-table-column
            label="Emés"
            field="document.emitted"
            sortable
            v-slot="props"
          >
            {{
              props.row.document.emitted
                ? formatDate(props.row.document.emitted)
                : ""
            }}
          </b-table-column>
          <b-table-column
            label="Document"
            field="document.code"
            sortable
            v-slot="props"
          >
            {{ props.row.document.code }}
          </b-table-column>
          <b-table-column
            label="Contacte"
            field="document.contact"
            sortable
            v-slot="props"
          >
            {{ getContactName(props.row.document) }}
          </b-table-column>
          <b-table-column
            label="Import"
            field="document.total_base"
            sortable
            numeric
            v-slot="props"
            class="has-text-right"
          >
            <money-format
              :value="props.row.document.total_base * props.row.multiplier"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value="false"
              :hide-subunits="false"
            >
            </money-format>
          </b-table-column>
          <b-table-column
            label="Pagat"
            field="document.paid"
            sortable
            v-slot="props"
          >
          <span class="ztag" :class="props.row.document.paid ? 'has-text-primary' : 'has-text-danger'">
            {{ props.row.document.paid ? "SÍ" : "NO" }}
            </span>
          </b-table-column>
          <b-table-column
            label="Data Pagament"
            field="document.paid_date"
            sortable
            v-slot="props"
          >
            {{ props.row.document.paid_date }}
          </b-table-column>
          <b-table-column
            label="Assignat"
            v-slot="props"
          >
          <span :class="treasuryDone.find(t => t.docType === props.row.docType && t.id === props.row.document.id) ? 'has-text-primary' : 'has-text-danger'">
            {{ treasuryDone.find(t => t.docType === props.row.docType && t.id === props.row.document.id) ? 'SÍ' : 'NO' }}
            </span>
          </b-table-column>
        </b-table>
      </card-component>

      <card-component
        v-if="treasury && treasury.length"
        title="Tresoreria"
        class="ztile is-child mt-2"
      >
        <b-table :data="treasury">
          <b-table-column
            label="Tipus"
            field="docTypeDesc"
            sortable
            v-slot="props"
          >
            {{ props.row.docType === 'income' ? 'Ingrés esperat' : 'Despesa esperada' }}
          </b-table-column>
          <b-table-column
            label="Concepte"
            field="document.concept"
            sortable
            v-slot="props"
          >
            {{ props.row.docType === 'income' && props.row.document.income_type ? props.row.document.income_type.name + ' - ' : ( props.row.docType === 'expense' && props.row.document.expense_type ? props.row.document.expense_type.name + ' - ' : '' ) }}
            {{ props.row.document.concept }}
          </b-table-column>          
          <b-table-column
            label="Import"
            field="document.total_amount"
            sortable
            numeric
            v-slot="props"
          >
          <money-format
              :value="props.row.document.total_amount * props.row.multiplier"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value="false"
              :hide-subunits="false"
            >
            </money-format>
          </b-table-column>
          <b-table-column
            label="Data"
            field="document.date"
            sortable
            v-slot="props"
          >
            {{ props.row.document.date ? formatDate(props.row.document.date) : '' }}
          </b-table-column>
        </b-table>
      </card-component>


    </section>
  </div>
</template>

<script>
// import axios from 'axios'
import dayjs from "dayjs";
// import find from 'lodash/find'
import TitleBar from "@/components/TitleBar";
// import HeroBar from '@/components/HeroBar'
// import Tiles from '@/components/Tiles'
import CardComponent from "@/components/CardComponent";
// import FilePicker from '@/components/FilePicker'
// import UserAvatar from '@/components/UserAvatar'
import ModalBoxInvoicing from "@/components/ModalBoxInvoicing";
import service from "@/service/index";
// import ProjectGannt from '@/components/ProjectGannt.vue'
import ProjectGannt2 from "@/components/ProjectGannt2.vue";
// import CurrencyInput from '@/components/CurrencyInput'
import MoneyFormat from "vue-money-format";
import { EventBus } from "@/service/event-bus.js";
import sumBy from "lodash/sumBy";
import { mapState } from "vuex";
import moment from "moment";
import sortBy from "lodash/sortBy";

export default {
  name: "ProjectForm",
  components: {
    // UserAvatar,
    // FilePicker,
    CardComponent,
    // Tiles,
    // HeroBar,
    TitleBar,
    // ProjectGannt,
    MoneyFormat,
    ModalBoxInvoicing,
    ProjectGannt2,
    // CurrencyInput
    // Notification
  },
  props: {
    id: {
      type: [String, Number],
      default: null,
    },
  },
  data() {
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
      expenseTypes: [],
      incomeTypes: [],      
      clientSearch: "",
      cooperaSearch: "",
      strategiesSearch: "",
      todos: [
        { title: "one value", edit: false },
        { title: "other value", edit: false },
        { title: "otro titulo", edit: false },
      ],
      editedTodo: null,
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
    titleStack() {
      let lastCrumb;

      if (this.isProfileExists) {
        lastCrumb = this.form.name;
      } else {
        lastCrumb = "Nou Projecte";
      }

      return ["Projectes", lastCrumb];
    },
    heroTitle() {
      if (this.isProfileExists) {
        return this.form.name;
      } else {
        return "Crea Projecte";
      }
    },
    heroRouterLinkTo() {
      if (this.isProfileExists) {
        return { name: "project.new" };
      } else {
        return "/";
      }
    },
    heroRouterLinkLabel() {
      if (this.isProfileExists) {
        return "Nou Projecte";
      } else {
        return "Inici";
      }
    },
    formCardTitle() {
      if (this.isProfileExists) {
        return "Edita Projecte";
      } else {
        return "Nou Projecte";
      }
    },
    transitionName() {
      if (this.useTransition) {
        return "fade";
      }
      return "x";
    },
    totalAmount() {
      var i = 0;
      this.form.phases.forEach((p) => {
        i += sumBy(p.subphases, (x) => x.quantity * x.amount);
      });
      var e = 0;
      this.form.phases.forEach((p) => {
        e += sumBy(p.expenses, (x) => x.quantity * x.amount);
      });
      return i - e;
    },
    totalExpenses() {
      return sumBy(this.form.expenses, (x) => x.quantity * x.amount);
    },
    executedIncomes() {
      return (
        sumBy(this.form.emitted_invoices, (x) => x.total_base) +
        sumBy(this.form.received_grants, (x) => x.total_base)
      );
    },
    executedExpenses() {
      return (
        sumBy(this.form.received_invoices, (x) => x.total_base) +
        sumBy(this.form.tickets, (x) => x.total_base) +
        sumBy(this.form.diets, (x) => x.total_base)
      );
    },
    documents() {
      const documents = [];
      if (this.form.emitted_invoices) {
        this.form.emitted_invoices.forEach((e) => {
          documents.push({
            docType: "emitted_invoices",
            docTypeDesc: "Factura emesa",
            multiplier: 1,
            document: e,
          });
        });
      }
      if (this.form.received_grants) {
        this.form.received_grants.forEach((e) => {
          documents.push({
            docType: "received_grants",
            docTypeDesc: "Subvenció rebuda",
            multiplier: 1,
            document: e,
          });
        });
      }
      if (this.form.received_invoices) {
        this.form.received_invoices.forEach((e) => {
          documents.push({
            docType: "received_invoices",
            docTypeDesc: "Factura rebuda",
            multiplier: -1,
            document: e,
          });
        });
      }
      if (this.form.tickets) {
        this.form.tickets.forEach((e) => {
          documents.push({
            docType: "tickets",
            docTypeDesc: "Ticket",
            multiplier: -1,
            document: e,
          });
        });
      }
      if (this.form.diets) {
        this.form.diets.forEach((e) => {
          documents.push({
            docType: "diets",
            docTypeDesc: "Dieta",
            multiplier: -1,
            document: e,
          });
        });
      }
      return sortBy(documents, "document.emitted");
    },
    treasuryDone() {
      const documents = [];
      this.form.phases.forEach(ph => {
        ph.subphases.forEach(income => {
          if (income.paid) {
            if (income.invoice) {
              documents.push({
                docType: "emitted_invoices",
                id: income.invoice.id,
                multiplier: 1
              });
            }
            if (income.grant) {
              documents.push({
                docType: "received_grants",
                id: income.grant.id,
                multiplier: 1
              });
            }
          }
        })
        ph.expenses.forEach(expense => {
          if (expense.paid) {
            if (expense.invoice) {
              documents.push({
                docType: "received_invoices",
                id: expense.invoice.id,
                multiplier: -1
              });
            }
            if (expense.ticket) {
              documents.push({
                docType: "tickets",
                id: expense.ticket.id,
                multiplier: -1
              });
            }
            if (expense.diet) {
              documents.push({
                docType: "diets",
                id: expense.diet.id,
                multiplier: -1
              });
            }
          }
        })
      })
      return documents
    },
    treasury() {
      const documents = [];
      this.form.phases.forEach(ph => {
        ph.subphases.forEach(income => {
          if (!income.paid) {
            documents.push({
                docType: "income",
                document: income,
                multiplier: 1
              }); 
          }
        })
        ph.expenses.forEach(expense => {
          if (!expense.paid) {
            documents.push({
                docType: "expense",
                document: expense,
                multiplier: -1
              }); 
          }
        })
      })
      return documents
      // return sortBy(documents, "document.emitted");
    },
  },
  watch: {
    id(newValue) {
      this.isProfileExists = false;
      if (!newValue || newValue === 0) {
        this.form = this.getClearFormObject();
        this.getAuxiliarData();
      } else {
        this.getData();
      }
    },
  },
  created() {
    this.getData();
  },
  methods: {
    blurPhase(phase) {
      this.form.phases.forEach((p) => {
        p.edit = false;
      });
      if (phase) {
        phase.edit = true;
      }
    },
    blurPhaseEdit(phase) {
      this.needsUpdate = true;
      this.blurPhase(null);
      // this.$emit('update')
    },
    changeSubPhase(subphase, field, value) {
      if (value && value.toString().includes(",")) {
        subphase[field] = value.toString().replace(",", ".");
      }
      this.form.phases = this.form.phases.map((r) => {
        return {
          ...r,
          opened: true,
          total_amount:
            sumBy(r.subphases, (x) => x.quantity * x.amount) -
            sumBy(r.expenses, (x) => x.quantity * x.amount),
        };
      });
    },
    addPhase() {
      this.needsUpdate = true;
      this.form.phases.push({
        name: this.phaseToAdd,
        edit: false,
        opened: true,
        subphases: [],
        expenses: [],
        total_amount: 0,
      });
      this.phaseToAdd = "";
    },
    removePhase(i) {
      this.needsUpdate = true;
      this.form.phases = this.form.phases.filter((p, j) => i !== j);
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
      };
    },
    getData() {
      if (!this.me) {
        service({ requiresAuth: true })
          .get("me")
          .then((r) => {
            this.me = r.data;
            this.$store.commit("me", {
              me: r.data,
            });
          });
      }
      if (this.$route.params.id && this.$route.params.id > 0) {
        this.isLoading = true;
        service({ requiresAuth: true })
          .get("projects/" + this.$route.params.id)
          .then(async (r) => {
            if (r.data && r.data.id) {
              this.isProfileExists = true;
              this.form = r.data;
              this.form.project_state =
                this.form.project_state && this.form.project_state.id
                  ? this.form.project_state
                  : { id: 0 };
              this.form.project_scope =
                this.form.project_scope && this.form.project_scope.id
                  ? this.form.project_scope
                  : { id: 0 };
              this.form.leader =
                this.form.leader && this.form.leader.id
                  ? this.form.leader
                  : { id: 0 };
              this.form.phases = this.form.phases.map((p) => {
                return { ...p, edit: false };
              });
              if (this.form.phases.length === 0) {
                // create first phase
                const phase = { name: "F1", subphases: [], expenses: [] };
                let mustUpdate = false;
                if (this.form.incomes.length > 0) {
                  mustUpdate = true;
                  for (let i = 0; i < this.form.incomes.length; i++) {
                    const income = this.form.incomes[i];
                    if (income.client && !income.client.id) {
                      delete income.client;
                    }
                    delete income.id;
                    phase.subphases.push(income);
                  }
                } else {
                  phase.subphases.push({ concept: "SF1" });
                }
                this.form.phases.push(phase);
                this.form.incomes = [];

                if (this.form.estimated_hours.length > 0) {
                  mustUpdate = true;
                  this.form.phases[0].subphases[0].estimated_hours =
                    this.form.estimated_hours;
                  this.form.phases[0].subphases[0].estimated_hours.forEach(
                    (e) => {
                      delete e.id;
                    }
                  );
                  this.form.estimated_hours = [];
                }

                if (this.form.expenses.length > 0) {
                  for (let i = 0; i < this.form.expenses.length; i++) {
                    const expense = this.form.expenses[i];
                    delete expense.id;
                  }
                  mustUpdate = true;
                  this.form.phases[0].expenses = this.form.expenses;
                  this.form.expenses = [];
                  // this.form.phases = this.form.phases.map(r => { return { ...r, total_amount: sumBy(r.subphases, x => x.quantity * x.amount) - sumBy(r.expenses, x => x.quantity * x.amount) } })
                } else {
                  this.form.phases = this.form.phases.map((r) => {
                    return { ...r, expenses: [] };
                  });
                }

                if (mustUpdate) {
                  // await this.submit()
                }
              } else if (this.form.expenses.length > 0) {
                for (let i = 0; i < this.form.expenses.length; i++) {
                  const expense = this.form.expenses[i];
                  delete expense.id;
                }
                this.form.phases[0].expenses = this.form.expenses;
                // this.form.phases = this.form.phases.map(r => { return { ...r, total_amount: sumBy(r.subphases, x => x.quantity * x.amount) - sumBy(r.expenses, x => x.quantity * x.amount) } })
                this.form.expenses = [];
                // await this.submit()
              } else {
                this.form.phases = this.form.phases.map((r) => {
                  return { ...r, expenses: r.expenses || [] };
                });
              }

              this.form.phases = this.form.phases.map((r) => {
                return {
                  ...r,
                  opened: true,
                  total_amount:
                    sumBy(r.subphases, "total_amount") -
                    sumBy(r.expenses, "total_amount"),
                };
              });

              this.form.phases.forEach((p) => {
                p.subphases.forEach((s) => {
                  if (s.date) {
                    s.date = moment(s.date, "YYYY-MM-DD").toDate();
                  }
                });
                p.expenses.forEach((s) => {
                  if (s.date) {
                    s.date = moment(s.date, "YYYY-MM-DD").toDate();
                  }
                });
              });

              // this.form.expenses.forEach(e => {
              //   if (e.date) {
              //     e.date = moment(e.date, 'YYYY-MM-DD').toDate()
              //   }
              // })

              if (this.form.date_start) {
                this.form.date_start = moment(
                  this.form.date_start,
                  "YYYY-MM-DD"
                ).toDate();
              }
              if (this.form.date_end) {
                this.form.date_end = moment(
                  this.form.date_end,
                  "YYYY-MM-DD"
                ).toDate();
              }

              this.getAuxiliarData();

              this.isLoading = false;
            } else {
              this.$router.push({ name: "project.new" });
            }
          });
      } else {
        this.getAuxiliarData();
      }
    },
    getAuxiliarData() {
      service({ requiresAuth: true })
        .get("project-states")
        .then((r) => {
          this.project_states = r.data;
        });
      service({ requiresAuth: true })
        .get("project-scopes")
        .then((r) => {
          this.project_scopes = r.data;
        });
      service({ requiresAuth: true })
        .get("users?_limit=-1")
        .then((r) => {
          this.leaders = r.data.filter((u) => u.hidden !== true);
        });
      service({ requiresAuth: true })
        .get("contacts?_limit=-1")
        .then((r) => {
          this.clients = r.data;
        });
      service({ requiresAuth: true })
        .get("strategies")
        .then((r) => {
          this.strategies = r.data;
        });
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
        
    },
    input(v) {
      this.createdReadable = dayjs(v).format("MMM D, YYYY");
    },
    async submit() {
      this.isLoading = true;

      if (!this.form.structural_expenses_pct) {
        this.form.structural_expenses_pct = null;
      }

      try {
        if (this.form.id) {
          await service({ requiresAuth: true }).put(
            `projects/${this.form.id}`,
            this.form
          );
          this.getData();
        } else {
          const newProject = await service({ requiresAuth: true }).post(
            "projects",
            this.form
          );
          // console.log('newProject', newProject.data)
          this.$router.push({
            name: "project.edit",
            params: { id: newProject.data.id },
          });
          // this.getData()
        }
      } catch (err) {
        console.error("projects error", err);
        this.$buefy.snackbar.open({
          message: "Error",
          queue: false,
        });
      }

      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false,
      });

      this.needsUpdate = false;

      setTimeout(() => {
        this.isLoading = false;
      }, 500);
    },
    clientSelected(option) {
      delete option.projects;
      delete option.quotes;
      delete option.projectes;
      this.form.clients = this.form.clients || [];
      if (!this.form.clients.find((c) => c.id === option.id)) {
        this.form.clients.push(option);
      }
      this.clientSearch = "";
      setTimeout(() => {
        this.clientSearch = "";
      }, 100);
    },
    cooperaSelected(option) {
      delete option.projects;
      delete option.quotes;
      delete option.projectes;
      if (!this.form.intercooperations.find((c) => c.id === option.id)) {
        this.form.intercooperations.push(option);
      }
      this.cooperaSearch = "";
      setTimeout(() => {
        this.cooperaSearch = "";
      }, 100);
    },
    strategiesSelected(option) {
      delete option.projects;
      delete option.quotes;
      delete option.projectes;
      if (!this.form.strategies.find((c) => c.id === option.id)) {
        this.form.strategies.push(option);
      }
      this.strategiesSearch = "";
      setTimeout(() => {
        this.strategiesSearch = "";
      }, 100);
    },
    removeClient(option) {
      this.form.clients = this.form.clients.filter((c) => c.id !== option.id);
    },
    removeCoopera(option) {
      this.form.intercooperations = this.form.intercooperations.filter(
        (c) => c.id !== option.id
      );
    },
    removeStrategies(option) {
      this.form.strategies = this.form.strategies.filter(
        (c) => c.id !== option.id
      );
    },
    removeSubPhase(phase, subphase, j) {
      this.needsUpdate = true;
      phase.subphases = phase.subphases.filter((s, i) => i !== j);
    },
    removeSubExpense(phase, subphase, j) {
      this.needsUpdate = true;
      phase.expenses = phase.expenses.filter((s, i) => i !== j);
    },
    removeExpense(expense, j) {
      this.form.expenses = this.form.expenses.filter((s, i) => i !== j);
    },
    addExpense(expense) {
      this.form.expenses.push({
        concept: "",
        quantity: 1,
        amount: 0,
        expense_type: null,
      });
    },
    addSubPhase(phase) {
      this.needsUpdate = true;
      phase.subphases.push({ concept: "", quantity: 1, amount: 0 });
    },
    addSubExpense(phase) {
      this.needsUpdate = true;
      phase.expenses.push({ concept: "", quantity: 1, amount: 0 });
    },
    updateGantt() {
      EventBus.$emit("zphases-updated", {});
      this.isUpdating = true;
      this.needsUpdate = false;
      setTimeout(() => {
        this.isUpdating = false;
      }, 500);
    },
    ganttItemUpdate(item) {
      // console.log('ganttItemUpdate', item)
      if (!item._hours) {
        return;
      }
      // return item
      // console.log('ganttItemUpdate _uuid', item._uuid)
      const id = item._hours.id;
      const pid = item._phase.id;
      const sid = item._subphase.id;
      const uuid = item._uuid;
      const subphase = this.form.phases
        .find((p) => p.id === pid)
        .subphases.find((s) => s.id === sid);
      // console.log('subphase', subphase)
      if (!subphase || !subphase.estimated_hours) {
        return;
      }
      const hours = this.form.phases
        .find((p) => p.id === pid)
        .subphases.find((s) => s.id === sid)
        .estimated_hours.find(
          (h) =>
            (h.id === id && h.id > 0 && !uuid) || (h._uuid === uuid && uuid)
        );
      // console.log('hours', hours)
      // console.log('item', item)
      if (hours) {
        hours.from = moment(item.start_date).format("YYYY-MM-DD");
        hours.to = item.end_date
          ? moment(item.end_date).add(-1, "day").format("YYYY-MM-DD")
          : moment(item.start_date)
              .add(1, "month")
              .add(-1, "day")
              .format("YYYY-MM-DD");
        const to2 = moment(hours.to, "YYYY-MM-DD");
        const months = moment(to2).diff(item.start_date, "months") + 1;
        hours.monthly_quantity = item._hours.quantity * months;
        hours.quantity = item._hours.quantity;
        hours.users_permissions_user = item._hours.users_permissions_user;
        hours.amount = item._hours.amount;
        hours.total_amount = item.total_amount;
      } else if (uuid) {
        const hour = {
          from: moment(item.start_date).format("YYYY-MM-DD"),
          to: item.end_date
            ? moment(item.end_date).add(-1, "day").format("YYYY-MM-DD")
            : moment(item.start_date)
                .add(1, "month")
                .add(-1, "day")
                .format("YYYY-MM-DD"),
          monthly_quantity: null,
          quantity: item._hours.quantity,
          users_permissions_user: item._hours.users_permissions_user,
          amount: item._hours.amount,
          total_amount: item._hours.total_amount,
          _uuid: item._uuid,
          // _hours: item._hours,
          // _phase: item._phase,
          // _subphase: item._subphase,
        };
        // console.log('hour to ush', hour)
        this.form.phases
          .find((p) => p.id === pid)
          .subphases.find((s) => s.id === sid)
          .estimated_hours.push(hour);
      }
      this.updatingGantt = true;
      if (this.updatingGanttTimer) {
        clearTimeout(this.updatingGanttTimer);
      }
      this.updatingGanttTimer = setTimeout(() => {
        this.updatingGantt = false;
        EventBus.$emit("phases-updated", this.form.phases);
        // console.log('ganttItemUpdate timeout!!!')
      }, 800);
      // console.log('ganttItemUpdate', item)
    },
    ganttItemDelete(item) {
      const id = item._hours.id;
      const pid = item._phase.id;
      const sid = item._subphase.id;
      this.form.phases
        .find((p) => p.id === pid)
        .subphases.find((s) => s.id === sid).estimated_hours = this.form.phases
        .find((p) => p.id === pid)
        .subphases.find((s) => s.id === sid)
        .estimated_hours.filter((h) => h.id !== id);
    },
    sumByFn(arr, field) {
      return sumBy(arr, field);
    },
    totalSubPhase(arr) {
      return sumBy(arr, "total_amount");
    },
    clearDate() {
      // this.form.date_start = null
      this.selected = null;
      // this.form[date] = null
    },
    getContactName(invoice) {
      return invoice &&
        invoice.contact &&
        this.clients.find((c) => c.id === invoice.contact)
        ? this.clients.find((c) => c.id === invoice.contact).name
        : "";
    },
    setInvoice(type, phase, subphase, i, j) {
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
      };
      this.isModalActive = true;
    },
    async modalSubmit(invoicing) {
      console.log("invoicing", invoicing);
      if (this.invoicingObject.type === "incomes") {
        const phase = this.form.phases.find(
          (p, idx) => idx === this.invoicingObject.i
        );
        const subphase = phase.subphases.find(
          (p, idx) => idx === this.invoicingObject.j
        );
        subphase.paid = true;
        subphase.invoice = invoicing.emitted;
        subphase.grant = invoicing.grant;
      } else if (this.invoicingObject.type === "expenses") {
        const phase = this.form.phases.find(
          (p, idx) => idx === this.invoicingObject.i
        );
        const subphase = phase.expenses.find(
          (p, idx) => idx === this.invoicingObject.j
        );
        subphase.paid = true;
        subphase.invoice = invoicing.received;
        subphase.ticket = invoicing.ticket;
        subphase.diet = invoicing.diet;
      }
      this.isModalActive = false;
    },
    async modalDelete(activity) {
      this.isModalActive = false;
    },
    modalCancel() {
      this.isModalActive = false;
    },
    formatDate(value) {
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
    },
  },
};
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
.phases-list .phase .phase-detail {
  padding: calc(0.5em - 2px) 0.5rem;
  border: 0px solid #ccc;
}
.phases-list .phase .phase-detail label {
  vertical-align: 2px;
  padding-left: 4px;
}
.phases-list .subphase {
  padding-left: 2.5rem;
}
.phases-list .phase .phase-detail-input {
  border: 0px solid #ccc;
}
.add-subphase {
  margin-left: 2.5rem;
}
.subphase-detail-input.readonly {
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
.subphase .field:not(.short-field) {
  width: 35%;
}
.subphase .field.medium-field {
  width: 23%;
}
.subphase .field.date-field {
  width: 28%;
}
.subphase .datepicker-header .field {
  width: auto !important;
}
.subphase .field.short-field {
  width: 10%;
}
.subphase .field.medium-field {
  width: 20%;
}
.subphase .field.subphase-detail-input-large-field {
  width: 75%;
}
/* .subphase .subphase-detail-input-short {
  max-width: 150px;
} */
.subphases-list {
  margin-left: 1rem;
}
.subphases-list .subphase-detail-input.readonly,
.subphases-list
  .subphase-detail-input.readonly.subphase-detail-input-phase-total {
  width: 100%;
}
.checkbox-inline {
  margin-top: 10px;
}
.invoice-tag {
  margin-top: 8px;
}
.has-text-left .field-label {
  text-align: left;
}
.left-container {
  overflow: hidden;
  position: relative;
  height: 100%;
}
.clickable {
  cursor: pointer;
}
.summary-card .column{  
  margin-bottom: 0!important;
  padding-bottom: 0!important;
}
</style>
