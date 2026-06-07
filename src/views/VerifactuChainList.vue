<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <verifactu-chain-list />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar';
import VerifactuChainList from '@/components/VerifactuChainList';

export default {
  name: 'VerifactuChainListView',
  components: {
    TitleBar,
    VerifactuChainList
  },
  computed: {
    titleStack() {
      return ['Administració', 'Factures Verifactu'];
    }
  }
};
</script>
