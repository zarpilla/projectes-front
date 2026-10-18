<template>
  <div>
    <modal-box
      :is-active="isModalActive"
      :trash-object-name="trashObjectName"
      v-bind="projectTrashDialog"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />
    <b-table
      :key="editMode ? 'projects-table-edit' : 'projects-table-view'"
      v-model:checked-rows="checkedRows"
      :checkable="checkable"
      :loading="isLoading"
      :paginated="paginated"
      :per-page="perPage"
      :striped="false"
      :hoverable="false"
      :data="projectsData"
      pagination-position="bottom"
      :mobile-cards="false"
      aria-next-label="Pàgina següent"
      aria-previous-label="Pàgina anterior"
      aria-page-label="Pàgina"
      aria-current-label="Pàgina actual"
    >
      <template v-if="!editMode">
        <b-table-column label="Nom" field="name" sortable v-slot="props" cell-class="project-name-cell">
          <router-link
            :to="{ name: 'project.edit', params: { id: props.row.id } }"
            class="project-name"
            :title="props.row.name"
          >
            {{ props.row.name }}
          </router-link>
          <span class="project-subline">
            {{ props.row.clients && props.row.clients.length ? props.row.clients[0].name : "Sense clienta" }}
          </span>
        </b-table-column>
        <b-table-column
          label="Coordina"
          field="leader.username"
          sortable
          v-slot="props"
          cell-class="is-nowrap"
        >
          {{ props.row.leader ? props.row.leader.username : "" }}
        </b-table-column>
        <b-table-column
          label="Àmbit"
          field="project_scope.name"
          sortable
          v-slot="props"
        >
          <span v-if="props.row.project_scope" class="tag">{{ props.row.project_scope.name }}</span>
        </b-table-column>
        <b-table-column
          label="Hores fetes / previstes"
          field="total_real_hours"
          sortable
          v-slot="props"
          cell-class="hours-cell"
        >
          <div class="hours-line">
            <b>{{ formatHours(props.row.total_real_hours || 0) }}</b>
            <span>{{ props.row.total_estimated_hours ? "/ " + formatHours(props.row.total_estimated_hours) : "sense previsió" }}</span>
          </div>
          <div class="hours-bar" :title="hoursPercent(props.row) === null ? '' : hoursPercent(props.row) + ' %'">
            <span :class="{ over: hoursPercent(props.row) > 100 }" :style="{ width: Math.min(100, hoursPercent(props.row) || 0) + '%' }"></span>
          </div>
        </b-table-column>
        <b-table-column
          label="Resultat executat"
          field="total_real_incomes_expenses"
          sortable
          numeric
          v-slot="props"
        >
          <span class="amount" :class="'has-text-' + sign(props.row.total_real_incomes_expenses)">
            {{ formatMoney(props.row.total_real_incomes_expenses) }}
          </span>
        </b-table-column>
        <b-table-column
          label="Resultat previst"
          field="incomes_expenses"
          sortable
          numeric
          v-slot="props"
        >
          <span class="amount" :class="'has-text-' + sign(estimatedResult(props.row))">
            {{ formatMoney(estimatedResult(props.row)) }}
          </span>
        </b-table-column>
        <b-table-column
          label="Estat"
          v-slot="props"
          sortable
          field="project_state.name"
          :visible="!project_state"
        >
          <span v-if="props.row.project_state" class="tag">{{ props.row.project_state.name }}</span>
        </b-table-column>
        <b-table-column
          label="Modificat"
          field="updated_at"
          sortable
          v-slot="props"
          date
          numeric
        >
          <span :title="formatDateTime(props.row.updated_at)">{{
            formatDate(props.row.updated_at)
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
          label="Probabilitat"
          field="project_likelihood.name"
          sortable
          v-slot="props"
        >
          <template v-if="isEditingRow(props.row.id)">
            <b-select
              v-model="editingForm.project_likelihood"
              placeholder="Probabilitat"
            >
              <option
                v-for="likelihood in projectLikelihoods"
                :key="likelihood.id"
                :value="likelihood.id"
              >
                {{ likelihood.name }}
              </option>
            </b-select>
          </template>
          <template v-else>
            {{
              props.row.project_likelihood
                ? props.row.project_likelihood.name
                : ""
            }}
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
            {{ formatDate(props.row.date_start) }}
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
            {{ formatDate(props.row.date_end) }}
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

      <template #empty>
        <section class="section">
          <div class="content has-text-grey has-text-centered">
            <template v-if="isLoading">
              <p>
                <b-icon icon="dots-horizontal" size="is-large" />
              </p>
              <p>Carregant dades...</p>
            </template>
            <template v-else>
              <p>
                <b-icon icon="emoticon-sad" size="is-large" />
              </p>
              <p>No hi ha projectes amb aquests filtres</p>
            </template>
          </div>
        </section>
      </template>
      <template v-if="!editMode && projectsData.length" #footer>
        <th>Total · {{ projectsData.length }} projectes</th>
        <th></th>
        <th></th>
        <th class="hours-cell">
          {{ formatHours(totals.realHours) }}
          <span class="has-text-muted">/ {{ formatHours(totals.estimatedHours) }}</span>
        </th>
        <th class="has-text-right" :class="'has-text-' + sign(totals.realResult)">{{ formatMoney(totals.realResult) }}</th>
        <th class="has-text-right" :class="'has-text-' + sign(totals.estimatedResult)">{{ formatMoney(totals.estimatedResult) }}</th>
        <th v-if="!project_state"></th>
        <th></th>
      </template>
    </b-table>
  </div>
</template>

<script>
import ModalBox from "@/components/ModalBox.vue";
import { projectTrashDialog } from "@/domain/projectTrash";
import service from "@/service/index";
import moment from "moment";
import { formatHours, formatMoney, sign } from "@/helpers/format-number";

export default {
  name: "ProjectsTable",
  emits: ["project-updated"],
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
    projectLikelihoods: {
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
      projectTrashDialog,
      isModalActive: false,
      trashObject: null,
      projectsData: [],
      isLoading: false,
      paginated: true,
      perPage: 25,
      checkedRows: [],
      project_states: [],
      editingRowId: null,
      editingForm: null,
      savingRowId: null
    };
  },
  watch: {
    // project_state: function (newVal, oldVal) {
    //   this.getProjects()
    // },
    projects: {
      handler (newVal, oldVal) {
        // this.setProjects(newVal)
        this.projectsData = this.projects;
      },
      deep: 1
    },
    editMode: function(newVal) {
      if (!newVal) {
        this.cancelRowEdit();
      }
    }
  },
  computed: {
    totals() {
      const sum = field => this.projectsData.reduce((total, p) => total + (Number(field(p)) || 0), 0);
      return {
        realHours: sum(p => p.total_real_hours),
        estimatedHours: sum(p => p.total_estimated_hours),
        realResult: sum(p => p.total_real_incomes_expenses),
        estimatedResult: sum(p => this.estimatedResult(p))
      };
    },
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
        project_likelihood:
          row.project_likelihood && row.project_likelihood.id
            ? row.project_likelihood.id
            : 0,
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
        project_likelihood:
          this.editingForm.project_likelihood > 0
            ? this.editingForm.project_likelihood
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
        const projectLikelihood =
          this.projectLikelihoods.find(l => l.id === payload.project_likelihood) ||
          null;
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
            project_likelihood: projectLikelihood,
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
    formatHours,
    formatMoney,
    sign,
    estimatedResult(project) {
      // The panel's planned result: no fallback, so the list, its sorting
      // and the projects panel agree (issues/067)
      return project.incomes_expenses || 0;
    },
    hoursPercent(project) {
      if (!project.total_estimated_hours) {
        return null;
      }
      return Math.round(((project.total_real_hours || 0) / project.total_estimated_hours) * 100);
    },
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
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
  },
};
</script>
<style scoped>
.project-name {
  display: block;
  max-width: 22rem;
  font-weight: 700;
  color: var(--a-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.project-name:hover {
  color: var(--a-accent-hover);
  text-decoration: underline;
}
.project-subline {
  display: block;
  color: var(--a-muted);
  font-size: .8125rem;
}
:deep(.is-nowrap) {
  white-space: nowrap;
}
:deep(.hours-cell) {
  min-width: 11rem;
}
.hours-line {
  display: flex;
  justify-content: space-between;
  gap: .5rem;
  font-size: .8125rem;
}
.hours-line span {
  color: var(--a-muted);
}
.hours-bar {
  height: 6px;
  margin-top: 4px;
  border-radius: 3px;
  background: var(--a-seg);
  overflow: hidden;
}
.hours-bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--a-accent);
}
.hours-bar span.over {
  background: var(--a-over);
}
.amount {
  font-weight: 700;
  white-space: nowrap;
}
</style>
