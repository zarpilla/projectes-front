<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="columns">
        <div class="column is-full">
          <card-component class="tile is-child">
            <form @submit.prevent="submit" v-if="!isLoading">
              <b-field label="Número" horizontal>
                <b-input v-model="form.code" placeholder="" disabled />
              </b-field>
              <b-field label="Sèrie *" horizontal>
                <b-select v-model="form.serial" placeholder="" required>
                  <option
                    v-for="(s, index) in series"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>
              <b-field label="Emissió *" horizontal>
                <b-datepicker
                  v-model="form.emitted"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data Emissió"
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field>

              <b-field label="Venciment" horizontal>
                <b-datepicker
                  v-model="form.paybefore"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data Venciment"
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field>
              <b-field label="Enviada" horizontal>
                <b-checkbox v-model="form.sent" class="checkbox-inline">
                </b-checkbox>
                <b-datepicker
                  v-model="form.sent_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data Enviament"
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field>
              <b-field label="Pagada" horizontal>
                <b-checkbox v-model="form.paid" class="checkbox-inline">
                </b-checkbox>
                <b-datepicker
                  v-model="form.paid_date"
                  :show-week-number="false"
                  :locale="'ca-ES'"
                  :first-day-of-week="1"
                  icon="calendar-today"
                  placeholder="Data Pagament"
                  trap-focus
                  editable
                >
                </b-datepicker>
              </b-field>

              <b-field label="Mètode de pagament" horizontal>
                <b-select v-model="form.payment_method" placeholder="" required>
                  <option
                    v-for="(s, index) in paymentMethods"
                    :key="index"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </b-select>
              </b-field>

              <b-field label="Clienta *" horizontal>
                <b-autocomplete
                  v-model="clientSearch"
                  placeholder="Escriu el nom de la clienta..."
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredClients"
                  field="name"
                  @select="clientSelected"
                  :clearable="true"
                  required
                >
                </b-autocomplete>
              </b-field>

              <b-field label="Projecte *" horizontal>
                <b-autocomplete
                  v-model="projectSearch"
                  placeholder="Escriu el nom del projecte..."
                  :keep-first="false"
                  :open-on-focus="true"
                  :data="filteredProjects"
                  field="name"
                  @select="projectSelected"
                  :clearable="true"
                  required
                >
                </b-autocomplete>
              </b-field>
              <hr />

              <ul class="subphases-list">
                <li
                  v-for="(line, j) in form.lines"
                  :key="j"
                  class="subphase line mt-2 mb-2"
                >
                  <b-field grouped>
                    <b-field
                      :label="j == 0 ? 'Concepte' : null"
                      class="subphase-detail-input-large-field"
                    >
                      <b-input
                        name="SubFase"
                        placeholder="Concepte..."
                        v-model="line.concept"
                        class="
                          subphase-detail-input subphase-detail-input-large
                        "
                      >
                      </b-input>
                    </b-field>
                    <b-field
                      :label="j == 0 ? 'Quantitat' : null"
                      class="medium-field"
                    >
                      <b-input
                        name="Unitats"
                        placeholder="Quantitat, hores, unitats..."
                        v-model="line.quantity"
                        class="subphase-detail-input"
                        @input="changeLine(line, 'quantity', line.quantity)"
                      >
                      </b-input>
                    </b-field>
                    <b-field
                      :label="j == 0 ? 'Preu' : null"
                      class="medium-field"
                    >
                      <b-input
                        name="base"
                        placeholder="Preu per unitat"
                        v-model="line.base"
                        class="subphase-detail-input"
                        @input="changeLine(line, 'base', line.base)"
                      >
                      </b-input>
                    </b-field>
                    <b-field
                      :label="j == 0 ? 'Descompte %' : null"
                      class="medium-field"
                    >
                      <b-input
                        name="discount"
                        placeholder="Preu per unitat"
                        v-model="line.discount"
                        class="subphase-detail-input"
                        @input="changeLine(line, 'discount', line.discount)"
                      >
                      </b-input>
                    </b-field>
                    <b-field
                      :label="j == 0 ? 'IVA %' : null"
                      class="medium-field"
                    >
                      <b-input
                        name="vat"
                        placeholder="Preu per unitat"
                        v-model="line.vat"
                        class="subphase-detail-input"
                        @input="changeLine(line, 'vat', line.vat)"
                      >
                      </b-input>
                    </b-field>
                    <b-field
                      :label="j == 0 ? 'IRPF %' : null"
                      class="medium-field"
                    >
                      <b-input
                        name="irpf"
                        placeholder="Preu per unitat"
                        v-model="line.irpf"
                        class="subphase-detail-input"
                        @input="changeLine(line, 'irpf', line.irpf)"
                      >
                      </b-input>
                    </b-field>
                    <b-field
                      :label="j == 0 ? 'Accions' : null"
                      class="medium-field"
                    >
                    <button                      
                        class="button is-small is-primary ml-2"
                        type="button"
                        @click.prevent="line.show = !line.show"
                      >
                        <b-icon icon="comment" size="is-small" />
                      </button>
                      <button
                      v-if="form.lines.length > 1"
                        class="button is-small is-danger ml-2"
                        type="button"
                        @click.prevent="removeLine(line, j)"
                      >
                        <b-icon icon="trash-can" size="is-small" />
                      </button>
                      <button
                        v-if="j === form.lines.length - 1"
                        class="button is-small is-primary ml-2"
                        type="button"
                        @click.prevent="addLine(line)"
                      >
                        <b-icon icon="plus-circle" size="is-small" />
                      </button>
                    </b-field>
                  </b-field>
                  <b-field
                    label="Notes"
                    grouped
                    class="line-notes mb-5"
                    :class="line.show ? 'z' : 'is-hidden'"
                  >
                    <b-input
                      type="textarea"
                      v-model="line.comments"
                      placeholder="Descripció del concepte"                      
                    />
                  </b-field>
                </li>
              </ul>
              <hr />
              <div class="summary has-background-white-ter p-4">
                <div class="is-flex is-justify-content-flex-end">
                  <label>Base: </label>
                  <money-format
                    :value="totalBase"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
                <div class="is-flex is-justify-content-flex-end">
                  <label>IVA: </label>
                  <money-format
                    :value="totalVat"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
                <div class="is-flex is-justify-content-flex-end">
                  <label>IRPF: </label>
                  <money-format
                    :value="totalIrpf"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
                <div class="is-flex is-justify-content-flex-end has-text-weight-bold mt-5">
                  <label>Total </label>
                  <money-format
                    :value="total"
                    :locale="'es'"
                    :currency-code="'EUR'"
                    :subunits-value="false"
                    :hide-subunits="false"
                  >
                  </money-format>
                </div>
              </div>
              <hr>

              <b-field
                label="Notes"
                horizontal
              >
                <b-input
                  type="textarea"
                  v-model="form.comments"
                  placeholder="Notes sobre la factura (visible a la factura)"
                />
              </b-field>

              <hr>
              <b-field horizontal>
                <a v-if="form.pdf" :href="form.pdf" class="button is-warning" target="_blank">
                  Visualitzar PDF
                </a>
              </b-field>
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
// import axios from 'axios'
import dayjs from "dayjs";
// import find from 'lodash/find'
import TitleBar from "@/components/TitleBar";
// import HeroBar from '@/components/HeroBar'
// import Tiles from '@/components/Tiles'
import CardComponent from "@/components/CardComponent";
// import FilePicker from '@/components/FilePicker'
// import UserAvatar from '@/components/UserAvatar'
import ModalBoxInvoicing from "@/components/ModalBoxInvoicing";
import ModalBoxSplit from "@/components/ModalBoxSplit";
import service from "@/service/index";
// import ProjectGannt from '@/components/ProjectGannt.vue'
import ProjectGannt2 from "@/components/ProjectGannt2.vue";
// import CurrencyInput from '@/components/CurrencyInput'
import MoneyFormat from "vue-money-format";
import { EventBus } from "@/service/event-bus.js";
import sumBy from "lodash/sumBy";
import { mapState } from "vuex";
import moment from "moment";
import sortBy from "lodash/sortBy";

