<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <users-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import UsersTable from '@/components/UsersTable'
import CardComponent from '@/components/CardComponent'
import { mapState } from 'vuex'

export default {
  name: 'Partners',
  components: {
    CardComponent,
    TitleBar,
    UsersTable
  },
  data () {
    return {            
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Sòcies']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
