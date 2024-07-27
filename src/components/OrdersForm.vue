<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full">
          <card-component class="tile is-child">
            <b-message
              v-if="firstStatus !== 'pending'"
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
               <b-field
                label="Proveïdora *"
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



              <b-field
                label="Punt d'entrega"
                horizontal
                :type="{ 'is-danger': errors['contact'] && submitted }"
                message="Cerca el punt d'entrega si ja existeix, o omple les dades a sota i guarda-la si és nou">
                <b-autocomplete
                  v-model="contactSearch"
                  placeholder="Punt d'entrega"
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredContacts"
                  field="display"
                  @select="contactChanged"                  
                  :disabled="!canEdit"
                  :clearable="true"
                >
                </b-autocomplete>
              </b-field>

              <b-field
                label="Raó social *"
                horizontal
                :type="{ 'is-danger': errors['contact_name'] && submitted }"
              >
                <b-input v-model="form.contact_name" :disabled="!canEdit" />
              </b-field>

              <b-field
                label="Nom comercial"
                horizontal                
              >
                <b-input v-model="form.contact_trade_name" :disabled="!canEdit" />
              </b-field>

              <b-field
                label="NIF"
                horizontal
                :type="{ 'is-danger': errors['contact_nif'] && submitted }"
              >
                <b-input v-model="form.contact_nif" :disabled="!canEdit" />
              </b-field>

              <b-field
                label="Forma jurídica *"
                horizontal
                :type="{
                  'is-danger': errors['contact_legal_form'] && submitted
                }"
                message="Per empresa entenem que no és client final sinó restauració, botigues, etc."
              >
                <div class="is-flex">
                  <button
                    class="button mr-2"
                    type="button"
                    v-for="(s, index) in legalForms"
                    :class="{
                      'is-warning': form.contact_legal_form === s.id,
                      'is-outlined': form.contact_legal_form !== s.id
                    }"
                    @click="form.contact_legal_form = s.id"
                    :disabled="!canEdit"
                  >
                    {{ s.name }}
                  </button>
                </div>
              </b-field>

              <b-field
                label="Adreça *"
                horizontal
                :type="{ 'is-danger': errors['contact_address'] && submitted }"
              >
                <b-input v-model="form.contact_address" :disabled="!canEdit" />
              </b-field>

              <b-field
                label="CP *"
                horizontal
                :type="{ 'is-danger': errors['contact_postcode'] && submitted }"
              >
                <b-input v-model="form.contact_postcode" :disabled="!canEdit" />
              </b-field> 


              <b-field
                label="Població *"
                horizontal
                :type="{ 'is-danger': errors['contact_city'] && submitted }"
                message="Cerca la població d'entrega. Si vols que ens aturem a una població que no apareix aquí, contacta amb La Diligència">
                <b-autocomplete
                  v-model="citySearch"
                  placeholder="Població d'entrega"
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredCities"
                  field="name"
                  @select="citySelected"                  
                  :disabled="!canEdit"
                  :clearable="true"
                >
                </b-autocomplete>
              </b-field>

              <b-field
                label="Telèfon *"
                horizontal
                :type="{ 'is-danger': errors['contact_phone'] && submitted }"
              >
                <b-input v-model="form.contact_phone" :disabled="!canEdit" />
              </b-field>

              <b-field
                label="Tram horari 1"
                horizontal
                message="Exemple: De 9 a 13h"
              >
                <b-field label="">
                  <b-select
                    v-model="form.contact_time_slot_1_ini"
                    placeholder=""
                    class="mr-3"
                    :disabled="!canEdit"
                  >
                    <option
                      v-for="(s, index) in contact_time_slots"
                      :key="index"
                      :value="s"
                    >
                      {{ s.toString().includes('.') ? s.toString().replace('.5','.30') : `${s}.00` }}
                    </option>
                  </b-select>

                  <b-select
                    v-model="form.contact_time_slot_1_end"
                    placeholder=""
                    :disabled="!canEdit"
                  >
                    <option
                      v-for="(s, index) in contact_time_slots"
                      :key="index"
                      :value="s"
                    >
                    {{ s.toString().includes('.') ? s.toString().replace('.5','.30') : `${s}.00` }}
                    </option>
                  </b-select>
                </b-field>
              </b-field> 

              <b-field label="Tram horari 2" horizontal message="i de 16 a 20h">
                <b-field label="">
                  <b-select
                    :disabled="!canEdit"
                    v-model="form.contact_time_slot_2_ini"
                    placeholder=""
                    class="mr-3"
                  >
                    <option
                      v-for="(s, index) in contact_time_slots"
                      :key="index"
                      :value="s"
                    >
                    {{ s.toString().includes('.') ? s.toString().replace('.5','.30') : `${s}.00` }}
                    </option>
                  </b-select>

                  <b-select
                    :disabled="!canEdit"
                    v-model="form.contact_time_slot_2_end"
                    placeholder=""
                  >
                    <option
                      v-for="(s, index) in contact_time_slots"
                      :key="index"
                      :value="s"
                    >
                    {{ s.toString().includes('.') ? s.toString().replace('.5','.30') : `${s}.00` }}
                    </option>
                  </b-select>
                </b-field>

                
              </b-field>

              <b-field horizontal message="Guarda ara el punt d'entrega si és nou o has fet canvis">
                <b-button
                  :disabled="!canEdit"
                  class="view-button is-primary zmb-3"
                  @click="saveClient"
                  title="Guardar "
                  >Guardar punt d'entrega
                </b-button>
              </b-field>

              <hr />

              <b-field
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
              </b-field>

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
                    :disabled="!permissions.includes('orders_admin')"
                  >
                    {{ s.name }}
                  </button>
                </div>
              </b-field>

              <b-field
                label="Data comanda *"
                horizontal
                :type="{ 'is-danger': errors['route_date'] && submitted }"
                message="Data de creació de la comanda"
              >
                <b-datepicker
                  :disabled="!permissions.includes('orders_admin')"
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


               <b-message
              v-if="dateWarningMessage"
              
              type="is-warning"
            >
              {{ dateWarningMessage }}
            </b-message>
              <b-field
                label="Data lliurament"
                horizontal
                message="Data en la que la comanda ha estat entregada"
              >
                <b-datepicker
                  :disabled="!permissions.includes('orders_admin')"
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
                label="Referència proveïdora"
                horizontal
                message="Si al teu ERP té un nom/codi de comanda concret, pots posar-lo aquí"
              >
                <b-input v-model="form.provider_order_number" />
              </b-field>

              <hr />

              <b-field
                label="Transport *"
                horizontal
                :type="{ 'is-danger': errors['delivery_type'] && submitted }"
                message="Transport normal o refrigerat"
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
                    :disabled="!canEdit"
                  >
                    {{ s.name }}
                  </button>
                </div>
              </b-field>
            
              <b-field
                label="Recollida comanda *"
                horizontal
                :type="{ 'is-danger': errors['pickup'] && submitted }"
                message="Si és el primer cop que ens demanes recollida en finca, contacta’ns abans per validar que hi podem passar. La recollida en finca té un sobrecost de 7,5€ (normal) o 8€ (refrigerat) per viatge a la finca independentment del nombre de comandes recollides que s'aplicarà a posteriori a la factura"
              >
                <div class="is-flex">
                  <button
                    class="button mr-2"
                    type="button"
                    v-for="(s, index) in pickups"
                    :class="{
                      'is-warning': form.pickup === s.id,
                      'is-outlined': form.pickup !== s.id
                    }"
                    @click="form.pickup = s.id"
                    :disabled="!canEdit"
                  >
                    {{ s.name }}
                  </button>
                </div>
              </b-field>

              <b-field
                label="Caixes *"
                horizontal
                message="Nombre de caixes"
                :type="{ 'is-danger': errors['units'] && submitted }"
              >
                <b-input
                  v-model="form.units"
                  type="number"
                  :disabled="!canEdit"
                />
              </b-field>

              <b-field
                :type="{ 'is-danger': errors['kilograms'] && submitted }"
                label="Kilograms *"
                horizontal
                message="Kilograms totals"
              >
                <b-input
                  v-model="form.kilograms"
                  type="number"
                  :disabled="!canEdit"
                />
              </b-field>

              <b-field
                label="Fràgil"
                horizontal
                message="Si la comanda és fràgil, marca aquesta casella"
              >
                <b-switch
                  v-model="form.fragile"
                  :disabled="!canEdit"
                ></b-switch>
              </b-field>

              <b-field
                label="Notes"
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

              <hr /> 

              <b-field label="Tarifa" horizontal class="line-notes mb-5">
                <span>{{ route_rate ? route_rate.name : "no trobada" }}</span>
              </b-field>

              <b-field label="Preu" horizontal class="line-notes mb-5">
                <money-format
                  class="has-text-left"
                  :value="route_price"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value="false"
                  :hide-subunits="false"
                >
                </money-format>
              </b-field>

              <hr />


              <b-field v-if="form.id" horizontal label="Albarà" message="Imprimeix l'albarà i enganxa'n un full a cada caixa. El teu albarà propi posa'l a dins d'una de les caixes">
                <b-button
                  type="is-primary"
                  :loading="isLoading"
                  @click="getPDF"
                  
                  >Imprimeix PDF</b-button
                >
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
import { assignRouteRate, assignRouteDate, checkIfDateIsValidInroute } from "@/service/assignRouteRate";

