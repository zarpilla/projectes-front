<template>
  <b-modal v-model="isModalActive" has-modal-card @cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <div>
          <p class="modal-card-title">Entrada hores</p>
          <p v-if="headSubtitle" class="dedication-sub">{{ headSubtitle }}</p>
        </div>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body a-form dedication-form">
          <b-field label="Data" horizontal class="is-half">
            <b-datepicker
              v-model="form.date"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              :editable="true"
              trap-focus
            >
            </b-datepicker>
          </b-field>
          <b-field label="Hores" v-if="counter === null" horizontal class="is-half">
            <b-field>
              <b-input
                v-if="counter === null"
                v-model="form.hours"
                placeholder="Hores"
                name="hours"
                :disabled="counter !== null"
              />
            </b-field>
          </b-field>
          <b-field label="Començament" v-if="counter != null" horizontal class="is-half">
            <b-field>
              <b-input
                v-model="counterDisplayStartTime"
                placeholder="Hores"
                name="hours"
                :disabled="counter !== null"
              />
            </b-field>
          </b-field>
          <b-field label="Temps dedicat" v-if="counter != null" horizontal class="is-half">
            <b-field>
              <b-input
                v-model="counterDisplayTime"
                placeholder="Hores"
                name="hours"
                :disabled="counter !== null"
              />
            </b-field>
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
              @update:model-value="projectChanged()"
              :disabled="form.id > 0"
              :clearable="true"
            >
            </b-autocomplete>
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
                option =>
                  (form.users_permissions_user = option ? option.id : null)
              "
              :disabled="counter !== null"
              :clearable="true"
            >
            </b-autocomplete>
          </b-field>
          <b-field label="Descripció" horizontal>
            <b-field>
              <b-input
                v-model="form.description"
                placeholder="Descripció"
                name="description"
              />
            </b-field>
          </b-field>
          <b-field
            label="Tipus dedicació"
            class="has-check"
            horizontal
            v-if="!isLoading1 && dedicationTypes && hasDedications"
          >
            <radio-picker
              v-model="form.dedication_type"
              :options="dedicationTypes"
            ></radio-picker>
          </b-field>
          <b-field
            label="Funció"
            class="has-check"
            horizontal
            v-if="!isLoading2 && activityTypes && hasActivities"
          >
            <radio-picker
              v-model="form.activity_type"
              :options="activityTypes"
              @update:model-value="activityTypeChanged"
            ></radio-picker>
          </b-field>
          <b-field
            label="Tasca"
            class="has-check"
            horizontal
            v-if="!isLoading2 && hasTasks"
          >
            <radio-picker
              v-model="form.task"
              :options="tasksRadio"
            ></radio-picker>
          </b-field>
          <!-- <hr />
            <b-field horizontal>
              <b-field grouped>
                <div class="control">
                  <b-button native-type="submit" type="is-primary"
                    >Guardar</b-button
                  >
                </div>
              </b-field>
            </b-field> -->
        </section>
        <footer class="modal-card-foot">
          <button
            v-if="counter == null"
            class="button"
            type="button"
            @click="cancel"
          >
            Cancel·la
          </button>
          <button
            v-if="form.id > 0"
            class="button is-danger"
            type="button"
            @click="trashModal(form)"
          >
            Esborra
          </button>
          <button
            v-if="counter == null"
            class="button is-primary"
            :disabled="!enabled"
            native-type="submit"
          >
            D'acord
          </button>

          <button
            v-if="counter !== null"
            class="button is-danger"
            type="button"
            @click="trashModal(form)"
          >
            Elimina Comptador
          </button>
          <button
            v-if="counter !== null"
            class="button"
            type="button"
            @click="counterContinue"
          >
            Continua
          </button>
          <button
            v-if="counter !== null"
            class="button is-primary"
            :disabled="!enabled"
            native-type="submit"
          >
            Fi de l'activitat
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
import RadioPicker from "@/components/RadioPicker.vue";
import moment from "moment";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import ModalBox from "@/components/ModalBox.vue";
import TimeCounter from "@/components/TimeCounter.vue";
import { counterElapsed, relationId } from "@/service/timeCounter";

