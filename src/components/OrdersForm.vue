<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full">
          <card-component class="tile is-child">
            <form @submit.prevent="submit" v-if="!isLoading">
              <!-- <b-field label="Raó Social *" horizontal>
                <b-input v-model="form.name" placeholder="Raó Social del contacte" required />
              </b-field>
              <b-field label="NIF *" horizontal>
                <b-input v-model="form.nif" required />
              </b-field> -->
              <b-field label="Proveïdora" horizontal>
                <b-select v-model="form.owner" placeholder="" @input="changeOwner"">
                  <option
                    v-for="(s, index) in users"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.fullname }}
                  </option>
                </b-select>
              </b-field>

              <b-field label="Projecte" horizontal>
                <b-select v-model="form.project" placeholder="">
                  <option
                    v-for="(s, index) in projects"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>

              <b-field label="Producte" horizontal :message="form.product ? `Preu: ${products.find(p => p.id === form.product).base}€` : null">
                <b-select v-model="form.product" placeholder="">
                  <option
                    v-for="(s, index) in products"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
                
              </b-field>

              

              <b-field label="Clienta" horizontal>
                <b-select v-model="form.contact" placeholder="">
                  <option
                    v-for="(s, index) in contacts"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>

              <b-field label="Data" horizontal>
                <b-datepicker                
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

              <b-field label="Unitats" horizontal>
                <b-input v-model="form.units" type="number" />
              </b-field>

              <b-field label="Kilograms" horizontal>
                <b-input v-model="form.kilograms" type="number" />
              </b-field>

              <b-field label="Entrega" horizontal>
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


                <b-field label="Estat" horizontal>
                <b-select v-model="form.status" placeholder="">
                  <option
                    v-for="(s, index) in statuses"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>

              <hr />

              <b-field horizontal>
                <b-button type="is-primary" :loading="isLoading" @click="submit"
                  >Guardar</b-button
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
import sortBy from "lodash/sortBy";
import concat from "lodash/concat";

export default {
  name: "ProjectForm",
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
      projects: [],
      products: [],
      users: [],
      contacts: [],
      pickups: [],
      /*
      "pending",
        "processed",
        "delivered",
        "invoiced"
        */
      statuses: [{id: 'pending', name: 'Pendent'}, {id: 'processed', name: 'Processada'}, {id: 'delivered', name: 'Lliurada'}, {id: 'invoiced', name: 'Facturada'}],
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
  created() {
    this.getData();
  },
  methods: {
    getClearFormObject() {
      return {
        id: null,
        route_date: new Date,
        status: 'pending',
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
              this.normalizeIdsInForm("project");
              this.normalizeIdsInForm("product");
              this.normalizeIdsInForm("contact");
              this.normalizeIdsInForm("pickup");


              this.form.route_date = moment(
                this.form.route_date,
                "YYYY-MM-DD"
              ).toDate();


              this.contacts = (
                await service({ requiresAuth: true, cached: true }).get(
                  `contacts/basic?_limit=-1&_where[owner]=${this.form.owner}`
                )
              ).data;

              this.isLoading = false;
            } else {
              // this.$router.push({ name: "project.new" });
            }
          });
      } else {
        const me = await service({ requiresAuth: true, cached: true }).get("users/me")    
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
      this.projects = (
        await service({ requiresAuth: true, cached: true }).get(
          "projects/basic?_limit=-1"
        )
      ).data;
      const users = (
        await service({ requiresAuth: true, cached: true }).get(
          "users?_limit=-1"
        )
      ).data.filter(u =>
        u.permissions.map(p => p.permission).includes("orders")
      );
      this.users = concat({ id: 0, fullname: "--" }, users);
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
    },
    async changeOwner() {
      this.contacts = (
                await service({ requiresAuth: true, cached: true }).get(
                  `contacts/basic?_limit=-1&_where[owner]=${this.form.owner}`
                )
              ).data;
    },
    async submit() {
      this.isLoading = true;

      if (this.$route.query.user && this.$route.query.user === "true") {
        const me = await service({ requiresAuth: true, cached: true }).get(
          "users/me"
        );
        this.form.owner = me.data.id;
      }

      try {
        if (this.form.id) {
          if (
            !this.form.owner ||
            !this.form.product ||
            !this.form.project ||
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
          this.getData();
        } else {
          if (
            !this.form.owner ||
            !this.form.product ||
            !this.form.project ||
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

          const newProject = await service({ requiresAuth: true }).post(
            "orders",
            this.form
          );
          // console.log('newProject', newProject.data)
          this.$router.push({
            name: `orders.edit`,
            params: { id: newProject.data.id }
          });

          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          setTimeout(() => {
            this.isLoading = false;
          }, 100);
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
      delete option.projects;
      delete option.quotes;
      delete option.projectes;
      this.form.contact = option;
    },
    projectSelected(option) {
      if (!option || !option.id) {
        this.form.project = null;
      }
      this.form.project = option.id;
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
