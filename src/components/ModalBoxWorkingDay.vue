<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Jornada</p>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body">
          <b-field label="Període" class="datepickers" horizontal>
            <b-datepicker
              v-model="form.from"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              :editable="true"
              trap-focus
            >
            </b-datepicker>
            <b-datepicker
              v-model="form.to"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              :editable="true"
              trap-focus
            >
            </b-datepicker>
          </b-field>
          <b-field label="Persona" horizontal>
            <b-autocomplete
              v-model="userNameSearch"
              placeholder="Persona"
              :keep-first="false"
              :open-on-focus="true"
              :data="filteredUsers"
              field="username"
              @select="
                (option) =>
                  (form.users_permissions_user = option ? option.id : null)
              "
              :clearable="false"
              :disabled="true"
            >
            </b-autocomplete>
          </b-field>

          <b-field label="Hores" horizontal message="Hores diaries de treball">
            <b-input
              v-model="form.hours"
              placeholder="Hores"
              name="hours"
              required
              @input="fixDecimals('hours', form.hours)"
            />
          </b-field>

          <b-field
            label="Salari base (€)"
            horizontal
            message="Salari base mensual a jornada completa (si es fessin 8h)"
          >
            <b-input
              v-model="form.monthly_salary"
              placeholder="Salari base mensual jornada completa (€)"
              name="monthly_salary"
              @input="fixDecimals('monthly_salary', form.monthly_salary)"
            />
          </b-field>

          <b-field label="Seguretat Social" horizontal>
            <b-radio
              v-model="form.scheme"
              name="name"
              @input="schemeChanged('autonoma')"
              native-value="autonoma"
            >
              Treballadora Autònoma
            </b-radio>
            <b-radio
              v-model="form.scheme"
              name="name"
              native-value="general"
              @input="schemeChanged('general')"
            >
              Règim General
            </b-radio>
          </b-field>

          <b-field
            label="Quota (€ / %)"
            horizontal
            message="Quota S.S. mensual soportada per la cooperativa"
          >
            <b-input
              v-model="form.quota"
              placeholder="Quota fixa €"
              name="quota"
              @input="fixDecimals('quota', form.quota)"
              message="soportada per la cooperativa (€)"
            />
            <b-input
              v-model="form.pct_quota"
              placeholder="Quota %"
              name="pct_quota"
              @input="fixDecimals('pct_quota', form.pct_quota)"
              message="soportada per la cooperativa (%)"
            />
          </b-field>
          <!-- 
            <b-field label="Quota (%)" horizontal message="Quota S.S. mensual soportada per la cooperativa sobre el salari base">
              <b-input
                v-model="form.pct_quota"
                placeholder="Cuota"
                name="pct_quota"
                @input="fixDecimals('pct_quota', form.pct_quota)"
                message="soportada per la cooperativa (%)"
              />
            </b-field> -->

          <b-field
            label="% IRPF"
            horizontal
            message="Percentatge sobre el salari base mensual"
          >
            <b-input
              v-model="form.pct_irpf"
              placeholder="% IRPF"
              name="pct_irpf"
              @input="fixDecimals('pct_irpf', form.pct_irpf)"
            />
          </b-field>

          <b-field
            label="% Altres"
            horizontal
            message="Contingències, atur... Percentatge sobre el salari base mensual"
          >
            <b-input
              v-model="form.pct_other"
              placeholder="% Altres"
              name="pct_other"
              @input="fixDecimals('pct_other', form.pct_other)"
            />
          </b-field>

          <b-field
            label="Cost/hora (€)"
            horizontal
            message="Cost soportat per la cooperativa"
            v-if="!isLoading1"
          >
            <div class="readonly-fake">
              {{ form.costByHour ? form.costByHour.toFixed(2) : "" }}
            </div>
            <!-- <b-input
                v-model="form.costByHour"
                placeholder="Cost"
                name="cost"
                :disabled="true"
              /> -->
          </b-field>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="cancel">
            Cancel·la
          </button>
          <button class="button" type="button" @click="trashModal(form)">
            Esborra
          </button>
          <button
            class="button is-primary"
            :disabled="!enabled"
            native-type="submit"
          >
            D'acord
          </button>
        </footer>
      </form>
    </div>
    <!-- <div>
      {{ dedicationObject }}
    </div> -->

    <modal-box
      :is-active="isDeleteModalActive"
      :trash-object-name="trashObjectName"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />
  </b-modal>
</template>

<script>
import service from "@/service/index";
import { mapState } from "vuex";
import ModalBox from "@/components/ModalBox";
import moment from "moment";

