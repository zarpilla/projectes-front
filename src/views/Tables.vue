<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <hero-bar>
      Tables
      <template #right>
        <router-link to="/" class="button">
          Dashboard
        </router-link>
      </template>
    </hero-bar>
    <section class="section is-main-section">
      <notification class="is-info">
        <div>
          <b-icon icon="buffer" custom-size="default" />
          <b>Sorted and paginated table.</b>&nbsp;Based on Buefy's table.
        </div>
      </notification>

      <card-component
        class="has-table has-mobile-sort-spaced"
        title="Clients"
        icon="account-multiple"
      >
        <clients-table-sample
          :data-url="`${$router.options.base}data-sources/clients.json`"
          :checkable="true"
        />
      </card-component>

      <hr />

      <notification class="is-info">
        <div>
          <b-icon icon="buffer" custom-size="default" />
          <b>Tightly wrapped</b> &mdash; table header becomes card header
        </div>
      </notification>

      <card-component class="has-table has-mobile-sort-spaced">
        <clients-table-sample
          :data-url="`${$router.options.base}data-sources/clients.json`"
          :checkable="true"
        />
      </card-component>

      <hr />

      <notification class="is-info">
        <div>
          <b-icon icon="buffer" custom-size="default" />
          <b>Empty table.</b> When there's nothing to show
        </div>
      </notification>

      <card-component class="has-table has-thead-hidden">
        <clients-table-sample />
      </card-component>
    </section>
  </div>
</template>

<script>
import Notification from '@/components/Notification.vue'
import ClientsTableSample from '@/components/ClientsTableSample.vue'
import CardComponent from '@/components/CardComponent.vue'
import TitleBar from '@/components/TitleBar.vue'
import HeroBar from '@/components/HeroBar.vue'
export default {
  name: 'Tables',
  components: {
    HeroBar,
    TitleBar,
    CardComponent,
    ClientsTableSample,
    Notification
  },
  computed: {
    titleStack () {
      return ['Admin', 'Tables']
    }
  }
}
</script>
