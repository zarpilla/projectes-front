<template>
  <div>
    <document-form v-if="type" :id="id" :type="type" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import DocumentForm from "@/components/DocumentForm.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

export default {
  name: "EmittedInvoiceForm",
  components: {    
    TitleBar,
    DocumentForm
  },
  props: {
    id: {
      type: [String, Number],
      default: null,
    },
  },
  data() {
    return {
      isLoading: false,
      type: null
    };
  },
  computed: {
    ...mapState(useMainStore, ["me"]),    
  },
  created() {
    this.type = this.$route.params.type
  },
};
</script>
<style>
</style>
