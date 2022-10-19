<template>
  <div>
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
          @select="(option) => (form.project = option ? option.id : null)"
          :clearable="true"
        >
        </b-autocomplete>
      </b-field>
    </b-field>
    <b-field class="mt-5 has-text-right">
      <b-button
        type="is-primary"
        @click="submit"
        :disabled="!form.date || !form.comment || !form.total || summitting"
        >Guardar</b-button
      >
    </b-field>
    <pre>{{ form }}</pre>
  </div>
</template>

<script>
import service from "@/service/index";
import moment from "moment";

moment.locale("ca");

export default {
  name: "TreasuryAnnotationInput",
  // components: { CardComponent },
  props: {
    projects: {
      type: Array,
      default: [],
    },
  },
  data() {
    return {
      form: {
        comment: "",
        total: 0,
        date: null,
        project: null,
      },
      projectNameSearch: "",
      summitting: false
    };
  },
  computed: {
    filteredProjects() {
      // active & not mother
      const projects = this.form.id
        ? this.projects
        : this.projects
            .filter((p) => p.project_state && p.project_state.id !== 2)
            .filter(
              (p) =>
                p.mother === null ||
                (p.mother !== null && p.mother.id && p.mother.id !== p.id)
            );
      return projects.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectNameSearch.toLowerCase()) >= 0
        );
      });
    },
  },
  methods: {
    fixDecimals(field, value) {
      if (value && value.toString().includes(",")) {
        this.form[field] = value.toString().replace(",", ".");
      }
    },
    async submit() {
      this.summitting = true
      await service({ requiresAuth: true }).post("treasuries", this.form);

      this.form = {
        comment: "",
        total: 0,
        date: null,
        project: null,
      };
      
      this.projectNameSearch = ""
      
      this.$buefy.snackbar.open({
        message: "Guardat",
        queue: false,
      });

      this.summitting = false

      this.$emit("annotation");
    },
  },
};
</script>
<style>
.field-no-label > .field-label {
  display: none !important;
}
</style>
