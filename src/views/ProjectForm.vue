res executade<template>
  <div class="project-form">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-two-thirds">
          <card-component :title="formCardTitle" class="tile is-child">
            <form @submit.prevent="submitAndContinue" v-if="!isLoading">
              <b-field label="Codi *" horizontal>
                <b-input v-model="form.name" placeholder="Codi" required />
              </b-field>
              <b-field label="Estat *" horizontal>
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
              <b-field label="Àmbit *" horizontal>
                <b-select v-model="form.project_scope.id" placeholder="Àmbit">
                  <option
                    v-for="(s, index) in project_scopes"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>
              <b-field label="Coordina *" horizontal>
                <b-select v-model="form.leader.id" placeholder="Coordina">
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
              <b-field label="Àmbit territorial" horizontal>
                <b-select v-model="form.region.id" placeholder="Àmbit">
                  <option
                    v-for="(s, index) in regions"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
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
              <b-field
                label="Propòsit"
                message="Propòsit del projecte"
                horizontal
              >
                <b-input
                  type="textarea"
                  v-model="form.purpose"
                  placeholder="Propòsit"
                />
              </b-field>
              <b-field label="Inici *" horizontal>
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
              <b-field label="Final *" horizontal>
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
                v-if="dedicationTypes && dedicationTypes.length"
                label="Tipus de dedicació"
                horizontal
              >
                <b-select
                  v-model="form.default_dedication_type.id"
                  placeholder="Tipus de dedicació"
                >
                  <option>-- Qualsevol --</option>
                  <option
                    v-for="(s, index) in dedicationTypes"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
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

              <b-field
                label="Justificació nòmines"
                horizontal
                message="Que s'acull a subvencions on caldrà justificar part amb nòmines"
              >
                <b-switch v-model="form.grantable"> </b-switch>
                <b-input
                  v-if="form.grantable"
                  type="numeric"
                  v-model="form.grantable_amount"
                  placeholder="Import a justificar"
                  @input="
                    changeValue('grantable_amount', form.grantable_amount)
                  "
                >
                </b-input>
              </b-field>

              <b-field
                label="Projecte mare"
                horizontal
                message="Per agrupar projectes interanuals"
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

              <b-field label="Funcions" horizontal>
                <b-autocomplete
                  v-model="activityTypeSearch"
                  placeholder="Escriu el nom de la funció..."
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredActivityTypes"
                  field="name"
                  @select="activityTypeSelected"
                  :clearable="false"
                  icon-right="plus-circle"
                  icon-right-clickable
                  @icon-right-click="addActivity"
                >
                </b-autocomplete>
              </b-field>
              <b-field
                label=""
                horizontal
                v-if="
                  form.global_activity_types &&
                  form.global_activity_types.length
                "
              >
                <div class="list">
                  <ul class="ulist">
                    <li
                      v-for="(activityType, i) in form.global_activity_types"
                      :key="i"
                      class="tag is-primary"
                    >
                      {{ activityType.name }}
                      <b-button
                        @click="removeActivity(activityType)"
                        class="no-button"
                        icon-left="close-circle"
                      />
                    </li>
                  </ul>
                </div>
              </b-field>
              <hr />
              <div class="is-flex">
                <b-field horizontal>
                  <b-button
                    type="is-primary"
                    :loading="isLoading"
                    @click="submitAndContinue"
                    >Guardar</b-button
                  >
                </b-field>
                <b-field horizontal>
                  <b-button
                    type="is-primary"
                    :loading="isLoading"
                    @click="submitAndExit"
                    >Guardar i sortir</b-button
                  >
                </b-field>
              </div>
            </form>
          </card-component>
        </div>
        <div class="column is-one-third" v-if="!isLoading">
          <card-component
            v-if="isProfileExists"
            title="RESUM FINANCER PROJECTE"
            class="tile is-child summary-card"
          >
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
              <b-field label="Diferència" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      form.incomes_expenses - form.total_real_incomes_expenses
                    "
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
              <b-field label="Diferència" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.total_incomes - form.total_real_incomes"
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
              <b-field label="Despeses pr. totals" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      form.total_expenses + form.total_estimated_hours_price
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Despeses ex. totals" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      form.total_real_expenses + form.total_real_hours_price
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Diferència" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      form.total_expenses +
                      form.total_estimated_hours_price -
                      form.total_real_expenses -
                      form.total_real_hours_price
                    "
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
              <b-field label="Despeses pr. factures" class="column">
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
              <b-field label="Despeses ex. factures" class="column">
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
              <b-field label="Diferència" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="form.total_expenses - form.total_real_expenses"
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
              <b-field label="Diferència" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      form.total_estimated_hours_price -
                      form.total_real_hours_price
                    "
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
              <b-field label="Hores previstes (h)" class="column">
                <div class="readonly subphase-detail-input has-text-right">
                  {{ form.total_estimated_hours.toFixed(2) }} h
                </div>
              </b-field>
              <b-field label="Hores executades (h)" class="column">
                <div class="readonly subphase-detail-input has-text-right">
                  {{ form.total_real_hours.toFixed(2) }} h
                </div>
              </b-field>
              <b-field label="Diferència (h)" class="column">
                <div class="readonly subphase-detail-input has-text-right">
                  {{
                    (
                      form.total_estimated_hours - form.total_real_hours
                    ).toFixed(2)
                  }}
                  h
                </div>
              </b-field>
            </div>

            <div class="columns">
              <b-field label="Cost/hora previst" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      form.total_estimated_hours
                        ? form.total_estimated_hours_price /
                          form.total_estimated_hours
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
              <b-field label="Cost/hora executat" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      form.total_real_hours
                        ? form.total_real_hours_price / form.total_real_hours
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
              <b-field label="Diferència" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      (form.total_estimated_hours
                        ? form.total_estimated_hours_price /
                          form.total_estimated_hours
                        : 0) -
                      (form.total_real_hours
                        ? form.total_real_hours_price / form.total_real_hours
                        : 0)
                    "
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
              <b-field label="Preu/hora previst" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      form.total_estimated_hours
                        ? (form.total_incomes - form.total_expenses) /
                          form.total_estimated_hours
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
              <b-field label="Preu/hora executat" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      form.total_real_hours
                        ? (form.total_real_incomes - form.total_real_expenses) /
                          form.total_real_hours
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
              <b-field label="Diferència" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      (form.total_estimated_hours
                        ? (form.total_incomes - form.total_expenses) /
                          form.total_estimated_hours
                        : 0) -
                      (form.total_real_hours
                        ? (form.total_real_incomes - form.total_real_expenses) /
                          form.total_real_hours
                        : 0)
                    "
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

          <card-component
            v-if="isProfileExists"
            title="RESUM TRESORERIA PROJECTE"
            class="ztile is-child summary-card mt-4"
          >
            <div class="columns">
              <b-field label="Pagaments previstos" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="treasuryExpensesPending"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Pagaments realitzats" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="treasuryExpensesDone"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Diferència" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="treasuryExpensesPending - treasuryExpensesDone"
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
              <b-field label="Cobraments previstos" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="treasuryIncomesPending"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Cobraments realitzats" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="treasuryIncomesDone"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Diferència" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="treasuryIncomesPending - treasuryIncomesDone"
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

      <card-component
        v-if="
          !isLoading &&
          phasesVisible &&
          form &&
          form.original_phases &&
          form.original_phases.length > 0
        "
        title="GESTIÓ ECONÒMICA - FASES I PRESSUPOST ORIGINAL"
        :closeIcon="true"
        :content-visible="true"
      >
        <project-phases
          :form="form"
          :project-phases="form.original_phases"
          @phases-updated="originalPhasesUpdated"
          mode="simple"
        />
        <hr
          v-if="
            form.original_phases.length &&
            (!form.phases || form.phases.length === 0)
          "
        />
        <b-field v-if="form.original_phases.length && form.phases.length === 0">
          <b-button type="is-warning" @click="closeQuoteFromOriginal">
            Tancar Pressupost
          </b-button>
        </b-field>
      </card-component>

      <!-- <pre>{{ form.original_phases }}</pre>
      <pre>{{ form.phases }}</pre> -->

      <card-component
        v-if="!isLoading && phasesVisible && form && form.phases"
        :title="
          !form.original_phases ||
          (form.original_phases && form.original_phases.length === 0)
            ? 'GESTIÓ ECONÒMICA - FASES I PRESSUPOST'
            : 'GESTIÓ ECONÒMICA - EXECUCIÓ PRESSUPOST'
        "
        :closeIcon="true"
        :content-visible="true"
      >
        <project-phases
          :form="form"
          :project-phases="form.phases"
          @phases-updated="phasesUpdated"
        />
        <hr
          v-if="
            form.phases.length &&
            (!form.original_phases || form.original_phases.length === 0)
          "
        />
        <b-field v-if="form.phases.length && form.original_phases.length === 0">
          <b-button type="is-warning" @click="closeQuote">
            Tancar Pressupost
          </b-button>
        </b-field>
      </card-component>

      <card-component
        v-if="documents && documents.length && !isLoading"
        title="GESTIÓ ECONÒMICA - MOVIMENTS D'INGRESSOS I DESPESES"
        class="ztile is-child mt-2"
        :content-visible="true"
      >
        <b-table :data="documents">
          <b-table-column
            label="Tipus"
            field="docTypeDesc"
            sortable
            v-slot="props"
          >
            {{ props.row.multiplier > 0 ? "Ingrés" : "Despesa" }}
          </b-table-column>
          <b-table-column
            label="Subtipus"
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
            <span
              class="ztag"
              :class="
                props.row.document.paid ? 'has-text-primary' : 'has-text-danger'
              "
            >
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
          <b-table-column label="Assignat" v-slot="props">
            <span
              :class="
                treasuryDone.find(
                  (t) =>
                    t.docType === props.row.docType &&
                    t.id === props.row.document.id
                )
                  ? 'has-text-primary'
                  : 'has-text-danger'
              "
            >
              {{
                treasuryDone.find(
                  (t) =>
                    t.docType === props.row.docType &&
                    t.id === props.row.document.id
                )
                  ? "SÍ"
                  : "NO"
              }}
            </span>
          </b-table-column>
        </b-table>
      </card-component>

      <card-component v-if="!isLoading && !isUpdating" title="PLANIFICACIÓ">
        <button
          v-if="needsUpdate"
          class="button is-small is-danger ml-2"
          type="button"
          @click.prevent="updateGantt"
        >
          Guardar i Actualitzar
          <b-icon icon="refresh" size="is-small" />
        </button>
        <project-gannt
          v-if="
            !isLoading &&
            !needsUpdate &&
            form.id &&
            form.original_phases &&
            form.original_phases.length &&
            form.original_phases[0].id
          "
          class="left-container"
          :project="form"
          :users="leaders"
          :tasks="{}"
          @gantt-item-update="ganttItemUpdate"
          @gantt-item-delete="ganttItemDelete"
        />
        <span class="bg-info" v-else
          >Es necessari tenir fases i guardar el projecte amb un pressupost
          tancat per accedir a la planificació</span
        >
        <hr />
        <div class="is-flex">
          <b-field horizontal>
            <b-button
              type="is-primary"
              :loading="isLoading"
              @click="submitAndContinue"
              >Guardar</b-button
            >
          </b-field>
          <b-field horizontal>
            <b-button
              type="is-primary"
              :loading="isLoading"
              @click="submitAndExit"
              >Guardar i sortir</b-button
            >
          </b-field>
        </div>
      </card-component>

      <card-component
        v-if="treasury && treasury.length && !isLoading"
        title="GESTIÓ ECONÒMICA - MOVIMENTS DE COBRAMENTS I PAGAMENTS"
        class="ztile is-child mt-2"
      >
        <b-table :data="treasury">
          <b-table-column
            label="Tipus"
            field="docTypeDesc"
            sortable
            v-slot="props"
          >
          <span v-if="props.row.docType === 'income' && props.row.document && props.row.document.paid">
            Cobrament
          </span>
          <span v-else-if="props.row.docType === 'income'">
            Cobrament esperat
          </span>
          <span v-else-if="props.row.docType === 'expense' && props.row.document && props.row.document.paid">
            Pagament
          </span>
          <span v-else-if="props.row.docType === 'expense'">
            Pagament esperat
          </span>
          <span v-else-if="props.row.docType === 'treasury'">
            Entrada manual tresoreria
          </span>
          </b-table-column>
          <b-table-column
            label="Concepte"
            field="document.concept"
            sortable
            v-slot="props"
          >
            {{
              props.row.docType === "income" && props.row.document.income_type
                ? props.row.document.income_type.name + " - "
                : props.row.docType === "expense" &&
                  props.row.document.expense_type
                ? props.row.document.expense_type.name + " - "
                : ""
            }}
            <span v-if="props.row.document.concept">{{props.row.document.concept}}</span>
            <span v-if="props.row.document.comment">{{props.row.document.comment}}</span>
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
            <span v-if="props.row.document && props.row.document.date">{{
              props.row.document.date ? formatDate(props.row.document.date) : ""
            }}</span>
            <span
              v-else-if="
                props.row.document &&
                props.row.document.invoice &&
                props.row.document.invoice.emitted
              "
              >{{ props.row.document.invoice.emitted }}</span
            >
            <span
              v-else-if="
                props.row.document &&
                props.row.document.expense &&
                props.row.document.expense.emitted
              "
              >{{ props.row.document.expense.emitted }}</span
            >
          </b-table-column>
        </b-table>
      </card-component>

      <card-component
        v-if="!isLoading"
        title="TASQUES"
        header-icon="view-column"
        @header-icon-click="toogleTasksView"
      >
        <tasks
          v-if="form.id"
          :projects="projects"
          :users="leaders"
          :user="null"
          :project-info="form"
          :project="form.id"
          :view="tasksView"
        />
        <span class="bg-info" v-else
          >Es necessari guardar el projecte per accedir a les tasques</span
        >
      </card-component>
    </section>
  </div>
