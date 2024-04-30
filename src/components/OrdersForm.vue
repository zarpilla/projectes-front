<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full">          
          <card-component class="tile is-child">
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
                <div class="is-flex">
                  <button
                    class="button mr-2"
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
                label="Data Entrega"
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
                label="Clienta *"
                horizontal
                :type="{ 'is-danger': errors['contact'] && submitted }"
                message="Dades de la clienta per l'entrega"
              >
                <b-select
                  :disabled="!canEdit"
                  v-model="form.contact"
                  placeholder=""
                  @change.native="onClientaChange($event)"
                >
                  <option
                    v-for="(s, index) in contacts"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.id }} - {{ s.name }}
                  </option>
                </b-select>

                <div class="is-flex">
                  <b-button
                    :disabled="!canEdit"
                    class="view-button is-warning zmb-3"
                    @click="navNew"
                    icon-left="plus"
                    title="Nou Contacte"
                  >
                  </b-button>
                  <b-button
                    :disabled="!canEdit"
                    class="view-button is-warning zmb-3 ml-3"
                    @click="refreshClients"
                    icon-left="refresh"
                    title="Refrescar Contactes"
                  >
                  </b-button>
                  <b-button
                    :disabled="!canEdit"
                    class="view-button is-warning zmb-3 ml-3"
                    @click="removeContactData"
                    icon-left="close"
                    title="Esborrar dades"
                  >
                  </b-button>
                </div>
              </b-field>

              <b-field label="Nom" horizontal>
                <b-input v-model="form.contact_name" :disabled="!canEdit" />
              </b-field>

              <b-field label="NIF" horizontal>
                <b-input v-model="form.contact_nif" :disabled="!canEdit" />
              </b-field>

              <b-field label="Adreça" horizontal>
                <b-input v-model="form.contact_address" :disabled="!canEdit" />
              </b-field>

              <b-field label="CP" horizontal>
                <b-input v-model="form.contact_postcode" :disabled="!canEdit" />
              </b-field>

              <b-field label="Localitat" horizontal>
                <b-input v-model="form.contact_city" :disabled="!canEdit" />
              </b-field>

              <b-field label="Telèfon" horizontal>
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
                      {{ s }}
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
                      {{ s }}
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
                      {{ s }}
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
                      {{ s }}
                    </option>
                  </b-select>
                </b-field>
              </b-field>
              <hr />

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

                <!-- <b-select v-model="form.delivery_type" placeholder="">
                  <option
                    v-for="(s, index) in deliveryTypes"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select> -->
              </b-field>

              <b-field
                label="Recollida comanda *"
                horizontal
                :type="{ 'is-danger': errors['pickup'] && submitted }"
                message="Si és el primer cop que ens demanes recollida en finca, contacta’ns abans per validar que hi podem passar"
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
                />
              </b-field>

              <hr />

              <b-field label="Tarifa" horizontal class="line-notes mb-5">
                {{ route_rate ? route_rate.name : "no trobada" }}
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

              <b-field horizontal>
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
import assignRouteRate from "@/service/assignRouteRate";

