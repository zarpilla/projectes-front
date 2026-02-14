<template>
  <div class="project-form">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-two-thirds">
          <card-component :title="formCardTitle" class="tile is-child">
            <!-- Step indicator for creation wizard -->
            <div v-if="isCreationMode" class="steps mb-4">
              <div class="step-item" :class="{ 'is-active': currentStep === 1, 'is-completed': currentStep > 1 }">
                <div class="step-marker">1</div>
                <div class="step-details">
                  <p class="step-title">Dades bàsiques</p>
                </div>
              </div>
              <div class="step-item" :class="{ 'is-active': currentStep === 2, 'is-completed': currentStep > 2 }">
                <div class="step-marker">2</div>
                <div class="step-details">
                  <p class="step-title">Fases i pressupost</p>
                </div>
              </div>
              <div class="step-item" :class="{ 'is-active': currentStep === 3, 'is-completed': currentStep > 3 }">
                <div class="step-marker">3</div>
                <div class="step-details">
                  <p class="step-title">Planificació</p>
                </div>
              </div>
              <div class="step-item" :class="{ 'is-active': currentStep === 4 }">
                <div class="step-marker">4</div>
                <div class="step-details">
                  <p class="step-title">Confirmació</p>
                </div>
              </div>
            </div>
            <form 
              @submit.prevent="submitAndContinue" 
              @focus.capture="enableUserInteraction"
              @input.capture="enableUserInteraction"
              @change.capture="enableUserInteraction"
              v-if="!isLoading" 
              :key="formKey"
            >
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
                :message="form.is_mother ? 'Aquest projecte és mare d\'altres projectes i no pot tenir un projecte mare assignat' : 'Per agrupar projectes interanuals'"
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
                  :disabled="form.is_mother"
                >
                </b-autocomplete>
              </b-field>

              <b-field v-if="form.mother && form.mother.id" label="" horizontal>
                <div>
                  <router-link
                    :to="{ name: 'project.edit', params: { id: form.mother.id } }"
                  >
                    <span class="project-name has-text-info ml-1">
                      {{ form.mother.name }}
                    </span>
                  </router-link>
                </div>
              </b-field>

              <b-field v-if="form.is_mother" label="Projectes fills" horizontal>
                <div>
                  <div v-if="form.children && form.children.children && form.children.children.length > 0">
                    <div v-for="child in form.children.children" :key="child.id" class="mb-2">
                      <router-link
                        :to="{ name: 'project.edit', params: { id: child.id } }"
                      >
                        <span class="project-name has-text-info ml-1">
                          {{ child.name }}
                        </span>
                      </router-link>
                    </div>
                  </div>
                  <div v-else class="has-text-grey-light">
                    Aquest projecte és mare però encara no té projectes fills assignats
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

              <!-- HERE THE NEW COMPONENT -->
              <b-field
                label="Imports per any"
                v-if="form.grantable"
                horizontal
              >
                <div class="d-flex">
                  <ProjectGrantableYears
                    :grantable-years="form.grantable_years || []"
                    :years="years"
                    @updated="updateGrantableYears"
                    v-if="form.grantable"
                  >
                  </ProjectGrantableYears>
                </div>
              </b-field>

              <!-- COMMENTED OUT - NOW MANAGED BY ProjectGrantableYears COMPONENT
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
              END COMMENTED OUT SECTION -->

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
                <!-- Duplicate mode: single confirm button -->
                <b-field horizontal v-if="isDuplicating">
                  <b-button
                    type="is-success"
                    :loading="isLoading"
                    @click="submitAndContinue"
                    icon-left="content-save"
                    >Confirmar duplicat</b-button
                  >
                  <b-button
                    type="is-light"
                    @click="cancelDuplicate"
                    class="ml-2"
                    icon-left="close"
                    >Cancel·lar</b-button
                  >
                </b-field>
                <!-- Creation wizard mode: step navigation -->
                <template v-if="!isDuplicating && isCreationMode && currentStep === 1">
                  <b-field horizontal>
                    <b-button
                      type="is-primary"
                      :loading="isLoading"
                      @click="nextStep"
                      icon-right="arrow-right"
                      >Continuar</b-button
                    >
                  </b-field>
                </template>
                <!-- Normal mode: regular save buttons -->
                <template v-if="!isDuplicating && !isCreationMode">
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
                      type="is-primary is-outlined"
                      :loading="isLoading && form.id"
                      @click="submitAndExit"
                      >Guardar i sortir</b-button
                    >
                  </b-field>
                  <b-field horizontal>
                    <b-button
                      v-if="form.id"
                      type="is-primary is-outlined"
                      :loading="isLoading && form.id"
                      @click="duplicateProject"
                      >Duplicar projecte</b-button
                    >
                  </b-field>
                </template>
              </div>
            </form>
          </card-component>
        </div>
        <div class="column is-one-third" v-if="!isLoading && !isCreationMode">
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

            <!-- RESULTAT -->
            <div class="columns">
              <b-field label="Resultat original" class="column">
                <financial-diff-tooltip
                  :column="1"
                  :original-value="totals.original_incomes_expenses || 0"
                  :estimated-value="totals.estimated_incomes_expenses || 0"
                  :executed-value="totals.total_real_incomes_expenses || 0"
                  :positive-is-good="true"
                >
                  <money-format
                    :value="totals.original_incomes_expenses || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Resultat previst" class="column">
                <financial-diff-tooltip
                  :column="2"
                  :original-value="totals.original_incomes_expenses || 0"
                  :estimated-value="totals.estimated_incomes_expenses || 0"
                  :executed-value="totals.total_real_incomes_expenses || 0"
                  :positive-is-good="true"
                >
                  <money-format
                    :value="totals.estimated_incomes_expenses || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Resultat executat" class="column">
                <financial-diff-tooltip
                  :column="3"
                  :original-value="totals.original_incomes_expenses || 0"
                  :estimated-value="totals.estimated_incomes_expenses || 0"
                  :executed-value="totals.total_real_incomes_expenses || 0"
                  :positive-is-good="true"
                >
                  <money-format
                    :value="totals.total_real_incomes_expenses || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
            </div>

            <!-- INGRESSOS -->
            <div class="columns">
              <b-field label="Ingressos originals" class="column">
                <financial-diff-tooltip
                  :column="1"
                  :original-value="totals.total_original_incomes || 0"
                  :estimated-value="totals.total_estimated_incomes || 0"
                  :executed-value="totals.total_real_incomes || 0"
                  :positive-is-good="true"
                >
                  <money-format
                    :value="totals.total_original_incomes || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Ingressos previstos" class="column">
                <financial-diff-tooltip
                  :column="2"
                  :original-value="totals.total_original_incomes || 0"
                  :estimated-value="totals.total_estimated_incomes || 0"
                  :executed-value="totals.total_real_incomes || 0"
                  :positive-is-good="true"
                >
                  <money-format
                    :value="totals.total_estimated_incomes || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Ingressos executats" class="column">
                <financial-diff-tooltip
                  :column="3"
                  :original-value="totals.total_original_incomes || 0"
                  :estimated-value="totals.total_estimated_incomes || 0"
                  :executed-value="totals.total_real_incomes || 0"
                  :positive-is-good="true"
                >
                  <money-format
                    :value="totals.total_real_incomes || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
            </div>

            <!-- DESPESES TOTALS -->
            <div class="columns" v-if="totals">
              <b-field label="Despeses or. totals" class="column">
                <financial-diff-tooltip
                  :column="1"
                  :original-value="
                    (totals.total_original_expenses || 0) +
                      (totals.total_original_hours_price || 0) +
                      (totals.total_original_expenses_vat || 0)
                  "
                  :estimated-value="
                    (totals.total_estimated_expenses || 0) +
                      (totals.total_estimated_hours_price || 0) +
                      (totals.total_estimated_expenses_vat || 0)
                  "
                  :executed-value="
                    (totals.total_real_expenses || 0) +
                      (totals.total_real_hours_price || 0) +
                      (totals.total_real_expenses_vat || 0)
                  "
                  :positive-is-good="false"
                >
                  <money-format
                    :value="
                      (totals.total_original_expenses || 0) +
                        (totals.total_original_hours_price || 0) +
                        (totals.total_original_expenses_vat || 0)
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Despeses pr. totals" class="column">
                <financial-diff-tooltip
                  :column="2"
                  :original-value="
                    (totals.total_original_expenses || 0) +
                      (totals.total_original_hours_price || 0) +
                      (totals.total_original_expenses_vat || 0)
                  "
                  :estimated-value="
                    (totals.total_estimated_expenses || 0) +
                      (totals.total_estimated_hours_price || 0) +
                      (totals.total_estimated_expenses_vat || 0)
                  "
                  :executed-value="
                    (totals.total_real_expenses || 0) +
                      (totals.total_real_hours_price || 0) +
                      (totals.total_real_expenses_vat || 0)
                  "
                  :positive-is-good="false"
                >
                  <money-format
                    :value="
                      (totals.total_estimated_expenses || 0) +
                        (totals.total_estimated_hours_price || 0) +
                        (totals.total_estimated_expenses_vat || 0)
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Despeses ex. totals" class="column">
                <financial-diff-tooltip
                  :column="3"
                  :original-value="
                    (totals.total_original_expenses || 0) +
                      (totals.total_original_hours_price || 0) +
                      (totals.total_original_expenses_vat || 0)
                  "
                  :estimated-value="
                    (totals.total_estimated_expenses || 0) +
                      (totals.total_estimated_hours_price || 0) +
                      (totals.total_estimated_expenses_vat || 0)
                  "
                  :executed-value="
                    (totals.total_real_expenses || 0) +
                      (totals.total_real_hours_price || 0) +
                      (totals.total_real_expenses_vat || 0)
                  "
                  :positive-is-good="false"
                >
                  <money-format
                    :value="
                      (totals.total_real_expenses || 0) +
                        (totals.total_real_hours_price || 0) +
                        (totals.total_real_expenses_vat || 0)
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
            </div>

            <!-- DESPESES FACTURES -->
            <div class="columns">
              <b-field label="Despeses or. factures" class="column">
                <financial-diff-tooltip
                  :column="1"
                  :original-value="totals.total_original_expenses || 0"
                  :estimated-value="totals.total_estimated_expenses || 0"
                  :executed-value="totals.total_real_expenses || 0"
                  :positive-is-good="false"
                >
                  <money-format
                    :value="totals.total_original_expenses || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Despeses pr. factures" class="column">
                <financial-diff-tooltip
                  :column="2"
                  :original-value="totals.total_original_expenses || 0"
                  :estimated-value="totals.total_estimated_expenses || 0"
                  :executed-value="totals.total_real_expenses || 0"
                  :positive-is-good="false"
                >
                  <money-format
                    :value="totals.total_estimated_expenses || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Despeses ex. factures" class="column">
                <financial-diff-tooltip
                  :column="3"
                  :original-value="totals.total_original_expenses || 0"
                  :estimated-value="totals.total_estimated_expenses || 0"
                  :executed-value="totals.total_real_expenses || 0"
                  :positive-is-good="false"
                >
                  <money-format
                    :value="totals.total_real_expenses || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
            </div>

            <!-- DESPESES PRORRATA (only if VAT < 100%) -->
            <div
              class="columns"
              v-if="
                me &&
                  me.options &&
                  me.options.deductible_vat_pct &&
                  me.options.deductible_vat_pct < 100.0
              "
            >
              <b-field label="Despeses or. prorrata" class="column">
                <financial-diff-tooltip
                  :column="1"
                  :original-value="totals.total_original_expenses_vat || 0"
                  :estimated-value="totals.total_estimated_expenses_vat || 0"
                  :executed-value="totals.total_real_expenses_vat || 0"
                  :positive-is-good="false"
                >
                  <money-format
                    :value="totals.total_original_expenses_vat || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Despeses pr. prorrata" class="column">
                <financial-diff-tooltip
                  :column="2"
                  :original-value="totals.total_original_expenses_vat || 0"
                  :estimated-value="totals.total_estimated_expenses_vat || 0"
                  :executed-value="totals.total_real_expenses_vat || 0"
                  :positive-is-good="false"
                >
                  <money-format
                    :value="totals.total_estimated_expenses_vat || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Despeses ex. prorrata" class="column">
                <financial-diff-tooltip
                  :column="3"
                  :original-value="totals.total_original_expenses_vat || 0"
                  :estimated-value="totals.total_estimated_expenses_vat || 0"
                  :executed-value="totals.total_real_expenses_vat || 0"
                  :positive-is-good="false"
                >
                  <money-format
                    :value="totals.total_real_expenses_vat || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
            </div>

            <!-- HORES (€) -->
            <div class="columns" v-if="totals">
              <b-field label="Hores originals" class="column">
                <financial-diff-tooltip
                  :column="1"
                  :original-value="totals.total_original_hours_price || 0"
                  :estimated-value="totals.total_estimated_hours_price || 0"
                  :executed-value="totals.total_real_hours_price || 0"
                  :positive-is-good="false"
                >
                  <money-format
                    :value="totals.total_original_hours_price || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Hores previstes" class="column">
                <financial-diff-tooltip
                  :column="2"
                  :original-value="totals.total_original_hours_price || 0"
                  :estimated-value="totals.total_estimated_hours_price || 0"
                  :executed-value="totals.total_real_hours_price || 0"
                  :positive-is-good="false"
                >
                  <money-format
                    :value="totals.total_estimated_hours_price || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Hores executades" class="column">
                <financial-diff-tooltip
                  :column="3"
                  :original-value="totals.total_original_hours_price || 0"
                  :estimated-value="totals.total_estimated_hours_price || 0"
                  :executed-value="totals.total_real_hours_price || 0"
                  :positive-is-good="false"
                >
                  <money-format
                    :value="totals.total_real_hours_price || 0"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
            </div>

            <!-- HORES (h) quantity -->
            <div class="columns">
              <b-field label="Hores originals (h)" class="column">
                <financial-diff-tooltip
                  :column="1"
                  :original-value="totals && totals.total_original_hours ? totals.total_original_hours : 0"
                  :estimated-value="totals && totals.total_estimated_hours ? totals.total_estimated_hours : 0"
                  :executed-value="totals && totals.total_real_hours ? totals.total_real_hours : 0"
                  :positive-is-good="false"
                  :show-as-currency="false"
                  unit="h"
                >
                  <div class="has-text-right">
                    {{
                      totals && totals.total_original_hours
                        ? totals.total_original_hours.toFixed(2)
                        : "0"
                    }}
                    h
                  </div>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Hores previstes (h)" class="column">
                <financial-diff-tooltip
                  :column="2"
                  :original-value="totals && totals.total_original_hours ? totals.total_original_hours : 0"
                  :estimated-value="totals && totals.total_estimated_hours ? totals.total_estimated_hours : 0"
                  :executed-value="totals && totals.total_real_hours ? totals.total_real_hours : 0"
                  :positive-is-good="false"
                  :show-as-currency="false"
                  unit="h"
                >
                  <div class="has-text-right">
                    {{
                      totals && totals.total_estimated_hours
                        ? totals.total_estimated_hours.toFixed(2)
                        : "0"
                    }}
                    h
                  </div>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Hores executades (h)" class="column">
                <financial-diff-tooltip
                  :column="3"
                  :original-value="totals && totals.total_original_hours ? totals.total_original_hours : 0"
                  :estimated-value="totals && totals.total_estimated_hours ? totals.total_estimated_hours : 0"
                  :executed-value="totals && totals.total_real_hours ? totals.total_real_hours : 0"
                  :positive-is-good="false"
                  :show-as-currency="false"
                  unit="h"
                >
                  <div class="has-text-right">
                    {{
                      totals && totals.total_real_hours
                        ? totals.total_real_hours.toFixed(2)
                        : "0"
                    }}
                    h
                  </div>
                </financial-diff-tooltip>
              </b-field>
            </div>

            <!-- COST/HORA -->
            <div class="columns">
              <b-field label="Cost/hora original" class="column">
                <financial-diff-tooltip
                  :column="1"
                  :original-value="
                    totals && totals.total_original_hours
                      ? (totals.total_original_hours_price || 0) /
                        totals.total_original_hours
                      : 0
                  "
                  :estimated-value="
                    totals && totals.total_estimated_hours
                      ? (totals.total_estimated_hours_price || 0) /
                        totals.total_estimated_hours
                      : 0
                  "
                  :executed-value="
                    totals && totals.total_real_hours
                      ? (totals.total_real_hours_price || 0) / totals.total_real_hours
                      : 0
                  "
                  :positive-is-good="false"
                >
                  <money-format
                    :value="
                      totals && totals.total_original_hours
                        ? (totals.total_original_hours_price || 0) /
                          totals.total_original_hours
                        : 0
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Cost/hora previst" class="column">
                <financial-diff-tooltip
                  :column="2"
                  :original-value="
                    totals && totals.total_original_hours
                      ? (totals.total_original_hours_price || 0) /
                        totals.total_original_hours
                      : 0
                  "
                  :estimated-value="
                    totals && totals.total_estimated_hours
                      ? (totals.total_estimated_hours_price || 0) /
                        totals.total_estimated_hours
                      : 0
                  "
                  :executed-value="
                    totals && totals.total_real_hours
                      ? (totals.total_real_hours_price || 0) / totals.total_real_hours
                      : 0
                  "
                  :positive-is-good="false"
                >
                  <money-format
                    :value="
                      totals && totals.total_estimated_hours
                        ? (totals.total_estimated_hours_price || 0) /
                          totals.total_estimated_hours
                        : 0
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Cost/hora executat" class="column">
                <financial-diff-tooltip
                  :column="3"
                  :original-value="
                    totals && totals.total_original_hours
                      ? (totals.total_original_hours_price || 0) /
                        totals.total_original_hours
                      : 0
                  "
                  :estimated-value="
                    totals && totals.total_estimated_hours
                      ? (totals.total_estimated_hours_price || 0) /
                        totals.total_estimated_hours
                      : 0
                  "
                  :executed-value="
                    totals && totals.total_real_hours
                      ? (totals.total_real_hours_price || 0) / totals.total_real_hours
                      : 0
                  "
                  :positive-is-good="false"
                >
                  <money-format
                    :value="
                      totals && totals.total_real_hours
                        ? (totals.total_real_hours_price || 0) / totals.total_real_hours
                        : 0
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
            </div>

            <!-- PREU/HORA -->
            <div class="columns">
              <b-field label="Preu/hora original" class="column">
                <financial-diff-tooltip
                  :column="1"
                  :original-value="
                    totals && totals.total_original_hours
                      ? ((totals.total_original_incomes || 0) - (totals.total_original_expenses || 0)) /
                        totals.total_original_hours
                      : 0
                  "
                  :estimated-value="
                    totals && totals.total_estimated_hours
                      ? ((totals.total_estimated_incomes || 0) - (totals.total_estimated_expenses || 0)) /
                        totals.total_estimated_hours
                      : 0
                  "
                  :executed-value="
                    totals && totals.total_real_hours
                      ? ((totals.total_real_incomes || 0) - (totals.total_real_expenses || 0)) /
                        totals.total_real_hours
                      : 0
                  "
                  :positive-is-good="true"
                >
                  <money-format
                    :value="
                      totals && totals.total_original_hours
                        ? ((totals.total_original_incomes || 0) - (totals.total_original_expenses || 0)) /
                          totals.total_original_hours
                        : 0
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Preu/hora previst" class="column">
                <financial-diff-tooltip
                  :column="2"
                  :original-value="
                    totals && totals.total_original_hours
                      ? ((totals.total_original_incomes || 0) - (totals.total_original_expenses || 0)) /
                        totals.total_original_hours
                      : 0
                  "
                  :estimated-value="
                    totals && totals.total_estimated_hours
                      ? ((totals.total_estimated_incomes || 0) - (totals.total_estimated_expenses || 0)) /
                        totals.total_estimated_hours
                      : 0
                  "
                  :executed-value="
                    totals && totals.total_real_hours
                      ? ((totals.total_real_incomes || 0) - (totals.total_real_expenses || 0)) /
                        totals.total_real_hours
                      : 0
                  "
                  :positive-is-good="true"
                >
                  <money-format
                    :value="
                      totals && totals.total_estimated_hours
                        ? ((totals.total_estimated_incomes || 0) - (totals.total_estimated_expenses || 0)) /
                          totals.total_estimated_hours
                        : 0
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
              </b-field>
              <b-field label="Preu/hora executat" class="column">
                <financial-diff-tooltip
                  :column="3"
                  :original-value="
                    totals && totals.total_original_hours
                      ? ((totals.total_original_incomes || 0) - (totals.total_original_expenses || 0)) /
                        totals.total_original_hours
                      : 0
                  "
                  :estimated-value="
                    totals && totals.total_estimated_hours
                      ? ((totals.total_estimated_incomes || 0) - (totals.total_estimated_expenses || 0)) /
                        totals.total_estimated_hours
                      : 0
                  "
                  :executed-value="
                    totals && totals.total_real_hours
                      ? ((totals.total_real_incomes || 0) - (totals.total_real_expenses || 0)) /
                        totals.total_real_hours
                      : 0
                  "
                  :positive-is-good="true"
                >
                  <money-format
                    :value="
                      totals && totals.total_real_hours
                        ? ((totals.total_real_incomes || 0) -
                            (totals.total_real_expenses || 0)) /
                          totals.total_real_hours
                        : 0
                    "
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </financial-diff-tooltip>
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
                :key="y.year"
                class="year-total tag is-ghost mr-1 clickable"
                :class="allByYearYear == y.year ? 'is-primary' : 'is-ghost'"
                @click="allByYearYear = y.year"
              >
                {{ y.year }}
              </div>
            </div>
          </card-component>

          <card-component
            v-if="isProfileExists && !isCreationMode"
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
          !isLoading && phasesVisible && form && form.project_original_phases &&
          (!isCreationMode || currentStep >= 2)
        "
        title="GESTIÓ ECONÒMICA - FASES I PRESSUPOST ORIGINAL"
        :closeIcon="true"
        :content-visible="true"
      >
        <b-notification v-if="form.is_mother && !hasLegacyMotherPhases" type="is-info" :closable="false" class="mb-4">
          Aquest és un projecte mare. Les fases que es mostren són l'agregació de tots els projectes fills. No es poden editar directament.
        </b-notification>
        <b-notification v-if="form.is_mother && hasLegacyMotherPhases" type="is-warning" :closable="false" class="mb-4">
          <strong>ATENCIÓ: Dades heretades detectades!</strong><br>
          Aquest és un projecte mare amb fases pròpies (dades heretades del sistema antic). Els projectes mare només haurien de contenir l'agregació de les fases dels projectes fills.<br>
          <strong>Si us plau, elimina manualment les fases que pertanyen directament a aquest projecte.</strong> Les fases correctes són només les que provenen dels projectes fills.
        </b-notification>
        <b-field v-if="!form.is_mother">
          <b-button
            type="is-primary is-outlined"
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
          :key="'original-' + formKey"
          :form="form"
          :project-phases="form.project_original_phases"
          @phases-updated="originalPhasesUpdated"
          @phases-copy="originalPhasesCopy"
          mode="simple"
          :editable="originalEditable && !form.is_mother"
          :per-page="parseInt(perPage)"
          :is-paginated="isPaginated"
        />

        <hr
          v-if="
            !form.is_mother &&
            form.project_original_phases.length &&
              (!form.project_phases || form.project_phases.length === 0)
          "
        />
        <b-field
          v-if="
            !form.is_mother &&
            form.project_original_phases.length &&
              form.project_phases.length === 0
          "
        >
          <b-button type="is-warning" @click="closeQuoteFromOriginal">
            Crear Execució de Pressupost
          </b-button>
        </b-field>

        <hr v-if="!isDuplicating" />
        <div class="is-flex" v-if="!isDuplicating">
          <!-- Creation wizard mode step 2: navigation buttons -->
          <template v-if="isCreationMode && currentStep === 2">
            <b-field horizontal>
              <b-button
                type="is-light"
                @click="previousStep"
                icon-left="arrow-left"
                >Enrere</b-button
              >
            </b-field>
            <b-field horizontal>
              <b-button
                type="is-primary"
                :loading="isLoading"
                @click="nextStep"
                icon-right="arrow-right"
                >Continuar</b-button
              >
            </b-field>
          </template>
          <!-- Normal mode: regular save buttons -->
          <template v-if="!isCreationMode">
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
                type="is-primary is-outlined"
                :loading="isLoading && form.id"
                @click="submitAndExit"
                >Guardar i sortir</b-button
              >
            </b-field>
          </template>
        </div>
      </card-component>

      <card-component
        v-if="
          !isLoading &&
            phasesVisible &&
            form &&
            form.project_phases &&
            form.project_phases.length &&
            !form.children &&
            !isCreationMode
        "
        :title="'GESTIÓ ECONÒMICA - EXECUCIÓ PRESSUPOST'"
        :closeIcon="true"
        :content-visible="true"
      >
        <b-notification v-if="form.is_mother && !hasLegacyMotherPhases" type="is-info" :closable="false" class="mb-4">
          Aquest és un projecte mare. Les fases que es mostren són l'agregació de tots els projectes fills. No es poden editar directament.
        </b-notification>
        <b-notification v-if="form.is_mother && hasLegacyMotherPhases" type="is-warning" :closable="false" class="mb-4">
          <strong>ATENCIÓ: Dades heretades detectades!</strong><br>
          Aquest és un projecte mare amb fases pròpies (dades heretades del sistema antic). Els projectes mare només haurien de contenir l'agregació de les fases dels projectes fills.<br>
          <strong>Si us plau, elimina manualment les fases que pertanyen directament a aquest projecte.</strong> Les fases correctes són només les que provenen dels projectes fills.
        </b-notification>
        <b-field v-if="!form.is_mother">
          <b-button
            type="is-primary is-outlined"
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
          :key="'execution-' + formKey"
          :form="form"
          :project-phases="form.project_phases"
          @phases-updated="phasesUpdated"
          :editable="phasesEditable && !form.is_mother"
          :per-page="parseInt(perPage)"
          :is-paginated="isPaginated"
        />
        <hr
          v-if="
            !form.is_mother &&
            form.project_phases.length &&
              (!form.project_original_phases ||
                form.project_original_phases.length === 0)
          "
        />
        <b-field
          v-if="
            !form.is_mother &&
            form.project_phases.length &&
              form.project_original_phases.length === 0
          "
        >
          <b-button type="is-warning" @click="closeQuote">
            Tancar Pressupost 3
          </b-button>
        </b-field>

        <hr v-if="!isDuplicating" />
        <div class="is-flex" v-if="!isDuplicating">
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
              type="is-primary is-outlined"
              :loading="isLoading && form.id"
              @click="submitAndExit"
              >Guardar i sortir</b-button
            >
          </b-field>
        </div>
      </card-component>
      <!-- <pre>{{documents}}</pre> -->

      <card-component
        v-if="!isLoading && periodification && form.periodification.length && !isCreationMode"
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
        <hr v-if="!isDuplicating" />
        <div class="is-flex" v-if="!isDuplicating">
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
              type="is-primary is-outlined"
              :loading="isLoading && form.id"
              @click="submitAndExit"
              >Guardar i sortir</b-button
            >
          </b-field>
        </div>
      </card-component>
      <card-component
        v-if="documents && documents.length && !isLoading && !isCreationMode"
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
        v-if="!isLoading && !isUpdating && !form.children && (!isCreationMode || currentStep >= 3)"
        :title="'PLANIFICACIÓ' + (ganttViewMode === 'original' ? ' ORIGINAL' : ' PREVISTA')"
        header-icon="swap-horizontal"
        @header-icon-click="toggleGanttView"
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
              ((ganttViewMode === 'original' && form.project_original_phases && form.project_original_phases.length && form.project_original_phases[0].id) ||
               (ganttViewMode === 'estimated' && form.project_phases && form.project_phases.length && form.project_phases[0].id))
          "
          :key="'gantt-' + ganttViewMode + '-' + form.id"
          class="left-container"
          :project="form"
          :users="leaders"
          :tasks="{}"
          :view-mode="ganttViewMode"
          @gantt-item-update="ganttItemUpdate"
          @gantt-item-delete="ganttItemDelete"
        />
        <span class="bg-info" v-else
          >Es necessari tenir fases i guardar el projecte amb un pressupost
          tancat per accedir a la planificació</span
        >
        <hr v-if="!isDuplicating" />
        <div class="is-flex" v-if="!isDuplicating">
          <!-- Creation wizard mode step 3: show confirmation options -->
          <template v-if="isCreationMode && currentStep === 3">
            <b-field horizontal>
              <b-button
                type="is-light"
                @click="previousStep"
                icon-left="arrow-left"
                >Enrere</b-button
              >
            </b-field>
            <b-field horizontal>
              <b-button
                type="is-primary"
                :loading="isLoading"
                @click="nextStep"
                icon-right="arrow-right"
                >Continuar</b-button
              >
            </b-field>
          </template>
          <!-- Creation wizard mode step 4: final confirmation -->
          <template v-if="isCreationMode && currentStep === 4">
            <div class="notification is-info" style="flex-grow: 1; margin-right: 1rem;">
              <p class="mb-2"><strong>El projecte està gairebé completat!</strong></p>
              <p>Pots continuar editant les fases o la planificació, o tancar el pressupost per finalitzar la creació.</p>
            </div>
            <b-field horizontal>
              <b-button
                type="is-light"
                @click="continueEditing('phases')"
                >Editar fases</b-button
              >
            </b-field>
            <b-field horizontal>
              <b-button
                type="is-light"
                @click="continueEditing('planning')"
                >Editar planificació</b-button
              >
            </b-field>
            <b-field horizontal>
              <b-button
                type="is-success"
                :loading="isLoading"
                @click="closeBudget"
                icon-left="check"
                >Tancar pressupost</b-button
              >
            </b-field>
          </template>
          <!-- Normal mode: regular save buttons -->
          <template v-if="!isCreationMode">
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
                type="is-primary is-outlined"
                :loading="isLoading"
                @click="submitAndExit"
                >Guardar i sortir</b-button
              >
            </b-field>
          </template>
        </div>
      </card-component>

      <card-component
        v-if="treasury && treasury.length && !isLoading && !isCreationMode"
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
        v-if="!isLoading && !form.children && !isCreationMode"
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
import FinancialDiffTooltip from "@/components/FinancialDiffTooltip.vue";
import Tasks from "@/components/Tasks";
import FileUpload from "@/components/FileUpload";
import ProjectGrantableYears from "@/components/ProjectGrantableYears.vue";
import getConfig from "@/config";

