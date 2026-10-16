<template>
  <div>
    <title-bar :title-stack="titleStack" subtitle="Dades de l'entitat i valors per defecte de factures, pressupostos, comandes i tresoreria." />
    <me-form />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import MeForm from '@/components/MeForm.vue';

export default {
  name: 'MeView',
  components: {
    TitleBar,
    MeForm
  },
  computed: {
    titleStack() {
      return ['Administració', 'Configuració general'];
    }
  }
};
</script>
