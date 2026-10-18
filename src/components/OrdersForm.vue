<template>
  <!-- Redesign A (mockup A-Log-Comanda): the order in cards (member, where and
       when, what, where to leave it, office data), the price, the moves and the
       incidences on the side, and a save bar. Same fields and logic as before. -->
  <div class="order-form">
    <title-bar :title-stack="titleStack" :subtitle="headSubtitle">
      <template v-if="form.id" #badges>
        <span class="tag" :class="statusTag(form.status)">{{ statusLabel(form.status) }}</span>
        <span v-if="form.transfer" class="tag">Transferència · {{ transferStatus.toLowerCase() }}</span>
        <span v-if="form.is_collection_order" class="tag">Comanda de recollida</span>
      </template>
      <template v-if="form.id">
        <b-button v-if="!form.is_collection_order" icon-left="printer" :loading="isLoading" @click="getPDF">Imprimeix albarà</b-button>
        <b-button tag="router-link" :to="{ name: 'orders.view.detail', params: { id: form.id } }" icon-left="timeline-text-outline">Veure seguiment</b-button>
        <b-button v-if="canCancel" class="is-danger" :loading="isLoading" @click="deleteOrder">Anul·la la comanda</b-button>
      </template>
    </title-bar>

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

    <section class="section is-main-section">
      <div v-if="firstStatus !== 'pending'" class="notification is-warning">
        <b>Comanda ja processada.</b>
        <span v-if="!canEdit"> Si hi ha algun canvi d'última hora, contacta si us plau amb La Diligència.</span>
        <span v-else> Atenció amb els canvis: poden afectar entregues ja fetes o factures emeses.</span>
      </div>

      <b-loading :is-full-page="false" :model-value="isLoading" />

      <form v-if="!isLoading" class="order-layout" @submit.prevent="submit(false)">
        <div class="order-main">
          <!-- member -->
          <section class="a-box">
            <header class="box-head"><h2>Sòcia</h2></header>
            <div class="a-form">
              <b-field label="Sòcia *" :type="{ 'is-danger': errors['owner'] && submitted }">
                <b-select :disabled="!canEdit" v-model="form.owner" placeholder="Tria la sòcia" expanded @update:model-value="changeOwner">
                  <option v-for="(s, index) in users" :key="index" :value="s.id">{{ s.fullname || s.username }}</option>
                </b-select>
              </b-field>
            </div>
          </section>

          <!-- where and when -->
          <section class="a-box">
            <header class="box-head">
              <h2>{{ form.is_collection_order ? "A on i quin dia s'ha de recollir?" : "A on va i quin dia?" }}</h2>
            </header>
            <p class="box-help"><b>Recorda:</b> {{ cutoffReminder }}</p>
            <div class="a-form">
              <b-field
                :label="isPickupPoint ? 'Punt de consum *' : 'Punt d’entrega *'"
                :type="{ 'is-danger': errors['contact'] && submitted }"
                class="full"
              >
                <div class="field-stack">
                <div class="contact-row">
                  <b-autocomplete
                    v-model="contactSearch"
                    placeholder="Punt d'entrega"
                    :keep-first="false"
                    :open-on-focus="true"
                    :data="filteredContacts"
                    field="display"
                    :disabled="!canEdit"
                    :clearable="true"
                    @select="contactChanged"
                    @update:model-value="onContactInput"
                  />
                  <b-button v-if="form.contact" icon-left="pencil-outline" :disabled="!canEdit && !canEditContact" @click="isModalActive = true">
                    {{ isPickupPoint ? "Veure el punt" : "Edita el punt" }}
                  </b-button>
                  <b-button v-if="!isPickupPoint && !form.contact" icon-left="plus" :disabled="!canEdit" title="Nou punt d'entrega" @click="isModalActive = true">Nou punt</b-button>
                </div>
                <p v-if="form.contact && contactSummary" class="field-note">{{ contactSummary }}</p>
                <p v-else class="field-note">{{ !isPickupPoint ? "Cerca el punt d'entrega si ja existeix, o crea'n un de nou." : "Cerca el punt de consum." }}</p>
                </div>
              </b-field>

              <b-field label="Data comanda" :type="{ 'is-danger': errors['route_date'] && submitted }" message="Data de creació de la comanda">
                <b-input v-if="form.id" :model-value="formatDateTime(form.created_at)" type="text" disabled />
                <b-datepicker
                  v-else
                  v-model="form.route_date"
                  :disabled="!isStaff"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data"
                  trap-focus
                  editable
                />
              </b-field>

              <b-field label="Data prevista d'entrega" message="Tria una data posterior si es pot entregar més endavant.">
                <b-datepicker
                  v-model="form.estimated_delivery_date"
                  :disabled="!canEdit"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data"
                  trap-focus
                  editable
                  @update:model-value="checkEstimatedDeliveryDate"
                />
              </b-field>

              <b-field
                v-if="form.owner && form.contact"
                label="Ruta *"
                class="full"
                :type="{ 'is-danger': errors['route'] && submitted }"
              >
                <div class="field-stack">
                <div class="pill-group">
                  <button
                    v-for="(s, index) in routes"
                    :key="index"
                    type="button"
                    class="button pill"
                    :class="{ 'is-warning': form.route === s.id, 'is-outlined': form.route !== s.id }"
                    :data-day="routeDays(s)"
                    :disabled="!canEdit"
                    @click="form.route = s.id; changeRoute();"
                  >{{ s.name }}</button>
                </div>
                <p class="field-note">Rutes que passen per {{ form.contact_city || "la població del punt" }}. Tria-la segons el dia de la setmana i la destinació: en depèn la tarifa.</p>
                </div>
              </b-field>

              <div v-if="dateWarningMessage" class="notification is-warning full">{{ dateWarningMessage }}</div>
            </div>
          </section>

          <!-- what -->
          <section class="a-box">
            <header class="box-head">
              <h2>{{ form.is_collection_order ? "Què hem de recollir?" : "Què hem de portar?" }}</h2>
            </header>
            <div class="a-form">
              <b-field label="Tipus de servei *" class="full" :type="{ 'is-danger': errors['delivery_type'] && submitted }">
                <div class="field-stack">
                <div class="pill-group">
                  <button
                    v-for="(s, index) in deliveryTypes"
                    :key="index"
                    type="button"
                    class="button pill"
                    :class="{ 'is-warning': form.delivery_type === s.id, 'is-outlined': form.delivery_type !== s.id }"
                    :disabled="!canEdit || form.is_collection_order"
                    @click="form.delivery_type = s.id"
                  >{{ s.name }}</button>
                </div>
                <p class="field-note">{{ form.is_collection_order ? "Calculat des de les comandes associades." : "Refrigerada si almenys una caixa ha d'anar refrigerada." }}</p>
                </div>
              </b-field>

              <!-- consumption point: one line per recipient -->
              <div v-if="isPickupPoint" class="full">
                <b-field label="Línies *" :type="{ 'is-danger': errors['lines'] && submitted }" message="Una línia per cada destinatari">
                  <div class="table-container">
                    <table class="table is-fullwidth lines-table">
                      <thead><tr><th>Caixes</th><th>Kilograms</th><th>Nom</th><th>NIF</th><th></th></tr></thead>
                      <tbody>
                        <tr v-for="(line, index) in form.lines" :key="index">
                          <td><b-input v-model="line.units" type="number" size="is-small" :disabled="!canEdit" @update:model-value="calculateTotals" /></td>
                          <td><b-input v-model="line.kilograms" type="number" size="is-small" :disabled="!canEdit" @update:model-value="calculateTotals" /></td>
                          <td><b-input v-model="line.name" size="is-small" :disabled="!canEdit" /></td>
                          <td><b-input v-model="line.nif" size="is-small" :disabled="!canEdit" /></td>
                          <td class="has-text-right">
                            <button type="button" class="row-action" :disabled="!canEdit" title="Treu la línia" aria-label="Treu la línia" @click="removeLine(index)"><b-icon icon="close" size="is-small" /></button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </b-field>
                <b-button v-if="canEdit" size="is-small" icon-left="plus" @click="addLine">Afegeix una línia</b-button>
                <p class="field-note">Total {{ form.units || 0 }} caixes · {{ form.kilograms || 0 }} kg, calculat des de les línies.</p>
              </div>

              <template v-else>
                <b-field label="Número de caixes *" :type="{ 'is-danger': errors['units'] && submitted }" :message="form.is_collection_order ? 'Calculat des de les comandes associades' : ''">
                  <b-input v-model="form.units" type="number" :disabled="!canEdit || form.is_collection_order" />
                </b-field>
                <b-field label="Kilograms *" :type="{ 'is-danger': errors['kilograms'] && submitted }" :message="form.is_collection_order ? 'Calculat des de les comandes associades' : ''">
                  <b-input v-model="form.kilograms" type="number" :disabled="!canEdit || form.is_collection_order" />
                </b-field>
              </template>

              <div class="full check-row">
                <b-checkbox v-model="form.fragile" :disabled="!canEdit || form.is_collection_order">
                  <b>Fràgil</b>
                  <small>{{ form.is_collection_order ? "Calculat des de les comandes associades." : "Marca-ho si la comanda és fràgil." }}</small>
                </b-checkbox>
              </div>

              <b-field v-if="form.is_collection_order" label="Informació important" class="full">
                <b-input v-model="form.comments" type="textarea" placeholder="Mides poc habituals, on es pot deixar si hi ha cap incidència…" :disabled="!canEdit" />
              </b-field>
            </div>
          </section>

          <!-- where to leave it -->
          <section v-if="!form.is_collection_order" class="a-box">
            <header class="box-head"><h2>On ho deixaràs?</h2></header>
            <div class="a-form">
              <b-field v-if="pickups && pickups.length > 0" label="Recollida de la comanda *" class="full" :type="{ 'is-danger': errors['pickup'] && submitted }">
                <div class="field-stack">
                <div class="pill-group">
                  <button
                    v-for="(s, index) in allowedPickups"
                    :key="index"
                    type="button"
                    class="button pill"
                    :class="{ 'is-warning': form.pickup === s.id, 'is-outlined': form.pickup !== s.id }"
                    :disabled="!canEdit || form.is_collection_order"
                    @click="form.pickup = s.id; updatePickup();"
                  >{{ s.name }}</button>
                </div>
                <p v-if="selectedPickupMessage" class="field-note">{{ selectedPickupMessage }}</p>
                </div>
              </b-field>

              <b-field v-if="collectionPoints && collectionPoints.length > 0" label="Punt de recollida en finca *" class="full" :type="{ 'is-danger': errors['collection_point'] && submitted }" message="El punt concret de la finca on es recull">
                <b-select v-model="form.collection_point" expanded :disabled="!canEdit || form.is_collection_order" @update:model-value="onCollectionPointChange">
                  <option v-for="cp in collectionPoints" :key="cp.id" :value="cp.id">{{ cp.name }}</option>
                </b-select>
              </b-field>

              <b-field
                v-if="form.collection_point && collectionPickupRoutes.length > 0"
                label="Ruta de recollida *"
                :type="{ 'is-danger': errors['collection_pickup_route'] && submitted }"
                message="Determina el dia de recollida a la finca."
              >
                <b-select v-model="form.collection_pickup_route" placeholder="Tria la ruta" expanded :disabled="!canEdit || form.is_collection_order" @update:model-value="onCollectionPickupRouteChange">
                  <option v-for="r in collectionPickupRoutes" :key="r.id" :value="r.id">{{ r.name }}</option>
                </b-select>
              </b-field>

              <b-field v-if="form.collection_point && form.collection_pickup_route" label="Data de recollida" message="Decideix a quina comanda de recollida s'afegeix.">
                <b-datepicker
                  v-model="form.collection_pickup_date"
                  :disabled="!canEdit || form.is_collection_order"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data"
                  trap-focus
                  editable
                  @update:model-value="onCollectionPickupDateChange"
                />
              </b-field>

              <div v-if="collectionPickupDateWarningMessage" class="notification is-warning full">{{ collectionPickupDateWarningMessage }}</div>

              <b-field label="Informació important" class="full" message="Mides poc habituals, on es pot deixar a prop si hi ha cap incidència…">
                <b-input v-model="form.comments" type="textarea" placeholder="Notes" :disabled="!canEdit" />
              </b-field>
            </div>
          </section>

          <!-- the orders of a collection order / the collection order of an order -->
          <section v-if="form.id && form.is_collection_order" class="a-box">
            <header class="box-head">
              <h2>Comandes a recollir</h2>
              <span class="box-hint">{{ (form.collection_orders || []).length }} comandes</span>
            </header>
            <p v-if="!form.collection_orders || !form.collection_orders.length" class="box-empty">Encara no hi ha comandes associades.</p>
            <div v-else class="table-container">
              <table class="table is-fullwidth">
                <thead>
                  <tr><th>Comanda</th><th>Entrega</th><th class="has-text-right">Caixes</th><th class="has-text-right">Kg</th><th>Estat</th><th>Dipòsit</th><th>Recollida</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in form.collection_orders" :key="row.id">
                    <td><router-link :to="`/order/${row.id}`"><b>#{{ String(row.id).padStart(4, "0") }}</b></router-link></td>
                    <td>{{ (row.contact && row.contact.trade_name) || row.contact_trade_name || "—" }}</td>
                    <td class="has-text-right">{{ row.units || 0 }}</td>
                    <td class="has-text-right">{{ row.kilograms || 0 }}</td>
                    <td><span class="tag" :class="statusTag(row.status)">{{ statusLabel(row.status) }}</span></td>
                    <td>
                      <b-icon v-if="row.deposit_date" icon="check-circle" type="is-success" />
                      <b-button v-else size="is-small" :loading="isLoadingDeposit[row.id]" @click="depositCollectionOrder(row.id)">Dipositar</b-button>
                    </td>
                    <td>
                      <b-icon v-if="row.pickup_date" icon="check-circle" type="is-success" />
                      <b-button v-else size="is-small" :loading="isLoadingPickup[row.id]" :disabled="!isStaff" @click="pickupCollectionOrder(row.id)">Recollir</b-button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-else-if="form.id && form.collection_order" class="a-box">
            <header class="box-head"><h2>Comanda de recollida</h2></header>
            <div v-if="isCollectionOrderDateAfterMainOrder" class="notification is-warning">
              <b>Atenció!</b> La data prevista d'entrega és anterior a la data prevista de recollida.
            </div>
            <dl class="facts">
              <dt>Comanda</dt>
              <dd><router-link :to="`/order/${form.collection_order.id || form.collection_order}`">#{{ String(form.collection_order.id || form.collection_order).padStart(4, "0") }}-R</router-link></dd>
              <template v-if="form.collection_order.estimated_delivery_date"><dt>Data prevista</dt><dd>{{ formatDate(form.collection_order.estimated_delivery_date) }}</dd></template>
              <template v-if="form.collection_order.route"><dt>Ruta</dt><dd>{{ form.collection_order.route.short_name || form.collection_order.route.name }}</dd></template>
              <template v-if="form.collection_order.status"><dt>Estat</dt><dd><span class="tag" :class="statusTag(form.collection_order.status)">{{ statusLabel(form.collection_order.status) }}</span></dd></template>
              <dt>Caixes · kg</dt><dd>{{ form.collection_order.units || "—" }} · {{ form.collection_order.kilograms || "—" }} kg</dd>
              <dt>Preu</dt><dd>{{ money(calculateFinalPrice(form.collection_order)) }}</dd>
            </dl>
          </section>

          <!-- office data -->
          <section class="a-box">
            <header class="box-head">
              <h2>Altres dades</h2>
              <span class="box-hint">Només per a l'oficina i el repartiment</span>
            </header>
            <div class="a-form">
              <b-field label="Estat" class="full">
                <div class="segmented" role="group" aria-label="Estat">
                  <button
                    v-for="s in statusOptions"
                    :key="s"
                    type="button"
                    :class="{ 'is-on': form.status === s }"
                    :aria-pressed="form.status === s ? 'true' : 'false'"
                    :disabled="!isStaff"
                    @click="form.status = s"
                  >{{ statusLabel(s) }}</button>
                </div>
              </b-field>

              <template v-if="isStaff && form.transfer">
                <b-field>
                  <template #label>
                    Ruta de transferència
                  </template>
                  <b-select v-model="form.transfer_route" expanded placeholder="Tria una ruta" :disabled="!canEdit" @update:model-value="onTransferRouteManualChange">
                    <option :value="null">— Cap —</option>
                    <option v-for="route in transferRoutes" :key="route.id" :value="route.id">{{ route.short_name || route.name }}</option>
                  </b-select>
                </b-field>
                <b-field label="Data de transferència">
                  <b-datepicker
                    v-model="form.transfer_route_date"
                    :show-week-number="false"
                    :locale="'ca-ES'"
                    :first-day-of-week="1"
                    placeholder="Tria una data"
                    icon="calendar-today"
                    :disabled="!canEdit"
                    trap-focus
                    editable
                    @update:model-value="onTransferDateManualChange"
                  />
                </b-field>
                <div class="full transfer-manual">
                  <b-switch v-model="form.manual_transfer_route" size="is-small" :disabled="!canEdit">Edició manual de la transferència</b-switch>
                  <span class="field-note">Es calcula sola; si l'edites, el càlcul automàtic es desactiva.</span>
                  <b-button v-if="form.manual_transfer_route" size="is-small" icon-left="refresh" :disabled="!canEdit" @click="recalculateTransferRoute">Recalcula</b-button>
                </div>
                <b-field v-if="form.transfer_pickup_origin" label="Origen de la transferència">
                  <span class="readonly-value">{{ getPickupName(form.transfer_pickup_origin) }}</span>
                </b-field>
                <b-field v-if="form.transfer_pickup_destination" label="Destinació de la transferència">
                  <span class="readonly-value">{{ getPickupName(form.transfer_pickup_destination) }}</span>
                </b-field>
              </template>

              <b-field v-if="isStaff && completeRouteText" label="Ruta completa" class="full">
                <span class="readonly-value">{{ completeRouteText }}</span>
              </b-field>

              <b-field v-if="isStaff" label="Data de lliurament">
                <b-datepicker
                  v-model="form.delivery_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="dd/mm/aaaa"
                  trap-focus
                  editable
                />
              </b-field>

              <div v-if="isStaff" class="full check-row">
                <b-checkbox v-model="form.last_mile" :disabled="!canEdit">
                  <b>Última milla</b>
                  <small>Es marca sola quan la comanda passa per última milla; també es pot marcar a mà.</small>
                </b-checkbox>
              </div>
            </div>
          </section>
        </div>

        <aside class="order-side">
          <section class="a-box">
            <header class="box-head">
              <h2>Preu</h2>
              <b-button v-if="isOffice" size="is-small" icon-left="refresh" title="Recalcula el preu" @click="changeRate">Recalcula</b-button>
            </header>
            <dl class="facts">
              <dt>Tarifa</dt><dd>{{ route_rate ? route_rate.name : "no trobada" }}</dd>
              <dt>Preu</dt><dd>{{ money(route_price) }}</dd>
              <template v-if="hasDiscount">
                <dt>Descompte multientrega</dt><dd>−{{ form.multidelivery_discount || 0 }} %</dd>
                <dt>Descompte recollida</dt><dd>−{{ form.contact_pickup_discount || 0 }} %</dd>
                <dt>Descompte volum</dt><dd>{{ money(-1 * (form.volume_discount || 0)) }}</dd>
              </template>
              <dt>Preu amb descompte</dt><dd class="is-total">{{ money(discountedPrice) }}</dd>
              <template v-if="form.emitted_invoice_datetime"><dt>Facturada</dt><dd>{{ formatDateTime(form.emitted_invoice_datetime) }}</dd></template>
            </dl>
          </section>

          <section v-if="form.id" class="a-box">
            <header class="box-head">
              <h2>Moviments</h2>
              <span v-if="completeRouteText" class="box-hint">{{ completeRouteText }}</span>
            </header>
            <ul class="moves">
              <li v-if="!form.is_collection_order">
                <span class="move-dot" :class="{ 'is-done': form.deposit_date }"><b-icon :icon="form.deposit_date ? 'check' : 'package-down'" size="is-small" /></span>
                <div class="move-text">
                  <b>{{ form.deposit_date ? "Dipositada" : "Dipòsit" }}</b>
                  <small>{{ form.deposit_date ? `${formatDateTime(form.deposit_date)}${form.deposit_user ? " · " + (form.deposit_user.username || form.deposit_user.fullname) : ""}` : "Informa que has dipositat els paquets" }}</small>
                </div>
                <b-button v-if="form.deposit_date && canDeposit" size="is-small" icon-left="undo-variant" :loading="isLoading" @click="removeDeposit">Desfés</b-button>
                <b-button v-else-if="!form.deposit_date && canDeposit && canDepositOrder(form)" size="is-small" :loading="isLoading" @click="depositOrder">Dipositar</b-button>
              </li>
              <li v-if="form.transfer">
                <span class="move-dot" :class="{ 'is-done': form.transfer_start_date }"><b-icon :icon="form.transfer_start_date ? 'check' : 'swap-horizontal'" size="is-small" /></span>
                <div class="move-text">
                  <b>Inici de transferència</b>
                  <small>{{ form.transfer_start_date ? `${formatDateTime(form.transfer_start_date)}${form.transfer_start_user ? " · " + (form.transfer_start_user.username || form.transfer_start_user.fullname) : ""}` : form.transfer_route_date ? `Prevista ${formatDate(form.transfer_route_date)}` : "Pendent" }}</small>
                </div>
                <b-button v-if="form.transfer_start_date && canMove" size="is-small" icon-left="undo-variant" :loading="isLoading" @click="removeTransferStart">Desfés</b-button>
                <b-button v-else-if="!form.transfer_start_date && canMove" size="is-small" :loading="isLoading" @click="startTransfer">Iniciar transferència</b-button>
              </li>
              <li v-if="form.transfer">
                <span class="move-dot" :class="{ 'is-done': form.transfer_end_date }"><b-icon :icon="form.transfer_end_date ? 'check' : 'swap-horizontal'" size="is-small" /></span>
                <div class="move-text">
                  <b>Fi de transferència</b>
                  <small>{{ form.transfer_end_date ? `${formatDateTime(form.transfer_end_date)}${form.transfer_end_user ? " · " + (form.transfer_end_user.username || form.transfer_end_user.fullname) : ""}` : "Quan s'hagi iniciat" }}</small>
                </div>
                <b-button v-if="form.transfer_end_date && canMove" size="is-small" icon-left="undo-variant" :loading="isLoading" @click="removeTransferEnd">Desfés</b-button>
                <b-button v-else-if="!form.transfer_end_date && canMove" size="is-small" :loading="isLoading" :disabled="!form.transfer_start_date" @click="endTransfer">Finalitzar transferència</b-button>
              </li>
              <li v-if="!form.is_collection_order">
                <span class="move-dot" :class="{ 'is-done': form.pickup_date }"><b-icon :icon="form.pickup_date ? 'check' : 'truck-outline'" size="is-small" /></span>
                <div class="move-text">
                  <b>Recollida (càrrega)</b>
                  <small>{{ form.pickup_date ? `${formatDateTime(form.pickup_date)}${form.pickup_user ? " · " + (form.pickup_user.username || form.pickup_user.fullname) : ""}` : "Informa que has recollit els paquets" }}</small>
                </div>
                <b-button v-if="form.pickup_date && canMove" size="is-small" icon-left="undo-variant" :loading="isLoading" @click="removePickup">Desfés</b-button>
                <b-button v-else-if="!form.pickup_date && canMove" size="is-small" :loading="isLoading" @click="pickupOrder">Recollir</b-button>
              </li>
            </ul>
          </section>

          <section v-if="form.id" class="a-box">
            <header class="box-head">
              <h2>
                Incidències
                <span v-if="openIncidencesCount > 0" class="tag is-warning">{{ openIncidencesCount }} {{ openIncidencesCount === 1 ? "oberta" : "obertes" }}</span>
              </h2>
              <b-button size="is-small" icon-left="plus" @click="openIncidenceModal">Crear incidència</b-button>
            </header>
            <p v-if="!form.incidences || !form.incidences.length" class="box-empty">Aquesta comanda no té cap incidència.</p>
            <ul v-else class="incidences">
              <li v-for="(incidence, index) in form.incidences" :key="incidence.id || `new-${index}`">
                <template v-if="incidence.id">
                  <div class="incidence-head">
                    <span class="tag" :class="incidence.state === 'closed' ? 'is-success is-light' : incidence.state === 'open' ? 'is-danger is-light' : 'is-warning is-light'">{{ incidenceState(incidence.state) }}</span>
                    <small>{{ formatDate(incidence.created_at) }}</small>
                    <router-link :to="`/incidences?id=${incidence.id}`" class="incidence-link">Obre</router-link>
                  </div>
                  <p>{{ incidence.description }}</p>
                </template>
                <template v-else>
                  <b-input v-model="incidence.description" type="textarea" placeholder="Descripció de la incidència" />
                  <b-button v-if="canEdit" size="is-small" type="is-text" icon-left="close" @click="removeIncidence(index)">Treu-la</b-button>
                </template>
              </li>
            </ul>
          </section>

          <order-history v-if="form.id && canSeeHistory" :order-id="form.id" :refresh-key="historyKey" />
        </aside>
      </form>
    </section>

    <div class="savebar">
      <span class="savebar-state">{{ form.id ? (canEdit ? "Desa els canvis quan acabis" : "Només lectura") : isPickupPoint ? "Nova comanda punt de consum" : "Nova comanda" }}</span>
      <b-button :loading="isLoading" @click="exit">Sortir</b-button>
      <template v-if="canEdit">
        <b-button :loading="isLoading" @click="submit(true)">Guardar i sortir</b-button>
        <b-button type="is-primary" :loading="isLoading" @click="submit(false)">Guardar</b-button>
      </template>
    </div>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import CardComponent from "@/components/CardComponent.vue";
