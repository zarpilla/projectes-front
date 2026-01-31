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
      :striped="false"
      :hoverable="false"
      default-sort="name"
      :data="activities"
    >
      <b-table-column label="Tasca" field="description" sortable v-slot="props">
        {{ props.row.description }}
      </b-table-column>
      <b-table-column label="Projecte" field="project.name" sortable v-slot="props">
        {{ props.row.project.name }}
      </b-table-column>
      <b-table-column label="Data" field="date" sortable v-slot="props">
        {{ props.row.date ? props.row.date : '' }}
      </b-table-column>
      <b-table-column label="Persona" field="users_permissions_user.username" sortable v-slot="props">
        {{ props.row.users_permissions_user ? props.row.users_permissions_user.username : '' }}
      </b-table-column>
      <b-table-column label="Hores" field="hours" sortable v-slot="props">
        {{ props.row.hours ? props.row.hours : '-' }}
      </b-table-column>
      <!-- <b-table-column label="Creat" v-slot="props" sortable field="created_at">
        <small class="has-text-grey is-abbr-like" :title="props.row.created_at">{{ props.row.created_at }}</small>
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
import subDays from 'date-fns/subDays'
import format from 'date-fns/format'

export default {
  name: 'DedicationTable',
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
      activities: [],
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
    }// ,
    // weekday () {
    //   return this.$moment.add(-7, 'days').format('YYYY-MM-DD')
    // }
  },
  mounted () {
    this.getActivities()
  },
  methods: {
    getActivities () {
      const weekday = format(subDays(new Date(), 7), 'yyyy-MM-dd')
      service({ requiresAuth: true }).get(`activities/calendar?_limit=-1&_where[date_gte]=${weekday}`).then((r) => {
        this.activities = r.data
      })
    },
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