export default {
  name: "OrdersForm",
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat
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
      cities: [],
      cityRoutes: [],
      pickups: [],
      deliveryTypes: [],
      permissions: [],
      orders: [],
      firstStatus: "pending",
      statuses: [
        { id: "pending", name: "PENDENT" },
        { id: "processed", name: "PROCESSADA" },
        { id: "distributing", name: "EN REPARTIMENT" },
        { id: "delivered", name: "LLIURADA" },
        { id: "invoiced", name: "FACTURADA" },
        { id: "cancelled", name: "ANUL·LADA" }
      ],
      legalForms: [],      
      // array from 0 to 23 with 30 minutes intervals
      contact_time_slots: Array.from({ length: 48 }, (_, i) => i / 2),
      routeRates: [],
      contactSearch: "",
      citySearch: "",
      apiUrl: process.env.VUE_APP_API_URL,
      dateWarningMessage: ""
    };
  },
  computed: {
    ...mapState(["me"]),
    titleStack() {
      return ["Comandes", this.formCardTitle];
    },
    formCardTitle() {
      if (this.form.id) {
        return `Comanda #${this.form.id.toString().padStart(4, "0")}`;
      } else {
        return "Nova comanda";
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
          this.permissions.includes("orders_admin")) ||
        (this.form.status === "pending" &&
          !this.permissions.includes("orders_admin"))
      );
    },
    canEdit() {
      return (
        (this.form.id &&
          this.form.status !== "cancelled" &&
          this.permissions.includes("orders_admin")) ||
        (this.form.status === "pending" &&
          !this.permissions.includes("orders_admin")) ||
        !this.form.id
      );
    },
    canChangeRate() {
      // console.log('this.form.status', this.form.status)
      return ["pending"].includes(this.form.status);
    },
    errors() {
      return {
        owner: this.form.owner === null,
        route: this.form.route === null,
        contact: this.form.contact === null,
        delivery_date: this.form.delivery_date === null,
        delivery_type: this.form.delivery_type === null,
        pickup: this.form.pickup == null,
        units: this.form.units === null || this.form.units <= 0,
        contact_name:
          this.form.contact_name === null || this.form.contact_name === "",        
        //contact_nif:
          //this.form.contact_nif === null || this.form.contact_nif === "",
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
          this.form.contact_phone === null || this.form.contact_phone === "",
        kilograms:
          this.form.kilograms === null ||
          this.form.kilograms === "" ||
          this.form.kilograms < 0
      };
    },
    route_rate() {
      //console.log("route_rate");
      if (!this.canChangeRate) {
        return this.form.route_rate;
      }

      const v1 = this.form.units || 0;
      const v2 = this.form.kilograms || 0;
      const v3 = this.form || 0;
      const v4 = this.routeRates;
      const v5 = this.form.route;
      const v6 = this.form.owner;
      const v7 = this.orders;

      const rr = assignRouteRate(this.form, this.routeRates, this.orders);
      //console.log("rr", rr);
      this.form.route_rate = rr;
      return this.form.route_rate;
      if (
        !this.routeRates ||
        this.routeRates.length === 0 ||
        !this.form.route ||
        !this.form.pickup ||
        !this.form.delivery_type
      ) {
        return null;
      }

      let rates = this.routeRates.filter(
        r => (r.route && r.route.id === this.form.route) || r.route === null
      );
      rates = rates.filter(
        r => (r.pickup && r.pickup.id === this.form.pickup) || r.pickup === null
      );
      rates = rates.filter(
        r =>
          (r.delivery_type && r.delivery_type.id === this.form.delivery_type) ||
          r.delivery_type === null
      );
      if (rates.length > 1) {
        rates = rates.filter(r => r.route !== null);
      }
      if (rates.length === 0) {
        this.$buefy.snackbar.open({
          message: "Error. No s'ha trobat cap tarifa per aquesta ruta",
          queue: false
        });
        return null;
      } else if (rates.length > 1) {
        this.$buefy.snackbar.open({
          message: "Error. S'ha trobat més d'una tarifa per aquesta ruta",
          queue: false
        });

        console.warn("rates!!!", rates);
        this.form.route_rate = rates[0];
        return rates[0];
      } else {
        this.form.route_rate = rates[0];
        return rates[0];
      }
    },
    route_price() {
      if (!this.canChangeRate) {
        return this.form.price;
      }
      if (this.form.kilograms !== null && this.route_rate !== null) {
        const rate = this.route_rate;
        if (this.form.kilograms < 15) {
          this.form.price = rate.less15;
        } else if (this.form.kilograms < 30) {
          this.form.price = rate.less30;
        } else {
          this.form.price =
            rate.less30 + (this.form.kilograms - 30) * rate.additional30;
        }
      }
      return this.form.price;
    },
    filteredContacts() {
      return this.contacts.filter(option => {
        return (
          option.name
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
    const me = await service({ requiresAuth: true, cached: true }).get(
      "users/me"
    );
    this.permissions = me.data.permissions.map(p => p.permission);
    this.getData();
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
        contact_city: "",
        contact_city_id: null,
        contact_phone: "",
        contact_legal_form: 1,
        delivery_type: null,
        pickup: null,
        units: null,
        kilograms: null,
        routeFestives: [],
      };
    },
    async getData() {
      await this.getAuxiliarData();

      if (this.$route.params.id && this.$route.params.id > 0) {
        this.isLoading = true;
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
              this.normalizeIdsInForm("delivery_type");

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

              const me = await service({
                requiresAuth: true,
                cached: true
              }).get("users/me");
              if (
                !this.permissions.includes("orders_admin") &&
                this.form.owner !== me.data.id
              ) {
                this.$router.push({ name: "orders.view" });
              }

              await this.refreshClients(this.form.owner);

              const c = this.contacts.find(c => c.id === this.form.contact);
              this.contactSearch = `${this.form.contact} - ${c.name}`;

              if (this.cities.find(c => c.name === this.form.contact_city)) {
                this.citySearch = this.form.contact_city;
                this.form.contact_city_id = this.cities.find(c => c.name === this.form.contact_city).id;
                this.citySelected(this.cities.find(c => c.name === this.form.contact_city));
              }


              if (this.form.contact_legal_form) {
                this.form.contact_legal_form = this.form.contact_legal_form.id;
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

              this.isLoading = false;
            } else {
            }
          });
      } else {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        if (!this.permissions.includes("orders_admin")) {
          this.form.owner = me.data.id;
        }

        this.form.delivery_type = this.deliveryTypes[0].id;
        this.form.pickup = this.pickups[0].id;

        await this.refreshClients(me.data.id);
      }
    },
    normalizeIdsInForm(property) {
      if (this.form[property] && this.form[property].id) {
        this.form[property] = this.form[property].id;
      } else {
        this.form[property] = 0;
      }
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

      if (!permissions.includes("orders_admin")) {
        this.users = users.filter(u => u.id == me.data.id);
      } else {
        this.users = users;
        this.users = concat(
          { id: 0, fullname: "--", username: "--" },
          this.users
        );
      }

      if (!permissions.includes("orders_admin")) {
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
    },
    async changeOwner() {
      this.refreshClients(this.form.owner);

      this.changeRoute();
    },
    async changeRoute() {
      console.log('changeRoute', this.form.route)
      if (!this.form.route){
        console.log('changeRoute 2', this.form.contact_city)
      }
    
      if (this.form.owner && this.form.route) {
        this.orders = (
          await service({ requiresAuth: true }).get(
            `orders?_limit=-1&_where[status]=pending&_where[route]=${this.form.route}&_where[owner]=${this.form.owner}`
          )
        ).data;
      }
      if (this.form.route) {
        const route = this.routes.find(r => r.id === this.form.route);
        const routeDate = assignRouteDate(route)
        const nextDay = routeDate.nextDay
        this.form.estimated_delivery_date = nextDay.toDate();
        if (routeDate.warning) {          
          this.dateWarningMessage = routeDate.warning;
          this.$buefy.toast.open({
            message: routeDate.warning,
            type: "is-warning",            
          });
        } else {
          this.dateWarningMessage = "";
        }
      }
    },
    async checkEstimatedDeliveryDate() {
      const route = this.routes.find(r => r.id === this.form.route);
      const valid = checkIfDateIsValidInroute(route, moment(this.form.estimated_delivery_date), this.routeFestives)
      if (!valid) {
        this.dateWarningMessage = "Atenció! La data de lliurament no és vàlida per la ruta seleccionada"
      } else {
        this.dateWarningMessage = ""
      }
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
        console.log('dayOfWeek', dayOfWeek, route)
        let error = false
        if (dayOfWeek === 0 && !route.sunday) {
          error = "Error. La ruta seleccionada no es fa en diumenge"
        } else if (dayOfWeek === 1 && !route.monday) {
          error = "Error. La ruta seleccionada no es fa dilluns"
        } else if (dayOfWeek === 2 && !route.tuesday) {
          error = "Error. La ruta seleccionada no es fa dimarts"
        } else if (dayOfWeek === 3 && !route.wednesday) {
          error = "Error. La ruta seleccionada no es fa dimecres"
        } else if (dayOfWeek === 4 && !route.thursday) {
          error = "Error. La ruta seleccionada no es fa dijous"
        } else if (dayOfWeek === 5 && !route.friday) {
          error = "Error. La ruta seleccionada no es fa divendres"
        } else if (dayOfWeek === 6 && !route.saturday) {
          error = "Error. La ruta seleccionada no es fa dissabte"
        }

        if (error) {
          this.$buefy.snackbar.open({
            message: error,
            queue: false,
            type: "is-danger"
          });
          return false;
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

      console.log("this.form", this.form);
      if (this.form.status === "delivered" && !this.form.delivery_date) {
        this.form.delivery_date = new Date().toISOString().split("T")[0];
      }

      try {

        const routeValid = this.validateEstimateDateDayOfWeek()

        if (!routeValid) {
          this.isLoading = false;
          return
        }

        if (this.form.contact_time_slot_1_ini > this.form.contact_time_slot_1_end) {
          this.$buefy.snackbar.open({
            message: "Error. L'hora d'inici del tram horari 1 no pot ser més gran que l'hora de finalització",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (this.form.contact_time_slot_2_ini && this.form.contact_time_slot_2_ini > this.form.contact_time_slot_2_end) {
          this.$buefy.snackbar.open({
            message: "Error. L'hora d'inici del tram horari 2 no pot ser més gran que l'hora de finalització",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (this.form.contact_time_slot_1_ini && !this.form.contact_time_slot_1_end) {
          this.$buefy.snackbar.open({
            message: "Error. Cal indicar l'hora de finalització del tram horari 1",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        if (this.form.contact_time_slot_2_ini && this.form.contact_time_slot_2_ini && !this.form.contact_time_slot_1_end) {
          this.$buefy.snackbar.open({
            message: "Error. Cal indicar l'hora de finalització del tram horari 2",
            queue: false,
            type: "is-danger"
          });
          this.isLoading = false;
          return;
        }

        // "Error. El tram horari 1 ha de ser més gran de 3 hores",
        if (this.form.contact_time_slot_1_end - this.form.contact_time_slot_1_ini < 3 && (this.form.contact_time_slot_2_end && this.form.contact_time_slot_2_end - this.form.contact_time_slot_2_ini < 3)) {            
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
            !this.form.kilograms
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
            `orders/${this.form.id}`,
            this.form
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
            !this.form.kilograms
          ) {
            this.$buefy.snackbar.open({
              message: "Error. Falten alguns camps obligatòris",
              queue: false,
              type: "is-danger"
            });
            this.isLoading = false;
            return;
          }

          const newOrder = await service({ requiresAuth: true }).post(
            "orders",
            this.form
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
      console.log("contactChanged", option);
      if (option) {
        this.form.contact = option.id;
        this.onClientaChange(option.id);
      } else {
        this.form.contact = null;
      }
      // this.form.contact = option ? option.id
      // this.onClientaChange(this.form.contact);
    },
    async citySelected(option) {
      console.log("citySelected", option);
      if (!option || !option.id) {
        this.form.contact_city = null;
      } else {
        this.form.contact_city_id = option.id;
        this.form.contact_city = option.name;
      }      
      
      this.routes = this.validCityRoutes()
      if (this.routes.length > 0) {
        if (!this.form.route || this.routes.length === 1 || (this.form.route && !this.routes.find(r => r.id === this.form.route))) {
          this.form.route = this.routes[0].id
          this.changeRoute();
        }        
      } else {
        //this.form.route = null
      }
    },
    validCityRoutes() {
      return this.form.contact_city_id ? this.cityRoutes.filter(
        cr => cr.city && cr.route && cr.city.id && cr.city.id === this.form.contact_city_id && cr.route.active
      ).map(cr => cr.route) : [];
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
    addLine() {
      this.form.lines.push(this.getNewLine());
    },
    async saveClient() {
      if (this.form.contact) {
        if (
          !this.form.contact_name ||
          // !this.form.contact_nif ||
          !this.form.contact_address ||
          !this.form.contact_phone ||
          !this.form.contact_city ||
          !this.form.contact_postcode
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
          //!this.form.contact_nif ||
          !this.form.contact_address ||
          !this.form.contact_phone ||
          !this.form.contact_city ||
          !this.form.contact_postcode
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
        this.form.contact = newContact.data.id;

        this.$buefy.snackbar.open({
          message: "Punt d'entrega guardat",
          queue: false
        });
        await this.refreshClients(this.form.owner);
        this.contactSearch = `${newContact.data.id} - ${newContact.data.name}`;
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
      this.contacts = (
        await service({ requiresAuth: true, cached: false }).get(
          `contacts/basic?_limit=-1&_where[owner]=${owner}`
        )
      ).data.map(c => {
        return { ...c, display: `${c.id} - ${c.name}` };
      });

      if (!this.contacts.find(c => c.id === 0)) {
        // this.contacts = concat({ id: 0, name: "--" }, this.contacts);
      }
    },

    removeContactData() {
      console.log("removeContactData");
      this.form.contact = null;
      this.form.contact_name = "";
      this.form.contact_trade_name = "";
      this.form.contact_nif = "";
      this.form.contact_address = "";
      this.form.contact_postcode = "";
      this.form.contact_city = "";
      this.form.contact_phone = "";
      this.form.contact_legal_form = null;
      this.form.contact_time_slot_1_ini = null;
      this.form.contact_time_slot_1_end = null;
      this.form.contact_time_slot_2_ini = null;
      this.form.contact_time_slot_2_end = null;
      this.contactSearch = "";
    },
    async onClientaChange(id) {      
      console.log("onClientaChange", id);
      // this.form.contact = e.target.value;
      if (id) {
        const contact = this.contacts.find(
          c => c.id.toString() === id.toString()
        );

        this.form.contact_name = contact.name;
        this.form.contact_trade_name = contact.trade_name;
        this.form.contact_nif = contact.nif;
        this.form.contact_address = contact.address;
        this.form.contact_postcode = contact.postcode;
        this.form.contact_city = contact.city;
        this.citySearch = contact.city;

        console.log('this.cities', this.cities)
        console.log('contact.city', contact.city)
        
        if (this.cities.find(c => c.name === contact.city)) {
          this.form.contact_city_id = this.cities.find(c => c.name === contact.city).id;

          console.log('this.form.contact_city_id', this.form.contact_city_id)
          this.citySelected(this.cities.find(c => c.name === contact.city));
        }
        
        this.form.contact_phone = contact.phone;
        this.form.contact_legal_form = contact.legal_form
          ? contact.legal_form.id
          : 1;
        this.form.contact_time_slot_1_ini = contact.time_slot_1_ini;
        this.form.contact_time_slot_1_end = contact.time_slot_1_end;
        this.form.contact_time_slot_2_ini = contact.time_slot_2_ini;
        this.form.contact_time_slot_2_end = contact.time_slot_2_end;        
      } else {
        this.removeContactData();
      }
    },
    async getPDF() {
      const pdf = (
        await service({ requiresAuth: true }).get(
          `/orders/pdf/${this.form.id}`
        )
      ).data;
      for (const url of pdf.urls) {
        window.open(this.apiUrl + url);
      }
      
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
  .line-notes .control {width: 100%;}  
}
.line-notes textarea {
  width: 100%;
}
</style>
