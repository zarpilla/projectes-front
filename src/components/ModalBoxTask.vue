<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dedication modal-card-task">
      <header class="modal-card-head">
        <p class="modal-card-title">Tasca</p>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body">
          <b-field label="Nom">
            <b-input
              v-model="form.name"
              placeholder="Nom"
              name="name"
              required
            />
          </b-field>
          <b-field label="Documents" style="width: 100%">
            <div
              class="file-documents columns is-multiline"
              v-if="form.documents && form.documents.length"
            >
              <!-- <pre>{{ form.documents }}</pre>   -->
              <div
                v-for="(doc, i) in form.documents"
                :key="i"
                class="column"
                :class="
                  form.documents.length > 6
                    ? 'is-2'
                    : form.documents.length > 3
                    ? 'is-3'
                    : 'is-4'
                "
              >
                <div class="column-doc">
                  <div @click="removeImage(doc)" class="remove-button">
                    <b-icon icon="close" size="is-medium" />
                  </div>
                  <img
                    v-if="doc.mime.startsWith('image')"
                    :src="apiUrl + doc.url"
                    class="file-document mb-3"
                  />
                  <div v-else class="mb-3">
                    <a :href="apiUrl + doc.url" target="_blank">
                      <b-icon icon="open-in-new"></b-icon>
                      {{ doc.name }}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </b-field>
          <file-upload
            :multiple="true"
            :entity="'task'"
            :ref-id="form.id"
            :field="'documents'"
            :accept="'*/*'"
            @uploaded="uploaded"
            v-if="form.id"
          >
          </file-upload>

          <b-field label="Data límit" class="datepickers">
            <b-datepicker
              v-model="form.due_date"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              trap-focus
            >
            </b-datepicker>
          </b-field>
          <b-field label="Persones">
            <b-autocomplete
              v-model="userNameSearch"
              placeholder="Persona"
              :keep-first="false"
              :open-on-focus="true"
              :data="filteredUsers"
              field="username"
              @select="(option) => addUser(option)"
              :clearable="true"
            >
            </b-autocomplete>
          </b-field>
          <b-field label="">
            <div class="list">
              <ul class="ulist">
                <li
                  v-for="(user, i) in form.users_permissions_users"
                  :key="i"
                  @click="removeUser(user)"
                  class="tag is-primary mr-1"
                >
                  {{ user.username }}
                  <b-button class="no-button" icon-left="close-circle" />
                </li>
              </ul>
            </div>
          </b-field>

          <b-field label="Projecte">
            <b-autocomplete
              v-model="projectSearch"
              placeholder="Projecte"
              :keep-first="false"
              :open-on-focus="true"
              :data="filteredProject"
              field="name"
              @select="(option) => projectSelected(option)"
              :clearable="!(taskObject && taskObject.project)"
              :disabled="taskObject && taskObject.project"
            >
            </b-autocomplete>
          </b-field>

          <b-field
            label="Estat"
            class="has-check"
            v-if="!isLoading2 && taskStates"
          >
            <radio-picker
              v-model="form.task_state"
              :options="taskStates"
            ></radio-picker>
          </b-field>

          <b-field label="Checklist"> </b-field>
          <div
            v-for="(check, j) in form.checklist"
            :key="j"
            class="columns is-multiline is-full mb-2 zis-flex"
          >
            <div class="column is-5 is-flex">
              <b-checkbox v-model="check.done" class="checkbox-inline">
              </b-checkbox>
              <b-input class="check-name is-full" v-model="check.name" />
            </div>
            <div class="column is-3">
              <b-datepicker
                v-model="check.due_date"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                placeholder=""
              >
              </b-datepicker>
            </div>
            <div class="column is-2">
              <b-autocomplete
                v-model="check.user.username"
                placeholder="Persona"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsersCheck"
                field="username"
                @select="(option) => addUserCheck(option, check)"
                :clearable="true"
              >
              </b-autocomplete>
            </div>
            <div class="column is-2">
              <button
                class="button is-small is-danger zml-2 mt-1"
                type="button"
                title="Elimina"
                @click.prevent="removePhase(j)"
              >
                <b-icon icon="trash-can" size="is-small" />
              </button>
              <button
                class="button is-small is-warning ml-2 mt-1"
                type="button"
                @click.prevent="duplicatePhase(j)"
                title="Duplica"
              >
                <b-icon icon="arrow-split-horizontal" size="is-small" />
              </button>
            </div>
          </div>

          <form @submit.prevent="addPhase">
            <b-field label="" class="mt-5 mb-5">
              <b-input
                placeholder="Nova subtasca al checklist..."
                v-model="checklistToAdd"
                icon-right="plus-circle"
                icon-right-clickable
                @icon-right-click="addPhase"
              >
              </b-input>
            </b-field>
          </form>

          <b-field
            label="Funció"
            class="has-check"
            v-if="!isLoading2 && activityTypes && hasActivities"
          >
            <radio-picker
              v-model="form.activity_type"
              :options="activityTypes"
            ></radio-picker>
          </b-field>
          <b-field label="Descripció">
            <b-input
              type="textarea"
              v-model="form.description"
              placeholder="Descripció"
            />
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
            :disabled="!form.name"
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
import RadioPicker from "@/components/RadioPicker";
import FileUpload from "@/components/FileUpload";

