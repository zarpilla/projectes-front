<template>
  <div>
    <title-bar :title-stack="titleStack" />

    <modal-box-contact-user
      :is-active="isModalActive"
      :id="form.contact || 0"
      :owner-id="form.owner"
      :can-edit="(canEdit && !form.contact) || canEditContact"
      @cancel="isModalActive = false"
      @confirm="confirmContact"
    ></modal-box-contact-user>

    <modal-box-incidence
      :is-active="isIncidenceModalActive"
      :order-id="form.id || 0"
      @confirm="onIncidenceCreated"
      @cancel="isIncidenceModalActive = false"
    ></modal-box-incidence>

    <section class="section is-main-section section-adapted">
      <div class="columns">
        <div class="column is-full">
          <card-component class="tile is-child">
            <b-message
              v-if="firstStatus !== 'pending' && firstStatus !== 'deposited'"
              title="Comanda ja procesada"
              type="is-warning"
            >
              <span v-if="!canEdit"
                >Si hi ha algun canvi d'última hora, contacta si us plau amb La
                Diligència.</span
              >
              <span v-else
                >Atenció amb els canvis, doncs podria afectar a entregues ja
                fetes o a factures emeses.</span
              >
            </b-message>

            <form @submit.prevent="submit(false)" v-if="!isLoading">
              <!-- BLOC ZERO: Sòcia -->
              <b-field
                label="Sòcia *"
                horizontal
                :type="{ 'is-danger': errors['owner'] && submitted }"
              >
                <b-select
                  :disabled="!canEdit"
                  v-model="form.owner"
                  placeholder=""
                  @input="changeOwner"
                >
                  <option
                    v-for="(s, index) in users"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.fullname || s.username }}
                  </option>
                </b-select>
              </b-field>

              <hr />

              <!-- PRIMER BLOC: A ON VA I QUIN DIA? -->
              <h3 class="title is-5 mt-4 mb-3">A ON VA I QUIN DIA?</h3>
              <p class="help mb-4"><strong>Recorda!</strong> Has d'informar les comandes com a límit a les 13h del dia abans.</p>

              <!-- <b-field
                label="Data comanda *"
                horizontal
                :type="{ 'is-danger': errors['route_date'] && submitted }"
                message="Data de creació de la comanda"
              >
                <b-datepicker
                  :disabled="!(permissions.includes('orders_admin') || permissions.includes('orders_delivery'))"
                  v-model="form.route_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data"
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field> -->

              <b-field
                :label="isPickupPoint ? 'Punt de consum *' : 'Punt d’entrega *'"
                horizontal
                :type="{ 'is-danger': errors['contact'] && submitted }"
                :message="!isPickupPoint ? 'Cerca el punt d`entrega si ja existeix, o crea un nou punt' : 'Cerca el punt de consum'"
              >
                <b-autocomplete
                  v-model="contactSearch"
                  placeholder="Punt d'entrega"
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredContacts"
                  field="display"
                  @select="contactChanged"
                  @input="onContactInput"
                  :disabled="!canEdit"
                  :clearable="true"
                >
                </b-autocomplete>
              </b-field>

              <b-field horizontal v-if="!form.contact && !contactSearch && !isPickupPoint">
                <b-button
                  :disabled="!canEdit"
                  class="view-button is-primary mb-3"
                  title="Nou punt d'entrega"
                  @click="isModalActive = true"
                >
                  Nou punt d'entrega
                </b-button>
              </b-field>
              <b-field horizontal v-else-if="form.contact">
                <b-button
                  :disabled="!canEdit"
                  class="view-button is-primary mb-3 ml-0"
                  title="Nou punt d'entrega"
                  @click="isModalActive = true"
                >
                  {{ isPickupPoint ? "Veure punt de recollida" : "Veure punt d'entrega" }}
                </b-button>
              </b-field>

              <b-field
                label="Ruta *"
                horizontal
                :type="{ 'is-danger': errors['route'] && submitted }"
                message="Escull la ruta tenint en compte el dia de la setmana i la destinació de la comanda. Així se t'aplicarà la tarifa corresponent. En cas de dubte, consulta'ns"
              >
                <b-select
                  @input="changeRoute"
                  v-model="form.route"
                  placeholder=""
                  :disabled="!canEdit"
                >
                  <option
                    v-for="(s, index) in routes"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>

              <b-field
                label="Data prevista d'entrega"
                horizontal
                message="Si prefereixis que s'entregui més endavant, tria una data del calendari."
              >
                <b-datepicker
                  :disabled="!canEdit"
                  v-model="form.estimated_delivery_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data"
                  trap-focus
                  editable
                  @input="checkEstimatedDeliveryDate"
                >
                </b-datepicker>
              </b-field>

              <b-message v-if="dateWarningMessage" type="is-warning">
                {{ dateWarningMessage }}
              </b-message>

              <!-- SEGON BLOC: QUÈ HEM DE PORTAR? -->
              <div class="hr"></div>
              <h3 class="title is-5 mt-4 mb-3">QUÈ HEM DE PORTAR?</h3>

              <b-field
                label="Tipus de servei *"
                horizontal
                :type="{ 'is-danger': errors['delivery_type'] && submitted }"
                :message="form.is_collection_order ? 'Calculat automàticament des de les comandes associades' : 'Indica refrigerat si almenys una caixa de la comanda ha d\'anar refrigerada'"
              >
                <div class="is-flex">
                  <button
                    class="button mr-2"
                    type="button"
                    v-for="(s, index) in deliveryTypes"
                    :class="{
                      'is-warning': form.delivery_type === s.id,
                      'is-outlined': form.delivery_type !== s.id
                    }"
                    @click="form.delivery_type = s.id"
                    :disabled="!canEdit || form.is_collection_order"
                  >
                    {{ s.name }}
                  </button>
                </div>
              </b-field>



              <!-- Pickup Point Lines Section -->
              <div v-if="isPickupPoint" class="mb-3">
                <b-field
                  label="Línies *"
                  horizontal
                  message="Afegeix les línies amb la informació de cada destinatari"
                  :type="{ 'is-danger': errors['lines'] && submitted }"
                >
                  <div class="is-full-width mt-2">
                    <div v-for="(line, index) in form.lines" :key="index" class="zbox mb-1">
                      <div class="columns">
                        <div class="column is-3 p-2">
                          <b-field :label="index === 0 ? 'Caixes' : null">
                            <b-input
                              v-model="line.units"
                              type="number"
                              :disabled="!canEdit"
                              @input="calculateTotals"
                            />
                          </b-field>
                        </div>
                        <div class="column is-3 p-2">
                          <b-field :label="index === 0 ? 'Kilograms' : null">
                            <b-input
                              v-model="line.kilograms"
                              type="number"
                              :disabled="!canEdit"
                              @input="calculateTotals"
                            />
                          </b-field>
                        </div>
                        <div class="column is-3 p-2">
                          <b-field :label="index === 0 ? 'Nom' : null">
                            <b-input
                              v-model="line.name"
                              :disabled="!canEdit"
                            />
                          </b-field>
                        </div>
                        <div class="column is-2 p-2">
                          <b-field :label="index === 0 ? 'NIF' : null">
                            <b-input
                              v-model="line.nif"
                              :disabled="!canEdit"
                            />
                          </b-field>
                        </div>
                        <div class="column is-1">
                          <b-field :label="index === 0 ? 'Accions' : null">
                            <b-button
                              type="is-danger"
                              size="is-small"
                              icon-left="delete"
                              :disabled="!canEdit"
                              @click="removeLine(index)"
                            >
                            </b-button>
                          </b-field>
                        </div>
                      </div>
                    </div>
                    
                    <b-button
                      v-if="canEdit"
                      type="is-primary"
                      icon-left="plus"
                      @click="addLine"
                      class="mb-3 mt-3"
                    >
                      Afegir línia
                    </b-button>
                  </div>
                </b-field>

                <!-- Totals calculated from lines -->
                <b-field
                  label="Total Caixes"
                  horizontal
                  message="Calculat automàticament des de les línies"
                >
                  <b-input
                    :value="form.units"
                    type="number"
                    disabled
                  />
                </b-field>

                <b-field
                  label="Total Kilograms"
                  horizontal
                  message="Calculat automàticament des de les línies"
                >
                  <b-input
                    :value="form.kilograms"
                    type="number"
                    disabled
                  />
                </b-field>
              </div>

              <!-- Regular fields for non-pickup points -->
              <div v-else>
                <b-field
                  label="Número de caixes *"
                  horizontal
                  :message="form.is_collection_order ? 'Calculat automàticament des de les comandes associades' : 'Nombre de caixes que inclou la comanda'"
                  :type="{ 'is-danger': errors['units'] && submitted }"
                >
                  <b-input
                    v-model="form.units"
                    type="number"
                    :disabled="!canEdit || form.is_collection_order"
                  />
                </b-field>

                <b-field
                  :type="{ 'is-danger': errors['kilograms'] && submitted }"
                  label="Kilograms *"
                  horizontal
                  :message="form.is_collection_order ? 'Calculat automàticament des de les comandes associades' : 'Kilograms totals'"
                >
                  <b-input
                    v-model="form.kilograms"
                    type="number"
                    :disabled="!canEdit || form.is_collection_order"
                  />
                </b-field>
              </div>


              <b-field
                label="Fràgil"
                horizontal
                :message="form.is_collection_order ? 'Calculat automàticament des de les comandes associades' : 'Si la comanda és fràgil, marca aquesta casella'"
              >
                <b-switch
                  v-model="form.fragile"
                  :disabled="!canEdit || form.is_collection_order"
                ></b-switch>
              </b-field>

             


              <hr />

              <h3 class="title is-5 mt-4 mb-3">ON HO DEIXARÀS?</h3>
              <b-field
                v-if="pickups && pickups.length > 0"
                label="Recollida comanda *"
                horizontal
                :type="{ 'is-danger': errors['pickup'] && submitted }"
                class="zmessage-alert"
                :message="form.is_collection_order ? 'Calculat automàticament des de les comandes associades' : (form.pickup && pickups.find(p => p.id === form.pickup) ? pickups.find(p => p.id === form.pickup).message : '')"
              >
                <div class="is-flex-desktop">
                  <button
                    class="button mr-2 mb-2"
                    type="button"
                    v-for="(s, index) in allowedPickups"
                    :class="{
                      'is-warning': form.pickup === s.id,
                      'is-outlined': form.pickup !== s.id
                    }"
                    @click="form.pickup = s.id; updatePickup()"
                    :disabled="!canEdit || form.is_collection_order"
                  >
                    {{ s.name }}
                  </button>
                </div>
              </b-field>

              <b-field
                v-if="collectionPoints && collectionPoints.length > 0"
                label="Punt de recollida en finca *"
                horizontal
                :type="{ 'is-danger': errors['collection_point'] && submitted }"
                :message="form.is_collection_order ? 'Calculat automàticament des de les comandes associades' : 'Selecciona el punt de recollida concret dins de la finca'"
              >
                <div class="is-flex-desktop">
                  <button
                    class="button mr-2 mb-2"
                    type="button"
                    v-for="(cp, index) in collectionPoints"
                    :key="cp.id"
                    :class="{
                      'is-warning': form.collection_point === cp.id,
                      'is-outlined': form.collection_point !== cp.id
                    }"
                    @click="form.collection_point = cp.id; checkTransferNeeded()"
                    :disabled="!canEdit || form.is_collection_order"
                  >
                    {{ cp.name }}
                  </button>
                </div>
              </b-field>

               <b-field
                label="Informació important"
                horizontal
                class="line-notes is-full-width mb-5"
                message="Si hi ha res més a tenir en compte, com si els paquets són de mides poc habituals o hi ha possibilitats d’entrega en un altre lloc proper si hi ha cap incidència..."
              >
                <b-input
                  type="textarea"
                  v-model="form.comments"
                  placeholder="Notes"
                  :disabled="!canEdit"
                />
              </b-field>

              <!-- <b-field
                label="Referència proveïdora"
                horizontal
                message="Si al teu ERP té un nom/codi de comanda concret, pots posar-lo aquí"
              >
                <b-input v-model="form.provider_order_number" />
              </b-field> -->

              <hr />

              <h3 class="title is-5 mt-4 mb-3">HI HA INCIDÈNCIES?</h3>
              <b-field v-if="form.id"
                horizontal
                message="Gestiona les incidències d'aquesta comanda"
              >
                <template #label>
                  Incidències
                  <b-tag v-if="openIncidencesCount > 0" type="is-warning" class="ml-2">
                    {{ openIncidencesCount }} {{ openIncidencesCount === 1 ? 'oberta' : 'obertes' }}
                  </b-tag>
                </template>
                <div class="is-full-width">
                  <div v-for="(incidence, index) in form.incidences" :key="incidence.id || `new-${index}`" class="zbox mb-3">
                    <div class="columns">
                      <div class="column is-9 p-2">
                        <b-field :label="index === 0 ? 'Descripció' : null">
                          <b-input
                            type="textarea"
                            v-model="incidence.description"
                            :disabled="incidence.id"
                            placeholder="Descripció de la incidència"
                          />
                        </b-field>
                        <b-field :label="index === 0 ? 'Estat' : null" class="mt-3">
                          <b-select
                            v-model="incidence.state"
                            :disabled="true"
                          >
                            <option value="open">Oberta</option>
                            <option value="wip">En procés</option>
                            <option value="closed">Tancada</option>
                          </b-select>
                        </b-field>
                      </div>
                      <div class="column is-2 p-2">
                        <b-field :label="index === 0 ? 'Creada / Accions' : null">
                          <div class="is-flex is-flex-direction-column">
                            <span v-if="incidence.created_at" class="is-size-7 mb-2">
                              {{ formatDate(incidence.created_at) }}
                            </span>
                            <span v-else class="is-size-7 has-text-grey-light mb-2">Nova</span>
                            <div class="buttons">
                              <b-button
                                v-if="!incidence.id && canEdit"
                                type="is-danger"
                                size="is-small"
                                icon-left="delete"
                                @click="removeIncidence(index)"
                              >
                              </b-button>
                              <a
                                v-if="incidence.id"
                                :href="`/stats/#/incidences?id=${incidence.id}`"
                                target="_blank"
                                class="button is-info is-small"
                                title="Veure incidència"
                              >
                                <b-icon icon="eye" size="is-small"></b-icon>
                              </a>
                            </div>
                          </div>
                        </b-field>
                      </div>
                    </div>
                  </div>
                  
                  <b-button
                    v-if="canEdit"
                    type="is-primary"
                    icon-left="plus"
                    @click="addIncidence"
                    class="mb-3"
                  >
                    Afegir incidència
                  </b-button>

                  <b-button
                    v-if="form.id"
                    type="is-info"
                    outlined
                    icon-left="alert-circle"
                    @click="openIncidenceModal"
                    class="mb-3 ml-2"
                  >
                    Crear incidència
                  </b-button>
                </div>
              </b-field>

              
              <hr />

              <!-- COLLECTION ORDERS SECTION -->
              <div v-if="form.id">
                <!-- Show collection orders for collection order -->
                <div v-if="form.is_collection_order">
                  <h3 class="title is-5 mt-4 mb-3">
                    COMANDES A RECOLLIR ({{ form.collection_orders.length }})
                  </h3>
                  <b-field
                    horizontal
                    message="Comandes que formen part d'aquesta comanda de recollida"
                  >
                    <div class="is-full-width">
                      <b-table
                        v-if="form.collection_orders && form.collection_orders.length > 0"
                        :data="form.collection_orders"
                        :striped="true"
                        :hoverable="true"
                        :mobile-cards="false"
                      >
                        <b-table-column field="id" label="Comanda" width="120" v-slot="props">
                          <router-link :to="`/order/${props.row.id}`">
                            <strong>#{{ String(props.row.id).padStart(4, '0') }}</strong>
                          </router-link>
                        </b-table-column>

                        <b-table-column field="contact" label="Entrega" v-slot="props">
                          {{ (props.row.contact && props.row.contact.trade_name) || props.row.contact_trade_name || '-' }}
                        </b-table-column>

                        <b-table-column field="units" label="Caixes" width="100" numeric v-slot="props">
                          {{ props.row.units || 0 }}
                        </b-table-column>

                        <b-table-column field="kilograms" label="Kg" width="100" numeric v-slot="props">
                          {{ props.row.kilograms || 0 }}
                        </b-table-column>

                        <b-table-column field="status" label="Estat" width="150" v-slot="props">
                          <b-tag :type="getStatusColor(props.row.status)">
                            {{ getStatusName(props.row.status) }}
                          </b-tag>
                        </b-table-column>

                        <b-table-column label="Dipositat" width="120" v-slot="props">
                          <div v-if="props.row.deposit_date">
                            <b-icon icon="check-circle" type="is-success"></b-icon>
                          </div>
                          <div v-else>
                            <b-button
                              type="is-info"
                              size="is-small"
                              @click="depositCollectionOrder(props.row.id)"
                              :loading="isLoadingDeposit[props.row.id]"
                            >
                              Dipositar
                            </b-button>
                          </div>
                        </b-table-column>

                        <b-table-column label="Recollit" width="120" v-slot="props">
                          <div v-if="props.row.pickup_date">
                            <b-icon icon="check-circle" type="is-success"></b-icon>
                          </div>
                          <div v-else>
                            <b-button
                              type="is-info"
                              size="is-small"
                              @click="pickupCollectionOrder(props.row.id)"
                              :loading="isLoadingPickup[props.row.id]"
                              :disabled="!(permissions.includes('orders_admin') || permissions.includes('orders_delivery'))"
                            >
                              Recollir
                            </b-button>
                          </div>
                        </b-table-column>

                        <template #empty>
                          <div class="has-text-centered has-text-grey-light p-4">
                            No hi ha comandes associades encara
                          </div>
                        </template>
                      </b-table>
                      <div v-else class="has-text-grey-light has-text-centered p-4">
                        No hi ha comandes associades encara
                      </div>
                    </div>
                  </b-field>
                </div>

                <!-- Show collection order for regular order -->
                <div v-else-if="form.collection_order">
                  <h3 class="title is-5 mt-4 mb-3">COMANDA DE RECOLLIDA</h3>
                  
                  <b-message v-if="isCollectionOrderDateBeforeMainOrder" type="is-warning" class="mb-4">
                    <strong>Atenció!</strong> La data prevista d'entrega és anterior a la data prevista de recollida.
                  </b-message>
                  
                  <b-field
                    horizontal
                    message="Aquesta comanda forma part d'una recollida en finca"
                  >
                    <div class="is-full-width">
                      <b-table
                        :data="[form.collection_order]"
                        :striped="true"
                        :hoverable="true"
                        :mobile-cards="false"
                      >
                        <b-table-column field="id" label="Comanda" width="150" v-slot="props">
                          <router-link :to="`/order/${props.row.id || props.row}`">
                            <strong>#{{ String(props.row.id || props.row).padStart(4, '0') }}-R</strong>
                          </router-link>
                        </b-table-column>

                        <b-table-column field="estimated_delivery_date" width="120" label="Data prevista" v-slot="props">
                          {{ props.row.estimated_delivery_date || '-' }}
                        </b-table-column>

                        <!-- <b-table-column field="contact" label="Punt de recollida" v-slot="props">
                          {{ (props.row.contact_trade_name || props.row.contact_name) || '-' }}
                        </b-table-column> -->

                        <b-table-column field="route" label="Ruta" width="250" v-slot="props">
                          {{ (props.row.route && (props.row.route.short_name || props.row.route.name)) || '-' }}
                        </b-table-column>

                        <b-table-column field="units" width="120" label="Unitats" v-slot="props">
                          {{ props.row.units || '-' }}
                        </b-table-column>


                        <b-table-column field="kilograms" width="120" label="Kg" v-slot="props">
                          {{ props.row.kilograms || '-' }}
                        </b-table-column>

                        <b-table-column field="status" label="Estat" width="120" v-slot="props">
                          <b-tag v-if="props.row.status" :type="getStatusColor(props.row.status)">
                            {{ getStatusName(props.row.status) }}
                          </b-tag>
                        </b-table-column>

                        <b-table-column field="finalPrice" label="Preu" width="100" numeric v-slot="props">
                          <money-format
                            :value="calculateFinalPrice(props.row)"
                            :locale="'es'"
                            :currency-code="'EUR'"
                            :subunits-value="false"
                            :hide-subunits="false"
                          />
                        </b-table-column>
                      </b-table>
                    </div>
                  </b-field>
                </div>
              </div>

              <hr v-if="form.id && (form.is_collection_order || form.collection_order)" />

              <!-- <b-field
                label="Ruta *"
                horizontal
                :type="{ 'is-danger': errors['route'] && submitted }"
                message="Escull la ruta tenint en compte el dia de la setmana i la destinació de la comanda. Així se t’aplicarà la tarifa corresponent. En cas de dubte, consulta’ns"
              >
                <b-select
                  @input="changeRoute"
                  v-model="form.route"
                  placeholder=""
                  :disabled="!canEdit"
                >
                  <option
                    v-for="(s, index) in routes"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field> -->


              <h3 class="title is-5 mt-4 mb-3">ALTRES DADES</h3>

              <b-field
                label="Estat"
                horizontal
                message="Estat actual de la comanda"
              >
                <div class=" is-flex-desktop ">
                  <button
                    class="button mr-2 mb-2"
                    type="button"
                    v-for="(s, index) in statuses"
                    :class="{
                      'is-warning': form.status === s.id,
                      'is-outlined': form.status !== s.id
                    }"
                    @click="form.status = s.id"
                    :disabled="!(permissions.includes('orders_admin') || permissions.includes('orders_delivery'))"
                  >
                    {{ s.name }}
                  </button>
                </div>
              </b-field>

              <b-field
                label="Última milla"
                horizontal
                message="En cas de que la comanda passi per última milla, aquesta casella es marcarà automàticament, però també pots marcar-la manualment si ja ho saps"
                v-if="permissions.includes('orders_admin') || permissions.includes('orders_delivery')"
              >
                <b-switch
                  v-model="form.last_mile"
                  :disabled="!canEdit"
                ></b-switch>
              </b-field>

              <b-field
                label="Transferència"
                horizontal
                message="Indica si la comanda necessita una transferència"
                v-if="permissions.includes('orders_admin') || permissions.includes('orders_delivery')"
              >
                <div class="is-flex is-align-items-center">
                  <b-switch
                    v-model="form.transfer"
                    :disabled="true"
                  ></b-switch>
                  <b-tag v-if="form.transfer" :type="transferStatusType" class="ml-3">
                    {{ transferStatus }}
                  </b-tag>
                </div>
              </b-field>

              <b-field
                label="Origen transferència"
                horizontal
                message="Punt de recollida on es deposita la comanda"
                v-if="(permissions.includes('orders_admin') || permissions.includes('orders_delivery')) && form.transfer && form.transfer_pickup_origin"
              >
                <span>{{ getPickupName(form.transfer_pickup_origin) }}</span>
              </b-field>

              <b-field
                label="Destinació transferència"
                horizontal
                message="Punt de recollida on es farà la transferència"
                v-if="(permissions.includes('orders_admin') || permissions.includes('orders_delivery')) && form.transfer && form.transfer_pickup_destination"
              >
                <span>{{ getPickupName(form.transfer_pickup_destination) }}</span>
              </b-field>

              <b-field
                label="Ruta completa"
                horizontal
                message="Recorregut complet desde la recollida fins l'entrega"
                v-if="(permissions.includes('orders_admin') || permissions.includes('orders_delivery')) && completeRouteText"
              >
                <span>{{ completeRouteText }}</span>
              </b-field>

              

              <b-field
                label="Data comanda *"
                horizontal
                :type="{ 'is-danger': errors['route_date'] && submitted }"
                message="Data de creació de la comanda"
              >
                <b-datepicker
                  :disabled="!(permissions.includes('orders_admin') || permissions.includes('orders_delivery'))"
                  v-model="form.route_date"
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

              <!-- <b-field
                label="Data prevista d'entrega"
                horizontal
                message="Si prefereixis que s'entregui més endavant, tria una data del calendari."
              >
                <b-datepicker
                  :disabled="!canEdit"
                  v-model="form.estimated_delivery_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data"
                  trap-focus
                  editable
                  @input="checkEstimatedDeliveryDate"
                >
                </b-datepicker>
              </b-field> -->

              <b-message v-if="dateWarningMessage" type="is-warning">
                {{ dateWarningMessage }}
              </b-message>
              <b-field
                label="Data lliurament"
                horizontal
                message="Data en la que la comanda ha estat entregada"
                v-if="permissions.includes('orders_admin') || permissions.includes('orders_delivery')"
              >
                <b-datepicker
                  :disabled="!(permissions.includes('orders_admin') || permissions.includes('orders_delivery'))"
                  v-model="form.delivery_date"
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
                label="Data facturació"
                horizontal
                message="Data en la que la comanda ha estat facturada"
                v-if="form.emitted_invoice_datetime"
              >              
                <b-datetimepicker
                  :disabled="true"
                  v-model="form.emitted_invoice_datetime"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data"
                  trap-focus
                >
                </b-datetimepicker>
              </b-field>

              <b-field label="Tarifa" horizontal class="line-notes mb-5">
                <span>{{ route_rate ? route_rate.name : "no trobada" }}</span>
              </b-field>

              <b-field label="Preu" horizontal class="line-notes mb-5">
                <div class="is-flex mt-1">
                  <money-format
                    class="has-text-left"
                    :value="route_price"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                  <button
                    v-if="permissions.includes('orders_admin') || permissions.includes('orders_delivery')"
                    class="button is-warning is-small ml-4 mt--6"
                    type="button"
                    @click="changeRate"
                    title="Recalcular preu"
                  >
                    <b-icon icon="refresh"></b-icon>
                  </button>
                </div>
              </b-field>

              <b-field label="Descompte multientrega / recollida / volum" horizontal class="mb-5" v-if="form.multidelivery_discount || form.contact_pickup_discount || form.volume_discount">
                <b-input
                  :value="(form.multidelivery_discount || 0) + '%'"
                  type="text"
                  :disabled="true"></b-input>
                  <b-input
                    :value="(form.contact_pickup_discount || 0)	+ '%'"
                  type="text"
                  :disabled="true"></b-input>
                  <b-input
                    :value="(-1 * form.volume_discount || 0) + ' €'"
                  type="text"
                  :disabled="true"></b-input>
              </b-field>

              <b-field label="Preu amb descompte" horizontal class="mb-5" v-if="form.multidelivery_discount || form.contact_pickup_discount || form.volume_discount">
                <b-input
                  :value="( (route_price + (-1 * form.volume_discount || 0)) * ( 1 - form.multidelivery_discount / 100) * ( 1 - form.contact_pickup_discount / 100) ).toFixed(2) + ' €'"
                  type="text"
                  :disabled="true"></b-input>
              </b-field>
              
              <div class="hr"></div>
              <h3 class="title is-5 mt-4 mb-3">ACCIONS</h3>

              <b-field
                v-if="form.id && !form.is_collection_order"
                horizontal
                label="Albarà"
                message="Imprimeix l'albarà i enganxa'n un full a cada caixa. El teu albarà propi posa'l a dins d'una de les caixes"
              >
                <b-button type="is-primary" :loading="isLoading" @click="getPDF"
                  >Imprimeix albarà</b-button
                >
              </b-field>

              <!-- depositar i recollir -->

              <b-field 
                v-if="!form.is_collection_order"
                horizontal 
                label="Dipòsit"
                message="Informa que has dipositat els paquets">
                <div v-if="form.deposit_date && form.deposit_user">
                  <p>
                    <strong>Data:</strong> {{ formatDateTime(form.deposit_date) }}<br/>
                    <strong>Usuari:</strong> {{ form.deposit_user.username || form.deposit_user.fullname }}
                  </p>
                  <b-button
                    type="is-danger"
                    size="is-small"
                    :loading="isLoading"
                    @click="removeDeposit"
                    v-if="canEdit"
                    >Eliminar</b-button
                  >
                </div>
                <div v-else>
                  <b-button
                    type="is-info"
                    :loading="isLoading"
                    @click="depositOrder"
                    v-if="canEdit && form.id"
                    >Dipositar</b-button
                  >
                </div>
              </b-field>

              <b-field 
                v-if="!form.is_collection_order"
                horizontal 
                label="Recollida"
                message="Informa que has recollit els paquets">
                <div v-if="form.pickup_date && form.pickup_user">
                  <p>
                    <strong>Data:</strong> {{ formatDateTime(form.pickup_date) }}<br/>
                    <strong>Usuari:</strong> {{ form.pickup_user.username || form.pickup_user.fullname }}
                  </p>
                  <b-button
                    type="is-danger"
                    size="is-small"
                    :loading="isLoading"
                    @click="removePickup"
                    v-if="canEdit"
                    >Eliminar</b-button
                  >
                </div>
                <div v-else>
                  <b-button
                    type="is-info"
                    :loading="isLoading"
                    @click="pickupOrder"
                    v-if="canEdit && form.id"
                    >Recollir</b-button
                  >
                </div>
              </b-field>

              <b-field horizontal label="Inici transferència"
                message="Informa que has iniciat la transferència"
                v-if="form.transfer">
                <div v-if="form.transfer_start_date && form.transfer_start_user">
                  <p>
                    <strong>Data:</strong> {{ formatDateTime(form.transfer_start_date) }}<br/>
                    <strong>Usuari:</strong> {{ form.transfer_start_user.username || form.transfer_start_user.fullname }}
                  </p>
                  <b-button
                    type="is-danger"
                    size="is-small"
                    :loading="isLoading"
                    @click="removeTransferStart"
                    v-if="canEdit"
                    >Eliminar</b-button
                  >
                </div>
                <div v-else>
                  <b-button
                    type="is-info"
                    :loading="isLoading"
                    @click="startTransfer"
                    v-if="canEdit && form.id"
                    >Iniciar transferència</b-button
                  >
                </div>
              </b-field>

              <b-field horizontal label="Fi transferència"
                message="Informa que has finalitzat la transferència"
                v-if="form.transfer">
                <div v-if="form.transfer_end_date && form.transfer_end_user">
                  <p>
                    <strong>Data:</strong> {{ formatDateTime(form.transfer_end_date) }}<br/>
                    <strong>Usuari:</strong> {{ form.transfer_end_user.username || form.transfer_end_user.fullname }}
                  </p>
                  <b-button
                    type="is-danger"
                    size="is-small"
                    :loading="isLoading"
                    @click="removeTransferEnd"
                    v-if="canEdit"
                    >Eliminar</b-button
                  >
                </div>
                <div v-else>
                  <b-button
                    type="is-info"
                    :loading="isLoading"
                    @click="endTransfer"
                    v-if="canEdit && form.id && form.transfer_start_date"
                    >Finalitzar transferència</b-button
                  >
                </div>
              </b-field>

              <hr />

              <b-field horizontal label="Accions">
                <b-button
                  type="is-primary"
                  :loading="isLoading"
                  @click="submit(false)"
                  >Guardar</b-button
                >

                <b-button
                  type="is-primary"
                  :loading="isLoading"
                  @click="submit(true)"
                  >Guardar i sortir</b-button
                >

                <b-button type="is-warning" :loading="isLoading" @click="exit"
                  >Sortir</b-button
                >

                <b-button
                  type="is-danger"
                  :loading="isLoading"
                  @click="deleteOrder"
                  v-if="canCancel"
                  >Anul·lar Comanda</b-button
                >
              </b-field>
            </form>
          </card-component>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import dayjs from "dayjs";
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import service from "@/service/index";
import MoneyFormat from "@/components/MoneyFormat.vue";
import sumBy from "lodash/sumBy";
import { mapState } from "vuex";
import moment from "moment";
import sortBy, { name } from "lodash/sortBy";
import concat from "lodash/concat";
import {
  assignRouteRate,
  assignRouteDate,
  checkIfDateIsValidInroute,
  calculateRoutePrice
} from "@/service/assignRouteRate";
import ModalBoxContactUser from "@/components/ModalBoxContactUser";
import ModalBoxIncidence from "@/components/ModalBoxIncidence";
import getConfig from '@/config'

