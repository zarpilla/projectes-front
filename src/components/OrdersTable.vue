<template>
  <!-- Redesign A (mockup A-Log-Comandes): the orders of a day (or of any dates),
       grouped by route, with their logistics status. Filtering stays at the API. -->
  <div class="orders-page">
    <b-loading
      :is-full-page="true"
      v-model="importing"
      :can-cancel="false"
    ></b-loading>

    <title-bar :title-stack="['Comandes']" :subtitle="headline">
      <b-button v-if="!isMobile && canCreate" icon-left="upload" @click="showExport = !showExport">Importa CSV</b-button>
      <b-dropdown position="is-bottom-left" aria-role="menu" class="export-menu">
        <template #trigger>
          <b-button icon-left="download" icon-right="menu-down">Exporta</b-button>
        </template>
        <b-dropdown-item aria-role="menuitem" custom>
          <download-excel
            class="export-item"
            :fetch="rowsToExport"
            :name="comandesCSVName()"
            :fields="{ id: 'id', date: 'route_date', ...odsFields, ...csvExportFields }"
          >Comandes (.ods)</download-excel>
        </b-dropdown-item>
        <b-dropdown-item v-if="isStaff" aria-role="menuitem" @click="downloadRouterCSV">Per al planificador de rutes (.csv)</b-dropdown-item>
        <b-dropdown-item v-if="isStaff" aria-role="menuitem" custom>
          <download-excel class="export-item" :fetch="rowsToExport" name="ecologistica.ods" :fields="{ ...csvEcologistica }">Per a Ecologística (.ods)</download-excel>
        </b-dropdown-item>
        <hr class="dropdown-divider" />
        <b-dropdown-item aria-role="menuitem" custom>
          <download-excel class="export-item" :data="csvExample" type="csv" :escapeCsv="false" name="exemple-comandes.csv" :fields="csvFields">Exemple CSV de comandes</download-excel>
        </b-dropdown-item>
        <b-dropdown-item aria-role="menuitem" custom>
          <download-excel class="export-item" :data="csvExampleContacts" type="csv" :escapeCsv="false" name="exemple-contactes.csv" :fields="csvFieldsContacts">Exemple CSV de punts d'entrega</download-excel>
        </b-dropdown-item>
      </b-dropdown>
      <template v-if="canCreate">
        <b-button icon-left="plus" @click="navNewPickup">Comanda punt de consum</b-button>
        <b-button type="is-primary" icon-left="plus" @click="navNew">Nova comanda</b-button>
      </template>
    </title-bar>

    <section class="section is-main-section">
      <div v-if="showExport" class="a-box import-box">
        <header class="report-box-head">
          <h2>Importa des d'un CSV</h2>
          <button type="button" class="delete" aria-label="Tanca" @click="showExport = false"></button>
        </header>
        <div class="import-columns">
          <file-upload
            :multiple="false"
            entity="orders-imports"
            :ref-id="0"
            :field="'file'"
            :accept="'.csv'"
            @uploaded="uploaded($event, 'orders')"
            :pre-upload="preUpload"
            :message="`Crea comandes pujant arxiu CSV separat per comes`"
          />
          <file-upload
            :multiple="false"
            entity="orders-imports"
            :ref-id="0"
            :field="'file'"
            :accept="'.csv'"
            @uploaded="uploaded($event, 'contacts')"
            :pre-upload="preUpload"
            :message="`Crea punts d'entrega pujant arxiu CSV separat per comes`"
          />
        </div>
        <p class="import-help">Els exemples de fitxer són al menú <b>Exporta</b>. Les comandes importades surten a dalt de la llista fins que les crees.</p>
      </div>

      <div v-if="csvErrors.length" class="notification is-danger csv-errors">
        <b>Errors al CSV</b>
        <ul>
          <li v-for="(e, i) in csvErrors" :key="i">Línia {{ e.line }}: {{ e.error }}</li>
        </ul>
        <button type="button" class="delete" aria-label="Tanca" @click="csvErrors = []"></button>
      </div>

      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent="refresh">
        <b-field class="filter-grow">
          <b-input
            v-model="search"
            icon="magnify"
            placeholder="Cerca núm., punt o sòcia"
            @update:model-value="debouncedRefresh"
          />
        </b-field>
        <div class="date-nav">
          <b-button icon-left="chevron-left" aria-label="Dia anterior" @click="shiftDate(-1)" />
          <label class="filter-select">
            <span>Prevista</span>
            <b-datepicker
              v-model="dateFilterDate"
              :show-week-number="false"
              locale="ca-ES"
              :first-day-of-week="1"
              placeholder="Totes"
              :date-formatter="formatDayShort"
              trap-focus
            >
              <b-button size="is-small" @click="setDate(new Date())">Avui</b-button>
              <b-button size="is-small" @click="setDate(null)">Totes les dates</b-button>
            </b-datepicker>
          </label>
          <b-button icon-left="chevron-right" aria-label="Dia següent" @click="shiftDate(1)" />
        </div>
        <b-dropdown v-if="isStaff" :model-value="routeFilter" multiple aria-role="list" class="filter-dropdown" @change="setRoutes">
          <template #trigger>
            <button type="button" class="filter-select is-button">
              <span>Ruta</span><b>{{ routeFilterLabel }}</b>
              <b-icon icon="menu-down" />
            </button>
          </template>
          <b-dropdown-item custom aria-role="listitem">
            <b-button size="is-small" :disabled="!routeFilter.length" @click="setRoutes([])">Totes les rutes</b-button>
          </b-dropdown-item>
          <b-dropdown-item v-for="route in routes" :key="route.id" :value="route.id" aria-role="listitem">
            <span class="route-check"><b-icon :icon="routeFilter.includes(route.id) ? 'checkbox-marked' : 'checkbox-blank-outline'" size="is-small" />{{ route.name }}</span>
          </b-dropdown-item>
        </b-dropdown>
        <label v-if="isStaff" class="filter-select">
          <span>Sòcia</span>
          <b-select v-model="ownerFilter" @update:model-value="refresh">
            <option :value="null">Totes</option>
            <option v-for="u in sortedUsers" :key="u.id" :value="u.id">{{ u.fullname || u.username }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Recollida</span>
          <b-select v-model="pickupFilter" @update:model-value="refresh">
            <option :value="null">Tots els punts</option>
            <option v-for="p in pickups" :key="p.id" :value="p.id">{{ p.alias || p.name }}</option>
          </b-select>
        </label>
      </form>

      <div class="segmented status-tabs" role="group" aria-label="Estat">
        <button
          v-for="s in statusTabs"
          :key="s.id"
          type="button"
          :class="{ 'is-on': s.id ? statusFilter.includes(s.id) : statusFilter.length === 0 }"
          :aria-pressed="(s.id ? statusFilter.includes(s.id) : statusFilter.length === 0) ? 'true' : 'false'"
          :title="s.id ? 'Ctrl+clic per triar-ne més d\'un' : ''"
          @click="setStatusFilter($event, s.id)"
        >
          {{ s.label }} <span v-if="statusCounts[s.id || 'all'] != null" class="count">{{ formatCount(statusCounts[s.id || 'all']) }}</span>
        </button>
      </div>

      <div class="doc-kpis">
        <div class="doc-kpi">
          <span>Comandes actives</span>
          <b>{{ formatCount(kpis.active) }}</b>
          <small>{{ kpis.cancelled ? `${formatCount(kpis.cancelled)} anul·lades no compten` : "sense anul·lades" }}</small>
        </div>
        <div class="doc-kpi">
          <span>Caixes · kg</span>
          <b>{{ formatNum(kpis.units) }} · {{ formatNum(kpis.kg) }} kg</b>
          <small>{{ formatCount(kpis.refrigerated) }} refrigerades</small>
        </div>
        <div class="doc-kpi">
          <span>Import</span>
          <b>{{ money(kpis.price) }}</b>
          <small>amb descomptes aplicats</small>
        </div>
        <div class="doc-kpi">
          <span>Transferències · recollides</span>
          <b>{{ formatCount(kpis.transfers) }} · {{ formatCount(kpis.pickups) }}</b>
          <small>{{ formatCount(kpis.deposited) }} de {{ formatCount(kpis.active) }} dipositades</small>
        </div>
      </div>

      <div v-if="checkedRows.length" class="selection-bar" role="region" aria-label="Selecció">
        <b>{{ checkedRows.length }} {{ checkedRows.length === 1 ? "seleccionada" : "seleccionades" }}</b>
        <span class="selection-sums">{{ formatNum(sumUnits) }} {{ Number(sumUnits) === 1 ? "caixa" : "caixes" }} · {{ formatNum(sumKg) }} kg</span>
        <b-select v-model="newState" placeholder="Canvia l'estat a…" size="is-small" aria-label="Nou estat">
          <option v-for="s in bulkStatusOptions" :key="s" :value="s">{{ statusLabel(s) }}</option>
        </b-select>
        <b-button size="is-small" :disabled="!newState" @click="setBulkState">Aplica</b-button>
        <span class="selection-actions">
          <b-button size="is-small" icon-left="printer" @click="pdfOrders">Imprimeix albarans</b-button>
          <download-excel :data="theOrdersChecked" :name="comandesCSVName()" :fields="{ id: 'id', date: 'route_date', ...odsFields, ...csvExportFields }">
            <b-button size="is-small" icon-left="download">Exporta selecció</b-button>
          </download-excel>
          <b-button size="is-small" type="is-text" @click="checkedRows = []">Desmarca</b-button>
        </span>
      </div>

      <div class="a-box orders-box">
        <b-loading :is-full-page="false" :model-value="isLoading" />
        <div class="table-container">
          <table class="table is-fullwidth orders-table">
            <thead>
              <tr>
                <th class="col-check">
                  <b-checkbox :model-value="allChecked" :indeterminate="someChecked" aria-label="Selecciona-les totes" @update:model-value="toggleAll" />
                </th>
                <th v-for="col in visibleCols" :key="col.key" :class="{ 'has-text-right': col.num, 'col-signals': col.key === 'signals' }">
                  <span v-if="!col.sort" class="sort-head is-static">{{ col.label }}</span>
                  <button v-else type="button" class="sort-head" :aria-label="`Ordena per ${col.label}`" @click="sortBy(col)">
                    {{ col.label }}
                    <b-icon v-if="sortField === col.sort" :icon="sortOrder === 'ASC' ? 'arrow-up' : 'arrow-down'" size="is-small" />
                  </button>
                </th>
                <th class="col-actions"><span class="is-sr-only">Accions</span></th>
              </tr>
              <!-- one filter per column, as the old table (they go to the API) -->
              <tr class="filter-row">
                <th class="col-check">
                  <button v-if="hasColumnFilters" type="button" class="clear-filters" title="Treu els filtres de les columnes" aria-label="Treu els filtres de les columnes" @click="clearColumnFilters"><b-icon icon="filter-remove-outline" size="is-small" /></button>
                </th>
                <th v-for="col in visibleCols" :key="col.key">
                  <template v-if="col.noFilter"></template>
                  <select v-else-if="col.options" v-model="filters[col.filterKey || col.key]" class="col-filter" :aria-label="`Filtra ${col.filterLabel || col.label}`" :title="col.filterLabel ? `Filtra per ${col.filterLabel}` : null" @change="refresh">
                    <option value="">Tots</option>
                    <option v-for="o in col.options()" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                  <input
                    v-else
                    v-model="filters[col.key]"
                    class="col-filter"
                    type="search"
                    :placeholder="col.date ? 'aaaa-mm-dd' : 'Filtra'"
                    :aria-label="`Filtra ${col.label}`"
                    @input="debouncedRefresh"
                  />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody v-for="group in groups" :key="group.key">
              <tr v-if="groupBy !== 'none'" class="group-row" :class="{ 'is-collapsed': collapsed[group.key] }">
                <td class="col-check">
                  <b-checkbox :model-value="groupChecked(group)" :indeterminate="groupSomeChecked(group)" :aria-label="`Selecciona ${group.label}`" @update:model-value="toggleGroup(group, $event)" />
                </td>
                <td :colspan="sumColsBefore">
                  <button type="button" class="group-toggle" :aria-expanded="collapsed[group.key] ? 'false' : 'true'" @click="toggleCollapsed(group.key)">
                    <b-icon :icon="collapsed[group.key] ? 'chevron-right' : 'chevron-down'" size="is-small" />
                    <b>{{ group.label }}</b>
                  </button>
                  <span class="group-meta"> · {{ group.rows.length }} {{ group.rows.length === 1 ? "comanda" : "comandes" }}</span>
                  <span v-if="group.pending" class="tag is-warning group-tag">{{ group.pending }} {{ group.pending === 1 ? "pendent" : "pendents" }}</span>
                </td>
                <td class="has-text-right num"><b>{{ formatNum(group.units) }}</b></td>
                <td class="has-text-right num"><b>{{ formatNum(group.kg) }}</b></td>
                <td class="has-text-right num"><b>{{ money(group.price) }}</b></td>
                <td :colspan="sumColsAfter"></td>
              </tr>
              <template v-if="!collapsed[group.key]">
                <tr
                  v-for="(order, i) in group.rows"
                  :key="order.id || 'new-' + i"
                  class="order-row"
                  :class="{ 'is-checked': isChecked(order), 'is-cancelled': order.status === 'cancelled', 'is-unsaved': !order.id, 'is-editing': editingRowId && editingRowId === order.id, 'is-alert': isLate(order) }"
                >
                  <td class="col-check">
                    <b-checkbox :model-value="isChecked(order)" :aria-label="`Selecciona la comanda ${order.id || ''}`" @update:model-value="toggleRow(order, $event)" />
                  </td>
                  <td v-for="col in visibleCols" :key="col.key" :class="cellClass(col)">
                    <!-- quick edit (pencil) -->
                    <template v-if="editingRowId && editingRowId === order.id && quickEditField(col)">
                      <b-select v-if="col.edit === 'route'" v-model="editForm.route" size="is-small" @update:model-value="updateCalculatedPrice">
                        <option v-for="r in routes" :key="r.id" :value="r.id">{{ r.name }}</option>
                      </b-select>
                      <b-datepicker v-else-if="col.edit === 'estimated'" v-model="editForm.estimated_delivery_date" size="is-small" :show-week-number="false" locale="ca-ES" :first-day-of-week="1" placeholder="Data" />
                      <b-autocomplete
                        v-else-if="col.edit === 'contact'"
                        v-model="contactSearch"
                        size="is-small"
                        placeholder="Punt d'entrega"
                        :keep-first="false"
                        :open-on-focus="true"
                        :data="filteredContacts"
                        field="display"
                        :clearable="true"
                        @select="option => editForm.contact = option ? option.id : null"
                      />
                      <b-input v-else-if="col.edit === 'units'" v-model="editForm.units" type="number" size="is-small" />
                      <b-input v-else-if="col.edit === 'kilograms'" v-model="editForm.kilograms" type="number" step="any" min="0" size="is-small" @update:model-value="updateCalculatedPrice" />
                      <b-select v-else-if="col.edit === 'pickup'" v-model="editForm.pickup" size="is-small">
                        <option v-for="p in pickups" :key="p.id" :value="p.id">{{ p.alias || p.name }}</option>
                      </b-select>
                      <div v-else-if="col.edit === 'delivery_type'" class="edit-stack">
                        <b-select v-model="editForm.delivery_type" size="is-small" @update:model-value="updateCalculatedPrice">
                          <option v-for="dt in deliveryTypes" :key="dt.id" :value="dt.id">{{ dt.name }}</option>
                        </b-select>
                        <b-checkbox v-model="editForm.last_mile" size="is-small">Última milla</b-checkbox>
                      </div>
                      <b-select v-else-if="col.edit === 'last_mile'" v-model="editForm.last_mile" size="is-small">
                        <option :value="true">Sí</option>
                        <option :value="false">No</option>
                      </b-select>
                      <b v-else-if="col.edit === 'price'" :title="calculatedPrice !== null ? `Preu de tarifa ${money(calculatedPrice)}` : null">{{ calculatedPrice !== null ? money(editedFinalPrice()) : "?" }}</b>
                    </template>
                    <!-- read -->
                    <template v-else-if="col.key === 'idx'">
                      <router-link v-if="order.id" :to="{ name: 'orders.view.detail', params: { id: order.id } }" class="order-num">{{ order.idx }}</router-link>
                      <b-button v-else size="is-small" type="is-primary" @click="createCSVOrder(order)">Crea</b-button>
                    </template>
                    <!-- every mark of the order as one icon (issues/315, proposal C) -->
                    <template v-else-if="col.key === 'signals'">
                      <span class="signals">
                        <span v-for="sg in signalsOf(order)" :key="sg.key" class="signal" :class="sg.kind" :title="sg.label" :aria-label="sg.label" role="img" :data-signal="sg.key">
                          <b-icon :icon="sg.icon" custom-size="mdi-14px" />
                        </span>
                      </span>
                    </template>
                    <template v-else-if="col.key === 'contact.trade_name'">
                      <b>{{ order.fullName || "—" }}</b>
                      <small>{{ order.contact_city || (order.contact && order.contact.city) || "" }}</small>
                    </template>
                    <template v-else-if="col.key === 'owner.fullname'">{{ order.owner ? order.owner.fullname || order.owner.username : "—" }}</template>
                    <template v-else-if="col.key === 'route.name'">{{ order.route ? order.route.name : "—" }}</template>
                    <template v-else-if="col.key === 'estimated_delivery_date'">{{ formatDay(order.estimated_delivery_date) }}</template>
                    <template v-else-if="col.key === 'pickup.name'">
                      <span>{{ order.pickup ? order.pickup.alias || order.pickup.name : "—" }}</span>
                      <small :class="order.deposit_date ? 'is-deposited' : ''">{{ order.deposit_date ? "● dipositada" : "○ no dipositada" }}</small>
                    </template>
                    <template v-else-if="col.key === 'last_mile_display'">{{ order.last_mile ? "Sí" : "No" }}</template>
                    <template v-else-if="col.key === 'units'">{{ formatNum(order.units) }}</template>
                    <template v-else-if="col.key === 'kilograms'">{{ formatNum(order.kilograms) }}</template>
                    <template v-else-if="col.key === 'price'">
                      <b>{{ order.finalPrice !== undefined && order.finalPrice !== null ? money(order.finalPrice) : "?" }}</b>
                      <small v-if="discountsOf(order).length" class="price-mods">
                        <template v-for="(d, j) in discountsOf(order)" :key="d.key"><template v-if="j"> · </template><span :class="d.key === 'surcharge' ? 'is-up' : 'is-down'" :title="d.title">{{ d.text }}</span></template>
                      </small>
                    </template>
                    <template v-else-if="col.key === 'status'"><span class="tag" :class="statusTag(order.status)">{{ statusLabel(order.status) }}</span></template>
                  </td>
                  <td class="col-actions">
                    <template v-if="editingRowId && editingRowId === order.id">
                      <b-button size="is-small" type="is-primary" icon-left="content-save" title="Desa" aria-label="Desa" @click.prevent="saveOrder(order)" />
                      <b-button size="is-small" icon-left="close" title="Cancel·la" aria-label="Cancel·la" @click.prevent="cancelEdit" />
                    </template>
                    <template v-else-if="order.id">
                      <button v-if="canEditOrder(order)" type="button" class="row-action" title="Edició ràpida" aria-label="Edició ràpida" :disabled="!!editingRowId" @click="startEdit(order)">
                        <b-icon icon="pencil-outline" size="is-small" />
                      </button>
                      <router-link v-if="canOpenOrder(order)" :to="{ name: 'orders.edit', params: { id: order.id } }" class="row-action" title="Obre la fitxa" aria-label="Obre la fitxa">
                        <b-icon icon="open-in-new" size="is-small" />
                      </router-link>
                    </template>
                  </td>
                </tr>
              </template>
            </tbody>
            <tbody v-if="!isLoading && !groups.length">
              <tr><td :colspan="visibleCols.length + 2" class="empty-row">Cap comanda amb aquests filtres.</td></tr>
            </tbody>
            <tfoot v-if="groups.length">
              <tr>
                <td></td>
                <td :colspan="sumColsBefore"><b>Total {{ pageKpis.active }} comandes actives</b><span v-if="morePages" class="has-text-muted"> (aquesta pàgina)</span></td>
                <td class="has-text-right num"><b>{{ formatNum(pageKpis.units) }}</b></td>
                <td class="has-text-right num"><b>{{ formatNum(pageKpis.kg) }}</b></td>
                <td class="has-text-right num"><b>{{ money(pageKpis.price) }}</b></td>
                <td :colspan="sumColsAfter"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <footer class="orders-foot">
          <span>{{ footNote }}</span>
          <!-- what the icons of «Senyals» mean (issues/315) -->
          <span class="legend">
            <span v-for="sg in signalLegend" :key="sg.key"><span class="signal" :class="sg.kind"><b-icon :icon="sg.icon" custom-size="mdi-14px" /></span>{{ sg.legend }}</span>
          </span>
          <b-pagination
            v-if="total > perPageEffective"
            v-model="page"
            :total="total"
            :per-page="perPageEffective"
            size="is-small"
            order="is-right"
            @change="onPageChange"
          />
          <label class="filter-select">
            <span>Agrupa per</span>
            <b-select v-model="groupBy" @update:model-value="saveGroupBy">
              <option value="route">Ruta</option>
              <option value="date">Data prevista</option>
              <option v-if="isStaff" value="owner">Sòcia</option>
              <option value="none">Sense agrupar</option>
            </b-select>
          </label>
        </footer>
      </div>
    </section>
  </div>
</template>

<script>
import service from "@/service/index";
import { orderMembers } from "@/domain/routeAccess";
import { parse } from "csv-parse/browser/esm";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import FileUpload from "@/components/FileUpload.vue";
import TitleBar from "@/components/TitleBar.vue";
import MoneyFormat from "@/components/MoneyFormat.vue";
import {
  assignRouteRate,
  assignRouteDate,
  orderRoutePrice
} from "@/service/assignRouteRate";
import moment from "moment";

/**
 * Id of a relation, whether it arrives populated or as a bare id.
 *
 * `typeof null === "object"`, so the obvious ternary dereferences null: with
 * 536 of diligencia's 902 city-routes pointing at a deleted route, `cr.route`
 * is null and `cr.route.id` threw during the CSV import. The same rows dangle
 * in v3 — it only surfaced here once the sector check stopped rejecting the
 * file first.
 */
function idOf(value) {
  if (value === null || value === undefined) return null;
  return typeof value === "object" ? value.id : value;
}
import _ from "lodash";
import getConfig from '@/config'
import { formatMoney, formatNumber } from "@/helpers/format-number";
import { orderStatusLabel, orderStatusTag, statusWhere, bulkStatuses, canSetStatus, bulkSkipReason, leavingInvoiced, leavingInvoicedMessage, leavingInvoicedTitle } from "@/domain/orderStatus";
import { orderOdsFields, exportRows } from "@/domain/ordersExport";
import { signalWhere } from "@/domain/orderSignals";
import { importedPostcode } from "@/domain/postcode";
import { canCreateOrders, canEditOrder as mayEditOrder, canOpenOrder as mayOpenOrder, isDriver } from "@/domain/orderPermissions";
import { dateFilterWhere, ownerWhere, priceFilterWhere, kilogramsFilterWhere } from "@/domain/ordersListFilters";
import { invoicedPrice } from "@/domain/logisticsInvoicing";
import { lateSurchargeOf } from "@/domain/lateOrders";
import { csvDiscountQuery, withCsvDiscounts, csvOrderPayload } from "@/domain/csvOrderPreview";
import { repricesOrder } from "@/domain/orderReprice";

// a yes/no cell of the CSV and .ods: 1/0, as the import reads it; the
// example rows hold "1"/"0" strings (issues/251)
const flag01 = value => (value === true || value === 1 || value === "1" ? 1 : 0);
// the kilos of an imported row, with their decimals and a comma or a point:
// parseInt read 12.5 as 12 and refused 0.5 (issues/269); NaN when not a number
const csvKilograms = value => {
  const text = String(value === undefined || value === null ? "" : value).trim().replace(",", ".");
  return /^-?(\d+\.?\d*|\.\d+)$/.test(text) ? Number(text) : NaN;
};

export default {
  name: "OrdersTable",
  components: {
    FileUpload,
    MoneyFormat,
    TitleBar
  },
  props: {
    titleStack: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isLoading: false,
      orders: [],
      contactsCSV: [],
      filters: {
        q: "",
        userContacts: ""
      },
      queryChanged: 0,
      me: {},
      csv: "",
      csvRecords: [],
      csvErrors: [],
      statusFilter: ["pending"],
      routeFilter: [],
      csvOptions: {
        delimiter: ",",
        columns: true
      },
      importing: false,
      permissions: [],
      nextDayLimitHour: 14,
      routes: [],
      users: [],
      deliveryTypes: [],
      pickups: [],
      routerates: [],
      cityRoutes: [],
      cities: [],
      sociesContacts: [],
      checkedRows: [],
      newState: null,
      total: 0,
      sortField: "route_date",
      sortOrder: "DESC",
      defaultSortOrder: "DESC",
      page: 1,
      perPage: 150,
      // the filters of the table columns (same keys as the old searchable columns)
      filters: {
        idx: "",
        "contact.trade_name": "",
        "owner.fullname": "",
        "route.name": "",
        estimated_delivery_date: "",
        "pickup.name": "",
        signal: "",
        units: "",
        kilograms: "",
        price: "",
        status: ""
      },
      csvAlias: {
        route_name: "route_name",
        owner_id: "owner_id",
        estimated_delivery_date: "estimated_delivery_date",
        contact_name: "contact_name",
        contact_trade_name: "contact_trade_name",
        contact_address: "contact_address",
        contact_postcode: "contact_postcode",
        contact_city: "contact_city",
        contact_nif: "contact_nif",
        contact_phone: "contact_phone",
        contact_legal_form: "contact_legal_form",
        contact_time_slot_1_ini: "contact_time_slot_1_ini",
        contact_time_slot_1_end: "contact_time_slot_1_end",
        contact_time_slot_2_ini: "contact_time_slot_2_ini",
        contact_time_slot_2_end: "contact_time_slot_2_end",
        units: "units",
        kilograms: "kilograms",
        refrigerated: "refrigerated",
        fragile: "fragile",
        pickup: "pickup.name",
        provider_order_number: "provider_order_number",
        notes: "notes"
      },

      csvFieldsContacts: {
        owner_id: "owner_id",
        contact_name: "contact_name",
        contact_trade_name: "contact_trade_name",
        contact_address: {
          field: "contact_address",
          callback: value => {
            return this.addressFormatted(value);
          }
        },
        contact_postcode: "contact_postcode",
        contact_city: "contact_city",
        contact_nif: "contact_nif",
        contact_phone: "contact_phone",
        contact_legal_form: "contact_legal_form",
        contact_time_slot_1_ini: "contact_time_slot_1_ini",
        contact_time_slot_1_end: "contact_time_slot_1_end",
        contact_time_slot_2_ini: "contact_time_slot_2_ini",
        contact_time_slot_2_end: "contact_time_slot_2_end"
      },
      csvFields: {
        owner_id: "owner_id",
        owner_name: "owner.username",
        route_name: "route_name",
        estimated_delivery_date: "estimated_delivery_date",
        contact_name: "contact_name",
        contact_trade_name: "contact_trade_name",
        contact_address: {
          field: "contact_address",
          callback: value => {
            return this.addressFormatted(value);
          }
        },
        contact_postcode: "contact_postcode",
        contact_city: "contact_city",
        contact_nif: "contact_nif",
        contact_phone: "contact_phone",
        contact_legal_form: "contact_legal_form.name",
        contact_time_slot_1_ini: "contact_time_slot_1_ini",
        contact_time_slot_1_end: "contact_time_slot_1_end",
        contact_time_slot_2_ini: "contact_time_slot_2_ini",
        contact_time_slot_2_end: "contact_time_slot_2_end",
        units: "units",
        kilograms: "kilograms",
        refrigerated: {
          field: "refrigerated",
          callback: flag01
        },
        // 1/0 like refrigerated, as the import reads it (issues/251)
        fragile: {
          field: "fragile",
          callback: flag01
        },
        // pickup: 'pickup.name',
        pickup: {
          field: "pickup",
          callback: value => {
            return value && value.id && value.pickup ? 1 : 0;
          }
        },
        provider_order_number: "provider_order_number",
        notes: {
          field: "comments",
          callback: value => {
            return this.addressFormatted(value);
          }
        }
      },
      // Camps addicionals només per a l'exportació de comandes.
      // No formen part de csvFields perquè el preu no s'importa via CSV,
      // es calcula al servidor a partir de la ruta, kg i descomptes.
      csvExportFields: {
        preu_ruta: "price",
        descompte_volum: {
          field: "volume_discount",
          callback: value => {
            return value ? -1 * value : 0;
          }
        },
        descompte_multientrega_percent: "multidelivery_discount",
        descompte_recollida_percent: "contact_pickup_discount",
        preu_final: "finalPrice"
      },
      csvFieldsRouter: {
        "NOM CLIENT": "contact_trade_name",
        TELEFON: {
          field: "contact_phone",
          callback: value => {
            return this.phoneFormatted(value); // value.replace(/\s/g, "");
          }
        },
        ADREÇA: {
          field: "fullAddress"
          // callback: value => {
          //   return this.addressFormatted(value);
          // }
        },
        "DETALLS COMANDA": {
          field: "commentsNotes"
          // callback: value => {
          //   return this.addressFormatted(value);
          // }
        },
        "HORARIS CLIENT": {
          field: "timeslot1And2"
          // callback: value => {
          //   return this.addressFormatted(value);
          // }
        },
        CAIXES: "units",
        "TOTAL KG": "kilograms",
        "DATA D'ENTREGA": "estimated_delivery_date",
        SOCIA: "owner.username",
        MAIL: "owner.email",
        "ID CLIENT": "fullName",
        "DETALLS REPARTIDORES": {
          field: "notes_delivery"
        }
        // contact_trade_name: "contact_trade_name",
        // contact_address: {
        //   field: "contact_address",
        //   callback: value => {
        //     return this.addressFormatted(value);
        //   }
        // },
        // contact_postcode: "contact_postcode",
        // contact_city: "contact_city",
        // contact_nif: "contact_nif",

        // contact_legal_form: "contact_legal_form",
        // contact_time_slot_1_ini: "contact_time_slot_1_ini",
        // contact_time_slot_1_end: "contact_time_slot_1_end",
        // contact_time_slot_2_ini: "contact_time_slot_2_ini",
        // contact_time_slot_2_end: "contact_time_slot_2_end",
      },
      csvEcologistica: {
        "pickup.address": {
          field: "contact_address",
          callback: value => {
            return "";
          }
        },
        "pickup.address.description": {
          field: "contact_address",
          callback: value => {
            return "";
          }
        },
        "pickup.address.name": {
          field: "contact_address",
          callback: value => {
            return "La Diligència";
          }
        },
        "pickup.address.telephone": {
          field: "contact_address",
          callback: value => {
            return "";
          }
        },
        "pickup.comments": {
          field: "comments",
          callback: value => {
            return "";
          }
        },
        "pickup.timeslot": {
          field: "comments",
          callback: value => {
            return "?";
          }
        },
        "dropoff.address": "contact_address",
        "dropoff.address.description": "contact_legal_form.name",
        "dropoff.address.name": "contact_trade_name",
        "dropoff.address.telephone": "contact_phone",
        "dropoff.comments": {
          field: "commentsNotes"          
        },
        "dropoff.timeslot": {
          field: "timeslot1",
          callback: value => {
            return `${value}`;
          }
        },
        weight: "kilograms",
        packages: "units",
        CP: "contact_postcode"
      },
      csvExample: [
        {
          route_name: "RUTA01-DT-MARESME",
          owner_id: 0,
          estimated_delivery_date: "20240215",
          contact_name: "Joan Garriga",
          contact_trade_name: "Begudes Garriga",
          contact_address: "Carrer de l'amargura 17",
          contact_postcode: "08001",
          contact_city: "Mataró",
          contact_nif: "000000001A",
          contact_phone: "93 123 45 67",
          contact_legal_form: "2",
          contact_time_slot_1_ini: "9",
          contact_time_slot_1_end: "12",
          contact_time_slot_2_ini: "16",
          contact_time_slot_2_end: "18",
          units: 2,
          kilograms: 3,
          refrigerated: "1",
          fragile: "0",
          pickup: "0",
          provider_order_number: "0560605",
          notes: "Trucar per telèfon abans de l'entrega"
        },
        {
          route_name: "RUTA02-DC-GIRONAINTERIOR",
          owner_id: 0,
          estimated_delivery_date: "",
          contact_name: "Queviures Font",
          contact_trade_name: "Queviures Maria Font",
          contact_address: "Carrer de la font, 1",
          contact_postcode: "17001",
          contact_city: "Girona",
          contact_nif: "000000002B",
          contact_phone: "93 123 45 76",
          contact_legal_form: "1",
          contact_time_slot_1_ini: "10",
          contact_time_slot_1_end: "15",
          contact_time_slot_2_ini: "16",
          contact_time_slot_2_end: "19",
          units: 1,
          kilograms: 1,
          refrigerated: "0",
          fragile: "1",
          pickup: "1",
          provider_order_number: "2024/0605",
          notes: "Recollida en finca"
        }
      ],
      csvExampleContacts: [
        {
          owner_id: 0,
          contact_name: "Joan Garriga",
          contact_trade_name: "Begudes Garriga",
          contact_address: "Carrer de l'amargura 17",
          contact_postcode: "08001",
          contact_city: "Mataró",
          contact_nif: "000000001A",
          contact_phone: "93 123 45 67",
          contact_legal_form: "2",
          contact_time_slot_1_ini: "9",
          contact_time_slot_1_end: "12",
          contact_time_slot_2_ini: "16",
          contact_time_slot_2_end: "18"
        },
        {
          owner_id: 0,
          contact_name: "Queviures Font",
          contact_trade_name: "Queviures Maria Font",
          contact_address: "Carrer de la font, 1",
          contact_postcode: "17001",
          contact_city: "Girona",
          contact_nif: "000000002B",
          contact_phone: "93 123 45 76",
          contact_legal_form: "1",
          contact_time_slot_1_ini: "10",
          contact_time_slot_1_end: "15",
          contact_time_slot_2_ini: "16",
          contact_time_slot_2_end: "19"
        }
      ],
      apiUrl: import.meta.env.VUE_APP_API_URL,
      showExport: false,
      editingRowId: null,
      editForm: {},
      contacts: [],
      contactSearch: '',
      calculatedPrice: null,
      calculatedRouteRate: null,
      editingOrder: null,
      // redesign A: filters above the list and the grouping
      search: "",
      dateFilter: null,
      ownerFilter: null,
      pickupFilter: null,
      statusCounts: {},
      totals: null,
      lastWhere: [],
      collapsed: {},
      groupBy: "none",
      isMobile: typeof window !== "undefined" && window.innerWidth < 769,
      searchTimer: null
    };
  },
  computed: {
    isStaff() {
      return this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery");
    },
    // orders_delivery without the office: no invoiced orders (issues/193)
    isDriver() {
      return isDriver(this.permissions);
    },
    // a driver makes the moves of the orders, not the orders, unless she is a member too (issues/163)
    canCreate() {
      return canCreateOrders(this.permissions);
    },
    bulkStatusOptions() {
      return bulkStatuses(this.isStaff);
    },
    statusTabs() {
      return [
        { id: "", label: "Totes" },
        { id: "pending", label: "Pendents" },
        { id: "processed", label: "Processades" },
        { id: "delivered", label: "Lliurades" },
        { id: "invoiced", label: "Facturades" },
        { id: "cancelled", label: "Anul·lades" }
      ];
    },
    dateFilterDate: {
      get() {
        return this.dateFilter ? moment(this.dateFilter, "YYYY-MM-DD").toDate() : null;
      },
      set(value) {
        this.setDate(value);
      }
    },
    routeFilterLabel() {
      if (!this.routeFilter.length) return "Totes";
      if (this.routeFilter.length === 1) {
        const route = this.routes.find(r => r.id === this.routeFilter[0]);
        return route ? route.name : "1 ruta";
      }
      return `${this.routeFilter.length} rutes`;
    },
    sortedUsers() {
      return [...this.users].sort((a, b) => (a.fullname || a.username || "").localeCompare(b.fullname || b.username || ""));
    },
    perPageEffective() {
      // a single day fits in one page; other ranges are paged
      return this.dateFilter ? 1000 : Number(this.perPage);
    },
    morePages() {
      return this.total > this.perPageEffective;
    },
    // the figures above the list: every matching order (orders/totals,
    // issues/177); the loaded rows until the answer comes
    kpis() {
      return this.totals || this.pageKpis;
    },
    pageKpis() {
      const rows = this.theOrders;
      const active = rows.filter(o => o.status !== "cancelled");
      return {
        active: active.length,
        cancelled: rows.length - active.length,
        units: _.sumBy(active, o => Number(o.units) || 0),
        kg: _.sumBy(active, o => Number(o.kilograms) || 0),
        price: _.sumBy(active, o => Number(o.finalPrice) || 0),
        refrigerated: active.filter(o => o.refrigerated).length,
        transfers: active.filter(o => o.transfer).length,
        pickups: active.filter(o => o.pickup && o.pickup.pickup).length,
        deposited: active.filter(o => o.deposit_date).length
      };
    },
    headline() {
      const routes = new Set(this.theOrders.filter(o => o.route).map(o => o.route.id)).size;
      const orders = `${this.total} ${this.total === 1 ? "comanda" : "comandes"}`;
      const where = routes ? ` en ${routes} ${routes === 1 ? "ruta" : "rutes"}` : "";
      if (this.dateFilter) {
        return `Entrega prevista ${moment(this.dateFilter).locale("ca").format("dddd DD/MM/YYYY")} · ${orders}${where}`;
      }
      return `Totes les dates · ${orders}${where}`;
    },
    groups() {
      const rows = this.theOrders;
      const unsaved = rows.filter(o => !o.id);
      const saved = rows.filter(o => o.id);
      const keyOf = {
        route: o => (o.route ? `r${o.route.id}` : "r-"),
        date: o => `d${o.estimated_delivery_date || ""}`,
        owner: o => (o.owner ? `o${o.owner.id}` : "o-"),
        none: () => "all"
      }[this.groupBy] || (() => "all");
      const labelOf = {
        route: o => (o.route ? o.route.name : "Sense ruta"),
        date: o => (o.estimated_delivery_date ? this.formatDay(o.estimated_delivery_date) : "Sense data"),
        owner: o => (o.owner ? o.owner.fullname || o.owner.username : "Sense sòcia"),
        none: () => "Comandes"
      }[this.groupBy] || (() => "Comandes");
      const sortOf = {
        route: o => (o.route ? String(o.route.order ?? 9999).padStart(6, "0") + o.route.name : "~"),
        date: o => o.estimated_delivery_date || "~",
        owner: o => (o.owner ? (o.owner.fullname || o.owner.username || "").toLowerCase() : "~"),
        none: () => ""
      }[this.groupBy] || (() => "");
      const map = new Map();
      for (const o of saved) {
        const key = keyOf(o);
        if (!map.has(key)) map.set(key, { key, label: labelOf(o), sort: sortOf(o), rows: [] });
        map.get(key).rows.push(o);
      }
      const list = [...map.values()].sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
      if (unsaved.length) list.unshift({ key: "unsaved", label: "Importades, encara sense crear", rows: unsaved });
      return list.map(g => {
        const active = g.rows.filter(o => o.status !== "cancelled");
        return {
          ...g,
          units: _.sumBy(active, o => Number(o.units) || 0),
          kg: _.sumBy(active, o => Number(o.kilograms) || 0),
          price: _.sumBy(active, o => Number(o.finalPrice) || 0),
          pending: g.rows.filter(o => o.status === "pending").length
        };
      });
    },
    // the columns: header (sort), filter (old searchable columns, same API
    // fields) and quick-edit control
    columns() {
      const statuses = [["pending", "Pendent"], ["processed", "Processada"], ["delivered", "Lliurada"], ["invoiced", "Facturada"], ["cancelled", "Anul·lada"]];
      return [
        { key: "idx", label: "Núm.", sort: "id" },
        // the delivery type (Normal / Refrigerada) is the snowflake of «Senyals»:
        // its column went, its quick edit is here (issues/315); the filter
        // picks any of the signals
        { key: "signals", label: "Senyals", edit: "delivery_type", filterKey: "signal", filterLabel: "senyal", options: () => this.signalLegend.map(sg => ({ value: sg.key, label: sg.legend })) },
        { key: "contact.trade_name", label: "Punt d'entrega", sort: "contact_trade_name", edit: "contact" },
        { key: "owner.fullname", label: "Sòcia", sort: "owner.fullname", staff: true },
        { key: "route.name", label: "Ruta", sort: "route.name", edit: "route" },
        { key: "estimated_delivery_date", label: "Prevista", sort: "estimated_delivery_date", date: true, edit: "estimated" },
        { key: "pickup.name", label: "Recollida", sort: "pickup.name", edit: "pickup", options: () => this.pickups.map(p => ({ value: p.name, label: p.alias || p.name })) },
        { key: "units", label: "Caixes", sort: "units", num: true, edit: "units" },
        { key: "kilograms", label: "Kg", sort: "kilograms", num: true, edit: "kilograms" },
        { key: "price", label: "Preu", sort: "price", num: true, edit: "price" },
        { key: "status", label: "Estat", sort: "status", options: () => statuses.map(([value, label]) => ({ value, label })) }
      ];
    },
    signalLegend() {
      return [
        { key: "incidence", kind: "is-alert", icon: "alert-circle-outline", legend: "Incidència" },
        { key: "express", kind: "is-alert", icon: "flash", legend: "Express (fora de temps)" },
        { key: "late-pickup", kind: "is-alert", icon: "clock-alert-outline", legend: "Recollida tard" },
        { key: "next-week", kind: "is-next", icon: "calendar-arrow-right", legend: "Setmana vinent" },
        { key: "cold", kind: "is-cold", icon: "snowflake", legend: "Refrigerada" },
        { key: "collection", kind: "is-info", icon: "package-variant-closed", legend: "Recollida (-R)" },
        { key: "transfer", kind: "is-info", icon: "swap-horizontal", legend: "Transferència" },
        { key: "last-mile", kind: "is-info", icon: "truck-fast", legend: "Última milla" },
        { key: "fragile", kind: "is-info", icon: "glass-wine", legend: "Fràgil" }
      ];
    },
    visibleCols() {
      return this.columns.filter(c => !c.staff || this.isStaff);
    },
    // the group and total rows: label up to the boxes, then boxes, kg, price
    sumColsBefore() {
      return this.visibleCols.findIndex(c => c.key === "units");
    },
    sumColsAfter() {
      return this.visibleCols.length - this.sumColsBefore - 3 + 1;
    },
    hasColumnFilters() {
      return this.columns.some(c => this.filters[c.filterKey || c.key]);
    },
    allChecked() {
      return this.theOrders.length > 0 && this.checkedRows.length === this.theOrders.length;
    },
    someChecked() {
      return this.checkedRows.length > 0 && !this.allChecked;
    },
    footNote() {
      if (this.groupBy === "none") return `${this.theOrders.length} comandes`;
      const open = this.groups.filter(g => !this.collapsed[g.key]).length;
      const closed = this.groups.length - open;
      const by = { route: "ruta", date: "data prevista", owner: "sòcia" }[this.groupBy];
      return `Agrupat per ${by} · ${open} ${open === 1 ? "grup obert" : "oberts"}${closed ? `, ${closed} ${closed === 1 ? "plegat" : "plegats"}` : ""}`;
    },
    ...mapState(useMainStore, ["userName"]),
    ...mapState(useMainStore, ["userId"]),
    theOrders() {
      // Filtering is done at API level. The rows must stay the same objects:
      // the table matches the checked rows by identity (issues/038)
      return this.orders;
    },
    odsFields() {
      return orderOdsFields(this.csvFields);
    },
    theOrdersChecked() {
      return this.checkedRows.length
        ? this.theOrders.filter(o =>
            this.checkedRows.map(c => c.id).includes(o.id)
          )
        : this.theOrders;
    },
    // the boxes and kg of the selection (or of the list), cancelled ones
    // left out as in the figures above
    sumRows() {
      return (this.checkedRows.length ? this.checkedRows : this.theOrders).filter(o => o.status !== "cancelled");
    },
    sumUnits() {
      return _.sumBy(this.sumRows, o => Number(o.units) || 0);
    },
    sumKg() {
      return _.sumBy(this.sumRows, o => Number(o.kilograms) || 0);
    },
    sumPrice() {
      return _.sumBy(this.sumRows, o => Number(o.finalPrice) || 0);
    },
    filteredContacts() {
      return this.contacts.filter(option => {
        const searchLower = this.contactSearch.toLowerCase();
        return (
          option.display
            .toString()
            .toLowerCase()
            .indexOf(searchLower) >= 0 ||
          (option.name &&
            option.name
              .toString()
              .toLowerCase()
              .indexOf(searchLower) >= 0) ||
          (option.trade_name &&
            option.trade_name
              .toString()
              .toLowerCase()
              .indexOf(searchLower) >= 0) ||
          option.id
            .toString()
            .toLowerCase()
            .indexOf(searchLower) >= 0
        );
      });
    }
  },
  watch: {
    'editForm.route'() {
      if (this.editingRowId) {
        this.updateCalculatedPrice();
      }
    },
    'editForm.kilograms'() {
      if (this.editingRowId) {
        this.updateCalculatedPrice();
      }
    },
    'editForm.delivery_type'() {
      if (this.editingRowId) {
        this.updateCalculatedPrice();
      }
    },
    // the boxes and the pickup reprice a non-pending order too (issues/287)
    'editForm.units'() {
      if (this.editingRowId) {
        this.updateCalculatedPrice();
      }
    },
    'editForm.pickup'() {
      if (this.editingRowId) {
        this.updateCalculatedPrice();
      }
    }
  },
  async created() {
    const config = getConfig();
    this.apiUrl = config.VUE_APP_API_URL;

    if (localStorage.getItem("OrdersTable.statusFilter")) {
      try {
        const parsed = JSON.parse(localStorage.getItem("OrdersTable.statusFilter"));
        this.statusFilter = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        // Handle legacy string format
        const oldFilter = localStorage.getItem("OrdersTable.statusFilter");
        this.statusFilter = oldFilter === '' ? [] : [oldFilter];
      }
    }
    if (localStorage.getItem("OrdersTable.routeFilterId")) {
      try {
        const parsed = JSON.parse(localStorage.getItem("OrdersTable.routeFilterId"));
        this.routeFilter = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        // Handle legacy single value format
        const oldFilter = parseInt(localStorage.getItem("OrdersTable.routeFilterId"));
        this.routeFilter = (!oldFilter || oldFilter === 0) ? [] : [oldFilter];
      }
    }
    
    // redesign A filters (kept per browser, like the status and routes)
    try {
      const saved = JSON.parse(localStorage.getItem("OrdersTable.filters") || "{}");
      this.dateFilter = saved.date || null;
      this.ownerFilter = saved.owner || null;
      this.pickupFilter = saved.pickup || null;
    } catch (e) {
      // defaults
    }
    this.restoreGroupBy();

    // Ensure filters are always arrays
    if (!Array.isArray(this.statusFilter)) {
      this.statusFilter = [];
    }
    // «Última milla» is a signal now, not a status tab
    this.statusFilter = this.statusFilter.filter(st => st !== "lastmile");
    if (!Array.isArray(this.routeFilter)) {
      this.routeFilter = [];
    }
    
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
  },
  async mounted() {
    this.getData();
  },
  methods: {
    // the quick edit: OrdersForm's canEdit (the office, or a member on her
    // pending order; a driver only makes the moves, issues/163)
    canEditOrder(order) {
      return Boolean(order.id) && mayEditOrder(order, this.permissions);
    },
    // the order's card: the staff open it for the moves too
    canOpenOrder(order) {
      return mayOpenOrder(order, this.permissions);
    },
    startEdit(order) {
      this.editingRowId = order.id;
      this.editingOrder = { ...order };
      this.editForm = {
        route: order.route ? order.route.id : null,
        estimated_delivery_date: order.estimated_delivery_date
          ? moment(order.estimated_delivery_date, "YYYY-MM-DD").toDate()
          : null,
        delivery_date: order.delivery_date
          ? moment(order.delivery_date, "YYYY-MM-DD").toDate()
          : null,
        contact: order.contact ? order.contact.id : null,
        units: order.units,
        kilograms: order.kilograms,
        pickup: order.pickup ? order.pickup.id : null,
        delivery_type: order.delivery_type ? order.delivery_type.id : null,
        status: order.status,
        owner: order.owner ? order.owner.id : null,
        last_mile: order.last_mile || false
      };
      // Set contactSearch to display the current contact
      if (order.contact) {
        this.contactSearch = order.contact.trade_name || order.contact.name;
      } else {
        this.contactSearch = "";
      }
      // Calculate initial price
      this.updateCalculatedPrice();
      // a consumption-point order is priced with its lines too, which the
      // list rows don't carry (issues/227)
      if (order.pickup_point && !Array.isArray(order.lines)) this.loadEditingLines(order.id);
    },
    async loadEditingLines(id) {
      const { data } = await service({ requiresAuth: true }).get(`orders/${id}`);
      if (this.editingRowId !== id || !this.editingOrder) return;
      this.editingOrder = { ...this.editingOrder, lines: (data && data.lines) || [] };
      this.updateCalculatedPrice();
    },
    cancelEdit() {
      this.editingRowId = null;
      this.editForm = {};
      this.contactSearch = "";
      this.calculatedPrice = null;
      this.editingOrder = null;
    },
    // as OrdersForm's canChangeRate: a pending order is repriced from the
    // rates, any other that is not invoiced when its kilos, boxes, route or
    // type change; an invoiced one keeps the price it was invoiced with, a -R
    // the one of its orders (issues/287, 292)
    quickEditReprices() {
      return Boolean(this.editingOrder) && repricesOrder(this.editingOrder, { ...this.editingOrder, ...this.editForm });
    },
    // a -R follows the orders it collects: its boxes, kilos and type are not
    // edited by hand (issues/292)
    quickEditField(col) {
      if (!col.edit) return false;
      return !(this.editingOrder && this.editingOrder.is_collection_order && ["units", "kilograms", "delivery_type"].includes(col.edit));
    },
    updateCalculatedPrice() {
      this.calculatedRouteRate = null;
      if (!this.quickEditReprices()) {
        const kept = this.editingOrder ? this.editingOrder.price : null;
        this.calculatedPrice = kept === null || kept === undefined || kept === "" ? null : Number(kept);
        return;
      }
      if (!this.editForm.route || !this.editForm.kilograms) {
        this.calculatedPrice = null;
        return;
      }

      // Create a temporary form object similar to OrdersForm
      const selectedRoute = this.routes.find(r => r.id === this.editForm.route);
      const selectedDeliveryType = this.deliveryTypes.find(dt => dt.id === this.editForm.delivery_type);
      
      const tempForm = {
        ...this.editingOrder,
        ...this.editForm,
        route: selectedRoute,
        delivery_type: selectedDeliveryType,
        kilograms: parseFloat(this.editForm.kilograms) || 0
      };

      // Calculate route rate
      const routeRate = assignRouteRate(tempForm, this.routeRates, this.orders, this.pickups);
      
      if (routeRate) {
        // Calculate price (and keep the rate it comes from, saved with it, issues/287)
        this.calculatedRouteRate = routeRate.id;
        this.calculatedPrice = orderRoutePrice(routeRate, tempForm);
      } else {
        this.calculatedPrice = null;
      }
    },
    // the quick edit's price as the column shows it: the rate's price less the
    // order's discounts (issues/251); what is saved is still the rate's price
    editedFinalPrice() {
      if (this.calculatedPrice === null) return null;
      return invoicedPrice({ ...this.editingOrder, price: this.calculatedPrice });
    },
    async saveOrder(order) {
      // without a rate there is no price: say so instead of saving price null
      // and leaving it to the backend (issues/151)
      const reprices = this.quickEditReprices();
      if (reprices && (this.calculatedPrice === null || !Number.isFinite(Number(this.calculatedPrice)))) {
        this.$buefy.snackbar.open({
          message: !this.editForm.route || !Number(this.editForm.kilograms)
            ? "Cal una ruta i els quilos per calcular el preu."
            : "No s'ha trobat cap tarifa per a aquesta ruta, tipus d'entrega i recollida: no es pot calcular el preu. Revisa les tarifes o edita la comanda des de la fitxa.",
          type: "is-danger",
          indefinite: true
        });
        return;
      }
      this.importing = true;
      try {
        // Get current user for tracking
        const currentUser = await service({ requiresAuth: true }).get("users/me");
        
        // The transfer is not sent: the API recomputes it when the pickup,
        // route or date change, and leaves a delivered or invoiced order as
        // it is (issues/287, 296).
        const updateData = {
          route: this.editForm.route,
          estimated_delivery_date: this.editForm.estimated_delivery_date
            ? moment(this.editForm.estimated_delivery_date).format("YYYY-MM-DD")
            : null,
          delivery_date: this.editForm.delivery_date
            ? moment(this.editForm.delivery_date).format("YYYY-MM-DD")
            : null,
          contact: this.editForm.contact,
          units: parseFloat(this.editForm.units) || 0,
          kilograms: parseFloat(this.editForm.kilograms) || 0,
          pickup: this.editForm.pickup,
          delivery_type: this.editForm.delivery_type,
          last_mile: this.editForm.last_mile,
          _tracking_user: currentUser.data
        };
        // a -R takes them from its orders (issues/292)
        if (this.editingOrder && this.editingOrder.is_collection_order) {
          delete updateData.units;
          delete updateData.kilograms;
          delete updateData.delivery_type;
        }
        // a repriced order takes the rate's price; any other keeps its own
        if (this.calculatedPrice !== null) updateData.price = this.calculatedPrice;
        // ...and the rate of that price, or the form shows the old «Tarifa» (issues/287)
        if (reprices && this.calculatedRouteRate) updateData.route_rate = this.calculatedRouteRate;

        const response = await service({ requiresAuth: true }).put(
          `orders/${order.id}`,
          updateData
        );

        this.cancelEdit();
        
        this.$buefy.snackbar.open({
          message: "Comanda actualitzada correctament",
          type: "is-success"
        });
        
        // Refresh the data to get the updated order with all relationships
        await this.setStatusFilter({ ctrlKey: false, metaKey: false });
      } catch (error) {
        this.$buefy.snackbar.open({
          message: error.response?.data?.message || "Error actualitzant la comanda",
          type: "is-danger"
        });
      } finally {
        this.importing = false;
      }
    },
    rowClassFn(row) {
      if (!row.estimated_delivery_date) return "";
      // Parse the date as YYYY-MM-DD or YYYYMMDD
      const date = moment(row.estimated_delivery_date, [
        "YYYY-MM-DD",
        "YYYYMMDD"
      ]);
      if (!date.isValid()) return "";
      const orderWeek = date.isoWeek();
      const currentWeek = moment().isoWeek();
      if (orderWeek > currentWeek) {
        return "future-week-row";
      }
      return "";
    },
    async setStatusFilter(event, status) {
      // Handle Ctrl+Click for multiple selection
      const isCtrlClick = event.ctrlKey || event.metaKey;
      
      // If status is undefined, we're being called from elsewhere (pagination, etc.)
      // In that case, just refresh with current filters
      if (status === undefined) {
        // Keep current filters, just re-fetch
      } else if (status === '') {
        // "TOTES" button - clear all filters
        this.statusFilter = [];
      } else if (isCtrlClick) {
        // Ctrl+Click - toggle the status in the array
        const index = this.statusFilter.indexOf(status);
        if (index > -1) {
          // Remove if already selected
          this.statusFilter.splice(index, 1);
        } else {
          // Add if not selected
          this.statusFilter.push(status);
        }
      } else {
        // Normal click - replace with single selection
        this.statusFilter = [status];
      }
      
      localStorage.setItem("OrdersTable.statusFilter", JSON.stringify(this.statusFilter));
      if (status !== undefined) this.page = 1;

      const where = [];
      
      where.push(...statusWhere(this.statusFilter));

      for (const key in this.filters) {
        if (this.filters[key]) {
          const value = this.filters[key].trim();
          if (this.filters[key] === "") {
            continue;
          }
          const comparison = key.includes("date") ? "_eq" : "_contains";
          if (key.includes("date")) {
            where.push(...dateFilterWhere(key, value));
          } else if (key === "idx") {
            // remove zeros at start
            const id_contains = value.replace(/^0+/, "");
            where.push(`_where[id_contains]=${id_contains}`);
          } else if (key === "idx") {
            // remove zeros at start
            const id_contains = value.replace(/^0+/, "");
            where.push(`_where[id_contains]=${id_contains}`);
          } else if (key === "price") {
            where.push(...priceFilterWhere(value));
          } else if (key === "kilograms") {
            where.push(...kilogramsFilterWhere(value));
          } else if (key === "signal") {
            where.push(...signalWhere(value));
          } else if (key === "last_mile_display") {
            // remove zeros at start
            if (value.toLowerCase().startsWith("s")) {
              where.push(`_where[last_mile]=true`);
            } else {
              where.push(`_where[last_mile_null]=true`);
            }
          } else {
            where.push(`_where[${key}${comparison}]=${value}`);
          }
        }
      }

      // redesign A filters: search, expected date, member, pickup point
      const q = (this.search || "").trim();
      if (q) {
        const v = encodeURIComponent(q);
        const or = [
          `_where[_or][0][contact_trade_name_contains]=${v}`,
          `_where[_or][1][contact_name_contains]=${v}`,
          `_where[_or][2][owner.fullname_contains]=${v}`,
          `_where[_or][3][contact_city_contains]=${v}`
        ];
        if (/^\d+$/.test(q)) or.push(`_where[_or][4][id]=${q.replace(/^0+/, "") || 0}`);
        where.push(...or);
      }
      if (this.dateFilter) where.push(`_where[estimated_delivery_date]=${this.dateFilter}`);
      where.push(...ownerWhere(this.ownerFilter));
      if (this.pickupFilter) where.push(`_where[pickup.id]=${this.pickupFilter}`);
      localStorage.setItem("OrdersTable.filters", JSON.stringify({
        date: this.dateFilter,
        owner: this.ownerFilter,
        pickup: this.pickupFilter
      }));

      // For routes: Use multiple _where[route.id] for OR condition
      if (this.routeFilter.length === 1) {
        where.push(`_where[route.id]=${this.routeFilter[0]}`);
      } else if (this.routeFilter.length > 1) {
        // Multiple route.id parameters should create OR condition
        this.routeFilter.forEach(routeId => {
          where.push(`_where[route.id]=${routeId}`);
        });
      }

      // Use the lightweight /orders/table endpoint: same query semantics as
      // /orders but only populates the relations the table renders (drops
      // emitted_invoice and other deep relations, which were ~96% of the
      // payload and not used here).
      // the counts of the status tabs: same filters, each status
      this.loadStatusCounts(where.filter(w => !w.startsWith("_where[status]")));
      this.lastWhere = where;
      this.loadTotals(where);

      this.orders = (
        await service({ requiresAuth: true }).get(
          `orders/table?_limit=${this.perPageEffective}&_start=${(this.page - 1) *
            this.perPageEffective}&_sort=${this.sortField}:${this.sortOrder}${
            this.userFilter
          }&${where.join("&")}`
        )
      ).data;

      this.total = (
        await service({ requiresAuth: true }).get(
          `orders/table/count?${this.userFilter}&${where.join("&")}`
        )
      ).data;

      this.orders = this.orders.map(o => this.decorateOrder(o));

      this.checkedRows = [];
    },
    // the columns the table and the exports read, from an orders/table row
    decorateOrder(o) {
      return {
        ...this.withNotes(o),
        idx: o.id.toString().padStart(4, "0") + (o.is_collection_order ? `-R` : ""),
        // some old orders have no route or member
        route_name: o.route ? o.route.name : "",
        owner_id: o.owner ? o.owner.id : null,
        timeslot1: `${o.estimated_delivery_date} ${this.formatSlot(
          o.contact_time_slot_1_ini
        )} - ${o.estimated_delivery_date} ${this.formatSlot(
          o.contact_time_slot_1_end
        )}`,
        timeslot2: `${o.estimated_delivery_date} ${this.formatSlot(
          o.contact_time_slot_2_ini
        )} -${o.estimated_delivery_date} ${this.formatSlot(
          o.contact_time_slot_2_end
        )}`,
        fullAddress: `${o.contact_address}, ${o.contact_postcode} ${o.contact_city}`,
        timeslot1And2: `${this.formatSlot2(
          o.contact_time_slot_1_ini,
          o.contact_time_slot_1_end,
          ""
        )}${this.formatSlot2(
          o.contact_time_slot_2_ini,
          o.contact_time_slot_2_end,
          ", "
        )}`,
        fullName: o.contact_trade_name || o.contact_name,
        last_mile_display: o.last_mile ? "Sí" : "No"
      };
    },
    async loadTotals(where) {
      // only the answer to the last filters counts
      const seq = (this.totalsSeq = (this.totalsSeq || 0) + 1);
      this.totals = null;
      try {
        const { data } = await service({ requiresAuth: true }).get(`orders/totals?${this.userFilter}&${where.join("&")}`);
        if (seq === this.totalsSeq) this.totals = data;
      } catch (e) {
        // the loaded rows' figures stay
      }
    },
    // what the export menu downloads: the selection, else every matching order
    rowsToExport() {
      return exportRows({
        checked: this.checkedRows.length ? this.theOrdersChecked : [],
        rows: this.theOrders,
        morePages: this.morePages,
        fetchAll: async () =>
          (
            await service({ requiresAuth: true }).get(
              `orders/table?_limit=-1&_sort=${this.sortField}:${this.sortOrder}${this.userFilter}&${this.lastWhere.join("&")}`
            )
          ).data.map(o => this.decorateOrder(o))
      });
    },
    withNotes(o) {
      return {
        ...o,
        commentsNotes:
          (o.contact && o.contact.notes ? o.contact.notes + " - " : "") +
          (o.comments ? o.comments : "") +
          (o.comments && o.refrigerated ? " - " : "") +
          (o.refrigerated ? "REFRIGERAT" : "") +
          (o.fragile ? " - FRÀGIL" : "") +
          (o.contact && o.contact.notes_delivery ? " - " + o.contact.notes_delivery : ""),
        notes_delivery: o.contact && o.contact.notes_delivery ? o.contact.notes_delivery : ""
      };
    },
    setRouteFilter(event, route) {
      // Handle Ctrl+Click for multiple selection
      const isCtrlClick = event.ctrlKey || event.metaKey;
      
      if (route === 0) {
        // "TOTES" button - clear all filters
        this.routeFilter = [];
      } else if (isCtrlClick) {
        // Ctrl+Click - toggle the route in the array
        const index = this.routeFilter.indexOf(route);
        if (index > -1) {
          // Remove if already selected
          this.routeFilter.splice(index, 1);
        } else {
          // Add if not selected
          this.routeFilter.push(route);
        }
      } else {
        // Normal click - replace with single selection
        this.routeFilter = [route];
      }
      
      localStorage.setItem("OrdersTable.routeFilterId", JSON.stringify(this.routeFilter));
      this.checkedRows = [];
      this.setStatusFilter({ ctrlKey: false, metaKey: false });
    },
    navNew() {
      const q = this.$route.meta.userContacts ? `?user=true` : "";
      this.$router.push("/comanda/0" + q);
    },
    navNewPickup() {
      this.$router.push("/comanda/0?pickup_point=true");
    },
    async getData() {
      this.isLoading = true;

      const me = await service({ requiresAuth: true, cached: true }).get(
        "users/me"
      );
      this.me = me.data;
      if (me.data.permissions.map(p => p.permission).includes("orders_admin") || me.data.permissions.map(p => p.permission).includes("orders_delivery")) {
        this.userFilter = "";
      } else {
        this.userFilter = `&_where[owner]=${me.data.id}`;
        this.csvExample.forEach(element => {
          element.owner_id = me.data.id;
        });
        this.csvExampleContacts.forEach(element => {
          element.owner_id = me.data.id;
        });
      }
      // const where = `&_where[status]=pending`;
      // this.orders = (
      //   await service({ requiresAuth: true }).get(
      //     `orders?_limit=-1&_sort=route_date:DESC,id:DESC${this.userFilter}${where}`
      //   )
      // ).data;

      this.routes = (
        await service({ requiresAuth: true }).get(
          `routes?_limit=-1&_sort=order:ASC`
        )
      ).data;

      this.users = orderMembers(
        (await service({ requiresAuth: true, cached: true }).get("users?_limit=-1")).data
      );

      if (me.data.permissions.map(p => p.permission).includes("orders_admin") || me.data.permissions.map(p => p.permission).includes("orders_delivery")) {
        this.csvExample.forEach(element => {
          element.owner_id = this.users[0].id;
        });
      }

      this.deliveryTypes = (
        await service({ requiresAuth: true }).get(`delivery-types?_limit=-1`)
      ).data;

      this.pickups = (
        await service({ requiresAuth: true }).get(`pickups?_limit=-1`)
      ).data;

      this.routeRates = (
        await service({ requiresAuth: true, cached: true }).get(
          "route-rates?_limit=-1"
        )
      ).data;

      // Load contacts for autocomplete.
      // `contacts?_limit=-1` is the core route: the backend gives it
      // populate='*' and then sanitises every field of every row, which cost
      // ~1s server-side and a 2MB payload for ~1200 contacts. /contacts/for-orders
      // selects only the fields this table reads (36ms, 0.59MB).
      this.contacts = (
        await service({ requiresAuth: true }).get(`contacts/for-orders`)
      ).data.map(c => ({
        ...c,
        display: `${c.trade_name || c.name} (${c.city || ''}) - ${c.id}`
      }));

      // Load city routes for transfer logic
      this.cityRoutes = (
        await service({ requiresAuth: true }).get("city-routes/basic")
      ).data;

      // Load cities for transfer logic
      this.cities = (
        await service({ requiresAuth: true }).get("cities?_limit=-1")
      ).data;

      // Load socies contacts for collection points
      this.sociesContacts = (
        await service({ requiresAuth: true }).get("contacts/for-orders?socies=1")
      ).data;

      this.setStatusFilter({ ctrlKey: false, metaKey: false });


      // this.orders = this.orders.map(o => {
      //   return {
      //     ...o,
      //     idx: o.id.toString().padStart(4, "0"),
      //     route_name: o.route.name,
      //     owner_id: o.owner.id,
      //     timeslot1: `${o.estimated_delivery_date} ${this.formatSlot(o.contact_time_slot_1_ini)} - ${o.estimated_delivery_date} ${this.formatSlot(o.contact_time_slot_1_end)}`,
      //     timeslot2: `${o.estimated_delivery_date} ${this.formatSlot(o.contact_time_slot_2_ini)} -${o.estimated_delivery_date} ${this.formatSlot(o.contact_time_slot_2_end)}`,
      //     fullAddress: `${o.contact_address}, ${o.contact_postcode} ${o.contact_city}`,
      //     timeslot1And2: `${this.formatSlot2(o.contact_time_slot_1_ini, o.contact_time_slot_1_end, '')}${this.formatSlot2(o.contact_time_slot_2_ini, o.contact_time_slot_2_end, ', ')}`,
      //     fullName: o.contact_trade_name ||o.contact_name,
      //     last_mile_display: o.last_mile ? 'Sí' : 'No'
      //   };
      // });

      this.contactsCSV = this.orders;
      this.isLoading = false;
    },
    formatSlot(s) {
      return s && s.toString().includes(".")
        ? s
            .toString()
            .replace(".5", ":30")
            .replace(".25", ":15")
            .replace(".75", ":45")
        : `${s}:00`;
    },
    formatSlot2(s1, s2, prefix) {
      return s1 && s2
        ? prefix +
            (s1.toString().includes(".")
              ? s1
                  .toString()
                  .replace(".5", ":30")
                  .replace(".25", ":15")
                  .replace(".75", ":45")
              : `${s1}:00`) +
            "-" +
            (s2.toString().includes(".")
              ? s2
                  .toString()
                  .replace(".5", ":30")
                  .replace(".25", ":15")
                  .replace(".75", ":45")
              : `${s2}:00`)
        : "";
    },
    async preUpload() {
      return await service({ requiresAuth: true }).post("orders-imports", {
        users_permissions_user: this.me.id
      });
    },
    uploaded(e, fileType) {
      if (e.fileList && e.fileList[0]) {
        const file = e.fileList[0];

        let continueImport = true;

        if (file && file.name && !file.name.toLowerCase().endsWith(".csv")) {
          this.$buefy.snackbar.open({
            message: "Només es poden pujar arxius CSV",
            type: "is-danger"
          });
          continueImport = false;
          return;
        }
        this.importing = true;
        
        // Try to read with UTF-8 first, then fallback to Windows-1252 if encoding issues detected
        const reader = new FileReader();
        reader.onload = async e => {
          if (!continueImport) {
            return;
          }
          let text = e.target.result;
          
          // Check if the text contains replacement characters (encoding issues)
          if (text.includes('�')) {
            // Try again with Windows-1252 encoding
            const readerRetry = new FileReader();
            readerRetry.onload = async e => {
              text = e.target.result;
              await this.importText(text, fileType);
            };
            readerRetry.onerror = () => {
              this.$buefy.snackbar.open({
                message: "Error llegint l'arxiu",
                type: "is-danger"
              });
              this.importing = false;
            };
            readerRetry.readAsText(file, 'Windows-1252');
            return;
          }
          
          await this.importText(text, fileType);
        };
        
        reader.onerror = () => {
          this.$buefy.snackbar.open({
            message: "Error llegint l'arxiu",
            type: "is-danger"
          });
          this.importing = false;
        };

        // Try UTF-8 first
        reader.readAsText(file, 'UTF-8');
      }
    },
    // Reads the file's rows into the grid. An unexpected error used to leave
    // the import stuck without a word (issues/231): it is shown now.
    async importText(text, fileType) {
      try {
        this.csv = text;
        const records = await this.readCSV(text);
        if (fileType === "orders") {
          await this.importCSV(records);
        } else {
          await this.importContactsCSV(records);
        }
      } catch (e) {
        this.$buefy.snackbar.open({
          message: `No s'ha pogut importar l'arxiu: ${e.message || e}`,
          type: "is-danger"
        });
      } finally {
        this.importing = false;
      }
    },
    removeAccents(name) {
      // a route or point without a name matches nothing (issues/231)
      return String(name ?? "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    },
    async importCSV(records) {
      // for (const key in this.csvAlias) {
      //   const alias = this.csvAlias[key]
      // }

      let i = 2;
      this.csvErrors = [];

      if (!records.length) {
        this.csvErrors.push({ line: 1, error: "No hi ha registres" });
        return false;
      }


      const owner = (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))
        ? this.users.find(
            u => u.id.toString() === records[0].owner_id.toString()
          )
        : this.me;

      const contacts = await this.getContactsForImport(owner.id);
      // closed days of each route, skipped when dating the orders (issues/082)
      const closures = (await service({ requiresAuth: true }).get(
        `route-festives?_where[date_gte]=${moment().format("YYYY-MM-DD")}&_limit=-1`
      )).data;


      for await (const record of records) {
        if (!record.route_name) {
          this.csvErrors.push({ line: i, error: "No hi ha ruta (route_name)" });
          return false;
        }
        // if (!record.contact_address) {
        //   this.csvErrors.push({ line: i, error: "No contact_address" });
        //   return false;
        // }
        if (!record.contact_trade_name) {
          this.csvErrors.push({
            line: i,
            error: "No hi ha nom comercial (contact_trade_name)"
          });
          return false;
        }

        const contact = contacts.find(
          c =>
            this.removeAccents(c.trade_name) ===
            this.removeAccents(record.contact_trade_name)
        );

        if (!contact) {
          this.csvErrors.push({
            line: i,
            error: `Punt d'entrega ${record.contact_trade_name} no trobat`
          });
          return false;
        }

        if (!contact.nif) {
          this.csvErrors.push({
            line: i,
            error: `El punt d'entrega ${record.contact_trade_name} no te NIF`
          });
          return false;
        }

        if (!contact.phone) {
          this.csvErrors.push({
            line: i,
            error: `El punt d'entrega ${record.contact_trade_name} no te telèfon`
          });
          return false;
        }

        if (!contact.address) {
          this.csvErrors.push({
            line: i,
            error: `El punt d'entrega ${record.contact_trade_name} no te adreça`
          });
          return false;
        }

        if (!contact.postcode) {
          this.csvErrors.push({
            line: i,
            error: `El punt d'entrega ${record.contact_trade_name} no te codi postal`
          });
          return false;
        }

        if (!contact.city) {
          this.csvErrors.push({
            line: i,
            error: `El punt d'entrega ${record.contact_trade_name} no te població`
          });
          return false;
        }

        if (!contact.time_slot_1_ini || !contact.time_slot_1_end) {
          this.csvErrors.push({
            line: i,
            error: `El punt d'entrega ${record.contact_trade_name} no te horari de contacte`
          });
          return false;
        }

        // Checks `sector`, which is what the message has always said. It used
        // to test `legal_form`: v3 stored 0 for "unset" on 833 of 1263
        // contacts and Bookshelf handed that dangling FK back as something
        // truthy, so the check passed; v5 resolves it to null and every
        // import failed. Only 19 contacts have a real legal form, against
        // 1091 with a sector.
        if (!contact.sector) {
          this.csvErrors.push({
            line: i,
            error: `El punt d'entrega ${record.contact_trade_name} no te sector`
          });
          return false;
        }

        // if (!record.contact_phone) {
        //   this.csvErrors.push({ line: i, error: "No contact_phone" });
        //   return false;
        // }
        // if (!record.contact_postcode) {
        //   this.csvErrors.push({ line: i, error: "No contact_postcode" });
        //   return false;
        // }
        // if (!record.contact_city) {
        //   this.csvErrors.push({ line: i, error: "No contact_city" });
        //   return false;
        // }
        // if (!record.contact_nif) {
        //   this.csvErrors.push({ line: i, error: "No contact_nif" });
        //   return false;
        // }
        // if (!record.contact_time_slot_1_ini) {
        //   this.csvErrors.push({ line: i, error: "No contact_time_slot_1_ini" });
        //   return false;
        // }
        // if (!record.contact_time_slot_1_end) {
        //   this.csvErrors.push({ line: i, error: "No contact_time_slot_1_end" });
        //   return false;
        // }
        if (!(csvKilograms(record.kilograms) > 0)) {
          this.csvErrors.push({
            line: i,
            error: "Kilograms incorrectes (kilograms)"
          });
          return false;
        }
        if (!record.units || parseInt(record.units) <= 0) {
          this.csvErrors.push({ line: i, error: "Caixes incorrectes (units)" });
          return false;
        }

        if (
          !this.routes.find(
            r =>
              this.removeAccents(r.name) ===
              this.removeAccents(record.route_name)
          )
        ) {
          this.csvErrors.push({
            line: i,
            error: `Ruta ${record.route_name} no trobada`
          });
          return false;
        }

        if (
          !this.users.find(u => u.id.toString() === record.owner_id.toString())
        ) {
          this.csvErrors.push({
            line: i,
            error: `Sòcia ${record.owner_id} no trobada`
          });
          return false;
        }
        i++;

        const route = this.routes.find(
          r =>
            this.removeAccents(r.name) === this.removeAccents(record.route_name)
        );

        if (!route) {
          this.csvErrors.push({
            line: i,
            error: `Ruta ${record.route_name} no trobada (route_name)`
          });
          return false;
        }

        const routeDate = assignRouteDate(route, {
          nextDayLimitHour: this.nextDayLimitHour,
          isAdmin: this.permissions.includes("orders_admin"),
          closures
        });

        const pickup = record.pickup
          ? this.pickups.find(
              p => p.id.toString() === record.pickup.toString()
            )
          : this.pickups[0];

        const owner = (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))
          ? this.users.find(
              u => u.id.toString() === record.owner_id.toString()
            )
          : this.me;

        const order = {
          id: 0,
          route_date: moment().format("YYYY-MM-DD"),
          estimated_delivery_date: record.estimated_delivery_date,
          contact_address: contact.address,
          contact_name: contact.name,
          contact_trade_name: contact.trade_name,
          contact_phone: contact.phone,
          contact_postcode: contact.postcode,
          contact_nif: contact.nif,
          contact_city: contact.city,
          contact_legal_form: contact.legal_form ? contact.legal_form.id : null,
          contact_time_slot_1_ini: contact.time_slot_1_ini,
          contact_time_slot_1_end: contact.time_slot_1_end,
          contact_time_slot_2_ini: contact.time_slot_2_ini,
          contact_time_slot_2_end: contact.time_slot_2_end,
          contact: {
            id: contact.id,
            name: contact.name,
            trade_name: contact.trade_name,
            address: contact.address,
            phone: contact.phone,
            postcode: contact.postcode,
            nif: contact.nif,
            city: contact.city,
            time_slot_1_ini: contact.time_slot_1_ini,
            time_slot_1_end: contact.time_slot_1_end,
            time_slot_2_ini: contact.time_slot_2_ini,
            time_slot_2_end: contact.time_slot_2_end
          },
          fragile: record.fragile === "1",
          refrigerated: record.refrigerated === "1",
          delivery_type:
            record.refrigerated === "1"
              ? this.deliveryTypes.find(d => d.refrigerated)
              : this.deliveryTypes.find(d => !d.refrigerated),
          pickup: pickup,
          kilograms: csvKilograms(record.kilograms),
          units: Math.abs(parseInt(record.units)),
          notes: record.notes,
          comments: record.notes,
          provider_order_number: (record.provider_order_number || "").trim() || null,
          owner: owner,
          route: route,
          estimated_delivery_date: record.estimated_delivery_date
            ? moment(record.estimated_delivery_date, "YYYYMMDD").format(
                "YYYY-MM-DD"
              )
            : moment(routeDate.nextDay.toDate()).format("YYYY-MM-DD"),
          price: null,
          status: "CSV",
          _uuid: this.createUUID(),
          transfer: false,
          transfer_pickup_origin: null,
          transfer_pickup_destination: null
        };

        // Check if transfer is needed
        this.checkTransferNeeded(order);

        if (routeDate.warning) {
          this.$buefy.toast.open({
            message: routeDate.warning,
            type: "is-warning"
          });
          // this.$buefy.snackbar.open({
          //   message: routeDate.warning,
          //   type: "is-warning"
          // });
        }


        const orderWithRate = {
          ...this.withNotes(order),
          route_rate: assignRouteRate(order, this.routeRates, this.orders, this.pickups)
        };
        orderWithRate.price = orderWithRate.route_rate ? orderWithRate.route_rate.price : undefined;

        if (order.kilograms !== null && orderWithRate.route_rate) {
          const rate = orderWithRate.route_rate;
          orderWithRate.price = orderRoutePrice(rate, order);
        } else {
          // console.warn("!order", order.kilograms, order.route_rate);
        }
        // what the list shows of a row before it is created: its delivery
        // point and its price (issues/251); the discounts the save applies are
        // asked once every row is read (previewCSVDiscounts, issues/298)
        orderWithRate.fullName = contact.trade_name || contact.name;
        if (Number.isFinite(Number(orderWithRate.price)) && orderWithRate.price !== null) {
          orderWithRate.finalPrice = invoicedPrice(orderWithRate);
        }
        this.orders.unshift(orderWithRate);
        // this.orders.unshift(order);
      }
      await this.previewCSVDiscounts();
    },
    // the discounts the save will apply, asked to the server with the other
    // rows still to be saved (issues/298)
    async previewCSVDiscounts() {
      const rows = this.orders.filter(o => !o.id && o.status === "CSV");
      await Promise.all(rows.map(async row => {
        const query = csvDiscountQuery(row, rows);
        if (!query.contactId || !query.date) return;
        try {
          const { data } = await service({ requiresAuth: true }).post("orders/check-multidelivery", query);
          const index = this.orders.indexOf(row);
          if (index >= 0) this.orders.splice(index, 1, withCsvDiscounts(row, data));
        } catch (error) {
          // the row keeps the rate's price; the save applies the discounts anyway
          console.error("Error previewing the discounts", error);
        }
      }));
    },
    async getContactsForImport(owner) {
      const contacts = (
        await service({ requiresAuth: true, cached: false }).get(
          `contacts/basic?_limit=-1&_where[owner_ne]=null`
        )
      ).data;

      // const contacts1 = (
      //   await service({ requiresAuth: true, cached: false }).get(
      //     `contacts/basic?_limit=-1&_where[owner]=${owner}`
      //   )
      // ).data

      // const contacts2 = (
      //   await service({ requiresAuth: true, cached: false }).get(
      //     `contacts/basic?_limit=-1&_where[multiowner]=true`
      //   )
      // ).data

      // const contacts = _.concat(contacts1, contacts2);

      return contacts;
    },
    async importContactsCSV(records) {
      // for (const key in this.csvAlias) {
      //   const alias = this.csvAlias[key]
      // }

      let i = 2;
      this.csvErrors = [];
      const contacts = [];
      for await (const record of records) {
        if (!record.contact_address) {
          this.csvErrors.push({ line: i, error: "No contact_address" });
          return false;
        }
        if (!record.contact_name) {
          this.csvErrors.push({ line: i, error: "No contact_name" });
          return false;
        }
        if (!record.contact_phone) {
          this.csvErrors.push({ line: i, error: "No contact_phone" });
          return false;
        }
        if (!record.contact_postcode) {
          this.csvErrors.push({ line: i, error: "No contact_postcode" });
          return false;
        }
        if (!record.contact_city) {
          this.csvErrors.push({ line: i, error: "No contact_city" });
          return false;
        }

        // L'hora d'inici del tram horari 1 no pot ser més gran que l'hora de finalitzaci
        if (record.contact_time_slot_1_ini && record.contact_time_slot_1_end) {
          if (
            parseFloat(record.contact_time_slot_1_ini) >=
            parseFloat(record.contact_time_slot_1_end)
          ) {
            this.csvErrors.push({
              line: i,
              error: `L'hora d'inici del tram horari 1 no pot ser més gran que l'hora de finalització`
            });
            return false;
          }
        }

        // Cal indicar l'hora de finalització del tram horari 1
        if (record.contact_time_slot_1_ini && !record.contact_time_slot_1_end) {
          this.csvErrors.push({
            line: i,
            error: `Cal indicar l'hora de finalització del tram horari 1`
          });
          return false;
        }

        // El tram horari ha de ser més gran de 3 hores
        if (record.contact_time_slot_1_ini && record.contact_time_slot_1_end) {
          if (
            parseFloat(record.contact_time_slot_1_end) -
              parseFloat(record.contact_time_slot_1_ini) <
            3
          ) {
            // comprovar també per al tram 2
            if (
              record.contact_time_slot_2_ini &&
              record.contact_time_slot_2_end
            ) {
              if (
                parseFloat(record.contact_time_slot_2_end) -
                  parseFloat(record.contact_time_slot_2_ini) <
                3
              ) {
                this.csvErrors.push({
                  line: i,
                  error: `El tram horari ha de ser mínim de 3 hores`
                });
                return false;
              }
            } else {
              this.csvErrors.push({
                line: i,
                error: `El tram horari ha de ser mínim de 3 hores`
              });
              return false;
            }
          }
        }

        if (
          record.owner_id.toString() === "0" &&
          (this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))
        ) {
          record.owner_id = this.me.id;
          record.multiowner = true;
        } else {
          record.multiowner = false;
          if (!(this.permissions.includes("orders_admin") || this.permissions.includes("orders_delivery"))) {
            record.owner_id = this.me.id;
          }
          if (
            !this.users.find(
              u => u.id.toString() === record.owner_id.toString()
            )
          ) {
            this.csvErrors.push({
              line: i,
              error: `Owner ${record.owner_id} no trobat`
            });
            return false;
          }
          i++;
        }

        const contact = {
          name: record.contact_name,
          trade_name: record.contact_trade_name,
          address: record.contact_address,
          phone: record.contact_phone,
          postcode: importedPostcode(record.contact_postcode),
          nif: record.contact_nif,
          city: record.contact_city,
          time_slot_1_ini: record.contact_time_slot_1_ini || null,
          time_slot_1_end: record.contact_time_slot_1_end || null,
          time_slot_2_ini: record.contact_time_slot_2_ini || null,
          time_slot_2_end: record.contact_time_slot_2_end || null,
          multiowner: record.multiowner,
          owner: record.owner_id
        };

        contacts.push(contact);
        i++;
      }

      for (const contact of contacts) {
        const { data } = await service({ requiresAuth: true }).post(
          "contacts",
          contact
        );
      }

      this.$buefy.snackbar.open({
        message: `${records.length} contactes importats correctament`,
        type: "is-success"
      });
    },
    checkTransferNeeded(order) {
      // Only check if we have both a route and a pickup selected
      if (!order.route || !order.pickup) {
        return;
      }

      const selectedPickup = order.pickup;
      const selectedRoute = order.route;
      
      let pickupCityId = null;

      // Case 1: Pickup where pickup = false (has direct city relation)
      if (!selectedPickup.pickup && selectedPickup.city) {
        pickupCityId = idOf(selectedPickup.city);
      }
      // Case 2: Pickup where pickup = true (need to get city from collection_point)
      else if (selectedPickup.pickup && order.collection_point && order.owner) {
        // Find the collection point contact
        const ownerId = idOf(order.owner);
        const ownerContact = this.sociesContacts.find(c => 
          c.users_permissions_user && c.users_permissions_user.id === ownerId
        );
        
        if (ownerContact && ownerContact.collection_points) {
          // Find the specific collection point
          const collectionPoint = ownerContact.collection_points.find(cp => {
            const cpId = idOf(cp);
            return cpId === order.collection_point;
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

      const routeId = idOf(selectedRoute);

      // Check if the selected route travels to this city
      const routeTravelsToCity = this.cityRoutes.some(cr => {
        // A dangling relation comes back as null; those rows cannot match
        // anything, so skip them rather than dereference them.
        if (!cr || !cr.city || !cr.route) return false;
        return idOf(cr.city) === pickupCityId && idOf(cr.route) === routeId;
      });

      // If route does NOT travel to the city, transfer is needed
      order.transfer = !routeTravelsToCity;
      
      // Set transfer pickup origin and destination if transfer is needed
      if (order.transfer) {
        // Transfer origin: the pickup where the order was deposited
        order.transfer_pickup_origin = selectedPickup.id || selectedPickup;
        
        // Transfer destination: the transfer_pickup from the route (where the transfer will go)
        if (selectedRoute.transfer_pickup) {
          order.transfer_pickup_destination = typeof selectedRoute.transfer_pickup === 'object' 
            ? selectedRoute.transfer_pickup.id 
            : selectedRoute.transfer_pickup;
        } else {
          order.transfer_pickup_destination = null;
        }
      } else {
        // No transfer needed, clear the transfer pickup fields
        order.transfer_pickup_origin = null;
        order.transfer_pickup_destination = null;
      }
    },
    createUUID() {
      var dt = new Date().getTime();
      var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function(c) {
          var r = (dt + Math.random() * 16) % 16 | 0;
          dt = Math.floor(dt / 16);
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        }
      );
      return uuid;
    },
    async readCSV(content) {
      // the delimiter of this file: the one its header line uses most
      // (only «;» in the first 10 characters missed «route_name;…», and a «;»
      // stayed for the next file, issues/285)
      const header = String(content).split(/\r?\n/, 1)[0];
      const count = ch => header.split(ch).length - 1;
      this.csvOptions.delimiter = count(";") > count(",") ? ";" : ",";
      return new Promise(async (resolve, reject) => {
        try {
          parse(content, this.csvOptions, (err, records) => {
            if (err) {
              console.error("Error importing file (2)", err);
              reject(err);
            }
            resolve(records);
          });
        } catch (e) {
          console.error("Error importing file (3)", e);
          reject(e);
        }
      });
    },
    async createCSVOrder(order) {
      const _uuid = order._uuid;

      if (order.estimated_delivery_date === "") {
        delete order.estimated_delivery_date;
      }
      let data;
      try {
        ({ data } = await service({ requiresAuth: true }).post(
          "orders/csv",
          csvOrderPayload(order)
        ));
      } catch (error) {
        // e.g. the cutoff refusal: say why the row wasn't created (issues/231)
        this.$buefy.snackbar.open({
          message: error.response?.data?.message || error.response?.data?.error?.message || "No s'ha pogut crear la comanda",
          type: "is-danger"
        });
        return;
      }

      if (!order.contact_time_slot_1_ini) {
        delete order.contact_time_slot_1_ini;
      }
      if (!order.contact_time_slot_1_end) {
        delete order.contact_time_slot_1_end;
      }
      if (!order.contact_time_slot_2_ini) {
        delete order.contact_time_slot_2_ini;
      }
      if (!order.contact_time_slot_2_end) {
        delete order.contact_time_slot_2_end;
      }
      if (order.contact && !order.time_slot_1_ini) {
        delete order.contact.time_slot_1_ini;
      }
      if (order.contact && !order.time_slot_1_end) {
        delete order.contact.time_slot_1_end;
      }
      if (order.contact && !order.time_slot_2_ini) {
        delete order.contact.time_slot_2_ini;
      }
      const orderToUpdate = this.orders.findIndex(
        o => o._uuid && o._uuid === _uuid
      );
      if (orderToUpdate >= 0) {
        this.orders[orderToUpdate].id = data.id;
        this.orders[orderToUpdate].idx = data.id.toString().padStart(4, "0") + (data.is_collection_order ? `-R` : "");
        this.orders[orderToUpdate].status = data.status;
      }
    },
    addressFormatted(address) {
      return '"' + address + '"';
    },
    phoneFormatted(phone) {
      // an order without a phone made the whole export fail silently (issues/226)
      if (!phone) return "";
      let ret = String(phone).replace(/\s/g, "");
      if (ret.startsWith("+34")) {
        ret = ret.replace("+34", "34");
      } else if (!ret.startsWith("34")) {
        ret = "34" + ret;
      }
      return ret;
    },
    timeSlotsFormatted(slots) {
      return '"' + slots + '"';
    },
    async setBulkState(_event, confirmed = false) {
      // a member only cancels her pending orders (issues/144), a driver leaves
      // the invoiced ones to the office (issues/193)
      const rows = this.checkedRows.filter(row => canSetStatus(row, this.newState, this.isStaff, { driver: this.isDriver }));
      const skipped = this.checkedRows.length - rows.length;
      const reason = bulkSkipReason(this.isStaff, this.isDriver);
      if (!rows.length) {
        this.$buefy.snackbar.open({
          message: `Cap de les ${skipped} comandes seleccionades no es pot canviar a «${orderStatusLabel(this.newState)}»: ${reason}`,
          type: "is-warning",
          duration: 5000
        });
        return;
      }
      // an invoiced order stays on its invoice: ask first, as the form warns (issues/240)
      const invoiced = leavingInvoiced(rows, this.newState);
      if (invoiced.length && !confirmed) {
        this.$buefy.dialog.confirm({
          title: leavingInvoicedTitle(invoiced),
          message: leavingInvoicedMessage(invoiced, this.newState),
          confirmText: "Canvia l'estat",
          cancelText: "No, torna",
          type: "is-warning",
          onConfirm: () => this.setBulkState(null, true)
        });
        return;
      }
      this.importing = true;
      // a refused or failed row is reported, not left with the overlay on, and
      // the rest of the selection still goes through (issues/193)
      const failed = [];
      try {
        // Get current user for tracking
        const currentUser = await service({ requiresAuth: true }).get("users/me");

        const total = rows.length;
        let current = 0;

        for (const row of rows) {
          current++;
          this.$buefy.snackbar.open({
            message: `Processant comanda ${current}/${total}...`,
            type: "is-info",
            duration: 1500,
            queue: false
          });
          try {
            await service({ requiresAuth: true }).put(`orders/${row.id}`, {
              status: this.newState,
              _tracking_user: currentUser.data
            });
          } catch (error) {
            console.error(error);
            failed.push(row.id);
          }
        }

        const done = total - failed.length;
        const notes = [];
        if (failed.length) notes.push(`No s'han pogut canviar (sense permís o error): ${failed.map(id => `#${id}`).join(", ")}`);
        if (skipped) notes.push(`No s'han canviat les ${skipped} que no es podien canviar: ${reason}`);
        this.$buefy.snackbar.open({
          message: notes.length
            ? [`Comandes canviades: ${done}.`, ...notes].join(" ")
            : `Totes les comandes processades correctament (${total})`,
          type: failed.length ? "is-danger" : skipped ? "is-warning" : "is-success",
          duration: notes.length ? 8000 : 3000
        });
        this.checkedRows = this.checkedRows.filter(row => failed.includes(row.id));
      } catch (error) {
        console.error(error);
        this.$buefy.snackbar.open({ message: "No s'han pogut canviar les comandes", type: "is-danger", duration: 5000 });
      } finally {
        this.importing = false;
        this.getData();
      }
    },
    async invoiceOrders() {
      this.importing = true;

      await service({ requiresAuth: true })
        .post("orders/invoice", {
          orders: this.checkedRows.map(o => o.id)
        })
        .catch(error => {
          console.error(error);
          if (error && error.data && error.data.message) {
            this.$buefy.snackbar.open({
              message: error.data.message,
              type: "is-danger"
            });
          }
        });

      this.importing = false;

      this.checkedRows = [];
      this.getData();

    },
    async pdfOrders() {
      this.importing = true;

      try {
        const orders = this.checkedRows.filter(o => o.id && !o.is_collection_order).map(o => o.id);

        const pdf = (
          await service({ requiresAuth: true }).post(`/orders/pdf`, { orders })
        ).data;
        window.open(this.apiUrl + pdf.urls);
      } catch (error) {
        console.error(error);
        if (error && error.data && error.data.message) {
          this.$buefy.snackbar.open({
            message: error.data.message,
            type: "is-danger"
          });
        }
      }

      this.importing = false;
    },
    comandesCSVName() {
      return `orders-${moment().format("YYYYMMDD-HHmmss")}.ods`;
    },
    comandesRouterCSVName() {
      return `comandes-${moment().format("YYYYMMDD-HHmmss")}.csv`;
    },
    async downloadRouterCSV() {
      // Generate CSV with UTF-8 BOM for proper encoding in Excel
      const BOM = '\uFEFF';
      
      // Get headers from csvFieldsRouter
      const headers = Object.keys(this.csvFieldsRouter);
      
      // Generate CSV rows
      const rows = (await this.rowsToExport()).map(row => {
        return headers.map(header => {
          const fieldDef = this.csvFieldsRouter[header];
          let value = '';
          
          if (typeof fieldDef === 'string') {
            // Simple field path
            value = this.getNestedValue(row, fieldDef);
          } else if (typeof fieldDef === 'object' && fieldDef.field) {
            // Field with callback
            const rawValue = this.getNestedValue(row, fieldDef.field);
            value = fieldDef.callback ? fieldDef.callback(rawValue) : rawValue;
          }
          
          // Handle null/undefined
          if (value === null || value === undefined) {
            value = '';
          }
          
          // Convert to string and escape quotes
          value = String(value).replace(/"/g, '""');
          
          // Wrap in quotes if contains comma, newline, or quote
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            return `"${value}"`;
          }
          
          return value;
        }).join(',');
      });
      
      // Combine headers and rows
      const csvContent = BOM + headers.join(',') + '\n' + rows.join('\n');
      
      // Create Blob with UTF-8 encoding
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', this.comandesRouterCSVName());
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    getNestedValue(obj, path) {
      // Helper function to get nested property value
      return path.split('.').reduce((current, prop) => current?.[prop], obj);
    },
    // the numbers of the status tabs, in one request (issues/319, 324)
    async loadStatusCounts(baseWhere) {
      const ids = ["all", "pending", "processed", "delivered", "invoiced", "cancelled"];
      let data = {};
      try {
        data = (
          await service({ requiresAuth: true }).get(
            `orders/table/status-counts?${this.userFilter}&${baseWhere.join("&")}`
          )
        ).data || {};
      } catch (e) {
        // the tabs show no number
      }
      const counts = {};
      ids.forEach(id => { counts[id] = typeof data[id] === "number" ? data[id] : null; });
      this.statusCounts = counts;
    },
    refresh() {
      this.page = 1;
      this.setStatusFilter({ ctrlKey: false, metaKey: false });
    },
    debouncedRefresh() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.refresh(), 400);
    },
    setDate(value) {
      this.dateFilter = value ? moment(value).format("YYYY-MM-DD") : null;
      this.refresh();
    },
    shiftDate(days) {
      const from = this.dateFilter ? moment(this.dateFilter, "YYYY-MM-DD") : moment().startOf("day");
      this.setDate(from.add(this.dateFilter ? days : 0, "days").toDate());
    },
    formatDayShort(date) {
      return date ? moment(date).locale("ca").format("dd DD/MM/YYYY") : "";
    },
    formatDay(value) {
      return value ? moment(value, "YYYY-MM-DD").locale("ca").format("dd DD/MM") : "—";
    },
    // Buefy's dropdown emits `change` with the new selection before it updates
    // v-model, so the list must load from the value given (issues/311)
    setRoutes(list) {
      this.routeFilter = [...list];
      this.onRouteChange();
    },
    onRouteChange() {
      localStorage.setItem("OrdersTable.routeFilterId", JSON.stringify(this.routeFilter));
      this.checkedRows = [];
      this.refresh();
    },
    isChecked(order) {
      return this.checkedRows.includes(order);
    },
    toggleRow(order, on) {
      if (on && !this.isChecked(order)) this.checkedRows = [...this.checkedRows, order];
      if (!on) this.checkedRows = this.checkedRows.filter(o => o !== order);
    },
    toggleAll(on) {
      this.checkedRows = on ? [...this.theOrders] : [];
    },
    groupChecked(group) {
      return group.rows.length > 0 && group.rows.every(o => this.isChecked(o));
    },
    groupSomeChecked(group) {
      return !this.groupChecked(group) && group.rows.some(o => this.isChecked(o));
    },
    toggleGroup(group, on) {
      const others = this.checkedRows.filter(o => !group.rows.includes(o));
      this.checkedRows = on ? [...others, ...group.rows] : others;
    },
    toggleCollapsed(key) {
      this.collapsed = { ...this.collapsed, [key]: !this.collapsed[key] };
    },
    // only the user's own choice is kept (issues/306): the old value saved with
    // the filters on every load is ignored, so it falls back to no grouping
    restoreGroupBy() {
      try {
        const saved = JSON.parse(localStorage.getItem("OrdersTable.groupBy"));
        if (["route", "date", "owner", "none"].includes(saved)) this.groupBy = saved;
      } catch (e) {
        // default
      }
    },
    saveGroupBy() {
      this.collapsed = {};
      localStorage.setItem("OrdersTable.groupBy", JSON.stringify(this.groupBy));
    },
    // like the old list: orders of a coming week look lighter
    isFutureWeek(order) {
      if (!order.estimated_delivery_date) return false;
      const date = moment(order.estimated_delivery_date, ["YYYY-MM-DD", "YYYYMMDD"]);
      return date.isValid() && !date.isBefore(moment().startOf("isoWeek").add(1, "week"));
    },
    // a late order or pickup, or a -R with a late one (issues/315)
    isLate(order) {
      return !!(order && (order.late_order || order.late_pickup));
    },
    // Every mark of an order as one icon of «Senyals», alerts first (issues/315,
    // proposal C): the rows were grey (next week) or red (late), the price had
    // coloured dots and the point had tags, four ways to say things.
    signalsOf(order) {
      if (!order) return [];
      const cold = order.refrigerated || ((order.delivery_type && order.delivery_type.name) || "").toLowerCase().startsWith("refr");
      const surcharge = lateSurchargeOf(order);
      const incidences = Array.isArray(order.incidences) ? order.incidences : [];
      const open = incidences.filter(i => i.state !== "closed").length;
      return [
        incidences.length ? { key: "incidence", kind: open ? "is-alert" : "is-info", icon: "alert-circle-outline", label: open ? `${open} ${open === 1 ? "incidència oberta" : "incidències obertes"}` : `${incidences.length === 1 ? "Incidència tancada" : `${incidences.length} incidències tancades`}` } : null,
        order.late_order ? { key: "express", kind: "is-alert", icon: "flash", label: `Comanda express: informada fora de l'hora límit${surcharge ? ` (recàrrec +${formatNumber(surcharge, 2)} %)` : ""}` } : null,
        order.late_pickup ? { key: "late-pickup", kind: "is-alert", icon: "clock-alert-outline", label: order.is_collection_order ? "Inclou recollides informades tard" : "Recollida informada tard" } : null,
        this.isFutureWeek(order) ? { key: "next-week", kind: "is-next", icon: "calendar-arrow-right", label: "Entrega prevista una setmana vinent" } : null,
        cold ? { key: "cold", kind: "is-cold", icon: "snowflake", label: "Refrigerada" } : null,
        order.is_collection_order ? { key: "collection", kind: "is-info", icon: "package-variant-closed", label: "Comanda de recollida" } : null,
        order.transfer ? { key: "transfer", kind: "is-info", icon: "swap-horizontal", label: "Transferència" } : null,
        order.last_mile ? { key: "last-mile", kind: "is-info", icon: "truck-fast", label: "Última milla" } : null,
        order.fragile ? { key: "fragile", kind: "is-info", icon: "glass-wine", label: "Fràgil" } : null
      ].filter(Boolean);
    },
    // the changes to the rate behind the price, in words under it: the late
    // surcharge and the discounts (they were coloured dots, issues/315)
    discountsOf(order) {
      // from the fields, not from finalPrice ≠ price: +25 % and −20 % cancel out
      if (order.finalPrice === undefined || order.finalPrice === null) return [];
      const pct = v => `${formatNumber(v, 2)} %`;
      return [
        lateSurchargeOf(order) ? { key: "surcharge", text: `+${pct(order.late_surcharge)}`, title: `Recàrrec express (+${pct(order.late_surcharge)})` } : null,
        Number(order.multidelivery_discount) ? { key: "multidelivery", text: `−${pct(order.multidelivery_discount)}`, title: `Descompte multientrega (${pct(order.multidelivery_discount)})` } : null,
        Number(order.volume_discount) ? { key: "volume", text: `−${this.money(order.volume_discount)}`, title: `Descompte volum (${this.money(order.volume_discount)})` } : null,
        Number(order.contact_pickup_discount) ? { key: "pickup", text: `−${pct(order.contact_pickup_discount)}`, title: `Descompte recollida (${pct(order.contact_pickup_discount)})` } : null
      ].filter(Boolean);
    },
    statusLabel: orderStatusLabel,
    statusTag: orderStatusTag,
    sortBy(col) {
      if (this.sortField === col.sort) {
        this.sortOrder = this.sortOrder === "ASC" ? "DESC" : "ASC";
      } else {
        this.sortField = col.sort;
        this.sortOrder = col.num || col.date ? "DESC" : "ASC";
      }
      this.refresh();
    },
    cellClass(col) {
      return {
        "has-text-right": col.num,
        num: col.num,
        nowrap: col.date,
        "col-point": col.key === "contact.trade_name",
        "col-pickup": col.key === "pickup.name",
        "col-price": col.key === "price",
        "col-route": col.key === "route.name",
        "col-owner": col.key === "owner.fullname"
      };
    },
    clearColumnFilters() {
      Object.keys(this.filters).forEach(k => { this.filters[k] = ""; });
      this.refresh();
    },
    formatCount(value) {
      return formatNumber(Number(value) || 0, 0);
    },
    formatNum(value) {
      return formatNumber(Number(value) || 0, 2);
    },
    money(value) {
      return formatMoney(Number(value) || 0);
    },
    onPageChange(page) {
      this.page = page;
      this.setStatusFilter({ ctrlKey: false, metaKey: false });
    },
    onSort(field, order) {
      if (field === "idx") {
        field = "id";
      }
      this.sortField = field;
      this.sortOrder = order;
      this.setStatusFilter({ ctrlKey: false, metaKey: false });
    },
    onFiltersChange(filters) {
      this.filters = filters;
      this.setStatusFilter({ ctrlKey: false, metaKey: false });
    }
  }
};
</script>
<style scoped>
.orders-page :deep(.title-bar .actions) {
  flex-wrap: wrap;
}
.export-item {
  display: block;
  cursor: pointer;
}
.import-box {
  margin-bottom: 1rem;
}
.report-box-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: .75rem;
}
.report-box-head h2 {
  font-weight: 800;
}
.import-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.import-help {
  margin-top: .75rem;
  font-size: .8125rem;
  color: var(--a-muted);
}
.csv-errors ul {
  margin: .25rem 0 0 1rem;
  list-style: disc;
  font-size: .875rem;
}
.date-nav .filter-select :deep(.datepicker) {
  width: 8.75rem;
}
.date-nav {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
}
.filter-select.is-button {
  gap: .5rem;
  padding-right: .5rem;
  font: inherit;
  cursor: pointer;
}
.filter-select.is-button b {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--a-fg);
}
.route-check {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
  white-space: nowrap;
}
.filter-dropdown :deep(.dropdown-content) {
  max-height: 60vh;
  overflow-y: auto;
}
.status-tabs {
  margin-bottom: 1rem;
}
.status-tabs .count {
  margin-left: .25rem;
  font-size: .75rem;
  font-weight: 700;
  color: var(--a-muted);
}
.selection-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .625rem;
  margin-bottom: 1rem;
  padding: .625rem 1rem;
  border: 1px solid var(--a-accent);
  border-radius: 10px;
  background: var(--a-accent-soft);
  color: var(--a-accent-hover);
}
.selection-sums {
  font-variant-numeric: tabular-nums;
}
.selection-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-left: auto;
}
.orders-box {
  position: relative;
  padding: 0;
  overflow: hidden;
}
.orders-table {
  font-size: .8125rem;
}
.orders-table th,
.orders-table td {
  padding-left: .3125rem;
  padding-right: .3125rem;
}
.orders-table td.col-owner {
  max-width: 8rem;
}
.orders-table td.col-route {
  min-width: 7rem;
  max-width: 10rem;
}
.order-row.is-editing :deep(select),
.order-row.is-editing :deep(.select) {
  max-width: 10rem;
}
.order-row.is-editing :deep(input[type="number"]) {
  width: 4.5rem;
}
.orders-table th {
  white-space: nowrap;
}
.orders-table td {
  vertical-align: middle;
}
.col-check {
  width: 2.5rem;
}
.sort-head {
  display: inline-flex;
  align-items: center;
  gap: .125rem;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.sort-head:hover {
  color: var(--a-accent);
}
.filter-row th {
  padding-top: .5rem;
  padding-bottom: .5rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}
.col-filter {
  width: 100%;
  min-width: 3rem;
  height: 1.75rem;
  padding: 0 .375rem;
  border: 1px solid var(--a-input);
  border-radius: 6px;
  background: var(--a-surface);
  font: inherit;
  font-size: .75rem;
  color: var(--a-fg);
}
select.col-filter {
  max-width: 5.5rem;
}
.col-filter:focus {
  outline: none;
  border-color: var(--a-accent);
  box-shadow: 0 0 0 2px var(--a-focus);
}
.clear-filters {
  padding: 0;
  border: 0;
  background: none;
  color: var(--a-neg);
  cursor: pointer;
}
.order-row.is-editing td {
  background: var(--a-warn-bg);
  vertical-align: middle;
}
.order-row.is-editing :deep(.datepicker) {
  min-width: 7.5rem;
  max-width: 8.5rem;
}
.col-actions {
  white-space: nowrap;
}
.col-check :deep(.checkbox) {
  margin: 0;
}
.num {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.nowrap {
  white-space: nowrap;
}
.order-num {
  font-weight: 800;
}
.col-point b,
.col-point small,
.col-pickup span,
.col-pickup small,
.col-price b,
.col-price small {
  display: block;
}
.col-point {
  min-width: 9rem;
}
.edit-stack {
  display: flex;
  flex-direction: column;
  gap: .25rem;
}
.col-point small,
.col-pickup small,
.col-price small {
  font-size: .75rem;
  color: var(--a-muted);
}
.col-pickup small {
  white-space: nowrap;
}
.filter-bar :deep(.filter-select .select select) {
  max-width: 13rem;
}
.col-pickup small.is-deposited {
  color: var(--a-pos);
  font-weight: 700;
}
.group-row td {
  background: var(--a-thead);
}
.group-toggle {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--a-fg);
  font: inherit;
  cursor: pointer;
}
.group-meta {
  color: var(--a-muted);
}
.group-tag {
  margin-left: .5rem;
  height: 1.375rem;
  font-size: .6875rem;
}
.order-row.is-checked td {
  background: var(--a-accent-soft);
}
.order-row.is-cancelled td {
  color: var(--a-muted);
}
.order-row.is-cancelled td b {
  color: var(--a-muted);
  font-weight: 600;
}
.order-row.is-unsaved td {
  background: var(--a-warn-bg);
}
.col-actions {
  width: 4.5rem;
  text-align: right;
}
.col-actions .row-action + .row-action {
  margin-left: .375rem;
}
.row-action {
  color: var(--a-muted);
}
.row-action:hover {
  color: var(--a-accent);
}
.empty-row {
  padding: 2rem !important;
  text-align: center;
  color: var(--a-muted);
}
.orders-table tfoot td {
  border-top: 2px solid var(--a-line);
}
.orders-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: .75rem 1rem;
  border-top: 1px solid var(--a-line-soft);
  font-size: .875rem;
  color: var(--a-muted);
}
/* «Senyals»: every mark of an order as one icon, alerts in red (issues/315) */
.col-signals {
  width: 5.25rem;
}
.sort-head.is-static {
  cursor: default;
}
.signals {
  display: flex;
  flex-wrap: wrap;
  gap: .1875rem;
  width: 4.75rem;
}
.signal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 50%;
  flex: none;
}
.signal .icon {
  width: auto;
  height: auto;
}
.signal.is-alert {
  background: #C23B2E;
  color: #fff;
}
.signal.is-info {
  background: #E4E9E6;
  color: var(--a-fg);
}
.signal.is-cold {
  background: #E6F0FA;
  color: #1F5F99;
}
.signal.is-next {
  border: 1px dashed var(--a-muted);
  color: var(--a-muted);
}
.order-row.is-alert td:first-child {
  box-shadow: inset 4px 0 0 #C23B2E;
}
.price-mods {
  display: block;
  white-space: nowrap;
}
.price-mods .is-up {
  color: #A32D22;
  font-weight: 600;
}
.price-mods .is-down {
  color: var(--a-pos);
}
.legend {
  display: inline-flex;
  flex-wrap: wrap;
  gap: .75rem;
  font-size: .75rem;
}
.legend > span {
  display: inline-flex;
  align-items: center;
  gap: .3125rem;
}
.orders-foot > :last-child {
  margin-left: auto;
}
@media screen and (max-width: 768px) {
  .import-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
