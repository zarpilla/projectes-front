<template>
  <section class="section">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <card-component title="Factures FACE" v-if="!isLoading" class="mt-5">
      <b-table
        :data="items"
        :loading="isLoading"
        :paginated="items.length > 50"
        :per-page="50"
        :striped="true"
        :hoverable="true"
        default-sort="id"
        default-sort-direction="desc"
      >
        <b-table-column
          label="ID"
          field="id"
          sortable
          numeric
          width="80"
          v-slot="props"
        >
          <router-link :to="{ name: 'admin.face-queue.edit', params: { id: props.row.id } }">
            {{ props.row.id }}
          </router-link>
        </b-table-column>

        <b-table-column
          label="Factura"
          field="emitted_invoice"
          sortable
          v-slot="props"
        >
          <span v-if="props.row.emitted_invoice">
            {{ props.row.emitted_invoice.code || props.row.emitted_invoice.id }}
          </span>
        </b-table-column>

        <b-table-column
          label="Mode"
          field="mode"
          sortable
          v-slot="props"
        >
          <b-tag :type="props.row.mode === 'real' ? 'is-success' : 'is-info'">
            {{ props.row.mode }}
          </b-tag>
        </b-table-column>

        <b-table-column
          label="Estat"
          field="status"
          sortable
          v-slot="props"
        >
          <b-tag :type="getStatusType(props.row.status)">
            {{ getStatusLabel(props.row.status) }}
          </b-tag>
        </b-table-column>

        <b-table-column
          label="Número registre"
          field="registration_number"
          v-slot="props"
        >
          {{ props.row.registration_number }}
        </b-table-column>

        <b-table-column
          label="Intents"
          field="attempts"
          sortable
          numeric
          v-slot="props"
        >
          {{ props.row.attempts }}
        </b-table-column>

        <b-table-column
          label="Última comprovació"
          field="last_status_check"
          sortable
          v-slot="props"
        >
          {{ formatDate(props.row.last_status_check) }}
        </b-table-column>

        <b-table-column
          label="Accions"
          custom-key="actions"
          cell-class="is-actions-cell"
          v-slot="props"
        >
          <div class="buttons is-right">
            <router-link
              :to="{ name: 'admin.face-queue.edit', params: { id: props.row.id } }"
              class="button is-small is-primary"
            >
              <b-icon icon="pencil" size="is-small" />
            </router-link>
          </div>
        </b-table-column>
      </b-table>
    </card-component>
  </section>
</template>

<script>
import service from '@/service/index';
import CardComponent from '@/components/CardComponent';
import moment from 'moment';

export default {
  name: 'FaceQueueList',
  components: {
    CardComponent
  },
  data() {
    return {
      isLoading: false,
      items: []
    };
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get('/face-queues?_limit=-1&_sort=id:DESC');
        this.items = response.data;
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error carregant dades: ${error.message}`,
          type: 'is-danger'
        });
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(value) {
      if (!value) return '';
      return moment(value).format('DD/MM/YYYY HH:mm');
    },
    getStatusType(status) {
      const types = {
        pending: 'is-warning',
        registered: 'is-info',
        delivered: 'is-success',
        rejected: 'is-danger',
        error: 'is-danger'
      };
      return types[status] || '';
    },
    getStatusLabel(status) {
      const labels = {
        pending: 'Pendent',
        registered: 'Registrada',
        delivered: 'Lliurada',
        rejected: 'Rebutjada',
        error: 'Error'
      };
      return labels[status] || status;
    }
  }
};
</script>
