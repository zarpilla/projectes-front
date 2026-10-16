<template>
  <div>
    <verifactu-head active="chain" />
    <verifactu-chain-list />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import VerifactuHead from '@/components/VerifactuHead.vue';
import VerifactuChainList from '@/components/VerifactuChainList.vue';

export default {
  name: 'VerifactuChainListView',
  components: {
    TitleBar,
    VerifactuHead,
    VerifactuChainList
  },
  computed: {
    titleStack() {
      return ['Administració', 'Factures Verifactu'];
    }
  }
};
</script>
