<template>
  <div>
    <modal-box
      :is-active="isModalActive"
      :trash-object-name="trashObjectName"
      :message="'S\'esborrarà permanentment el projecte'"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />
    <b-table
      :key="editMode ? 'projects-table-edit' : 'projects-table-view'"
      :checked-rows.sync="checkedRows"
      :checkable="checkable"
      :loading="isLoading"
      :paginated="paginated"
      :per-page="perPage"
      :striped="false"
      :hoverable="false"
      :data="projectsData"
    >
      <template v-if="!editMode">
        <b-table-column label="Nom" field="name" sortable v-slot="props">
          <router-link
            :to="{ name: 'project.edit', params: { id: props.row.id } }"
          >
            <span class="project-name has-text-info">
              {{ props.row.name }}
            </span>
          </router-link>
        </b-table-column>
        <b-table-column
          label="Coordina"
          field="leader.username"
          sortable
          v-slot="props"
        >
          {{ props.row.leader ? props.row.leader.username : "" }}
        </b-table-column>
        <b-table-column
          label="Àmbit"
          field="project_scope.name"
          sortable
          v-slot="props"
        >
          {{ props.row.project_scope ? props.row.project_scope.name : "" }}
        </b-table-column>
        <b-table-column
          label="Hores dedicades"
          field="total_real_hours"
          sortable
          numeric
          v-slot="props"
        >
          {{
            props.row.total_real_hours
              ? props.row.total_real_hours.toFixed(2)
              : ""
          }}
        </b-table-column>
        <b-table-column
          label="Hores previstes"
          field="total_estimated_hours"
          sortable
          numeric
          v-slot="props"
        >
          {{
            props.row.total_estimated_hours
              ? props.row.total_estimated_hours.toFixed(2)
              : ""
          }}
        </b-table-column>
        <b-table-column
          label="Resultat executat"
          field="total_real_incomes_expenses"
          sortable
          numeric
          v-slot="props"
        >
          {{
            formatPrice(
              props.row.total_real_incomes -
                props.row.total_real_expenses -
                props.row.total_real_hours_price -
                props.row.total_real_expenses_vat || 0
            )
          }}
          €
        </b-table-column>
        <b-table-column
          label="Resultat previst"
          field="incomes_expenses"
          sortable
          numeric
          v-slot="props"
        >
          {{
            formatPrice(
              props.row.incomes_expenses ||
                props.row.estimated_incomes_expenses ||
                0
            )
          }}
          €
        </b-table-column>
        <b-table-column
          label="Estat"
          v-slot="props"
          sortable
          field="project_state.name"
        >
          {{ props.row.project_state ? props.row.project_state.name : "" }}
        </b-table-column>
        <b-table-column label="Clienta" field="clients.name" v-slot="props">
          {{
            props.row.clients && props.row.clients.length
              ? props.row.clients[0].name
              : ""
          }}
        </b-table-column>
        <b-table-column
          label="Modificat"
          field="updated_at"
          sortable
          v-slot="props"
          date
        >
          <span :title="props.row.updated_at | formatDateTime">{{
            props.row.updated_at | formatDate
          }}</span>
        </b-table-column>
      </template>

      <template v-else>
        <b-table-column label="Nom" field="name" sortable v-slot="props">
          <template v-if="isEditingRow(props.row.id)">
            <b-input v-model="editingForm.name" />
          </template>
          <template v-else>
            <router-link
              :to="{ name: 'project.edit', params: { id: props.row.id } }"
            >
              <span class="project-name has-text-info">
                {{ props.row.name }}
              </span>
            </router-link>
          </template>
        </b-table-column>

        <b-table-column
          label="Coordina"
          field="leader.username"
          sortable
          v-slot="props"
        >
          <template v-if="isEditingRow(props.row.id)">
            <b-select v-model="editingForm.leader" placeholder="Coordina">
              <option value="0">--</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.username }}
              </option>
            </b-select>
          </template>
          <template v-else>
            {{ props.row.leader ? props.row.leader.username : "" }}
          </template>
        </b-table-column>

        <b-table-column
          label="Àmbit"
          field="project_scope.name"
          sortable
          v-slot="props"
        >
          <template v-if="isEditingRow(props.row.id)">
            <b-select v-model="editingForm.project_scope" placeholder="Àmbit">
              <option v-for="scope in scopes" :key="scope.id" :value="scope.id">
                {{ scope.name }}{{ scope.group ? ` - ${scope.group}` : "" }}
              </option>
            </b-select>
          </template>
          <template v-else>
            {{ props.row.project_scope ? props.row.project_scope.name : "" }}
          </template>
        </b-table-column>

        <b-table-column
          label="Estat"
          field="project_state.name"
          sortable
          v-slot="props"
        >
          <template v-if="isEditingRow(props.row.id)">
            <b-select v-model="editingForm.project_state" placeholder="Estat">
              <option
                v-for="state in editableProjectStates"
                :key="state.id"
                :value="state.id"
              >
                {{ state.name }}
              </option>
            </b-select>
          </template>
          <template v-else>
            {{ props.row.project_state ? props.row.project_state.name : "" }}
          </template>
        </b-table-column>

        <b-table-column
          label="Inici"
          field="date_start"
          sortable
          v-slot="props"
        >
          <template v-if="isEditingRow(props.row.id)">
            <b-datepicker
              v-model="editingForm.date_start"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              trap-focus
              editable
            />
          </template>
          <template v-else>
            {{ props.row.date_start | formatDate }}
          </template>
        </b-table-column>

        <b-table-column label="Final" field="date_end" sortable v-slot="props">
          <template v-if="isEditingRow(props.row.id)">
            <b-datepicker
              v-model="editingForm.date_end"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              trap-focus
              editable
            />
          </template>
          <template v-else>
            {{ props.row.date_end | formatDate }}
          </template>
        </b-table-column>

        <b-table-column
          label="Tipus"
          field="project_type.name"
          sortable
          v-slot="props"
        >
          <template v-if="isEditingRow(props.row.id)">
            <b-select v-model="editingForm.project_type" placeholder="Tipus">
              <option value="0">--</option>
              <option
                v-for="type in projectTypes"
                :key="type.id"
                :value="type.id"
              >
                {{ type.name }}
              </option>
            </b-select>
          </template>
          <template v-else>
            {{ props.row.project_type ? props.row.project_type.name : "" }}
          </template>
        </b-table-column>

        <b-table-column
          label="Estructura"
          field="structural_expenses"
          sortable
          v-slot="props"
        >
          <template v-if="isEditingRow(props.row.id)">
            <b-switch v-model="editingForm.structural_expenses" />
          </template>
          <template v-else>
            {{ props.row.structural_expenses ? "Sí" : "No" }}
          </template>
        </b-table-column>

        <b-table-column
          label="Subvencionable"
          field="grantable"
          sortable
          v-slot="props"
        >
          <template v-if="isEditingRow(props.row.id)">
            <b-switch v-model="editingForm.grantable" />
          </template>
          <template v-else>
            {{ props.row.grantable ? "Sí" : "No" }}
          </template>
        </b-table-column>
      </template>

      <b-table-column
        v-if="editMode"
        custom-key="actions"
        cell-class="is-actions-cell"
        v-slot="props"
      >
        <div class="buttons is-right">
          <button
            class="button is-small is-primary"
            type="button"
            :disabled="
              savingRowId === props.row.id ||
                (editingRowId !== null && editingRowId !== props.row.id)
            "
            @click.prevent="toggleRowEdit(props.row)"
          >
            <b-icon
              :icon="isEditingRow(props.row.id) ? 'content-save' : 'pencil'"
              size="is-small"
            />
          </button>
          <button
            class="button is-small is-danger"
            type="button"
            :disabled="editingRowId !== null"
            @click.prevent="trashModal(props.row)"
          >
            <b-icon icon="trash-can" size="is-small" />
          </button>
        </div>
      </b-table-column>

      <section slot="empty" class="section">
        <div class="content has-text-grey has-text-centered">
          <template v-if="isLoading">
            <p>
              <b-icon icon="dots-horizontal" size="is-large" />
            </p>
            <p>Fetching data...</p>
          </template>
          <template v-else>
            <p>
              <b-icon icon="emoticon-sad" size="is-large" />
            </p>
            <p>Nothing's here&hellip;</p>
          </template>
        </div>
      </section>
    </b-table>
  </div>