export default {
  name: "ModalBoxTask",
  components: { ModalBox, RadioPicker, FileUpload },
  props: {
    isActive: {
      type: Boolean,
      default: false,
    },
    taskObject: {
      type: Object,
      default: null,
    },
    users: {
      type: Array,
      default: [],
    },
    projects: {
      type: Array,
      default: [],
    },
    project: {
      type: Number,
      default: null,
    },
    states: {
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
        name: null,
        description: null,
        due_date: null,
        task_state: null,
        users_permissions_users: [],
        project: null,
        archived: null,
        activity_type: null,
      },
      form0: {
        name: null,
        description: null,
        due_date: null,
        task_state: null,
        users_permissions_users: [],
        project: null,
        archived: null,
        activity_type: null,
      },
      trashObject: null,
      isDeleteModalActive: false,
      userNameSearch: "",
      userNameCheckSearch: "",
      projectSearch: "",
      initializing: true,
      activity_types: [],
      activityTypes: {},
      taskStates: {},
      apiUrl: process.env.VUE_APP_API_URL,
      checklistToAdd: "",
    };
  },
  computed: {
    ...mapState(["userName"]),
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
    filteredUsersCheck() {
      return this.users.filter((option) => {
        return (
          option.username
            .toString()
            .toLowerCase()
            .indexOf(this.userNameCheckSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredProject() {
      return this.projects.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
      });
    },
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
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
    show() {
      this.initializing = true;
      // console.log('this.taskObject',this.taskObject)

      if (!this.taskObject) {
        return;
      }

      this.states.forEach((s) => {
        this.taskStates[s.id] = s.name;
      });

      this.form = JSON.parse(JSON.stringify(this.taskObject));

      if (this.taskObject && this.taskObject.id) {
        this.form.id = this.taskObject.id;
      } else {
        this.form.id = -1;
        // this.form = JSON.parse(JSON.stringify(this.taskObject))
      }

      this.isLoading2 = true;

      if (this.form.task_state.id) {
        this.form.task_state = this.form.task_state.id;
      }

      this.activity_types = [];
      this.activityTypes = {};

      if (this.form.project && this.form.project.name) {
        this.loadActivityTypes();

        this.projectSearch = this.form.project.name;
        this.form.project = this.form.project.id;
      } else {
        this.projectSearch = "";
        this.form.project = null;
      }
      if (this.form.due_date) {
        this.form.due_date = moment(this.form.due_date, "YYYY-MM-DD").toDate();
      } else {
        this.form.due_date = null;
      }

      if (this.form.checklist.length) {
        this.form.checklist = this.form.checklist.map((c) => {
          return {
            ...c,
            due_date: c.due_date
              ? moment(c.due_date, "YYYY-MM-DD").toDate()
              : null,
            user: c.user || "",
          };
        });
      }

      setTimeout(() => {
        this.isLoading2 = false;
      }, 100);

      this.initializing = false;
    },
    cancel() {
      this.isModalActive = false;
      this.$emit("cancel");
    },
    submit() {
      const form = JSON.parse(JSON.stringify(this.form));

      form.checklist = form.checklist.map((c) => {
          return {
            ...c,
            user: c.user || null,
          };
        });

      if (this.form.due_date) {
        form.due_date = moment(this.form.due_date).format("YYYY-MM-DD");
      }
      if (this.form.activity_type && !this.form.activity_type.id) {
        this.form.activity_type = null;
      }
      this.$emit("submit", form);
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
    loadActivityTypes() {
      this.activity_types = [];
      this.activityTypes = {};

      if (this.form.project.id && !this.form.project.activity_types) {
        const project = this.projects.find(
          (p) => p.id === this.form.project.id
        );
        if (project) {
          this.form.project.activity_types = project.activity_types;
        }
      }

      if (
        this.form.project.activity_types &&
        this.form.project.activity_types.length
      ) {
        this.activity_types = this.form.project.activity_types;
        this.hasActivities = false;
        this.isLoading2 = true;
        this.activityTypes = {};
        this.form.project.activity_types.forEach((a) => {
          this.activityTypes[a.id] = a.name;
          this.hasActivities = true;
        });
        if (!this.hasActivities) {
          this.activityTypes = { 0: "Cap" };
        }

        if (this.form.activity_type && this.form.activity_type.id) {
          this.form.activity_type = this.form.activity_type.id;
        }
      }
    },
    projectSelected(option) {
      if (!option) {
        return;
      }
      const project = option | null;
      this.form.project = option;
      this.isLoading2 = true;
      this.loadActivityTypes();

      setTimeout(() => {
        this.isLoading2 = false;
      }, 100);
    },
    addUser(user) {
      // console.log('addUser', user)
      if (!user) {
        return;
      }
      const existing = this.form.users_permissions_users.find(
        (u) => u.id === user.id
      );
      if (!existing) {
        this.form.users_permissions_users.push(user);
      }
      this.userNameSearch = "";
      setTimeout(() => {
        this.userNameSearch = "";
      }, 100);
    },
    addUserCheck(user, check) {
      console.log("addUser", user);
      if (!user) {
        return;
      }

      check.user = user;
      // const existing = check.users.find(
      //   (u) => u.id === user.id
      // );
      // if (!existing) {
      //   this.check.users.push(user);
      // }

      this.userNameCheckSearch = "";
      setTimeout(() => {
        this.userNameCheckSearch = "";
      }, 100);
    },
    removeUser(user) {
      this.form.users_permissions_users =
        this.form.users_permissions_users.filter((u) => u.id !== user.id);
    },
    async uploaded(info) {
      // console.log('uploaded', info)

      if (info.refId && info.refId > 0) {
        const task = (
          await service({ requiresAuth: true }).get(`tasks/${info.refId}`)
        ).data;
        // console.log('task', task)
        this.form.documents = task.documents;
      } else {
        console.log("info", info);
        this.form.documents = info.documents;
      }
    },
    removeImage(doc) {
      this.form.documents = this.form.documents.filter((d) => d.id !== doc.id);
    },
    addPhase() {
      this.needsUpdate = true;
      this.form.checklist.push({
        name: this.checklistToAdd,
        done: false,
        user: '',
        due_date: null,
      });
      this.checklistToAdd = "";
      // this.$emit('phases-updated', { phases: this.phases, projectId: this.form.id })
    },
    removePhase(i) {
      this.needsUpdate = true;
      this.form.checklist = this.form.checklist.filter((p, j) => i !== j);
    },
    duplicatePhase(i) {
      const elem = { ...this.form.checklist[i] }
      delete elem.id
      this.form.checklist.push(elem)
    }
  },
};
</script>
<style>
@media screen and (min-width: 769px) {
  .modal-card-task {
    width: 50vw;
  }
}
.modal-card-dedication .field:not(:last-child) {
  margin-bottom: 1rem;
}
.modal-card-dedication .datepickers .field {
  margin-bottom: 0;
}
.modal-card-dedication .modal-card-body {
  max-height: calc(100vh - 200px);
}
.flex-item {
  max-width: 30%;
}
.column-doc {
  position: relative;
}
.column-doc .remove-button .icon {
  position: absolute;
  right: -4px;
  top: -15px;
  cursor: pointer;
  border: 1px solid #999;
  border-radius: 50%;
  padding: 5px;
  z-index: 10;
}
.column-doc .icon:hover {
  color: #333;
}
.column-doc img {
  border: 1px solid #eee;
}
.check-name {
  vertical-align: 4px;
  display: inline-block;
}
.is-full-input,
.is-full-input .input {
  width: calc(100% - 50px);
}
.check-name.is-full {
  width: calc(100%);
}
.xcolumns {
  width: 100%;
}
</style>
