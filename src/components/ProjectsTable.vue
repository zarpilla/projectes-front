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
      :checked-rows.sync="checkedRows"
      :checkable="checkable"
      :loading="isLoading"
      :paginated="paginated"
      :per-page="perPage"
      :striped="true"
      :hoverable="true"
      :data="projectsData"
    >
      <b-table-column label="Nom" field="name" sortable v-slot="props">
        <router-link :to="{name:'project.edit', params: {id: props.row.id}}">
          <span class="project-name has-text-info">
            {{ props.row.name }}
          </span>
          </router-link>
      </b-table-column>
      <b-table-column label="Coordina" field="leader" sortable v-slot="props">
        {{ props.row.leader ? props.row.leader.username : '' }}
      </b-table-column>
      <b-table-column label="Àmbit" field="project_scope.name" sortable v-slot="props">
        {{ props.row.project_scope ? props.row.project_scope.name : '' }}
      </b-table-column>
      <b-table-column label="Hores dedicades" field="total_real_hours" sortable numeric v-slot="props">
        {{ props.row.total_real_hours ? props.row.total_real_hours.toFixed(2) : '' }}
      </b-table-column>
      <b-table-column label="Hores previstes" field="total_estimated_hours" sortable numeric v-slot="props">
        {{ props.row.total_estimated_hours ? props.row.total_estimated_hours.toFixed(2) : '' }}
      </b-table-column>
      <b-table-column label="Resultat actual" field="total_real_incomes_expenses" sortable numeric v-slot="props">
        {{ formatPrice(props.row.total_real_incomes_expenses) }} €
      </b-table-column>
      <b-table-column label="Resultat previst" field="incomes_expenses" sortable numeric v-slot="props">
        {{ formatPrice(props.row.incomes_expenses) }}
      </b-table-column>
      <b-table-column label="Estat" v-slot="props" sortable field="project_state.name">
        {{ props.row.project_state ? props.row.project_state.name : '' }}
      </b-table-column>
      <b-table-column custom-key="actions" cell-class="is-actions-cell" v-slot="props">
        <div class="buttons is-right">
          <!-- <router-link :to="{name:'project.edit', params: {id: props.row.id}}" class="button is-small is-primary">
            <b-icon icon="account-edit" size="is-small"/>
          </router-link> -->
          <button class="button is-small is-danger" type="button" @click.prevent="trashModal(props.row)">
            <b-icon icon="trash-can" size="is-small"/>
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
import ModalBox from '@/components/ModalBox'
import service from '@/service/index'
// import moment from 'moment'
// import sumBy from 'lodash/sumBy'
// import defaultProjectState from '@/service/projectState'

export default {
  name: 'ProjectsTable',
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
    }
  },
  data () {
    return {
      isModalActive: false,
      trashObject: null,
      projectsData: [],
      isLoading: false,
      paginated: false,
      perPage: 10,
      checkedRows: [],
      project_states: []
    }
  },
  watch: {
    // project_state: function (newVal, oldVal) {
    //   console.log('newVal', newVal)
    //   this.getProjects()
    // },
    projects: function (newVal, oldVal) {
      // console.log('newVal', newVal)
      // this.setProjects(newVal)
      this.projectsData = this.projects
    }
  },
  computed: {
    trashObjectName () {
      if (this.trashObject) {
        return this.trashObject.name
      }

      return null
    }
  },
  mounted () {
    // this.getProjects()
  },
  methods: {
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
    trashModal (trashObject) {
      this.trashObject = trashObject
      this.isModalActive = true
    },
    async trashConfirm () {
      this.isModalActive = false

      await service({ requiresAuth: true }).put(`projects/${this.trashObject.id}`, { published_at: null })
      // await service({ requiresAuth: true }).delete(`projects/${this.trashObject.id}`)
      this.projectsData = this.projectsData.filter(p => p.id !== this.trashObject.id)
      this.$buefy.snackbar.open({
        message: 'Esborrat',
        queue: false
      })
    },
    trashCancel () {
      this.isModalActive = false
    },
    formatPrice (value) {
      const val = (value / 1).toFixed(2).replace('.', ',')
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
  }
}
</script>
<style scoped>
.project-name{
  font-weight: bold;
}
</style>
