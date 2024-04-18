<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full">
          <card-component class="tile is-child">
            <form @submit.prevent="submit(false)" v-if="!isLoading">
              
              <b-field label="Proveïdora *" horizontal>
                <b-select v-model="form.owner" placeholder="" @input="changeOwner"">
                  <option
                    v-for="(s, index) in users"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.fullname || s.username }}
                  </option>
                </b-select>
              </b-field>

              <b-field label="Ruta *" horizontal>
                <b-select v-model="form.route" placeholder="">
                  <option
                    v-for="(s, index) in routes"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>

              <b-field label="Estat" horizontal >
                <b-select v-model="form.status" placeholder="" :disabled="!permissions.includes('orders_admin')">
                  <option
                    v-for="(s, index) in statuses"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>

              <!-- <b-field label="Producte" horizontal :message="form.product ? `Preu: ${products.find(p => p.id === form.product).base}€` : null">
                <b-select v-model="form.product" placeholder="">
                  <option
                    v-for="(s, index) in products"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
                
              </b-field> -->

              <hr>
              
              <b-field label="Clienta *" horizontal>
                <b-select v-model="form.contact" placeholder="" @change.native="onClientaChange($event)">
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
                    class="view-button is-warning zmb-3"
                    @click="navNew"
                    icon-left="plus"
                    title="Nou Contacte"
                  >
                  </b-button>
                  <b-button
                    class="view-button is-warning zmb-3 ml-3"
                    @click="refreshClients"
                    icon-left="refresh"
                    title="Refrescar Contactes"
                  >
                  </b-button>
                  <b-button
                    class="view-button is-warning zmb-3 ml-3"
                    @click="removeContactData"
                    icon-left="close"
                    title="Esborrar dades"
                  >
                  </b-button>
                </div>
              </b-field>

              <b-field label="Adreça" horizontal>
                <b-input v-model="form.contact_address" />
              </b-field>

              <b-field label="CP" horizontal>
                <b-input v-model="form.contact_postcode" />
              </b-field>

              <b-field label="Localitat" horizontal>
                <b-input v-model="form.contact_city" />
              </b-field>

              <b-field label="Telèfon" horizontal>
                <b-input v-model="form.contact_phone" />
              </b-field>

              <b-field label="Tram horari 1" horizontal>
                <b-field label="">
                  <b-select v-model="form.contact_time_slot_1_ini" placeholder="" class="mr-3">
                      <option
                        v-for="(s, index) in contact_time_slots"
                        :key="index"
                        :value="s"
                      >
                        {{ s }}
                      </option>
                  </b-select>

                  <b-select v-model="form.contact_time_slot_1_end" placeholder="" >
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

              <b-field label="Tram horari 2" horizontal>
                <b-field label="">
                  <b-select v-model="form.contact_time_slot_2_ini" placeholder="" class="mr-3">
                      <option
                        v-for="(s, index) in contact_time_slots"
                        :key="index"
                        :value="s"
                      >
                        {{ s }}
                      </option>
                  </b-select>

                  <b-select v-model="form.contact_time_slot_2_end" placeholder="" >
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
              <hr>

              <b-field label="Data *" horizontal>
                <b-datepicker                
                :disabled="true"
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

              
              <b-field label="Transport *" horizontal>
                <b-select v-model="form.delivery_type" placeholder="">
                  <option
                    v-for="(s, index) in deliveryTypes"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>

              <b-field label="Entrega *" horizontal>
                <b-select v-model="form.pickup" placeholder="">
                  <option
                    v-for="(s, index) in pickups"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>

              <b-field label="Unitats *" horizontal>
                <b-input v-model="form.units" type="number" />
              </b-field>

              <b-field label="Kilograms *" horizontal>
                <b-input v-model="form.kilograms" type="number" />
              </b-field>


              <b-field
                  label="Notes"
                  horizontal
                  class="line-notes is-full-width mb-5"
                >
                  <b-input
                    type="textarea"
                    v-model="form.comments"
                    placeholder="Notes"
                  />
              </b-field>


                

              <hr />

                <b-field
                  label="Tarifa"
                  horizontal
                  class="line-notes mb-5"
                >
                {{ route_rate ? route_rate.name : 'no trobada' }}
              </b-field>

              <b-field
                  label="Preu"
                  horizontal
                  class="line-notes mb-5"
                >
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
                <b-button type="is-primary" :loading="isLoading" @click="submit(false)"
                  >Guardar</b-button
                >

                <b-button type="is-primary" :loading="isLoading" @click="submit(true)"
                  >Guardar i sortir</b-button
                >

                <b-button type="is-warning" :loading="isLoading" @click="exit"
                  >Sortir</b-button
                >

                <b-button type="is-danger" :loading="isLoading" @click="deleteOrder" v-if="canCancel"
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
      series: [],
      form: this.getClearFormObject(),
      routes: [],
      products: [],
      users: [],
      contacts: [],
      pickups: [],
      deliveryTypes: [],
      permissions: [],
      /*
      "pending",
      "processed",
      "delivered",
      "invoiced"
      */
      statuses: [{id: 'pending', name: 'Pendent'}, {id: 'processed', name: 'Processada'}, {id: 'delivered', name: 'Lliurada'}, {id: 'invoiced', name: 'Facturada'}, {id: 'cancelled', name: 'Cancelada'}],
      
      contact_time_slots: Array.from({length: 24}, (_, i) => i),
      routeRates: [],
    };
  },
  computed: {
    ...mapState(["me"]),
    titleStack() {
      return ["Comandes", this.formCardTitle];
    },
    formCardTitle() {
      if (this.form.id) {
        return `Comanda #${this.form.id.toString().padStart(4, '0')}`;
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
      return this.form.id && (this.form.status !== 'cancelled' && this.permissions.includes('orders_admin')) || (this.form.status === 'pending' && !this.permissions.includes('orders_admin'));
    },
    canChangeRate() {
      // console.log('this.form.status', this.form.status)
      return ['pending'].includes(this.form.status);
    },
    route_rate() {
      if (!this.canChangeRate) {
        return this.form.route_rate;
      }
      if (!this.routeRates || this.routeRates.length === 0 || !this.form.route || !this.form.pickup || !this.form.delivery_type) {
        return null;
      }
      
      let rates = this.routeRates.filter(r => (r.route && r.route.id === this.form.route) || r.route === null);
        rates = rates.filter(r => (r.pickup && r.pickup.id === this.form.pickup) || r.pickup === null);
        rates = rates.filter(r => (r.delivery_type && r.delivery_type.id === this.form.delivery_type) || r.delivery_type === null);
        if (rates.length > 1) {
          rates = rates.filter(r => r.route !== null);
        }
        if (rates.length === 0) {
          this.$buefy.snackbar.open({
              message:
                "Error. No s'ha trobat cap tarifa per aquesta ruta",
              queue: false,
            });
            return null
        }
        else if (rates.length > 1) {
          this.$buefy.snackbar.open({
              message:
                "Error. S'ha trobat més d'una tarifa per aquesta ruta",
              queue: false,
            });

          console.warn('rates!!!', rates)
          this.form.route_rate = rates[0];
          return rates[0]
        } else {
          this.form.route_rate = rates[0];
          return rates[0]
        }
    },
    route_price() {
      if (!this.canChangeRate) {
        return this.form.price;
      }
      if (this.form.kilograms !== null && this.route_rate !== null) {
        const rate = this.route_rate
        if (this.form.kilograms < 15) {
          this.form.price = rate.less15;
        } else if (this.form.kilograms < 30) {
          this.form.price = rate.less30;
        } else {
          this.form.price = rate.less30 + (this.form.kilograms - 30) * rate.additional30;
        }          
      }
      return this.form.price
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
    const me = await service({ requiresAuth: true, cached: true }).get("users/me");
    this.permissions = me.data.permissions.map(p => p.permission)
    this.getData();
  },
  methods: {
    getClearFormObject() {
      return {
        id: null,
        route_date: new Date,
        status: 'pending',
        owner: null,
        contact: null,
        contact_address: "",
        contact_postcode: "",
        contact_city: "",
        contact_phone: ""
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

              const me = await service({ requiresAuth: true, cached: true }).get("users/me");
              if (!this.permissions.includes("orders_admin") && this.form.owner !== me.data.id) {
                this.$router.push({ name: "orders.view" });
              }

              await this.refreshClients();

              await this.assignRouteRate();

              this.isLoading = false;
            } else {
              
            }
          });
      } else {
        const me = await service({ requiresAuth: true, cached: true }).get("users/me")    
        this.form.owner = me.data.id;
        
        this.contacts = (
                await service({ requiresAuth: true, cached: true }).get(
                  `contacts/basic?_limit=-1&_where[owner]=${me.data.id}`
                )
              ).data;
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

      const me = await service({ requiresAuth: true, cached: true }).get("users/me");
      const permissions = me.data.permissions.map(p => p.permission)
      
      if (!permissions.includes("orders_admin")) {
        this.users = users.filter(u => u.id == me.data.id);        
      } else {
        this.users = users
        this.users = concat({ id: 0, fullname: "--", username: "--" }, this.users);
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
    },
    async deleteOrder() {
      this.$buefy.dialog.confirm({
        message: "Estàs segura que vols anul·lar la comanda?",
        onConfirm: async () => {
          
          await service({ requiresAuth: true }).put(
            `orders/${this.form.id}`,
            { status: 'cancelled' }
          );
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

      if (this.permissions.includes("orders") && !this.form.owner) {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        this.form.owner = me.data.id;
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
      let routeData = this.$router.resolve({ name: "contacts.edit", params: { id: this.form.contact || 0 }, query: { user: true }});
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

    assignRouteRate() {
      
      if (this.form.route_rate === null) {
        let rates = this.routeRates.filter(r => (r.route && r.route.id === this.form.route) || r.route === null);
        rates = rates.filter(r => (r.pickup && r.pickup.id === this.form.pickup) || r.pickup === null);
        rates = rates.filter(r => (r.delivery_type && r.delivery_type.id === this.form.delivery_type) || r.delivery_type === null);
        if (rates.length > 1) {
          rates = rates.filter(r => r.route !== null);
        }
        if (rates.length === 0) {
          this.$buefy.snackbar.open({
              message:
                "Error. No s'ha trobat cap tarifa per aquesta ruta",
              queue: false,
            });
        }
        else if (rates.length > 1) {
          this.$buefy.snackbar.open({
              message:
                "Error. S'ha trobat més d'una tarifa per aquesta ruta",
              queue: false,
            });

          console.warn('rates!!!', rates)

          this.form.route_rate = rates[0];
        } else {
          this.form.route_rate = rates[0];
        }
        
      }      
    },
    removeContactData() {
      console.log('removeContactData')
      this.form.contact_address = "";
      this.form.contact_postcode = "";
      this.form.contact_city = "";
      this.form.contact_phone = "";
    },
    onClientaChange(e) {
      console.log('onClientaChange', e.target.value)
      // this.form.contact = e.target.value;      
      const contact = this.contacts.find(c => c.id.toString()  === e.target.value.toString());
      if (!this.form.contact_address || (this.form.contact_address && this.form.contact_address.trim() === '')) {
        this.form.contact_address = contact.address;        
      }
      if (!this.form.contact_postcode || (this.form.contact_postcode && this.form.contact_postcode.trim() === '')) {
        this.form.contact_postcode = contact.postcode;        
      }
      if (!this.form.contact_city || (this.form.contact_city && this.form.contact_city.trim() === '')) {
        this.form.contact_city = contact.city;        
      }
      if (!this.form.contact_phone || (this.form.contact_phone && this.form.contact_phone.trim() === '')) {
        this.form.contact_phone = contact.phone;        
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