export default {
  name: "ModalBoxDedication",
  emits: ["cancel", "counter-continue", "delete", "submit"],
  components: { RadioPicker, ModalBox, TimeCounter },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    dedicationObject: {
      type: Object,
      default: null
    },
    projects: {
      type: Array,
      default: []
    },
    counter: {
      type: Object,
      default: null
    },
    users: {
      type: Array,
      default: []
    }
  },
  data() {
    return {
      isModalActive: false,
      isLoading1: false,
      isLoading2: false,
      hasDedications: false,
      hasActivities: false,
      hasTasks: false,
      form: {
        description: null,
        hours: null,
        date: null,
        project: null,
        users_permissions_user: null,
        dedication_type: null,
        activity_type: null,
        counter: null,
        uid_ical: null
      },
      // projects: [],
      dedicationTypes: {},
      activityTypes: {},
      tasksRadio: {},
      // users: [],
      userNameSearch: "",
      projectNameSearch: "",
      trashObject: null,
      isDeleteModalActive: false,
      counterDisplayTime: "",
      counterDisplayStartTime: "",
      counterDisplayTimeInHours: "",
      counterInterval: 0
    };
  },
  computed: {
    headSubtitle() {
      const parts = [];
      if (this.userNameSearch) parts.push(this.userNameSearch);
      if (this.form && this.form.date) parts.push(moment(this.form.date).format("dddd D [de] MMMM [de] YYYY"));
      return parts.join(" · ");
    },
    ...mapState(useMainStore, ["userName"]),
    enabled() {
      return (
        this.form.project &&
        this.form.hours &&
        this.form.date &&
        this.form.users_permissions_user
      );
    },
    filteredUsers() {
      return this.users.filter(option => {
        return (
          option.username
            .toString()
            .toLowerCase()
            .indexOf(this.userNameSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredProjects() {
      // active & not mother
      const projects = this.form.id
        ? this.projects
        : this.projects
            .filter(
              p =>
                p.project_state &&
                p.project_state.can_assign_activities === true
            )
            .filter(p => !p.is_mother);
      return projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectNameSearch.toLowerCase()) >= 0
        );
      });
    },
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    }
  },
  watch: {
    isActive(newValue) {
      this.isModalActive = newValue;
      if (newValue) {
        this.show();
      } else {
        this.cancel();
      }
    },
    dedicationObject(newValue) {
      // console.log('dedicationObject', newValue)
      // console.log('dedicationObject this', this.dedicationObject)
    }
  },
  methods: {
    show() {
      this.isLoading1 = true;
      this.isLoading2 = true;

      if (this.dedicationObject) {
        this.form.description = this.dedicationObject.description
          ? this.dedicationObject.description
          : null;
        this.form.date = this.dedicationObject.date
          ? moment(this.dedicationObject.date, "YYYY-MM-DD").toDate()
          : null;
        this.form.activity_type = this.dedicationObject.activity_type
          ? this.dedicationObject.activity_type.id
          : null;
        this.form.task = this.dedicationObject.task
          ? this.dedicationObject.task.id
          : null;
        this.form.dedication_type = this.dedicationObject.dedication_type
          ? this.dedicationObject.dedication_type.id
          : null;
        this.form.hours = this.dedicationObject.hours;
        this.form.project = this.dedicationObject.project
          ? this.dedicationObject.project.id
          : null;
        this.form.users_permissions_user = this.dedicationObject
          .users_permissions_user
          ? this.dedicationObject.users_permissions_user.id
          : null;
        this.form.uid_ical = this.dedicationObject.uid_ical;
        this.form.id = this.dedicationObject.id;
        this.userNameSearch = this.dedicationObject.users_permissions_user
          ? this.dedicationObject.users_permissions_user.username
          : "";
        this.projectNameSearch = this.dedicationObject.project
          ? this.dedicationObject.project.name
          : this.dedicationObject.uid_word
          ? this.dedicationObject.uid_word
          : "";

        this.form.counter = null;
        this.projectChanged();
      } else {
        this.form.description = null;
        this.form.date = moment().toDate();
        this.form.activity_type = null;
        this.form.task = null;
        this.form.dedication_type = null;
        this.form.hours = null;
        this.form.project = null;
        this.form.uid_ical = null;
        this.form.users_permissions_user = null;
        this.userNameSearch = "";
        this.projectNameSearch = "";
        this.form.id = 0;

        this.form.counter = null;

        if (this.counter) {
          this.form.counter = this.counter;
          // the choices kept on "Continua" (issues/051), ids or populated
          this.form.activity_type = relationId(this.counter.activity_type);
          this.form.dedication_type = relationId(this.counter.dedication_type);
          this.form.task = relationId(this.counter.task);
          if (this.counter.project && this.counter.project.id) {
            this.form.project = this.counter.project.id;
            this.projectNameSearch = this.counter.project.name;
            this.projectChanged({
              applyDefaultDedication: this.form.dedication_type === null
            });
          }
          if (this.counter.description) {
            this.form.description = this.counter.description;
          }
        }
      }
      service({ requiresAuth: true, cached: true })
        .get("dedication-types")
        .then(r => {
          this.hasDedications = false;
          for (var i in r.data) {
            this.dedicationTypes[r.data[i].id] = r.data[i].name;
            this.hasDedications = true;
          }
          this.isLoading1 = false;
        });

      const user = this.users.find(
        u => u.username.toLowerCase() === this.userName.toLowerCase()
      );
      if (user && user.id && this.form.users_permissions_user === null) {
        this.userNameSearch = user.username;
        this.form.users_permissions_user = user.id;
      }

      if (this.counter) {
        this.doCounter();
      }
    },
    doCounter() {
      this.counterInterval = setInterval(() => {
        const elapsed = counterElapsed(this.counter);
        if (!elapsed) {
          return;
        }
        this.counterDisplayTime = elapsed.display;
        this.counterDisplayStartTime = elapsed.start.format("DD/MM/YYYY HH:mm:ss");
        this.form.hours = elapsed.inHours.toFixed(3);
      }, 1000);
    },
    cancel() {
      clearInterval(this.counterInterval);
      this.$emit("cancel");
    },
    submit() {
      // console.log('this.form.date', this.form)
      // if (typeof this.form.date.getMonth === 'function') {
      //   this.form.date = moment(this.form.date).format('YYYY-MM-DD')
      // }
      clearInterval(this.counterInterval);
      this.$emit("submit", this.form);
    },
    // Picking a Funció only filters the tasks: it must not reset the
    // dedication type to the project's default (issues/051)
    activityTypeChanged() {
      return this.projectChanged({ applyDefaultDedication: false });
    },
    async projectChanged({ applyDefaultDedication = true } = {}) {
      if (this.form.project) {
        this.isLoading2 = true;
        const project = this.projects.find(p => p.id === this.form.project);

        this.activityTypes = {};
        this.hasActivities = false;
        project.global_activity_types.forEach(a => {
          this.activityTypes[a.id] = a.name;
          this.hasActivities = true;
        });
        
        if (!this.form.id && applyDefaultDedication) {
          if (
            project.default_dedication_type &&
            project.default_dedication_type.id &&
            this.form.dedication_type == null
          ) {
            this.form.dedication_type = project.default_dedication_type.id;
          } else if (
            project.default_dedication_type === null &&
            this.form.dedication_type == null
          ) {
            this.form.dedication_type = null;
          } else if (project.default_dedication_type) {
            this.form.dedication_type = relationId(
              project.default_dedication_type
            );
          }
        }

        this.hasTasks = false;
        this.tasksRadio = {};
        if (project && project.id) {
          let query = "tasks?_limit=-1&_where[archived_eq]=false";
          query += "&_where[project_eq]=" + project.id;
          let tasks = (await service({ requiresAuth: true }).get(query)).data;
          this.tasksRadio = { 0: "Cap" };
          if (this.form.activity_type) {
            tasks = tasks.filter(
              t =>
                t.activity_type === null ||
                (t.activity_type &&
                  t.activity_type.id &&
                  t.activity_type.id.toString() ===
                    this.form.activity_type.toString())
            );
          }
          tasks.forEach(t => {
            this.tasksRadio[t.id] = t.name;
            this.hasTasks = true;
          });
        }

        this.isLoading2 = false;
      }
      if (this.counter !== null) {
      }
    },
    counterContinue() {
      this.$emit("counter-continue", {
        counter: this.counter,
        project: this.form.project,
        description: this.form.description,
        activity_type: this.form.activity_type,
        dedication_type: this.form.dedication_type,
        task: this.form.task
      });
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
      if (this.counter) {
        this.$emit("delete", { counter: this.counter });
      } else {
        this.$emit("delete", this.form);
      }
      clearInterval(this.counterInterval);
    },
    updateCounter(info) {
      console.log("updateCounter", info);
    }
  }
};
</script>
<style>
.modal-card-dedication .field:not(:last-child) {
  margin-bottom: 1.5rem;
}
.modal-card-dedication .modal-card-body {
  max-height: calc(100vh - 200px);
}
/* Redesign A: labels on top, date and hours side by side */
.modal-card-dedication .dedication-form {
  gap: 1rem 1.25rem;
}
.modal-card-dedication .dedication-form > .field {
  margin-bottom: 0 !important;
}
.modal-card-dedication .dedication-form > .field.is-half {
  grid-column: auto;
}
.modal-card-dedication .modal-card-foot {
  justify-content: flex-end;
}
.modal-card-dedication .dedication-sub {
  margin-top: .125rem;
  font-size: .875rem;
  color: var(--a-muted);
}
@media screen and (max-width: 768px) {
  .modal-card-dedication .dedication-form > .field.is-half {
    grid-column: 1 / -1;
  }
}
</style>
