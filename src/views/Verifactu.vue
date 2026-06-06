<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <verifactu-form />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar';
import VerifactuForm from '@/components/VerifactuForm';

export default {
  name: 'VerifactuView',
  components: {
    TitleBar,
    VerifactuForm
  },
  computed: {
    titleStack() {
      return ['Administració', 'Configuració Verifactu'];
    }
  }
};
</script>
