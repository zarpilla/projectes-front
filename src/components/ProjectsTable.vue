<template>
  <div>
    <modal-box
      :is-active="isModalActive"
      :trash-object-name="trashObjectName"
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
      :data="projects"
    >
      <b-table-column label="Nom" field="name" sortable v-slot="props">
        {{ props.row.name }}
      </b-table-column>
      <b-table-column label="Client" field="client.name" sortable v-slot="props">
        {{ props.row.client ? props.row.client.name : '' }}
      </b-table-column>
      <b-table-column label="Hores dedicades" field="activities_hours" sortable v-slot="props">
        {{ props.row.activities_hours }}
      </b-table-column>
      <!-- <b-table-column label="Creat" v-slot="props" sortable field="created_at">
        <small class="has-text-grey is-abbr-like" :title="props.row.created_at">{{ props.row.created_at_dt }}</small>
      </b-table-column> -->
      <!-- <b-table-column custom-key="actions" cell-class="is-actions-cell" v-slot="props">
        <div class="buttons is-right">
          <router-link :to="{name:'client.edit', params: {id: props.row.id}}" class="button is-small is-primary">
            <b-icon icon="account-edit" size="is-small"/>
          </router-link>
          <button class="button is-small is-danger" type="button" @click.prevent="trashModal(props.row)">
            <b-icon icon="trash-can" size="is-small"/>
          </button>
        </div>
      </b-table-column> -->

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
import moment from 'moment'
import sumBy from 'lodash/sumBy'

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
    }
  },
  data () {
    return {
      isModalActive: false,
      trashObject: null,
      projects: [],
      isLoading: false,
      paginated: false,
      perPage: 10,
      checkedRows: []
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
    service({ requiresAuth: true }).get('projects?project_state=1').then((r) => {
      this.projects = r.data.map(d => { return { ...d, activities_hours: sumBy(d.activities, 'hours'), created_at_dt: moment(d.created_at).format('DD-MM-YYYY HH:mm') } })
      console.log('this.projects', this.projects)
    })
  },
  methods: {
    trashModal (trashObject) {
      this.trashObject = trashObject
      this.isModalActive = true
    },
    trashConfirm () {
      this.isModalActive = false
      this.$buefy.snackbar.open({
        message: 'Confirmed',
        queue: false
      })
    },
    trashCancel () {
      this.isModalActive = false
    }
  }
}
</script>