export default {
  name: "OrderForm",
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
      pickups: [],
      deliveryTypes: [],
      permissions: [],
      orders: [],
      statuses: [
        { id: "pending", name: "Pendent" },
        { id: "processed", name: "Processada" },
        { id: "delivered", name: "Lliurada" },
        { id: "invoiced", name: "Facturada" },
        { id: "cancelled", name: "Cancelada" }
      ],

      contact_time_slots: Array.from({ length: 24 }, (_, i) => i),
      routeRates: []
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
          !this.permissions.includes("orders_admin")) ||
        !this.form.id
      );
    },
    canEdit() {
      return this.canCancel;
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
        kilograms:
          this.form.kilograms === null ||
          this.form.kilograms === "" ||
          this.form.kilograms < 0
      };
    },
    route_rate() {
      console.log("route_rate");
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
      console.log("rr", rr);
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
        delivery_date: null,
        status: "pending",
        owner: null,
        route: null,
        contact: null,
        contact_address: "",
        contact_postcode: "",
        contact_city: "",
        contact_phone: "",
        delivery_type: null,
        pickup: null,
        units: null,
        kilograms: null
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

              await this.refreshClients();

              this.orders = (
                await service({ requiresAuth: true }).get(
                  `orders?_limit=-1&_where[status]=pending&_where[route]=${this.form.route}&_where[owner]=${this.form.owner}`
                )
              ).data;

              console.log("this.orders", this.orders);

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
        // this.form.owner = me.data.id;

        this.form.delivery_type = this.deliveryTypes[0].id;
        this.form.pickup = this.pickups[0].id;

        this.contacts = (
          await service({ requiresAuth: true, cached: true }).get(
            `contacts/basic?_limit=-1&_where[owner]=${me.data.id}`
          )
        ).data;

        // this.contacts.unshift({ id: 0, name: '--' })
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
      this.routes = (
        await service({ requiresAuth: true, cached: true }).get(
          "routes?_limit=-1"
        )
      ).data;
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
    },
    async changeOwner() {
      this.contacts = (
        await service({ requiresAuth: true, cached: true }).get(
          `contacts/basic?_limit=-1&_where[owner]=${this.form.owner}`
        )
      ).data;

      this.changeRoute()
    },
    async changeRoute() {
      if (this.form.owner && this.form.route) {
        this.orders = (
          await service({ requiresAuth: true }).get(
            `orders?_limit=-1&_where[status]=pending&_where[route]=${this.form.route}&_where[owner]=${this.form.owner}`
          )
        ).data;
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
    async submit(exit) {
      this.isLoading = true;
      this.submitted = true;

      if (this.permissions.includes("orders") && !this.form.owner) {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        this.form.owner = me.data.id;
      }

      console.log("this.form", this.form.status, this.form.delivery_date);
      if (this.form.status === "delivered" && !this.form.delivery_date) {
        this.form.delivery_date = new Date().toISOString().split("T")[0];
      }

      try {
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
              queue: false
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
              queue: false
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
    navNew() {
      let routeData = this.$router.resolve({
        name: "contacts.edit",
        params: { id: this.form.contact || 0 },
        query: { user: true }
      });
      window.open(routeData.href, "_blank");
    },
    async refreshClients() {
      this.contacts = (
        await service({ requiresAuth: true, cached: false }).get(
          `contacts/basic?_limit=-1&_where[owner]=${this.form.owner}`
        )
      ).data;

      this.contacts = concat({ id: 0, name: "--" }, this.contacts);
    },

    // async assignRouteRate() {
    //   if (this.form.route_rate === null) {
    //     let rates = this.routeRates.filter(
    //       r => (r.route && r.route.id === this.form.route) || r.route === null
    //     );

    //     if (this.form.pickup && this.form.pickup.pickup) {
    //       const orders = await service({ requiresAuth: true }).get(
    //         `orders?_limit=-1&_where[status]=pending&_where[route]=${this.form.route}&_where[owner]=${this.form.owner}`
    //       );

    //       const pendingOrders = orders.filter(
    //         o =>
    //           o.route.id === this.form.route.id &&
    //           o.owner.id === this.form.owner.id &&
    //           o.status === "pending"
    //       );
    //       console.log("pendingOrders", pendingOrders);
    //       if (pendingOrders.length > 0) {
    //         // We have pending orders for this route and owner
    //         // Add your logic here
    //         console.log(
    //           "We have pending orders for this route and owner, applying NO PICKUP",
    //           pendingOrders
    //         );

    //         rates = rates.filter(
    //           r =>
    //             (r.pickup && this.form.pickup && r.pickup.id === 1) ||
    //             r.pickup === null
    //         );
    //       } else {
    //         // No pending orders for this route and owner
    //         // Add your logic here
    //         console.log("No pending orders for this route and owner");

    //         rates = rates.filter(
    //           r =>
    //             (r.pickup &&
    //               this.form.pickup &&
    //               r.pickup.id === this.form.pickup.id) ||
    //             r.pickup === null
    //         );
    //       }
    //     } else {
    //       rates = rates.filter(
    //         r =>
    //           (r.pickup && this.form.pickup && r.pickup.id === 1) ||
    //           r.pickup === null
    //       );
    //     }

    //     rates = rates.filter(
    //       r =>
    //         (r.pickup && r.pickup.id === this.form.pickup) || r.pickup === null
    //     );
    //     rates = rates.filter(
    //       r =>
    //         (r.delivery_type &&
    //           r.delivery_type.id === this.form.delivery_type) ||
    //         r.delivery_type === null
    //     );
    //     if (rates.length > 1) {
    //       rates = rates.filter(r => r.route !== null);
    //     }
    //     if (rates.length === 0) {
    //       this.$buefy.snackbar.open({
    //         message: "Error. No s'ha trobat cap tarifa per aquesta ruta",
    //         queue: false
    //       });
    //     } else if (rates.length > 1) {
    //       this.$buefy.snackbar.open({
    //         message: "Error. S'ha trobat més d'una tarifa per aquesta ruta",
    //         queue: false
    //       });

    //       console.warn("rates!!!", rates);

    //       this.form.route_rate = rates[0];
    //     } else {
    //       this.form.route_rate = rates[0];
    //     }
    //   }
    // },
    removeContactData() {
      console.log("removeContactData");
      this.form.contact = null;
      this.form.contact_name = "";
      this.form.contact_nif = "";
      this.form.contact_address = "";
      this.form.contact_postcode = "";
      this.form.contact_city = "";
      this.form.contact_phone = "";
      this.form.contact_time_slot_1_ini = null;
      this.form.contact_time_slot_1_end = null;
      this.form.contact_time_slot_2_ini = null;
      this.form.contact_time_slot_2_end = null;
    },
    async onClientaChange(e) {
      // console.log("onClientaChange", e.target.value);
      // this.form.contact = e.target.value;
      const contact = this.contacts.find(
        c => c.id.toString() === e.target.value.toString()
      );
      if (
        !this.form.contact_name ||
        (this.form.contact_name && this.form.contact_name.trim() === "")
      ) {
        this.form.contact_name = contact.name;
      }
      if (
        !this.form.contact_nif ||
        (this.form.contact_nif && this.form.contact_nif.trim() === "")
      ) {
        this.form.contact_nif = contact.nif;
      }
      if (
        !this.form.contact_address ||
        (this.form.contact_address && this.form.contact_address.trim() === "")
      ) {
        this.form.contact_address = contact.address;
      }
      if (
        !this.form.contact_postcode ||
        (this.form.contact_postcode && this.form.contact_postcode.trim() === "")
      ) {
        this.form.contact_postcode = contact.postcode;
      }
      if (
        !this.form.contact_city ||
        (this.form.contact_city && this.form.contact_city.trim() === "")
      ) {
        this.form.contact_city = contact.city;
      }
      if (
        !this.form.contact_phone ||
        (this.form.contact_phone && this.form.contact_phone.trim() === "")
      ) {
        this.form.contact_phone = contact.phone;
      }
      if (!this.form.contact_time_slot_1_ini) {
        this.form.contact_time_slot_1_ini = contact.time_slot_1_ini;
      }
      if (!this.form.contact_time_slot_1_end) {
        this.form.contact_time_slot_1_end = contact.time_slot_1_end;
      }
      if (!this.form.contact_time_slot_2_ini) {
        this.form.contact_time_slot_2_ini = contact.time_slot_2_ini;
      }
      if (!this.form.contact_time_slot_2_end) {
        this.form.contact_time_slot_2_end = contact.time_slot_2_end;
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
.line-notes textarea {
  width: 100%;
}
</style>