export default {
  name: "ProjectForm",
  components: {
    // UserAvatar,
    // FilePicker,
    CardComponent,
    // Tiles,
    // HeroBar,
    TitleBar,
    // ProjectGannt,
    MoneyFormat,
    ModalBoxInvoicing,
    ModalBoxSplit,
    ProjectGannt2,
    // CurrencyInput
    // Notification
  },
  props: {
    id: {
      type: [String, Number],
      default: null,
    },
    type: {
      type: [String],
      default: null,
    },
  },
  data() {
    return {
      isProfileExists: false,
      isLoading: false,
      series: [],
      form: this.getClearFormObject(),
      clients: [],
      clientSearch: "",
      projectSearch: "",
      methodSearch: "",
      paymentMethods: [],
      projects: []
    };
  },
  computed: {
    ...mapState(["me"]),
    filteredClients() {
      return this.clients.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.clientSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredProjects() {
      return this.projects.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredMethods() {
      return this.paymentMethods.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.methodSearch.toLowerCase()) >= 0
        );
      });
    },
    titleStack() {
      const type = this.type === "emitted-invoices" ? "Factures Emeses" : "Factures Rebudes"
      return ["Facturació", type, this.formCardTitle];
    },
    formCardTitle() {
      if (this.isProfileExists) {
        return this.form.code;
      } else {
        return "Nova factura";
      }
    },
    transitionName() {
      if (this.useTransition) {
        return "fade";
      }
      return "x";
    },
    totalBase () {
      return sumBy(this.form.lines, l => { return l.quantity * l.base * (1 - l.discount / 100) })
    },
    totalVat () {
      return sumBy(this.form.lines, l => { return l.quantity * l.base * (1 - l.discount / 100) * l.vat / 100 })
    },
    totalIrpf () {
      return -1*sumBy(this.form.lines, l => { return l.quantity * l.base * (1 - l.discount / 100) * l.irpf / 100 })
    },
    total () {
      return this.totalBase + this.totalVat + this.totalIrpf
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
        number: null,
        serial: { id: 0 },
        emitted: new Date(),
        paybefore: null,
        contact: { id: 0 },
        lines: [this.getNewLine()],
      };
    },
    getNewLine() {
      return {
        concept: "",
        base: 0,
        quantity: 1,
        discount: 0,
        vat: 0,
        irpf: 0,
        comments: "",
        show: false
      };
    },
    async getData() {
      if (!this.me) {
        service({ requiresAuth: true })
          .get("me")
          .then((r) => {
            this.me = r.data;
            this.$store.commit("me", {
              me: r.data,
            });
          });
      }

      await this.getAuxiliarData();

      if (this.$route.params.id && this.$route.params.id > 0) {
        this.isLoading = true;
        service({ requiresAuth: true })
          .get(`${this.type}/${this.$route.params.id}`)
          .then(async (r) => {
            if (r.data && r.data.id) {
              this.isProfileExists = true;
              this.form = r.data;
              this.form.emitted = moment(this.form.emitted, 'YYYY-MM-DD').toDate()
              if (this.form.paybefore) {
                this.form.paybefore = moment(this.form.paybefore, 'YYYY-MM-DD').toDate()
              }
              if (this.form.sent_date) {
                this.form.sent_date = moment(this.form.sent_date, 'YYYY-MM-DD').toDate()
              }
              if (this.form.paid_date) {
                this.form.paid_date = moment(this.form.paid_date, 'YYYY-MM-DD').toDate()
              }
              if (this.form.serial && this.form.serial.id) {
                this.form.serial = this.form.serial.id
              }
              if (this.form.contact && this.form.contact.id) {
                this.clientSearch = this.form.contact.name
                this.form.contact = this.form.contact.id
              }
              if (this.form.project && this.form.project.id) {
                this.projectSearch = this.form.project.name
                this.form.project = this.form.project.id
              }
              if (this.form.payment_method && this.form.payment_method.id) {
                this.methodSearch = this.form.payment_method.name
                this.form.payment_method = this.form.payment_method.id
              }
              
              // this.getAuxiliarData();

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
      console.log('getAuxiliarData')
      this.series = (await service({ requiresAuth: true }).get("series")).data
      this.paymentMethods = (await service({ requiresAuth: true }).get("payment-methods")).data
      this.projects = (await service({ requiresAuth: true }).get("projects/basic?_limit=-1&project_state=1")).data
      this.clients = (await service({ requiresAuth: true }).get("contacts?_limit=-1")).data
        
      // service({ requiresAuth: true })
      //   .get("payment-methods")
      //   .then((r) => {
      //     this.paymentMethods = r.data;
      //   });
      // service({ requiresAuth: true })
      //   .get("projects/basic?_limit=-1&project_state=1")
      //   .then((r) => {
      //     this.projects =  r.data;
      //   });
      // service({ requiresAuth: true })
      //   .get("contacts?_limit=-1")
      //   .then((r) => {
      //     this.clients = r.data;
      //   });
    },
    changeLine(line, field, value) {
      if (value && value.toString().includes(",")) {
        line[field] = value.toString().replace(",", ".");
      }
    },
    input(v) {
      this.createdReadable = dayjs(v).format("MMM D, YYYY");
    },
    async submit() {
      this.isLoading = true;

      try {
        if (this.form.id) {

          if (
            !this.form.emitted ||
            !this.form.contact ||
            !this.form.project ||
            !this.form.serial
          ) {
            this.$buefy.snackbar.open({
              message:
                "Error. Serie, Emissió, Clienta i Projecte son dades obligatòries",
              queue: false,
            });
            this.isLoading = false;
            return;
          }

          await service({ requiresAuth: true }).put(
            `${this.type}/${this.form.id}`,
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
            !this.form.emitted ||
            !this.form.contact ||
            !this.form.project ||
            !this.form.serial
          ) {
            this.$buefy.snackbar.open({
              message:
                "Error. Serie, Emissió, Clienta i Projecte son dades obligatòries",
              queue: false,
            });
            this.isLoading = false;
            return;
          }

          const newProject = await service({ requiresAuth: true }).post(
            this.type,
            this.form
          );
          // console.log('newProject', newProject.data)
          this.$router.push({
            name: `${this.type}.edit`,
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
