<template>
  <div>
    <title-bar :title-stack="titleStack" />
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
      return ['Administració', 'Configuració General'];
    }
  }
};
</script>
