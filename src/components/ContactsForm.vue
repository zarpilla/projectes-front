<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full">
          <card-component class="tile is-child">
            <form @submit.prevent="submit" v-if="!isLoading">
              <b-field label="Raó Social *" horizontal>
                <b-input
                  v-model="form.name"
                  placeholder="Raó Social del contacte"
                  required
                />
              </b-field>
              <b-field :label="!form.owner ? 'NIF *' : 'NIF'" horizontal>
                <b-input v-model="form.nif" required />
              </b-field>
              <b-field label="Tipus de contacte" horizontal>
                <div class="is-flex">
                  <div
                    v-for="(contactType, index) in contactTypes"
                    :key="index"
                  >
                    <b-button
                      @click="toogleContactType(contactType.id)"
                      :class="{
                        'is-warning': form.contact_types.includes(
                          contactType.id
                        ),
                        'is-outlined': !form.contact_types.includes(
                          contactType.id
                        )
                      }"
                      class="mr-2"
                      >{{ contactType.name }}</b-button
                    >
                  </div>
                </div>
              </b-field>
              <b-field
                label="Persona"
                horizontal
                message="Si és també treballadora o sòcia de la cooperativa"
                v-if="!form.owner"
              >
                <b-select v-model="form.users_permissions_user" placeholder="">
                  <option
                    v-for="(s, index) in users"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.username }}
                  </option>
                </b-select>
              </b-field>
              <b-field label="Nom comercial" horizontal>
                <b-input v-model="form.trade_name" />
              </b-field>

              <b-field :label="form.owner ? 'Telèfon *' : 'Telèfon'" horizontal>
                <b-input v-model="form.phone" />
              </b-field>
              <b-field label="Email" horizontal>
                <b-input v-model="form.email" />
              </b-field>
              <b-field label="Adreça *" horizontal>
                <b-input v-model="form.address" required type="text" />
              </b-field>
              <b-field label="CP *" horizontal>
                <b-input v-model="form.postcode" required />
              </b-field>
              <b-field label="Població *" horizontal>
                <b-input v-model="form.city" required />
              </b-field>
              <b-field label="Provincia" horizontal>
                <b-input v-model="form.state" />
              </b-field>
              <b-field label="País" horizontal>
                <b-input v-model="form.country" />
              </b-field>
              <b-field label="Persona de contacte" horizontal>
                <b-input v-model="form.contact_person" />
              </b-field>
              <b-field label="Telèfon de contacte" horizontal>
                <b-input v-model="form.contact_phone" />
              </b-field>
              <b-field
                label="Email de contacte"
                horizontal
                message="Per enviar-li factures"
              >
                <b-input v-model="form.contact_email" />
              </b-field>
              <b-field label="Web" horizontal>
                <b-input v-model="form.website" />
              </b-field>
              <b-field label="Forma jurídica" horizontal>
                <b-select v-model="form.legal_form" placeholder="">
                  <option
                    v-for="(s, index) in legalForms"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>
              <b-field label="Sector" horizontal>
                <b-select v-model="form.sector" placeholder="">
                  <option
                    v-for="(s, index) in sectors"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>
              <b-field label="Import aportació sòcia" horizontal>
                <b-input v-model="form.partner_amount" type="number" />
              </b-field>
              <b-field label="Data aportació sòcia" horizontal>
                <b-datepicker
                  v-model="form.partner_amount_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data aportació sòcia"
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field>
              <b-field label="Data de seguiment" horizontal>
                <b-datepicker
                  v-model="form.followup_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data seguiment"
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field>
              <b-field
                label="Horari de contacte 1"
                horizontal
                v-if="form.owner"
              >
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
                          ? s.toString().replace(".5", ".30")
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
                          ? s.toString().replace(".5", ".30")
                          .replace(".25", ".15")
                          .replace(".75", ".45")
                          : `${s}.00`
                      }}
                    </option>
                  </b-select>
                </b-field>
              </b-field>

              <b-field
                label="Horari de contacte 2"
                horizontal
                v-if="form.owner"
              >
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
                          ? s.toString().replace(".5", ".30")
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
                          ? s.toString().replace(".5", ".30")
                          .replace(".25", ".15")
                          .replace(".75", ".45")
                          : `${s}.00`
                      }}
                    </option>
                  </b-select>
                </b-field>
              </b-field>

              <b-field
                label="Contacte de"
                horizontal
                v-if="isOrdersContactAndUserIsOrdersAdmin"
              >
                <b-select
                  v-model="form.owner"
                  placeholder=""
                  @input="onOwnerChanged"
                >
                  <option
                    v-for="(s, index) in usersWithOrdersPermissions"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.fullname || s.username }} ({{s.username === "TOTES"? '0' : s.id}})
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
                  v-model="form.notes"
                  placeholder="Notes, observacions, comentaris... "
                />
              </b-field>

              <hr />
              <b-field
                horizontal
                v-if="!form.multiowner || permissions.includes('orders_admin')"
              >
                <div class="is-flex">
                  <b-button
                    type="is-primary mr-2"
                    :loading="isLoading"
                    @click="submit"
                    >Guardar</b-button
                  >
                  <b-button
                    type="is-primary"
                    :loading="isLoading"
                    @click="submitExit"
                    >Guardar i sortir</b-button
                  >
                  <b-button
                    type="is-danger ml-auto"
                    v-if="form.id"
                    :loading="isLoading"
                    @click="deleteContact"
                    >Esborrar</b-button
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
import { ca } from "date-fns/locale";

