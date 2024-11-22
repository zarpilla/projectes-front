<template>
  <div>
    <title-bar :title-stack="titleStack" v-if="!modal" />
    <section :class="!modal ? 'section is-main-section' : 'z'">
      <div class="columns">
        <div class="column is-full">
          <card-component class="tile is-child" :css="!modal ? 'card' : 'z'">
            <form @submit.prevent="submit" v-if="!isLoading">
              <b-field label="Nom comercial *" horizontal :type="{ 'is-danger': errors['trade_name'] && submitted }">
                <b-input v-model="form.trade_name" required />
              </b-field>


              <b-field label="Sector *" horizontal>
                <div class="is-flex is-flex-wrap-wrap">
                  <div
                    v-for="(sector, index) in sectors"
                    :key="index"
                  >
                    <b-button
                      @click="form.sector = sector.id"
                      :class="{
                        'is-warning': form.sector === sector.id,
                        'is-outlined': form.sector !== sector.id,
                        'is-danger': errors['sector'] && submitted
                      }"
                      class="mr-2 mb-1"
                      >{{ sector.name }}</b-button
                    >
                  </div>
                </div>
              </b-field>

              <b-field
                label="Contacte de *"
                horizontal
                v-if="isOrdersContactAndUserIsOrdersAdmin"
                :type="{ 'is-danger': errors['owner'] && submitted }"
              >
                <b-select
                  v-model="form.owner"
                  placeholder=""
                  :disabled="ownerId"
                  @input="onOwnerChanged"
                >
                  <option
                    v-for="(s, index) in usersWithOrdersPermissions"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.fullname || s.username }} ({{
                      s.username === "TOTES" ? "0" : s.id
                    }})
                  </option>
                </b-select>
              </b-field>
              <b-field label="NIF *" horizontal :type="{ 'is-danger': errors['nif'] && submitted }">
                <b-input v-model="form.nif" />
                <b-button
                  type="button"
                  class="button is-warning is-small ml-2"
                  @click="generateNIF"
                  title="Generar NIF inventat"
                  :disabled="form.nif !== ''"
                  >
                  <b-icon icon="refresh" />
                </b-button>
              </b-field>
              <b-field label="Telèfon *" horizontal :type="{ 'is-danger': errors['phone'] && submitted }">
                <b-input v-model="form.phone" required />
              </b-field>
              <b-field label="Adreça *" horizontal :type="{ 'is-danger': errors['address'] && submitted }">
                <b-input v-model="form.address" required type="text" />
              </b-field>
              <b-field label="CP *" horizontal :type="{ 'is-danger': errors['postcode'] && submitted }">
                <b-input v-model="form.postcode" required />
              </b-field>
              <b-field
                label="Població *"
                horizontal
                message="Si vols que ens aturem a una població que no apareix aquí, contacta amb La Diligència"
                :type="{ 'is-danger': errors['city'] && submitted }"
              >
                <b-autocomplete
                  v-model="citySearch"
                  placeholder="Cerca la població d'entrega"
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredCities"
                  field="name"
                  @select="citySelected"
                  :clearable="true"
                >
                </b-autocomplete>
              </b-field>
              <b-field label="Provincia" horizontal>
                <b-input v-model="form.state" />
              </b-field>
              <b-field label="País" horizontal>
                <b-input v-model="form.country" />
              </b-field>
              
              <b-field label="Horari de contacte 1 *" horizontal>
                <b-field label="">
                  <b-select
                    v-model="form.time_slot_1_ini"
                    placeholder=""
                    class="mr-3"
                  >
                    <option
                      v-for="(s, index) in contact_time_slots"
                      :key="index"
                      :value="s"
                    >
                      {{
                        s.toString().includes(".")
                          ? s
                              .toString()
                              .replace(".5", ".30")
                              .replace(".25", ".15")
                              .replace(".75", ".45")
                          : `${s}.00`
                      }}
                    </option>
                  </b-select>

                  <b-select v-model="form.time_slot_1_end" placeholder="">
                    <option
                      v-for="(s, index) in contact_time_slots"
                      :key="index"
                      :value="s"
                    >
                      {{
                        s.toString().includes(".")
                          ? s
                              .toString()
                              .replace(".5", ".30")
                              .replace(".25", ".15")
                              .replace(".75", ".45")
                          : `${s}.00`
                      }}
                    </option>
                  </b-select>
                </b-field>
              </b-field>

              <b-field label="Horari de contacte 2 *" horizontal>
                <b-field label="">
                  <b-select
                    v-model="form.time_slot_2_ini"
                    placeholder=""
                    class="mr-3"
                  >
                    <option
                      v-for="(s, index) in contact_time_slots"
                      :key="index"
                      :value="s"
                    >
                      {{
                        s.toString().includes(".")
                          ? s
                              .toString()
                              .replace(".5", ".30")
                              .replace(".25", ".15")
                              .replace(".75", ".45")
                          : `${s}.00`
                      }}
                    </option>
                  </b-select>

                  <b-select v-model="form.time_slot_2_end" placeholder="">
                    <option
                      v-for="(s, index) in contact_time_slots"
                      :key="index"
                      :value="s"
                    >
                      {{
                        s.toString().includes(".")
                          ? s
                              .toString()
                              .replace(".5", ".30")
                              .replace(".25", ".15")
                              .replace(".75", ".45")
                          : `${s}.00`
                      }}
                    </option>
                  </b-select>
                </b-field>
              </b-field>


              <b-field
                label="Notes"
                horizontal
                class="line-notes is-full-width mb-5"
              >
                <b-input
                  type="textarea"
                  v-model="form.notes"
                  placeholder="Notes, observacions, comentaris... "
                />
              </b-field>

              <b-field label="Raó Social" horizontal>
                <b-input
                  v-model="form.name"                  
                  required
                />
              </b-field>
              <b-field label="Email" horizontal>
                <b-input v-model="form.email" />
              </b-field>
              <b-field label="Persona de contacte" horizontal>
                <b-input v-model="form.contact_person" />
              </b-field>
              <b-field label="Telèfon de contacte" horizontal>
                <b-input v-model="form.contact_phone" />
              </b-field>
              <!-- <b-field
                label="Email de contacte"
                horizontal
              >
                <b-input v-model="form.contact_email" />
              </b-field> -->
              <b-field label="Web" horizontal>
                <b-input v-model="form.website" />
              </b-field>
              <!-- <b-field label="Forma jurídica" horizontal>
                <b-select v-model="form.legal_form" placeholder="">
                  <option
                    v-for="(s, index) in legalForms"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field> -->

              <hr />
              <b-field
                horizontal
                v-if="!form.multiowner || permissions.includes('orders_admin') || forceCanEdit"
              >
              
                <div class="is-flex" v-if="!modal">
                  <b-button
                    type="is-primary"
                    class="mr-2"
                    :loading="isLoading"
                    @click="submit"
                    >Guardar</b-button
                  >
                  <b-button
                    type="is-primary"
                    v-if="!form.multiowner || permissions.includes('orders_admin')"
                    :loading="isLoading"
                    @click="submitExit"
                    >Guardar i sortir</b-button
                  >
                  <b-button
                    v-if="form.id && !form.multiowner || permissions.includes('orders_admin')"
                    type="is-danger"
                    class="ml-auto"
                    :loading="isLoading"
                    @click="deleteContact"
                    >Esborrar</b-button
                  >
                </div>
                <div class="is-flex" v-else>
                  <b-button
                    class="mr-2"
                    :loading="isLoading"
                    @click="emitCancel"
                    >Cancel·lar</b-button
                  >
                  <b-button
                    type="is-primary"
                    v-if="canEdit || forceCanEdit"
                    :loading="isLoading"                    
                    @click="submitAndEmitConfirm"
                    >Guardar</b-button
                  >
                </div>
              </b-field>
            </form>
          </card-component>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import service from "@/service/index";