export default {
  name: "ModalBoxWorkingDay",
  components: { ModalBox },
  props: {
    isActive: {
      type: Boolean,
      default: false,
    },
    dedicationObject: {
      type: Object,
      default: null,
    },
    users: {
      type: Array,
      default: [],
    },
    quotes: {
      type: Object,
      default: { id: 0 },
    },
    years: {
      type: Array,
      default: [],
    },
  },
  data() {
    return {
      isModalActive: false,
      isLoading1: false,
      isLoading2: false,
      hasDedications: false,
      hasActivities: false,
      form: {
        from: null,
        to: null,
        users_permissions_user: null,
        hours: null,
        costByHour: null,
        monthly_salary: null,
        scheme: "",
        quota: 0,
        pct_irpf: 0,
        pct_other: 0,
      },
      trashObject: null,
      isDeleteModalActive: false,
      userNameSearch: "",
      initializing: true,
      initialCostByHour: null,
    };
  },
  computed: {
    ...mapState(["userName"]),
    enabled() {
      return this.form.from && this.form.to;
    },
    filteredUsers() {
      return this.users.filter((option) => {
        return (
          option.username
            .toString()
            .toLowerCase()
            .indexOf(this.userNameSearch.toLowerCase()) >= 0
        );
      });
    },
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    },
    costByHourDisplay() {
      return this.form.costByHour.toFixed(2);
    },
  },
  watch: {
    isActive(newValue) {
      if (newValue && !this.isModalActive) {
        this.isModalActive = newValue;
        this.show();
      } else if (!newValue && !this.isModalActive) {
        this.isModalActive = newValue;
        this.cancel();
      } else {
        this.isModalActive = newValue;
      }
    },
    dedicationObject(newValue) {},
  },
  methods: {
    calcCostByHour() {
      const yyyy = moment(this.form.from).format("YYYY");
      const year = this.years.find((y) => y.year.toString() === yyyy);
      const hours = year && year.working_hours ? year.working_hours : 1764;
      const quota = this.form.quota ? this.form.quota : 0;
      const pct_quota = this.form.pct_quota
        ? (this.form.pct_quota * this.form.monthly_salary) / 100
        : 0;
      const monthly = this.form.monthly_salary + quota + pct_quota;
      const costByHour = (monthly * 12) / hours;
      this.form.costByHour = costByHour;
      return costByHour; // .toFixed(2)
    },
    show() {
      this.isLoading1 = true;
      this.isLoading2 = true;
      this.initializing = true;

      if (this.dedicationObject) {
        this.initialCostByHour = this.dedicationObject._dedication.costByHour;

        this.form.id = this.dedicationObject._dedication.id;
        this.form.from = this.dedicationObject._dedication.from
          ? moment(
              this.dedicationObject._dedication.from,
              "YYYY-MM-DD"
            ).toDate()
          : null;
        this.form.to = this.dedicationObject._dedication.to
          ? moment(this.dedicationObject._dedication.to, "YYYY-MM-DD").toDate()
          : null;
        this.form.costByHour = this.dedicationObject._dedication.costByHour;
        this.form.monthly_salary =
          this.dedicationObject._dedication.monthly_salary;
        this.form.costByHour = (this.form.monthly_salary * 12) / 1864;
        this.form.hours = this.dedicationObject._dedication.hours;
        this.form.users_permissions_user = this.dedicationObject._dedication
          .users_permissions_user
          ? this.dedicationObject._dedication.users_permissions_user.id
          : null;
        this.userNameSearch = this.dedicationObject._dedication
          .users_permissions_user
          ? this.dedicationObject._dedication.users_permissions_user.username
          : "";
        this.form.scheme = this.dedicationObject._dedication.scheme;
        this.form.quota = this.dedicationObject._dedication.quota;
        this.form.pct_quota = this.dedicationObject._dedication.pct_quota;
        this.form.pct_irpf = this.dedicationObject._dedication.pct_irpf;
        this.form.pct_other = this.dedicationObject._dedication.pct_other;
      } else {
        this.form.from = null;
        this.form.to = null;
        this.form.users_permissions_user = null;
        this.form.hours = 0;
        this.form.costByHour = 0;
        this.form.monthly_salary = 0;
        this.form.scheme = "autonoma";
        this.form.quota = 0;
        this.form.pct_quota = 0;
        this.form.pct_irpf = 0;
        this.form.pct_other = 0;
        this.form.id = 0;
      }

      this.form.costByHour = this.calcCostByHour();
      this.initializing = false;
      this.isLoading1 = false;
    },
    cancel() {
      this.isModalActive = false;
      this.$emit("cancel");
    },
    submit() {
      // this.form.id = this.dedicationObject.id
      this.form._dedication = this.dedicationObject._dedication;
      this.form.costByHour = this.calcCostByHour();
      this.$emit("submit", this.form);
    },
    trashModal(trashObject) {
      this.trashObject = trashObject;
      this.isDeleteModalActive = true;
    },
    trashCancel() {
      this.isDeleteModalActive = false;
    },
    async trashConfirm() {
      this.isDeleteModalActive = false;
      this.isModalActive = true;
      this.$emit("delete", this.form);
    },
    fixDecimals(field, value) {
      if (value && value.toString().includes(",")) {
        this.form[field] = value.toString().replace(",", ".");
      }
      this.form.costByHour = this.calcCostByHour();
      // this.isLoading1 = true
      //setTimeout(() => this.isLoading1 = false, 50)
      // console.log('this.field', this.field)
      // if (this.field === 'monthly_salary') {
      //   this.form.costByHour = value * 12 /1864
      // }
    },
    schemeChanged(newSchema) {
      this.setQuotes(newSchema);
    },
    setQuotes(scheme) {
      if (this.quotes && this.quotes.id && !this.initializing) {
        this.form.quota = this.quotes[`${scheme}_quota`];
        this.form.pct_quota = this.quotes[`${scheme}_pct_quota`];
        this.form.pct_irpf = this.quotes[`${scheme}_pct_irpf`];
        this.form.pct_other = this.quotes[`${scheme}_pct_other`];
        const monthly_salary = this.form.monthly_salary;
        this.form.monthly_salary = 0;
        this.form.monthly_salary = monthly_salary;
        this.form.costByHour = this.calcCostByHour();
      }
    },
  },
};
</script>
<style>
.modal-card-dedication .field:not(:last-child) {
  margin-bottom: 1rem;
}
.modal-card-dedication .datepickers .field {
  margin-bottom: 0;
}
.modal-card-dedication .modal-card-body {
  max-height: calc(100vh - 200px);
}
</style>
