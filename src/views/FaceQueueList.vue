<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <face-queue-list />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import FaceQueueList from '@/components/FaceQueueList.vue';

export default {
  name: 'FaceQueueListView',
  components: {
    TitleBar,
    FaceQueueList
  },
  computed: {
    titleStack() {
      return ['Administració', 'Factures FACE'];
    }
  }
};
</script>