</template>

<script>
import ModalBox from "@/components/ModalBox";
import service from "@/service/index";
import moment from "moment";

export default {
  name: "ProjectsTable",
  components: { ModalBox },
  props: {
    dataUrl: {
      type: String,
      default: null
    },
    checkable: {
      type: Boolean,
      default: false
    },
    project_state: {
      type: Number,
      default: 1
    },
    projects: {
      type: Array,
      default: null
    },
    users: {
      type: Array,
      default: () => []
    },
    projectStates: {
      type: Array,
      default: () => []
    },
    projectTypes: {
      type: Array,
      default: () => []
    },
    scopes: {
      type: Array,
      default: () => []
    },
    editMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isModalActive: false,
      trashObject: null,
      projectsData: [],
      isLoading: false,
      paginated: false,
      perPage: 10,
      checkedRows: [],
      project_states: [],
      editingRowId: null,
      editingForm: null,
      savingRowId: null
    };
  },
  watch: {
    // project_state: function (newVal, oldVal) {
    //   console.log('newVal', newVal)
    //   this.getProjects()
    // },
    projects: function(newVal, oldVal) {
      // console.log('newVal', newVal)
      // this.setProjects(newVal)
      this.projectsData = this.projects;
    },
    editMode: function(newVal) {
      if (!newVal) {
        this.cancelRowEdit();
      }
    }
  },
  computed: {
    editableProjectStates() {
      return this.projectStates.filter(s => s.id !== 0);
    },
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    }
  },
  mounted() {
    // this.getProjects()
  },
  methods: {
    isEditingRow(rowId) {
      return this.editingRowId === rowId;
    },
    parseDate(value) {
      if (!value) {
        return null;
      }
      if (value instanceof Date) {
        return value;
      }
      const parsed = moment(value, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
      return parsed.isValid() ? parsed.toDate() : null;
    },
    formatDateForApi(value) {
      if (!value) {
        return null;
      }
      return moment(value).format("YYYY-MM-DD");
    },
    startRowEdit(row) {
      this.editingRowId = row.id;
      this.editingForm = {
        id: row.id,
        name: row.name || "",
        leader: row.leader && row.leader.id ? row.leader.id : 0,
        project_state:
          row.project_state && row.project_state.id ? row.project_state.id : 0,
        project_scope:
          row.project_scope && row.project_scope.id ? row.project_scope.id : 0,
        project_type:
          row.project_type && row.project_type.id ? row.project_type.id : 0,
        date_start: this.parseDate(row.date_start),
        date_end: this.parseDate(row.date_end),
        structural_expenses: !!row.structural_expenses,
        grantable: !!row.grantable
      };
    },
    cancelRowEdit() {
      this.editingRowId = null;
      this.editingForm = null;
    },
    async toggleRowEdit(row) {
      if (this.isEditingRow(row.id)) {
        await this.saveRowEdit(row);
        return;
      }
      this.startRowEdit(row);
    },
    async saveRowEdit(row) {
      if (!this.editingForm) {
        return;
      }

      this.savingRowId = row.id;
      const payload = {
        name: this.editingForm.name,
        leader: this.editingForm.leader > 0 ? this.editingForm.leader : null,
        project_state:
          this.editingForm.project_state > 0
            ? this.editingForm.project_state
            : null,
        project_scope:
          this.editingForm.project_scope > 0
            ? this.editingForm.project_scope
            : null,
        project_type:
          this.editingForm.project_type > 0
            ? this.editingForm.project_type
            : null,
        date_start: this.formatDateForApi(this.editingForm.date_start),
        date_end: this.formatDateForApi(this.editingForm.date_end),
        structural_expenses: !!this.editingForm.structural_expenses,
        grantable: !!this.editingForm.grantable
      };

      try {
        await service({ requiresAuth: true }).put(
          `projects/${row.id}`,
          payload
        );

        const leader = this.users.find(u => u.id === payload.leader) || null;
        const projectState =
          this.projectStates.find(s => s.id === payload.project_state) || null;
        const scope =
          this.scopes.find(s => s.id === payload.project_scope) || null;
        const projectType =
          this.projectTypes.find(t => t.id === payload.project_type) || null;

        this.projectsData = this.projectsData.map(p => {
          if (p.id !== row.id) {
            return p;
          }
          return {
            ...p,
            name: payload.name,
            leader,
            project_state: projectState,
            project_scope: scope,
            project_type: projectType,
            date_start: payload.date_start,
            date_end: payload.date_end,
            structural_expenses: payload.structural_expenses,
            grantable: payload.grantable
          };
        });

        this.$emit("project-updated", row.id);
        this.$buefy.snackbar.open({
          message: "Guardat",
          queue: false
        });
        this.cancelRowEdit();
      } finally {
        this.savingRowId = null;
      }
    },
    // getProjects () {
    //   const where = this.project_state > 0 ? `&project_state=${this.project_state}` : ''
    //   service({ requiresAuth: true }).get(`projects?_limit=-1${where}`).then((r) => {
    //     this.projects = r.data.filter(p => p.project_state !== 2).map(d => {
    //       const realTotalIncomes = sumBy(d.emitted_invoices, 'total_base')
    //       const realTotalExpenses = sumBy(d.received_invoices, 'total_base') + sumBy(d.diets, 'total_base') + sumBy(d.tickets, 'total_base')
    //       return {
    //         ...d,
    //         activities_hours: sumBy(d.activities, 'hours'),
    //         real_total_incomes: realTotalIncomes,
    //         real_total_expenses: realTotalExpenses,
    //         real_incomes_expenses: realTotalIncomes - realTotalExpenses,
    //         created_at_dt: moment(d.created_at).format('DD-MM-YYYY HH:mm')
    //       }
    //     })
    //     console.log('this.projects', this.projects)
    //   })
    // },
    // setProjects (projects) {
    //   this.projects = projects
    // },
    trashModal(trashObject) {
      this.trashObject = trashObject;
      this.isModalActive = true;
    },
    async trashConfirm() {
      this.isModalActive = false;

      await service({
        requiresAuth: true
      }).put(`projects/${this.trashObject.id}`, { published_at: null });
      // await service({ requiresAuth: true }).delete(`projects/${this.trashObject.id}`)
      this.projectsData = this.projectsData.filter(
        p => p.id !== this.trashObject.id
      );
      this.$buefy.snackbar.open({
        message: "Esborrat",
        queue: false
      });
    },
    trashCancel() {
      this.isModalActive = false;
    },
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
  },
  filters: {
    formatDateTime(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("DD/MM/YYYY HH:mm");
    },
    formatDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("DD/MM/YYYY");
    }
  }
};
</script>
<style scoped>
.project-name {
  font-weight: bold;
}
</style>
