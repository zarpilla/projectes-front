<template>
  <section class="xsection">
    <b-loading
      :is-full-page="true"
      v-model="importing"
      :can-cancel="false"
    ></b-loading>

    <div class="is-flex is-block-mobile is-flex-wrap-wrap mb-3">
      <b-button
        class="view-button is-primary mb-3 ml-0 mr-3"
        @click="navNew"
        icon-left="plus"
      >
        Nova Comanda
      </b-button>
      <b-button
        class="view-button is-primary mb-3 ml-0"
        @click="navNewPickup"
        icon-left="plus"
      >
        Nova Comanda Punt de Recollida
      </b-button>
      <b-button
        class="zview-button is-warning mb-3 ml-auto is-hidden-mobile"
        @click="showExport = !showExport"
        icon-left="plus"
      >
        Importar comandes amb CSV
      </b-button>
    </div>

    <div class="is-flex" v-if="showExport">
      <file-upload
        class="mt-5 w-50"
        :multiple="false"
        entity="orders-imports"
        :ref-id="0"
        :field="'file'"
        :accept="'.csv'"
        @uploaded="uploaded($event, 'orders')"
        :pre-upload="preUpload"
        :message="`Crea comandes pujant arxiu CSV separat per comes`"
      >
      </file-upload>
      <file-upload
        class="mt-5 ml-4 w-50"
        :multiple="false"
        entity="orders-imports"
        :ref-id="0"
        :field="'file'"
        :accept="'.csv'"
        @uploaded="uploaded($event, 'contacts')"
        :pre-upload="preUpload"
        :message="`Crea punts d'entrega pujant arxiu CSV separat per comes`"
      >
      </file-upload>
    </div>

    <div class="is-flex mt-4">
      <span v-if="permissions.includes('orders_admin')">
        Exportar per a planificador:
      </span>

      <!-- <pre>{{ theOrdersChecked }}</pre> -->
      <download-excel
        v-if="permissions.includes('orders_admin')"
        class="export"
        :data="theOrdersChecked"
        :escapeCsv="false"
        :name="comandesRouterCSVName()"
        :fields="csvFieldsRouter"
      >
        <b-button
          title="Descarrega les dades de les teves comandes"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="download"
        />
      </download-excel>
      <span>
        Exportar comandes:
      </span>
      <download-excel
        class="export"
        :data="theOrdersChecked"
        type="csv"
        :escapeCsv="false"
        :name="comandesCSVName()"
        :fields="{
          id: 'id',
          date: 'route_date',
          ...csvFields
        }"
      >
        <b-button
          title="Descarrega les dades de les teves comandes"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="download"
        />
      </download-excel>
      <span v-if="permissions.includes('orders_admin')">
        Ecologística:
      </span>
      <download-excel
        v-if="permissions.includes('orders_admin')"
        class="export"
        :data="theOrdersChecked"
        name="ecologistica.xlsx"
        :fields="{
          ...csvEcologistica
        }"
      >
        <b-button
          title="Descarrega les dades de les teves comandes en format per a Ecologística"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="download"
        />
      </download-excel>

      <span class="ml-auto">
        Exemple de fitxer CSV de comandes:
      </span>
      <download-excel
        class="export"
        :data="csvExample"
        type="csv"
        :escapeCsv="false"
        name="exemple-comandes.csv"
        :fields="csvFields"
      >
        <b-button
          title="Descarrega exemple de fitxer CSV de comandes"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="file-delimited"
        />
      </download-excel>

      Exemple de fitxer CSV de punts d'entrega:
      <download-excel
        class="export"
        :data="csvExampleContacts"
        type="csv"
        :escapeCsv="false"
        name="exemple-contactes.csv"
        :fields="csvFieldsContacts"
      >
        <b-button
          title="Descarrega exemple de fitxer CSV de comandes"
          class="export-button mt-0 ml-1 mb-3"
          icon-left="file-delimited"
        />
      </download-excel>
    </div>

    <!-- <pre>{{ theOrders }}</pre> -->
    <h4>ESTATS</h4>
    <div class="filters">
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === '',
          'is-warning': statusFilter !== ''
        }"
        @click="setStatusFilter('')"
      >
        TOTES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === 'pending',
          'is-warning': statusFilter !== 'pending'
        }"
        @click="setStatusFilter('pending')"
      >
        PENDENTS
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === 'deposited',
          'is-warning': statusFilter !== 'deposited'
        }"
        @click="setStatusFilter('deposited')"
      >
        DEPOSITADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === 'processed',
          'is-warning': statusFilter !== 'processed'
        }"
        @click="setStatusFilter('processed')"
      >
        PROCESSADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === 'lastmile',
          'is-warning': statusFilter !== 'lastmile'
        }"
        @click="setStatusFilter('lastmile')"
      >
        ÚLTIMA MILLA
      </b-button>

      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === 'delivered',
          'is-warning': statusFilter !== 'delivered'
        }"
        @click="setStatusFilter('delivered')"
      >
        LLIURADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === 'invoiced',
          'is-warning': statusFilter !== 'invoiced'
        }"
        @click="setStatusFilter('invoiced')"
      >
        FACTURADES
      </b-button>
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': statusFilter === 'cancelled',
          'is-warning': statusFilter !== 'cancelled'
        }"
        @click="setStatusFilter('cancelled')"
      >
        ANUL·LADES
      </b-button>
    </div>
    <h4 v-if="permissions.includes('orders_admin')">RUTES</h4>
    <div class="filters" v-if="permissions.includes('orders_admin')">
      <b-button
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': routeFilter === 0,
          'is-warning': routeFilter !== 0
        }"
        @click="setRouteFilter(0)"
      >
        TOTES
      </b-button>
      <b-button
        v-for="route in routes"
        :key="route.id"
        class="view-button mb-3 mr-3 ml-0"
        :class="{
          'is-primary': routeFilter === route.id,
          'is-warning': routeFilter !== route.id
        }"
        @click="setRouteFilter(route.id)"
      >
        {{ route.name }}
      </b-button>
    </div>

    <pre class="mb-2" v-if="csvErrors.length">{{ csvErrors }}</pre>

    <!-- <pre>{{ theOrders }}</pre> -->

    <div class="mb-3">
      <div class="columns is-multiline ml-0 mt-4">
        <div class="column is-half">
          <div class="columns is-mobile bg-white-panel">
            <div class="column">
              <h2 class="pr-2">Núm.</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ checkedRows.length ? checkedRows.length + " de " : "" }}
                  {{ total }} (PÀG {{ this.page }}/{{
                    Math.ceil(total / perPage)
                  }})
                </b>
              </div>
            </div>
            <div class="column">
              <h2 class="pr-2">Unitats</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{
                    Math.ceil(total / perPage) > 1 && sumUnits > 0
                      ? "+de "
                      : ""
                  }}{{ sumUnits }}
                </b>
              </div>
            </div>
            <div class="column">
              <h2 class="pr-2">Kg</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{ Math.ceil(total / perPage) > 1 && sumKg > 0 ? "+de " : ""
                  }}{{ sumKg.toFixed(2) }}
                </b>
              </div>
            </div>
            <div class="column">
              <h2 class="pr-2">Preu</h2>
              <div class="is-flex">
                <b class="pt-2">
                  {{
                    Math.ceil(total / perPage) > 1 && sumPrice > 0
                      ? "+de "
                      : ""
                  }}{{ sumPrice.toFixed(2) }} €
                </b>
              </div>
            </div>
          </div>
        </div>
        <div class="column is-flex is-multiline">
          <div class="is-flex" v-if="permissions.includes('orders_admin')">
            <div>
              <h2>CANVIAR ESTAT</h2>
              <b-select v-model="newState" placeholder="">
                <option value="pending">PENDENT</option>
                <option value="deposited">DEPOSITADA</option>
                <option value="processed">PROCESSADA</option>
                <option value="lastmile">ÚLTIMA MILLA</option>
                <option value="delivered">LLIURADA</option>
                <option value="cancelled">ANUL·LADA</option>
              </b-select>
            </div>
            <button
              class="button is-primary ml-3 mt-5"
              :disabled="!newState || !checkedRows.length"
              @click="setBulkState"
            >
              CANVIAR ESTAT
            </button>
          </div>
          <div class="is-flex" v-else>
            <div>
              <h2>CANVIAR ESTAT</h2>
              <b-select v-model="newState" placeholder="">
                <option value="pending">PENDENT</option>
                <option value="deposited">DEPOSITADA</option>
              </b-select>
            </div>
            <button
              class="button is-primary ml-3 mr-3 mt-5"
              :disabled="!newState || !checkedRows.length"
              @click="setBulkState"
            >
              CANVIAR ESTAT
            </button>
          </div>
          <div class="ml-5">
            <h2 class="pr-2">ALBARÀ</h2>
            <div class="is-flex">
              <button
                class="button is-primary zml-3"
                :disabled="!checkedRows.length"
                @click="pdfOrders"
              >
                Imprimeix PDF
              </button>
            </div>
          </div>
        </div>
        <div class="column is-flex">
          <div class="ml-auto mt-2">
            <b-select
              v-model="perPage"
              @input="setStatusFilter(statusFilter)"
              v-if="total > 100"
            >
              <option value="100">100 per pàg.</option>
              <option value="200">200 per pàg.</option>
              <option value="1000">1000 per pàg.</option>
            </b-select>
          </div>
        </div>
      </div>
    </div>

    <b-table
      ref="table"
      :loading="isLoading"
      paginated
      backend-pagination
      :total="total"
      :per-page="perPage"
      @page-change="onPageChange"
      backend-filtering
      @filters-change="onFiltersChange"
      pagination-position="both"
      backend-sorting
      :default-sort-direction="defaultSortOrder"
      :default-sort="[sortField, sortOrder]"
      @sort="onSort"
      :striped="false"
      :data="theOrders"
      :checked-rows.sync="checkedRows"
      :is-row-checkable="row => true"
      :debounce-search="500"
      :checkable="true || permissions.includes('orders_admin')"
      :row-class="rowClassFn"
    >
      <b-table-column label="ID" field="idx" sortable v-slot="props" searchable>
        <router-link
          v-if="props.row.id"
          :to="{ name: 'orders.edit', params: { id: props.row.id } }"
        >
          {{ props.row.id.toString().padStart(4, "0") }}
        </router-link>
        <div v-else>
          <button
            class="button is-danger zbutton-small"
            @click="createCSVOrder(props.row)"
          >
            NOVA
          </button>
        </div>
      </b-table-column>
      <b-table-column
        label="Proveïdora"
        field="owner.fullname"
        sortable
        searchable
        v-slot="props"
      >
        {{ props.row.owner.fullname }}
      </b-table-column>
      <b-table-column
        label="Ruta"
        searchable
        field="route.name"
        sortable
        v-slot="props"
      >
        {{ props.row.route.name }}
      </b-table-column>
      <b-table-column
        label="Creada"
        searchable
        field="route_date"
        sortable
        v-slot="props"
      >
        {{ props.row.route_date }}
      </b-table-column>
      <b-table-column
        label="Prevista"
        searchable
        field="estimated_delivery_date"
        sortable
        v-slot="props"
      >
        {{ props.row.estimated_delivery_date }}
      </b-table-column>
      <b-table-column
        label="Lliurada"
        searchable
        field="delivery_date"
        sortable
        v-slot="props"
      >
        {{ props.row.delivery_date }}
      </b-table-column>
      <b-table-column
        label="Punt d'entrega"
        searchable
        field="contact.trade_name"
        sortable
        v-slot="props"
      >
        {{
          props.row.contact
            ? props.row.contact.trade_name
            : props.row.contact_name
        }}
      </b-table-column>
      <b-table-column
        label="Unitats"
        field="units"
        sortable
        searchable
        number
        v-slot="props"
      >
        {{ props.row.units }}
      </b-table-column>
      <b-table-column
        label="Kg"
        field="kilograms"
        sortable
        searchable
        number
        v-slot="props"
      >
        {{ props.row.kilograms }}
      </b-table-column>
      <b-table-column
        label="Entrega"
        searchable
        field="delivery_type.name"
        sortable
        v-slot="props"
      >
        {{ props.row.delivery_type ? props.row.delivery_type.name : "-" }}
      </b-table-column>
      <b-table-column
        label="Recollida"
        searchable
        field="pickup.name"
        sortable
        v-slot="props"
      >
        {{ props.row.pickup ? props.row.pickup.name : "-" }}
      </b-table-column>
      <b-table-column
        label="Última milla"
        searchable
        field="last_mile_display"
        sortable
        v-slot="props"
      >
        {{ props.row.last_mile_display }}
      </b-table-column>
      <b-table-column
        label="Preu"
        field="price"
        sortable
        searchable
        v-slot="props"
      >
        <div class="is-flex">
          <money-format
            v-if="props.row.finalPrice"
            class="has-text-left"
            :value="props.row.finalPrice"
            :locale="'es'"
            :currency-code="'EUR'"
            :subunits-value="false"
            :hide-subunits="false"
          >
          </money-format>
          <span v-else>?</span>
          <b-icon
            v-if="
              props.row.finalPrice !== props.row.price &&
                props.row.multidelivery_discount
            "
            icon="circle"
            class="has-text-success"
            custom-size="default"
            title="Descompte multientrega"
          />
          <b-icon
            v-if="
              props.row.finalPrice !== props.row.price &&
                props.row.volume_discount
            "
            icon="circle"
            class="has-text-grey-light"
            custom-size="default"
            title="Descompte volum"
          />
          <b-icon
            v-if="
              props.row.finalPrice !== props.row.price &&
                props.row.contact_pickup_discount
            "
            icon="circle"
            class="has-text-warning"
            custom-size="default"
            title="Descompte recollida"
          />
        </div>
      </b-table-column>
      <b-table-column
        label="Estat"
        field="status"
        sortable
        searchable
        v-slot="props"
      >
        <span
          v-if="props.row.status === 'pending'"
          class="tag is-warning bg-pending"
          >PENDENT</span
        >
        <span
          v-else-if="props.row.status === 'deposited'"
          class="tag is-warning bg-deposited"
          >DEPOSITADA</span
        >
        <span
          v-else-if="props.row.status === 'invoiced'"
          class="tag is-success bg-invoiced"
          >FACTURADA</span
        >
        <span
          v-else-if="props.row.status === 'delivered'"
          class="tag is-success"
          >LLIURADA</span
        >
        <span
          v-else-if="props.row.status === 'processed'"
          class="tag is-warning"
          >PROCESSADA</span
        >
        <span
          v-else-if="props.row.status === 'lastmile'"
          class="tag is-info bg-distributing"
          >ÚLTIMA MILLA</span
        >
        <span v-else-if="props.row.status === 'cancelled'" class="tag is-danger"
          >ANUL·LADA</span
        >
        <span v-else class="tag is-info">{{ props.row.status }}</span>
      </b-table-column>

      <!-- <b-table-column
        label="Correu"
        field="email"
        sortable
        v-slot="props"
      >
        {{ props.row.email }}
      </b-table-column>       -->
    </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import { parse } from "csv-parse";
