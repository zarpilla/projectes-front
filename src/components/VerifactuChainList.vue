<template>
  <section class="section">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <card-component title="Factures Verifactu" v-if="!isLoading" class="mt-5">
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
          <router-link :to="{ name: 'admin.verifactu-chain.edit', params: { id: props.row.id } }">
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
          field="state"
          sortable
          v-slot="props"
        >
          <b-tag :type="getStateType(props.row.state)">
            {{ getStateLabel(props.row.state) }}
          </b-tag>
        </b-table-column>

        <b-table-column
          label="Hash"
          field="hash"
          v-slot="props"
        >
          <span v-if="props.row.hash" :title="props.row.hash">
            {{ props.row.hash.substring(0, 20) }}...
          </span>
        </b-table-column>

        <b-table-column
          label="Accions"
          field="actions"
          v-slot="props"
        >
          {{ props.row.actions }}
        </b-table-column>

        <b-table-column
          label="Accions"
          custom-key="actions-buttons"
          cell-class="is-actions-cell"
          v-slot="props"
        >
          <div class="buttons is-right">
            <router-link
              :to="{ name: 'admin.verifactu-chain.edit', params: { id: props.row.id } }"
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

export default {
  name: 'VerifactuChainList',
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
        const response = await service({ requiresAuth: true }).get('/verifactu-chains?_limit=-1&_sort=id:DESC');
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
    getStateType(state) {
      const types = {
        pending: 'is-warning',
        ok: 'is-success',
        ko: 'is-danger',
        okwitherrors: 'is-warning'
      };
      return types[state] || '';
    },
    getStateLabel(state) {
      const labels = {
        pending: 'Pendent',
        ok: 'OK',
        ko: 'KO',
        okwitherrors: 'OK amb errors'
      };
      return labels[state] || state;
    }
  }
};
</script>
