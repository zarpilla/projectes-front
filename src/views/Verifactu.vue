<template>
  <div>
    <verifactu-head active="config" />
    <verifactu-form />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import VerifactuHead from '@/components/VerifactuHead.vue';
import VerifactuForm from '@/components/VerifactuForm.vue';

export default {
  name: 'VerifactuView',
  components: {
    TitleBar,
    VerifactuHead,
    VerifactuForm
  },
  computed: {
    titleStack() {
      return ['Altres', 'Verifactu'];
    }
  }
};
</script>