import { mapState } from "vuex";
import FileUpload from "@/components/FileUpload.vue";
import MoneyFormat from "@/components/MoneyFormat.vue";
import {
  assignRouteRate,
  assignRouteDate,
  calculateRoutePrice
} from "@/service/assignRouteRate";
import moment from "moment";
import _ from "lodash";
import { filter } from "lodash";
import { sum } from "lodash";

export default {
  name: "Tresoreria",
  components: {
    FileUpload,
    MoneyFormat
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
      statusFilter: "pending",
      routeFilter: 0,
      csvOptions: {
        delimiter: ",",
        columns: true
      },
      importing: false,
      permissions: [],
      routes: [],
      users: [],
      deliveryTypes: [],
      pickups: [],
      routerates: [],
      checkedRows: [],
      newState: null,
      total: 0,
      sortField: "route_date",
      sortOrder: "DESC",
      defaultSortOrder: "DESC",
      page: 1,
      perPage: 100,
      filters: {},
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
          callback: value => {
            return value ? 1 : 0;
          }
        },
        fragile: "fragile",
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
        "ID CLIENT": "fullName"
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
        "dropoff.address": {
          field: "contact_address",
          callback: value => {
            return this.addressFormatted(value);
          }
        },
        "dropoff.address.description": "contact_legal_form.name",
        "dropoff.address.name": "contact_name",
        "dropoff.address.telephone": "contact_phone",
        "dropoff.comments": {
          field: "comments",
          callback: value => {
            return this.addressFormatted(value);
          }
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
      apiUrl: process.env.VUE_APP_API_URL,
      showExport: false
    };
  },
  computed: {
    ...mapState(["userName"]),
    ...mapState(["userId"]),
    theOrders() {
      this.orders = this.orders.map(o => ({
        ...o,
        commentsNotes:
          (o.contact && o.contact.notes ? o.contact.notes + " - " : "") +
          (o.comments ? o.comments : "") +
          (o.comments && o.refrigerated ? " - " : "") +
          (o.refrigerated ? "REFRIGERAT" : "")
      }));

      const orders = this.orders.filter(o => {
        if (this.statusFilter === "") {
          return true;
        } else {
          return o.status === this.statusFilter || o.status === "CSV";
        }
      });

      return orders.filter(o => {
        if (this.routeFilter === 0) {
          return true;
        } else {
          return (
            o &&
            o.route &&
            o.route.name ===
              this.routes.find(r => r.id === this.routeFilter).name
          );
        }
      });
    },
    theOrdersChecked() {
      return this.checkedRows.length
        ? this.theOrders.filter(o =>
            this.checkedRows.map(c => c.id).includes(o.id)
          )
        : this.theOrders;
    },
    sumUnits() {
      return this.checkedRows.length
        ? _.sumBy(this.checkedRows, "units") || 0
        : _.sumBy(this.theOrders, "units") || 0;
    },
    sumKg() {
      return this.checkedRows.length
        ? _.sumBy(this.checkedRows, "kilograms") || 0
        : _.sumBy(this.theOrders, "kilograms") || 0;
    },
    sumPrice() {
      return this.checkedRows.length
        ? _.sumBy(this.checkedRows, "finalPrice") || 0
        : _.sumBy(this.theOrders, "finalPrice") || 0;
    }
  },
  async created() {
    if (localStorage.getItem("OrdersTable.statusFilter")) {
      this.statusFilter = localStorage.getItem("OrdersTable.statusFilter");
    }
    if (localStorage.getItem("OrdersTable.routeFilterId")) {
      this.routeFilter = parseInt(
        localStorage.getItem("OrdersTable.routeFilterId")
      );
    }
    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    this.permissions = me.data.permissions.map(p => p.permission);
  },
  async mounted() {
    this.getData();
  },
  methods: {
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
    async setStatusFilter(status) {
      localStorage.setItem("OrdersTable.statusFilter", status);

      const where = [];
      console.log("status", status);
      if (status === "") {
      } else if (status !== "lastmile") {
        where.push(`_where[status]=${status}`);
        //} else if (status !== "last_mile_display") {
      } else {
        where.push(`_where[last_mile]=true`);
      }

      console.log("this.filters", this.filters);

      for (const key in this.filters) {
        if (this.filters[key]) {
          const value = this.filters[key].trim();
          if (this.filters[key] === "") {
            continue;
          }
          const comparison = key.includes("date") ? "_eq" : "_contains";
          if (key.includes("date")) {
            if (value.length === 4 || value.length === 5) {
              // format YYYY-
              const start = `${value.substring(0, 4)}-01-01`;
              const end = `$value.substring(0, 4)}-12-31`;
              where.push(`_where[${key}_gte]=${start}`);
              where.push(`_where[${key}_lte]=${end}`);
            } else if (
              value.length === 7 ||
              value.length === 8 ||
              value.length < 10
            ) {
              // format YYYY-MM
              const start = `${value.substring(0, 7)}-01`;
              const month = new Date(value.substring(0, 7)).getMonth();
              const endDayOfMonth = new Date(
                new Date().getFullYear(),
                month + 1,
                0
              ).getDate();
              const end = `${value.substring(0, 7)}-${endDayOfMonth}`;
              where.push(`_where[${key}_gte]=${start}`);
              where.push(`_where[${key}_lte]=${end}`);
            } else if (value.length === 10) {
              // format YYYY-MM-DD
              where.push(`_where[${key}${comparison}]=${value}`);
            }
          } else if (key === "idx") {
            // remove zeros at start
            const id_contains = value.replace(/^0+/, "");
            where.push(`_where[id_contains]=${id_contains}`);
          } else if (key === "idx") {
            // remove zeros at start
            const id_contains = value.replace(/^0+/, "");
            where.push(`_where[id_contains]=${id_contains}`);
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

      if (this.routeFilter !== 0) {
        where.push(`_where[route.id]=${this.routeFilter}`);
      }

      this.orders = (
        await service({ requiresAuth: true }).get(
          `orders?_limit=${this.perPage}&_start=${(this.page - 1) *
            this.perPage}&_sort=${this.sortField}:${this.sortOrder}${
            this.userFilter
          }&${where.join("&")}`
        )
      ).data;

      this.total = (
        await service({ requiresAuth: true }).get(
          `orders/count?${this.userFilter}&${where.join("&")}`
        )
      ).data;

      this.orders = this.orders.map(o => {
        return {
          ...o,
          idx: o.id.toString().padStart(4, "0"),
          route_name: o.route.name,
          owner_id: o.owner.id,
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
      });

      this.statusFilter = status;
      this.checkedRows = [];
    },
    setRouteFilter(route) {
      localStorage.setItem("OrdersTable.routeFilterId", route);
      this.routeFilter = route;
      this.checkedRows = [];
      this.setStatusFilter(this.statusFilter);
    },
    navNew() {
      const q = this.$route.meta.userContacts ? `?user=true` : "";
      this.$router.push("/order/0" + q);
    },
    navNewPickup() {
      this.$router.push("/order/0?pickup_point=true");
    },
    async getData() {
      this.isLoading = true;

      const me = await service({ requiresAuth: true, cached: true }).get(
        "users/me"
      );
      this.me = me.data;
      if (me.data.permissions.map(p => p.permission).includes("orders_admin")) {
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

      this.users = (
        await service({ requiresAuth: true, cached: true }).get(
          "users?_limit=-1"
        )
      ).data.filter(u =>
        u.permissions.map(p => p.permission).includes("orders")
      );

      if (me.data.permissions.map(p => p.permission).includes("orders_admin")) {
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

      this.setStatusFilter(this.statusFilter);

      // console.log("this.orders", this.orders);

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
      console.log("uploaded", e);
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
        const reader = new FileReader();
        reader.onload = async e => {
          if (!continueImport) {
            return;
          }
          const text = e.target.result;
          this.csv = text;
          const records = await this.readCSV(text);
          if (fileType === "orders") {
            await this.importCSV(records);
          } else {
            await this.importContactsCSV(records);
          }
          this.importing = false;
        };

        reader.readAsText(file);
      }
    },
    removeAccents(name) {
      return name
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

      // console.log("records", records);

      const owner = this.permissions.includes("orders_admin")
        ? this.users.find(
            u => u.id.toString() === records[0].owner_id.toString()
          )
        : this.me;

      // console.log("owner", owner);
      const contacts = await this.getContactsForImport(owner.id);

      // console.log("contacts", contacts);

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

        if (!contact.legal_form) {
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
        if (!record.kilograms || parseInt(record.kilograms) <= 0) {
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

        const routeDate = assignRouteDate(route);

        const order = {
          id: 0,
          route_date: new Date().toISOString().split("T")[0],
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
          pickup: record.pickup
            ? this.pickups.find(
                p => p.id.toString() === record.pickup.toString()
              )
            : this.pickups[0],
          kilograms: Math.abs(parseInt(record.kilograms)),
          units: Math.abs(parseInt(record.units)),
          notes: record.notes,
          comments: record.notes,
          owner: this.permissions.includes("orders_admin")
            ? this.users.find(
                u => u.id.toString() === record.owner_id.toString()
              )
            : this.me,
          route: route,
          estimated_delivery_date: record.estimated_delivery_date
            ? moment(record.estimated_delivery_date, "YYYYMMDD").format(
                "YYYY-MM-DD"
              )
            : moment(routeDate.nextDay.toDate()).format("YYYY-MM-DD"),
          price: null,
          status: "CSV",
          _uuid: this.createUUID()
        };

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

        // console.log("assignRouteRate");
        // console.log("order", order);
        // console.log("routeRates", this.routeRates);
        // console.log("orders", this.orders);

        const orderWithRate = {
          ...order,
          route_rate: assignRouteRate(order, this.routeRates, this.orders)
        };
        orderWithRate.price = orderWithRate.route_rate.price;

        if (order.kilograms !== null && orderWithRate.route_rate) {
          const rate = orderWithRate.route_rate;
          orderWithRate.price = calculateRoutePrice(rate, order.kilograms, 0);
        } else {
          // console.warn("!order", order.kilograms, order.route_rate);
        }
        this.orders.unshift(orderWithRate);
        // this.orders.unshift(order);
      }
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
            console.log("record");
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
          this.permissions.includes("orders_admin")
        ) {
          record.owner_id = this.me.id;
          record.multiowner = true;
        } else {
          record.multiowner = false;
          if (!this.permissions.includes("orders_admin")) {
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
          postcode: record.contact_postcode,
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
      if (content.substring(0, 10).includes(";")) {
        this.csvOptions.delimiter = ";";
      }
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
      const { data } = await service({ requiresAuth: true }).post(
        "orders/csv",
        order
      );

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
        this.orders[orderToUpdate].status = data.status;
      }
    },
    addressFormatted(address) {
      return '"' + address + '"';
    },
    phoneFormatted(phone) {
      let ret = phone.replace(/\s/g, "");
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
    async setBulkState() {
      this.importing = true;
      for await (const row of this.checkedRows) {
        await service({ requiresAuth: true }).put(`orders/${row.id}`, {
          status: this.newState
        });
      }
      this.checkedRows = [];
      this.importing = false;
      this.getData();
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

      //console.log("response", response);
    },
    async pdfOrders() {
      this.importing = true;

      try {
        const orders = this.checkedRows.map(o => o.id);

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
      return `orders-${moment().format("YYYYMMDD-HHmmss")}.csv`;
    },
    comandesRouterCSVName() {
      return `comandes-${moment().format("YYYYMMDD-HHmmss")}.xlsx`;
    },
    onPageChange(page) {
      this.page = page;
      this.setStatusFilter(this.statusFilter);
    },
    onSort(field, order) {
      if (field === "idx") {
        field = "id";
      }
      this.sortField = field;
      this.sortOrder = order;
      this.setStatusFilter(this.statusFilter);
    },
    onFiltersChange(filters) {
      console.log("filters", filters);
      this.filters = filters;
      this.setStatusFilter(this.statusFilter);
    }
  }
};
</script>
<style>
.button.button-small {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: 20px;
  max-height: 24px;
}
/* Highlight future week orders */
.future-week-row {
  background-color: #fafafa !important;
  opacity: 0.5;
}
.tag.bg-invoiced {
  background-color: grey !important;
  color: white !important;
}
.tag.bg-pending {
  background-color: #c9b460 !important;
  color: white !important;
}
.tag.bg-deposited {
  background-color: green !important;
  color: white !important;
}
.tag.bg-distributing {
  background-color: #ff7300 !important;
  color: white !important;
}
.w-50 {
  width: 50%;
}
.ml-auto {
  margin-left: auto;
}
.mr-mobile-3 {
  @media screen and (max-width: 768px) {
    margin-right: 1rem !important;
  }
}
.bg-white-panel {
  background-color: white !important;
  border: 1px solid rgb(219, 219, 219) !important;
  border-radius: 4px;
}
</style>
