<template>
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
              <b-field label="Tipus" horizontal>
                <b-select v-model="form.project_type.id" placeholder="Tipus">
                  <option
                    v-for="(s, index) in project_types"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
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
              <hr />
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
              <hr />
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
                label="Projecte d'estructura"
                horizontal
                message="Si és un projecte estructural de l'organització"
              >
                <b-switch v-model="form.structural_expenses"> </b-switch>
              </b-field>

              <!-- <b-field
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
              </b-field> -->

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

              <b-field v-if="form.children" label="Projectes fills" horizontal>
                <div>
                  <div v-for="child in form.children.children" :key="child.id">
                    <router-link
                      :to="{ name: 'project.edit', params: { id: child.id } }"
                    >
                      <span class="project-name has-text-info">
                        {{ child.name }}
                      </span>
                    </router-link>
                  </div>
                </div>
              </b-field>

              <b-field
                label="Periodificació d'ingressos i despeses"
                horizontal
                message="Si es volen periodificar manualment ingressos i despeses entre anys"
              >
                <b-switch v-model="periodification"> </b-switch>
              </b-field>
              <hr />
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
              <b-field
                label="Subvencions"
                horizontal
                message="Que s'acull a subvencions que caldrà justificar"
              >
                <b-switch v-model="form.grantable"> </b-switch>
              </b-field>

              <b-field
                label="Número d'expedient"
                horizontal
                v-if="form.grantable"
              >
                <b-input
                  v-model="form.grantable_reference"
                  placeholder="Número d'expedient de la subvenció"
                ></b-input>
              </b-field>

              <b-field
                label="Import a justificar total"
                v-if="form.grantable"
                horizontal
              >
                <b-input
                  v-if="form.grantable"
                  type="numeric"
                  v-model="form.grantable_amount_total"
                  placeholder="Import a justificar total"
                  @input="
                    changeValue(
                      'grantable_amount_total',
                      form.grantable_amount_total
                    )
                  "
                >
                </b-input>
              </b-field>

              <b-field
                label="Import a justificar amb nòmines"
                v-if="form.grantable"
                horizontal
              >
                <b-input
                  v-if="form.grantable"
                  type="numeric"
                  v-model="form.grantable_amount"
                  placeholder="Import a justificar amb nòmines"
                  @input="
                    changeValue('grantable_amount', form.grantable_amount)
                  "
                >
                </b-input>
              </b-field>
              <b-field
                label="Import a justificar amb factures indirectes"
                v-if="form.grantable"
                horizontal
              >
                <b-input
                  v-if="form.grantable"
                  type="numeric"
                  v-model="form.grantable_structural_expenses_justify_invoices"
                  placeholder="Import a justificar amb factures indirectes"
                  @input="
                    changeValue(
                      'grantable_structural_expenses_justify_invoices',
                      form.grantable_structural_expenses_justify_invoices
                    )
                  "
                >
                </b-input>
              </b-field>

              <b-field
                label="Despeses indirectes no justificables"
                v-if="form.grantable"
                horizontal
                message="Quantitat de l'import de la subvenció per a cobrir despeses indirectes que no s'han de justificar documentalment (sense assignació de nòmines ni factures)"
              >
                <b-input
                  v-if="form.grantable"
                  type="numeric"
                  v-model="form.grantable_structural_expenses"
                  placeholder="Import de despeses indirectes"
                  @input="
                    changeValue(
                      'grantable_structural_expenses',
                      form.grantable_structural_expenses
                    )
                  "
                >
                </b-input>
              </b-field>

              <hr />
              <b-field
                label="Import cofinançament"
                v-if="form.grantable"
                horizontal
              >
                <b-input
                  v-if="form.grantable"
                  type="numeric"
                  v-model="form.grantable_cofinancing"
                  placeholder="Import de cofinançament"
                  @input="
                    changeValue(
                      'grantable_cofinancing',
                      form.grantable_cofinancing
                    )
                  "
                >
                </b-input>
              </b-field>

              <!-- <b-field
                label="Import despeses indirectes"
                v-if="form.grantable"
                horizontal
                message="Que no s'han d'acreditar amb factures"
              >
                <b-input
                  v-if="form.grantable"
                  type="numeric"
                  v-model="form.grantable_estructural_pct"
                  placeholder="% despeses d'estructura"
                  @input="
                    changeValue(
                      'grantable_estructural_pct',
                      form.grantable_estructural_pct
                    )
                  "
                >
                </b-input>
              </b-field> -->
              <b-field
                label="Data sol·licitud"
                v-if="form.grantable"
                horizontal
              >
                <b-datepicker
                  v-model="form.grantable_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data sol·licitud"
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field>

              <b-field
                label="Data justificació"
                v-if="form.grantable"
                horizontal
              >
                <b-datepicker
                  v-model="form.justification_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data justificació"
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field>

              <b-field
                label="Necessita agrupada"
                v-if="form.grantable"
                horizontal
              >
                <b-checkbox
                  v-model="form.grantable_intercooperation"
                  class="checkbox-inline"
                >
                </b-checkbox>
              </b-field>

              <b-field
                v-if="form.grantable && form.grantable_intercooperation"
                label="Entitat líder"
                horizontal
              >
                <b-autocomplete
                  v-model="leadersSearch"
                  placeholder="Escriu el nom del contacte..."
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredLeaders"
                  field="name"
                  @select="leaderSelected"
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
                label="Imports"
                v-if="form.grantable && form.grantable_intercooperation"
                horizontal
              >
                <div class="d-flex">
                  <ProjectGrantableContacts
                    :grantables="form.grantable_contacts"
                    :contacts="clients"
                    @updated="updateGrantableContacts"
                    v-if="form.grantable"
                  >
                  </ProjectGrantableContacts>
                </div>
              </b-field>

              <hr />
              <b-field horizontal label="Documents">
                <div class="help">
                  Per exemple, afegir pressupost total del projecte (sense IVA)
                  o afegir document de concessió o contracte
                </div>
              </b-field>
              <b-field label=" ">
                <div
                  class="file-documents zcolumns is-multiline"
                  v-if="form.documents && form.documents.length"
                >
                  <div
                    v-for="(doc, i) in form.documents"
                    :key="i"
                    class="zcolumn"
                    :class="
                      form.documents.length > 6
                        ? 'is-2'
                        : form.documents.length > 3
                        ? 'is-3'
                        : 'is-4'
                    "
                  >
                    <div class="column-doc">
                      <div @click="removeImage(doc)" class="remove-button">
                        <b-icon icon="close" size="is-small" />
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
                entity="project"
                :ref-id="form.id"
                :field="'documents'"
                :accept="'*/*'"
                @uploaded="uploaded"
                v-if="form.id"
              >
              </file-upload>
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
                    v-if="form.id"
                    type="is-primary"
                    :loading="isLoading && form.id"
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
            <div class="panel-warning mb-4" v-if="form.dirty || hasBeenDirty">
              <b-icon
                v-if="form.dirty"
                icon="alert-circle mr-2"
                class="warning-tag"
                size="is-small"
                title=""
              />
              <span v-if="form.dirty"
                >Els totals del projecte s'estan actualitzant en un procés
                extern. Pot ser que temporalment no siguin correctes. Torna a
                carregar el projecte en una estona</span
              >
              <span v-if="!form.dirty && hasBeenDirty"
                >Recarrega el projecte per veure els totals correctes</span
              >
              <button
                class="button is-warning ml-2"
                @click.prevent="refresh"
                v-if="!form.dirty && hasBeenDirty"
              >
                <b-icon
                  v-if="!form.dirty && hasBeenDirty"
                  icon="refresh"
                  class="warning-tag clickable"
                  size="is-small"
                  title=""
                />
              </button>
            </div>

            <div class="columns">
              <b-field label="Resultat previst" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="totals.incomes_expenses"
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
                    :value="totals.total_real_incomes_expenses"
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
                      -1 *
                        (totals.incomes_expenses -
                          totals.total_real_incomes_expenses)
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
                    :value="totals.total_incomes"
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
                    :value="totals.total_real_incomes"
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
                      -1 * (totals.total_incomes - totals.total_real_incomes)
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

            <div class="columns" v-if="totals">
              <b-field label="Despeses pr. totals" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="
                      totals.total_expenses +
                        totals.total_estimated_hours_price +
                        totals.total_expenses_vat
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
                      totals.total_real_expenses +
                        totals.total_real_hours_price +
                        totals.total_real_expenses_vat
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
                      -1 *
                        (totals.total_expenses +
                          totals.total_estimated_hours_price +
                          totals.total_expenses_vat -
                          totals.total_real_expenses -
                          totals.total_real_hours_price -
                          totals.total_real_expenses_vat)
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
                    :value="totals.total_expenses"
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
                    :value="totals.total_real_expenses"
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
                      -1 * (totals.total_expenses - totals.total_real_expenses)
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

            <div
              class="columns"
              v-if="
                me &&
                  me.options &&
                  me.options.deductible_vat_pct &&
                  me.options.deductible_vat_pct < 100.0
              "
            >
              <b-field label="Despeses pr. prorrata" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="totals.total_expenses_vat"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </b-field>
              <b-field label="Despeses ex. prorrata" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="totals.total_real_expenses_vat"
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
                      -1 *
                        (totals.total_expenses_vat -
                          totals.total_real_expenses_vat)
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

            <div class="columns" v-if="totals">
              <b-field label="Hores previstes" class="column">
                <div class="readonly subphase-detail-input">
                  <money-format
                    :value="totals.total_estimated_hours_price"
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
                    :value="totals.total_real_hours_price"
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
                      -1 *
                        (totals.total_estimated_hours_price -
                          form.total_real_hours_price)
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
                  {{
                    totals && totals.total_estimated_hours
                      ? totals.total_estimated_hours.toFixed(2)
                      : "0"
                  }}
                  h
                </div>
              </b-field>
              <b-field label="Hores executades (h)" class="column">
                <div class="readonly subphase-detail-input has-text-right">
                  {{
                    totals && totals.total_real_hours
                      ? totals.total_real_hours.toFixed(2)
                      : "0"
                  }}
                  h
                </div>
              </b-field>
              <b-field label="Diferència (h)" class="column">
                <div class="readonly subphase-detail-input has-text-right">
                  {{
                    -1 *
                      (
                        totals.total_estimated_hours - totals.total_real_hours
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
                      totals.total_estimated_hours
                        ? totals.total_estimated_hours_price /
                          totals.total_estimated_hours
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
                      totals.total_real_hours
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
                      -1 *
                        (totals.total_estimated_hours
                          ? totals.total_estimated_hours_price /
                            totals.total_estimated_hours
                          : 0) -
                        -1 *
                          (totals.total_real_hours
                            ? totals.total_real_hours_price /
                              totals.total_real_hours
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
                      totals.total_estimated_hours
                        ? (totals.total_incomes - totals.total_expenses) /
                          totals.total_estimated_hours
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
                        ? (totals.total_real_incomes -
                            totals.total_real_expenses) /
                          totals.total_real_hours
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
                      -1 *
                        (totals.total_estimated_hours
                          ? (totals.total_incomes - totals.total_expenses) /
                            totals.total_estimated_hours
                          : 0) -
                        -1 *
                          (totals.total_real_hours
                            ? (totals.total_real_incomes -
                                totals.total_real_expenses) /
                              totals.total_real_hours
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
            <hr />
            <div class="is-flex">
              <div
                class="year-total tag mr-1 clickable"
                :class="allByYearYear == 'TOTS' ? 'is-primary' : 'is-ghost'"
                @click="allByYearYear = 'TOTS'"
              >
                TOTAL
              </div>
              <div
                v-for="y in allByYear.filter(a => a.year !== 'undefined')"
                class="year-total tag is-ghost mr-1 clickable"
                :class="allByYearYear == y.year ? 'is-primary' : 'is-ghost'"
                @click="allByYearYear = y.year"
              >
                {{ y.year }}
              </div>
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
                    :value="
                      -1 * (treasuryExpensesPending - treasuryExpensesDone)
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
                    :value="-1 * (treasuryIncomesPending - treasuryIncomesDone)"
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
          !isLoading && phasesVisible && form && form.project_original_phases
        "
        title="GESTIÓ ECONÒMICA - FASES I PRESSUPOST ORIGINAL"
        :closeIcon="true"
        :content-visible="true"
      >
        <b-field>
          <b-button
            type="is-warning"
            :loading="isLoading"
            @click="originalEditable = !originalEditable"
            class="mr-2"
          >
            <template v-if="!originalEditable">Modificar pressupost</template>
            <template v-else>Tancar pressupost</template>
          </b-button>
          <!-- 
          <b-select v-model="perPage" :disabled="!isPaginated" class="mr-2">
            <option value="10">10 per pàgina</option>            
            <option value="50">50 per pàgina</option>
            <option value="100">100 per pàgina</option>
            <option value="1000">1000 per pàgina</option>
          </b-select>

          <div class="control is-flex">
            <b-switch v-model="isPaginated">Paginat</b-switch>
          </div> -->
        </b-field>

        <project-phases
          :form="form"
          :project-phases="form.project_original_phases"
          @phases-updated="originalPhasesUpdated"
          @phases-copy="originalPhasesCopy"
          mode="simple"
          :editable="originalEditable"
          :per-page="parseInt(perPage)"
          :is-paginated="isPaginated"
        />

        <hr
          v-if="
            form.project_original_phases.length &&
              (!form.project_phases || form.project_phases.length === 0)
          "
        />
        <b-field
          v-if="
            form.project_original_phases.length &&
              form.project_phases.length === 0
          "
        >
          <b-button type="is-warning" @click="closeQuoteFromOriginal">
            Crear Execució de Pressupost
          </b-button>
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
              v-if="form.id"
              type="is-primary"
              :loading="isLoading && form.id"
              @click="submitAndExit"
              >Guardar i sortir</b-button
            >
          </b-field>
        </div>
      </card-component>

      <card-component
        v-if="
          !isLoading &&
            phasesVisible &&
            form &&
            form.project_phases &&
            form.project_phases.length &&
            !form.children
        "
        :title="'GESTIÓ ECONÒMICA - EXECUCIÓ PRESSUPOST'"
        :closeIcon="true"
        :content-visible="true"
      >
        <b-field>
          <b-button
            type="is-warning"
            :loading="isLoading"
            @click="phasesEditable = !phasesEditable"
            class="mr-2"
          >
            <template v-if="!phasesEditable">Modificar pressupost</template>
            <template v-else>Tancar pressupost</template>
          </b-button>

          <!-- <b-select v-model="perPage" :disabled="!isPaginated" class="mr-2">
            <option value="10">10 per pàgina</option>            
            <option value="50">50 per pàgina</option>
            <option value="100">100 per pàgina</option>
            <option value="1000">1000 per pàgina</option>
          </b-select>

          <div class="control is-flex">
            <b-switch v-model="isPaginated">Paginat</b-switch>
          </div> -->
        </b-field>

        <project-phases
          :form="form"
          :project-phases="form.project_phases"
          @phases-updated="phasesUpdated"
          :editable="phasesEditable"
          :per-page="parseInt(perPage)"
          :is-paginated="isPaginated"
        />
        <hr
          v-if="
            form.project_phases.length &&
              (!form.project_original_phases ||
                form.project_original_phases.length === 0)
          "
        />
        <b-field
          v-if="
            form.project_phases.length &&
              form.project_original_phases.length === 0
          "
        >
          <b-button type="is-warning" @click="closeQuote">
            Tancar Pressupost 3
          </b-button>
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
              v-if="form.id"
              type="is-primary"
              :loading="isLoading && form.id"
              @click="submitAndExit"
              >Guardar i sortir</b-button
            >
          </b-field>
        </div>
      </card-component>
      <!-- <pre>{{documents}}</pre> -->

      <card-component
        v-if="!isLoading && periodification && form.periodification.length"
        title="PERIODIFICACIÓ D'INGRESSOS I DESPESES"
      >
        <div
          v-for="(y, i) in form.periodification.filter(
            (p, i) => i < form.periodification.length - 1
          )"
          class="year-total-periodic mb-2 is-flex"
        >
          <div class="year-label">
            <label class="label" v-if="i === 0">Any</label>
            <div class="year mr-4 pt-2">
              {{ y.year }}
            </div>
          </div>
          <div>
            <b-field
              :label="i === 0 ? '+Ingressos previstos' : null"
              class="mr-4"
            >
              <b-input
                :disabled="i === form.periodification.length - 1"
                v-model="y.incomes"
                @input="changeLine(y, 'incomes', y.incomes)"
              />
            </b-field>
          </div>
          <div>
            <b-field
              :label="i === 0 ? '+Despeses previstes' : null"
              class="mr-4"
            >
              <b-input
                :disabled="i === form.periodification.length - 1"
                v-model="y.expenses"
                @input="changeLine(y, 'expenses', y.expenses)"
              />
            </b-field>
          </div>
          <div>
            <b-field
              :label="i === 0 ? '+Ingressos executats' : null"
              class="mr-4"
            >
              <b-input
                :disabled="i === form.periodification.length - 1"
                v-model="y.real_incomes"
                @input="changeLine(y, 'real_incomes', y.real_incomes)"
              />
            </b-field>
          </div>
          <div>
            <b-field :label="i === 0 ? '+Despeses executades' : null">
              <b-input
                :disabled="i === form.periodification.length - 1"
                v-model="y.real_expenses"
                @input="changeLine(y, 'real_expenses', y.real_expenses)"
              />
            </b-field>
          </div>
        </div>
        <div
          v-for="(y, i) in form.periodification.filter(
            (p, i) => i == form.periodification.length - 1
          )"
          class="year-total-periodic mb-2 is-flex"
        >
          <div class="year-label">
            <div class="year mr-4 pt-2">
              {{ y.year }}
            </div>
          </div>
          <div>
            <b-field class="mr-4">
              <b-input
                :disabled="true"
                v-model="y.incomes"
                @input="changeLine(y, 'incomes', y.incomes)"
              />
            </b-field>
          </div>
          <div>
            <b-field class="mr-4">
              <b-input
                :disabled="true"
                v-model="y.expenses"
                @input="changeLine(y, 'expenses', y.expenses)"
              />
            </b-field>
          </div>
          <div>
            <b-field class="mr-4">
              <b-input
                :disabled="true"
                v-model="y.real_incomes"
                @input="changeLine(y, 'real_incomes', y.real_incomes)"
              />
            </b-field>
          </div>
          <div>
            <b-field>
              <b-input
                :disabled="true"
                v-model="y.real_expenses"
                @input="changeLine(y, 'real_expenses', y.real_expenses)"
              />
            </b-field>
          </div>
        </div>
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
              v-if="form.id"
              type="is-primary"
              :loading="isLoading && form.id"
              @click="submitAndExit"
              >Guardar i sortir</b-button
            >
          </b-field>
        </div>
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
                  t =>
                    t.docType === props.row.docType &&
                    t.id === props.row.document.id
                )
                  ? 'has-text-primary'
                  : 'has-text-danger'
              "
            >
              {{
                treasuryDone.find(
                  t =>
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

      <card-component
        v-if="!isLoading && !isUpdating && !form.children"
        title="PLANIFICACIÓ"
      >
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
              form.project_original_phases &&
              form.project_original_phases.length &&
              form.project_original_phases[0].id
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
              v-if="form.id"
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
        <b-field>
          <b-select v-model="perPage" :disabled="!isPaginated" class="mr-2">
            <option value="10">10 per pàgina</option>
            <option value="50">50 per pàgina</option>
            <option value="100">100 per pàgina</option>
            <option value="1000">1000 per pàgina</option>
          </b-select>

          <div class="control is-flex">
            <b-switch v-model="isPaginated">Paginat</b-switch>
          </div>
        </b-field>

        <b-table
          :data="treasury"
          :per-page="parseInt(perPage)"
          :paginated="isPaginated"
          pagination-position="both"
        >
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
              >{{ formatDate(props.row.document.invoice.emitted) }}</span
            >
            <span
              v-else-if="
                props.row.document &&
                  props.row.document.expense &&
                  props.row.document.expense.emitted
              "
              >{{ formatDate(props.row.document.expense.emitted) }}</span
            >
            <span
              v-else-if="
                props.row.document &&
                  props.row.document.income &&
                  props.row.document.income.emitted
              "
              >{{ formatDate(props.row.document.income.emitted) }}</span
            >
          </b-table-column>
          <b-table-column
            label="Tipus"
            field="docTypeDesc"
            sortable
            v-slot="props"
          >
            <span
              v-if="
                props.row.docType === 'income' &&
                  props.row.document &&
                  props.row.document.paid
              "
            >
              Cobrament
            </span>
            <span v-else-if="props.row.docType === 'income'">
              Cobrament esperat
            </span>
            <span
              v-else-if="
                props.row.docType === 'expense' &&
                  props.row.document &&
                  props.row.document.paid
              "
            >
              Pagament
            </span>
            <span v-else-if="props.row.docType === 'expense'">
              Pagament esperat
            </span>
            <span v-else-if="props.row.docType === 'treasury'">
              Operació de tresoreria
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
            <span v-if="props.row.document.concept">{{
              props.row.document.concept
            }}</span>
            <span v-if="props.row.document.comment">{{
              props.row.document.comment
            }}</span>
          </b-table-column>
          <b-table-column label="Document" v-slot="props">
            <router-link
              v-if="props.row.docType === 'income' && props.row.document.income"
              :to="{
                name: 'document.edit',
                params: {
                  id: props.row.document.income.id,
                  type: 'received-incomes'
                }
              }"
            >
              {{ props.row.document.income.code }}
            </router-link>
            <router-link
              v-if="
                props.row.docType === 'income' && props.row.document.invoice
              "
              :to="{
                name: 'document.edit',
                params: {
                  id: props.row.document.invoice.id,
                  type: 'emitted-invoices'
                }
              }"
            >
              {{ props.row.document.invoice.code }}
            </router-link>

            <router-link
              v-if="
                props.row.docType === 'expense' && props.row.document.expense
              "
              :to="{
                name: 'document.edit',
                params: {
                  id: props.row.document.expense.id,
                  type: 'received-expenses'
                }
              }"
            >
              {{ props.row.document.expense.code }}
            </router-link>

            <router-link
              v-if="
                props.row.docType === 'expense' && props.row.document.invoice
              "
              :to="{
                name: 'document.edit',
                params: {
                  id: props.row.document.invoice.id,
                  type: 'received-invoices'
                }
              }"
            >
              {{ props.row.document.invoice.code }}
            </router-link>
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
        </b-table>
      </card-component>

      <card-component
        v-if="!isLoading && !form.children"
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
// External libraries
import sumBy from "lodash/sumBy";
import sortBy from "lodash/sortBy";
import { mapState } from "vuex";
import moment from "moment";

// Project components
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import ModalBoxInvoicing from "@/components/ModalBoxInvoicing";
import ModalBoxSplit from "@/components/ModalBoxSplit";
import ProjectGannt from "@/components/ProjectGannt.vue";
import ProjectPhases from "@/components/ProjectPhases.vue";
import ProjectGrantableContacts from "@/components/ProjectGrantableContacts.vue";
import MoneyFormat from "@/components/MoneyFormat.vue";
import Tasks from "@/components/Tasks";
import FileUpload from "@/components/FileUpload";
import getConfig from "@/config";

// Services
import service from "@/service/index";

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
    ProjectGrantableContacts,
    Tasks,
    FileUpload
  },
  props: {
    id: {
      type: [String, Number],
      default: null
    }
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
      project_types: [],
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
      leadersSearch: "",
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
      apiUrl: process.env.VUE_APP_API_URL,
      hasBeenDirty: false,
      allByYear: [],
      allByYearYear: "TOTS",
      periodification: false,
      dirtyEnabled: true,
      originalEditable: false,
      phasesEditable: false,
      grantable_contacts: [],
      perPage: 10,
      isPaginated: false,
      deletedPhases: [],
      deletedIncomes: [],
      deletedExpenses: [],
      deletedPhasesOriginal: [],
      deletedIncomesOriginal: [],
      deletedExpensesOriginal: [],
      deletedHoursOriginal: []
    };
  },
  computed: {
    ...mapState(["me"]),
    ...mapState(["userName"]),
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
    filteredLeaders() {
      return this.clients.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.leadersSearch.toLowerCase()) >= 0
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
    filteredActivityTypes() {
      return this.activityTypes.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.activityTypeSearch.toLowerCase()) >= 0
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
        this.form.emitted_invoices.forEach(e => {
          documents.push({
            docType: "emitted_invoices",
            docTypeDesc: "Factura emesa",
            multiplier: 1,
            document: e
          });
        });
      }
      if (this.form.received_grants) {
        this.form.received_grants.forEach(e => {
          documents.push({
            docType: "received_grants",
            docTypeDesc: "Subvenció rebuda",
            multiplier: 1,
            document: e
          });
        });
      }
      if (this.form.received_invoices) {
        this.form.received_invoices.forEach(e => {
          documents.push({
            docType: "received_invoices",
            docTypeDesc: "Factura rebuda",
            multiplier: -1,
            document: e
          });
        });
      }
      if (this.form.tickets) {
        this.form.tickets.forEach(e => {
          documents.push({
            docType: "tickets",
            docTypeDesc: "Ticket",
            multiplier: -1,
            document: e
          });
        });
      }
      if (this.form.diets) {
        this.form.diets.forEach(e => {
          documents.push({
            docType: "diets",
            docTypeDesc: "Dieta",
            multiplier: -1,
            document: e
          });
        });
      }
      if (this.form.received_incomes) {
        this.form.received_incomes.forEach(e => {
          documents.push({
            docType: "received_income",
            docTypeDesc:
              e.document_type &&
              this.documentTypes.find(t => t.id === e.document_type)
                ? this.documentTypes.find(t => t.id === e.document_type).name
                : "",
            multiplier: 1,
            document: e
          });
        });
      }
      if (this.form.received_expenses) {
        this.form.received_expenses.forEach(e => {
          documents.push({
            docType: "received_expense",
            docTypeDesc:
              e.document_type &&
              this.documentTypes.find(t => t.id === e.document_type)
                ? this.documentTypes.find(t => t.id === e.document_type).name
                : "",
            multiplier: -1,
            document: e
          });
        });
      }
      return sortBy(documents, "document.emitted");
    },
    treasuryDone() {
      const documents = [];
      const project_phases = this.form.project_phases || [];
      project_phases.forEach(ph => {
        ph.incomes.forEach(income => {
          if (income.paid) {
            if (income.invoice) {
              documents.push({
                docType: "emitted_invoices",
                id: income.invoice.id,
                multiplier: 1
              });
            } else if (income.grant) {
              documents.push({
                docType: "received_grants",
                id: income.grant.id,
                multiplier: 1
              });
            } else if (income.income) {
              documents.push({
                docType: "received_income",
                id: income.income.id,
                multiplier: 1
              });
            }
          }
        });
        ph.expenses.forEach(expense => {
          if (expense.paid) {
            if (expense.invoice) {
              documents.push({
                docType: "received_invoices",
                id: expense.invoice.id,
                multiplier: -1
              });
            } else if (expense.ticket) {
              documents.push({
                docType: "tickets",
                id: expense.ticket.id,
                multiplier: -1
              });
            } else if (expense.diet) {
              documents.push({
                docType: "diets",
                id: expense.diet.id,
                multiplier: -1
              });
            } else if (expense.expense) {
              documents.push({
                docType: "received_expense",
                id: expense.expense.id,
                multiplier: -1
              });
            }
          }
        });
      });
      return documents;
    },
    treasury() {
      const documents = [];
      const project_phases = this.form.project_phases || [];
      project_phases.forEach(ph => {
        const incomes = ph.incomes || [];
        incomes.forEach(income => {
          if (!income.paid || true) {
            documents.push({
              docType: "income",
              document: income,
              multiplier: 1
            });
          }
        });
        const expenses = ph.expenses || [];
        expenses.forEach(expense => {
          if (!expense.paid || true) {
            documents.push({
              docType: "expense",
              document: expense,
              multiplier: -1
            });
          }
        });
      });
      if (this.form.treasury_annotations) {
        this.form.treasury_annotations.forEach(t => {
          documents.push({
            docType: "treasury",
            document: { ...t, total_amount: t.total },
            concept: t.concept,
            multiplier: 1
          });
        });
      }
      return documents;
      // return sortBy(documents, "document.emitted");
    },
    treasuryIncomesPending() {
      return sumBy(
        this.treasury.filter(t => t.multiplier > 0 && t.document.paid !== true),
        "document.total_amount"
      );
    },
    treasuryExpensesPending() {
      return sumBy(
        this.treasury.filter(t => t.multiplier < 0 && t.document.paid !== true),
        "document.total_amount"
      );
    },
    treasuryIncomesDone() {
      return sumBy(
        this.treasury.filter(t => t.multiplier > 0 && t.document.paid),
        "document.total_amount"
      );
    },
    treasuryExpensesDone() {
      return sumBy(
        this.treasury.filter(t => t.multiplier < 0 && t.document.paid),
        "document.total_amount"
      );
    },
    user() {
      return this.leaders.find(
        u => u.username.toLowerCase() === this.userName.toLowerCase()
      );
    },
    totals() {
      return this.allByYearYear === "TOTS"
        ? this.form
        : this.allByYear.find(a => a.year === this.allByYearYear);
    }
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
        // console.log("handler, ", newVal, oldVal);
        if (!this.dirtyEnabled) {
          return;
        }
        this.dirty = oldVal.id == newVal.id ? true : false;
        if (this.dirty) {
          for (var i in newVal) {
          }
        }
      },
      deep: true
    }
  },
  created() {
    const config = getConfig();
    this.apiUrl = config.VUE_APP_API_URL;
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
        }
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
        project_type: { id: 0 }
      };
    },
    getData() {
      if (!this.me) {
        service({ requiresAuth: true, cached: true })
          .get("me")
          .then(r => {
            this.me = r.data;
            this.$store.commit("me", {
              me: r.data
            });
          });
      }
      if (this.$route.params.id && this.$route.params.id > 0) {
        this.isLoading = true;
        service({ requiresAuth: true })
          .get("projects/" + this.$route.params.id)
          .then(async r => {
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

              this.form.project_type =
                this.form.project_type && this.form.project_type.id
                  ? this.form.project_type
                  : { id: 0 };

              this.form.region =
                this.form.region && this.form.region.id
                  ? this.form.region
                  : { id: 0 };

              const phases = (
                await service({ requiresAuth: true }).get(
                  `project-phases?project=${this.$route.params.id}&_limit=-1`
                )
              ).data;

              this.form.project_phases = phases;

              // const original_phases = (
              //   await service({ requiresAuth: true }).get(
              //     `project-original-phases?project=${this.$route.params.id}&_limit=-1`
              //   )
              // ).data;

              // console.log("original_phases", phases);

              const phases_and_estimated_hours = (
                await service({ requiresAuth: true }).get(
                  `project-original-phases-hours?project=${this.$route.params.id}&_limit=-1`
                )
              ).data;

              this.form.project_original_phases = phases_and_estimated_hours;

              if (
                this.form.mother &&
                this.form.mother.id &&
                this.form.mother.id === r.data.id
              ) {
                const childrenData = (
                  await service({ requiresAuth: true }).get(
                    `projects/${this.$route.params.id}/children`
                  )
                ).data;
                this.form.incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.total_real_incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.total_incomes = childrenData.totals.total_incomes;
                this.form.total_real_incomes =
                  childrenData.totals.total_real_incomes;
                this.form.total_expenses = childrenData.totals.total_expenses;
                this.form.total_estimated_hours_price =
                  childrenData.totals.total_estimated_hours_price;
                this.form.total_real_expenses =
                  childrenData.totals.total_real_expenses;
                this.form.total_real_hours_price =
                  childrenData.totals.total_real_hours_price;
                this.form.total_estimated_hours =
                  childrenData.totals.total_estimated_hours;
                this.form.total_real_hours =
                  childrenData.totals.total_real_hours;
                this.form.total_real_incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.total_real_incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.total_real_incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.total_real_incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.total_real_incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.total_real_incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.emitted_invoices =
                  childrenData.totals.emitted_invoices;
                this.form.received_grants = childrenData.totals.received_grants;
                this.form.received_invoices =
                  childrenData.totals.received_invoices;
                this.form.tickets = childrenData.totals.tickets;
                this.form.diets = childrenData.totals.diets;
                this.form.received_incomes =
                  childrenData.totals.received_incomes;
                this.form.received_expenses =
                  childrenData.totals.received_expenses;

                this.form.children = childrenData;
              }

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
              if (this.form.grantable_date) {
                this.form.grantable_date = moment(
                  this.form.grantable_date,
                  "YYYY-MM-DD"
                ).toDate();
              }
              if (this.form.justification_date) {
                this.form.justification_date = moment(
                  this.form.justification_date,
                  "YYYY-MM-DD"
                ).toDate();
              }

              if (
                this.form.periodification &&
                this.form.periodification.length
              ) {
                this.periodification = true;
                this.updatePeriodification();
              }

              this.grantable_contacts = this.form.grantable_contacts || [];

              this.getAuxiliarData();

              this.isLoading = false;

              setTimeout(() => {
                this.dirty = false;
                console.log("set dirty false");
              }, 100);
            } else {
              this.$router.push({ name: "project.new" });
            }
          });
      } else {
        this.project_scopes = this.project_scopes.filter(s => !s.disabled)
        this.form.date_start = new Date();
        this.form.date_end = moment()
          .endOf("year")
          .toDate();
        this.getAuxiliarData();
      }
    },
    async getAuxiliarData() {
      service({ requiresAuth: true, cached: true })
        .get("project-states")
        .then(r => {
          this.project_states = r.data;
        });
      service({ requiresAuth: true, cached: true })
        .get("project-scopes?_limit=-1")
        .then(r => {
          this.project_scopes = r.data;
          if (this.form.project_scope && this.form.project_scope.disabled !== true) {
            this.project_scopes = this.project_scopes.filter(
              s => !s.disabled
            );
          }
        });
      service({ requiresAuth: true, cached: true })
        .get("project-types?_limit=-1")
        .then(r => {
          this.project_types = r.data;
        });

      service({ requiresAuth: true, cached: true })
        .get("contacts/basic?_limit=-1&_sort=name:ASC")
        .then(r => {
          this.clients = r.data;

          if (this.form.grantable_leader) {
            const leaderId = this.form.grantable_leader.id
              ? this.form.grantable_leader.id
              : this.form.grantable_leader;

            const leader = this.clients.find(c => c.id === leaderId);
            if (leader) {
              this.leadersSearch = leader.name;
            } else {
              this.leadersSearch = "";
            }
            this.clients.find(c => c.id === leaderId);
            this.form.grantable_leader = leaderId;
          } else {
            this.leadersSearch = "";
          }
        });
      service({ requiresAuth: true, cached: true })
        .get("strategies?_limit=-1")
        .then(r => {
          this.strategies = r.data;
        });
      service({ requiresAuth: true, cached: true })
        .get("document-types?_limit=-1")
        .then(r => {
          this.documentTypes = r.data;
        });
      service({ requiresAuth: true, cached: true })
        .get("dedication-types?_limit=-1")
        .then(r => {
          this.dedicationTypes = r.data;
        });
      service({ requiresAuth: true, cached: true })
        .get("regions?_limit=-1")
        .then(r => {
          this.regions = r.data;
        });

      service({ requiresAuth: true })
        .get("projects/basic?_limit=-1")
        .then(r => {
          this.projects = r.data;
          if (this.form.mother && this.form.mother.id) {
            console.log("this.form.mother.id", this.form.mother.id);
            const mother = this.projects.find(
              p => p.id === this.form.mother.id
            );
            if (mother) {
              this.projectSearch = mother.name;
            }
          }
        });

      this.dirtyEnabled = false;

      this.leaders = (
        await service({ requiresAuth: true, cached: true }).get(
          "users?_limit=-1"
        )
      ).data.filter(u => u.hidden !== true);

      this.project_types = (
        await service({ requiresAuth: true, cached: true }).get(
          "project-types?_limit=-1"
        )
      ).data;

      if (this.$route.params.id === "0" && !this.form.leader.id) {
        this.form.leader = { id: this.user.id };
      }

      this.activityTypes = (
        await service({ requiresAuth: true }).get(
          "activity-types/basic?_limit=-1"
        )
      ).data;
      const globalActivityTypes = this.activityTypes.filter(
        a => a.global === true
      );
      if (this.$route.params.id === "0") {
        this.form.global_activity_types = globalActivityTypes;
      }

      if (this.$route.params.id) {
        this.allByYear = [];

        const calculate = (
          await service({ requiresAuth: true }).get(
            `projects/${this.$route.params.id}/calculate`
          )
        ).data;

        if (calculate.allByYear) {
          this.allByYear = calculate.allByYear;
          //this.dirtyEnabled = false
          if (this.form.periodification.length === 0) {
            this.form.periodification = this.allByYear
              .filter(a => a.year !== "undefined")
              .map(y => {
                return {
                  year: y.year,
                  incomes: 0,
                  expenses: 0,
                  real_incomes: 0,
                  real_expenses: 0
                };
              });
          } else {
            for (let i = 0; i < this.allByYear.length; i++) {
              const year = this.allByYear[i].year;
              if (!this.form.periodification.find(p => p.year === year)) {
                this.form.periodification.push({
                  year,
                  incomes: 0,
                  expenses: 0,
                  real_incomes: 0,
                  real_expenses: 0
                });
              }
            }
          }
        }

        setTimeout(() => {
          this.dirtyEnabled = true;
        }, 100);
      }
    },
    // input(v) {
    //   this.createdReadable = dayjs(v).format("MMM D, YYYY");
    // },
    async submitAndExit() {
      this.submit("exit");
    },
    async submitAndContinue() {
      this.submit("continue");
    },
    async submit(action) {
      this.isLoading = true;

      console.log("submit", this.form);

      if (!this.periodification) {
        this.form.periodification = [];
      }

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

      if (this.form.mother && this.form.mother.id) {
        this.form.mother = this.form.mother.id;
      }

      if (this.form.grantable_amount === "") {
        this.form.grantable_amount = null;
      }
      if (this.form.grantable_structural_expenses === "") {
        this.form.grantable_structural_expenses = null;
      }
      if (this.form.grantable_structural_expenses_justify_invoices === "") {
        this.form.grantable_structural_expenses_justify_invoices = null;
      }
      if (this.form.grantable_amount_total === "") {
        this.form.grantable_amount_total = null;
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
            queue: false
          });
          this.isLoading = false;
          return;
        }

        this.form.dirty = false;

        if (this.form.id) {
          const { activities, ...form } = this.form;

          if (form.project_phases && form.project_phases.length) {
            form.project_phases.forEach(ph => {
              if (ph && ph.expenses && ph.expenses.length) {
                ph.expenses.forEach(e => {
                  if (e.expense && !e.expense.id) {
                    e.expense = null;
                  }
                  if (e.invoice && !e.invoice.id) {
                    e.invoice = null;
                  }
                });
              }
              if (ph && ph.incomes && ph.incomes.length) {
                ph.incomes.forEach(e => {
                  if (e.invoice && !e.invoice.id) {
                    e.invoice = null;
                  }
                  if (e.income && !e.income.id) {
                    e.income = null;
                  }
                });
              }
            });
          }

          this.form.grantable_contacts = this.grantable_contacts;

          await service({ requiresAuth: true }).put(
            `projects/${this.form.id}`,
            form
          );

          this.dirty = false;
          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          if (action === "continue") {
            this.getData();
          } else {
            this.$router.push({
              name: "projectes.view"
            });
          }
        } else {
          this.form.grantable_contacts = this.grantable_contacts;

          const newProject = await service({ requiresAuth: true }).post(
            "projects",
            this.form
          );

          if (action === "continue") {
            this.$router.push({
              name: "project.edit",
              params: { id: newProject.data.id }
            });
          } else {
            this.$router.push({
              name: "projectes.view"
            });
          }

          this.dirty = false;
          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
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
            message: "S'ha produït un error al guardar el projecte",
            queue: false
          });
        } else {
          this.$buefy.snackbar.open({
            message: "Error",
            queue: false
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
      if (!this.form.clients.find(c => c.id === option.id)) {
        this.form.clients.push(option);
      }
      this.clientSearch = "";
      setTimeout(() => {
        this.clientSearch = "";
      }, 100);
    },
    leaderSelected(option) {
      this.form.grantable_leader = option ? option.id : null;
    },
    projectSelected(option) {
      console.log("projectSelected", option);
      if (option && option.id) {
        this.form.mother = option.id;
      } else {
        this.form.mother = null;
      }
    },
    activityTypeSelected(option) {
      this.form.global_activity_types = this.form.global_activity_types || [];
      if (!this.form.global_activity_types.find(c => c.id === option.id)) {
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
      if (!this.form.intercooperations.find(c => c.id === option.id)) {
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
      if (!this.form.strategies.find(c => c.id === option.id)) {
        this.form.strategies.push(option);
      }
      this.strategiesSearch = "";
      setTimeout(() => {
        this.strategiesSearch = "";
      }, 100);
    },
    removeClient(option) {
      this.form.clients = this.form.clients.filter(c => c.id !== option.id);
    },
    removeCoopera(option) {
      this.form.intercooperations = this.form.intercooperations.filter(
        c => c.id !== option.id
      );
    },
    removeStrategies(option) {
      this.form.strategies = this.form.strategies.filter(
        c => c.id !== option.id
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
      this.form._project_original_phases_updated = true;
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
        const phase = this.form.project_original_phases.find(p => p.id === pid);
        phase.incomes.push({ concept: "SF", estimated_hours: [] });
        subphase = phase.incomes[0];
        subphase.dirty = true;
      }

      const hours = subphase.estimated_hours.find(
        h => (h.id === id && h.id > 0 && !uuid) || (h._uuid === uuid && uuid)
      );
      // console.log('hours', hours)
      // console.log('item', item)
      if (hours) {
        hours.from = moment(item.start_date).format("YYYY-MM-DD");
        hours.to = item.end_date
          ? moment(item.end_date)
              .add(-1, "day")
              .format("YYYY-MM-DD")
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
        hours.dirty = true;
      } else if (uuid) {
        const hour = {
          from: moment(item.start_date).format("YYYY-MM-DD"),
          to: item.end_date
            ? moment(item.end_date)
                .add(-1, "day")
                .format("YYYY-MM-DD")
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
          dirty: true
        };
        // console.log('hour to push', hour)
        subphase.estimated_hours.push(hour);
        subphase.dirty = true;
      }
      this.updatingGantt = true;
      if (this.updatingGanttTimer) {
        clearTimeout(this.updatingGanttTimer);
      }

      this.form.project_original_phases_info = {
        deletedPhases: this.deletedPhasesOriginal,
        deletedIncomes: this.deletedIncomesOriginal,
        deletedExpenses: this.deletedExpensesOriginal,
        deletedHours: this.deletedHoursOriginal
      };

      this.updatingGanttTimer = setTimeout(() => {
        this.updatingGantt = false;
      }, 800);
    },
    ganttItemDelete(item) {
      this.form._project_original_phases_updated = true;
      const id = item._hours.id;
      const pid = item._phase.id;
      const sid = item._subphase.id;

      this.deletedHoursOriginal.push(id);

      const phase = this.form.project_original_phases.find(p => p.id === pid);

      const income = phase.incomes.find(s => s.id === sid);
      income.estimated_hours = income.estimated_hours.filter(h => h.id !== id);

      this.form.project_original_phases_info = {
        deletedPhases: this.deletedPhasesOriginal,
        deletedIncomes: this.deletedIncomesOriginal,
        deletedExpenses: this.deletedExpensesOriginal,
        deletedHours: this.deletedHoursOriginal
      };
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
        this.clients.find(c => c.id === invoice.contact)
        ? this.clients.find(c => c.id === invoice.contact).name
        : "";
    },
    formatDate(value) {
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
    },
    async addActivity() {
      if (this.activityTypeSearch) {
        const resp = await service({
          requiresAuth: true
        }).post(`activity-types`, { name: this.activityTypeSearch });
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
            queue: false
          });
          return;
        }
      }
      this.form.global_activity_types = this.form.global_activity_types.filter(
        t => t.id !== task.id
      );
    },
    phasesUpdated(info) {
      this.form._project_phases_updated = true;
      this.form.project_phases = [...info.phases];
      if (info.deletedPhases) {
        this.deletedPhases = info.deletedPhases;
        this.deletedIncomes = info.deletedIncomes;
        this.deletedExpenses = info.deletedExpenses;
      }
      this.form.project_phases_info = {
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses,
        deletedHours: []
      };
    },
    originalPhasesUpdated(info) {
      this.form._project_original_phases_updated = true;
      this.form.project_original_phases = JSON.parse(
        JSON.stringify(info.phases)
      );
      if (info.deletedPhases) {
        this.deletedPhasesOriginal = info.deletedPhases;
        this.deletedIncomesOriginal = info.deletedIncomes;
        this.deletedExpensesOriginal = info.deletedExpenses;
      }
      this.form.project_original_phases_info = {
        deletedPhases: this.deletedPhasesOriginal,
        deletedIncomes: this.deletedIncomesOriginal,
        deletedExpenses: this.deletedExpensesOriginal,
        deletedHours: this.deletedHoursOriginal
      };
    },
    originalPhasesCopy(info) {
      this.phasesVisible = false;
      const phases = JSON.parse(
        JSON.stringify(this.form.project_original_phases)
      );
      const phase = JSON.parse(
        JSON.stringify(phases.find((p, i) => i === info.index))
      );
      delete phase.__ob__;
      delete phase.id;
      phase.name = `${phase.name} - còpia`;
      phase.dirty = true;
      for (const sp of phase.incomes) {
        sp.date = sp.date
          ? moment(sp.date).format("YYYY-MM-DD")
          : this.form.date_end;
        sp.date_estimate_document = sp.date_estimate_document
          ? moment(sp.date_estimate_document).format("YYYY-MM-DD")
          : this.form.date_end;
        delete sp.id;
        delete sp.estimated_hours;
        delete sp.total_estimated_hours;
        delete sp.project_original_phase;
        sp.dirty = true;
      }
      for (const sp of phase.expenses) {
        sp.date = sp.date
          ? moment(sp.date).format("YYYY-MM-DD")
          : this.form.date_end;
        sp.date_estimate_document = sp.date_estimate_document
          ? moment(sp.date_estimate_document).format("YYYY-MM-DD")
          : this.form.date_end;
        delete sp.id;
        delete sp.estimated_hours;
        delete sp.total_estimated_hours;
        delete sp.project_original_phase;
        sp.dirty = true;
      }
      this.form.project_phases.push(JSON.parse(JSON.stringify(phase)));
      this.form.project_phases_info = {
        deletedPhases: this.deletedPhases,
        deletedIncomes: this.deletedIncomes,
        deletedExpenses: this.deletedExpenses,
        deletedHours: this.deletedHours
      };
      this.form._project_phases_updated = true;

      setTimeout(() => (this.phasesVisible = true), 100);
    },

    closeQuote() {
      this.phasesVisible = false;
      this.form.project_original_phases = JSON.parse(
        JSON.stringify(this.form.project_phases)
      );
      this.form.project_original_phases.forEach(p => {
        delete p.id;
        p.dirty = true;
        p.incomes.forEach(sp => {
          sp.date = moment(sp.date).format("YYYY-MM-DD");
          sp.date_estimate_document = moment(sp.date_estimate_document).format(
            "YYYY-MM-DD"
          );
          delete sp.id;
          sp.dirty = true;
        });
        p.expenses.forEach(sp => {
          sp.date = moment(sp.date).format("YYYY-MM-DD");
          sp.date_estimate_document = moment(sp.date_estimate_document).format(
            "YYYY-MM-DD"
          );
          delete sp.id;
          sp.dirty = true;
        });
      });
      this.phasesVisible = true;
    },
    closeQuoteFromOriginal() {
      this.phasesVisible = false;
      const phases = JSON.parse(
        JSON.stringify(this.form.project_original_phases)
      );
      phases.forEach(p => {
        p.edit = false;
        p.opened = true;
        p.dirty = true;
        delete p.id;
        p.incomes.forEach(sp => {
          sp.dirty = true;
          sp.date = moment(sp.date).format("YYYY-MM-DD");
          sp.date_estimate_document = moment(sp.date_estimate_document).format(
            "YYYY-MM-DD"
          );
          delete sp.id;
        });
        p.expenses.forEach(sp => {
          sp.dirty = true;
          sp.date = moment(sp.date).format("YYYY-MM-DD");
          delete sp.id;
        });
      });
      this.form.project_phases = phases;
      const previousDeletedPhases = this.form.project_phases_info
        ? this.form.project_phases_info.deletedPhases
        : [];
      this.form.project_phases_info = {
        deletedPhases: previousDeletedPhases,
        deletedIncomes: [],
        deletedExpenses: [],
        deletedHours: []
      };
      this.form._project_phases_updated = true;

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
    changeLine(line, field, value) {
      if (value && value.toString().includes(",")) {
        line[field] = value.toString().replace(",", ".");
      }
      this.updatePeriodification();
    },
    async updatePeriodification() {
      if (this.form.periodification && this.form.periodification.length) {
        const last = this.form.periodification.find(
          (p, i) => i === this.form.periodification.length - 1
        );
        const others = this.form.periodification.filter(
          (p, i) => i < this.form.periodification.length - 1
        );
        last.incomes =
          -1 *
          parseFloat(sumBy(others, e => parseFloat(e.incomes ? e.incomes : 0)));
        last.expenses =
          -1 *
          parseFloat(
            sumBy(others, e => parseFloat(e.expenses ? e.expenses : 0))
          );
        last.real_incomes =
          -1 *
          parseFloat(
            sumBy(others, e => parseFloat(e.real_incomes ? e.real_incomes : 0))
          );
        last.real_expenses =
          -1 *
          parseFloat(
            sumBy(others, e =>
              parseFloat(e.real_expenses ? e.real_expenses : 0)
            )
          );
      }
    },
    async uploaded(info) {
      // console.log('uploaded', info)

      if (info.refId && info.refId > 0) {
        const project = (
          await service({ requiresAuth: true }).get(`projects/${info.refId}`)
        ).data;
        // console.log('task', task)
        this.form.documents = project.documents;
      } else {
        // console.log("info", info);
        this.form.documents = info.documents;
      }
    },
    removeImage(doc) {
      this.form.documents = this.form.documents.filter(d => d.id !== doc.id);
    },
    refresh() {
      window.location.reload();
    },
    navNew() {
      let routeData = this.$router.resolve({
        name: "contacts.edit",
        params: { id: 0 }
      });
      window.open(routeData.href, "_blank");
    },
    refreshClients() {
      service({ requiresAuth: true, cached: false })
        .get("contacts/basic?_limit=-1&_sort=name:ASC")
        .then(r => {
          this.clients = r.data;
        });
    },
    updateGrantableContacts(contacts) {
      this.form.grantable_contacts = contacts;
    }
  }
};
</script>
<style>
.year-label {
  min-width: 100px;
}
.file-documents {
  margin-left: 17%;
}
</style>