</template>

<script>
import dayjs from "dayjs";
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import ModalBoxInvoicing from "@/components/ModalBoxInvoicing";
import ModalBoxSplit from "@/components/ModalBoxSplit";
import service from "@/service/index";
import ProjectGannt from "@/components/ProjectGannt.vue";
import ProjectPhases from "@/components/ProjectPhases.vue";
import MoneyFormat from "@/components/MoneyFormat.vue";
import { EventBus } from "@/service/event-bus.js";
import sumBy from "lodash/sumBy";
import { mapState } from "vuex";
import moment from "moment";
import sortBy from "lodash/sortBy";
import Tasks from "@/components/Tasks";

export default {
  name: "ProjectForm",
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat,
    ModalBoxInvoicing,
    ModalBoxSplit,
    ProjectGannt,
    ProjectPhases,
    Tasks,
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
      dirty: false,
      createdReadable: null,
      isProfileExists: false,
      project_states: [],
      project_scopes: [],
      leaders: [],
      clients: [],
      strategies: [],
      expenseTypes: [],
      incomeTypes: [],
      documentTypes: [],
      dedicationTypes: [],
      projects: [],
      activityTypes: [],
      regions: [],
      clientSearch: "",
      projectSearch: "",
      activityTypeSearch: "",
      cooperaSearch: "",
      strategiesSearch: "",
      phaseToAdd: "",
      updatingGantt: false,
      updatingGanttTimer: 0,
      defaultOpenedDetails: [1],
      showDetailIcon: true,
      useTransition: false,
      selected: new Date(),
      invoicingObject: {},
      isModalActive: false,
      isModalSplitActive: false,
      newTask: "",
      phasesVisible: true,
      tasksView: "state",
    };
  },
  computed: {
    ...mapState(["me"]),
    ...mapState(["userName"]),
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
    filteredProjects() {
      return this.projects.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredActivityTypes() {
      return this.activityTypes.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.activityTypeSearch.toLowerCase()) >= 0
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
        return "DADES BÀSIQUES PROJECTE";
      } else {
        return "DADES BÀSIQUES PROJECTE";
      }
    },
    transitionName() {
      if (this.useTransition) {
        return "fade";
      }
      return "x";
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
      if (this.form.received_incomes) {
        this.form.received_incomes.forEach((e) => {
          documents.push({
            docType: "received_income",
            docTypeDesc: e.document_type
              ? this.documentTypes.find((t) => t.id === e.document_type)?.name
              : "",
            multiplier: 1,
            document: e,
          });
        });
      }
      if (this.form.received_expenses) {
        this.form.received_expenses.forEach((e) => {
          documents.push({
            docType: "received_expense",
            docTypeDesc: e.document_type
              ? this.documentTypes.find((t) => t.id === e.document_type)?.name
              : "",
            multiplier: -1,
            document: e,
          });
        });
      }
      return sortBy(documents, "document.emitted");
    },
    treasuryDone() {
      const documents = [];
      this.form.phases.forEach((ph) => {
        ph.subphases.forEach((income) => {
          if (income.paid) {
            if (income.invoice) {
              documents.push({
                docType: "emitted_invoices",
                id: income.invoice.id,
                multiplier: 1,
              });
            } else if (income.grant) {
              documents.push({
                docType: "received_grants",
                id: income.grant.id,
                multiplier: 1,
              });
            } else if (income.income) {
              documents.push({
                docType: "received_income",
                id: income.income.id,
                multiplier: 1,
              });
            }
          }
        });
        ph.expenses.forEach((expense) => {
          if (expense.paid) {
            if (expense.invoice) {
              documents.push({
                docType: "received_invoices",
                id: expense.invoice.id,
                multiplier: -1,
              });
            } else if (expense.ticket) {
              documents.push({
                docType: "tickets",
                id: expense.ticket.id,
                multiplier: -1,
              });
            } else if (expense.diet) {
              documents.push({
                docType: "diets",
                id: expense.diet.id,
                multiplier: -1,
              });
            } else if (expense.expense) {
              documents.push({
                docType: "received_expense",
                id: expense.expense.id,
                multiplier: -1,
              });
            }
          }
        });
      });
      return documents;
    },
    treasury() {
      const documents = [];
      this.form.phases.forEach((ph) => {
        ph.subphases.forEach((income) => {
          if (!income.paid || true) {
            documents.push({
              docType: "income",
              document: income,
              multiplier: 1,
            });
          }
        });
        ph.expenses.forEach((expense) => {
          if (!expense.paid || true) {
            documents.push({
              docType: "expense",
              document: expense,
              multiplier: -1,
            });
          }
        });
      });
      if (this.form.treasury_annotations) {
        this.form.treasury_annotations.forEach(t => {
          console.log('t', t)
          documents.push({
              docType: "treasury",
              document: { ...t, total_amount: t.total },
              concept: t.concept,
              multiplier: 1,
            });
        })
      }
      return documents;
      // return sortBy(documents, "document.emitted");
    },
    treasuryIncomesPending() {
      return sumBy(
        this.documents.filter((t) => t.multiplier > 0 && !t.document.paid),
        "document.total_base"
      );
    },
    treasuryExpensesPending() {
      return sumBy(
        this.documents.filter((t) => t.multiplier < 0 && !t.document.paid),
        "document.total_base"
      );
    },
    treasuryIncomesDone() {
      return sumBy(
        this.documents.filter((t) => t.multiplier > 0 && t.document.paid),
        "document.total_base"
      );
    },
    treasuryExpensesDone() {
      return sumBy(
        this.documents.filter((t) => t.multiplier < 0 && t.document.paid),
        "document.total_base"
      );
    },
    treasuryExpensesDone2() {
      return this.documents.filter((t) => t.multiplier < 0 && t.document.paid);
    },
    user() {
      return this.leaders.find(
        (u) => u.username.toLowerCase() === this.userName.toLowerCase()
      );
    },
  },
  watch: {
    id(newValue) {
      this.isProfileExists = false;
      if (!newValue || newValue === 0) {
        this.form = this.getClearFormObject();
        this.getAuxiliarData();
        this.dirty = false;
      } else {
        this.getData();
        this.dirty = false;
      }
    },
    form: {
      handler(newVal, oldVal) {
        this.dirty = oldVal.id == newVal.id ? true : false;
        if (this.dirty) {
          for (var i in newVal) {
            // console.log('--------')
            // console.log(i)
            // console.log('oldVal i', oldVal[i])
            // console.log('newVal i', newVal[i])
            // if (newVal[i] !== oldVal[i]) {
            //   console.log('oldVal i', oldVal[i])
            //   console.log('newVal i', newVal[i])
            // }
          }
          // console.log('oldVal', oldVal)
          // console.log('newVal', newVal)
        }
      },
      deep: true,
    },
  },
  created() {
    this.getData();
  },
  beforeRouteLeave(to, from, next) {
    // called when the route that renders this component is about to be navigated away from.
    // As with `beforeRouteUpdate`, it has access to `this` component instance.
    if (this.dirty) {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols marxar? Hi ha canvis sense guardar",
        onConfirm: () => {
          next();
        },
        onCancel: () => {
          return false;
        },
      });

      // const answer = window.confirm(
      //   "Estàs segura que vols marxar? Hi ha canvis sense guardar"
      // );
      // if (!answer) return false;

      // next()
    } else {
      next();
    }
  },
  methods: {
    getClearFormObject() {
      return {
        id: null,
        name: null,
        project_state: { id: 0 },
        project_scope: { id: 0 },
        region: { id: 0 },
        leader: { id: 0 },
        phases: [],
        original_phases: [],
        expenses: [],
        default_dedication_type: { id: 0 },
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
              this.form.region =
                this.form.region && this.form.region.id
                  ? this.form.region
                  : { id: 0 };

              this.form.phases = this.form.phases.map((p) => {
                return { ...p, edit: false };
              });
              if (this.form.phases.length === 0) {
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

              // legacy, add original_phases dates
              // if (this.form.phases && this.form.original_phases && this.form.phases.length && this.form.phases.length === this.form.original_phases.length) {
              //   this.form.phases.forEach(p => {
              //     p.subphases.forEach(sp => {
              //   })
              // }

              if (this.form.default_dedication_type === null) {
                this.form.default_dedication_type = { id: 0 };
              }

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

              setTimeout(() => {
                this.dirty = false;
              }, 100);
            } else {
              this.$router.push({ name: "project.new" });
            }
          });
      } else {
        this.form.date_start = new Date();
        this.form.date_end = moment().endOf("year").toDate();
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
          if (this.$route.params.id === "0" && !this.form.leader.id) {
            this.form.leader = { id: this.user.id };
          }
        });
      service({ requiresAuth: true })
        .get("contacts?_limit=-1&_sort=name:ASC")
        .then((r) => {
          this.clients = r.data;
        });
      service({ requiresAuth: true })
        .get("strategies?_limit=-1")
        .then((r) => {
          this.strategies = r.data;
        });
      service({ requiresAuth: true })
        .get("document-types")
        .then((r) => {
          this.documentTypes = r.data;
        });
      service({ requiresAuth: true })
        .get("dedication-types")
        .then((r) => {
          this.dedicationTypes = r.data;
        });
      service({ requiresAuth: true })
        .get("regions")
        .then((r) => {
          this.regions = r.data;
        });
      service({ requiresAuth: true })
        .get("activity-types?_limit=-1")
        .then((r) => {
          this.activityTypes = r.data;
          const globalActivityTypes = this.activityTypes.filter(
            (a) => a.global === true
          );
          if (this.$route.params.id === "0") {
            this.form.global_activity_types = globalActivityTypes;
          }
        });

      service({ requiresAuth: true })
        .get("projects/basic?_limit=-1")
        .then((r) => {
          this.projects = r.data;
          if (this.form.mother && this.form.mother.id) {
            const mother = this.projects.find(
              (p) => p.id === this.form.mother.id
            );
            if (mother) {
              this.projectSearch = mother.name;
            }
          }
        });
    },
    // input(v) {
    //   this.createdReadable = dayjs(v).format("MMM D, YYYY");
    // },
    async submitAndExit() {
      this.submit('exit')
    },
    async submitAndContinue() {
      this.submit('continue')
    },
    async submit(action) {
      this.isLoading = true;

      if (!this.form.structural_expenses_pct) {
        this.form.structural_expenses_pct = null;
      }
      //console.log('type default_dedication_type', typeof this.form.default_dedication_type, this.form.default_dedication_type)
      if (
        this.form.default_dedication_type &&
        typeof this.form.default_dedication_type === "object" &&
        !this.form.default_dedication_type.id
      ) {
        this.form.default_dedication_type = null;
      }

      if (this.form.region && this.form.region.id === 0) {
        this.form.region = null;
      }

      try {
        const stateInvalid = this.form.project_state.id === 0;
        const scopeInvalid = this.form.project_scope.id === 0;
        const leaderInvalid = this.form.leader.id === 0;

        if (
          !this.form.name ||
          !this.form.date_start ||
          !this.form.date_end ||
          stateInvalid ||
          scopeInvalid ||
          leaderInvalid
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. Codi, Estat, Àmbit, Coordina, Data Inici i Data Final son dades obligatòries",
            queue: false,
          });
          this.isLoading = false;
          return;
        }

        if (this.form.id) {
          await service({ requiresAuth: true }).put(
            `projects/${this.form.id}`,
            this.form
          );
          this.dirty = false;
          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false,
          });

          if (action === "continue") {
            this.getData();
          } else {
            this.$router.push({
              name: "projectes.view",
            });
          }
        } else {
          const newProject = await service({ requiresAuth: true }).post(
            "projects",
            this.form
          );

          if (action === "continue") {
            this.$router.push({
              name: "project.edit",
              params: { id: newProject.data.id },
            });
          } else {
            this.$router.push({
              name: "projectes.view",
            });
          }

          this.dirty = false;
          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false,
          });

          this.needsUpdate = false;

          setTimeout(() => {
            this.isLoading = false;
          }, 250);
        }
      } catch (err) {
        // console.error("projects error", err);
        const oldProjectData = await service({ requiresAuth: true }).get(
          `projects?name=${this.form.name}`
        );
        if (
          oldProjectData &&
          oldProjectData.data &&
          oldProjectData.data.length
        ) {
          this.$buefy.snackbar.open({
            message: "Error. El projecte ja existeix",
            queue: false,
          });
        } else {
          this.$buefy.snackbar.open({
            message: "Error",
            queue: false,
          });
        }
        this.isLoading = false;
      }
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
    projectSelected(option) {
      if (option && option.id) {
        this.form.mother = option.id;
      } else {
        this.form.mother = null;
      }
    },
    activityTypeSelected(option) {
      this.form.global_activity_types = this.form.global_activity_types || [];
      if (!this.form.global_activity_types.find((c) => c.id === option.id)) {
        this.form.global_activity_types.push(option);
      }
      this.activityTypeSearch = "";
      setTimeout(() => {
        this.activityTypeSearch = "";
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
    updateGantt() {
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
      const uuid = item._uuid;
      const pid = item._phase.id;

      var subphase = item._subphase ? item._subphase : null;
      if (!item._subphase) {
        const phase = this.form.original_phases.find((p) => p.id === pid);
        phase.subphases.push({ concept: "SF", estimated_hours: [] });
        subphase = phase.subphases[0];
      }

      const hours = subphase.estimated_hours.find(
        (h) => (h.id === id && h.id > 0 && !uuid) || (h._uuid === uuid && uuid)
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
        hours.quantity_type = item._hours.quantity_type;
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
          quantity_type: item._hours.quantity_type,
          users_permissions_user: item._hours.users_permissions_user,
          amount: item._hours.amount,
          total_amount: item._hours.total_amount,
          _uuid: item._uuid,
        };
        // console.log('hour to push', hour)
        subphase.estimated_hours.push(hour);
      }
      this.updatingGantt = true;
      if (this.updatingGanttTimer) {
        clearTimeout(this.updatingGanttTimer);
      }
      this.updatingGanttTimer = setTimeout(() => {
        this.updatingGantt = false;
        EventBus.$emit("phases-updated", { phases: this.form.original_phases });
      }, 800);
    },
    ganttItemDelete(item) {
      const id = item._hours.id;
      const pid = item._phase.id;
      const sid = item._subphase.id;
      this.form.original_phases
        .find((p) => p.id === pid)
        .subphases.find((s) => s.id === sid).estimated_hours =
        this.form.original_phases
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
    formatDate(value) {
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
    },
    async addActivity() {
      if (this.activityTypeSearch) {
        const resp = await service({ requiresAuth: true }).post(
          `activity-types`,
          { name: this.activityTypeSearch }
        );
        this.form.global_activity_types.push(resp.data);
        this.activityTypeSearch = "";
      }
    },
    async removeActivity(task) {
      if (this.form.id) {
        console.log("task", task);
        let query = "tasks?_limit=-1&_where[archived_eq]=false";
        query += "&_where[project_eq]=" + this.form.id;
        query += "&_where[activity_type_eq]=" + task.id;
        const tasks = (await service({ requiresAuth: true }).get(query)).data;
        if (tasks.length) {
          this.$buefy.snackbar.open({
            message: "No es pot eliminar perquè hi ha tasques associades",
            queue: false,
          });
          return;
        }
      }
      this.form.global_activity_types = this.form.global_activity_types.filter(
        (t) => t.id !== task.id
      );
    },
    phasesUpdated(info) {
      console.log("phasesUpdated info", info, this.form.phases);
      this.form.phases = info.phases;
    },
    originalPhasesUpdated(info) {
      console.log("originalPhasesUpdated info", info);
      this.form.original_phases = info.phases;
    },
    closeQuote() {
      this.phasesVisible = false;
      this.form.original_phases = JSON.parse(JSON.stringify(this.form.phases));
      this.form.original_phases.forEach((p) => {
        delete p.id;
        p.subphases.forEach((sp) => {
          sp.date = moment(sp.date).format("YYYY-MM-DD");
          delete sp.id;
        });
        p.expenses.forEach((sp) => {
          sp.date = moment(sp.date).format("YYYY-MM-DD");
          delete sp.id;
        });
      });
      this.phasesVisible = true;
    },
    closeQuoteFromOriginal() {
      this.phasesVisible = false;
      const phases = JSON.parse(JSON.stringify(this.form.original_phases));
      phases.forEach((p) => {
        p.edit = false;
        p.opened = true;
        delete p.id;
        p.subphases.forEach((sp) => {
          sp.date = moment(sp.date).format("YYYY-MM-DD");
          delete sp.id;
        });
        p.expenses.forEach((sp) => {
          sp.date = moment(sp.date).format("YYYY-MM-DD");
          delete sp.id;
        });
      });
      this.form.phases = phases;
      setTimeout(() => {
        this.phasesVisible = true;
      }, 200);
    },
    toogleTasksView() {
      this.tasksView = this.tasksView === "list" ? "state" : "list";
    },
    changeValue(field, value) {
      if (value && value.toString().includes(",")) {
        this.form[field] = value.toString().replace(",", ".");
      }
    },
  },
};
</script>
<style>
</style>
