<template>
  <div>
    <verifactu-head active="face" />
    <face-queue-list />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import VerifactuHead from '@/components/VerifactuHead.vue';
import FaceQueueList from '@/components/FaceQueueList.vue';

export default {
  name: 'FaceQueueListView',
  components: {
    TitleBar,
    VerifactuHead,
    FaceQueueList
  },
  computed: {
    titleStack() {
      return ['Administració', 'Factures FACe'];
    }
  }
};
</script>
