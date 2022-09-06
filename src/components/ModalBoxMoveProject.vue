<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ title }}</p>
      </header>
      <section class="modal-card-body modal-card-body-min-height">
        <b-field label="Projecte destí" horizontal>
          <b-autocomplete
            v-model="projectNameSearch"
            placeholder="Projecte"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredProjects"
            field="name"
            @select="(option) => (form.project = option ? option.id : null)"
            :disabled="form.id > 0"
            :clearable="true"
          >
          </b-autocomplete>
        </b-field>
      </section>
      <footer class="modal-card-foot">
        <button class="button" type="button" @click="cancel">Cancel·la</button>
        <button class="button is-danger" :disabled="!form.project" @click="confirm">Moure</button>
      </footer>
    </div>
  </b-modal>
</template>

<script>
export default {
  name: "ModalBox",
  props: {
    isActive: {
      type: Boolean,
      default: false,
    },
    trashObjectName: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      default: "S'esborrarà permanentment l'activitat",
    },
    title: {
      type: String,
      default: "Moure dedicació?",
    },
    projects: {
      type: Array,
      default: [],
    },
  },
  computed: {
    filteredProjects() {
      // active & not mother
      const projects = this.projects
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
  data() {
    return {
      isModalActive: false,
      projectNameSearch: "",
      form: {
        project: null,
      },
    };
  },
  watch: {
    isActive(newValue) {
      if (newValue) {
        this.show();        
      } else {
        this.cancel();
      }
      this.isModalActive = newValue
    },
  },
  methods: {
    show() {
      this.projectNameSearch = "";
      this.form.project = null
    },
    cancel() {
      this.$emit("cancel");
    },
    confirm() {
      this.$buefy.dialog.confirm({
          message:
            "Estàs a punt de moure les dedicacions cap a un altre projecte. Estàs segura?",
          onConfirm: async () => {
            this.$emit("submit", this.form);
          },
          onCancel: () => {
            return false;
          },
        });
      
    },
  },
};
</script>
<style scoped>
.modal-card-body-min-height{
  min-height: 250px;
}
</style>