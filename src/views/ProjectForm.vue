<template>
  <!-- input/change anywhere in the page (phases, periodification...) count as
       user interaction for the "unsaved changes" tracking, not only the data form -->
  <div class="project-form" @input.capture="enableUserInteraction" @change.capture="enableUserInteraction">
    <modal-box-duplicate-project
      :is-active="isDuplicateModalActive"
      @confirm="duplicateConfirmed"
      @cancel="isDuplicateModalActive = false"
    />
    <modal-box
      :is-active="isDeleteModalActive"
      :trash-object-name="form.name"
      v-bind="projectTrashDialog"
      @confirm="deleteConfirmed"
      @cancel="isDeleteModalActive = false"
    />
    <title-bar :title-stack="titleStack" :subtitle="isCreationMode && !isDuplicating ? `Projecte nou · pas ${currentStep} de 4` : ''">
      <template v-if="tabsEnabled && projectMeta" #subtitle>
        <span v-if="form.project_state && form.project_state.name" class="tag project-state-tag">{{ form.project_state.name }}</span>
        {{ projectMeta }}
      </template>
    </title-bar>
    <section class="section is-main-section">
      <wizard-steps
        v-if="isCreationMode && !isDuplicating && !isLoading"
        :steps="wizardSteps"
        :current="currentStep"
        label="Passos per crear el projecte"
      />
      <nav v-if="tabsEnabled" class="tabs project-tabs" aria-label="Seccions del projecte">
        <ul>
          <li v-for="tab in projectTabs" :key="tab.id" :class="{ 'is-active': activeTab === tab.id }">
            <a :href="'#' + $route.path + '?tab=' + tab.id" :aria-current="activeTab === tab.id ? 'page' : null" @click.prevent="selectTab(tab.id)">{{ tab.label }}</a>
          </li>
        </ul>
      </nav>
      <!-- issues/015: undated lines end up in a "9999" periodification year -->
      <b-notification
        v-if="!isLoading && !isCreationMode && undatedLines.length"
        type="is-warning"
        :closable="false"
        class="mb-4"
      >
        <p>
          <strong>{{ undatedLines.length }} {{ undatedLines.length === 1 ? "línia no té" : "línies no tenen" }} data.</strong>
          Els seus imports surten com a "Sense data" a les previsions, la periodificació, la tresoreria... Poseu-los una data:
        </p>
        <ul class="undated-lines">
          <li v-for="(l, i) in undatedLines" :key="i">
            {{ l.type === "income" ? "Ingrés" : "Despesa" }} ·
            {{ l.phase || "-" }} · {{ l.concept || "(sense concepte)" }}
          </li>
        </ul>
      </b-notification>
      <div class="columns" :class="{ 'is-tabbed': tabsEnabled }">
        <div v-show="showTab('dades')" class="column" :class="newSummary ? 'is-12' : 'is-two-thirds'">
          <card-component :title="formCardTitle" class="tile is-child">
            <form 
              @submit.prevent="submitAndContinue" 
              @focus.capture="enableUserInteraction"
              @input.capture="enableUserInteraction"
              @change.capture="enableUserInteraction"
              v-if="!isLoading" 
              :key="formKey"
            
              :class="{ 'a-form': newSummary }"
            >
              <h3 v-if="newSummary" class="form-section-title">Identificació</h3>
              <b-field label="Codi *" horizontal :type="nameError ? 'is-danger' : null" :message="nameError">
                <b-input v-model="form.name" placeholder="Codi" required @update:model-value="nameError = ''" />
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

              <div v-if="wizardBasics" class="optional-toggle">
                <b-button
                  size="is-small"
                  :icon-left="showOptionalFields ? 'chevron-up' : 'chevron-down'"
                  :aria-expanded="showOptionalFields ? 'true' : 'false'"
                  @click="showOptionalFields = !showOptionalFields"
                >
                  {{ showOptionalFields ? "Amaga les dades opcionals" : "Més dades (opcionals)" }}
                </b-button>
                <span>Tipus, clientes, propòsit, estratègies, subvencions… Les pots omplir ara o més endavant.</span>
              </div>
              <div v-show="!wizardBasics || showOptionalFields" class="optional-fields">
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
              <b-field
                label="Notes internes"
                message="Notes internes del projecte"
                horizontal
              >
                <b-input
                  type="textarea"
                  v-model="form.internal_notes"
                  placeholder="Notes internes"
                />
              </b-field>
              <hr />
              <h3 v-if="newSummary" class="form-section-title">Relacions i classificació</h3>
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
              <b-field label="Probabilitat" horizontal>
                <b-select v-model="form.project_likelihood.id" placeholder="Probabilitat">
                  <option
                    v-for="(s, index) in project_likelihoods"
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
              <h3 v-if="newSummary" class="form-section-title">Gestió del projecte</h3>
              
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
              <h3 v-if="newSummary" class="form-section-title">Subvencions</h3>
              
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
                    :start-month="grantableStartMonth"
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
                  @update:model-value="
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
                  @update:model-value="
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
                  @update:model-value="
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
                  @update:model-value="
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
                  @update:model-value="
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
              <h3 v-if="newSummary" class="form-section-title">Documents</h3>
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
              </div>
              <hr v-if="!isCreationMode" />
              <div class="is-flex">
                <!-- Normal mode: regular save buttons (with tabs: the save bar) -->
                <template v-if="!isDuplicating && !isCreationMode && !tabsEnabled">
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
        <div v-show="showTab('resum')" class="column" :class="tabsEnabled || (isCreationMode && !isDuplicating) ? 'is-12 project-summary' : 'is-one-third'" v-if="!isLoading && (!isCreationMode || (isCreationMode && currentStep > 2))">
          <template v-if="isProfileExists && newSummary">
            <div v-if="form.dirty || hasBeenDirty" class="notification is-warning summary-dirty" role="status">
              <span v-if="form.dirty">
                Els totals del projecte s'estan actualitzant en un procés extern. Pot ser que temporalment no
                siguin correctes. Torna a carregar el projecte en una estona.
              </span>
              <span v-else>Recarrega el projecte per veure els totals correctes.</span>
              <b-button v-if="!form.dirty && hasBeenDirty" size="is-small" icon-left="refresh" @click.prevent="refresh">Recarrega</b-button>
            </div>
            <project-summary-cards v-model:year="allByYearYear" :totals="totals" :years="summaryYears" />
          </template>
          <card-component
            v-if="isProfileExists && !newSummary"
            title="Resum financer"
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
                  <div class="has-text-right summary-hours">{{ formatHours(totals && totals.total_original_hours ? totals.total_original_hours : 0) }}</div>
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
                  <div class="has-text-right summary-hours">{{ formatHours(totals && totals.total_estimated_hours ? totals.total_estimated_hours : 0) }}</div>
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
                  <div class="has-text-right summary-hours">{{ formatHours(totals && totals.total_real_hours ? totals.total_real_hours : 0) }}</div>
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
                {{ periodificationYearLabel(y.year) }}
              </div>
            </div>
          </card-component>

          <section v-if="isProfileExists && !isCreationMode && newSummary" class="card treasury-summary" aria-labelledby="treasury-summary-title">
            <header class="card-header">
              <h2 id="treasury-summary-title" class="card-header-title">Tresoreria del projecte</h2>
            </header>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th scope="col">Moviment</th>
                    <th scope="col" class="has-text-right">Cobrat / pagat</th>
                    <th scope="col" class="has-text-right">Pendent</th>
                    <th scope="col" class="has-text-right">Total previst</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Cobraments</th>
                    <td class="has-text-right" :class="'has-text-' + sign(treasuryTotals.collected)" :aria-label="'Cobrat ' + formatMoney(treasuryTotals.collected)">{{ formatMoney(treasuryTotals.collected) }}</td>
                    <td class="has-text-right" :aria-label="'Pendent de cobrar ' + formatMoney(treasuryTotals.toCollect)">{{ formatMoney(treasuryTotals.toCollect) }}</td>
                    <td class="has-text-right">{{ formatMoney(treasuryTotals.collected + treasuryTotals.toCollect) }}</td>
                  </tr>
                  <tr>
                    <th scope="row">Pagaments</th>
                    <td class="has-text-right" :class="'has-text-' + sign(-treasuryTotals.paid)" :aria-label="'Pagat ' + formatMoney(-treasuryTotals.paid)">{{ formatMoney(-treasuryTotals.paid) }}</td>
                    <td class="has-text-right" :aria-label="'Pendent de pagar ' + formatMoney(-treasuryTotals.toPay)">{{ formatMoney(-treasuryTotals.toPay) }}</td>
                    <td class="has-text-right">{{ formatMoney(-(treasuryTotals.paid + treasuryTotals.toPay)) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Saldo</th>
                    <td class="has-text-right" :class="'has-text-' + sign(treasuryTotals.collected - treasuryTotals.paid)">{{ formatMoney(treasuryTotals.collected - treasuryTotals.paid) }}</td>
                    <td class="has-text-right">{{ formatMoney(treasuryTotals.toCollect - treasuryTotals.toPay) }}</td>
                    <td class="has-text-right" :class="'has-text-' + sign(treasuryTotals.collected + treasuryTotals.toCollect - treasuryTotals.paid - treasuryTotals.toPay)">{{ formatMoney(treasuryTotals.collected + treasuryTotals.toCollect - treasuryTotals.paid - treasuryTotals.toPay) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          <card-component
            v-if="isProfileExists && !isCreationMode && !newSummary"
            title="Resum de tresoreria"
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
        title="Fases i pressupost original"
        v-show="showTab('pressupost')"
        :closeIcon="true"
        :content-visible="isCreationMode"
      >
        <b-notification v-if="form.is_mother && !hasLegacyMotherPhases" type="is-info" :closable="false" class="mb-4">
          Aquest és un projecte mare. Les fases que es mostren són l'agregació de tots els projectes fills. No es poden editar directament.
        </b-notification>
        <b-notification v-if="form.is_mother && hasLegacyMotherPhases" type="is-warning" :closable="false" class="mb-4">
          <strong>ATENCIÓ: Dades heretades detectades!</strong><br>
          Aquest és un projecte mare amb fases pròpies (dades heretades del sistema antic). Els projectes mare només haurien de contenir l'agregació de les fases dels projectes fills.<br>
          <strong>Si us plau, elimina manualment les fases que pertanyen directament a aquest projecte.</strong> Les fases correctes són només les que provenen dels projectes fills.
        </b-notification>

        <project-phases
          :key="'original-' + formKey"
          :form="form"
          :project-phases="form.project_original_phases"
          :contacts="clients"
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
              && (form.creation_step === '' || form.creation_step === 'completed')
          "
        >
          <b-button type="is-warning" @click="closeQuoteFromOriginal">
            Crear Execució de Pressupost
          </b-button>
        </b-field>

        <hr v-if="!isDuplicating && !tabsEnabled && !isCreationMode" />
        <div class="is-flex" v-if="!isDuplicating && !tabsEnabled && !isCreationMode">
          <!-- Normal mode: regular save buttons (with tabs: the save bar) -->
          <template v-if="!isCreationMode && !tabsEnabled">
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
            !isCreationMode
        "
        title="Execució del pressupost"
        v-show="showTab('pressupost')"
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
        <!-- <b-field v-if="!form.is_mother">
          <b-button
            type="is-primary is-outlined"
            :loading="isLoading"
            @click="phasesEditable = !phasesEditable"
            class="mr-2"
          >
            <template v-if="!phasesEditable">Modificar pressupost</template>
            <template v-else>Tancar pressupost</template>
          </b-button>
        </b-field> -->

        <project-phases
          :key="'execution-' + formKey"
          :form="form"
          :project-phases="form.project_phases"
          :contacts="clients"
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
        <!-- <b-field
          v-if="
            !form.is_mother &&
            form.project_phases.length &&
              form.project_original_phases.length === 0
          "
        >
          <b-button type="is-warning" @click="closeQuote">
            Tancar Pressupost
          </b-button>
        </b-field> -->

        <hr v-if="!isDuplicating && !tabsEnabled && !isCreationMode" />
        <div class="is-flex" v-if="!isDuplicating && !tabsEnabled && !isCreationMode">
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

      <div
        v-if="tabsEnabled && showTab('periodificacio') && !isLoading && !hasPeriodificationRows"
        class="card tab-empty"
      >
        <p><b>Aquest projecte no periodifica manualment els ingressos i les despeses.</b></p>
        <p>Cada import compta l'any de la seva data. Si cal repartir-los entre anys, activa «Periodificació d'ingressos i despeses» a les dades del projecte.</p>
        <b-button size="is-small" @click="selectTab('dades')">Ves a Dades</b-button>
      </div>
      <card-component
        v-if="!isLoading && hasPeriodificationRows && !isCreationMode"
        title="Periodificació d'ingressos i despeses"
        v-show="showTab('periodificacio')"
      >
        <p class="period-help">
          Ajusta quina part dels ingressos i les despeses compta a cada any (en positiu o en negatiu).
          L'últim any, {{ periodificationYearLabel(form.periodification[form.periodification.length - 1].year) }}, compensa automàticament perquè el total del projecte no canviï.
        </p>
        <div class="table-wrap">
          <table class="table period-table">
            <thead>
              <tr>
                <th scope="col" rowspan="2">Any</th>
                <th scope="colgroup" colspan="2" class="period-group">Previst</th>
                <th scope="colgroup" colspan="2" class="period-group">Executat</th>
              </tr>
              <tr>
                <th scope="col" class="has-text-right">Ajust d'ingressos</th>
                <th scope="col" class="has-text-right">Ajust de despeses</th>
                <th scope="col" class="has-text-right">Ajust d'ingressos</th>
                <th scope="col" class="has-text-right">Ajust de despeses</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(y, i) in form.periodification.filter(
                  (p, i) => i < form.periodification.length - 1
                )"
                :key="'period-' + y.year"
                :class="{ 'is-undated': isUndatedYear(y.year) }"
              >
                <th scope="row">
                  {{ periodificationYearLabel(y.year) }}
                  <b-icon
                    v-if="isUndatedYear(y.year)"
                    icon="alert"
                    type="is-warning"
                    size="is-small"
                    title="Imports de línies sense data"
                  />
                </th>
                <td>
                  <b-input
                    v-model="y.incomes"
                    class="period-input"
                    :aria-label="`Ajust d'ingressos previstos ${periodificationYearLabel(y.year)}`"
                    @update:model-value="changeLine(y, 'incomes', y.incomes)"
                  />
                </td>
                <td>
                  <b-input
                    v-model="y.expenses"
                    class="period-input"
                    :aria-label="`Ajust de despeses previstes ${periodificationYearLabel(y.year)}`"
                    @update:model-value="changeLine(y, 'expenses', y.expenses)"
                  />
                </td>
                <td>
                  <b-input
                    v-model="y.real_incomes"
                    class="period-input"
                    :aria-label="`Ajust d'ingressos executats ${periodificationYearLabel(y.year)}`"
                    @update:model-value="changeLine(y, 'real_incomes', y.real_incomes)"
                  />
                </td>
                <td>
                  <b-input
                    v-model="y.real_expenses"
                    class="period-input"
                    :aria-label="`Ajust de despeses executades ${periodificationYearLabel(y.year)}`"
                    @update:model-value="changeLine(y, 'real_expenses', y.real_expenses)"
                  />
                </td>
              </tr>
              <tr
                v-for="y in form.periodification.filter(
                  (p, i) => i == form.periodification.length - 1
                )"
                :key="'period-last-' + y.year"
                class="period-auto"
              >
                <th scope="row">
                  {{ periodificationYearLabel(y.year) }}
                  <span class="tag">automàtic</span>
                </th>
                <td class="has-text-right">{{ formatNumber(y.incomes, 2, 2) }}</td>
                <td class="has-text-right">{{ formatNumber(y.expenses, 2, 2) }}</td>
                <td class="has-text-right">{{ formatNumber(y.real_incomes, 2, 2) }}</td>
                <td class="has-text-right">{{ formatNumber(y.real_expenses, 2, 2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <hr v-if="!isDuplicating && !tabsEnabled && !isCreationMode" />
        <div class="is-flex" v-if="!isDuplicating && !tabsEnabled && !isCreationMode">
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
        v-if="!isLoading && !isCreationMode"
        title="Moviments d'ingressos i despeses"
        v-show="showTab('moviments')"
        class="ztile is-child mt-2"
        :content-visible="true"
      >
        <b-table :data="documents || []">
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
            :custom-sort="sortDocumentsByProjectAmount"
            numeric
            v-slot="props"
            class="has-text-right"
          >
            <!-- the part of the document on this project's lines (issues/257) -->
            <money-format
              :value="documentProjectAmount(props.row) * props.row.multiplier"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value="false"
              :hide-subunits="false"
            >
            </money-format>
            <p
              v-if="documentProjectAmount(props.row) !== (Number(props.row.document.total_base) || 0)"
              class="is-size-7 has-text-grey"
            >
              de {{ formatMoney(props.row.document.total_base * props.row.multiplier) }}
            </p>
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
            label="Data de pagament"
            field="document.paid_date"
            sortable
            v-slot="props"
          >
            {{ formatDate(props.row.document.paid_date) }}
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
          <template #empty>
            <p class="has-text-grey">Encara no hi ha cap document d'ingrés o despesa lligat a aquest projecte.</p>
          </template>
        </b-table>
      </card-component>

      <card-component
        v-if="!isLoading && !isUpdating && !form.children && (!isCreationMode || currentStep >= 3)"
        :title="isCreationMode && !isDuplicating ? 'Planificació' : ganttViewMode === 'original' ? 'Planificació original' : 'Planificació prevista'"
        v-show="showTab('planificacio')"
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
            showTab('planificacio') &&
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
          :view-mode-locked="isCreationMode && !isDuplicating"
          @update:view-mode="toggleGanttView"
          @gantt-item-update="ganttItemUpdate"
          @gantt-item-delete="ganttItemDelete"
        />
        <span class="bg-info" v-else
          >Es necessari tenir fases i guardar el projecte amb un pressupost
          tancat per accedir a la planificació</span
        >
        <hr v-if="!isDuplicating && !tabsEnabled && !isCreationMode" />
        <div class="is-flex" v-if="!isDuplicating && !tabsEnabled && !isCreationMode">
          <!-- Normal mode: regular save buttons (with tabs: the save bar) -->
          <template v-if="!isCreationMode && !tabsEnabled">
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

      <!-- Gantt charts for child projects in mother projects -->
      <div v-if="showTab('planificacio') && !isLoading && !isUpdating && form.is_mother && form.children && form.children.children && form.children.children.length && !isCreationMode">
        <!-- Control buttons for non-open child projects -->
        <card-component
          v-if="closedChildren.length > 0"
          title="Projectes fills no actius"
          class="mt-4"
        >
          <div class="notification is-info is-light">
            <p class="mb-3">Els següents projectes fills no estan actius. Pots mostrar o ocultar la seva planificació:</p>
            <div class="buttons">
              <b-button
                v-for="child in closedChildren"
                :key="'toggle-' + child.id"
                :type="isClosedChildVisible(child.id) ? 'is-primary' : 'is-light'"
                size="is-small"
                @click="toggleClosedChild(child.id)"
                class="mr-2 mb-2"
              >
                <b-icon :icon="isClosedChildVisible(child.id) ? 'eye' : 'eye-off'" size="is-small"></b-icon>
                <span class="ml-1">{{ child.name }} <span v-if="child.project_state && child.project_state.name" class="has-text-grey">({{ child.project_state.name }})</span></span>
              </b-button>
            </div>
          </div>
        </card-component>

        <!-- Display visible child projects -->
        <card-component
          v-for="child in visibleChildren"
          :key="'child-gantt-' + child.id"
          :title="'Planificació del projecte fill: ' + child.name + (ganttViewMode === 'original' ? ' · original' : ' · prevista')"
          class="mt-4"
          header-icon="swap-horizontal"
          @header-icon-click="toggleGanttView"
        >
          <div class="mb-3 is-flex is-justify-content-space-between is-align-items-center">
            <router-link
              :to="{ name: 'project.edit', params: { id: child.id } }"
              class="button is-small is-info"
            >
              <b-icon icon="open-in-new" size="is-small"></b-icon>
              <span>Obrir projecte fill</span>
            </router-link>

            <b-button
              type="is-success"
              size="is-small"
              :loading="savingChildProjects[child.id]"
              :disabled="!hasChildChanges(child.id)"
              @click="saveChildProject(child.id)"
            >
              <b-icon icon="content-save" size="is-small"></b-icon>
              <span>Guardar canvis de planificació</span>
            </b-button>
          </div>

          <project-gannt
            v-if="
              child.id &&
              ((ganttViewMode === 'original' && child.project_original_phases && child.project_original_phases.length && child.project_original_phases[0].id) ||
               (ganttViewMode === 'estimated' && child.project_phases && child.project_phases.length && child.project_phases[0].id))
            "
            :key="'gantt-child-' + ganttViewMode + '-' + child.id"
            class="left-container"
            :project="child"
            :users="leaders"
            :tasks="{}"
            :view-mode="ganttViewMode"
            :editable="true"
            @update:view-mode="toggleGanttView"
            @gantt-item-update="item => childGanttItemUpdate(child.id, item)"
            @gantt-item-delete="item => childGanttItemDelete(child.id, item)"
          />
          <div v-else class="notification is-warning">
            Aquest projecte fill no té fases {{ ganttViewMode === 'original' ? 'originals' : 'previstes' }} definides.
          </div>
        </card-component>
      </div>

      <card-component
        v-if="!isLoading && !isCreationMode"
        title="Cobraments i pagaments"
        v-show="showTab('moviments')"
        class="ztile is-child mt-2"
      >
        <b-field class="movements-paging">
          <b-select v-model="perPage" :disabled="!isPaginated" class="mr-2" aria-label="Moviments per pàgina">
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
          :data="treasury || []"
          :per-page="parseInt(perPage)"
          :paginated="isPaginated"
          pagination-position="both"
        >
          <b-table-column
            label="Data"
            field="document.date"
            sortable
            cell-class="is-nowrap"
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
              class="tag is-success is-light"
            >
              Cobrament
            </span>
            <span v-else-if="props.row.docType === 'income'" class="tag is-warning">
              Cobrament esperat
            </span>
            <span
              v-else-if="
                props.row.docType === 'expense' &&
                  props.row.document &&
                  props.row.document.paid
              "
              class="tag"
            >
              Pagament
            </span>
            <span v-else-if="props.row.docType === 'expense'" class="tag is-warning">
              Pagament esperat
            </span>
            <span v-else-if="props.row.docType === 'treasury'" class="tag is-info is-light">
              Operació de tresoreria
            </span>
          </b-table-column>
          <b-table-column
            label="Concepte"
            field="document.concept"
            sortable
            cell-class="movement-concept"
            v-slot="props"
          >
            <div class="movement-concept-text" :title="props.row.document.concept || null">
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
            </div>
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
            <span class="movement-amount" :class="'has-text-' + sign(props.row.document.total_amount * props.row.multiplier)">
              {{ formatMoney(props.row.document.total_amount * props.row.multiplier) }}
            </span>
          </b-table-column>
          <template #empty>
            <p class="has-text-grey">Encara no hi ha cap cobrament ni pagament d'aquest projecte.</p>
          </template>
        </b-table>
      </card-component>

      <card-component
        v-if="!isLoading && !form.children && !isCreationMode"
        title="Tasques"
        v-show="showTab('tasques')"
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

      <!-- Redesign A: wizard bar of the new project (same actions as the old step buttons) -->
      <div v-if="isCreationMode && !isDuplicating && !isLoading" class="savebar wizard-bar">
        <span class="savebar-state">Pas {{ currentStep }} de {{ wizardSteps.length }} · {{ wizardSteps[currentStep - 1].title }}</span>
        <span v-if="currentStep === 4" class="wizard-bar-note">
          Pots tornar a les fases o a la planificació, o tancar el pressupost per acabar.
        </span>
        <div class="savebar-actions">
          <b-button v-if="currentStep > 1 && currentStep < 4" icon-left="arrow-left" @click="previousStep">Enrere</b-button>
          <template v-if="currentStep === 4">
            <b-button @click="continueEditing('phases')">Editar fases</b-button>
            <b-button @click="continueEditing('planning')">Editar planificació</b-button>
            <b-button type="is-primary" :loading="isLoading" icon-left="check" @click="closeBudget">Tancar pressupost</b-button>
          </template>
          <b-button v-else type="is-primary" :loading="isLoading" icon-right="arrow-right" @click="nextStep">Continuar</b-button>
        </div>
      </div>

      <!-- Redesign A: one save bar for every tab (same actions as the old buttons in each card) -->
      <!-- a copy being reviewed: confirm it (it's saved as a new project) or drop it -->
      <div v-if="tabsEnabled && isDuplicating && !isLoading" class="savebar">
        <span class="savebar-state is-dirty">Còpia sense desar · revisa-la i confirma-la per crear el projecte</span>
        <div class="savebar-actions">
          <b-button icon-left="close" @click="cancelDuplicate">Cancel·lar</b-button>
          <b-button type="is-primary" icon-left="content-save" :loading="isLoading" @click="submitAndContinue">Confirmar duplicat</b-button>
        </div>
      </div>
      <div v-else-if="tabsEnabled && !isLoading" class="savebar">
        <span class="savebar-state" :class="{ 'is-dirty': dirty }">
          {{ dirty ? "Canvis sense desar" : "Sense canvis pendents" }}
        </span>
        <div class="savebar-actions">
          <b-dropdown position="is-top-left" aria-role="menu" class="savebar-more">
            <template #trigger>
              <b-button icon-left="dots-horizontal" title="Més accions" aria-label="Més accions" />
            </template>
            <b-dropdown-item aria-role="menuitem" @click="duplicateProject">
              <b-icon icon="content-copy" size="is-small" />
              Duplicar projecte
            </b-dropdown-item>
            <b-dropdown-item aria-role="menuitem" class="has-text-danger" @click="isDeleteModalActive = true">
              <b-icon icon="trash-can-outline" size="is-small" />
              Esborrar projecte
            </b-dropdown-item>
          </b-dropdown>
          <b-button :loading="isLoading" @click="submitAndExit">Guardar i sortir</b-button>
          <b-button type="is-primary" :loading="isLoading" @click="submitAndContinue">Guardar</b-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
// External libraries
import sumBy from "lodash/sumBy";
import sortBy from "lodash/sortBy";
import { projectDocuments, projectDocumentAmounts, unassignedProjectDocuments } from "@/domain/projectDocuments.js";
import { isDuplicateCodeError, projectSaveErrorMessage, DUPLICATE_CODE_FIELD_MESSAGE } from "@/domain/projectSaveError";
import { projectTrashDialog } from "@/domain/projectTrash";
import { projectTreasury, projectTreasuryDone, treasurySums } from "@/domain/projectTreasury.js";
import {
  balancePeriodification,
  dropEmptyUndatedRows,
  isUndatedYear,
  orderPeriodification,
  periodificationYearLabel,
  undatedProjectLines
} from "@/domain/projectPeriodification.js";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import moment from "moment";
import { fiscalStartMonth, fiscalYearLabel, fiscalYearRange, fiscalYearOf } from "@/domain/years";
import { formatHours, formatMoney, formatNumber, sign } from "@/helpers/format-number";
import { defaultProjectLeader } from "@/domain/projectLeader.js";

const WIZARD_STEP_OF_SECTION = { dades: 1, pressupost: 2, planificacio: 3, resum: 4 };

// Project components
import TitleBar from "@/components/TitleBar.vue";
import WizardSteps from "@/components/WizardSteps.vue";
import ProjectSummaryCards from "@/components/ProjectSummaryCards.vue";
import ModalBox from "@/components/ModalBox.vue";
import ModalBoxDuplicateProject from "@/components/ModalBoxDuplicateProject.vue";
import CardComponent from "@/components/CardComponent.vue";
import ModalBoxInvoicing from "@/components/ModalBoxInvoicing.vue";
import ModalBoxSplit from "@/components/ModalBoxSplit.vue";
import ProjectGannt from "@/components/ProjectGannt.vue";
import ProjectPhases from "@/components/ProjectPhases.vue";
import ProjectGrantableContacts from "@/components/ProjectGrantableContacts.vue";
import MoneyFormat from "@/components/MoneyFormat.vue";
import FinancialDiffTooltip from "@/components/FinancialDiffTooltip.vue";
import Tasks from "@/components/Tasks.vue";
import FileUpload from "@/components/FileUpload.vue";
import ProjectGrantableYears from "@/components/ProjectGrantableYears.vue";
import getConfig from "@/config";

// Services
import service from "@/service/index";
import { findCurrentUser } from "@/domain/currentUser";

export default {
  name: "ProjectForm",
  components: {
    CardComponent,
    TitleBar,
    WizardSteps,
    ProjectSummaryCards,
    ModalBox,
    ModalBoxDuplicateProject,
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
      project_likelihoods: [],
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
      // redesign: the page is split in tabs (only for existing projects)
      activeTab: "resum",
      isDuplicateModalActive: false,
      isDeleteModalActive: false,
      showOptionalFields: false,
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
      apiUrl: import.meta.env.VUE_APP_API_URL,
      hasBeenDirty: false,
      allByYear: [],
      allByYearYear: "TOTS",
      calculatedTotals: null,
      nameError: "",
      projectTrashDialog,
      periodification: false,
      dirtyEnabled: true,
      originalEditable: true,
      phasesEditable: true,
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
      isCreationMode: false,
      // Visibility control for non-open child projects
      visibleClosedChildren: [],
      // Track child project changes for saving from mother project
      childProjectChanges: {},
      savingChildProjects: {}
    };
  },
  computed: {
    // a new project has no `form.periodification` yet (issues/126)
    hasPeriodificationRows() {
      return !!(this.periodification && this.form.periodification && this.form.periodification.length);
    },
    ...mapState(useMainStore, ["me"]),
    // Configuració general › Projectes: the years of allByYear and of the
    // periodification are fiscal years (1 = calendar year)
    fiscalStartMonth() {
      return fiscalStartMonth(this.me);
    },
    grantableStartMonth() {
      return this.me && this.me.options && this.me.options.grantable_fiscal_years ? this.fiscalStartMonth : 1;
    },
    undatedLines() {
      return undatedProjectLines(this.form);
    },
    ...mapState(useMainStore, ["userName"]),
    filteredClients() {
      return this.clients.filter(option => {
        return (
          (option.name || '')
            .toString()
            .toLowerCase()
            .indexOf(this.clientSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredLeaders() {
      return this.clients.filter(option => {
        return (
          (option.name || '')
            .toString()
            .toLowerCase()
            .indexOf(this.leadersSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredProjects() {
      return this.projects.filter(option => {
        return (
          (option.name || '')
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredActivityTypes() {
      return this.activityTypes.filter(option => {
        return (
          (option.name || '')
            .toString()
            .toLowerCase()
            .indexOf(this.activityTypeSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredCoopera() {
      return this.clients.filter(option => {
        return (
          (option.name || '')
            .toString()
            .toLowerCase()
            .indexOf(this.cooperaSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredStrategies() {
      return this.strategies.filter(option => {
        return (
          (option.name || '')
            .toString()
            .toLowerCase()
            .indexOf(this.strategiesSearch.toLowerCase()) >= 0
        );
      });
    },
    // first step of the new project wizard: only the essential fields are shown
    wizardBasics() {
      return this.isCreationMode && !this.isDuplicating && this.currentStep === 1;
    },
    wizardSteps() {
      return [
        { title: "Dades bàsiques", description: "Nom, estat, àmbit, qui coordina i dates." },
        { title: "Fases i pressupost", description: "Pressupost original: es copia al previst en continuar." },
        { title: "Planificació", description: "Qui hi dedica hores i quan: val per a l'original i el previst." },
        { title: "Confirmació", description: "Revisa-ho i tanca el pressupost." }
      ];
    },
    // the redesigned summary (tabs and wizard); duplicating keeps the old card
    newSummary() {
      return this.tabsEnabled || (this.isCreationMode && !this.isDuplicating);
    },
    summaryYears() {
      return (this.allByYear || [])
        .filter(a => a.year !== "undefined")
        .map(a => ({ value: a.year, label: this.periodificationYearLabel(a.year) }));
    },
    // a saved project, or the copy being reviewed before it's saved (issues/114)
    tabsEnabled() {
      return !this.isCreationMode && (this.isDuplicating || !!this.form.id);
    },
    projectTabs() {
      // a copy not saved yet has no totals, documents, movements or tasks
      if (this.isDuplicating) {
        return [
          { id: "dades", label: "Dades" },
          { id: "pressupost", label: "Pressupost i fases" },
          { id: "planificacio", label: "Planificació" }
        ];
      }
      return [
        { id: "resum", label: "Resum" },
        { id: "dades", label: "Dades" },
        { id: "pressupost", label: "Pressupost i fases" },
        { id: "periodificacio", label: "Periodificació" },
        { id: "moviments", label: "Cobraments i pagaments" },
        { id: "planificacio", label: "Planificació" },
        { id: "tasques", label: "Tasques" }
      ];
    },
    projectMeta() {
      const parts = [];
      if (this.form.project_scope && this.form.project_scope.name) parts.push(this.form.project_scope.name);
      if (this.form.leader && this.form.leader.username) parts.push("coordina " + this.form.leader.username);
      const date = d => (d ? moment(d).format("DD/MM/YYYY") : "");
      if (this.form.date_start || this.form.date_end) parts.push(`${date(this.form.date_start)} – ${date(this.form.date_end)}`);
      return parts.join(" · ");
    },
    titleStack() {
      let lastCrumb;

      if (this.isProfileExists) {
        lastCrumb = this.form.name;
      } else {
        lastCrumb = "Nou projecte";
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
        return { name: "project.edit", params: { id: 0 } };
      } else {
        return "/";
      }
    },
    heroRouterLinkLabel() {
      if (this.isProfileExists) {
        return "Nou projecte";
      } else {
        return "Inici";
      }
    },
    formCardTitle() {
      return "Dades bàsiques";
    },
    transitionName() {
      if (this.useTransition) {
        return "fade";
      }
      return "x";
    },
    documents() {
      return projectDocuments(this.form, this.documentTypes);
    },
    documentAmounts() {
      return projectDocumentAmounts(this.form);
    },
    treasuryDone() {
      return projectTreasuryDone(this.form);
    },
    treasury() {
      return projectTreasury(this.form);
    },
    unassignedDocuments() {
      return unassignedProjectDocuments(this.form);
    },
    treasuryTotals() {
      return treasurySums(this.treasury);
    },
    treasuryIncomesPending() {
      return treasurySums(this.treasury).incomesPending;
    },
    treasuryExpensesPending() {
      return treasurySums(this.treasury).expensesPending;
    },
    treasuryIncomesDone() {
      return treasurySums(this.treasury).incomesDone;
    },
    treasuryExpensesDone() {
      return treasurySums(this.treasury).expensesDone;
    },
    user() {
      return findCurrentUser(this.leaders);
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
    openChildren() {
      // Return children that are open (project_state === 1)
      if (!this.form.children || !this.form.children.children) {
        return [];
      }
      const open = this.form.children.children.filter(
        child => child.project_state === 1
      );
      return open;
    },
    closedChildren() {
      // Return children that are not open (project_state !== 1)
      if (!this.form.children || !this.form.children.children) {
        return [];
      }
      const closed = this.form.children.children.filter(
        child => !child.project_state || child.project_state !== 1
      );
      return closed;
    },
    visibleChildren() {
      // Return open children plus non-open children that are marked as visible
      return [
        ...this.openChildren,
        ...this.closedChildren.filter(child =>
          this.visibleClosedChildren.includes(child.id)
        )
      ];
    },
    totals() {
      // For mother projects, `calculatedTotals` holds the aggregated totals
      // from the children-aggregation endpoint. For regular projects it's
      // null and we fall back to `this.form`, which is guaranteed to equal
      // the sum of yearly values because the backend now derives both the
      // project-level totals and `allByYear` from the same row stream
      // (services/projectFinancials.js).
      const result = this.allByYearYear === "TOTS"
        ? (this.calculatedTotals || this.form)
        : this.allByYear.find(a => a.year === this.allByYearYear);
      
      return result;
    }
  },
  watch: {
    "$route.query.tab": {
      immediate: true,
      handler(tab) {
        this.activeTab = this.projectTabs.some(t => t.id === tab) ? tab : "resum";
      }
    },
    id(newValue) {
      this.isProfileExists = false;
      this.userHasInteracted = false;
      // the route gives the id as a string: "0" is a new project, whose form
      // must not keep the last project's data (issues/068)
      if (!newValue || Number(newValue) === 0) {
        this.form = this.getClearFormObject();
        this.startNewProject();
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
        confirmText: "Surt sense desar",
        cancelText: "Continua editant",
        type: "is-danger",
        onConfirm: () => {
          next();
        },
        onCancel: () => {
          next(false);
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
    formatHours,
    formatMoney,
    formatNumber,
    sign,
    // a document's amount in Moviments: what this project's lines have of it,
    // its whole base when it is on none of them (issues/257)
    documentProjectAmount(row) {
      const amount = this.documentAmounts.get(`${row.docType}_${row.document.id}`);
      return amount === undefined ? Number(row.document.total_base) || 0 : amount;
    },
    sortDocumentsByProjectAmount(a, b, isAsc) {
      const diff = this.documentProjectAmount(a) * a.multiplier - this.documentProjectAmount(b) * b.multiplier;
      return isAsc ? diff : -diff;
    },
    // Which sections show: the active tab; in the new project wizard, the section of
    // the current step (1 basic data, 2 phases, 3 planning, 4 summary to confirm);
    // when duplicating, every section, as before.
    showTab(tab) {
      if (this.isCreationMode && !this.isDuplicating) {
        return WIZARD_STEP_OF_SECTION[tab] === this.currentStep;
      }
      return !this.tabsEnabled || this.activeTab === tab;
    },
    selectTab(tab) {
      if (tab === this.activeTab) return;
      this.activeTab = tab;
      this.$router.replace({ query: { ...this.$route.query, tab } }).catch(() => {});
    },
    isUndatedYear,
    periodificationYearLabel(year) {
      return isUndatedYear(year) ? periodificationYearLabel(year) : fiscalYearLabel(year, this.fiscalStartMonth);
    },
    toggleClosedChild(childId) {
      const index = this.visibleClosedChildren.indexOf(childId);
      if (index > -1) {
        // Hide the child
        this.visibleClosedChildren.splice(index, 1);
      } else {
        // Show the child
        this.visibleClosedChildren.push(childId);
      }
    },
    isClosedChildVisible(childId) {
      return this.visibleClosedChildren.includes(childId);
    },
    getClearFormObject() {
      return {
        id: null,
        name: null,
        project_state: { id: 0 },
        project_scope: { id: 0 },
        project_likelihood: { id: 0 },
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
            useMainStore().setMe({
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
        // The phases come from their own endpoints (with estimated hours and
        // bank accounts, and without the totals engine's working values), so
        // the project is asked without its copy of them, and the three
        // requests run at once instead of one after another (issues/016).
        const projectId = this.$route.params.id;
        const phasesRequest = service({ requiresAuth: true }).get(
          `project-phases?project=${projectId}&_limit=-1`
        );
        const originalPhasesRequest = service({ requiresAuth: true }).get(
          `project-original-phases-hours?project=${projectId}&_limit=-1`
        );
        service({ requiresAuth: true })
          .get(`projects/${projectId}?_phases=false`)
          .then(async r => {
            if (r.data && r.data.id) {
              // Execution phases, and original phases, both with estimated hours.
              // Set before the form is shown: the template reads their length.
              const [phasesResponse, originalPhasesResponse] = await Promise.all([
                phasesRequest,
                originalPhasesRequest
              ]);
              const phases = phasesResponse.data;
              r.data.project_phases = phases;
              r.data.project_original_phases = originalPhasesResponse.data;

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
              this.form.project_likelihood =
                this.form.project_likelihood && this.form.project_likelihood.id
                  ? this.form.project_likelihood
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

              // Here and not after the awaits below: the template binds its .id
              this.form.default_dedication_type =
                this.form.default_dedication_type
                  ? this.form.default_dedication_type
                  : { id: 0 };

              this.ganttViewMode = (phases && phases.length > 0) ? 'estimated' : 'original';

              // the route reuses this component: nothing of the last project stays (issues/129)
              this.calculatedTotals = null;
              this.allByYearYear = "TOTS";

              // Load children data if this project is a mother project
              if (this.form.is_mother) {
                const childrenData = (
                  await service({ requiresAuth: true }).get(
                    `projects/${this.$route.params.id}/children`
                  )
                ).data;

                if (childrenData.children && childrenData.children.length > 0) {
                }

                // Update all three financial dimensions from aggregated children data
                // Original dimension
                this.form.total_original_incomes =
                  childrenData.totals.total_original_incomes;
                this.form.total_original_expenses =
                  childrenData.totals.total_original_expenses;
                this.form.total_original_expenses_vat =
                  childrenData.totals.total_original_expenses_vat;
                this.form.total_original_hours =
                  childrenData.totals.total_original_hours;
                this.form.total_original_hours_price =
                  childrenData.totals.total_original_hours_price;
                this.form.original_incomes_expenses =
                  childrenData.totals.original_incomes_expenses;
                
                // Estimated dimension
                this.form.total_estimated_incomes =
                  childrenData.totals.total_estimated_incomes;
                this.form.total_estimated_expenses =
                  childrenData.totals.total_estimated_expenses;
                this.form.total_estimated_expenses_vat =
                  childrenData.totals.total_estimated_expenses_vat;
                this.form.total_estimated_hours =
                  childrenData.totals.total_estimated_hours;
                this.form.total_estimated_hours_price =
                  childrenData.totals.total_estimated_hours_price;
                this.form.estimated_incomes_expenses =
                  childrenData.totals.estimated_incomes_expenses;
                
                // Real/Executed dimension
                this.form.total_real_incomes =
                  childrenData.totals.total_real_incomes;
                this.form.total_real_expenses =
                  childrenData.totals.total_real_expenses;
                this.form.total_real_expenses_vat =
                  childrenData.totals.total_real_expenses_vat;
                this.form.total_real_hours =
                  childrenData.totals.total_real_hours;
                this.form.total_real_hours_price =
                  childrenData.totals.total_real_hours_price;
                this.form.total_real_incomes_expenses =
                  childrenData.totals.total_real_incomes_expenses;
                
                // Backwards compatibility fields
                this.form.total_incomes = childrenData.totals.total_incomes;
                this.form.total_expenses = childrenData.totals.total_expenses;
                this.form.total_expenses_vat =
                  childrenData.totals.total_expenses_vat;
                this.form.incomes_expenses =
                  childrenData.totals.incomes_expenses;
                this.form.balance = childrenData.totals.balance;
                this.form.estimated_balance = childrenData.totals.estimated_balance;
                
                // Document arrays
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

              this.applyLoadedPeriodification();

              this.grantable_contacts = this.form.grantable_contacts || [];
              
              // Initialize grantable_years if not present
              if (!this.form.grantable_years) {
                this.form.grantable_years = [];
              }

              // Initialize phase info structures if not present (for deletions tracking)
              if (!this.form.project_phases_info) {
                this.form.project_phases_info = {
                  deletedPhases: [],
                  deletedIncomes: [],
                  deletedExpenses: [],
                  deletedHours: []
                };
              }
              if (!this.form.project_original_phases_info) {
                this.form.project_original_phases_info = {
                  deletedPhases: [],
                  deletedIncomes: [],
                  deletedExpenses: [],
                  deletedHours: []
                };
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

              // The planning opens on PREVISTA (the original only for a project
              // without an estimated budget, whose PREVISTA would be empty). The
              // wizard plans on the original budget; leaving step 3 copies it,
              // hours included, to the estimated one.
              if (this.isCreationMode) {
                this.ganttViewMode = "original";
              } else {
                this.ganttViewMode =
                  this.form.project_phases && this.form.project_phases.length > 0 ? "estimated" : "original";
              }

              this.isLoading = false;

              // Reset dirty flag AFTER all data is loaded and dirtyEnabled is re-enabled
              // This is handled in getAuxiliarData() to ensure proper sequencing
            } else {
              this.$router.push({ name: "project.edit", params: { id: 0 } });
            }
          });
      } else {
        this.startNewProject();
      }
    },
    // A new project opens the creation wizard, also when the form is reused
    // coming from another project (it showed the old one-page form, issues/110)
    startNewProject() {
      // New project - disable dirty tracking during initialization
      this.dirtyEnabled = false;
      this.isInitialLoad = true;
      this.userHasInteracted = false;
      this.project_scopes = this.project_scopes.filter(s => !s.disabled)
      this.project_likelihoods = this.project_likelihoods.filter(s => !s.disabled)
      this.form.date_start = new Date();
      // the end of the current fiscal year (31/12 for most entities)
      this.form.date_end = moment(
        fiscalYearRange(fiscalYearOf(moment(), this.fiscalStartMonth), this.fiscalStartMonth).to
      ).toDate();
      // Enable creation mode for new projects and set initial creation_step
      this.isCreationMode = true;
      this.currentStep = 1;
      this.form.creation_step = 'basic_data';
      this.getAuxiliarData();
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
        .get("project-likelihoods?_limit=-1")
        .then(r => {
          this.project_likelihoods = r.data;
          if (this.form.project_likelihood && this.form.project_likelihood.disabled !== true) {
            this.project_likelihoods = this.project_likelihoods.filter(
              s => !s.disabled
            );
          }
        });
      service({ requiresAuth: true, cached: true })
        .get("project-types?_limit=-1")
        .then(r => {
          this.project_types = r.data;
        });

      // Not cached: the phase lines share this list (they used to fetch their
      // own, fresh, copy), and a contact created earlier in the session must
      // be there.
      service({ requiresAuth: true })
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
        const leader = defaultProjectLeader(this.leaders, this.userName);
        if (leader) {
          this.form.leader = leader;
        }
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
          // the API omits allByYear when there is nothing to aggregate
          this.allByYear = this.form.allByYear || [];
          
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
        this.form.periodification = orderPeriodification(dropEmptyUndatedRows(
          this.form.periodification || [],
          this.undatedLines.length > 0
        ));
        // the rows add up to 0, so the latest year rebalanced keeps its value
        this.updatePeriodification();

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
        // Planning: requires the original phases to be saved
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
        const messages = {
          1: "Omple els camps obligatoris (*): codi, estat, àmbit, qui coordina i dates.",
          2: "Afegeix almenys una fase al pressupost abans de continuar.",
          3: "Desa les fases del pressupost abans de passar a la confirmació."
        };
        this.$buefy.snackbar.open({
          message: messages[this.currentStep] || "Si us plau, completa tots els camps obligatoris abans de continuar",
          queue: false
        });
        return;
      }

      // While creating, the estimated budget is a copy of the original: leaving
      // step 2 (phases) and step 3 (planning, done on the original) copies it
      // again, so both start with the same lines and hours.
      if (this.currentStep === 2 || this.currentStep === 3) {
        this.copyOriginalToEstimated();
      }

      // Save the project with the NEXT step (where we're going)
      this.form.creation_step = this.getStepName(this.currentStep + 1);
      
      // Save and proceed
      await this.submit("next");
    },
    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--;
      }
    },
    // The estimated budget (previst) becomes a copy of the original, replacing
    // an earlier copy and its planned hours.
    copyOriginalToEstimated() {
      const previous = this.form.project_phases || [];
      const deletedPhases = previous.filter(p => p.id).map(p => p.id);
      const deletedHours = [];
      previous.forEach(p =>
        (p.incomes || []).forEach(i =>
          (i.estimated_hours || []).forEach(h => h.id && deletedHours.push(h.id))
        )
      );
      this.closeQuoteFromOriginal();
      this.form.project_phases_info = {
        deletedPhases,
        deletedIncomes: [],
        deletedExpenses: [],
        deletedHours
      };
    },
    async closeBudget() {
      // Finish the project creation; the estimated budget was copied from the
      // original when leaving steps 2 and 3

      if (!this.form.project_original_phases || this.form.project_original_phases.length === 0) {
        this.$buefy.snackbar.open({
          message: "No hi ha fases originals per tancar el pressupost",
          queue: false
        });
        return;
      }

      // Mark creation as completed
      this.form.creation_step = 'completed';

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
    // The switch follows the loaded project: it was only ever turned on, so
    // the next project opened without a reload showed the last one's
    // periodification table, and saving it stored those rows (issues/129)
    applyLoadedPeriodification() {
      this.periodification = !!(this.form.periodification && this.form.periodification.length);
      if (this.periodification) {
        this.updatePeriodification();
      }
    },
    async submitAndContinue() {
      this.submit("continue");
    },
    async submit(action) {
      this.isLoading = true;

      if (!this.periodification) {
        this.form.periodification = [];
      }

      if (!this.form.structural_expenses_pct) {
        this.form.structural_expenses_pct = null;
      }
      // No dedication type or region is sent as null, but the form keeps { id: 0 }:
      // the template binds their .id and a null there crashes the page (issues/041).
      const dedicationType = this.form.default_dedication_type;
      const default_dedication_type =
        dedicationType && typeof dedicationType === "object" && !dedicationType.id
          ? null
          : dedicationType;
      const region = this.form.region && this.form.region.id === 0 ? null : this.form.region;

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
          // Closing the budget copies the phases only for projects whose wizard
          // started before the copy moved to step 2
          if (action === "closeBudget" && !(this.form.project_phases && this.form.project_phases.length)) {
            await this.closeQuoteFromOriginal();
          }

          // Clean up grantable_contacts before destructuring
          this.form.grantable_contacts = (this.form.grantable_contacts || []).filter(gc => {
            const hasValidContact = gc.contact && gc.contact.id;
            return hasValidContact;
          });

          // Exclude large computed/read-only fields from the payload to prevent 413 errors
          // especially for mother projects which have large children data
          const { 
            activities, 
            children,           // Mother project children data (read-only, computed)
            allByYear,          // Computed aggregated data by year
            undatedLines,       // Computed: lines with no date (issues/015)
            calculatedTotals,   // Computed totals
            incomes_expenses,   // Computed financial data
            total_real_incomes_expenses,
            total_incomes,
            total_real_incomes,
            total_expenses,
            total_estimated_hours_price,
            total_real_expenses,
            total_real_hours_price,
            total_estimated_hours,
            total_real_hours,
            total_expenses_vat,
            total_real_expenses_vat,
            // Document arrays (read-only relationships, loaded separately)
            emitted_invoices,
            received_grants,
            received_invoices,
            tickets,
            diets,
            received_incomes,
            received_expenses,
            treasury_annotations,
            ...form
          } = this.form;

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
            { ...form, default_dedication_type, region }
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
            // Exit creation mode and reload
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

          let newProject;
          try {
            newProject = await service({ requiresAuth: true }).post(
              "projects",
              { ...this.form, default_dedication_type, region }
            );
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
        
        // a repeated Codi is told in Catalan, next to the field (issues/130)
        if (isDuplicateCodeError(err)) {
          this.nameError = DUPLICATE_CODE_FIELD_MESSAGE;
        }
        this.$buefy.snackbar.open({
          message: projectSaveErrorMessage(err, this.form.name),
          type: "is-danger",
          duration: 8000,
          queue: false
        });
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
      
      // Mark the income (subphase) as dirty so the deletion is persisted
      income.dirty = true;

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
    // Child project gantt methods
    childGanttItemUpdate(childId, item) {
      // Initialize change tracking for this child if not exists
      if (!this.childProjectChanges[childId]) {
        this.childProjectChanges[childId] = {
          _project_phases_updated: false,
          _project_original_phases_updated: false,
          deletedPhases: [],
          deletedIncomes: [],
          deletedExpenses: [],
          deletedHours: [],
          deletedPhasesOriginal: [],
          deletedIncomesOriginal: [],
          deletedExpensesOriginal: [],
          deletedHoursOriginal: []
        };
      }

      // Check which view mode we're in
      const isOriginalMode = this.ganttViewMode === "original";

      if (isOriginalMode) {
        this.childProjectChanges[childId]._project_original_phases_updated = true;
      } else {
        this.childProjectChanges[childId]._project_phases_updated = true;
      }

      if (!item._hours) {
        return;
      }

      const id = item._hours.id;
      const uuid = item._uuid;
      const pid = item._phase.id;

      // Find the child in the visibleChildren array
      const child = this.visibleChildren.find(c => c.id === childId);
      if (!child) {
        console.error('Child project not found:', childId);
        return;
      }

      // Get the appropriate phases array based on view mode
      const phasesArray = isOriginalMode
        ? child.project_original_phases
        : child.project_phases;

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

      // Update the appropriate info object based on view mode
      if (isOriginalMode) {
        child.project_original_phases_info = {
          deletedPhases: this.childProjectChanges[childId].deletedPhasesOriginal,
          deletedIncomes: this.childProjectChanges[childId].deletedIncomesOriginal,
          deletedExpenses: this.childProjectChanges[childId].deletedExpensesOriginal,
          deletedHours: this.childProjectChanges[childId].deletedHoursOriginal
        };
      } else {
        child.project_phases_info = {
          deletedPhases: this.childProjectChanges[childId].deletedPhases,
          deletedIncomes: this.childProjectChanges[childId].deletedIncomes,
          deletedExpenses: this.childProjectChanges[childId].deletedExpenses,
          deletedHours: this.childProjectChanges[childId].deletedHours
        };
      }
    },
    childGanttItemDelete(childId, item) {
      // Initialize change tracking for this child if not exists
      if (!this.childProjectChanges[childId]) {
        this.childProjectChanges[childId] = {
          _project_phases_updated: false,
          _project_original_phases_updated: false,
          deletedPhases: [],
          deletedIncomes: [],
          deletedExpenses: [],
          deletedHours: [],
          deletedPhasesOriginal: [],
          deletedIncomesOriginal: [],
          deletedExpensesOriginal: [],
          deletedHoursOriginal: []
        };
      }

      // Check which view mode we're in
      const isOriginalMode = this.ganttViewMode === "original";

      if (isOriginalMode) {
        this.childProjectChanges[childId]._project_original_phases_updated = true;
      } else {
        this.childProjectChanges[childId]._project_phases_updated = true;
      }

      const id = item._hours.id;
      const pid = item._phase.id;
      const sid = item._subphase.id;

      // Add to appropriate deletedHours array
      if (isOriginalMode) {
        this.childProjectChanges[childId].deletedHoursOriginal.push(id);
      } else {
        this.childProjectChanges[childId].deletedHours.push(id);
      }

      // Find the child in the visibleChildren array
      const child = this.visibleChildren.find(c => c.id === childId);
      if (!child) {
        console.error('Child project not found:', childId);
        return;
      }

      // Get the appropriate phases array based on view mode
      const phasesArray = isOriginalMode
        ? child.project_original_phases
        : child.project_phases;

      const phase = phasesArray.find(p => p.id === pid);
      const income = phase.incomes.find(s => s.id === sid);
      income.estimated_hours = income.estimated_hours.filter(h => h.id !== id);

      // Mark the income (subphase) as dirty so the deletion is persisted
      income.dirty = true;

      // Update the appropriate info object
      if (isOriginalMode) {
        child.project_original_phases_info = {
          deletedPhases: this.childProjectChanges[childId].deletedPhasesOriginal,
          deletedIncomes: this.childProjectChanges[childId].deletedIncomesOriginal,
          deletedExpenses: this.childProjectChanges[childId].deletedExpensesOriginal,
          deletedHours: this.childProjectChanges[childId].deletedHoursOriginal
        };
      } else {
        child.project_phases_info = {
          deletedPhases: this.childProjectChanges[childId].deletedPhases,
          deletedIncomes: this.childProjectChanges[childId].deletedIncomes,
          deletedExpenses: this.childProjectChanges[childId].deletedExpenses,
          deletedHours: this.childProjectChanges[childId].deletedHours
        };
      }
    },
    hasChildChanges(childId) {
      const changes = this.childProjectChanges[childId];
      if (!changes) return false;
      return changes._project_phases_updated || changes._project_original_phases_updated;
    },
    async saveChildProject(childId) {
      if (!this.hasChildChanges(childId)) {
        this.$buefy.snackbar.open({
          message: 'No hi ha canvis per guardar',
          type: 'is-info',
          queue: false
        });
        return;
      }

      // Set saving state
      this.savingChildProjects[childId] = true;

      try {
        // Find the child project
        const child = this.visibleChildren.find(c => c.id === childId);
        if (!child) {
          throw new Error('Child project not found');
        }

        // Prepare the payload similar to the main submit method
        const {
          activities,
          children,
          allByYear,
          undatedLines,
          calculatedTotals,
          incomes_expenses,
          total_real_incomes_expenses,
          total_incomes,
          total_real_incomes,
          total_expenses,
          total_estimated_hours_price,
          total_real_expenses,
          total_real_hours_price,
          total_estimated_hours,
          total_real_hours,
          total_expenses_vat,
          total_real_expenses_vat,
          emitted_invoices,
          received_grants,
          received_invoices,
          tickets,
          diets,
          received_incomes,
          received_expenses,
          treasury_annotations,
          ...childForm
        } = child;

        // Transfer the update flags from childProjectChanges to childForm
        if (this.childProjectChanges[childId]) {
          childForm._project_phases_updated = this.childProjectChanges[childId]._project_phases_updated;
          childForm._project_original_phases_updated = this.childProjectChanges[childId]._project_original_phases_updated;
        }

        // Save the child project
        await service({ requiresAuth: true }).put(
          `projects/${childId}`,
          childForm
        );

        this.$buefy.snackbar.open({
          message: `Projecte fill "${child.name}" guardat correctament`,
          type: 'is-success',
          queue: false
        });

        // Clear the changes tracking for this child
        delete this.childProjectChanges[childId];

        // Reload the children data to get fresh data
        await this.loadChildrenData();

      } catch (error) {
        console.error('Error saving child project:', error);
        this.$buefy.snackbar.open({
          message: `Error guardant el projecte fill: ${error.message || error}`,
          type: 'is-danger',
          queue: false
        });
      } finally {
        this.savingChildProjects[childId] = false;
      }
    },
    async loadChildrenData() {
      if (!this.form.is_mother || !this.form.id) return;

      const childrenData = (
        await service({ requiresAuth: true }).get(
          `projects/${this.form.id}/children`
        )
      ).data;

      this.form.children = childrenData;
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
      // dd/mm/aaaa, as the rest of the app (issues/127)
      return value ? moment(value, "YYYY-MM-DD").format("DD/MM/YYYY") : "";
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
        deletedHours: this.deletedHours
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
        delete p.documentId; // a copy is a new row (issues/182)
        p.dirty = true;
        p.incomes.forEach(sp => {
          sp.date = sp.date ? moment(sp.date).format("YYYY-MM-DD") : null;
          sp.date_estimate_document = sp.date_estimate_document
            ? moment(sp.date_estimate_document).format("YYYY-MM-DD")
            : null;
          delete sp.id;
          delete sp.documentId;
          sp.dirty = true;
        });
        p.expenses.forEach(sp => {
          sp.date = sp.date ? moment(sp.date).format("YYYY-MM-DD") : null;
          sp.date_estimate_document = sp.date_estimate_document
            ? moment(sp.date_estimate_document).format("YYYY-MM-DD")
            : null;
          delete sp.id;
          delete sp.documentId;
          sp.dirty = true;
        });
      });
      this.phasesVisible = true;
    },
    closeQuoteFromOriginal() {
      this.phasesVisible = false;
      const endDate = this.form.date_end ? moment(this.form.date_end).format("YYYY-MM-DD") : null;
      const phases = JSON.parse(
        JSON.stringify(this.form.project_original_phases)
      );

      phases.forEach((p, idx) => {
        p.edit = false;
        p.opened = true;
        p.dirty = true;
        delete p.id;
        delete p.documentId; // a copy is a new row (issues/182)

        p.incomes.forEach((sp, incIdx) => {
          sp.dirty = true;
          // undated lines get the project's end date, as when copying a phase
          sp.date = sp.date ? moment(sp.date).format("YYYY-MM-DD") : endDate;
          sp.date_estimate_document = sp.date_estimate_document
            ? moment(sp.date_estimate_document).format("YYYY-MM-DD")
            : endDate;
          delete sp.id;
          delete sp.documentId;
          delete sp.project_original_phase; // Remove foreign key to original phase
          delete sp.project_phase; // Remove any existing execution phase reference
          // Copy estimated hours (planning)
          if (sp.estimated_hours && sp.estimated_hours.length) {
            sp.estimated_hours.forEach((hour, hourIdx) => {
              delete hour.id;
              delete hour.documentId;
              delete hour.phase_income; // Remove foreign key to parent income
              hour.dirty = true;
              // Keep from/to dates properly formatted
              if (hour.from) {
                hour.from = moment(hour.from).format("YYYY-MM-DD");
              }
              if (hour.to) {
                hour.to = moment(hour.to).format("YYYY-MM-DD");
              }
            });
          }
        });

        p.expenses.forEach(sp => {
          sp.dirty = true;
          sp.date = sp.date ? moment(sp.date).format("YYYY-MM-DD") : endDate;
          sp.date_estimate_document = sp.date_estimate_document
            ? moment(sp.date_estimate_document).format("YYYY-MM-DD")
            : endDate;
          delete sp.id;
          delete sp.documentId;
          delete sp.project_original_phase; // Remove foreign key to original phase
          delete sp.project_phase; // Remove any existing execution phase reference
        });
      });

      this.form.project_phases = phases;

      // Log detailed summary
      let totalHours = 0;
      this.form.project_phases.forEach((p, idx) => {
        p.incomes.forEach(inc => {
          if (inc.estimated_hours) {
            totalHours += inc.estimated_hours.length;
          }
        });
      });

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
        balancePeriodification(this.form.periodification);
      }
    },
    async uploaded(info) {

      if (info.refId && info.refId > 0) {
        const project = (
          await service({ requiresAuth: true }).get(`projects/${info.refId}`)
        ).data;
        this.form.documents = project.documents;
      } else {
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
    // opens the "Duplicar projecte" dialog; it calls performDuplicate or nothing
    duplicateProject() {
      this.isDuplicateModalActive = true;
    },
    // same as the projects list: the project is unpublished, not removed
    async deleteConfirmed() {
      this.isDeleteModalActive = false;
      await service({ requiresAuth: true }).put(`projects/${this.form.id}`, { published_at: null });
      this.dirty = false;
      this.$buefy.snackbar.open({ message: "Esborrat", queue: false });
      this.$router.push({ name: "projectes.view" });
    },
    duplicateConfirmed(moveDates) {
      this.isDuplicateModalActive = false;
      this.performDuplicate(moveDates);
    },
    performDuplicate(moveDates) {
      // Create a deep copy of the current form
      const duplicatedForm = JSON.parse(JSON.stringify(this.form));

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

        // Always return a Date object for datepickers
        return newDate;
      };

      // Adjust main project dates
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

      // Enter duplicate mode, on the copy's data
      this.isDuplicating = true;
      this.selectTab("dades");

      // Increment formKey to force complete re-render of the entire form
      this.formKey++;

      // Re-enable dirty checking after render
      this.$nextTick(() => {
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
/* Redesign A: tabs, page head and the summary as text instead of grey boxes */
.project-form .project-tabs {
  margin-bottom: 1.25rem;
}
.project-form .project-tabs ul {
  border-bottom: 1px solid var(--a-line);
}
.project-form .project-tabs a {
  padding: .625rem .875rem;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
}
.project-form .project-tabs li.is-active a {
  border-bottom-color: var(--a-accent);
}
/* toasts and snackbars appear above the save / wizard bar, not over its buttons */
body:has(.project-form .savebar) .notices.is-bottom {
  padding-bottom: 4.75rem;
}
/* an open menu of the bar (⋯) goes over any notice */
.project-form .savebar:has(.dropdown.is-active) {
  z-index: 1001;
}
/* the save / wizard bar sits at the bottom of the window even on short pages */
.project-form {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.project-form > .section.is-main-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.project-form .savebar {
  margin-top: auto !important;
  position: sticky;
  bottom: 0;
  z-index: 20;
  margin: 1.5rem -2rem -3rem;
  padding: .5rem 2rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
  background: var(--a-surface);
  border-top: 1px solid var(--a-line);
  box-shadow: 0 -6px 16px rgba(16, 32, 30, .06);
}
.project-form .savebar-state {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  font-weight: 700;
  color: var(--a-muted);
}
.project-form .savebar-state.is-dirty {
  color: var(--a-fg);
}
.project-form .savebar-state.is-dirty::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--a-over);
}
.project-form .savebar-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}
.project-form .savebar-more .dropdown-item {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding-right: 1.25rem;
  white-space: nowrap;
}
@media screen and (max-width: 768px) {
  .project-form .savebar {
    margin: 1.5rem -1rem -2.5rem;
    padding: .5rem 1rem;
  }
}
/* Dades: the form layout is the shared .a-form (_redesign.scss); project bits here */
.project-form .a-form .file-documents {
  margin-left: 0;
}
/* the section heading already says "Documents" */
.project-form .a-form .field:has(.file-documents) > .field-label,
.project-form .a-form .field:has(> .field-body .help + .file-documents) > .field-label {
  display: none;
}
.project-form .optional-toggle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem 1rem;
  margin: 1.25rem 0 .5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--a-line-soft);
  color: var(--a-muted);
  font-size: .875rem;
}
.project-form .wizard-bar-note {
  color: var(--a-muted);
  font-size: .875rem;
}
.project-form .tab-empty {
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--a-muted);
}
.project-form .tab-empty p {
  margin-bottom: .75rem;
}
.project-form .tab-empty b {
  color: var(--a-fg);
}
.project-state-tag {
  margin-right: .5rem;
  vertical-align: 1px;
}
html .project-form .subphase-detail-input.readonly {
  border-color: transparent;
  background: transparent;
  color: var(--a-fg);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.project-form .columns.is-tabbed {
  margin-top: 0;
}
.project-form .project-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}
.project-form .is-nowrap {
  white-space: nowrap;
}
.project-form td.movement-concept {
  max-width: 36rem;
}
/* long concepts: two lines, the full text in the tooltip */
.project-form .movement-concept-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.project-form .movement-amount {
  font-weight: 700;
  white-space: nowrap;
}
.project-form .movements-paging .select select {
  height: 2.25rem;
}
.project-form .period-help {
  color: var(--a-muted);
  margin-bottom: .75rem;
  max-width: 60rem;
}
.project-form .period-table {
  width: 100%;
}
.project-form .period-table thead th.period-group {
  text-align: center;
  border-bottom: 1px solid var(--a-line);
}
.project-form .period-table tbody th {
  white-space: nowrap;
  font-weight: 800;
}
.project-form .period-table .period-input input {
  text-align: right;
  height: 2.25rem;
  font-variant-numeric: tabular-nums;
}
.project-form .period-table tr.period-auto th,
.project-form .period-table tr.period-auto td {
  background: var(--a-thead);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.project-form .period-table tr.period-auto .tag {
  margin-left: .5rem;
  vertical-align: 1px;
}
.project-form .period-table tr.is-undated th {
  color: var(--a-warn-fg);
}
.project-form .treasury-summary {
  overflow: hidden;
}
.project-form .treasury-summary .table {
  width: 100%;
  margin: 0;
}
.project-form .treasury-summary td {
  font-weight: 700;
  white-space: nowrap;
}
.project-form .summary-dirty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem 1rem;
  margin: 0;
}
.project-form .project-summary > .card {
  margin: 0 !important;
}
.project-form .project-summary .summary-card .label {
  font-size: .8125rem;
  color: var(--a-muted);
  font-weight: 700;
  margin-bottom: .125rem;
}
/* each row: original · previst · executat, value under its label */
.project-form .project-summary .summary-card .card-content > .columns {
  margin: 0;
  padding: .5rem 0;
  border-bottom: 1px solid var(--a-line-soft);
}
.project-form .project-summary .summary-card .card-content > .columns > .column {
  padding: .25rem .75rem .25rem 0;
}
.project-form .project-summary .summary-card .readonly {
  padding: 0;
  text-align: left;
  font-size: 1.0625rem;
}
.project-form .project-summary .summary-card .summary-hours {
  text-align: left !important;
  font-weight: 700;
  font-size: 1.0625rem;
  font-variant-numeric: tabular-nums;
}
.project-form .project-summary .summary-card .readonly * {
  text-align: left;
  justify-content: flex-start;
}
.year-label {
  min-width: 100px;
}
.undated-lines {
  list-style: disc;
  margin: 0.5rem 0 0 1.5rem;
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
  color: var(--a-fg);
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
  color: var(--a-fg);
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
