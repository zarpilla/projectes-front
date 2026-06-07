<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <face-queue-form :id="id" />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar';
import FaceQueueForm from '@/components/FaceQueueForm';

export default {
  name: 'FaceQueueEditView',
  components: {
    TitleBar,
    FaceQueueForm
  },
  props: {
    id: {
      type: [String, Number],
      required: true
    }
  },
  computed: {
    titleStack() {
      return ['Administració', 'Factures FACE', `Editar #${this.id}`];
    }
  }
};
</script>