export default {
  name: "ContactsForm",
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
      legalForms: [],
      sectors: [],
      users: [],
      usersWithOrdersPermissions: [],
      contact_time_slots: Array.from({ length: 96 }, (_, i) => i / 4),
      contactTypes: [],
      permissions: [],
      me: {}
    };
  },
  computed: {
    titleStack() {
      return ["Contactes", this.formCardTitle];
    },
    formCardTitle() {
      if (this.form.id) {
        return this.form.name;
      } else {
        return "Nou contacte";
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
        name: null,
        legal_form: null,
        sector: null,
        contact_types: []
      };
    },
    async getData() {
      const me = await service({ requiresAuth: true, cached: true }).get(
        "users/me"
      );
      this.me = me.data;

      this.permissions = me.data.permissions.map(p => p.permission);

      if (this.$route.query.user && this.$route.query.user === "true") {
        this.form.owner = me.data.id;
        this.form.contact_types = [4];
      }

      await this.getAuxiliarData();

      if (this.$route.params.id && this.$route.params.id > 0) {
        this.isLoading = true;
        service({ requiresAuth: true })
          .get(`contacts/${this.$route.params.id}`)
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

              if (this.form.followup_date) {
                this.form.followup_date = moment(
                  this.form.followup_date,
                  "YYYY-MM-DD"
                ).toDate();
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
    },
    async submitExit() {
      await this.submit();
      this.redirectToView();
    },
    redirectToView() {
      if (this.permissions.includes("orders")) {
        this.$router.push({ name: "user-contacts.view" });
      } else {
        if (this.form.owner) {
          this.$router.push({ name: "user-contacts.view" });
        } else {
          this.$router.push({ name: "contacts.view" });
        }
      }
    },
    async submit() {
      this.isLoading = true;

      try {
        if (this.form.id) {
          if (
            !this.form.name ||
            !this.form.address ||
            (!this.form.nif && !this.form.owner) ||
            (!this.form.phone && this.form.owner) ||
            !this.form.city ||
            !this.form.postcode
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
          this.getData();
        } else {
          if (
            !this.form.name ||
            (!this.form.nif && !this.form.owner) ||
            (!this.form.phone && this.form.owner) ||
            !this.form.address ||
            !this.form.city ||
            !this.form.postcode
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
          this.$router.push({
            name: `contacts.edit`,
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
          queue: false,
          type: "is-danger"
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
              message: "Error. El contacte no s'ha pogut esborrar perquè té dades associades",
              queue: false,
              type: "is-danger"
            });
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
.line-notes textarea {
  width: 100%;
}
</style>
