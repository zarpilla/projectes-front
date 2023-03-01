<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full">
          <card-component class="tile is-child">
            <form @submit.prevent="submit" v-if="!isLoading">
              <b-field label="Raó Social *" horizontal>
                <b-input v-model="form.name" placeholder="Raó Social del contacte" required />
              </b-field>
              <b-field label="NIF *" horizontal>
                <b-input v-model="form.nif" required />
              </b-field>
              <b-field label="Persona" horizontal message="Si a part de contacte és també treballadora o sòcia de la cooperativa">
                <b-select v-model="form.users_permissions_user" placeholder="" >
                  <option
                    v-for="(s, index) in users"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.username }}
                  </option>
                </b-select>
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
              <b-field label="Telèfon" horizontal>
                <b-input v-model="form.phone" />
              </b-field>
              <b-field label="Email" horizontal>
                <b-input v-model="form.email" />
              </b-field>
              <b-field label="Adreça *" horizontal>
                <b-input v-model="form.address" required />
              </b-field>
              <b-field label="CP *" horizontal>
                <b-input v-model="form.postcode" required/>
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
              <b-field label="Email de contacte" horizontal>
                <b-input v-model="form.contact_email" />
              </b-field>
              <b-field label="Web" horizontal>
                <b-input v-model="form.website" />
              </b-field>
              <hr>
              
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
      default: null,
    },
  },
  data() {
    return {
      isProfileExists: false,
      isLoading: false,
      series: [],
      form: this.getClearFormObject(),
      legalForms: [],
      sectors: [],
      users: []
    };
  },
  computed: {
    ...mapState(["me"]),
    titleStack() {
      return ["Contactes", this.formCardTitle];
    },
    formCardTitle() {
      if (this.isProfileExists) {
        return this.form.code;
      } else {
        return "Nou contacte";
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
    },
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
        sector: null
      };
    },
    async getData() {
      await this.getAuxiliarData();

      if (this.$route.params.id && this.$route.params.id > 0) {
        this.isLoading = true;
        service({ requiresAuth: true })
          .get(`contacts/${this.$route.params.id}`)
          .then(async (r) => {
            if (r.data && r.data.id) {
              this.isProfileExists = true;
              this.form = r.data;

              delete this.form.quotes
              delete this.form.projects
              delete this.form.projectes


              if (this.form.users_permissions_user && this.form.users_permissions_user.id) {
                this.form.users_permissions_user = this.form.users_permissions_user.id
              } else {
                this.form.users_permissions_user = 0
              }


              this.isLoading = false;
            } else {
              this.$router.push({ name: "project.new" });
            }
          });
      } else {
        // this.getAuxiliarData();
      }
    },
    async getAuxiliarData() {
      this.legalForms = (await service({ requiresAuth: true }).get("legal-forms")).data
      this.sectors = (await service({ requiresAuth: true }).get("sectors")).data
      const users = (await service({ requiresAuth: true }).get("users")).data
      this.users = concat({ id: 0, username: '--'}, users)
    },
    async submit() {
      this.isLoading = true;

      try {
        if (this.form.id) {

          if (
            !this.form.name ||
            !this.form.nif ||
            !this.form.address ||
            !this.form.city ||
            !this.form.postcode
          ) {
            this.$buefy.snackbar.open({
              message:
                "Error. Falten alguns camps obligatòris",
              queue: false,
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
            queue: false,
          });
          this.getData();
        } else {
          console.log("this.form", this.form);
          if (
            !this.form.name ||
            !this.form.nif ||
            !this.form.address ||
            !this.form.city ||
            !this.form.postcode
          ) {
            this.$buefy.snackbar.open({
              message:
              "Error. Falten alguns camps obligatòris",
              queue: false,
            });
            this.isLoading = false;
            return;
          }

          const newProject = await service({ requiresAuth: true }).post(
            'contacts',
            this.form
          );
          // console.log('newProject', newProject.data)
          this.$router.push({
            name: `contacts.edit`,
            params: { id: newProject.data.id },
          });

          this.$buefy.snackbar.open({
            message: "Guardat",
            queue: false,
          });

          setTimeout(() => {
            this.isLoading = false;
          }, 100);
        }
      } catch (err) {

        this.$buefy.snackbar.open({
            message: "Error",
            queue: false,
          });

        // console.error("projects error", err);
        // const oldProjectData = await service({ requiresAuth: true }).get(
        //   `projects?name=${this.form.name}`
        // );
        // if (
        //   oldProjectData &&
        //   oldProjectData.data &&
        //   oldProjectData.data.length
        // ) {
        //   this.$buefy.snackbar.open({
        //     message: "Error. El projecte ja existeix",
        //     queue: false,
        //   });
        // } else {
        //   this.$buefy.snackbar.open({
        //     message: "Error",
        //     queue: false,
        //   });
        // }
        this.isLoading = false;
      }
    },
    clientSelected(option) {
      if (!option || !option.id) {
        this.form.contact = null
      }
      delete option.projects;
      delete option.quotes;
      delete option.projectes;
      this.form.contact = option;      
    },
    projectSelected(option) {
      if (!option || !option.id) {
        this.form.project = null
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
      this.form.lines.push(this.getNewLine())
    },
  },
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
.summary label{
  margin-right: 0.5rem;  
}
.line-notes .control {width: 50%;}
.line-notes textarea {width: 100%;}
</style>
