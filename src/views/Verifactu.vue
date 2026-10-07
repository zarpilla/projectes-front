<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <verifactu-form />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import VerifactuForm from '@/components/VerifactuForm.vue';

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