// Services
import service from "@/service/index";

export default {
  name: "ProjectForm",
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat,
    FinancialDiffTooltip,
    ModalBoxInvoicing,
    ModalBoxSplit,
    ProjectGannt,
    ProjectPhases,
    ProjectGrantableContacts,
    ProjectGrantableYears,
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
      years: [],
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
      ganttViewMode: "original", // 'original' or 'estimated'
      apiUrl: process.env.VUE_APP_API_URL,
      hasBeenDirty: false,
      allByYear: [],
      allByYearYear: "TOTS",
      calculatedTotals: null,
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
      deletedHours: [],
      deletedPhasesOriginal: [],
      deletedIncomesOriginal: [],
      deletedExpensesOriginal: [],
      deletedHoursOriginal: [],
      isDuplicating: false,
      formKey: 0,
      isInitialLoad: false,
      userHasInteracted: false,
      // Creation wizard state
      currentStep: 1,
      isCreationMode: false
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
    unassignedDocuments() {
      // Get all document IDs that are already assigned to phases
      const assignedIds = new Set();
      const project_phases = this.form.project_phases || [];
      
      project_phases.forEach(ph => {
        ph.incomes.forEach(income => {
          if (income.invoice && income.invoice.id) assignedIds.add(`emitted_invoices_${income.invoice.id}`);
          if (income.grant && income.grant.id) assignedIds.add(`received_grants_${income.grant.id}`);
          if (income.income && income.income.id) assignedIds.add(`received_income_${income.income.id}`);
        });
        ph.expenses.forEach(expense => {
          if (expense.invoice && expense.invoice.id) assignedIds.add(`received_invoices_${expense.invoice.id}`);
          if (expense.ticket && expense.ticket.id) assignedIds.add(`tickets_${expense.ticket.id}`);
          if (expense.diet && expense.diet.id) assignedIds.add(`diets_${expense.diet.id}`);
          if (expense.grant && expense.grant.id) assignedIds.add(`received_grants_${expense.grant.id}`);
          if (expense.expense && expense.expense.id) assignedIds.add(`received_expense_${expense.expense.id}`);
        });
      });
      
      // Find unassigned documents
      const unassigned = [];
      
      if (this.form.emitted_invoices) {
        this.form.emitted_invoices.forEach(doc => {
          if (!assignedIds.has(`emitted_invoices_${doc.id}`)) {
            unassigned.push({ ...doc, type: 'Factura emesa' });
          }
        });
      }
      
      if (this.form.received_grants) {
        this.form.received_grants.forEach(doc => {
          if (!assignedIds.has(`received_grants_${doc.id}`)) {
            unassigned.push({ ...doc, type: 'Subvenció rebuda' });
          }
        });
      }
      
      if (this.form.received_incomes) {
        this.form.received_incomes.forEach(doc => {
          if (!assignedIds.has(`received_income_${doc.id}`)) {
            unassigned.push({ ...doc, type: 'Ingrés rebut' });
          }
        });
      }
      
      if (this.form.received_invoices) {
        this.form.received_invoices.forEach(doc => {
          if (!assignedIds.has(`received_invoices_${doc.id}`)) {
            unassigned.push({ ...doc, type: 'Factura rebuda' });
          }
        });
      }
      
      if (this.form.tickets) {
        this.form.tickets.forEach(doc => {
          if (!assignedIds.has(`tickets_${doc.id}`)) {
            unassigned.push({ ...doc, type: 'Tiquet' });
          }
        });
      }
      
      if (this.form.diets) {
        this.form.diets.forEach(doc => {
          if (!assignedIds.has(`diets_${doc.id}`)) {
            unassigned.push({ ...doc, type: 'Dieta' });
          }
        });
      }
      
      if (this.form.received_expenses) {
        this.form.received_expenses.forEach(doc => {
          if (!assignedIds.has(`received_expense_${doc.id}`)) {
            unassigned.push({ ...doc, type: 'Despesa rebuda' });
          }
        });
      }
      
      return unassigned;
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
    hasLegacyMotherPhases() {
      // Check if this is a mother project and has its own phases (legacy data)
      // Mother projects should only have aggregated phases from children
      if (!this.form.is_mother) {
        return false;
      }
      
      // Check if there are any original phases that belong directly to this project
      const hasOwnOriginalPhases = this.form.project_original_phases && 
        this.form.project_original_phases.length > 0 &&
        this.form.project_original_phases.some(phase => 
          phase.project && phase.project.id === this.form.id
        );
      
      // Check if there are any execution phases that belong directly to this project
      const hasOwnExecutionPhases = this.form.project_phases && 
        this.form.project_phases.length > 0 &&
        this.form.project_phases.some(phase => 
          phase.project && phase.project.id === this.form.id
        );
      
      return hasOwnOriginalPhases || hasOwnExecutionPhases;
    },
    totals() {
      // When showing TOTS (total), use calculatedTotals from calculate endpoint
      // This ensures totals match the sum of yearly values
      const result = this.allByYearYear === "TOTS"
        ? (this.calculatedTotals || this.form)
        : this.allByYear.find(a => a.year === this.allByYearYear);
      
      return result;
    }
  },
  watch: {
    id(newValue) {
      this.isProfileExists = false;
      this.userHasInteracted = false;
      if (!newValue || newValue === 0) {
        this.dirtyEnabled = false;
        this.isInitialLoad = true;
        this.form = this.getClearFormObject();
        this.getAuxiliarData();
        // dirty flag will be reset in getAuxiliarData() after all async operations complete
      } else {
        this.getData();
        // dirty flag will be reset in getAuxiliarData() after all async operations complete
      }
    },
    form: {
      handler(newVal, oldVal) {
        // Skip if dirty tracking is disabled, we're in initial load, or user hasn't interacted yet
        if (!this.dirtyEnabled || this.isInitialLoad || !this.userHasInteracted) {
          return;
        }
        // Only set dirty if both forms have the same ID (editing existing) and the change isn't initial data loading
        if (oldVal && newVal && oldVal.id && newVal.id && oldVal.id === newVal.id) {
          this.dirty = true;
        }
      },
      deep: true
    }
  },
  created() {
    const config = getConfig();
    this.apiUrl = config.VUE_APP_API_URL;
    // Restore Gantt view preference from localStorage
    // if exist execution-> estimated
    this.ganttViewMode = this.form.project_phases && this.form.project_phases.length > 0 ? 'estimated' : 'original';
    this.getData();
  },
  beforeRouteLeave(to, from, next) {
    // called when the route that renders this component is about to be navigated away from.
    // As with `beforeRouteUpdate`, it has access to `this` component instance.
    if (this.dirty && !this.isInitialLoad && this.userHasInteracted) {
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
        project_type: { id: 0 },
        grantable_years: []
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
        // Disable dirty tracking during data loading to prevent false positives
        this.dirtyEnabled = false;
        this.isInitialLoad = true;
        this.userHasInteracted = false; // Reset interaction tracking on data reload
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

              // Load execution phases with estimated hours
              const phases = (
                await service({ requiresAuth: true }).get(
                  `project-phases?project=${this.$route.params.id}&_limit=-1`
                )
              ).data;

              this.form.project_phases = phases;
              this.ganttViewMode = (phases && phases.length > 0) ? 'estimated' : 'original';

              // Load original phases with estimated hours
              const phases_and_estimated_hours = (
                await service({ requiresAuth: true }).get(
                  `project-original-phases-hours?project=${this.$route.params.id}&_limit=-1`
                )
              ).data;

              this.form.project_original_phases = phases_and_estimated_hours;

              // Load children data if this project is a mother project
              if (this.form.is_mother) {
                const childrenData = (
                  await service({ requiresAuth: true }).get(
                    `projects/${this.$route.params.id}/children`
                  )
                ).data;
                
                this.form.incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.total_real_incomes_expenses =
                  childrenData.totals.total_real_incomes_expenses;
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
                this.form.total_expenses_vat =
                  childrenData.totals.total_expenses_vat;
                this.form.total_real_expenses_vat =
                  childrenData.totals.total_real_expenses_vat;
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

                // Set aggregated phases from children (for display only, not for storage)
                this.form.project_phases = childrenData.project_phases || [];
                this.form.project_original_phases = childrenData.project_original_phases || [];

                // Set aggregated allByYear from children
                if (childrenData.allByYear) {
                  this.allByYear = childrenData.allByYear;
                }
                
                // Store calculated totals for mother projects
                // This ensures consistency with yearly values
                if (childrenData.totals) {
                  this.calculatedTotals = childrenData.totals;
                }

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
              
              // Initialize grantable_years if not present
              if (!this.form.grantable_years) {
                this.form.grantable_years = [];
              }

              // Check if we're in creation mode based on creation_step
              // null or undefined or 'completed' means project is fully created
              if (this.form.creation_step !== null && 
                  this.form.creation_step !== undefined && 
                  this.form.creation_step !== 'completed') {
                this.isCreationMode = true;
                this.currentStep = this.getStepNumber(this.form.creation_step);
              } else {
                this.isCreationMode = false;
                this.currentStep = 1;
              }

              this.getAuxiliarData();

              // Set default Gantt view mode based on available phases
              // If no saved preference exists, and project has execution phases, default to "estimated"
              const savedGanttView = localStorage.getItem("ganttViewMode");
              if (!savedGanttView && this.form.project_phases && this.form.project_phases.length > 0) {
                this.ganttViewMode = "estimated";
              }

              this.isLoading = false;

              // Reset dirty flag AFTER all data is loaded and dirtyEnabled is re-enabled
              // This is handled in getAuxiliarData() to ensure proper sequencing
            } else {
              this.$router.push({ name: "project.new" });
            }
          });
      } else {
        // New project - disable dirty tracking during initialization
        this.dirtyEnabled = false;
        this.isInitialLoad = true;
        this.userHasInteracted = false;
        this.project_scopes = this.project_scopes.filter(s => !s.disabled)
        this.form.date_start = new Date();
        this.form.date_end = moment()
          .endOf("year")
          .toDate();
        // Enable creation mode for new projects and set initial creation_step
        this.isCreationMode = true;
        this.currentStep = 1;
        this.form.creation_step = 'basic_data';
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
      service({ requiresAuth: true, cached: true })
        .get("years?_limit=-1")
        .then(r => {
          this.years = r.data;
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
        // For mother projects, allByYear is already loaded from children data
        // For other projects, we need to calculate it
        if (!this.form.is_mother) {
          this.allByYear = this.form.allByYear;
          
          // const calculate = (
          //   await service({ requiresAuth: true }).get(
          //     `projects/${this.$route.params.id}/calculate`
          //   )
          // ).data;

          // if (calculate.allByYear) {
          //   this.allByYear = calculate.allByYear;
          // }
          
          // Store calculated totals to ensure consistency with yearly values
          // if (calculate.totals) {
          //   this.calculatedTotals = calculate.totals;
          // }
        }

        //this.dirtyEnabled = false
        if (this.allByYear && this.allByYear.length) {
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

        // Re-enable dirty tracking and reset dirty flag in proper sequence
        // Use nextTick to ensure all Vue reactivity updates are complete
        this.$nextTick(() => {
          setTimeout(() => {
            this.dirty = false;
            this.dirtyEnabled = true;
            this.isInitialLoad = false;
            // userHasInteracted stays false until user actually interacts
          }, 200);
        });
      }
    },
    // Called when user interacts with the form for the first time
    enableUserInteraction() {
      if (!this.userHasInteracted && !this.isInitialLoad) {
        this.userHasInteracted = true;
      }
    },
    // Wizard navigation methods
    getStepNumber(stepName) {
      const stepMap = {
        'basic_data': 1,
        'phases_budget': 2,
        'planning': 3,
        'confirmation': 4
      };
      return stepMap[stepName] || 1;
    },
    getStepName(stepNumber) {
      const stepMap = {
        1: 'basic_data',
        2: 'phases_budget',
        3: 'planning',
        4: 'confirmation'
      };
      return stepMap[stepNumber] || 'basic_data';
    },
    isStepValid(step) {
      // Validate each step's required fields
      if (step === 1) {
        // Basic data: name, state, scope, leader, dates are required
        const stateInvalid = this.form.project_state.id === 0;
        const scopeInvalid = this.form.project_scope.id === 0;
        const leaderInvalid = this.form.leader.id === 0;
        return this.form.name && this.form.date_start && this.form.date_end &&
               !stateInvalid && !scopeInvalid && !leaderInvalid;
      } else if (step === 2) {
        // Phases and budget: at least one phase with data
        return this.form.project_original_phases && this.form.project_original_phases.length > 0;
      } else if (step === 3) {
        // Planning: requires phases to be saved first
        return this.form.id && 
               this.form.project_original_phases && 
               this.form.project_original_phases.length > 0 &&
               this.form.project_original_phases[0] &&
               this.form.project_original_phases[0].id;
      }
      return true;
    },
    async nextStep() {
      // Validate current step before proceeding
      if (!this.isStepValid(this.currentStep)) {
        this.$buefy.snackbar.open({
          message: "Si us plau, completa tots els camps obligatoris abans de continuar",
          queue: false
        });
        return;
      }

      // Save the project with the current step
      this.form.creation_step = this.getStepName(this.currentStep);
      
      // Save and proceed
      await this.submit("next");
    },
    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--;
      }
    },
    async closeBudget() {
      // Close the budget by copying original phases to execution phases
      // This method is called when user confirms they want to finalize the project creation
      if (!this.form.project_original_phases || this.form.project_original_phases.length === 0) {
        this.$buefy.snackbar.open({
          message: "No hi ha fases originals per tancar el pressupost",
          queue: false
        });
        return;
      }

      // Mark creation as completed
      this.form.creation_step = 'completed';
      
      // Save and create execution budget
      // This calls closeQuoteFromOriginal which copies phases
      await this.submit("closeBudget");
    },
    continueEditing(target) {
      // Navigate back to the specified step
      if (target === 'phases') {
        this.currentStep = 2;
      } else if (target === 'planning') {
        this.currentStep = 3;
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
      console.log('=== SUBMIT CALLED ===');
      console.log('action:', action);
      console.log('this.form.id:', this.form.id);
      console.log('isDuplicating:', this.isDuplicating);
      
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

        console.log('=== VALIDATION PASSED ===');
        console.log('Proceeding to save logic...');

        this.form.dirty = false;

        console.log('=== CHECKING SAVE PATH ===');
        console.log('this.form.id:', this.form.id);
        console.log('Will use:', this.form.id ? 'PUT (update)' : 'POST (create)');

        if (this.form.id) {
          // Clean up grantable_contacts before destructuring
          console.log('Before filter - this.form.grantable_contacts:', JSON.stringify(this.form.grantable_contacts));
          this.form.grantable_contacts = (this.form.grantable_contacts || []).filter(gc => {
            const hasValidContact = gc.contact && gc.contact.id;
            console.log('Filtering grantable_contact:', gc, 'hasValidContact:', hasValidContact);
            return hasValidContact;
          });
          console.log('After filter - this.form.grantable_contacts:', JSON.stringify(this.form.grantable_contacts));

          const { activities, ...form } = this.form;
          console.log('form.grantable_contacts in PUT:', JSON.stringify(form.grantable_contacts));

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

          await service({ requiresAuth: true }).put(
            `projects/${this.form.id}`,
            form
          );

          this.dirty = false;
          this.isDuplicating = false; // Reset duplicate mode after save
          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          if (action === "next") {
            // Wizard: move to next step after save
            this.currentStep++;
            this.getData();
          } else if (action === "closeBudget") {
            // Close budget and create execution phases
            await this.closeQuoteFromOriginal();
            this.isCreationMode = false;
            this.getData();
          } else if (action === "continue") {
            this.getData();
          } else {
            this.$router.push({
              name: "projectes.view"
            });
          }
        } else {
          // Clean up grantable_contacts before creating new project
          this.form.grantable_contacts = (this.form.grantable_contacts || []).filter(gc => {
            return gc.contact && gc.contact.id;
          });

          // Clean up nested objects in phases for POST (same as PUT)
          if (this.form.project_original_phases && this.form.project_original_phases.length) {
            this.form.project_original_phases.forEach(ph => {
              if (ph && ph.expenses && ph.expenses.length) {
                ph.expenses.forEach(e => {
                  // Convert expense_type to ID only
                  if (e.expense_type && typeof e.expense_type === 'object') {
                    e.expense_type = e.expense_type.id || null;
                  }
                  // Clean up references
                  if (e.expense && !e.expense.id) {
                    e.expense = null;
                  }
                  if (e.invoice && !e.invoice.id) {
                    e.invoice = null;
                  }
                  // Convert bank_account and client to ID only
                  if (e.bank_account && typeof e.bank_account === 'object') {
                    e.bank_account = e.bank_account.id || null;
                  }
                  if (e.client && typeof e.client === 'object') {
                    e.client = e.client.id || null;
                  }
                });
              }
              if (ph && ph.incomes && ph.incomes.length) {
                ph.incomes.forEach(inc => {
                  // Convert income_type to ID only
                  if (inc.income_type && typeof inc.income_type === 'object') {
                    inc.income_type = inc.income_type.id || null;
                  }
                  // Clean up references
                  if (inc.invoice && !inc.invoice.id) {
                    inc.invoice = null;
                  }
                  if (inc.income && !inc.income.id) {
                    inc.income = null;
                  }
                  // Convert bank_account and client to ID only
                  if (inc.bank_account && typeof inc.bank_account === 'object') {
                    inc.bank_account = inc.bank_account.id || null;
                  }
                  if (inc.client && typeof inc.client === 'object') {
                    inc.client = inc.client.id || null;
                  }
                  // Convert users_permissions_user in estimated_hours
                  if (inc.estimated_hours && inc.estimated_hours.length) {
                    inc.estimated_hours.forEach(hour => {
                      if (hour.users_permissions_user && typeof hour.users_permissions_user === 'object') {
                        hour.users_permissions_user = hour.users_permissions_user.id || null;
                      }
                    });
                  }
                });
              }
            });
          }

          if (this.form.project_phases && this.form.project_phases.length) {
            this.form.project_phases.forEach(ph => {
              if (ph && ph.expenses && ph.expenses.length) {
                ph.expenses.forEach(e => {
                  // Convert expense_type to ID only
                  if (e.expense_type && typeof e.expense_type === 'object') {
                    e.expense_type = e.expense_type.id || null;
                  }
                  // Clean up references
                  if (e.expense && !e.expense.id) {
                    e.expense = null;
                  }
                  if (e.invoice && !e.invoice.id) {
                    e.invoice = null;
                  }
                  // Convert bank_account and client to ID only
                  if (e.bank_account && typeof e.bank_account === 'object') {
                    e.bank_account = e.bank_account.id || null;
                  }
                  if (e.client && typeof e.client === 'object') {
                    e.client = e.client.id || null;
                  }
                });
              }
              if (ph && ph.incomes && ph.incomes.length) {
                ph.incomes.forEach(inc => {
                  // Convert income_type to ID only
                  if (inc.income_type && typeof inc.income_type === 'object') {
                    inc.income_type = inc.income_type.id || null;
                  }
                  // Clean up references
                  if (inc.invoice && !inc.invoice.id) {
                    inc.invoice = null;
                  }
                  if (inc.income && !inc.income.id) {
                    inc.income = null;
                  }
                  // Convert bank_account and client to ID only
                  if (inc.bank_account && typeof inc.bank_account === 'object') {
                    inc.bank_account = inc.bank_account.id || null;
                  }
                  if (inc.client && typeof inc.client === 'object') {
                    inc.client = inc.client.id || null;
                  }
                  // Convert users_permissions_user in estimated_hours
                  if (inc.estimated_hours && inc.estimated_hours.length) {
                    inc.estimated_hours.forEach(hour => {
                      if (hour.users_permissions_user && typeof hour.users_permissions_user === 'object') {
                        hour.users_permissions_user = hour.users_permissions_user.id || null;
                      }
                    });
                  }
                });
              }
            });
          }

          console.log('=== CLEANED FORM FOR POST ===');
          if (this.form.project_original_phases && this.form.project_original_phases.length) {
            this.form.project_original_phases.forEach((ph, idx) => {
              if (ph.incomes && ph.incomes.length) {
                ph.incomes.forEach((inc, incIdx) => {
                  console.log(`Phase ${idx} Income ${incIdx}:`, {
                    income_type: inc.income_type,
                    client: inc.client,
                    bank_account: inc.bank_account
                  });
                });
              }
              if (ph.expenses && ph.expenses.length) {
                ph.expenses.forEach((exp, expIdx) => {
                  console.log(`Phase ${idx} Expense ${expIdx}:`, {
                    expense_type: exp.expense_type,
                    client: exp.client,
                    bank_account: exp.bank_account
                  });
                });
              }
            });
          }

          console.log('=== FINAL CHECK BEFORE POST ===');
          console.log('this.form.id:', this.form.id);
          console.log('this.form.name:', this.form.name);
          console.log('this.form.project_original_phases_info:', JSON.stringify(this.form.project_original_phases_info, null, 2));
          console.log('this.form.project_phases_info:', JSON.stringify(this.form.project_phases_info, null, 2));
          console.log('this.form.project_original_phases count:', this.form.project_original_phases?.length);
          console.log('this.form.project_phases count:', this.form.project_phases?.length);
          
          if (this.form.project_original_phases && this.form.project_original_phases.length > 0) {
            const firstPhase = this.form.project_original_phases[0];
            console.log('First phase sample:');
            console.log('  - id:', firstPhase.id);
            console.log('  - name:', firstPhase.name);
            console.log('  - keys:', Object.keys(firstPhase));
            console.log('  - has created_at:', firstPhase.hasOwnProperty('created_at'));
            console.log('  - has updated_at:', firstPhase.hasOwnProperty('updated_at'));
            
            if (firstPhase.incomes && firstPhase.incomes.length > 0) {
              const firstIncome = firstPhase.incomes[0];
              console.log('  First income sample:');
              console.log('    - id:', firstIncome.id);
              console.log('    - income_type:', firstIncome.income_type);
              console.log('    - client:', firstIncome.client);
              console.log('    - bank_account:', firstIncome.bank_account);
              console.log('    - has created_at:', firstIncome.hasOwnProperty('created_at'));
              
              if (firstIncome.estimated_hours && firstIncome.estimated_hours.length > 0) {
                const firstHour = firstIncome.estimated_hours[0];
                console.log('    First estimated_hour sample:');
                console.log('      - id:', firstHour.id);
                console.log('      - users_permissions_user:', firstHour.users_permissions_user);
                console.log('      - has created_at:', firstHour.hasOwnProperty('created_at'));
              }
            }
            
            if (firstPhase.expenses && firstPhase.expenses.length > 0) {
              const firstExpense = firstPhase.expenses[0];
              console.log('  First expense sample:');
              console.log('    - id:', firstExpense.id);
              console.log('    - expense_type:', firstExpense.expense_type);
              console.log('    - client:', firstExpense.client);
              console.log('    - bank_account:', firstExpense.bank_account);
              console.log('    - has created_at:', firstExpense.hasOwnProperty('created_at'));
            }
          }
          console.log('=== END FINAL CHECK ===');

          console.log('About to make POST request to /projects');
          console.log('Request payload keys:', Object.keys(this.form));
          console.log('POST URL:', "projects");
          
          let newProject;
          try {
            newProject = await service({ requiresAuth: true }).post(
              "projects",
              this.form
            );
            console.log('POST request successful!');
            console.log('Response:', newProject);
          } catch (postError) {
            console.error('POST request failed!');
            console.error('Error:', postError);
            console.error('Error response:', postError.response);
            console.error('Error message:', postError.message);
            throw postError; // Re-throw to be caught by outer try-catch
          }

          this.isDuplicating = false; // Reset duplicate mode after save

          if (action === "next") {
            // Wizard: move to next step and switch to edit mode
            this.currentStep++;
            this.$router.push({
              name: "project.edit",
              params: { id: newProject.data.id }
            });
          } else if (action === "closeBudget") {
            // This case shouldn't occur in POST as closeBudget is only available after
            // phases are created and saved (which requires at least one PUT).
            // However, handle it by redirecting to edit mode just in case.
            this.$router.push({
              name: "project.edit",
              params: { id: newProject.data.id }
            });
          } else if (action === "continue") {
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
        console.error('=== SUBMIT ERROR CAUGHT ===');
        console.error('Error object:', err);
        console.error('Error message:', err.message);
        console.error('Error response:', err.response);
        console.error('Error response data:', err.response?.data);
        console.error('Error response status:', err.response?.status);
        console.error('Error config:', err.config);
        console.error('=== END ERROR INFO ===');
        
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
      // Check which view mode we're in
      const isOriginalMode = this.ganttViewMode === "original";
      
      if (isOriginalMode) {
        this.form._project_original_phases_updated = true;
      } else {
        this.form._project_phases_updated = true;
      }
      
      if (!item._hours) {
        return;
      }
      
      const id = item._hours.id;
      const uuid = item._uuid;
      const pid = item._phase.id;

      // Get the appropriate phases array based on view mode
      const phasesArray = isOriginalMode 
        ? this.form.project_original_phases 
        : this.form.project_phases;

      var subphase = item._subphase ? item._subphase : null;
      if (!item._subphase) {
        const phase = phasesArray.find(p => p.id === pid);
        phase.incomes.push({ concept: "SF", estimated_hours: [] });
        subphase = phase.incomes[0];
        subphase.dirty = true;
      }

      const hours = subphase.estimated_hours.find(
        h => (h.id === id && h.id > 0 && !uuid) || (h._uuid === uuid && uuid)
      );
      
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
        subphase.estimated_hours.push(hour);
        subphase.dirty = true;
      }
      
      this.updatingGantt = true;
      if (this.updatingGanttTimer) {
        clearTimeout(this.updatingGanttTimer);
      }

      // Update the appropriate info object based on view mode
      if (isOriginalMode) {
        this.form.project_original_phases_info = {
          deletedPhases: this.deletedPhasesOriginal,
          deletedIncomes: this.deletedIncomesOriginal,
          deletedExpenses: this.deletedExpensesOriginal,
          deletedHours: this.deletedHoursOriginal
        };
      } else {
        this.form.project_phases_info = {
          deletedPhases: this.deletedPhases,
          deletedIncomes: this.deletedIncomes,
          deletedExpenses: this.deletedExpenses,
          deletedHours: this.deletedHours
        };
      }

      this.updatingGanttTimer = setTimeout(() => {
        this.updatingGantt = false;
      }, 800);
    },
    ganttItemDelete(item) {
      // Check which view mode we're in
      const isOriginalMode = this.ganttViewMode === "original";
      
      if (isOriginalMode) {
        this.form._project_original_phases_updated = true;
      } else {
        this.form._project_phases_updated = true;
      }
      
      const id = item._hours.id;
      const pid = item._phase.id;
      const sid = item._subphase.id;

      // Add to appropriate deletedHours array
      if (isOriginalMode) {
        this.deletedHoursOriginal.push(id);
      } else {
        this.deletedHours.push(id);
      }

      // Get the appropriate phases array based on view mode
      const phasesArray = isOriginalMode 
        ? this.form.project_original_phases 
        : this.form.project_phases;
        
      const phase = phasesArray.find(p => p.id === pid);
      const income = phase.incomes.find(s => s.id === sid);
      income.estimated_hours = income.estimated_hours.filter(h => h.id !== id);

      // Update the appropriate info object
      if (isOriginalMode) {
        this.form.project_original_phases_info = {
          deletedPhases: this.deletedPhasesOriginal,
          deletedIncomes: this.deletedIncomesOriginal,
          deletedExpenses: this.deletedExpensesOriginal,
          deletedHours: this.deletedHoursOriginal
        };
      } else {
        this.form.project_phases_info = {
          deletedPhases: this.deletedPhases,
          deletedIncomes: this.deletedIncomes,
          deletedExpenses: this.deletedExpenses,
          deletedHours: this.deletedHours
        };
      }
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
    toggleGanttView() {
      this.ganttViewMode = this.ganttViewMode === "original" ? "estimated" : "original";
      // Save preference to localStorage
      localStorage.setItem("ganttViewMode", this.ganttViewMode);
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
    },
    updateGrantableYears(years) {
      this.form.grantable_years = years;
    },
    duplicateProject() {
      this.$buefy.dialog.confirm({
        title: 'Duplicar projecte',
        message: `<p><strong>Es duplicarà el projecte amb:</strong></p>
          <ul style="margin-left: 20px; margin-top: 10px;">
            <li>✓ Nom + " (còpia)"</li>
            <li>✓ Totes les fases originals i d'execució</li>
            <li>✓ Tots els ingressos i despeses previstos</li>
            <li>✓ Totes les hores planificades</li>
            <li>✗ Sense documents adjunts</li>
            <li>✗ Sense factures ni justificacions</li>
          </ul>
          <p style="margin-top: 15px;"><strong>Vols moure totes les dates +1 any o mantenir-les?</strong></p>`,
        confirmText: 'Moure dates +1 any',
        cancelText: 'Mantenir dates originals',
        type: 'is-info',
        hasIcon: true,
        onConfirm: () => this.performDuplicate(true),
        onCancel: () => this.performDuplicate(false)
      });
    },
    performDuplicate(moveDates) {
      console.log('=== DUPLICATE PROJECT - moveDates:', moveDates);
      
      // Create a deep copy of the current form
      const duplicatedForm = JSON.parse(JSON.stringify(this.form));
      
      console.log('Original date_start:', duplicatedForm.date_start);
      console.log('Original documents count:', duplicatedForm.documents?.length);
      
      // Disable dirty checking temporarily
      this.dirtyEnabled = false;
      
      // Reset ID and metadata for new project creation
      duplicatedForm.id = null;
      delete duplicatedForm.created_at;
      delete duplicatedForm.updated_at;
      delete duplicatedForm.created_by;
      delete duplicatedForm.updated_by;
      
      // Add " (còpia)" to the name
      duplicatedForm.name = duplicatedForm.name + ' (còpia)';
      
      // Helper function to adjust and convert dates
      const adjustDate = (dateValue) => {
        if (!dateValue) return null;
        // Parse the date (handles Date objects, ISO strings, and YYYY-MM-DD strings)
        const momentDate = moment(dateValue);
        if (!momentDate.isValid()) {
          console.warn('Invalid date:', dateValue);
          return null;
        }
        
        const originalDate = momentDate.format('YYYY-MM-DD');
        
        // Add 1 year if moveDates is true
        if (moveDates) {
          momentDate.add(1, 'year');
        }
        
        const newDate = momentDate.toDate();
        console.log(`  adjustDate: ${originalDate} -> ${moment(newDate).format('YYYY-MM-DD')} (moved: ${moveDates})`);
        
        // Always return a Date object for datepickers
        return newDate;
      };
      
      // Adjust main project dates
      console.log('Adjusting main project dates...');
      if (duplicatedForm.date_start) {
        duplicatedForm.date_start = adjustDate(duplicatedForm.date_start);
      }
      if (duplicatedForm.date_end) {
        duplicatedForm.date_end = adjustDate(duplicatedForm.date_end);
      }
      if (duplicatedForm.grantable_date) {
        duplicatedForm.grantable_date = adjustDate(duplicatedForm.grantable_date);
      }
      if (duplicatedForm.justification_date) {
        duplicatedForm.justification_date = adjustDate(duplicatedForm.justification_date);
      }
      
      // Remove all documents - must be array, not undefined
      duplicatedForm.documents = [];
      console.log('Documents cleared, count now:', duplicatedForm.documents.length);
      
      // Duplicate and adjust project_original_phases (budget phases)
      if (duplicatedForm.project_original_phases && duplicatedForm.project_original_phases.length) {
        duplicatedForm.project_original_phases = duplicatedForm.project_original_phases.map(phase => {
          const newPhase = { ...phase };
          delete newPhase.id;
          delete newPhase.project;
          delete newPhase.created_at;
          delete newPhase.updated_at;
          delete newPhase.created_by;
          delete newPhase.updated_by;
          newPhase.dirty = true;
          
          // Duplicate incomes with planning hours
          if (newPhase.incomes && newPhase.incomes.length) {
            newPhase.incomes = newPhase.incomes.map(income => {
              const newIncome = { ...income };
              delete newIncome.id;
              delete newIncome.project_original_phase;
              delete newIncome.invoice;
              delete newIncome.grant;
              delete newIncome.income;
              delete newIncome.created_at;
              delete newIncome.updated_at;
              delete newIncome.created_by;
              delete newIncome.updated_by;
              newIncome.dirty = true;
              newIncome.paid = false;
              
              // Adjust dates and convert to Date objects
              if (newIncome.date) {
                newIncome.date = adjustDate(newIncome.date);
              }
              if (newIncome.date_estimate_document) {
                newIncome.date_estimate_document = adjustDate(newIncome.date_estimate_document);
              }
              
              // Keep only income_type ID as minimal object (for Vue reactivity)
              if (newIncome.income_type && typeof newIncome.income_type === 'object') {
                newIncome.income_type = newIncome.income_type.id ? { id: newIncome.income_type.id } : null;
              }
              
              // Keep only client ID as minimal object
              if (newIncome.client && typeof newIncome.client === 'object') {
                newIncome.client = newIncome.client.id ? { id: newIncome.client.id } : null;
              }
              
              // Keep only bank_account ID as minimal object
              if (newIncome.bank_account && typeof newIncome.bank_account === 'object') {
                newIncome.bank_account = newIncome.bank_account.id ? { id: newIncome.bank_account.id } : null;
              }
              
              // Duplicate estimated hours (planning)
              if (newIncome.estimated_hours && newIncome.estimated_hours.length) {
                newIncome.estimated_hours = newIncome.estimated_hours.map(hour => {
                  const newHour = { ...hour };
                  delete newHour.id;
                  delete newHour._uuid;
                  delete newHour.phase_income;
                  delete newHour.created_at;
                  delete newHour.updated_at;
                  delete newHour.created_by;
                  delete newHour.updated_by;
                  newHour.dirty = true;
                  
                  // Keep only user ID as minimal object (for Vue reactivity)
                  if (newHour.users_permissions_user && typeof newHour.users_permissions_user === 'object') {
                    newHour.users_permissions_user = newHour.users_permissions_user.id ? { id: newHour.users_permissions_user.id } : null;
                  }
                  
                  // Adjust hour dates and convert to Date objects
                  if (newHour.from) {
                    newHour.from = adjustDate(newHour.from);
                  }
                  if (newHour.to) {
                    newHour.to = adjustDate(newHour.to);
                  }
                  
                  return newHour;
                });
              } else {
                newIncome.estimated_hours = [];
              }
              
              return newIncome;
            });
          }
          
          // Duplicate expenses
          if (newPhase.expenses && newPhase.expenses.length) {
            newPhase.expenses = newPhase.expenses.map(expense => {
              const newExpense = { ...expense };
              delete newExpense.id;
              delete newExpense.project_original_phase;
              delete newExpense.invoice;
              delete newExpense.ticket;
              delete newExpense.diet;
              delete newExpense.expense;
              delete newExpense.created_at;
              delete newExpense.updated_at;
              delete newExpense.created_by;
              delete newExpense.updated_by;
              newExpense.dirty = true;
              newExpense.paid = false;
              
              // Keep only expense_type ID as minimal object (for Vue reactivity)
              if (newExpense.expense_type && typeof newExpense.expense_type === 'object') {
                newExpense.expense_type = newExpense.expense_type.id ? { id: newExpense.expense_type.id } : null;
              }
              
              // Keep only bank_account ID as minimal object
              if (newExpense.bank_account && typeof newExpense.bank_account === 'object') {
                newExpense.bank_account = newExpense.bank_account.id ? { id: newExpense.bank_account.id } : null;
              }
              
              // Adjust dates and convert to Date objects
              if (newExpense.date) {
                newExpense.date = adjustDate(newExpense.date);
              }
              if (newExpense.date_estimate_document) {
                newExpense.date_estimate_document = adjustDate(newExpense.date_estimate_document);
              }
              
              return newExpense;
            });
          }
          
          return newPhase;
        });
      }
      
      // Duplicate and adjust project_phases (execution phases)
      if (duplicatedForm.project_phases && duplicatedForm.project_phases.length) {
        duplicatedForm.project_phases = duplicatedForm.project_phases.map(phase => {
          const newPhase = { ...phase };
          delete newPhase.id;
          delete newPhase.project;
          delete newPhase.created_at;
          delete newPhase.updated_at;
          delete newPhase.created_by;
          delete newPhase.updated_by;
          newPhase.dirty = true;
          
          // Duplicate incomes
          if (newPhase.incomes && newPhase.incomes.length) {
            newPhase.incomes = newPhase.incomes.map(income => {
              const newIncome = { ...income };
              delete newIncome.id;
              delete newIncome.project_phase;
              delete newIncome.invoice;
              delete newIncome.grant;
              delete newIncome.income;
              delete newIncome.created_at;
              delete newIncome.updated_at;
              delete newIncome.created_by;
              delete newIncome.updated_by;
              newIncome.dirty = true;
              newIncome.paid = false;
              
              // Keep only income_type ID as minimal object (for Vue reactivity)
              if (newIncome.income_type && typeof newIncome.income_type === 'object') {
                newIncome.income_type = newIncome.income_type.id ? { id: newIncome.income_type.id } : null;
              }
              
              // Keep only client ID as minimal object
              if (newIncome.client && typeof newIncome.client === 'object') {
                newIncome.client = newIncome.client.id ? { id: newIncome.client.id } : null;
              }
              
              // Keep only bank_account ID as minimal object
              if (newIncome.bank_account && typeof newIncome.bank_account === 'object') {
                newIncome.bank_account = newIncome.bank_account.id ? { id: newIncome.bank_account.id } : null;
              }
              
              // Adjust dates and convert to Date objects
              if (newIncome.date) {
                newIncome.date = adjustDate(newIncome.date);
              }
              if (newIncome.date_estimate_document) {
                newIncome.date_estimate_document = adjustDate(newIncome.date_estimate_document);
              }
              
              return newIncome;
            });
          }
          
          // Duplicate expenses
          if (newPhase.expenses && newPhase.expenses.length) {
            newPhase.expenses = newPhase.expenses.map(expense => {
              const newExpense = { ...expense };
              delete newExpense.id;
              delete newExpense.project_phase;
              delete newExpense.invoice;
              delete newExpense.ticket;
              delete newExpense.diet;
              delete newExpense.expense;
              delete newExpense.created_at;
              delete newExpense.updated_at;
              delete newExpense.created_by;
              delete newExpense.updated_by;
              newExpense.dirty = true;
              newExpense.paid = false;
              
              // Keep only expense_type ID as minimal object (for Vue reactivity)
              if (newExpense.expense_type && typeof newExpense.expense_type === 'object') {
                newExpense.expense_type = newExpense.expense_type.id ? { id: newExpense.expense_type.id } : null;
              }
              
              // Keep only bank_account ID as minimal object
              if (newExpense.bank_account && typeof newExpense.bank_account === 'object') {
                newExpense.bank_account = newExpense.bank_account.id ? { id: newExpense.bank_account.id } : null;
              }
              
              // Adjust dates and convert to Date objects
              if (newExpense.date) {
                newExpense.date = adjustDate(newExpense.date);
              }
              if (newExpense.date_estimate_document) {
                newExpense.date_estimate_document = adjustDate(newExpense.date_estimate_document);
              }
              
              return newExpense;
            });
          }
          
          return newPhase;
        });
      }
      
      // Adjust periodification years if needed
      if (duplicatedForm.periodification && duplicatedForm.periodification.length && moveDates) {
        duplicatedForm.periodification = duplicatedForm.periodification.map(p => {
          return {
            ...p,
            year: p.year !== 'undefined' ? (parseInt(p.year) + 1).toString() : p.year
          };
        });
      }
      
      // Adjust grantable_years if needed
      if (duplicatedForm.grantable_years && duplicatedForm.grantable_years.length && moveDates) {
        duplicatedForm.grantable_years = duplicatedForm.grantable_years.map(gy => {
          const newGy = { ...gy };
          delete newGy.id;
          if (newGy.year) {
            newGy.year = newGy.year !== 'undefined' ? (parseInt(newGy.year) + 1).toString() : newGy.year;
          }
          return newGy;
        });
      }
      
      // Remove references to other entities that shouldn't be copied
      delete duplicatedForm.emitted_invoices;
      delete duplicatedForm.received_grants;
      delete duplicatedForm.received_invoices;
      delete duplicatedForm.tickets;
      delete duplicatedForm.diets;
      delete duplicatedForm.received_incomes;
      delete duplicatedForm.received_expenses;
      delete duplicatedForm.activities;
      delete duplicatedForm.treasury_annotations;
      delete duplicatedForm.children;
      
      // Clear calculated totals
      delete duplicatedForm.incomes_expenses;
      delete duplicatedForm.total_real_incomes_expenses;
      delete duplicatedForm.total_incomes;
      delete duplicatedForm.total_real_incomes;
      delete duplicatedForm.total_expenses;
      delete duplicatedForm.total_estimated_hours_price;
      delete duplicatedForm.total_real_expenses;
      delete duplicatedForm.total_real_hours_price;
      delete duplicatedForm.total_estimated_hours;
      delete duplicatedForm.total_real_hours;
      delete duplicatedForm.total_expenses_vat;
      delete duplicatedForm.total_real_expenses_vat;
      delete duplicatedForm.allByYear;
      
      // Mark as not existing (new project)
      this.isProfileExists = false;
      
      // Clear deleted arrays
      this.deletedPhases = [];
      this.deletedIncomes = [];
      this.deletedExpenses = [];
      this.deletedPhasesOriginal = [];
      this.deletedIncomesOriginal = [];
      this.deletedExpensesOriginal = [];
      this.deletedHoursOriginal = [];
      
      // Log final state before assignment
      console.log('=== FINAL DUPLICATED FORM STATE ===');
      console.log('ID:', duplicatedForm.id);
      console.log('Name:', duplicatedForm.name);
      console.log('date_start:', duplicatedForm.date_start);
      console.log('date_end:', duplicatedForm.date_end);
      console.log('Documents count:', duplicatedForm.documents?.length);
      console.log('Original phases count:', duplicatedForm.project_original_phases?.length);
      console.log('Execution phases count:', duplicatedForm.project_phases?.length);
      
      // Log detailed phase structure to debug backend error
      if (duplicatedForm.project_original_phases?.[0]) {
        const phase = duplicatedForm.project_original_phases[0];
        console.log('=== SAMPLE PHASE STRUCTURE ===');
        console.log('Phase keys:', Object.keys(phase));
        console.log('Phase ID:', phase.id);
        console.log('Phase project:', phase.project);
        console.log('Phase dirty:', phase.dirty);
        console.log('Phase has created_at:', phase.hasOwnProperty('created_at'));
        console.log('Phase has updated_at:', phase.hasOwnProperty('updated_at'));
        
        if (phase.incomes?.[0]) {
          const income = phase.incomes[0];
          console.log('=== SAMPLE INCOME STRUCTURE ===');
          console.log('Income keys:', Object.keys(income));
          console.log('Income ID:', income.id);
          console.log('Income date:', income.date);
          console.log('Income income_type:', income.income_type);
          console.log('Income has created_at:', income.hasOwnProperty('created_at'));
          console.log('Income client:', income.client);
          console.log('Income bank_account:', income.bank_account);
          
          if (income.estimated_hours?.[0]) {
            const hour = income.estimated_hours[0];
            console.log('=== SAMPLE ESTIMATED HOUR STRUCTURE ===');
            console.log('Hour keys:', Object.keys(hour));
            console.log('Hour ID:', hour.id);
            console.log('Hour users_permissions_user:', hour.users_permissions_user);
            console.log('Hour has created_at:', hour.hasOwnProperty('created_at'));
          }
        }
        
        if (phase.expenses?.[0]) {
          const expense = phase.expenses[0];
          console.log('=== SAMPLE EXPENSE STRUCTURE ===');
          console.log('Expense keys:', Object.keys(expense));
          console.log('Expense ID:', expense.id);
          console.log('Expense expense_type:', expense.expense_type);
          console.log('Expense has created_at:', expense.hasOwnProperty('created_at'));
        }
      }
      
      // Set the form to the duplicated data
      this.form = duplicatedForm;
      
      // Initialize phase info structures for new project (empty deletions)
      this.form.project_original_phases_info = {
        deletedPhases: [],
        deletedIncomes: [],
        deletedExpenses: [],
        deletedHours: []
      };
      this.form.project_phases_info = {
        deletedPhases: [],
        deletedIncomes: [],
        deletedExpenses: [],
        deletedHours: []
      };
      
      console.log('Form assigned. Current form.date_start:', this.form.date_start);
      console.log('Current form.documents count:', this.form.documents?.length);
      console.log('Phase info structures initialized with empty arrays');
      
      // Enter duplicate mode
      this.isDuplicating = true;
      
      // Increment formKey to force complete re-render of the entire form
      this.formKey++;
      
      console.log('Form key incremented to', this.formKey, '- forcing complete re-render');
      
      // Re-enable dirty checking after render
      this.$nextTick(() => {
        console.log('After re-render - form state:', {
          date_start: this.form.date_start,
          date_end: this.form.date_end,
          documents_count: this.form.documents?.length
        });
      });
      
      // Re-enable dirty checking and set dirty
      setTimeout(() => {
        this.dirtyEnabled = true;
        this.userHasInteracted = true; // Duplication counts as user interaction
        this.dirty = true;
      }, 100);
      
      // Show notification
      this.$buefy.snackbar.open({
        message: `Projecte duplicat correctament.${moveDates ? ' Les dates s\'han mogut +1 any.' : ''} Fes clic a "Confirmar duplicat" per guardar.`,
        duration: 6000,
        type: 'is-success',
        queue: false
      });
    },
    cancelDuplicate() {
      this.$buefy.dialog.confirm({
        title: 'Cancel·lar duplicació',
        message: 'Estàs segur/a que vols cancel·lar la duplicació? Es perdran tots els canvis.',
        confirmText: 'Sí, cancel·lar',
        cancelText: 'No',
        type: 'is-danger',
        hasIcon: true,
        onConfirm: () => {
          this.isDuplicating = false;
          this.userHasInteracted = false; // Reset interaction flag when cancelling
          this.getData();
        }
      });
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

/* Step indicator styles */
.steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.step-item {
  flex: 1;
  display: flex;
  align-items: center;
  position: relative;
}

.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 50%;
  right: -50%;
  top: 15px;
  height: 2px;
  background: #dbdbdb;
  z-index: -1;
}

.step-item.is-completed:not(:last-child)::after {
  background: #48c774;
}

.step-marker {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #dbdbdb;
  color: #4a4a4a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 10px;
  flex-shrink: 0;
}

.step-item.is-active .step-marker {
  background: #3273dc;
  color: white;
}

.step-item.is-completed .step-marker {
  background: #48c774;
  color: white;
}

.step-details {
  flex-grow: 1;
}

.step-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #4a4a4a;
  margin: 0;
}

.step-item.is-active .step-title {
  color: #3273dc;
  font-weight: 600;
}

.step-item.is-completed .step-title {
  color: #48c774;
}
</style>