import MoneyFormat from "@/components/MoneyFormat.vue";
import moment from "moment";
import concat from "lodash/concat";

export default {
  name: "ContactUsersForm",
  components: {
    CardComponent,
    TitleBar,
    MoneyFormat
  },
  props: {
    id: {
      type: [String, Number],
      default: null
    },
    modal: {
      type: Boolean,
      default: false
    },
    ownerId: {
      type: Number,
      default: null
    },
    canEdit: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      isProfileExists: false,
      isLoading: false,
      series: [],
      form: this.getClearFormObject(),
      legalForms: [],
      sectors: [],
      users: [],
      usersWithOrdersPermissions: [],
      contact_time_slots: Array.from({ length: 96 }, (_, i) => i / 4),
      contactTypes: [],
      permissions: [],
      me: {},
      citySearch: "",
      cities: [],
      submitted: false,
      forceCanEdit: false
    };
  },
  computed: {
    titleStack() {
      return ["Punts d'entrega", this.formCardTitle];
    },
    formCardTitle() {
      if (this.form.id) {
        return this.form.name;
      } else {
        return "Nou";
      }
    },
    transitionName() {
      if (this.useTransition) {
        return "fade";
      }
      return "x";
    },
    isOrdersContactAndUserIsOrdersAdmin() {
      return (
        this.form.owner !== null && this.permissions.includes("orders_admin")
      );
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
    errors() {
      return {
        trade_name: !this.form.trade_name,
        nif: !this.form.nif,
        phone: !this.form.phone,
        address: !this.form.address,
        city: !this.form.city,
        sector: !this.form.sector,
        postcode: !this.form.postcode,
        owner: !this.form.owner        
      };
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
  created() {
    if (this.ownerId) {
      this.form.owner = this.ownerId;
    }
    this.getData();
  },
  methods: {
    getClearFormObject() {
      return {
        id: null,
        name: null,
        legal_form: null,
        sector: null,
        contact_types: [4],
        nif: ''
      };
    },
    async getData() {
      const me = await service({ requiresAuth: true, cached: true }).get(
        "users/me"
      );
      this.me = me.data;

      this.permissions = me.data.permissions.map(p => p.permission);

      this.form.contact_types = [4];
      if (!this.permissions.includes("orders_admin")) {
        this.form.owner = me.data.id;        
      }

      await this.getAuxiliarData();

      const id = !this.modal && this.$route.params.id && this.$route.params.id > 0 ? this.$route.params.id : (this.id ? this.id : 0);

      if (id > 0) {
        this.isLoading = true;
        service({ requiresAuth: true })
          .get(`contacts/${id}`)
          .then(async r => {
            if (r.data && r.data.id) {
              this.isProfileExists = true;
              this.form = r.data;

              delete this.form.quotes;
              delete this.form.projects;
              delete this.form.projectes;

              if (
                this.form.users_permissions_user &&
                this.form.users_permissions_user.id
              ) {
                this.form.users_permissions_user = this.form.users_permissions_user.id;
              } else {
                this.form.users_permissions_user = 0;
              }

              if (this.form.legal_form && this.form.legal_form.id) {
                this.form.legal_form = this.form.legal_form.id;
              } else {
                this.form.legal_form = 0;
              }

              // form.sector
              if (this.form.sector && this.form.sector.id) {
                this.form.sector = this.form.sector.id;
              } else {
                this.form.sector = 0;
              }

              this.form.contact_types = this.form.contact_types.map(c => c.id);

              if (this.form.owner && this.form.owner.id) {
                this.form.owner = this.form.owner.id;
              } else {
                this.form.owner = 0;
                if (
                  this.$route.query.user &&
                  this.$route.query.user === "true"
                ) {
                  this.form.owner = me.data.id;
                }
              }

              // citySearch
              if (this.form.city) {
                this.citySearch = this.form.city;
              }

              if (this.form.followup_date) {
                this.form.followup_date = moment(
                  this.form.followup_date,
                  "YYYY-MM-DD"
                ).toDate();
              }

              // get orders
              const contactsWithOrders = 
                (await service({ requiresAuth: true }).get(
                  `contacts/withorders?_limit=-1&_sort=name:ASC&contact_id=${this.form.id}`
                )).data;

              if (contactsWithOrders.length > 0 && contactsWithOrders[0].can_edit === true) {
                this.forceCanEdit = true                
              } 

              this.isLoading = false;
            } else {
              this.$router.push({ name: "project.new" });
            }
          });
      } else {
        if (
          this.$route.query.user &&
          this.$route.query.user === "true" &&
          this.permissions.includes("orders_admin")
        ) {
          this.form.multiowner = true;
        } else {
          this.form.multiowner = false;
        }
      }
    },
    async getAuxiliarData() {
      this.legalForms = (
        await service({ requiresAuth: true }).get("legal-forms")
      ).data;
      this.legalForms = concat({ id: 0, name: "--" }, this.legalForms);
      this.sectors = (
        await service({ requiresAuth: true }).get("sectors")
      ).data;
      const users = (await service({ requiresAuth: true }).get("users")).data;

      this.usersWithOrdersPermissions = users.filter(u =>
        u.permissions.map(p => p.permission).includes("orders")
      );
      this.usersWithOrdersPermissions = concat(
        { id: this.me.id, username: "TOTES" },
        this.usersWithOrdersPermissions
      );

      this.users = concat({ id: 0, username: "--" }, users);
      this.contactTypes = (
        await service({ requiresAuth: true }).get("contact-types")
      ).data;

      this.cities = (
        await service({ requiresAuth: true }).get("cities?_limit=-1&_sort=name")
      ).data;
    },
    async submitExit() {
      await this.submit();
      this.redirectToView();
    },
    async submitAndEmitConfirm() {
      await this.submit();      
    },
    redirectToView() {
      if (this.permissions.includes("orders")) {
        this.$router.push({ name: "user-contacts.view" });
      } else {
        if (this.form.owner) {
          this.$router.push({ name: "user-contacts.view" });
        } else {
          this.$router.push({ name: "contactsuser.view" });
        }
      }
    },
    async submit() {
      this.isLoading = true;
      this.submitted = true;

      try {

        if (!this.form.name) {
          this.form.name = this.form.trade_name;
        }


        if (this.form.id) {
          if (
            !this.form.trade_name ||
            !this.form.address ||
            !this.form.phone ||
            !this.form.city ||
            !this.form.nif ||
            !this.form.sector ||
            !this.form.postcode ||
            !this.form.owner
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
            `contacts/${this.form.id}`,
            this.form
          );
          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          this.submitted = false;

          if (this.modal) {            
            this.$emit('confirm', { id: this.form.id });
            return
          }
          this.getData();
        } else {
          if (
            !this.form.trade_name ||
            !this.form.phone ||
            !this.form.address ||
            !this.form.city ||
            !this.form.nif ||
            !this.form.sector ||
            !this.form.postcode ||
            !this.form.owner
          ) {
            this.$buefy.snackbar.open({
              message: "Error. Falten alguns camps obligatòris",
              queue: false,
              type: "is-danger"
            });
            this.isLoading = false;
            return;
          }

          if (
            this.$route.query.user &&
            this.$route.query.user === "true" &&
            this.permissions.includes("orders_admin") &&
            this.form.owner === this.me.id
          ) {
            this.form.multiowner = true;
          } else {
            this.form.multiowner = false;
          }

          const newProject = await service({ requiresAuth: true }).post(
            "contacts",
            this.form
          );
          // console.log('newProject', newProject.data)

          if (this.modal) {            
            this.$emit('confirm', { id: newProject.data.id });
            return
          }
          
          this.$router.push({
            name: `contactsuser.edit`,
            params: { id: newProject.data.id }
          });

          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false
          });

          this.submitted = false;

          setTimeout(() => {
            this.isLoading = false;
          }, 100);
        }
      } catch (err) {
        console.error(err);

        this.$buefy.snackbar.open({
          message: "Error",
          queue: false,
          type: "is-danger"
        });

        this.submitted = false;
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
    },
    toogleContactType(id) {
      if (this.form.contact_types.includes(id)) {
        this.form.contact_types = this.form.contact_types.filter(c => c !== id);
      } else {
        this.form.contact_types.push(id);
      }
    },
    onOwnerChanged() {
      const userWithOrdersPermissions = this.usersWithOrdersPermissions.find(
        u => u.id === this.form.owner
      );
      if (
        userWithOrdersPermissions &&
        userWithOrdersPermissions.username !== "TOTES"
      ) {
        this.form.multiowner = false;
      } else {
        this.form.multiowner = true;
      }
    },
    deleteContact() {
      this.$buefy.dialog.confirm({
        title: "Esborrar contacte",
        message: "Vols esborrar aquest contacte?",
        confirmText: "Esborrar",
        cancelText: "No",
        type: "is-danger",
        hasIcon: true,
        onConfirm: async () => {
          this.isLoading = true;
          try {
            await service({ requiresAuth: true }).delete(
              `contacts/${this.form.id}`
            );
            this.$buefy.snackbar.open({
              message: "Esborrat",
              queue: false
            });
            this.redirectToView();
          } catch (err) {
            console.error(err);
            this.$buefy.snackbar.open({
              message:
                "Error. El contacte no s'ha pogut esborrar perquè té dades associades",
              queue: false,
              type: "is-danger"
            });
            this.isLoading = false;
          }
        }
      });
    },
    async citySelected(option) {
      this.form.city = option.name;
    },
    emitCancel() {
      this.$emit("cancel");
    },
    generateNIF() {
      const nif = Math.floor(Math.random() * 100000000);
      this.form.nif = 'I-' + nif.toString().padStart(8, "0");
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
