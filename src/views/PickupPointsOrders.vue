<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component
        title="Comandes"
        
        has-table
      >
        <pickup-points-orders />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import PickupPointsOrders from '@/components/PickupPointsOrders'

export default {
  name: 'PickupPointsOrdersView',
  components: {
    TitleBar,
    CardComponent,
    PickupPointsOrders
  },
  computed: {
    titleStack() {
      return ['Comandes', 'Comandes punt de consum']
    }
  }
}
</script>
