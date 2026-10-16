<template>
  <div>
    <title-bar :title-stack="titleStack" subtitle="Comandes que es recullen en un punt de consum: marca qui ja ha passat a buscar la seva caixa." />
    <section class="section is-main-section">
      <pickup-points-orders />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import PickupPointsOrders from '@/components/PickupPointsOrders.vue'

export default {
  name: 'PickupPointsOrdersView',
  components: {
    TitleBar,
    CardComponent,
    PickupPointsOrders
  },
  computed: {
    titleStack() {
      return ['Rutes i punts', 'Punts de consum']
    }
  }
}
</script>