export default {
  name: "OrdersForm",
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat,
    ModalBoxContactUser,
    ModalBoxIncidence
  },
  props: {
    id: {
      type: [String, Number],
      default: null
    }
  },
  data() {
    return {
      isProfileExists: false,
      isLoading: false,
      submitted: false,
      series: [],
      form: this.getClearFormObject(),
      routes: [],
      products: [],
      users: [],
      contacts: [],
      sociesContacts: [],
      cities: [],
      cityRoutes: [],
      pickups: [],
      deliveryTypes: [],
      permissions: [],
      orders: [],
      firstStatus: "pending",
      statuses: [
        { id: "pending", name: "PENDENT" },
        { id: "deposited", name: "DEPOSITADA" },
        { id: "processed", name: "PROCESSADA" },
        { id: "lastmile", name: "ÚLTIMA MILLA" },
        { id: "delivered", name: "LLIURADA" },
        { id: "invoiced", name: "FACTURADA" },
        { id: "cancelled", name: "ANUL·LADA" }
      ],
      legalForms: [],
      // array from 0 to 23 with 15 minutes intervals
      contact_time_slots: Array.from({ length: 96 }, (_, i) => i / 4),
      routeRates: [],
      contactSearch: "",
      citySearch: "",
      apiUrl: process.env.VUE_APP_API_URL,
      dateWarningMessage: "",
      isModalActive: false,
      isIncidenceModalActive: false,
      isLoadingDeposit: {},
      isLoadingPickup: {},
    };
  },
  computed: {
    ...mapState(["me"]),
    titleStack() {
      return ["Comandes", this.formCardTitle];
    },
    formCardTitle() {
      if (this.form.id) {
        const collection = this.form.is_collection_order ? "-R" : "";
        return `Comanda #${this.form.id.toString().padStart(4, "0")}${collection}`;
      } else {
        return !this.isPickupPoint ? "Nova comanda" : "Nova comanda punt de consum";
      }
    },
    transitionName() {
      if (this.useTransition) {
        return "fade";
      }
      return "x";
    },
    canCancel() {
      return (
        (this.form.id &&
          this.form.status !== "cancelled" &&
          (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))) ||
        (this.form.status === "pending" &&
          !(this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery")))
      );
    },
    canEditContact() {
      return (
        (this.form.contact && !this.form.contact_multiowner && !this.isPickupPoint) 
        ||
        (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))
      );
    },
    canEdit() {
      return (
        (this.form.id &&
          this.form.status !== "cancelled" &&
          (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))) ||
        (this.form.status === "pending" &&
          !(this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))) ||
        !this.form.id
      );
    },
    canChangeRate() {
      // console.log('this.form.status', this.form.status)
      return ["pending"].includes(this.form.status);
    },
    isPickupPoint() {
      return this.form.pickup_point === true;
    },    
    errors() {
      const isContactValid = this.form.contact && this.contacts.some(c => c.id === this.form.contact);
      const baseErrors = {
        owner: this.form.owner === null,
        route: this.form.route === null,
        contact: !this.form.contact || !isContactValid,
        delivery_date: this.form.delivery_date === null,
        delivery_type: this.form.delivery_type === null,
        pickup: this.form.pickup == null,
        contact_name:
          this.form.contact_name === null || this.form.contact_name === "",
        contact_nif:
          this.form.contact_nif === null || this.form.contact_nif === "",
        contact_legal_form: this.form.contact_legal_form === null,
        contact_address:
          this.form.contact_address === null ||
          this.form.contact_address === "",
        contact_postcode:
          this.form.contact_postcode === null ||
          this.form.contact_postcode === "",
        contact_city:
          this.form.contact_city === null || this.form.contact_city === "",
        contact_phone:
          this.form.contact_phone === null || this.form.contact_phone === ""
      };

      // Validate collection_point if it's required (when pickup is selected and has collection points available)
      if (this.collectionPoints && this.collectionPoints.length > 0) {
        baseErrors.collection_point = !this.form.collection_point;
      }

      if (this.isPickupPoint) {
        // For pickup points, validate lines instead of direct units/kilograms
        baseErrors.lines = !this.form.lines || this.form.lines.length === 0 ||
          this.form.lines.some(line => 
            !line.units || line.units <= 0 ||
            !line.kilograms || line.kilograms <= 0 ||
            !line.name || line.name.trim() === ""
          );
      } else {
        // For regular orders, validate units and kilograms directly
        baseErrors.units = this.form.units === null || this.form.units <= 0;
        baseErrors.kilograms = this.form.kilograms === null ||
          this.form.kilograms === "" ||
          this.form.kilograms <= 0;
      }

      return baseErrors;
    },
    route_rate() {
      //console.log("route_rate");
      if (!this.canChangeRate) {
        return this.form.route_rate;
      }
      const rr = assignRouteRate(this.form, this.routeRates, this.orders);
      this.form.route_rate = rr;
      return this.form.route_rate;
    },
    route_price() {
      if (!this.canChangeRate) {
        return this.form.price;
      }
      if (this.form.kilograms !== null && this.route_rate !== null) {
        this.form.price = calculateRoutePrice(this.route_rate, this.form.kilograms, this.form.lines ? this.form.lines.length : 0);
      }
      const discountEffectAsOne = ( this.form.multidelivery_discount || 1) / (this.form.multidelivery_discount || 1);
      return this.form.price * discountEffectAsOne;
    },
    filteredContacts() {
      return this.contacts.filter(option => {
        return (
          option.display
            .toString()
            .toLowerCase()
            .indexOf(this.contactSearch.toLowerCase()) >= 0 ||
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.contactSearch.toLowerCase()) >= 0 ||
          option.trade_name
            .toString()
            .toLowerCase()
            .indexOf(this.contactSearch.toLowerCase()) >= 0 ||
          option.id
            .toString()
            .toLowerCase()
            .indexOf(this.contactSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredCities() {
      return this.cities.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.citySearch.toLowerCase()) >= 0
        );
      });
    },
    allowedPickups() {
      // Find the contact (sòcia) associated with the selected owner (user)
      const ownerContact = this.sociesContacts.find(c => 
        c.users_permissions_user && c.users_permissions_user.id === this.form.owner
      );
      const hasCollectionPoints = ownerContact && ownerContact.collection_points && ownerContact.collection_points.length > 0;
      
      return this.pickups.filter(
        p =>
          !p.pickup ||
          (p.pickup && hasCollectionPoints)
      );
    },
    collectionPoints() {
      if (!this.form.owner || !this.form.pickup) {
        return [];
      }
      
      const selectedPickup = this.pickups.find(p => p.id === this.form.pickup);
      if (!selectedPickup || !selectedPickup.pickup) {
        return [];
      }
      
      // Find the contact (sòcia) associated with the selected owner (user)
      const ownerContact = this.sociesContacts.find(c => 
        c.users_permissions_user && c.users_permissions_user.id === this.form.owner
      );
      
      if (!ownerContact || !ownerContact.collection_points || ownerContact.collection_points.length === 0) {
        return [];
      }
      
      // Return the collection points for this contact/sòcia
      // Assuming collection_points might be IDs or objects
      return ownerContact.collection_points.map(cp => {
        if (typeof cp === 'object' && cp.id) {
          return cp;
        }
        // If it's just an ID, we need to fetch the pickup details
        return this.pickups.find(p => p.id === cp) || { id: cp, name: `Punt ${cp}` };
      });
    },
    openIncidencesCount() {
      if (!this.form.incidences || !Array.isArray(this.form.incidences)) {
        return 0;
      }
      return this.form.incidences.filter(inc => inc.state !== 'closed').length;
    },
    isCollectionOrderDateAfterMainOrder() {
      if (!this.form.collection_order || !this.form.estimated_delivery_date) {
        return false;
      }
      const collectionDate = this.form.collection_order.estimated_delivery_date;
      if (!collectionDate) {
        return false;
      }
      return moment(collectionDate).isAfter(moment(this.form.estimated_delivery_date), 'day');
    },
    transferStatus() {
      if (!this.form.transfer) return "";
      
      if (this.form.transfer_end_date) {
        return "FINALITZADA";
      } else if (this.form.transfer_start_date) {
        return "EN TRANSFER";
      } else {
        return "NO INICIADA";
      }
    },
    transferStatusType() {
      if (!this.form.transfer) return "";
      
      if (this.form.transfer_end_date) {
        return "is-success";
      } else if (this.form.transfer_start_date) {
        return "is-warning";
      } else {
        return "is-light";
      }
    },
    completeRouteText() {
      if (!this.form) return "";

      // Build movement chain showing all steps from pickup to delivery
      const movements = [];

      // Add pickup if exists
      if (this.form.pickup) {
        const pickup = this.pickups.find(p => p.id === this.form.pickup);
        if (pickup) {
          const pickupAlias = pickup.alias || pickup.name;
          if (pickupAlias) {
            movements.push(pickupAlias);
          }
        }
      }

      // Add transfer origin if exists (and different from pickup)
      if (this.form.transfer_pickup_origin) {
        const origin = this.pickups.find(p => p.id === this.form.transfer_pickup_origin);
        if (origin) {
          const originAlias = origin.alias || origin.name;
          // Only add if it's not empty and not already the last item
          if (
            originAlias &&
            (movements.length === 0 ||
              movements[movements.length - 1] !== originAlias)
          ) {
            movements.push(originAlias);
          }
        }
      }

      // Add transfer destination if exists
      if (this.form.transfer_pickup_destination) {
        const destination = this.pickups.find(p => p.id === this.form.transfer_pickup_destination);
        if (destination) {
          const destinationAlias = destination.alias || destination.name;
          // Only add if it's not empty and not already the last item
          if (
            destinationAlias &&
            (movements.length === 0 ||
              movements[movements.length - 1] !== destinationAlias)
          ) {
            movements.push(destinationAlias);
          }
        }
      }

      // Add route name at the end
      if (this.form.route) {
        const route = this.routes.find(r => r.id === this.form.route);
        if (route) {
          const routeName = route.short_name || route.name;
          if (routeName) {
            movements.push(routeName);
          }
        }
      }

      // Create the transfer text if there are multiple movements
      if (movements.length > 1) {
        return movements.join(" -> ");
      }

      return "";
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
  async created() {
    const config = getConfig();
    this.apiUrl = config.VUE_APP_API_URL;

    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    this.permissions = me.data.permissions.map(p => p.permission);
    this.getData();

    // check if url has pickup_point=true
    if (this.$route.query.pickup_point === "true") {
      this.isPickupPoint = this.$route.query.pickup_point === "true";
      this.form.pickup_point = true;
      this.form.picked_up = false
    }
    

  },
  methods: {
    getClearFormObject() {
      return {
        id: null,
        route_date: new Date(),
        estimated_delivery_date: null,
        delivery_date: null,
        status: "pending",
        owner: null,
        route: null,
        contact: null,
        contact_name: "",
        contact_trade_name: "",
        contact_nif: "",
        contact_address: "",
        contact_postcode: "",
        contact_notes: "",
        contact_city: "",
        contact_city_id: null,
        contact_phone: "",
        contact_legal_form: 1,
        delivery_type: null,
        pickup: null,
        collection_point: null,
        units: null,
        kilograms: null,
        routeFestives: [],
        contact_pickup_discount: 0,
        pickup_point: false,
        lines: [],
        multidelivery_discount: 0,
        deposit_date: null,
        deposit_user: null,
        pickup_date: null,
        pickup_user: null,
        transfer_start_date: null,
        transfer_start_user: null,
        transfer_end_date: null,
        transfer_end_user: null,
        transfer_pickup_origin: null,
        transfer_pickup_destination: null,
        incidences: [],
        transfer: false
      };
    },
    async getData() {
      this.isLoading = true;
      await this.getAuxiliarData();

      if (this.$route.params.id && this.$route.params.id > 0) {
        service({ requiresAuth: true })
          .get(`orders/${this.$route.params.id}`)
          .then(async r => {
            if (r.data && r.data.id) {
              this.isProfileExists = true;
              this.form = r.data;
              this.firstStatus = this.form.status;

              this.normalizeIdsInForm("owner");
              this.normalizeIdsInForm("route");
              this.normalizeIdsInForm("product");
              this.normalizeIdsInForm("contact");
              this.normalizeIdsInForm("pickup");
              this.normalizeIdsInForm("collection_point");
              this.normalizeIdsInForm("delivery_type");
              this.normalizeIdsInForm("contact_legal_form");
              this.normalizeIdsInForm("transfer_pickup_origin");
              this.normalizeIdsInForm("transfer_pickup_destination");

              this.form.route_date = moment(
                this.form.route_date,
                "YYYY-MM-DD"
              ).toDate();

              if (this.form.delivery_date) {
                this.form.delivery_date = moment(
                  this.form.delivery_date,
                  "YYYY-MM-DD"
                ).toDate();
              }

              if (this.form.estimated_delivery_date) {
                this.form.estimated_delivery_date = moment(
                  this.form.estimated_delivery_date,
                  "YYYY-MM-DD"
                ).toDate();
              }
              
              if (this.form.emitted_invoice_datetime) {
                this.form.emitted_invoice_datetime = moment(
                  this.form.emitted_invoice_datetime
                ).toDate();
              }

              const me = await service({
                requiresAuth: true,
                cached: true
              }).get("users/me");
              if (
                !(this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery")) &&
                this.form.owner !== me.data.id
              ) {
                this.$router.push({ name: "orders.view" });
              }

              await this.refreshClients(this.form.owner);

              const c = this.contacts.find(c => c.id === this.form.contact);
              this.contactSearch = `${c.trade_name} (${this.form.contact})`;

              if (this.cities.find(c => c.name === this.form.contact_city)) {
                this.citySearch = this.form.contact_city;
                this.form.contact_city_id = this.cities.find(
                  c => c.name === this.form.contact_city
                ).id;
                this.citySelected(
                  this.cities.find(c => c.name === this.form.contact_city)
                );
              }

              // Ensure contact_legal_form is properly normalized - never an empty object
              if (this.form.contact_legal_form && typeof this.form.contact_legal_form === 'object') {
                if (this.form.contact_legal_form.id) {
                  this.form.contact_legal_form = this.form.contact_legal_form.id;
                } else {
                  // Empty object or object without id
                  this.form.contact_legal_form = 1;
                }
              } else if (!this.form.contact_legal_form || this.form.contact_legal_form === 0) {
                this.form.contact_legal_form = 1;
              }

              if (this.form.route && this.form.route.id) {
                this.form.route = this.form.route.id;
              }

              this.orders = (
                await service({ requiresAuth: true }).get(
                  `orders?_limit=-1&_where[status]=pending&_where[route]=${this.form.route}&_where[owner]=${this.form.owner}`
                )
              ).data;

              await assignRouteRate(this.form, this.routeRates, this.orders);

              // Ensure incidences is always an array
              if (!this.form.incidences || !Array.isArray(this.form.incidences)) {
                this.form.incidences = [];
              }

              this.isLoading = false;
            } else {
            }
          });
      } else {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        if (!(this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))) {
          this.form.owner = me.data.id;
        }

        this.form.delivery_type = this.deliveryTypes[0].id;

        await this.refreshClients(me.data.id);

        this.isLoading = false;
      }
    },
    normalizeIdsInForm(property) {
      if (this.form[property] && typeof this.form[property] === 'object') {
        // Check if it's an object with an id property
        if (this.form[property].id) {
          this.form[property] = this.form[property].id;
        } else {
          // Empty object or object without id - set to null or 0 based on the property
          this.form[property] = property === 'contact_legal_form' ? 1 : 0;
        }
      } else if (!this.form[property]) {
        // Null or undefined - set to default
        this.form[property] = property === 'contact_legal_form' ? 1 : 0;
      }
    },
    ensureContactLegalFormIsValid(data) {
      // Helper method to ensure contact_legal_form is never an empty object or invalid
      if (data.contact_legal_form && typeof data.contact_legal_form === 'object') {
        if (data.contact_legal_form.id) {
          data.contact_legal_form = data.contact_legal_form.id;
        } else {
          data.contact_legal_form = 1; // Default value
        }
      } else if (!data.contact_legal_form || data.contact_legal_form === 0) {
        data.contact_legal_form = 1; // Default value
      }
      return data;
    },
    async getAuxiliarData() {
      if (this.$route.params.id && this.$route.params.id > 0) {
        this.routes = (
          await service({ requiresAuth: true, cached: true }).get(
            "routes?_limit=-1&_sort=order:ASC"
          )
        ).data;
      } else {
        this.routes = (
          await service({ requiresAuth: true, cached: true }).get(
            "routes?_limit=-1&_where[active]=true&_sort=order:ASC"
          )
        ).data;
      }

      const users = (
        await service({ requiresAuth: true, cached: true }).get(
          "users?_limit=-1"
        )
      ).data.filter(u =>
        u.permissions.map(p => p.permission).includes("orders")
      );

      const me = await service({ requiresAuth: true, cached: true }).get(
        "users/me"
      );
      const permissions = me.data.permissions.map(p => p.permission);

      if (!(permissions.includes("orders_admin") || permissions.includes("orders_delivery"))) {
        this.users = users.filter(u => u.id == me.data.id);
      } else {
        this.users = users;
        this.users = concat(
          { id: 0, fullname: "--", username: "--" },
          this.users
        );
      }

      if (!(permissions.includes("orders_admin") || permissions.includes("orders_delivery"))) {
        // this.users = this.users.filter(u => u.id == me.data.id);
      }

      this.products = (
        await service({ requiresAuth: true, cached: true }).get(
          "products?_limit=-1"
        )
      ).data;

      this.pickups = (
        await service({ requiresAuth: true, cached: true }).get(
          "pickups?_limit=-1"
        )
      ).data;

      this.deliveryTypes = (
        await service({ requiresAuth: true, cached: true }).get(
          "delivery-types?_limit=-1"
        )
      ).data;

      this.routeRates = (
        await service({ requiresAuth: true, cached: true }).get(
          "route-rates?_limit=-1"
        )
      ).data;

      this.legalForms = (
        await service({ requiresAuth: true }).get("legal-forms")
      ).data;

      this.cities = (
        await service({ requiresAuth: true }).get("cities?_limit=-1&_sort=name")
      ).data;

      this.cityRoutes = (
        await service({ requiresAuth: true }).get("city-routes?_limit=-1")
      ).data;

      this.routeFestives = (
        await service({ requiresAuth: true }).get("route-festives?_limit=-1")
      ).data;

      this.sociesContacts = (
        await service({ requiresAuth: true }).get("contacts?_where[users_permissions_user_gt]=0")
      ).data;
    },
    async changeOwner() {
      this.refreshClients(this.form.owner);

      this.changeRoute();
    },
    async changeRoute() {
      
      if (this.form.owner && this.form.route) {
        this.orders = (
          await service({ requiresAuth: true }).get(
            `orders?_limit=-1&_where[status]=pending&_where[route]=${this.form.route}&_where[owner]=${this.form.owner}`
          )
        ).data;
      }
      if (this.form.route) {
        const route = this.routes.find(r => r.id === this.form.route);
        const routeDate = assignRouteDate(route);
        const nextDay = routeDate.nextDay;
        if (this.form.status === "pending" || this.form.status === "deposited") {
          this.form.estimated_delivery_date = nextDay.toDate();
        }
        if (routeDate.warning) {
          this.dateWarningMessage = routeDate.warning;
          this.$buefy.toast.open({
            message: routeDate.warning,
            type: "is-warning"
          });
        } else {
          this.dateWarningMessage = "";
        }
      }
      this.checkMultidelivery();
      this.checkTransferNeeded();
    },
    async checkEstimatedDeliveryDate() {
      const route = this.routes.find(r => r.id === this.form.route);
      const valid = checkIfDateIsValidInroute(
        route,
        moment(this.form.estimated_delivery_date),
        this.routeFestives
      );
      if (!valid) {
        this.dateWarningMessage =
          "Atenció! La data de lliurament no és vàlida per la ruta seleccionada";
      } else {
        this.dateWarningMessage = "";
      }
      this.checkMultidelivery()
    },
    async deleteOrder() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols anul·lar la comanda?",
        onConfirm: async () => {
          await service({ requiresAuth: true }).put(`orders/${this.form.id}`, {
            status: "cancelled"
          });
          this.$router.push({ name: "orders.view" });
        },
        onCancel: () => {}
      });
    },
    exit() {
      this.$router.push({ name: "orders.view" });
    },
    validateEstimateDateDayOfWeek() {
      if (this.form.route && this.form.estimated_delivery_date) {
        const route = this.routes.find(r => r.id === this.form.route);
        const dayOfWeek = this.form.estimated_delivery_date.getDay();
        //console.log("dayOfWeek", dayOfWeek, route);
        let error = false;
        if (dayOfWeek === 0 && !route.sunday) {
          error = "La ruta seleccionada no es fa en diumenge";
        } else if (dayOfWeek === 1 && !route.monday) {
          error = "La ruta seleccionada no es fa dilluns";
        } else if (dayOfWeek === 2 && !route.tuesday) {
          error = "La ruta seleccionada no es fa dimarts";
        } else if (dayOfWeek === 3 && !route.wednesday) {
          error = "La ruta seleccionada no es fa dimecres";
        } else if (dayOfWeek === 4 && !route.thursday) {
          error = "La ruta seleccionada no es fa dijous";
        } else if (dayOfWeek === 5 && !route.friday) {
          error = "La ruta seleccionada no es fa divendres";
        } else if (dayOfWeek === 6 && !route.saturday) {
          error = "La ruta seleccionada no es fa dissabte";
        }

        if (error && !(this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))) {
          this.$buefy.snackbar.open({
            message: error,
            queue: false,
            type: "is-danger"
          });
          return false;
        }
        else if (error && (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))) {
          this.$buefy.snackbar.open({
            message: error,
            queue: false,
            type: "is-warning"
          });
          return true;
        }
        return true;
      }
      // console.log('this.route', this.form.route)
      // console.log('this.form.estimated_delivery_date', this.form.estimated_delivery_date)
    },
    async submit(exit) {
      this.isLoading = true;
      this.submitted = true;

      if (this.permissions.includes("orders") && !this.form.owner) {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        this.form.owner = me.data.id;
      }

      //console.log("this.form", this.form);
      if (this.form.status === "delivered" && !this.form.delivery_date) {
        this.form.delivery_date = new Date().toISOString().split("T")[0];
      }

      try {
        const routeValid = this.validateEstimateDateDayOfWeek();

        if (!routeValid) {
          this.isLoading = false;
          return;
        }

        if (this.form.units <= 0 || this.form.kilograms <= 0) {
          this.$buefy.snackbar.open({
            message: "Error. Els valors de caixes i kilos han de ser positius",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        console.log("this.form!!!", this.form);

        if (
          this.form.contact_time_slot_1_ini > this.form.contact_time_slot_1_end
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. L'hora d'inici del tram horari 1 no pot ser més gran que l'hora de finalització",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (
          !this.form.contact_trade_name
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. No hi ha nom comercial al punt d'entrega",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (
          !this.form.contact_city
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. No hi ha població al punt d'entrega",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        // if (
        //   !this.form.contact_legal_form
        // ) {
        //   this.$buefy.snackbar.open({
        //     message:
        //       "Error. No hi ha sector al punt d'entrega",
        //     queue: false,
        //     type: "is-danger"
        //   });
        //   this.isLoading = false;
        //   return;
        // }

        if (
          !this.form.contact_nif
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. No hi ha NIF al punt d'entrega",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (
          !this.form.contact_phone
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. No hi ha telèfon al punt d'entrega",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (
          !this.form.contact_address
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. No hi ha adreça al punt d'entrega",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (
          !this.form.contact_postcode
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. No hi ha codi postal al punt d'entrega",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (
          !this.form.contact_time_slot_1_ini ||
          !this.form.contact_time_slot_1_end
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. No hi ha tots els trams horaris definits al punt d'entrega",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        // if (
        //   !this.form.contact_time_slot_2_ini ||
        //   !this.form.contact_time_slot_2_end
        // ) {
        //   this.$buefy.snackbar.open({
        //     message:
        //       "Error. No hi ha tots els trams horaris definits al punt d'entrega",
        //     queue: false,
        //     type: "is-danger"
        //   });
        //   this.isLoading = false;
        //   return;
        // }

        if (
          this.form.contact_time_slot_2_ini &&
          this.form.contact_time_slot_2_ini > this.form.contact_time_slot_2_end
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. L'hora d'inici del tram horari 2 no pot ser més gran que l'hora de finalització",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (
          this.form.contact_time_slot_1_ini &&
          !this.form.contact_time_slot_1_end
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. Cal indicar l'hora de finalització del tram horari 1",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (
          this.form.contact_time_slot_2_ini &&
          this.form.contact_time_slot_2_ini &&
          !this.form.contact_time_slot_1_end
        ) {
          this.$buefy.snackbar.open({
            message:
              "Error. Cal indicar l'hora de finalització del tram horari 2",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        // "Error. El tram horari 1 ha de ser més gran de 3 hores",
        if (
          this.form.contact_time_slot_1_end -
            this.form.contact_time_slot_1_ini <
            3 &&
          this.form.contact_time_slot_2_end &&
            this.form.contact_time_slot_2_end -
              this.form.contact_time_slot_2_ini <
              3
        ) {
          this.$buefy.snackbar.open({
            message: "Error. El tram horari ha de ser mínim de 3 hores",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (this.form.id) {
          if (
            !this.form.owner ||
            !this.form.route ||
            !this.form.contact ||
            !this.form.units ||
            !this.form.kilograms ||
            !this.form.pickup
          ) {
            this.$buefy.snackbar.open({
              message: "Error. Falten alguns camps obligatòris",
              queue: false,
              type: "is-danger"
            });
            this.isLoading = false;
            return;
          }

          delete this.form.emitted_invoice_datetime;

          // Normalize contact_legal_form to ensure it's not an empty object
          if (this.form.contact_legal_form && typeof this.form.contact_legal_form === 'object') {
            if (this.form.contact_legal_form.id) {
              this.form.contact_legal_form = this.form.contact_legal_form.id;
            } else {
              this.form.contact_legal_form = 1; // Default value
            }
          } else if (!this.form.contact_legal_form) {
            this.form.contact_legal_form = 1; // Default value
          }

          // Get current user for tracking
          const currentUser = await service({ requiresAuth: true }).get("users/me");
          
          // Add tracking user information
          const orderData = {
            ...this.form,
            _tracking_user: currentUser.data
          };

          await service({ requiresAuth: true }).put(
            `orders/${this.form.id}`,
            orderData
          );
          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          if (exit) {
            this.$router.push({ name: "orders.view" });
          }

          this.submitted = false;
          this.getData();
        } else {
          if (
            !this.form.owner ||
            !this.form.route ||
            !this.form.contact ||
            !this.form.units ||
            !this.form.kilograms ||
            !this.form.pickup
          ) {
            this.$buefy.snackbar.open({
              message: "Error. Falten alguns camps obligatòris",
              queue: false,
              type: "is-danger"
            });
            this.isLoading = false;
            return;
          }

          // Normalize contact_legal_form to ensure it's not an empty object
          if (this.form.contact_legal_form && typeof this.form.contact_legal_form === 'object') {
            if (this.form.contact_legal_form.id) {
              this.form.contact_legal_form = this.form.contact_legal_form.id;
            } else {
              this.form.contact_legal_form = 1; // Default value
            }
          } else if (!this.form.contact_legal_form) {
            this.form.contact_legal_form = 1; // Default value
          }

          // Get current user for tracking
          const currentUser = await service({ requiresAuth: true }).get("users/me");

          // Add tracking user information
          const orderData = {
            ...this.form,
            _tracking_user: currentUser.data
          };

          const newOrder = await service({ requiresAuth: true }).post(
            "orders",
            orderData
          );
          this.$router.push({
            name: `orders.edit`,
            params: { id: newOrder.data.id }
          });

          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          setTimeout(() => {
            this.isLoading = false;
          }, 100);

          if (exit) {
            this.$router.push({ name: "orders.view" });
          }
          this.submitted = false;
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
      delete option.routes;
      delete option.quotes;
      // delete option.projectes;
      this.form.contact = option;
    },
    async contactChanged(option) {
      //console.log("contactChanged", option);
      if (option && option.id) {
        this.form.contact = option.id;
        this.onClientaChange(option.id);
      } else {
        this.form.contact = null;
        this.removeContactData();
      }
    },
    onContactInput(value) {
      // If the input is cleared, clear form.contact
      if (!value) {
        this.form.contact = null;
        this.removeContactData();
      } else {
        // Check if the typed value matches any contact exactly by display field
        const matchedContact = this.contacts.find(c => c.display === value);
        if (matchedContact) {
          this.form.contact = matchedContact.id;
        } else {
          // If no exact match, clear the form value to prevent invalid data
          this.form.contact = null;
        }
      }
    },
    async citySelected(option) {
      //console.log("citySelected", option);
      if (!option || !option.id) {
        this.form.contact_city = null;
      } else {
        this.form.contact_city_id = option.id;
        this.form.contact_city = option.name;
      }

      this.routes = this.validCityRoutes();
      if (this.routes.length > 0) {
        if (
          !this.form.route ||
          this.routes.length === 1 ||
          (this.form.route && !this.routes.find(r => r.id === this.form.route))
        ) {
          this.form.route = this.routes[0].id;
          this.changeRoute();
        }
      } else {
        //this.form.route = null
      }
    },
    validCityRoutes() {
      return this.form.contact_city_id
        ? this.cityRoutes
            .filter(
              cr =>
                cr.city &&
                cr.route &&
                cr.city.id &&
                cr.city.id === this.form.contact_city_id &&
                cr.route.active
            )
            .map(cr => cr.route)
        : [];
    },
    routeSelected(option) {
      if (!option || !option.id) {
        this.form.route = null;
      }
      this.form.route = option.id;
    },
    methodSelected(option) {
      this.form.payment_method = option;
    },
    removeLine(line, j) {
      this.needsUpdate = true;
      this.form.lines = this.form.lines.filter((l, i) => i !== j);
    },
    async saveClient() {
      if (this.form.contact) {
        if (
          !this.form.contact_name ||
          !this.form.contact_nif ||
          !this.form.contact_address ||
          !this.form.contact_phone ||
          !this.form.contact_city ||
          !this.form.contact_postcode ||
          !this.form.contact_legal_form || 
          !this.form.contact_time_slot_1_ini ||
          !this.form.contact_time_slot_1_end
        ) {
          this.$buefy.snackbar.open({
            message: "Error. Falten alguns camps obligatòris",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        await service({ requiresAuth: true }).put(
          `contacts/${this.form.contact}`,
          {
            name: this.form.contact_name,
            trade_name: this.form.contact_trade_name,
            nif: this.form.contact_nif,
            address: this.form.contact_address,
            postcode: this.form.contact_postcode,
            notes: this.form.contact_notes,
            city: this.form.contact_city,
            phone: this.form.contact_phone,
            time_slot_1_ini: this.form.contact_time_slot_1_ini,
            time_slot_1_end: this.form.contact_time_slot_1_end,
            time_slot_2_ini: this.form.contact_time_slot_2_ini,
            time_slot_2_end: this.form.contact_time_slot_2_end,
            owner: this.form.owner,
            legal_form: this.form.contact_legal_form
          }
        );

        this.$buefy.snackbar.open({
          message: "Punt d'entrega guardat",
          queue: false
        });
        await this.refreshClients(this.form.owner);
        this.contactSearch = `${this.form.contact} - ${this.form.contact_name}`;
        // this.contactSearch = `${this.form.contact_name}`;
      } else {
        if (
          !this.form.contact_name ||
          !this.form.contact_nif ||
          !this.form.contact_address ||
          !this.form.contact_phone ||
          !this.form.contact_city ||
          !this.form.contact_postcode ||
          !this.form.contact_legal_form
        ) {
          this.$buefy.snackbar.open({
            message: "Error. Falten alguns camps obligatòris",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        const newContact = await service({ requiresAuth: true }).post(
          "contacts",
          {
            name: this.form.contact_name,
            trade_name: this.form.contact_trade_name,
            nif: this.form.contact_nif,
            address: this.form.contact_address,
            postcode: this.form.contact_postcode,
            notes: this.form.contact_notes,
            city: this.form.contact_city,
            phone: this.form.contact_phone,
            time_slot_1_ini: this.form.contact_time_slot_1_ini,
            time_slot_1_end: this.form.contact_time_slot_1_end,
            time_slot_2_ini: this.form.contact_time_slot_2_ini,
            time_slot_2_end: this.form.contact_time_slot_2_end,
            owner: this.form.owner,
            legal_form: this.form.contact_legal_form,
            contact_types: [4]
          }
        );
        this.form.contact = newContact.data.id;

        this.$buefy.snackbar.open({
          message: "Punt d'entrega guardat",
          queue: false
        });
        await this.refreshClients(this.form.owner);
        this.contactSearch = `${newContact.data.id} - ${newContact.data.trade_name}`;
        this.form.contact_name = newContact.data.name;
      }
    },
    navNew() {
      let routeData = this.$router.resolve({
        name: "contacts.edit",
        params: { id: this.form.contact || 0 },
        query: { user: true }
      });
      window.open(routeData.href, "_blank");
    },
    async refreshClients(owner) {
      const contacts1 = (
        await service({ requiresAuth: true, cached: false }).get(
          `contacts/basic?_limit=-1&_where[owner_gt]=0&_sort=trade_name:ASC`
        )
      ).data.map(c => {
        return { ...c, display: `${c.trade_name} (${c.id})` };
      });

      const contactsOrPickups = this.isPickupPoint ? contacts1.filter(c => c.pickup_point) : contacts1;

      this.contacts = contactsOrPickups;
    },

    removeContactData() {
      this.form.contact = null;
      this.form.contact_name = "";
      this.form.contact_trade_name = "";
      this.form.contact_nif = "";
      this.form.contact_address = "";
      this.form.contact_postcode = "";
      this.form.contact_notes = "";
      this.form.contact_city = "";
      this.form.contact_phone = "";
      this.form.contact_legal_form = 1;
      this.form.contact_time_slot_1_ini = null;
      this.form.contact_time_slot_1_end = null;
      this.form.contact_time_slot_2_ini = null;
      this.form.contact_time_slot_2_end = null;
      this.form.contact_pickup_discount = 0;
      this.contactSearch = "";
    },
    async onClientaChange(id) {
      // this.form.contact = e.target.value;
      if (id) {
        const contact = this.contacts.find(
          c => c.id.toString() === id.toString()
        );

        this.contactSearch = `${contact.trade_name} (${contact.id})`;

        this.form.contact_name = contact.name;
        this.form.contact_trade_name = contact.trade_name;
        this.form.contact_nif = contact.nif;
        this.form.contact_address = contact.address;
        this.form.contact_postcode = contact.postcode;
        this.form.contact_notes = contact.notes;
        this.form.contact_phone = contact.phone;
        this.form.contact_city = contact.city;
        this.form.contact_multiowner = contact.multiowner;
        this.form.contact_pickup_discount = contact.pickup_discount || 0;
        
        this.citySearch = contact.city;

        if (this.cities.find(c => c.name === contact.city)) {
          this.form.contact_city_id = this.cities.find(
            c => c.name === contact.city
          ).id;
          this.citySelected(this.cities.find(c => c.name === contact.city));
        }

        this.form.contact_phone = contact.phone;
        this.form.contact_legal_form = contact.legal_form && contact.legal_form.id
          ? contact.legal_form.id
          : 1;
        this.form.contact_time_slot_1_ini = contact.time_slot_1_ini;
        this.form.contact_time_slot_1_end = contact.time_slot_1_end;
        this.form.contact_time_slot_2_ini = contact.time_slot_2_ini;
        this.form.contact_time_slot_2_end = contact.time_slot_2_end;

        this.checkMultidelivery();
      } else {
        this.removeContactData();
      }
    },
    async checkMultidelivery() {
      if (!this.form.contact || !this.form. estimated_delivery_date) {
        return
      }
      const multidelivery = await service({ requiresAuth: true }).post(
            `orders/check-multidelivery`,
            { id: this.form.id, contactId: this.form.contact, date: this.form.estimated_delivery_date, ownerId: this.form.owner }
          );
      if (multidelivery && multidelivery.data && multidelivery.data.multidelivery_discount) {
        this.form.multidelivery_discount = multidelivery.data.multidelivery_discount;
      } else {
        this.form.multidelivery_discount = 0;
      }
    },
    async getPDF() {
      const pdf = (
        await service({ requiresAuth: true }).get(`/orders/pdf/${this.form.id}`)
      ).data;
      for (const url of pdf.urls) {
        window.open(this.apiUrl + url);
      }
    },
    async confirmContact(msg) {
      this.isModalActive = false;
      const contactId = msg.id;
      await this.refreshClients(this.form.owner);
      const contact = this.contacts.find(c => c.id === contactId);
      this.contactSearch = `${contactId} - ${contact.trade_name}`;
      this.onClientaChange(contactId);
    },
    changeRate() {      
      this.form.multidelivery_discount = 0;
      const rate = assignRouteRate(this.form, this.routeRates, this.orders);      
      this.form.route_rate = rate;      
      this.form.price = calculateRoutePrice(rate, this.form.kilograms, this.form.lines ? this.form.lines.length : 0);      
      this.checkMultidelivery();      
    },
    updatePickup() {
      // Find the selected pickup object
      const selectedPickup = this.allowedPickups.find(p => p.id === this.form.pickup);
      this.form.pickup_point = selectedPickup && selectedPickup.is_pickup_point || false;
      
      // Clear collection_point if not a pickup point or pickup doesn't have collection points
      if (!selectedPickup || !selectedPickup.pickup) {
        this.form.collection_point = null;
      }
      
      // Clear units and kilograms when switching to pickup point
      if (this.form.pickup_point) {
        this.form.units = null;
        this.form.kilograms = null;
        // Initialize with one empty line if none exist
        if (!this.form.lines || this.form.lines.length === 0) {
          this.form.lines = [{
            units: null,
            kilograms: null,
            name: "",
            nif: ""
          }];
        }
      } else {
        // Clear lines when switching to regular order
        this.form.lines = [];
      }
      
      // Check if transfer is needed
      this.checkTransferNeeded();
    },
    checkTransferNeeded() {
      // Only check if we have both a route and a pickup selected
      if (!this.form.route || !this.form.pickup) {
        return;
      }

      // Find the selected pickup
      const selectedPickup = this.pickups.find(p => p.id === this.form.pickup);
      if (!selectedPickup) {
        return;
      }

      // Find the selected route
      const selectedRoute = this.routes.find(r => r.id === this.form.route);
      if (!selectedRoute) {
        return;
      }

      let pickupCityId = null;

      // Case 1: Pickup where pickup = false (has direct city relation)
      if (!selectedPickup.pickup && selectedPickup.city) {
        pickupCityId = typeof selectedPickup.city === 'object' ? selectedPickup.city.id : selectedPickup.city;
      }
      // Case 2: Pickup where pickup = true (need to get city from collection_point)
      else if (selectedPickup.pickup && this.form.collection_point) {
        // Find the collection point contact
        const ownerContact = this.sociesContacts.find(c => 
          c.users_permissions_user && c.users_permissions_user.id === this.form.owner
        );
        
        if (ownerContact && ownerContact.collection_points) {
          // Find the specific collection point
          const collectionPoint = ownerContact.collection_points.find(cp => {
            const cpId = typeof cp === 'object' ? cp.id : cp;
            return cpId === this.form.collection_point;
          });

          if (collectionPoint) {
            // Collection point has city as a string, need to find the city object
            const cityName = typeof collectionPoint === 'object' ? collectionPoint.city : null;
            if (cityName) {
              const cityObj = this.cities.find(c => c.name === cityName);
              if (cityObj) {
                pickupCityId = cityObj.id;
              }
            }
          }
        }
      }

      // If we couldn't determine the pickup city, can't calculate transfer
      if (!pickupCityId) {
        return;
      }

      // Check if the selected route travels to this city
      const routeTravelsToCity = this.cityRoutes.some(cr => {
        const cityId = typeof cr.city === 'object' ? cr.city.id : cr.city;
        const routeId = typeof cr.route === 'object' ? cr.route.id : cr.route;
        return cityId === pickupCityId && routeId === this.form.route;
      });

      // If route does NOT travel to the city, transfer is needed
      this.form.transfer = !routeTravelsToCity;
      
      // Set transfer pickup origin and destination if transfer is needed
      if (this.form.transfer) {
        // Transfer origin: the pickup where the order was deposited
        this.form.transfer_pickup_origin = this.form.pickup;
        
        // Transfer destination: the transfer_pickup from the route (where the transfer will go)
        if (selectedRoute.transfer_pickup) {
          this.form.transfer_pickup_destination = typeof selectedRoute.transfer_pickup === 'object' 
            ? selectedRoute.transfer_pickup.id 
            : selectedRoute.transfer_pickup;
        } else {
          this.form.transfer_pickup_destination = null;
        }
      } else {
        // No transfer needed, clear the transfer pickup fields
        this.form.transfer_pickup_origin = null;
        this.form.transfer_pickup_destination = null;
      }
    },
    addLine() {
      if (!this.form.lines) {
        this.form.lines = [];
      }
      this.form.lines.push({
        units: null,
        kilograms: null,
        name: "",
        nif: "",
        picked_up: false
      });
    },
    removeLine(index) {
      if (this.form.lines && this.form.lines.length > 1) {
        this.form.lines.splice(index, 1);
      }
    },
    addIncidence() {
      if (!this.form.incidences) {
        this.form.incidences = [];
      }
      this.form.incidences.push({
        description: "",
        state: "open"
      });
    },
    removeIncidence(index) {
      if (this.form.incidences && this.form.incidences.length > 0) {
        this.form.incidences.splice(index, 1);
      }
    },
    openIncidenceModal() {
      if (!this.form.id) {
        this.$buefy.snackbar.open({
          message: "Primer has de guardar la comanda",
          queue: false,
          type: "is-warning"
        });
        return;
      }
      this.isIncidenceModalActive = true;
    },
    async onIncidenceCreated() {
      // Reload order data after incidence is created
      this.isIncidenceModalActive = false;
      await this.getData();
      
      this.$buefy.snackbar.open({
        message: "Incidència creada i dades recarregades",
        queue: false,
        type: "is-success"
      });
    },
    formatDate(date) {
      if (!date) return '';
      return dayjs(date).format('DD/MM/YYYY');
    },
    getStatusColor(status) {
      const statusColors = {
        'pending': 'is-warning',
        'deposited': 'is-info',
        'processed': 'is-primary',
        'lastmile': 'is-link',
        'delivered': 'is-success',
        'invoiced': 'is-dark',
        'cancelled': 'is-danger'
      };
      return statusColors[status] || 'is-light';
    },
    getStatusName(status) {
      const statusObj = this.statuses.find(s => s.id === status);
      return statusObj ? statusObj.name : status;
    },
    calculateTotals() {
      if (!this.form.lines || this.form.lines.length === 0) {
        return { totalUnits: 0, totalKilograms: 0 };
      }
      
      const totalUnits = this.form.lines.reduce((sum, line) => {
        return sum + (parseFloat(line.units) || 0);
      }, 0);
      
      const totalKilograms = this.form.lines.reduce((sum, line) => {
        return sum + (parseFloat(line.kilograms) || 0);
      }, 0);

      this.form.units = totalUnits;
      this.form.kilograms = totalKilograms;
      
      return { totalUnits, totalKilograms };
    },
    formatDateTime(dateTime) {
      if (!dateTime) return '';
      return dayjs(dateTime).format('DD/MM/YYYY HH:mm');
    },
    getPickupName(pickupId) {
      if (!pickupId) return '';
      const pickup = this.pickups.find(p => p.id === pickupId);
      return pickup ? pickup.name : `Pickup ${pickupId}`;
    },
    calculateFinalPrice(order) {
      if (!order || !order.price) return 0;
      let price = order.price || 0;
      price = price * (1 - (order.multidelivery_discount || 0) / 100);
      price = price * (1 - (order.contact_pickup_discount || 0) / 100);
      price = price - (order.volume_discount || 0);
      return price;
    },
    async depositOrder() {
      try {
        this.isLoading = true;
        
        // Save the form first
        await this.submit(false);
        
        // Get current user
        const currentUser = await service({ requiresAuth: true }).get("users/me");
        
        // Prepare update data
        const updateData = {
          deposit_date: new Date().toISOString(),
          deposit_user: currentUser.data.id
        };
        
        // If status is pending, change it to deposited
        if (this.form.status === "pending") {
          updateData.status = "deposited";
        }
        
        // Update with deposit information
        const response = await service({ requiresAuth: true }).put(
          `orders/${this.form.id}`,
          updateData
        );
        
        this.$buefy.snackbar.open({
          message: "Comanda depositada correctament",
          queue: false,
          type: "is-success"
        });
        
        // Refresh data to show the updated information
        await this.getData();
        
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al depositar la comanda",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    async removeDeposit() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols eliminar la informació de dipòsit?",
        onConfirm: async () => {
          try {
            this.isLoading = true;
            
            const updateData = this.ensureContactLegalFormIsValid({
                deposit_date: null,
                deposit_user: null
              });
            
            await service({ requiresAuth: true }).put(
              `orders/${this.form.id}`,
              updateData
            );
            
            this.$buefy.snackbar.open({
              message: "Informació de dipòsit eliminada",
              queue: false,
              type: "is-success"
            });
            
            await this.getData();
            
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error al eliminar la informació de dipòsit",
              queue: false,
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    async pickupOrder() {
      try {
        this.isLoading = true;
        
        // Save the form first
        await this.submit(false);
        
        // Get current user
        const currentUser = await service({ requiresAuth: true }).get("users/me");
        
        // Update with pickup information
        const response = await service({ requiresAuth: true }).put(
          `orders/${this.form.id}`,
          {
            pickup_date: new Date().toISOString(),
            pickup_user: currentUser.data.id
          }
        );
        
        this.$buefy.snackbar.open({
          message: "Comanda recollida correctament",
          queue: false,
          type: "is-success"
        });
        
        // Refresh data to show the updated information
        await this.getData();
        
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al recollir la comanda",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    async depositCollectionOrder(orderId) {
      try {
        this.$set(this.isLoadingDeposit, orderId, true);
        
        // Get current user
        const currentUser = await service({ requiresAuth: true }).get("users/me");
        
        // Get current order to check its status
        const orderResponse = await service({ requiresAuth: true }).get(`orders/${orderId}`);
        const currentOrder = orderResponse.data;
        
        // Prepare update data
        const updateData = {
          deposit_date: new Date().toISOString(),
          deposit_user: currentUser.data.id
        };
        
        // If order is pending, change status to deposited
        if (currentOrder.status === 'pending') {
          updateData.status = 'deposited';
        }
        
        // Update with deposit information
        await service({ requiresAuth: true }).put(
          `orders/${orderId}`,
          updateData
        );
        
        this.$buefy.snackbar.open({
          message: "Comanda depositada correctament",
          queue: false,
          type: "is-success"
        });
        
        // Refresh data to show the updated information
        await this.getData();
        
        // Check if this is a collection order and if all orders are now deposited
        if (this.form.is_collection_order && this.form.status === "pending") {
          const allDeposited = this.form.collection_orders.every(order => order.deposit_date !== null);
          
          if (allDeposited) {
            // Update collection order status to deposited
            await service({ requiresAuth: true }).put(
              `orders/${this.form.id}`,
              { status: "deposited" }
            );
            
            this.$buefy.snackbar.open({
              message: "Totes les comandes estan depositades. Comanda de recollida marcada com a depositada.",
              queue: false,
              type: "is-success"
            });
            
            // Refresh again to show the updated status
            await this.getData();
          }
        }
        
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al depositar la comanda",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.$set(this.isLoadingDeposit, orderId, false);
      }
    },
    async pickupCollectionOrder(orderId) {
      try {
        this.$set(this.isLoadingPickup, orderId, true);
        
        // Get current user
        const currentUser = await service({ requiresAuth: true }).get("users/me");
        
        // Update with pickup information
        await service({ requiresAuth: true }).put(
          `orders/${orderId}`,
          {
            pickup_date: new Date().toISOString(),
            pickup_user: currentUser.data.id
          }
        );
        
        this.$buefy.snackbar.open({
          message: "Comanda recollida correctament",
          queue: false,
          type: "is-success"
        });
        
        // Refresh data to show the updated information
        await this.getData();
        
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al recollir la comanda",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.$set(this.isLoadingPickup, orderId, false);
      }
    },
    async removePickup() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols eliminar la informació de recollida?",
        onConfirm: async () => {
          try {
            this.isLoading = true;
            
            const updateData = this.ensureContactLegalFormIsValid({
                pickup_date: null,
                pickup_user: null
              });
            
            await service({ requiresAuth: true }).put(
              `orders/${this.form.id}`,
              updateData
            );
            
            this.$buefy.snackbar.open({
              message: "Informació de recollida eliminada",
              queue: false,
              type: "is-success"
            });
            
            await this.getData();
            
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error al eliminar la informació de recollida",
              queue: false,
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    async startTransfer() {
      try {
        this.isLoading = true;
        
        // Save the form first
        await this.submit(false);
        
        // Get current user
        const currentUser = await service({ requiresAuth: true }).get("users/me");
        
        // Update with transfer start information
        await service({ requiresAuth: true }).put(
          `orders/${this.form.id}`,
          {
            transfer_start_date: new Date().toISOString(),
            transfer_start_user: currentUser.data.id
          }
        );
        
        this.$buefy.snackbar.open({
          message: "Transferència iniciada correctament",
          queue: false,
          type: "is-success"
        });
        
        // Refresh data to show the updated information
        await this.getData();
        
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al iniciar la transferència",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    async removeTransferStart() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols eliminar la informació d'inici de transferència?",
        onConfirm: async () => {
          try {
            this.isLoading = true;
            
            const updateData = this.ensureContactLegalFormIsValid({
                transfer_start_date: null,
                transfer_start_user: null
              });
            
            await service({ requiresAuth: true }).put(
              `orders/${this.form.id}`,
              updateData
            );
            
            this.$buefy.snackbar.open({
              message: "Informació d'inici de transferència eliminada",
              queue: false,
              type: "is-success"
            });
            
            await this.getData();
            
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error al eliminar la informació d'inici de transferència",
              queue: false,
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    async endTransfer() {
      try {
        this.isLoading = true;
        
        // Save the form first
        await this.submit(false);
        
        // Get current user
        const currentUser = await service({ requiresAuth: true }).get("users/me");
        
        // Update with transfer end information
        await service({ requiresAuth: true }).put(
          `orders/${this.form.id}`,
          {
            transfer_end_date: new Date().toISOString(),
            transfer_end_user: currentUser.data.id
          }
        );
        
        this.$buefy.snackbar.open({
          message: "Transferència finalitzada correctament",
          queue: false,
          type: "is-success"
        });
        
        // Refresh data to show the updated information
        await this.getData();
        
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al finalitzar la transferència",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    async removeTransferEnd() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols eliminar la informació de fi de transferència?",
        onConfirm: async () => {
          try {
            this.isLoading = true;
            
            const updateData = this.ensureContactLegalFormIsValid({
                transfer_end_date: null,
                transfer_end_user: null
              });
            
            await service({ requiresAuth: true }).put(
              `orders/${this.form.id}`,
              updateData
            );
            
            this.$buefy.snackbar.open({
              message: "Informació de fi de transferència eliminada",
              queue: false,
              type: "is-success"
            });
            
            await this.getData();
            
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: "Error al eliminar la informació de fi de transferència",
              queue: false,
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    }
  }
};
</script>
<style lang="scss" scoped>
.line .field.medium-field {
  width: 10%;
}
.line .field.subphase-detail-input-large-field {
  width: 30%;
}
.summary-card .column {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
.summary-card .label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.8rem;
}
.ulist .tag {
  margin-right: 3px;
  margin-bottom: 3px;
}
.summary label {
  margin-right: 0.5rem;
}
.line-notes .control {
  width: 50%;
}
@media screen and (max-width: 1024px) {
  .line-notes .control {
    width: 100%;
  }
}
.line-notes textarea {
  width: 100%;
}
</style>
<style lang="scss">
.message-alert .help {
  color: red;
}
.mt--6{
  margin-top: -6px;
}
.hr {
  border-top: 1px solid whitesmoke;
  margin: 1rem -1.5rem;
}
.zbox {
  padding: 0.75rem;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background-color: #fafafa;
}
@media screen and (max-width: 768px) {
  .section-adapted {
    padding: 1rem 0.75rem;
  }
}
</style>