import service from "@/service/index";
import MoneyFormat from "@/components/MoneyFormat.vue";
import sumBy from "lodash/sumBy";
import { orderErrors, orderSaveProblem, orderSaveErrorMessage } from "@/domain/orderValidation.js";
import { invoicedPrice } from "@/domain/logisticsInvoicing.js";
import { isOffice as isLogisticsOffice, canEditOrder, canMoveOrder, canDepositOrderMove } from "@/domain/orderPermissions.js";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import moment from "moment";
import sortBy, { name } from "lodash/sortBy";
import concat from "lodash/concat";
import {
  assignRouteRate,
  assignRouteDate,
  checkIfDateIsValidInroute,
  calculateRoutePrice
} from "@/service/assignRouteRate";
import ModalBoxContactUser from "@/components/ModalBoxContactUser.vue";
import ModalBoxIncidence from "@/components/ModalBoxIncidence.vue";
import OrderHistory from "@/components/OrderHistory.vue";
import getConfig from "@/config";
import { formatMoney } from "@/helpers/format-number";
import { orderStatusLabel, orderStatusTag, formStatuses, canDeposit as canDepositOrder } from "@/domain/orderStatus";

export default {
  name: "OrdersForm",
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat,
    ModalBoxContactUser,
    ModalBoxIncidence,
    OrderHistory
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
      allRoutes: [],
      products: [],
      users: [],
      contacts: [],
      sociesContacts: [],
      clientsLoadedFor: null,
      cities: [],
      cityRoutes: [],
      pickups: [],
      deliveryTypes: [],
      permissions: [],
      historyKey: 0,
      orders: [],
      firstStatus: "pending",
      legalForms: [],
      // array from 0 to 23 with 15 minutes intervals
      contact_time_slots: Array.from({ length: 96 }, (_, i) => i / 4),
      routeRates: [],
      contactSearch: "",
      citySearch: "",
      apiUrl: import.meta.env.VUE_APP_API_URL,
      nextDayLimitHour: 14,
      dateWarningMessage: "",
      collectionPickupDateWarningMessage: "",
      isModalActive: false,
      isIncidenceModalActive: false,
      isLoadingDeposit: {},
      isLoadingPickup: {},
      collectionPickupRoutes: []
    };
  },
  computed: {
    statusOptions() {
      return formStatuses(this.form.status);
    },
    ...mapState(useMainStore, ["me"]),
    titleStack() {
      return ["Comandes", this.formCardTitle];
    },
    formCardTitle() {
      if (this.form.id) {
        const collection = this.form.is_collection_order ? "-R" : "";
        return `Comanda #${this.form.id
          .toString()
          .padStart(4, "0")}${collection}`;
      } else {
        return !this.isPickupPoint
          ? "Nova comanda"
          : "Nova comanda punt de consum";
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
          (this.permissions.includes("orders_admin") ||
            this.permissions.includes("orders_delivery"))) ||
        (this.form.status === "pending" &&
          !(
            this.permissions.includes("orders_admin") ||
            this.permissions.includes("orders_delivery")
          ))
      );
    },
    isStaff() {
      return this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery");
    },
    // the logistics office: the order itself and its price (issues/163)
    isOffice() {
      return isLogisticsOffice(this.permissions);
    },
    // transfers and loading are the logistics staff's, not the members' (issues/163)
    canMove() {
      return canMoveOrder(this.form, this.permissions);
    },
    // the member deposits her boxes; the staff record deposits too
    canDeposit() {
      return canDepositOrderMove(this.form, this.permissions);
    },
    // the logistics staff and the entity's own staff, not members (issues/119)
    canSeeHistory() {
      return this.isStaff || this.permissions.includes("projects") || this.permissions.includes("admin");
    },
    headSubtitle() {
      const owner = this.users.find(u => u.id === this.form.owner);
      const point = this.form.contact_trade_name || this.form.contact_name || this.contactSearch;
      const parts = [];
      if (owner || point) {
        parts.push([owner ? owner.fullname || owner.username : null, point ? `${point}${this.form.contact_city ? ` (${this.form.contact_city})` : ""}` : null].filter(Boolean).join(" → "));
      }
      if (this.form.id && this.form.created_at) parts.push(`creada el ${moment(this.form.created_at).format("DD/MM/YYYY")}`);
      return parts.join(" · ");
    },
    contactSummary() {
      const f = this.form;
      const slots = [this.slotText(f.contact_time_slot_1_ini, f.contact_time_slot_1_end), this.slotText(f.contact_time_slot_2_ini, f.contact_time_slot_2_end)].filter(Boolean).join(" i ");
      return [f.contact_address, [f.contact_postcode, f.contact_city].filter(Boolean).join(" "), slots ? `horari ${slots}` : "", f.contact_phone].filter(Boolean).join(" · ");
    },
    selectedPickupMessage() {
      const pickup = this.form.pickup && this.pickups.find(p => p.id === this.form.pickup);
      return pickup ? pickup.message : "";
    },
    hasDiscount() {
      return !!(this.form.multidelivery_discount || this.form.contact_pickup_discount || this.form.volume_discount);
    },
    // what the invoice line will charge (issues/145)
    discountedPrice() {
      if (!this.hasDiscount) return this.route_price;
      return invoicedPrice({ ...this.form, price: this.route_price });
    },
    canEditContact() {
      return (
        (this.form.contact &&
          !this.form.contact_multiowner &&
          !this.isPickupPoint) ||
        this.permissions.includes("orders_admin") ||
          this.permissions.includes("orders_delivery")
      );
    },
    // the office, a member on her pending order, and whoever may create one
    // on a new one (issues/163)
    canEdit() {
      return canEditOrder(this.form, this.permissions);
    },
    canChangeRate() {
      return ["pending"].includes(this.form.status);
    },
    isPickupPoint() {
      return this.form.pickup_point === true;
    },
    cutoffReminder() {
      return `s'han d'informar les comandes com a límit a les ${this.nextDayLimitHour} h del dia abans.`;
    },
    errors() {
      return orderErrors(this);
    },
    route_rate() {
      if (this.form.is_collection_order || !this.canChangeRate) {
        return this.form.route_rate;
      }
      const rr = assignRouteRate(this.form, this.routeRates, this.orders, this.pickups);
      this.form.route_rate = rr;
      return this.form.route_rate;
    },
    route_price() {
      if (this.form.is_collection_order || !this.canChangeRate) {
        return this.form.price;
      }
      if (this.form.kilograms !== null && this.route_rate !== null) {
        this.form.price = calculateRoutePrice(
          this.route_rate,
          this.form.kilograms,
          this.form.lines ? this.form.lines.length : 0
        );
      }
      const discountEffectAsOne =
        (this.form.multidelivery_discount || 1) /
        (this.form.multidelivery_discount || 1);
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
      const ownerContact = this.sociesContacts.find(
        c =>
          c.users_permissions_user &&
          c.users_permissions_user.id === this.form.owner
      );
      const hasCollectionPoints =
        ownerContact &&
        ownerContact.collection_points &&
        ownerContact.collection_points.length > 0;

      return this.pickups.filter(
        p => !p.pickup || (p.pickup && hasCollectionPoints)
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
      const ownerContact = this.sociesContacts.find(
        c =>
          c.users_permissions_user &&
          c.users_permissions_user.id === this.form.owner
      );

      if (
        !ownerContact ||
        !ownerContact.collection_points ||
        ownerContact.collection_points.length === 0
      ) {
        return [];
      }

      // Return the collection points for this contact/sòcia
      // Assuming collection_points might be IDs or objects
      return ownerContact.collection_points.map(cp => {
        if (typeof cp === "object" && cp.id) {
          return cp;
        }
        // If it's just an ID, we need to fetch the pickup details
        return (
          this.pickups.find(p => p.id === cp) || { id: cp, name: `Punt ${cp}` }
        );
      });
    },
    openIncidencesCount() {
      if (!this.form.incidences || !Array.isArray(this.form.incidences)) {
        return 0;
      }
      return this.form.incidences.filter(inc => inc.state !== "closed").length;
    },
    isCollectionOrderDateAfterMainOrder() {
      if (!this.form.collection_order || !this.form.estimated_delivery_date) {
        return false;
      }
      const collectionDate = this.form.collection_order.estimated_delivery_date;
      if (!collectionDate) {
        return false;
      }
      return moment(collectionDate).isAfter(
        moment(this.form.estimated_delivery_date),
        "day"
      );
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
        const origin = this.pickups.find(
          p => p.id === this.form.transfer_pickup_origin
        );
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
        const destination = this.pickups.find(
          p => p.id === this.form.transfer_pickup_destination
        );
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
    },
    transferRoutes() {
      // Filter routes that are marked as transfer routes and are active
      // Use allRoutes instead of routes, since routes can be filtered by city
      return this.allRoutes.filter(r => r.is_transfer_route && r.active);
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
    },
    collectionPoints(newValue) {
      // Auto-select if only one collection point is available
      if (newValue && newValue.length === 1 && !this.form.collection_point) {
        this.form.collection_point = newValue[0].id;
        this.onCollectionPointChange();
      }
      // Clear selection if the previously selected point is no longer available
      if (newValue && this.form.collection_point) {
        const stillAvailable = newValue.find(cp => cp.id === this.form.collection_point);
        if (!stillAvailable) {
          this.form.collection_point = null;
          this.form.collection_pickup_route = null;
          this.form.collection_pickup_date = null;
        }
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

    // Load org-wide orders options (e.g. same-day cutoff hour)
    try {
      const orgConfig = (
        await service({ requiresAuth: true, cached: true }).get("me")
      ).data;
      if (
        orgConfig &&
        orgConfig.orders_options &&
        orgConfig.orders_options.next_day_limit_hour != null
      ) {
        this.nextDayLimitHour = orgConfig.orders_options.next_day_limit_hour;
      }
    } catch (e) {
      // keep default 14 if org config unavailable
    }

    this.getData();

    // check if url has pickup_point=true
    if (this.$route.query.pickup_point === "true") {
      this.form.pickup_point = true;
      this.form.picked_up = false;
    }
  },
  methods: {
    getClearFormObject() {
      return {
        collection_pickup_route: null,
        collection_pickup_date: null,
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
        transfer: false,
        transfer_route: null,
        transfer_route_date: null,
        manual_transfer_route: false
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
              this.historyKey++;
              this.firstStatus = this.form.status;

              this.normalizeIdsInForm("owner");
              this.normalizeIdsInForm("route");
              this.normalizeIdsInForm("product");
              this.normalizeIdsInForm("contact");
              this.normalizeIdsInForm("pickup");
              this.normalizeIdsInForm("collection_point");
              this.normalizeIdsInForm("collection_pickup_route");
              this.normalizeIdsInForm("delivery_type");
              this.normalizeIdsInForm("contact_legal_form");
              this.normalizeIdsInForm("transfer_pickup_origin");
              this.normalizeIdsInForm("transfer_pickup_destination");
              this.normalizeIdsInForm("transfer_route");

              // Initialize manual_transfer_route flag if not set
              if (this.form.manual_transfer_route === undefined || this.form.manual_transfer_route === null) {
                this.form.manual_transfer_route = false;
              }

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

              if (this.form.transfer_route_date) {
                this.form.transfer_route_date = moment(
                  this.form.transfer_route_date,
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
                !(
                  this.permissions.includes("orders_admin") ||
                  this.permissions.includes("orders_delivery")
                ) &&
                this.form.owner !== me.data.id
              ) {
                this.$router.push({ name: "orders.view" });
              }

              await this.refreshClients(this.form.owner);

              const c = this.contacts.find(
                c => Number(c.id) === Number(this.form.contact)
              );
              this.contactSearch = c
                ? `${c.trade_name} (${this.form.contact})`
                : `${this.form.contact || ""}`;

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
              if (
                this.form.contact_legal_form &&
                typeof this.form.contact_legal_form === "object"
              ) {
                if (this.form.contact_legal_form.id) {
                  this.form.contact_legal_form = this.form.contact_legal_form.id;
                } else {
                  // Empty object or object without id
                  this.form.contact_legal_form = 1;
                }
              } else if (
                !this.form.contact_legal_form ||
                this.form.contact_legal_form === 0
              ) {
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

              await assignRouteRate(this.form, this.routeRates, this.orders, this.pickups);

              // Ensure incidences is always an array
              if (
                !this.form.incidences ||
                !Array.isArray(this.form.incidences)
              ) {
                this.form.incidences = [];
              }

              // Fetch collection pickup routes if collection_point is set
              if (this.form.collection_point) {
                await this.fetchCollectionPickupRoutes();

                // Convert collection_pickup_date to Date if it exists
                if (this.form.collection_pickup_date) {
                  this.form.collection_pickup_date = moment(
                    this.form.collection_pickup_date,
                    "YYYY-MM-DD"
                  ).toDate();
                }
              }

              this.isLoading = false;
            } else {
            }
          });
      } else {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        if (
          !(
            this.permissions.includes("orders_admin") ||
            this.permissions.includes("orders_delivery")
          )
        ) {
          this.form.owner = me.data.id;
        }

        this.form.delivery_type = this.deliveryTypes[0].id;

        await this.refreshClients(me.data.id);

        this.isLoading = false;
      }
    },
    normalizeIdsInForm(property) {
      if (this.form[property] && typeof this.form[property] === "object") {
        // Check if it's an object with an id property
        if (this.form[property].id) {
          // Use $set to ensure Vue reactivity
          this.form[property] = this.form[property].id;
        } else {
          // Empty object or object without id - set to null or default based on the property
          this.form[property] = property === "contact_legal_form" ? 1 : null;
        }
      } else if (this.form[property] === undefined) {
        // Undefined - set to default
        this.form[property] = property === "contact_legal_form" ? 1 : null;
      }
      // If it's null or already a number/string, keep it as is (don't convert to 0)
    },
    ensureContactLegalFormIsValid(data) {
      // Helper method to ensure contact_legal_form is never an empty object or invalid
      if (
        data.contact_legal_form &&
        typeof data.contact_legal_form === "object"
      ) {
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
      // Always load all routes for transfer route selection
      this.allRoutes = (
        await service({ requiresAuth: true, cached: true }).get(
          "routes?_limit=-1&_sort=order:ASC"
        )
      ).data;

      // Load routes based on whether editing or creating
      if (this.$route.params.id && this.$route.params.id > 0) {
        this.routes = this.allRoutes;
      } else {
        this.routes = this.allRoutes.filter(r => r.active);
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

      if (
        !(
          permissions.includes("orders_admin") ||
          permissions.includes("orders_delivery")
        )
      ) {
        this.users = users.filter(u => u.id == me.data.id);
      } else {
        this.users = users;
        this.users = concat(
          { id: 0, fullname: "--", username: "--" },
          this.users
        );
      }

      if (
        !(
          permissions.includes("orders_admin") ||
          permissions.includes("orders_delivery")
        )
      ) {
        // this.users = this.users.filter(u => u.id == me.data.id);
      }

      // These nine lookups do not depend on each other, but they used to be
      // awaited one after another: nine sequential round trips, and nginx
      // still speaks HTTP/1.1 so the browser opens at most six connections per
      // origin. Issued together, the block costs roughly the slowest of them
      // instead of the sum.
      const [
        products,
        pickups,
        deliveryTypes,
        routeRates,
        legalForms,
        cities,
        cityRoutes,
        routeFestives,
        sociesContacts
      ] = await Promise.all([
        service({ requiresAuth: true, cached: true }).get("products?_limit=-1"),
        service({ requiresAuth: true, cached: true }).get("pickups?_limit=-1"),
        service({ requiresAuth: true, cached: true }).get("delivery-types?_limit=-1"),
        service({ requiresAuth: true, cached: true }).get("route-rates?_limit=-1"),
        service({ requiresAuth: true }).get("legal-forms?_limit=-1"),
        service({ requiresAuth: true }).get("cities?_limit=-1&_sort=name"),
        service({ requiresAuth: true }).get("city-routes/basic"),
        service({ requiresAuth: true }).get("route-festives?_limit=-1"),
        service({ requiresAuth: true }).get("contacts/for-orders?socies=1")
      ]);

      this.products = products.data;
      this.pickups = pickups.data;
      this.deliveryTypes = deliveryTypes.data;
      this.routeRates = routeRates.data;
      this.legalForms = legalForms.data;
      this.cities = cities.data;
      this.cityRoutes = cityRoutes.data;
      this.routeFestives = routeFestives.data;
      this.sociesContacts = sociesContacts.data;
    },
    async changeOwner() {
      this.refreshClients(this.form.owner);

      await this.changeRoute();
    },
    async changeRoute() {
      if (this.form.owner && this.form.route && !this.form.is_collection_order) {
        this.orders = (
          await service({ requiresAuth: true }).get(
            `orders?_limit=-1&_where[status]=pending&_where[route]=${this.form.route}&_where[owner]=${this.form.owner}`
          )
        ).data;
      }
      if (this.form.route && !this.form.is_collection_order) {
        const route = this.routes.find(r => r.id === this.form.route);
        
        // Check if route has any days configured
        const hasAnyDay = route && (route.monday || route.tuesday || route.wednesday || route.thursday || route.friday || route.saturday || route.sunday);
        
        if (!hasAnyDay) {
          this.$buefy.toast.open({
            message: `La ruta "${route ? route.name : this.form.route}" no té cap dia de la setmana configurat. Contacta amb l'administrador.`,
            type: "is-danger",
            duration: 5000
          });
          this.dateWarningMessage = "Aquesta ruta no té dies configurats";
        } else {
          const routeDate = assignRouteDate(route, {
            nextDayLimitHour: this.nextDayLimitHour,
            isAdmin: this.permissions.includes("orders_admin"),
            closures: this.routeFestives
          });
          const nextDay = routeDate.nextDay;
          
          if (this.form.status === "pending") {
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
      }
      if (!this.form.is_collection_order) {
        await this.checkMultidelivery();
      }
      this.checkTransferNeeded();
    },
    async checkEstimatedDeliveryDate() {
      if (this.form.is_collection_order) {
        this.dateWarningMessage = "";
        return;
      }

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
      this.checkMultidelivery();
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
      if (this.form.is_collection_order) {
        return true;
      }

      if (this.form.route && this.form.estimated_delivery_date) {
        const route = this.routes.find(r => r.id === this.form.route);
        const dayOfWeek = this.form.estimated_delivery_date.getDay();
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

        if (
          error &&
          !(
            this.permissions.includes("orders_admin") ||
            this.permissions.includes("orders_delivery")
          )
        ) {
          this.$buefy.snackbar.open({
            message: error,
            queue: false,
            type: "is-danger"
          });
          return false;
        } else if (
          error &&
          (this.permissions.includes("orders_admin") ||
            this.permissions.includes("orders_delivery"))
        ) {
          this.$buefy.snackbar.open({
            message: error,
            queue: false,
            type: "is-warning"
          });
          return true;
        }
        return true;
      }
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

      if (this.form.status === "delivered" && !this.form.delivery_date) {
        this.form.delivery_date = moment().format("YYYY-MM-DD");
      }

      try {
        const routeValid = this.validateEstimateDateDayOfWeek();

        if (!routeValid) {
          this.isLoading = false;
          return;
        }

        const problem = orderSaveProblem(this.form, this);
        if (problem) {
          this.$buefy.snackbar.open({
            message: problem,
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
            (!this.form.pickup && !this.form.is_collection_order)
          ) {
            this.$buefy.snackbar.open({
              message: "Error. Falten alguns camps obligatòris",
              queue: false,
              type: "is-danger"
            });
            this.isLoading = false;
            return;
          }

          // Validate collection_pickup_route if collection_point is set and routes are available
          if (
            this.form.collection_point &&
            this.collectionPickupRoutes.length > 0 &&
            !this.form.collection_pickup_route
          ) {
            this.$buefy.snackbar.open({
              message: "Error. Has de seleccionar una ruta de recollida",
              queue: false,
              type: "is-danger"
            });
            this.isLoading = false;
            return;
          }

          delete this.form.emitted_invoice_datetime;

          // Normalize contact_legal_form to ensure it's not an empty object
          if (
            this.form.contact_legal_form &&
            typeof this.form.contact_legal_form === "object"
          ) {
            if (this.form.contact_legal_form.id) {
              this.form.contact_legal_form = this.form.contact_legal_form.id;
            } else {
              this.form.contact_legal_form = 1; // Default value
            }
          } else if (!this.form.contact_legal_form) {
            this.form.contact_legal_form = 1; // Default value
          }

          // Get current user for tracking
          const currentUser = await service({ requiresAuth: true }).get(
            "users/me"
          );

          // Add tracking user information
          const orderData = {
            ...this.form,
            _tracking_user: currentUser.data
          };

          // Format dates properly for backend
          if (orderData.collection_pickup_date) {
            orderData.collection_pickup_date = moment(
              orderData.collection_pickup_date
            ).format("YYYY-MM-DD");
          }

          if (orderData.transfer_route_date) {
            orderData.transfer_route_date = moment(
              orderData.transfer_route_date
            ).format("YYYY-MM-DD");
          }

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
            (!this.form.pickup && !this.form.is_collection_order)
          ) {
            this.$buefy.snackbar.open({
              message: "Error. Falten alguns camps obligatòris",
              queue: false,
              type: "is-danger"
            });
            this.isLoading = false;
            return;
          }

          // Validate collection_pickup_route if collection_point is set and routes are available
          if (
            this.form.collection_point &&
            this.collectionPickupRoutes.length > 0 &&
            !this.form.collection_pickup_route
          ) {
            this.$buefy.snackbar.open({
              message: "Error. Has de seleccionar una ruta de recollida",
              queue: false,
              type: "is-danger"
            });
            this.isLoading = false;
            return;
          }

          // Normalize contact_legal_form to ensure it's not an empty object
          if (
            this.form.contact_legal_form &&
            typeof this.form.contact_legal_form === "object"
          ) {
            if (this.form.contact_legal_form.id) {
              this.form.contact_legal_form = this.form.contact_legal_form.id;
            } else {
              this.form.contact_legal_form = 1; // Default value
            }
          } else if (!this.form.contact_legal_form) {
            this.form.contact_legal_form = 1; // Default value
          }

          // Get current user for tracking
          const currentUser = await service({ requiresAuth: true }).get(
            "users/me"
          );

          // Add tracking user information
          const orderData = {
            ...this.form,
            _tracking_user: currentUser.data
          };

          // Format dates properly for backend
          if (orderData.collection_pickup_date) {
            orderData.collection_pickup_date = moment(
              orderData.collection_pickup_date
            ).format("YYYY-MM-DD");
          }

          if (orderData.transfer_route_date) {
            orderData.transfer_route_date = moment(
              orderData.transfer_route_date
            ).format("YYYY-MM-DD");
          }

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
          message: orderSaveErrorMessage(err),
          type: "is-danger",
          duration: 8000,
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
      if (option && option.id) {
        this.form.contact = option.id;
        await this.onClientaChange(option.id);
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
      if (!option || !option.id) {
        this.form.contact_city = null;
      } else {
        this.form.contact_city_id = option.id;
        this.form.contact_city = option.name;
      }

      this.routes = this.validCityRoutes();
      
      if (this.routes.length > 0) {
        // Auto-select only if there's exactly one route
        if (this.routes.length === 1) {
          this.form.route = this.routes[0].id;
          await this.changeRoute();
        } else if (this.form.route && !this.routes.find(r => r.id === this.form.route)) {
          // Clear route if currently selected route is not in available routes
          this.form.route = null;
        }
      } else {
        //this.form.route = null
      }
    },
    validCityRoutes() {
      if (!this.form.contact_city_id) {
        return [];
      }

      const filteredCityRoutes = this.cityRoutes.filter(
        cr =>
          cr.city &&
          cr.route &&
          cr.city.id &&
          cr.city.id === this.form.contact_city_id &&
          cr.route.active
      );
      
      const routes = filteredCityRoutes.map(cr => cr.route);
      
      // Remove duplicates based on route.id
      const uniqueRoutes = routes.filter((route, index, self) =>
        index === self.findIndex((r) => r.id === route.id)
      );
      
      return uniqueRoutes;
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
        await this.refreshClients(this.form.owner, { force: true });
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
        await this.refreshClients(this.form.owner, { force: true });
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
    /**
     * The owner <b-select> has `@input="changeOwner"`, and Buefy emits input
     * for a programmatic v-model write too. Initialising a new order sets
     * `form.owner = me.id`, which fires changeOwner -> refreshClients, while
     * getData also called refreshClients explicitly: the same
     * `contacts/basic?_where[owner_gt]=0` went out twice, ~1.2s each.
     *
     * Re-fetching for an owner already loaded is skipped. The callers that run
     * after a contact was created or changed pass `{ force: true }`, since for
     * them the list really is stale.
     */
    async refreshClients(owner, { force = false } = {}) {
      if (!force && this.clientsLoadedFor === owner) {
        return;
      }
      this.clientsLoadedFor = owner;
      const contacts1 = (
        await service({ requiresAuth: true, cached: false }).get(
          // the delivery points with only the fields this form reads, sorted by
          // trade name: `contacts/basic?_where[owner_gt]=0` was 2 MB (issues/016)
          `contacts/for-orders?owned=1`
        )
      ).data.map(c => {
        return { ...c, display: `${c.trade_name} (${c.id})` };
      });
      const hasCollectionOrders =
        this.form.is_collection_order || (Array.isArray(this.form.collection_orders) &&
        this.form.collection_orders.length > 0);
      const contactsNotInSector10 = contacts1.filter(c => {
        if (hasCollectionOrders) return true;
        if (!c.sector) return true;
        if (Array.isArray(c.sector)) {
          return !c.sector.some(s => (typeof s === "object" ? s.id : s) === 10);
        }
        return (typeof c.sector === "object" ? c.sector.id : c.sector) !== 10;
      });

      const contactsOrPickups = this.isPickupPoint
        ? contactsNotInSector10.filter(c => c.pickup_point)
        : contactsNotInSector10;

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

        if (!contact) {
          this.contactSearch = `${id}`;
          return;
        }

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
          const cityObj = this.cities.find(c => c.name === contact.city);
          this.form.contact_city_id = cityObj.id;
          await this.citySelected(cityObj);
        }

        this.form.contact_phone = contact.phone;
        this.form.contact_legal_form =
          contact.legal_form && contact.legal_form.id
            ? contact.legal_form.id
            : 1;
        this.form.contact_time_slot_1_ini = contact.time_slot_1_ini;
        this.form.contact_time_slot_1_end = contact.time_slot_1_end;
        this.form.contact_time_slot_2_ini = contact.time_slot_2_ini;
        this.form.contact_time_slot_2_end = contact.time_slot_2_end;

        await this.checkMultidelivery();
      } else {
        this.removeContactData();
      }
    },
    async checkMultidelivery() {
      if (!this.form.contact || !this.form.estimated_delivery_date) {
        return;
      }
      const multidelivery = await service({
        requiresAuth: true
      }).post(`orders/check-multidelivery`, {
        id: this.form.id,
        contactId: this.form.contact,
        date: this.form.estimated_delivery_date,
        ownerId: this.form.owner
      });
      if (
        multidelivery &&
        multidelivery.data &&
        multidelivery.data.multidelivery_discount
      ) {
        this.form.multidelivery_discount =
          multidelivery.data.multidelivery_discount;
      } else {
        this.form.multidelivery_discount = 0;
      }
    },
    async getPDF() {
      const pdf = (
        await service({ requiresAuth: true }).post(`/orders/pdf`, {
          orders: [this.form.id]
        })
      ).data;
      window.open(this.apiUrl + pdf.urls);
    },
    async confirmContact(msg) {
      this.isModalActive = false;
      const contactId = msg.id;
      await this.refreshClients(this.form.owner, { force: true });
      const contact = this.contacts.find(c => c.id === contactId);
      this.contactSearch = contact
        ? `${contactId} - ${contact.trade_name}`
        : `${contactId}`;
      this.onClientaChange(contactId);
    },
    changeRate() {
      if (this.form.is_collection_order) {
        return;
      }

      this.form.multidelivery_discount = 0;
      const rate = assignRouteRate(this.form, this.routeRates, this.orders, this.pickups);
      this.form.route_rate = rate;
      this.form.price = calculateRoutePrice(
        rate,
        this.form.kilograms,
        this.form.lines ? this.form.lines.length : 0
      );
      this.checkMultidelivery();
    },
    updatePickup() {
      // Find the selected pickup object
      const selectedPickup = this.allowedPickups.find(
        p => p.id === this.form.pickup
      );
      // The pickup doesn't decide whether this is a consumption-point order
      // (pickups have no such field): the mode comes from the order itself
      // (issues/146), so its lines are kept.

      // Clear collection_point if not a pickup point or pickup doesn't have collection points
      if (!selectedPickup || !selectedPickup.pickup) {
        this.form.collection_point = null;
      }

      // A consumption-point order has lines instead of boxes and kilos
      if (this.form.pickup_point) {
        this.form.units = null;
        this.form.kilograms = null;
        // Initialize with one empty line if none exist
        if (!this.form.lines || this.form.lines.length === 0) {
          this.form.lines = [
            {
              units: null,
              kilograms: null,
              name: "",
              nif: ""
            }
          ];
        }
      } else {
        // a normal order has no lines
        this.form.lines = [];
      }

      // Check if transfer is needed
      this.checkTransferNeeded();
    },
    async onCollectionPointChange() {
      // When collection point changes, fetch available routes
      await this.fetchCollectionPickupRoutes();
      this.checkTransferNeeded();
    },
    async onCollectionPickupRouteChange() {
      // When collection pickup route changes, calculate next available date
      await this.calculateCollectionPickupDate();
    },
    async onCollectionPickupDateChange() {
      // Validate the date
      this.checkCollectionPickupDate();
    },
    async checkCollectionPickupDate() {
      if (
        !this.form.collection_pickup_route ||
        !this.form.collection_pickup_date
      ) {
        this.collectionPickupDateWarningMessage = "";
        return;
      }

      const route = this.collectionPickupRoutes.find(
        r => r.id === this.form.collection_pickup_route
      );
      if (!route) {
        this.collectionPickupDateWarningMessage = "";
        return;
      }

      const valid = checkIfDateIsValidInroute(
        route,
        moment(this.form.collection_pickup_date),
        this.routeFestives
      );

      if (!valid) {
        this.collectionPickupDateWarningMessage =
          "Atenció! La data de recollida no és vàlida per la ruta seleccionada";
      } else {
        this.collectionPickupDateWarningMessage = "";
      }
    },
    async fetchCollectionPickupRoutes() {
      if (!this.form.collection_point) {
        this.collectionPickupRoutes = [];
        return;
      }

      try {
        const response = await service({ requiresAuth: true }).get(
          `orders/collection-point-routes?collection_point=${this.form.collection_point}`
        );
        this.collectionPickupRoutes = response.data || [];

        // If there's only one route, select it automatically
        if (this.collectionPickupRoutes.length === 1) {
          this.form.collection_pickup_route = this.collectionPickupRoutes[0].id;
          await this.calculateCollectionPickupDate();
        }
      } catch (error) {
        console.error("Error fetching collection pickup routes:", error);
        this.$buefy.toast.open({
          message: "Error carregant les rutes de recollida",
          type: "is-danger"
        });
      }
    },
    async calculateCollectionPickupDate() {
      if (!this.form.collection_pickup_route) {
        this.form.collection_pickup_date = null;
        return;
      }

      const route = this.collectionPickupRoutes.find(
        r => r.id === this.form.collection_pickup_route
      );
      if (!route) return;

      // The route's next open day, as for the delivery date: any of its
      // weekdays (not only the first; a Sunday never matched), not a day it
      // is closed, the same cutoff (issues/156).
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      if (!days.some(d => route[d])) return;
      const { nextDay } = assignRouteDate(route, {
        nextDayLimitHour: this.nextDayLimitHour,
        isAdmin: this.permissions.includes("orders_admin"),
        closures: this.routeFestives
      });
      this.form.collection_pickup_date = nextDay.toDate();
      // Validate the calculated date
      this.checkCollectionPickupDate();
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
        pickupCityId =
          typeof selectedPickup.city === "object"
            ? selectedPickup.city.id
            : selectedPickup.city;
      }
      // Case 2: Pickup where pickup = true (need to get city from collection_point)
      else if (selectedPickup.pickup && this.form.collection_point) {
        // Find the collection point contact
        const ownerContact = this.sociesContacts.find(
          c =>
            c.users_permissions_user &&
            c.users_permissions_user.id === this.form.owner
        );

        if (ownerContact && ownerContact.collection_points) {
          // Find the specific collection point
          const collectionPoint = ownerContact.collection_points.find(cp => {
            const cpId = typeof cp === "object" ? cp.id : cp;
            return cpId === this.form.collection_point;
          });

          if (collectionPoint) {
            // Collection point has city as a string, need to find the city object
            const cityName =
              typeof collectionPoint === "object" ? collectionPoint.city : null;
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
        // A dangling relation comes back as null, and `typeof null === "object"`,
        // so reading `.id` off it throws and aborts the whole transfer check.
        // 536 of the 901 city-routes point at a route that no longer exists —
        // the same rows are dangling in the v3 database. The
        // `filteredCityRoutes` computed above already guards this the same way.
        if (!cr.city || !cr.route) return false;
        const cityId = typeof cr.city === "object" ? cr.city.id : cr.city;
        const routeId = typeof cr.route === "object" ? cr.route.id : cr.route;
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
          this.form.transfer_pickup_destination =
            typeof selectedRoute.transfer_pickup === "object"
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
      if (!date) return "";
      return moment(date).format("DD/MM/YYYY");
    },
    routeDays(route) {
      const days = [["monday", "dilluns"], ["tuesday", "dimarts"], ["wednesday", "dimecres"], ["thursday", "dijous"], ["friday", "divendres"], ["saturday", "dissabte"], ["sunday", "diumenge"]];
      return days.filter(([key]) => route[key]).map(([, name]) => name).join(", ");
    },
    slotText(ini, end) {
      if (ini === null || ini === undefined || end === null || end === undefined) return "";
      const hh = t => `${Math.floor(t)}:${String(Math.round((t % 1) * 60)).padStart(2, "0")}`;
      return `${hh(ini)}–${hh(end)}`;
    },
    money(value) {
      return formatMoney(Number(value) || 0);
    },
    statusLabel: orderStatusLabel,
    canDepositOrder,
    statusTag: orderStatusTag,
    incidenceState(state) {
      return { open: "Oberta", wip: "En procés", closed: "Tancada" }[state] || state;
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
      if (!dateTime) return "";
      return moment(dateTime).format("DD/MM/YYYY HH:mm");
    },
    getPickupName(pickupId) {
      if (!pickupId) return "";
      const pickup = this.pickups.find(p => p.id === pickupId);
      return pickup ? pickup.name : `Pickup ${pickupId}`;
    },
    calculateFinalPrice(order) {
      if (!order || !order.price) return 0;
      return invoicedPrice(order);
    },
    // Stamps <field>_date/<field>_user (deposit, pickup, transfer start/end)
    // with now and the current user, after saving the order.
    async markOrder(field, { success, failure }) {
      try {
        this.isLoading = true;

        await this.submit(false);

        const currentUser = await service({ requiresAuth: true }).get(
          "users/me"
        );

        await service({ requiresAuth: true }).put(`orders/${this.form.id}`, {
          [`${field}_date`]: new Date().toISOString(),
          [`${field}_user`]: currentUser.data.id
        });

        this.$buefy.snackbar.open({
          message: success,
          queue: false,
          type: "is-success"
        });

        await this.getData();
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: failure,
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isLoading = false;
      }
    },
    // Clears <field>_date/<field>_user after a confirmation.
    clearOrderMark(field, { confirm, success, failure }) {
      this.$buefy.dialog.confirm({
        message: confirm,
        onConfirm: async () => {
          try {
            this.isLoading = true;

            const updateData = this.ensureContactLegalFormIsValid({
              [`${field}_date`]: null,
              [`${field}_user`]: null
            });

            await service({ requiresAuth: true }).put(
              `orders/${this.form.id}`,
              updateData
            );

            this.$buefy.snackbar.open({
              message: success,
              queue: false,
              type: "is-success"
            });

            await this.getData();
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message: failure,
              queue: false,
              type: "is-danger"
            });
          } finally {
            this.isLoading = false;
          }
        }
      });
    },
    depositOrder() {
      return this.markOrder("deposit", {
        success: "Comanda dipositada correctament",
        failure: "Error al dipositar la comanda"
      });
    },
    removeDeposit() {
      return this.clearOrderMark("deposit", {
        confirm: "Estàs segura que vols eliminar la informació de dipòsit?",
        success: "Informació de dipòsit eliminada",
        failure: "Error al eliminar la informació de dipòsit"
      });
    },
    pickupOrder() {
      return this.markOrder("pickup", {
        success: "Comanda recollida correctament",
        failure: "Error al recollir la comanda"
      });
    },
    async depositCollectionOrder(orderId) {
      try {
        this.isLoadingDeposit[orderId] = true;

        // Get current user
        const currentUser = await service({ requiresAuth: true }).get(
          "users/me"
        );

        // Get current order to check its status
        const orderResponse = await service({ requiresAuth: true }).get(
          `orders/${orderId}`
        );
        const currentOrder = orderResponse.data;

        // Prepare update data
        const updateData = {
          deposit_date: new Date().toISOString(),
          deposit_user: currentUser.data.id
        };

        // Update with deposit information
        await service({ requiresAuth: true }).put(
          `orders/${orderId}`,
          updateData
        );

        this.$buefy.snackbar.open({
          message: "Comanda dipositada correctament",
          queue: false,
          type: "is-success"
        });

        // Refresh data to show the updated information
        await this.getData();
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({
          message: "Error al dipositar la comanda",
          queue: false,
          type: "is-danger"
        });
      } finally {
        this.isLoadingDeposit[orderId] = false;
      }
    },
    async pickupCollectionOrder(orderId) {
      try {
        this.isLoadingPickup[orderId] = true;

        // Get current user
        const currentUser = await service({ requiresAuth: true }).get(
          "users/me"
        );

        // Update with pickup information
        await service({ requiresAuth: true }).put(`orders/${orderId}`, {
          pickup_date: new Date().toISOString(),
          pickup_user: currentUser.data.id
        });

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
        this.isLoadingPickup[orderId] = false;
      }
    },
    removePickup() {
      return this.clearOrderMark("pickup", {
        confirm: "Estàs segura que vols eliminar la informació de recollida?",
        success: "Informació de recollida eliminada",
        failure: "Error al eliminar la informació de recollida"
      });
    },
    startTransfer() {
      return this.markOrder("transfer_start", {
        success: "Transferència iniciada correctament",
        failure: "Error al iniciar la transferència"
      });
    },
    removeTransferStart() {
      return this.clearOrderMark("transfer_start", {
        confirm: "Estàs segura que vols eliminar la informació d'inici de transferència?",
        success: "Informació d'inici de transferència eliminada",
        failure: "Error al eliminar la informació d'inici de transferència"
      });
    },
    endTransfer() {
      return this.markOrder("transfer_end", {
        success: "Transferència finalitzada correctament",
        failure: "Error al finalitzar la transferència"
      });
    },
    removeTransferEnd() {
      return this.clearOrderMark("transfer_end", {
        confirm: "Estàs segura que vols eliminar la informació de fi de transferència?",
        success: "Informació de fi de transferència eliminada",
        failure: "Error al eliminar la informació de fi de transferència"
      });
    },
    onTransferRouteManualChange() {
      // When user manually changes transfer route, mark it as manual
      if (this.form.transfer_route !== null && this.form.transfer_route !== undefined) {
        this.form.manual_transfer_route = true;
      }
    },
    onTransferDateManualChange() {
      // When user manually changes transfer date, mark it as manual
      if (this.form.transfer_route_date) {
        this.form.manual_transfer_route = true;
      }
    },
    async recalculateTransferRoute() {
      try {
        // Reset the manual flag and trigger recalculation
        this.form.manual_transfer_route = false;
        this.form.transfer_route = null;
        this.form.transfer_route_date = null;
        
        this.$buefy.toast.open({
          message: "Els valors es recalcularan automàticament en guardar",
          type: "is-info"
        });
      } catch (error) {
        console.error("Error resetting transfer route:", error);
        this.$buefy.toast.open({
          message: "Error reiniciant la ruta de transferència",
          type: "is-danger"
        });
      }
    }
  }
};
</script>
<style lang="scss" scoped>
.order-form {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.order-form > .section.is-main-section {
  flex: 1;
}
.order-form :deep(.title-bar .actions) {
  flex-wrap: wrap;
}
.order-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24rem;
  gap: 1rem;
  align-items: start;
}
.order-main,
.order-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}
.box-help {
  margin: -.25rem 0 1rem;
  font-size: .875rem;
  color: var(--a-fg-2);
}
.order-form .a-form {
  max-width: none;
}
.order-form .a-form > .field:not(.full) {
  grid-column: auto;
}
.contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  width: 100%;
}
.contact-row .autocomplete {
  flex: 1 1 16rem;
}
.field-stack {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.field-note {
  margin-top: .375rem;
  font-size: .75rem;
  color: var(--a-muted);
}
.pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}
.pill.button {
  height: auto;
  min-height: 2.5rem;
  flex-direction: column;
  align-items: flex-start;
  padding: .375rem .75rem;
  white-space: normal;
  text-align: left;
}
// the weekdays of a route under its name (CSS, so the button text stays the name)
.pill.button[data-day]:not([data-day=""])::after {
  content: attr(data-day);
  font-size: .6875rem;
  font-weight: 600;
  color: var(--a-muted);
}
.check-row :deep(.checkbox) {
  align-items: flex-start;
}
.check-row :deep(.control-label) b,
.check-row :deep(.control-label) small {
  display: block;
}
.check-row :deep(.control-label) small {
  font-size: .8125rem;
  color: var(--a-muted);
}
.lines-table td {
  vertical-align: middle;
}
.row-action {
  border: 0;
  background: none;
  color: var(--a-muted);
  cursor: pointer;
}
.transfer-manual {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
}
.readonly-value {
  font-weight: 700;
  color: var(--a-fg);
}
.moves li {
  display: grid;
  grid-template-columns: 1.75rem minmax(0, 1fr) auto;
  gap: .625rem;
  align-items: center;
  padding: .625rem 0;
}
.moves li + li {
  border-top: 1px solid var(--a-line-soft);
}
.move-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--a-chip);
  color: var(--a-fg-2);
}
.move-dot.is-done {
  background: var(--a-accent);
  color: var(--a-on-accent);
}
.move-text b,
.move-text small {
  display: block;
}
.move-text small {
  font-size: .75rem;
  color: var(--a-muted);
}
.incidences li + li {
  margin-top: .75rem;
  padding-top: .75rem;
  border-top: 1px solid var(--a-line-soft);
}
.incidence-head {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .25rem;
  color: var(--a-muted);
}
.incidence-link {
  margin-left: auto;
  font-size: .8125rem;
  font-weight: 700;
}
.savebar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
  padding: .5rem 2rem;
  background: var(--a-surface);
  border-top: 1px solid var(--a-line);
  box-shadow: 0 -6px 16px rgba(16, 32, 30, .06);
}
.savebar-state {
  margin-right: auto;
  font-weight: 700;
  color: var(--a-muted);
}
@media screen and (max-width: 1215px) {
  .order-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media screen and (max-width: 768px) {
  .savebar {
    padding: .5rem 1rem;
  }
}
</style>
<style lang="scss">
.message-alert .help {
  color: red;
}
.mt--6 {
  margin-top: -6px;
}
.hr {
  border-top: 1px solid whitesmoke;
  margin: 1rem -1.5rem;
}
.zbox {
  padding: 0.75rem;
  border: 1px solid var(--a-line);
  border-radius: 4px;
  background-color: var(--a-thead);
}
@media screen and (max-width: 768px) {
  .section-adapted {
    padding: 1rem 0.75rem;
  }
}
</style>
