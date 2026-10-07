<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <verifactu-chain-form :id="id" />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import VerifactuChainForm from '@/components/VerifactuChainForm.vue';

export default {
  name: 'VerifactuChainEditView',
  components: {
    TitleBar,
    VerifactuChainForm
  },
  props: {
    id: {
      type: [String, Number],
      required: true
    }
  },
  computed: {
    titleStack() {
      return ['Administració', 'Factures Verifactu', `Editar #${this.id}`];
    }
  }
};
</script>
