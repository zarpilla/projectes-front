<template>
  <div>
    <div>
      <h5 class="title is-6">Afegir moviment</h5>
      <b-field label="" horizontal class="field-no-label" v-if="!summitting">
        <b-field label="Data" horizontal>
          <b-datepicker
            v-model="form.date"
            :show-week-number="false"
            :locale="'ca-ES'"
            :first-day-of-week="1"
            icon="calendar-today"
            placeholder="Data"
          >
          </b-datepicker>
        </b-field>
        <b-field label="Import" horizontal>
          <b-input
            v-model="form.total"
            placeholder="Import"
            @input="fixDecimals('total', form.total)"
          />
        </b-field>
        <b-field label="Concepte" horizontal>
          <b-input v-model="form.comment" placeholder="Concepte" />
        </b-field>
        <b-field label="Projecte" horizontal>
          <b-autocomplete
            v-model="projectNameSearch"
            placeholder="Projecte"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredProjects"
            field="name"
            @select="option => (form.project = option ? option.id : null)"
            :clearable="true"
          >
          </b-autocomplete>
        </b-field>
        <b-field label="Compte bancari" horizontal>
          <b-select
            v-model="form.bank_account"
            placeholder="-- Compte --"
          >
            <option
              v-for="account in bankAccounts"
              :key="account.id"
              :value="account.id"
            >
              {{ account.name }}
            </option>
          </b-select>
        </b-field>
      </b-field>
      <b-field class="mt-5 has-text-right">
        <b-button
          type="is-primary"
          @click="submit"
          :disabled="!form.date || !form.comment || !form.total || summitting || !form.bank_account"
          >Enviar</b-button
        >
      </b-field>
    </div>
    <div>
      <h5 class="title is-6">Afegir saldo real</h5>
      <b-field label="" horizontal class="field-no-label" v-if="!summitting">
        <b-field label="Data" horizontal>
          <b-datepicker
            v-model="form2.date"
            :show-week-number="false"
            :locale="'ca-ES'"
            :first-day-of-week="1"
            icon="calendar-today"
            placeholder="Data"
          >
          </b-datepicker>
        </b-field>
        <b-field label="Import" horizontal>
          <b-input
            v-model="form2.total"
            placeholder="Import"
            @input="fixDecimals2('total', form2.total)"
          />
        </b-field>
        <b-field label="Compte bancari" horizontal>
          <b-select
            v-model="form2.bank_account"
            placeholder="-- Compte --"
          >
            <option
              v-for="account in bankAccounts"
              :key="account.id"
              :value="account.id"
            >
              {{ account.name }}
            </option>
          </b-select>          
        </b-field>
      </b-field>
      <b-field class="mt-5 has-text-right">
        <b-button
          type="is-primary"
          @click="submit2"
          :disabled="!form2.date || !form2.total || summitting || !form2.bank_account"
          >Enviar</b-button
        >
      </b-field>
    </div>
  </div>
</template>

<script>
import service from "@/service/index";
import { create } from "lodash";
import moment from "moment";

moment.locale("ca");

export default {
  name: "TreasuryAnnotationInput",
  // components: { CardComponent },
  props: {
    projects: {
      type: Array,
      default: []
    }
  },
  data() {
    return {
      form: {
        comment: "",
        total: 0,
        date: null,
        project: null,
        bank_account: null
      },
      form2: {
        total: 0,
        date: null,
        bank_account: null,
        is_real_balance: true
      },
      projectNameSearch: "",
      summitting: false,
      bankAccounts: []
    };
  },
  created() {
    service({ requiresAuth: true })
      .get("bank-accounts")
      .then(response => {
        this.bankAccounts = response.data;
      });
  },
  computed: {
    filteredProjects() {
      // active & not mother
      const projects = this.form.id
        ? this.projects
        : this.projects
            .filter(p => p.project_state && p.project_state.id !== 2)
            .filter(
              p =>
                p.mother === null ||
                (p.mother !== null && p.mother.id && p.mother.id !== p.id)
            );
      return projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectNameSearch.toLowerCase()) >= 0
        );
      });
    }
  },
  methods: {
    fixDecimals(field, value) {
      if (value && value.toString().includes(",")) {
        this.form[field] = value.toString().replace(",", ".");
      }
    },
    fixDecimals2(field, value) {
      if (value && value.toString().includes(",")) {
        this.form2[field] = value.toString().replace(",", ".");
      }
    },
    async submit() {
      this.summitting = true;
      await service({ requiresAuth: true }).post("treasuries", this.form);

      this.form = {
        comment: "",
        total: 0,
        date: null,
        project: null
      };

      this.projectNameSearch = "";

      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false
      });

      this.summitting = false;

      this.$emit("annotation");
    },
    async submit2() {
      this.summitting = true;
      await service({ requiresAuth: true }).post("treasuries", this.form2);

      this.form2 = {
        total: 0,
        date: null,
        bank_account: null,
        is_real_balance: true
      };

      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false
      });

      this.summitting = false;

      this.$emit("annotation");
    }
  }
};
</script>
<style>
.field-no-label > .field-label {
  display: none !important;
}
</style>
